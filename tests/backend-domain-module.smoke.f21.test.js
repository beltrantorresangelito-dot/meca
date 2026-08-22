const test = require('node:test');
const assert = require('node:assert/strict');

test('DOMMOD-SMOKE exporta Repository y Service', () => {
  const mod = require('../src/modules/domain');
  assert.equal(typeof mod.DomainRepository, 'function');
  assert.equal(typeof mod.DomainService, 'function');
});
