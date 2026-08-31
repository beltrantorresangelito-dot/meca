const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  ListeningsRepository,
  ListeningsService,
  ListeningsController,
  createListeningsHandler
} = require('../src/modules/listenings');

test('LISTMOD-001 index exporta las cuatro piezas', () => {
  assert.equal(typeof ListeningsRepository, 'function');
  assert.equal(typeof ListeningsService, 'function');
  assert.equal(typeof ListeningsController, 'function');
  assert.equal(typeof createListeningsHandler, 'function');
});

test('LISTMOD-002 ruta ajena devuelve false', async () => {
  const handler = createListeningsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  const handled = await handler({
    ruta: '/api/otra-cosa',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {},
    query: {}
  });

  assert.equal(handled, false);
});

test('LISTMOD-003 asignaciones sin token conserva 401', async () => {
  const handler = createListeningsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  let status;
  let body;

  const res = {
    writeHead(code) { status = code; },
    end(payload) { body = JSON.parse(payload); }
  };

  await handler({
    ruta: '/api/escuchas/asignaciones',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: res,
    query: {}
  });

  assert.equal(status, 401);
  assert.deepEqual(body, { error: 'Token requerido' });
});

test('LISTMOD-004 tareas con error conserva 500 []', async () => {
  const handler = createListeningsHandler({
    db: {
      query: async () => {
        throw new Error('db down');
      }
    }
  });

  let status;
  let body;

  const res = {
    writeHead(code) { status = code; },
    end(payload) { body = JSON.parse(payload); }
  };

  await handler({
    ruta: '/api/escuchas/tareas',
    metodo: 'GET',
    peticion: {
      headers: { authorization: 'Bearer x' }
    },
    respuesta: res,
    query: {}
  });

  assert.equal(status, 500);
  assert.deepEqual(body, []);
});

test('LISTMOD-005 tickets por lote conserva 404', async () => {
  const handler = createListeningsHandler({
    db: {
      query: async sql => {
        if (String(sql).includes('FROM tareas_escucha')) {
          return { rows: [] };
        }
        return { rows: [] };
      }
    }
  });

  let status;
  let body;

  const res = {
    writeHead(code) { status = code; },
    end(payload) { body = JSON.parse(payload); }
  };

  await handler({
    ruta: '/api/escuchas/lotes/999/tickets',
    metodo: 'GET',
    peticion: {
      headers: { authorization: 'Bearer x' }
    },
    respuesta: res,
    query: {}
  });

  assert.equal(status, 404);
  assert.deepEqual(body, { error: 'Lote no encontrado' });
});

