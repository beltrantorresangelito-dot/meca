const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('MAILREMOVE-001 nodemailer ya no existe en server.js', () => {
  assert.doesNotMatch(
    source,
    /require\(['"]nodemailer['"]\)/
  );
});

test('MAILREMOVE-002 createTransport ya no existe', () => {
  assert.doesNotMatch(
    source,
    /createTransport\s*\(/
  );
});

test('MAILREMOVE-003 no quedan variables SMTP del residual', () => {
  assert.doesNotMatch(source, /SMTP_HOST/);
  assert.doesNotMatch(source, /SMTP_PORT/);
  assert.doesNotMatch(source, /SMTP_USER/);
  assert.doesNotMatch(source, /SMTP_PASS/);
});

test('MAILREMOVE-004 no quedan credenciales placeholder', () => {
  assert.doesNotMatch(
    source,
    /tu-correo@gmail\.com/
  );

  assert.doesNotMatch(
    source,
    /tu-contraseña/
  );
});

test('MAILREMOVE-005 no existe transporter huérfano', () => {
  assert.doesNotMatch(
    source,
    /\btransporter\b/
  );
});

test('MAILREMOVE-006 vistas HTML siguen disponibles mediante HttpStaticViews', () => {
  assert.match(
    source,
    /createHttpStaticViewsHandler/
  );

  assert.match(
    source,
    /handleHttpStaticViewsRequest/
  );
});

test('MAILREMOVE-007 módulos cerrados siguen registrados', () => {
  for (const handler of [
    'handleGenericRpcRequest',
    'handleGenericQueryRequest',
    'handleMatrixRecalculationRequest',
    'handleAudioProxyRequest',
    'handleDatabaseStatusRequest',
    'handleVersionsRequest'
  ]) {
    assert.match(
      source,
      new RegExp(handler)
    );
  }
});

test('MAILREMOVE-008 server sigue sintácticamente limpio de residual mail', () => {
  assert.doesNotMatch(
    source,
    /ENDPOINT PARA ENVIAR CORREO/
  );

  assert.doesNotMatch(
    source,
    /npm install nodemailer/
  );
});
