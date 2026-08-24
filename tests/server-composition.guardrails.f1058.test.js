const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('ARCHGUARD-001 server.js no puede contener SQL directo', () => {
  assert.doesNotMatch(server, /\bpool\.query\s*\(/);
  assert.doesNotMatch(server, /\bpool\.connect\s*\(/);
  assert.doesNotMatch(server, /\bSELECT\s+/i);
  assert.doesNotMatch(server, /\bINSERT\s+INTO\b/i);
  assert.doesNotMatch(server, /\bUPDATE\s+\w+\s+SET\b/i);
  assert.doesNotMatch(server, /\bDELETE\s+FROM\b/i);
});

test('ARCHGUARD-002 server.js no puede declarar funciones de negocio', () => {
  assert.doesNotMatch(
    server,
    /^(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/m
  );
});

test('ARCHGUARD-003 mini-router legacy no puede reaparecer', () => {
  assert.doesNotMatch(server, /registerDomainRoutes/);
  assert.doesNotMatch(server, /const routes\s*=\s*\{\}/);
  assert.doesNotMatch(server, /function registrarRuta/);
  assert.doesNotMatch(server, /routes\[ruta\]/);
});

test('ARCHGUARD-004 nuevos dominios deben entrar por handlers', () => {
  const createServerAt = server.indexOf('http.createServer');

  const handlerDefinitions = [
    ...server.matchAll(
      /const\s+(handle[A-Za-z0-9_]+Request)\s*=\s*create[A-Za-z0-9_]+Handler/g
    )
  ];

  assert.ok(
    handlerDefinitions.length >= 10,
    `Se detectaron solo ${handlerDefinitions.length} handlers compuestos`
  );

  for (const match of handlerDefinitions) {
    assert.ok(
      match.index < createServerAt,
      `${match[1]} fue creado dentro del callback HTTP`
    );
  }
});

test('ARCHGUARD-005 seguridad transversal no puede desaparecer', () => {
  assert.match(server, /applyCors\(peticion, respuesta\)/);
  assert.match(server, /verifyToken\(bearer/);
  assert.match(server, /authorizeRequest\(\{/);
});

test('ARCHGUARD-006 fallback 404 debe permanecer', () => {
  assert.match(
    server,
    /error:\s*'Ruta no encontrada'/
  );
});

test('ARCHGUARD-007 server.js no debe volver a superar 450 líneas', () => {
  const count = server.split(/\r?\n/).length;

  assert.ok(
    count < 450,
    `server.js excedió el guardrail: ${count} líneas`
  );
});

test('ARCHGUARD-008 capas críticas siguen modularizadas', () => {
  for (const handler of [
    'handleUsersRequest',
    'handleRolesRequest',
    'handleEvaluationsRequest',
    'handleReportsRequest',
    'handleSessionsRequest',
    'handleGenericQueryRequest',
    'handleGenericRpcRequest',
    'handleMatrixReadRequest',
    'handleMatrixWriteRequest',
    'handleHealthRequest'
  ]) {
    assert.match(
      server,
      new RegExp(handler)
    );
  }
});

test('ARCHGUARD-009 mail residual no puede reaparecer', () => {
  assert.doesNotMatch(server, /require\(['"]nodemailer['"]\)/);
  assert.doesNotMatch(server, /createTransport\s*\(/);
});

test('ARCHGUARD-010 imports muertos conocidos no pueden reaparecer', () => {
  assert.doesNotMatch(server, /const fs = require\('fs'\)/);
  assert.doesNotMatch(server, /const path = require\('path'\)/);
});
