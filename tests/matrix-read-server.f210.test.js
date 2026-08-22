const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('MATRIXREADSERVER-001 no quedan GET Matrix inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/frentes' && metodo === 'GET'\)/
  );
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/atributos' && metodo === 'GET'\)/
  );
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/sub-motivos' && metodo === 'GET'\)/
  );
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/reglas-evaluacion' && metodo === 'GET'\)/
  );
});

test('MATRIXREADSERVER-002 F2.11-B extrae Frentes y Atributos del server', () => {
  assert.match(server, /createMatrixWriteHandler/);
  assert.match(server, /handleMatrixWriteRequest/);

  // Frentes ya migrado en F2.11-A.
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/frentes' && metodo === 'POST'\)/
  );

  // Atributos ya migrado en F2.11-B.
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/atributos' && metodo === 'POST'\)/
  );

  // Submotivos permanece pendiente para F2.11-C.
  assert.match(
    server,
    /if \(ruta === '\/api\/matriz\/sub-motivos' && metodo === 'POST'\)/
  );
});

test('MATRIXREADSERVER-003 dispatcher Matrix sigue registrado', () => {
  assert.ok(server.includes('handleMatrixReadRequest'));
  assert.ok(server.includes('handleMatrixWriteRequest'));

  // Estado esperado tras F2.11-B:
  // Frentes y Atributos ya no están como handlers inline.
  assert.equal(
    server.includes(
      "if (ruta === '/api/matriz/frentes' && metodo === 'POST')"
    ),
    false
  );

  assert.equal(
    server.includes(
      "if (ruta === '/api/matriz/atributos' && metodo === 'POST')"
    ),
    false
  );

  // Submotivos todavía debe existir inline.
  assert.ok(
    server.includes(
      "if (ruta === '/api/matriz/sub-motivos' && metodo === 'POST')"
    )
  );
});
