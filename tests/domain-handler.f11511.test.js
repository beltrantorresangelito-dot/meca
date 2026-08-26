const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createDomainHandler
} = require('../src/modules/domain/domain.routes');

function fakeControllerService() {
  return {};
}

test('F11511-DOM-001 ruta desconocida devuelve false', async () => {
  const handler = createDomainHandler({
    service: fakeControllerService()
  });

  const handled = await handler({
    ruta: '/api/otra',
    metodo: 'GET',
    peticion: {},
    respuesta: {},
    query: {}
  });

  assert.equal(handled, false);
});

test('F11511-DOM-002 método no GET devuelve false', async () => {
  const handler = createDomainHandler({
    service: fakeControllerService()
  });

  const handled = await handler({
    ruta: '/api/domain/campanas',
    metodo: 'POST',
    peticion: {},
    respuesta: {},
    query: {}
  });

  assert.equal(handled, false);
});
