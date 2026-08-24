const test = require('node:test');
const assert = require('node:assert/strict');
const Repository = require('../src/modules/versions/versions.repository');

test('VERREPO-001 list sin tipo devuelve todo ordenado', async () => {
  let call;
  const repo = new Repository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [] };
    }
  });

  assert.deepEqual(await repo.list(), []);
  assert.match(call.sql, /SELECT \* FROM versiones_sistema/);
  assert.match(call.sql, /ORDER BY fecha_publicacion DESC/);
  assert.deepEqual(call.params, []);
});

test('VERREPO-002 list filtra por tipo', async () => {
  let call;
  const repo = new Repository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [] };
    }
  });

  await repo.list('frontend');

  assert.match(call.sql, /WHERE tipo = \$1/);
  assert.deepEqual(call.params, ['frontend']);
});

test('VERREPO-003 tipo todos no filtra', async () => {
  let call;
  const repo = new Repository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [] };
    }
  });

  await repo.list('todos');

  assert.doesNotMatch(call.sql, /WHERE tipo = \$1/);
  assert.deepEqual(call.params, []);
});

test('VERREPO-004 create conserva contrato real', async () => {
  let call;
  const repo = new Repository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [{ id: 9 }] };
    }
  });

  const id = await repo.create({
    version: '1.2.3',
    tipo: 'frontend',
    descripcion: 'desc',
    publicado_por: 'admin',
    contenido_html: '<h1>x</h1>',
    nombre_archivo: 'index.html'
  });

  assert.equal(id, 9);
  assert.match(call.sql, /INSERT INTO versiones_sistema/);
  assert.match(call.sql, /RETURNING id/);
  assert.equal(call.params[6], '<h1>x</h1>'.length);
  assert.equal(call.params[7], false);
});

test('VERREPO-005 deactivateByType conserva tipo', async () => {
  let call;
  const repo = new Repository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rowCount: 3 };
    }
  });

  assert.equal(await repo.deactivateByType('frontend'), 3);
  assert.match(call.sql, /SET es_activo = false WHERE tipo = \$1/);
  assert.deepEqual(call.params, ['frontend']);
});

test('VERREPO-006 activateById devuelve null si no existe', async () => {
  const repo = new Repository({
    async query() {
      return { rows: [] };
    }
  });

  assert.equal(await repo.activateById(5), null);
});

test('VERREPO-007 deleteById mantiene borrado físico', async () => {
  let sql;
  const repo = new Repository({
    async query(q) {
      sql = String(q);
      return { rows: [{ id: 5 }] };
    }
  });

  assert.equal(await repo.deleteById(5), 5);
  assert.match(sql, /DELETE FROM versiones_sistema/);
});
