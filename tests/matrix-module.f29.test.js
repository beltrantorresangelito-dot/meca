const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MatrixRepository,
  MatrixService,
  MatrixController,
  createMatrixReadHandler
} = require('../src/modules/matrix');

test('MATRIXMOD-001 módulo formal exporta sus cuatro capas', () => {
  assert.equal(typeof MatrixRepository, 'function');
  assert.equal(typeof MatrixService, 'function');
  assert.equal(typeof MatrixController, 'function');
  assert.equal(typeof createMatrixReadHandler, 'function');
});

test('MATRIXMOD-002 legacy repository reexporta MatrixRepository', () => {
  const LegacyRepository = require(
    '../src/modules/domain/legacy-matrix.repository'
  );
  assert.strictEqual(LegacyRepository, MatrixRepository);
});

test('MATRIXMOD-003 legacy service reexporta MatrixService', () => {
  const LegacyService = require(
    '../src/modules/domain/legacy-matrix.service'
  );
  assert.strictEqual(LegacyService, MatrixService);
});