test('LISTMOD-006 saveAssignments hace rollback si una asignación falla', async () => {
  const eventos = [];
  const asignacionesPersistidas = [];

  const client = {
    query: async sql => {
      eventos.push(String(sql).trim());
      return { rows: [] };
    },
    release: () => {
      eventos.push('RELEASE');
    }
  };

  const db = {
    connect: async () => client
  };

  const repository = new ListeningsRepository(db);

  // Simulamos el comportamiento transaccional real.
  repository.withTransaction = async work => {
    eventos.push('BEGIN');

    try {
      const result = await work(client);

      eventos.push('COMMIT');

      return result;
    } catch (error) {
      eventos.push('ROLLBACK');

      // Simula que PostgreSQL revierte los INSERT realizados
      // dentro de la transacción.
      asignacionesPersistidas.length = 0;

      throw error;
    } finally {
      eventos.push('RELEASE');
    }
  };

  repository.resolveListeningDomain = async (
    quiebre,
    campana,
    executor
  ) => {
    assert.equal(executor, client);

    return {
      quiebre_id: 1,
      quiebre_codigo: 'COBRANZAS',
      quiebre_nombre: 'Cobranzas',
      campana_id: 1,
      campana_codigo: 'T',
      campana_descripcion: 'Tempranas'
    };
  };

  repository.assignmentExists = async (
    ticket,
    tareaId,
    executor
  ) => {
    assert.equal(executor, client);
    assert.equal(tareaId, 100);

    return false;
  };

  repository.insertAssignment = async (
    data,
    executor
  ) => {
    assert.equal(executor, client);

    if (data.ticket === 'TICKET-ERROR') {
      throw new Error('Error simulado de inserción');
    }

    asignacionesPersistidas.push({
      ticket: data.ticket,
      tarea_id: data.tarea_id,
      quiebre_id: data.quiebre_id,
      campana_id: data.campana_id
    });

    return {
      id: asignacionesPersistidas.length
    };
  };

  const service = new ListeningsService(repository);

  await assert.rejects(
    () =>
      service.saveAssignments({
        tarea_id: 100,
        asignaciones: [
          {
            id: 1001,
            ticket: 'TICKET-OK',
            quiebre: 'Cobranzas',
            campana: 'T'
          },
          {
            id: 1002,
            ticket: 'TICKET-ERROR',
            quiebre: 'Cobranzas',
            campana: 'T'
          }
        ]
      }),
    /Error simulado de inserción/
  );

  assert.ok(
    eventos.includes('BEGIN'),
    'La operación debe iniciar una transacción'
  );

  assert.ok(
    eventos.includes('ROLLBACK'),
    'La operación debe ejecutar ROLLBACK ante un error'
  );

  assert.ok(
    !eventos.includes('COMMIT'),
    'No debe ejecutar COMMIT cuando una asignación falla'
  );

  assert.equal(
    asignacionesPersistidas.length,
    0,
    'No debe quedar ninguna asignación persistida después del rollback'
  );
});

test('LISTMOD-007 createAtomicLoad revierte lote y asignaciones si una inserción falla', async () => {
  const eventos = [];

  const estadoPersistido = {
    tarea: null,
    asignaciones: []
  };

  const client = {
    query: async () => ({ rows: [] }),
    release: () => {}
  };

  const db = {
    connect: async () => client
  };

  const repository = new ListeningsRepository(db);

  repository.withTransaction = async work => {
    eventos.push('BEGIN');

    try {
      const result = await work(client);

      eventos.push('COMMIT');

      return result;
    } catch (error) {
      eventos.push('ROLLBACK');

      // Simula el efecto real del ROLLBACK de PostgreSQL.
      estadoPersistido.tarea = null;
      estadoPersistido.asignaciones.length = 0;

      throw error;
    } finally {
      eventos.push('RELEASE');
    }
  };

  repository.findRecentTaskByFilename =
  async (
    filename,
    versionPlantillaCargaId,
    executor
  ) => {
    assert.equal(
      filename,
      'atomicidad.xlsx'
    );

    assert.equal(
      versionPlantillaCargaId,
      1
    );

    assert.strictEqual(
      executor,
      client
    );

    return null;
  };

  repository.insertTask = async (
    data,
    executor
  ) => {
    assert.equal(executor, client);

    estadoPersistido.tarea = {
      id: data.id,
      nombre_archivo: data.nombre_archivo,
      version_plantilla_carga_id:
        data.version_plantilla_carga_id
    };

    return {
      id: data.id,
      version_plantilla_carga_id:
        data.version_plantilla_carga_id
    };
  };

  repository.resolveListeningDomain = async (
    quiebre,
    campana,
    executor
  ) => {
    assert.equal(executor, client);

    return {
      quiebre_id: 1,
      quiebre_codigo: 'COBRANZAS',
      quiebre_nombre: 'Cobranzas',
      campana_id: 1,
      campana_codigo: 'T',
      campana_descripcion: 'Tempranas'
    };
  };

  repository.assignmentExists = async (
    ticket,
    taskId,
    executor
  ) => {
    assert.equal(executor, client);
    assert.equal(taskId, 900001);

    return false;
  };

  repository.insertAssignment = async (
    data,
    executor
  ) => {
    assert.equal(executor, client);

    if (data.ticket === 'TICKET-ERROR') {
      throw new Error(
        'Error simulado durante la carga atómica'
      );
    }

    estadoPersistido.asignaciones.push({
      ticket: data.ticket,
      tarea_id: data.tarea_id,
      quiebre_id: data.quiebre_id,
      campana_id: data.campana_id
    });

    return {
      id: data.id
    };
  };

  const service =
    new ListeningsService(repository);

  await assert.rejects(
    () =>
      service.createAtomicLoad({
        tarea: {
          id: 900001,
          fecha_carga:
            '2026-08-31T17:00:00.000Z',
          nombre_archivo:
            'atomicidad.xlsx',
          total_registros: 2,
          estado: 'activo',
          creado_por: 'test',
          version_plantilla_carga_id: 1
        },

        asignaciones: [
          {
            id: 910001,
            ticket: 'TICKET-OK',
            quiebre: 'Cobranzas',
            campana: 'T'
          },
          {
            id: 910002,
            ticket: 'TICKET-ERROR',
            quiebre: 'Cobranzas',
            campana: 'T'
          }
        ]
      }),

    /Error simulado durante la carga atómica/
  );

  assert.ok(
    eventos.includes('BEGIN'),
    'La carga debe iniciar una transacción'
  );

  assert.ok(
    eventos.includes('ROLLBACK'),
    'La carga debe ejecutar ROLLBACK ante un error'
  );

  assert.ok(
    !eventos.includes('COMMIT'),
    'No debe ejecutar COMMIT cuando una asignación falla'
  );

  assert.equal(
    estadoPersistido.tarea,
    null,
    'El lote no debe persistir después del rollback'
  );

  assert.equal(
    estadoPersistido.asignaciones.length,
    0,
    'Ninguna asignación debe persistir después del rollback'
  );
});

