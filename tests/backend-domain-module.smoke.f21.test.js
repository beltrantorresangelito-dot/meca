const test = require('node:test');
const assert = require('node:assert/strict');

test('DOMMOD-SMOKE exporta Repository y Service desde archivos reales', () => {
  const DomainRepository = require('../src/modules/domain/domain.repository');
  const DomainService = require('../src/modules/domain/domain.service');

  assert.equal(typeof DomainRepository, 'function');
  assert.equal(typeof DomainService, 'function');
});

test('DOMMOD-SMOKE domain.routes expone registerDomainRoutes', () => {
  const { registerDomainRoutes } = require(
    '../src/modules/domain/domain.routes'
  );

  assert.equal(typeof registerDomainRoutes, 'function');
});
