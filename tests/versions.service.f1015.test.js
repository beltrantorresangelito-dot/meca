const test = require('node:test');
const assert = require('node:assert/strict');
const Service = require('../src/modules/versions/versions.service');

function repo(overrides = {}) {
  return {
    list: async () => [],
    create: async () => 1,
    deactivateByType: async () => 1,
    activateById: async id => id,
    deleteById: async id => id,
    ...overrides
  };
}

test('VERSVC-001 list delega repository', async () => {
  let tipo;
  const s = new Service(repo({
    list: async t => {
      tipo = t;
      return [{ id: 1 }];
    }
  }));

  assert.deepEqual(await s.list('frontend'), [{ id: 1 }]);
  assert.equal(tipo, 'frontend');
});

test('VERSVC-002 publish valida objeto', async () => {
  const s = new Service(repo());

  await assert.rejects(
    s.publish(null),
    {
      status: 400,
      message: 'Versión inválida'
    }
  );
});

test('VERSVC-003 publish exige contenido_html string', async () => {
  const s = new Service(repo());

  await assert.rejects(
    s.publish({ contenido_html: null }),
    {
      status: 400,
      message: 'contenido_html requerido'
    }
  );
});

test('VERSVC-004 publish delega repository', async () => {
  let received;
  const s = new Service(repo({
    create: async data => {
      received = data;
      return 8;
    }
  }));

  const data = {
    version: '1.0',
    tipo: 'frontend',
    contenido_html: '<html></html>'
  };

  assert.equal(await s.publish(data), 8);
  assert.equal(received, data);
});

test('VERSVC-005 activate valida id', async () => {
  const s = new Service(repo());

  await assert.rejects(
    s.activate(null, 'frontend'),
    {
      status: 400,
      message: 'ID de versión requerido'
    }
  );
});

test('VERSVC-006 activate valida tipo', async () => {
  const s = new Service(repo());

  await assert.rejects(
    s.activate(1, null),
    {
      status: 400,
      message: 'Tipo requerido'
    }
  );
});

test('VERSVC-007 activate desactiva tipo antes de activar id', async () => {
  const calls = [];
  const s = new Service(repo({
    deactivateByType: async tipo => {
      calls.push(['deactivate', tipo]);
      return 2;
    },
    activateById: async id => {
      calls.push(['activate', id]);
      return id;
    }
  }));

  assert.equal(await s.activate(5, 'frontend'), 5);
  assert.deepEqual(calls, [
    ['deactivate', 'frontend'],
    ['activate', 5]
  ]);
});

test('VERSVC-008 delete valida id', async () => {
  const s = new Service(repo());

  await assert.rejects(
    s.delete(null),
    {
      status: 400,
      message: 'ID de versión requerido'
    }
  );
});

test('VERSVC-009 delete delega repository', async () => {
  const s = new Service(repo());

  assert.equal(await s.delete(7), 7);
});