test(
  'LISTMOD-008 createAtomicLoad busca lote reciente usando archivo y versión de plantilla',
  async () => {
    const client = {
      query: async () => {},
      release: () => {}
    };

    const repository = {};

    repository.withTransaction =
      async (work) => {
        return work(client);
      };

    repository.findRecentTaskByFilename =
      async (
        filename,
        versionPlantillaCargaId,
        executor
      ) => {
        assert.equal(
          filename,
          'misma-carga.xlsx'
        );

        assert.equal(
          versionPlantillaCargaId,
          2
        );

        assert.strictEqual(
          executor,
          client
        );

        // Simulamos que existe un lote reciente
        // para ESTE archivo y ESTA versión.
        return {
          id: 880000000001,
          fecha_carga:
            new Date().toISOString(),
          total_registros: 1,
          version_plantilla_carga_id: 2
        };
      };

    repository.resolveListeningDomain =
      async (
        quiebre,
        campana,
        executor
      ) => {
        assert.strictEqual(
          executor,
          client
        );

        return {
          quiebre_id: 1,
          quiebre_codigo: 'COBRANZAS',
          campana_id: 1,
          campana_codigo: 'T'
        };
      };

    repository.assignmentExists =
      async (
        ticket,
        taskId,
        executor
      ) => {
        assert.equal(
          taskId,
          880000000001
        );

        assert.strictEqual(
          executor,
          client
        );

        return false;
      };

    repository.insertAssignment =
      async (
        data,
        executor
      ) => {
        assert.equal(
          data.tarea_id,
          880000000001
        );

        assert.strictEqual(
          executor,
          client
        );

        return data;
      };

    // Si intenta crear un lote nuevo,
    // el comportamiento es incorrecto.
    repository.insertTask =
      async () => {
        assert.fail(
          'No debe crear un lote nuevo cuando archivo y versión coinciden'
        );
      };

    const service =
      new ListeningsService(repository);

    const result =
      await service.createAtomicLoad({
        tarea: {
          id: 880000000099,
          fecha_carga:
            new Date().toISOString(),
          nombre_archivo:
            'misma-carga.xlsx',
          total_registros: 1,
          estado: 'activo',
          creado_por: 'test',
          version_plantilla_carga_id: 2
        },

        asignaciones: [
          {
            id: 880000000002,
            ticket: 'LISTMOD-008-TICKET',
            quiebre: 'Cobranzas',
            campana: 'T',
            auditor_asignado: 'auditor_test',
            estado: 'pendiente'
          }
        ]
      });

    assert.equal(
      result.success,
      true
    );

    assert.equal(
      result.tarea.id,
      880000000001
    );

    assert.equal(
      result.tarea.reutilizado,
      true
    );

    assert.equal(
      result.tarea.version_plantilla_carga_id,
      2
    );

    assert.equal(
      result.insertados,
      1
    );

    assert.equal(
      result.duplicados,
      0
    );
  }
);

