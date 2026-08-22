const test = require('node:test');
const assert = require('node:assert/strict');
const LegacyMatrixService = require('../src/modules/domain/legacy-matrix.service');
const Repository = require('../src/modules/domain/legacy-matrix.repository');

test('LEGACYMAT-001 repository conserva consulta legacy', async () => {
  let sql='';
  const r=new Repository({async query(q){sql=q;return {rows:[{id:1,version:'v1'}]};}});
  const row=await r.getLegacyActiveMatrixVersion();
  assert.equal(row.id,1); assert.match(sql,/SELECT\s+\*/i); assert.match(sql,/FROM\s+versiones_matriz/i); assert.match(sql,/activa\s*=\s*TRUE/i); assert.match(sql,/LIMIT\s+1/i);
});

test('LEGACYMAT-002 devuelve null sin activa', async () => {
  const r=new Repository({async query(){return {rows:[]};}});
  assert.equal(await r.getLegacyActiveMatrixVersion(),null);
});

test('LEGACYMAT-003 service no transforma contrato', async () => {
  const expected={id:2,version:'v2',activa:true};
  const s=new LegacyMatrixService({getLegacyActiveMatrixVersion:async()=>expected});
  assert.strictEqual(await s.getActiveVersion(),expected);
});
