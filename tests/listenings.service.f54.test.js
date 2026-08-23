const test = require('node:test');
const assert = require('node:assert/strict');
const ListeningsService =
  require('../src/modules/listenings/listenings.service');

function repository(overrides = {}) {
  return {
    assignmentExists: async () => false,
    insertAssignment: async data => ({ id: data.id || 'X' }),
    listAssignments: async () => [],
    listTasks: async () => [],
    findRecentTaskByFilename: async () => null,
    insertTask: async data => ({ id: data.id }),
    withTransaction: async work => work({}),
    getTaskById: async id => ({ id, nombre_archivo: 'lote.xlsx' }),
    deleteAssignmentsByTask: async () => {},
    deleteTask: async () => {},
    listMyListenings: async () => [],
    startListening: async () => {},
    reportIncident: async () => {},
    markManaged: async () => {},
    cancelManagement: async () => {},
    getAssignmentByTicket: async () => ({ id: 1 }),
    reactivateByTicket: async () => {},
    listTicketsByTask: async () => [],
    ...overrides
  };
}

test('LISTSVC-001 saveAssignments valida datos', async () => {
  const service = new ListeningsService(repository());

  await assert.rejects(
    service.saveAssignments({}),
    { status: 400, message: 'Datos inválidos' }
  );
});

test('LISTSVC-002 saveAssignments cuenta insertados y duplicados', async () => {
  const service = new ListeningsService(repository({
    assignmentExists: async ticket => ticket === 'DUP'
  }));

  const result = await service.saveAssignments({
    tarea_id: 5,
    asignaciones: [
      { id: '1', ticket: 'OK' },
      { id: '2', ticket: 'DUP' }
    ]
  });

  assert.equal(result.total, 2);
  assert.equal(result.insertados, 1);
  assert.equal(result.duplicados, 1);
  assert.match(result.message, /1 asignaciones guardadas, 1 duplicadas omitidas/);
});

test('LISTSVC-003 createTask valida obligatorios', async () => {
  const service = new ListeningsService(repository());

  await assert.rejects(
    service.createTask({}),
    { status: 400, message: 'El campo id es requerido' }
  );

  await assert.rejects(
    service.createTask({ id: 1 }),
    { status: 400, message: 'El campo fecha_carga es requerido' }
  );
});

test('LISTSVC-004 createTask reutiliza lote reciente', async () => {
  const service = new ListeningsService(repository({
    findRecentTaskByFilename: async () => ({
      id: 10,
      total_registros: 50
    })
  }));

  const result = await service.createTask({
    id: 20,
    fecha_carga: '2026-08-22',
    nombre_archivo: 'x.xlsx'
  });

  assert.equal(result.reutilizado, true);
  assert.equal(result.id, 10);
  assert.equal(result.total_registros, 50);
});

test('LISTSVC-005 createTask crea lote nuevo', async () => {
  const service = new ListeningsService(repository());

  const result = await service.createTask({
    id: 20,
    fecha_carga: '2026-08-22',
    nombre_archivo: 'x.xlsx'
  });

  assert.equal(result.reutilizado, false);
  assert.equal(result.id, 20);
});

test('LISTSVC-006 deleteTask conserva 404 y success', async () => {
  const missing = new ListeningsService(repository({
    getTaskById: async () => null
  }));

  await assert.rejects(
    missing.deleteTask(1),
    { status: 404, message: 'Lote no encontrado' }
  );

  const service = new ListeningsService(repository());

  const result = await service.deleteTask(1);

  assert.deepEqual(result, {
    success: true,
    message: 'Lote "lote.xlsx" eliminado correctamente'
  });
});

test('LISTSVC-007 transiciones devuelven success', async () => {
  const service = new ListeningsService(repository());

  assert.deepEqual(await service.start('1'), { success: true });
  assert.deepEqual(
    await service.reportIncident('1', 'motivo'),
    { success: true }
  );
  assert.deepEqual(await service.manage('1'), { success: true });
  assert.deepEqual(await service.cancel('1'), { success: true });
  assert.deepEqual(await service.reactivate('T1'), { success: true });
});

test('LISTSVC-008 listTicketsByTask valida lote y 404', async () => {
  const invalid = new ListeningsService(repository());

  await assert.rejects(
    invalid.listTicketsByTask(0),
    { status: 400, message: 'ID de lote inválido' }
  );

  const missing = new ListeningsService(repository({
    getTaskById: async () => null
  }));

  await assert.rejects(
    missing.listTicketsByTask(99),
    { status: 404, message: 'Lote no encontrado' }
  );
});