test(
  'LISTMOD-009 createAtomicLoad crea lote nuevo cuando no existe coincidencia de archivo y versión',
  async () => {
    const client = {
      query: async () => {},
      release: () => {}
    };

    const repository = {};

    repository.withTransaction =
      async (work) => {
        return work(client);
      };

    repository.findRecentTaskByFilename =
      async (
        filename,
        versionPlantillaCargaId,
        executor
      ) => {
        assert.equal(
          filename,
          'misma-carga.xlsx'
        );

        assert.equal(
          versionPlantillaCargaId,
          2
        );

        assert.strictEqual(
          executor,
          client
        );

        // No existe lote reciente para
        // archivo + versión 2.
        return null;
      };

    repository.insertTask =
      async (
        data,
        executor
      ) => {
        assert.strictEqual(
          executor,
          client
        );

        assert.equal(
          data.id,
          880000000099
        );

        assert.equal(
          data.nombre_archivo,
          'misma-carga.xlsx'
        );

        assert.equal(
          data.version_plantilla_carga_id,
          2
        );

        return {
          ...data,
          id: 880000000099
        };
      };

    repository.resolveListeningDomain =
      async (
        quiebre,
        campana,
        executor
      ) => {
        assert.strictEqual(
          executor,
          client
        );

        return {
          quiebre_id: 1,
          quiebre_codigo: 'COBRANZAS',
          campana_id: 1,
          campana_codigo: 'T'
        };
      };

    repository.assignmentExists =
      async (
        ticket,
        taskId,
        executor
      ) => {
        assert.equal(
          taskId,
          880000000099
        );

        assert.strictEqual(
          executor,
          client
        );

        return false;
      };

    repository.insertAssignment =
      async (
        data,
        executor
      ) => {
        assert.equal(
          data.tarea_id,
          880000000099
        );

        assert.strictEqual(
          executor,
          client
        );

        return data;
      };

    const service =
      new ListeningsService(repository);

    const result =
      await service.createAtomicLoad({
        tarea: {
          id: 880000000099,
          fecha_carga:
            new Date().toISOString(),
          nombre_archivo:
            'misma-carga.xlsx',
          total_registros: 1,
          estado: 'activo',
          creado_por: 'test',
          version_plantilla_carga_id: 2
        },

        asignaciones: [
          {
            id: 880000000100,
            ticket: 'LISTMOD-009-TICKET',
            quiebre: 'Cobranzas',
            campana: 'T',
            auditor_asignado: 'auditor_test',
            estado: 'pendiente'
          }
        ]
      });

    assert.equal(
      result.success,
      true
    );

    assert.equal(
      result.tarea.id,
      880000000099
    );

    assert.equal(
      result.tarea.reutilizado,
      false
    );

    assert.equal(
      result.tarea.version_plantilla_carga_id,
      2
    );

    assert.equal(
      result.insertados,
      1
    );

    assert.equal(
      result.duplicados,
      0
    );
  }
);