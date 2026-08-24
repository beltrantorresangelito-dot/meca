const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/generic-query/generic-query.routes.js'
  ),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/generic-query/generic-query.controller.js'
  ),
  'utf8'
);

const service = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/generic-query/generic-query.service.js'
  ),
  'utf8'
);

const repository = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/generic-query/generic-query.repository.js'
  ),
  'utf8'
);

test('GENQFINAL-001 único punto de entrada es handleGenericQueryRequest', () => {
  assert.match(
    server,
    /await handleGenericQueryRequest\(\{/
  );

  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/query' && metodo === 'POST'\)/
  );
});

test('GENQFINAL-002 server no instancia capas internas', () => {
  assert.doesNotMatch(server, /new GenericQueryRepository/);
  assert.doesNotMatch(server, /new GenericQueryService/);
  assert.doesNotMatch(server, /new GenericQueryController/);
});

test('GENQFINAL-003 routes conserva POST y parsing JSON', () => {
  assert.match(routes, /\/api\/query/);
  assert.match(routes, /metodo === 'POST'/);
  assert.match(routes, /req\.on\(/);
  assert.match(routes, /'data'/);
  assert.match(routes, /'end'/);
  assert.match(routes, /JSON\.parse\(body\)/);
});

test('GENQFINAL-004 Controller concentra HTTP y payload PostgreSQL', () => {
  assert.match(controller, /200/);
  assert.match(controller, /error\.status \|\| 500/);
  assert.match(controller, /code: error\.code \|\| 'ERROR'/);
  assert.match(controller, /details: error\.detail \|\| ''/);
  assert.match(controller, /hint: error\.hint \|\| ''/);
});

test('GENQFINAL-005 Service concentra cinco operaciones', () => {
  for (const operation of [
    'select',
    'insert',
    'update',
    'delete',
    'upsert'
  ]) {
    assert.match(
      service,
      new RegExp(`case '${operation}'`)
    );
  }
});

test('GENQFINAL-006 Repository concentra SQL y filtros', () => {
  assert.match(repository, /SELECT \$\{fields\} FROM \$\{tableName\}/);
  assert.match(repository, /INSERT INTO \$\{tableName\}/);
  assert.match(repository, /UPDATE \$\{tableName\} SET/);
  assert.match(repository, /DELETE FROM \$\{tableName\}/);
  assert.match(repository, /case 'eq'/);
  assert.match(repository, /case 'neq'/);
  assert.match(repository, /case 'in'/);
});

test('GENQFINAL-007 insert y upsert arrays reinician placeholders', () => {
  const insertSection = repository.slice(
    repository.indexOf('async insert('),
    repository.indexOf('async update(')
  );

  const upsertSection = repository.slice(
    repository.indexOf('async upsert(')
  );

  assert.match(
    insertSection,
    /for \(const item of dataArray\) \{\s*let idx = 1;/
  );

  assert.match(
    upsertSection,
    /for \(const item of dataArray\) \{\s*let idx = 1;/
  );
});

test('GENQFINAL-008 update y delete sin filtros están bloqueados', () => {
  assert.match(
    repository,
    /UPDATE requiere al menos un filtro/
  );

  assert.match(
    repository,
    /DELETE requiere al menos un filtro/
  );

  assert.match(
    repository,
    /error\.status = 400/
  );
});

test('GENQFINAL-009 select conserva filtros avanzados', () => {
  for (const type of [
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'not',
    'contains'
  ]) {
    assert.match(
      repository,
      new RegExp(`case '${type}'`)
    );
  }
});

test('GENQFINAL-010 head count y order limit siguen soportados', () => {
  assert.match(repository, /isHead && countOption/);
  assert.match(repository, /COUNT\(\*\) as count/);
  assert.match(repository, /ORDER BY/);
  assert.match(repository, /LIMIT/);
});

test('GENQFINAL-011 riesgos pendientes permanecen explícitos', () => {
  // isSingle / isMaybeSingle todavía no transforman respuesta.
  assert.match(service, /isSingle/);
  assert.match(service, /isMaybeSingle/);

  // No existe allowlist funcional aún.
  assert.doesNotMatch(
    repository,
    /ALLOWED_TABLES|allowedTables|allowlist/
  );
});

test('GENQFINAL-012 módulos cerrados siguen registrados', () => {
  for (const handler of [
    'handleEvaluationsRequest',
    'handleSessionsRequest',
    'handleRequestsRequest',
    'handlePdaRequest',
    'handleQuartileCriteriaRequest',
    'handleVersionsRequest',
    'handleDatabaseStatusRequest',
    'handleAudioProxyRequest',
    'handleMatrixRecalculationRequest'
  ]) {
    assert.match(server, new RegExp(handler));
  }
});

test('GENQFINAL-013 autorización central precede dispatcher', () => {
  const authz = server.indexOf('authorizeRequest({');
  const query = server.indexOf('handleGenericQueryRequest({');

  assert.ok(authz >= 0);
  assert.ok(query >= 0);
  assert.ok(authz < query);
});
