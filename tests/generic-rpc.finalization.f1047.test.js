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
    '../src/modules/generic-rpc/generic-rpc.routes.js'
  ),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/generic-rpc/generic-rpc.controller.js'
  ),
  'utf8'
);

const service = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/generic-rpc/generic-rpc.service.js'
  ),
  'utf8'
);

const repository = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/generic-rpc/generic-rpc.repository.js'
  ),
  'utf8'
);

test('RPCFINAL-001 único punto de entrada es handleGenericRpcRequest', () => {
  assert.match(
    server,
    /await handleGenericRpcRequest\(\{/
  );

  assert.doesNotMatch(
    server,
    /if \(ruta\.match\(\/\^\\\/api\\\/rpc/
  );
});

test('RPCFINAL-002 server no instancia capas internas', () => {
  assert.doesNotMatch(server, /new GenericRpcRepository/);
  assert.doesNotMatch(server, /new GenericRpcService/);
  assert.doesNotMatch(server, /new GenericRpcController/);
});

test('RPCFINAL-003 routes conserva POST regex y parsing', () => {
  assert.match(routes, /\/api\/rpc/);
  assert.match(routes, /metodo === 'POST'/);
  assert.match(routes, /req\.on\(/);
  assert.match(routes, /'data'/);
  assert.match(routes, /'end'/);
  assert.match(routes, /JSON\.parse\(body\)/);
});

test('RPCFINAL-004 routes conserva sanitización functionName', () => {
  assert.match(routes, /split\('\/'\)/);
  assert.match(routes, /replace\(/);
  assert.match(routes, /\[\^a-zA-Z0-9_\]/);
});

test('RPCFINAL-005 Controller concentra HTTP y error/code', () => {
  assert.match(controller, /200/);
  assert.match(controller, /500/);
  assert.match(controller, /code: error\.code \|\| 'ERROR'/);
  assert.match(
    controller,
    /\[API \/api\/rpc\/\$\{functionName\}\] Error:/
  );
});

test('RPCFINAL-006 Service conserva tres comportamientos', () => {
  assert.match(service, /functionName === 'cerrar_mes'/);
  assert.match(
    service,
    /functionName ===\s*'limpiar_sesiones_expiradas'/
  );
  assert.match(service, /repository\.callFunction/);
});

test('RPCFINAL-007 cerrar_mes conserva contrato direct', () => {
  assert.match(service, /type: 'direct'/);
  assert.match(repository, /SELECT cerrar_mes\(\$1, \$2, \$3\) as resultado/);
  assert.match(repository, /params\.p_usuario \|\| 'admin'/);
});

test('RPCFINAL-008 limpiar sesiones conserva SQL especial', () => {
  assert.match(
    repository,
    /UPDATE sesiones_activas SET estado = 'cerrada'/
  );
  assert.match(
    repository,
    /INTERVAL '30 minutes'/
  );
  assert.match(
    repository,
    /limpiadas: result\.rowCount/
  );
});

test('RPCFINAL-009 fallback conserva placeholders y SELECT función', () => {
  assert.match(
    repository,
    /paramKeys[\s\S]*map[\s\S]*`\$\$\{i \+ 1\}`/
  );
  assert.match(
    repository,
    /SELECT \* FROM \$\{functionName\}\(\$\{placeholders\}\)/
  );
  assert.match(
    repository,
    /SELECT \* FROM \$\{functionName\}\(\)/
  );
});

test('RPCFINAL-010 riesgos pendientes permanecen explícitos', () => {
  // No allowlist funcional todavía.
  assert.doesNotMatch(
    routes + service + repository,
    /ALLOWED_FUNCTIONS|allowedFunctions|allowlist/
  );

  // cerrar_mes mantiene fallback admin.
  assert.match(
    repository,
    /params\.p_usuario \|\| 'admin'/
  );
});

test('RPCFINAL-011 Generic Query sigue separado', () => {
  assert.match(server, /handleGenericQueryRequest/);
  assert.match(server, /handleGenericRpcRequest/);
});

test('RPCFINAL-012 autorización central precede dispatcher', () => {
  const authz = server.indexOf('authorizeRequest({');
  const rpc = server.indexOf('handleGenericRpcRequest({');

  assert.ok(authz >= 0);
  assert.ok(rpc >= 0);
  assert.ok(authz < rpc);
});

test('RPCFINAL-013 módulos cerrados siguen registrados', () => {
  for (const handler of [
    'handleEvaluationsRequest',
    'handleSessionsRequest',
    'handleRequestsRequest',
    'handlePdaRequest',
    'handleQuartileCriteriaRequest',
    'handleVersionsRequest',
    'handleDatabaseStatusRequest',
    'handleAudioProxyRequest',
    'handleMatrixRecalculationRequest',
    'handleGenericQueryRequest'
  ]) {
    assert.match(server, new RegExp(handler));
  }
});
