const fs = require('node:fs');
const path = require('node:path');

const testPath = path.resolve(
  __dirname,
  '../tests/backend-domain-server-integration.f22.test.js'
);

const content = fs.readFileSync(testPath, 'utf8');
const marker = "test('DOMAPI-SERVER-001";
const start = content.indexOf(marker);
const next = content.indexOf('\ntest(', start + marker.length);
const end = next >= 0 ? next : content.length;
const block = content.slice(start, end);

console.log('===== DOMAPI-SERVER-001 ACTUAL =====');
console.log(block);
console.log('====================================');

if (/\bsource\b/.test(block)) {
  console.error('FAIL: todavía existe source');
  process.exit(1);
}

if (!/\bserver\b/.test(block)) {
  console.error('FAIL: no existe server');
  process.exit(1);
}

console.log('OK: el bloque usa server y no source.');
