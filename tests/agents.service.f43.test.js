const test = require('node:test');
const assert = require('node:assert/strict');
const AgentsService = require('../src/modules/agents/agents.service');

function repository(overrides = {}) {
  return {
    list: async () => [{ id: 1 }],
    update: async () => ({ noChanges: false, rowCount: 1 }),
    delete: async () => 1,
    getById: async id => ({ id }),
    listCategories: async () => ['A', 'B'],
    listComplete: async () => [{ id: 1 }],
    listForExport: async () => [],
    ...overrides
  };
}

test('AGSVC-001 list delega filtros', async () => {
  let captured;
  const service = new AgentsService(repository({
    list: async filters => {
      captured = filters;
      return [{ id: 1 }];
    }
  }));

  const result = await service.list({ lider: 'L1', ubicacion: 'Lima' });

  assert.deepEqual(captured, { lider: 'L1', ubicacion: 'Lima' });
  assert.deepEqual(result, [{ id: 1 }]);
});

test('AGSVC-002 update valida ID', async () => {
  const service = new AgentsService(repository());

  await assert.rejects(
    service.update(0, { nombre: 'X' }),
    { status: 400, message: 'ID de agente inválido' }
  );
});

test('AGSVC-003 update conserva 400 sin cambios y 404 inexistente', async () => {
  const noChanges = new AgentsService(repository({
    update: async () => ({ noChanges: true, rowCount: 0 })
  }));

  await assert.rejects(
    noChanges.update(1, {}),
    { status: 400, message: 'No hay datos para actualizar' }
  );

  const missing = new AgentsService(repository({
    update: async () => ({ noChanges: false, rowCount: 0 })
  }));

  await assert.rejects(
    missing.update(1, { nombre: 'X' }),
    { status: 404, message: 'Agente no encontrado' }
  );
});

test('AGSVC-004 update exitoso conserva contrato', async () => {
  const service = new AgentsService(repository());

  assert.deepEqual(await service.update(1, { nombre: 'X' }), {
    success: true,
    message: 'Agente actualizado correctamente'
  });
});

test('AGSVC-005 delete conserva 404 y contrato success', async () => {
  const missing = new AgentsService(repository({ delete: async () => 0 }));

  await assert.rejects(
    missing.delete(1),
    { status: 404, message: 'Agente no encontrado' }
  );

  const service = new AgentsService(repository());

  assert.deepEqual(await service.delete(1), {
    success: true,
    message: 'Agente eliminado correctamente'
  });
});

test('AGSVC-006 getById conserva 404', async () => {
  const service = new AgentsService(repository({ getById: async () => null }));

  await assert.rejects(
    service.getById(9),
    { status: 404, message: 'Agente no encontrado' }
  );
});

test('AGSVC-007 categorias y completo delegan', async () => {
  const service = new AgentsService(repository());

  assert.deepEqual(await service.listCategories(), ['A', 'B']);
  assert.deepEqual(await service.listComplete(), [{ id: 1 }]);
});

test('AGSVC-008 CSV conserva BOM, headers y escapado de comillas', async () => {
  const service = new AgentsService(repository({
    listForExport: async () => [{
      id: 1,
      nombre: 'Ana "A"',
      dni: '123',
      carnet: '',
      correo: 'a@x.com',
      estado: 'activo',
      lider_2026: 'L1',
      ubicacion: 'Lima',
      localidad: 'Centro',
      categoria_label: 'Senior',
      funciones: 'Cobranza',
      fecha_registro: '22/08/2026'
    }]
  }));

  const csv = await service.exportCsv();

  assert.equal(csv.charCodeAt(0), 0xFEFF);
  assert.match(csv, /ID,Nombre,DNI,Carnet,Correo,Estado,Líder,Ubicación,Localidad,Categoría,Funciones,Fecha Registro/);
  assert.ok(csv.includes('"Ana ""A"""'));
  assert.ok(csv.includes('"22/08/2026"'));
});
