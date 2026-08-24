const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('MAILRES-F1049-001 residual Nodemailer eliminado', () => {
  assert.doesNotMatch(
    source,
    /require\(['"]nodemailer['"]\)/
  );

  assert.doesNotMatch(
    source,
    /createTransport\s*\(/
  );
});

test('MAILRES-F1049-002 no existe funcionalidad mail activa en server', () => {
  assert.doesNotMatch(
    source,
    /transporter\.sendMail\s*\(/
  );

  assert.doesNotMatch(
    source,
    /\/api\/(?:mail|email|correo|send-mail|enviar-correo)/
  );
});

test('MAILRES-F1049-003 vistas permanecen disponibles mediante HttpStaticViews', () => {
  assert.match(
    source,
    /createHttpStaticViewsHandler/
  );

  assert.match(
    source,
    /handleHttpStaticViewsRequest/
  );
});
