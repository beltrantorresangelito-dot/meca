const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createAnalyticsModule,
  createAnalyticsHandler
} =
  require('../src/modules/analytics');


function fakeDb() {
  return {
    async query() {
      return {
        rows: []
      };
    }
  };
}


test(
  'ANAMOD-A1-001 compone repository service controller y handler',
  () => {
    const module =
      createAnalyticsModule({
        db: fakeDb()
      });

    assert.ok(module.repository);
    assert.ok(module.service);
    assert.ok(module.controller);

    assert.equal(
      typeof module.handler,
      'function'
    );
  }
);


test(
  'ANAMOD-A1-002 factory pública devuelve handler',
  () => {
    const handler =
      createAnalyticsHandler({
        db: fakeDb()
      });

    assert.equal(
      typeof handler,
      'function'
    );
  }
);


test(
  'ANAMOD-A1-003 exige db',
  () => {
    assert.throws(
      () =>
        createAnalyticsModule({}),
      /requiere db/
    );
  }
);

