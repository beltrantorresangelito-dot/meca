const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
const server=fs.readFileSync(path.resolve(__dirname,'../server.js'),'utf8');

test('LEGACYMAT-SERVER-001 endpoint usa servicio extraído',()=>{const s=server.indexOf("if (ruta === '/api/matriz/versiones/activa'"); const e=server.indexOf('// ---------- OBTENER VERSIÓN POR FECHA ----------',s); const b=server.slice(s,e); assert.match(b,/legacyMatrixService\.getActiveVersion\(\)/); assert.doesNotMatch(b,/pool\.query/);});

test('LEGACYMAT-SERVER-002 mantiene 404',()=>{const s=server.indexOf("if (ruta === '/api/matriz/versiones/activa'"); const e=server.indexOf('// ---------- OBTENER VERSIÓN POR FECHA ----------',s); const b=server.slice(s,e); assert.match(b,/writeHead\(404/); assert.match(b,/No hay versión activa/);});

test('LEGACYMAT-SERVER-003 no toca evaluacion version activa',()=>{const s=server.indexOf("if (ruta === '/api/evaluacion/version-activa'"); const e=server.indexOf('// ======================================================',s); assert.match(server.slice(s,e),/pool\.query/);});
