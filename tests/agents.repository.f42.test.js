const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const AgentsRepository = require('../src/modules/agents/agents.repository');

test('AGREPO-001 listado conserva filtros parametrizados', async () => {
  let call;

  const repository = new AgentsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [{ id: 1 }] };
    }
  });

  const rows = await repository.list({
    lider: 'L1',
    ubicacion: 'Lima',
    localidad: 'Centro'
  });

  assert.equal(rows.length, 1);
  assert.match(call.sql, /lider_2026 = \$1/);
  assert.match(call.sql, /ubicacion = \$2/);
  assert.match(call.sql, /localidad = \$3/);
  assert.match(call.sql, /ORDER BY nombre/);
  assert.deepEqual(call.params, ['L1', 'Lima', 'Centro']);
});

test('AGREPO-002 update sin campos devuelve noChanges sin consultar BD', async () => {
  let queried = false;

  const repository = new AgentsRepository({
    async query() {
      queried = true;
      return { rowCount: 1 };
    }
  });

  const result = await repository.update(7, {});

  assert.equal(result.noChanges, true);
  assert.equal(result.rowCount, 0);
  assert.equal(queried, false);
});

test('AGREPO-003 update conserva campos permitidos y updated_at', async () => {
  let call;

  const repository = new AgentsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rowCount: 1 };
    }
  });

  const result = await repository.update(7, {
    nombre: 'Nuevo',
    estado: 'activo',
    funciones: 'Cobranza'
  });

  assert.equal(result.noChanges, false);
  assert.equal(result.rowCount, 1);
  assert.match(call.sql, /nombre = \$1/);
  assert.match(call.sql, /estado = \$2/);
  assert.match(call.sql, /funciones = \$3/);
  assert.match(call.sql, /updated_at = NOW\(\)/);
  assert.match(call.sql, /WHERE id = \$4/);
  assert.deepEqual(call.params, ['Nuevo', 'activo', 'Cobranza', 7]);
});

test('AGREPO-004 delete conserva RETURNING id', async () => {
  let call;

  const repository = new AgentsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rowCount: 1 };
    }
  });

  assert.equal(await repository.delete(9), 1);
  assert.match(call.sql, /DELETE FROM agentes WHERE id = \$1 RETURNING id/);
  assert.deepEqual(call.params, [9]);
});

test('AGREPO-005 getById conserva null cuando no existe', async () => {
  const repository = new AgentsRepository({
    async query() {
      return { rows: [] };
    }
  });

  assert.equal(await repository.getById(999), null);
});

test('AGREPO-006 categorias conserva orden y filtro de vacíos', async () => {
  let sql;

  const repository = new AgentsRepository({
    async query(query) {
      sql = String(query);
      return {
        rows: [
          { categoria_label: 'A' },
          { categoria_label: 'B' }
        ]
      };
    }
  });

  assert.deepEqual(await repository.listCategories(), ['A', 'B']);
  assert.match(sql, /categoria_label IS NOT NULL/);
  assert.match(sql, /categoria_label != ''/);
  assert.match(sql, /ORDER BY categoria_label/);
});

test('AGREPO-007 completo y exportación conservan SQL legacy', async () => {
  const calls = [];

  const repository = new AgentsRepository({
    async query(sql) {
      calls.push(String(sql));
      return { rows: [] };
    }
  });

  await repository.listComplete();
  await repository.listForExport();

  assert.match(calls[0], /SELECT \* FROM agentes ORDER BY id/);
  assert.match(calls[1], /TO_CHAR\(created_at, 'DD\/MM\/YYYY'\) as fecha_registro/);
  assert.match(calls[1], /ORDER BY nombre/);
});

test('AGREPO-008 repository queda encapsulado por AgentsModule en F4.4', () => {
  const indexSource = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/agents/index.js'),
    'utf8'
  );

  const serverSource = fs.readFileSync(
    path.resolve(__dirname, '../server.js'),
    'utf8'
  );

  assert.match(indexSource, /AgentsRepository/);
  assert.match(indexSource, /createAgentsHandler/);
  assert.match(serverSource, /createAgentsHandler/);
  assert.doesNotMatch(serverSource, /new AgentsRepository/);
});
