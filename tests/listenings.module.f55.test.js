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
