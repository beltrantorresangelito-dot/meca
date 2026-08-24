const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const routes = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/evaluations/evaluations.routes.js'
  ),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/evaluations/evaluations.controller.js'
  ),
  'utf8'
);

const repository = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/evaluations/evaluations.repository.js'
  ),
  'utf8'
);

test('EVALFIX-711-001 POST delega controller.create', () => {
  assert.match(
    routes,
    /controller\.create\(respuesta, evaluation\)/
  );
});

test('EVALFIX-711-002 status 201 permanece en Controller', () => {
  assert.match(
    controller,
    /EvaluationsController\.json\(res, 201, result\)/
  );
});

test('EVALFIX-711-003 transacción permanece en Repository', () => {
  assert.match(repository, /query\('BEGIN'\)/);
  assert.match(repository, /query\('COMMIT'\)/);
  assert.match(repository, /query\('ROLLBACK'\)/);
  assert.match(repository, /client\.release\(\)/);
});
