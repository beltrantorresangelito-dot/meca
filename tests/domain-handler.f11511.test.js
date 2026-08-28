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

test(
  'F11511-DOM-002 método no soportado devuelve false',
  async () => {
    const handler =
      createDomainHandler({
        service: {}
      });

    const result =
      await handler({
        ruta: '/api/domain/quiebres',
        metodo: 'DELETE',
        peticion: {},
        respuesta: {},
        query: {}
      });

    assert.equal(
      result,
      false
    );
  }
);
