const test=require('node:test');
const assert=require('node:assert/strict');
const R=require('../src/modules/quartile-criteria/quartile-criteria.repository');

test('CQREPO-001 listAll conserva orden',async()=>{
 let sql; const r=new R({async query(q){sql=String(q);return{rows:[]}}});
 assert.deepEqual(await r.listAll(),[]);
 assert.match(sql,/ORDER BY fecha_vigencia_desde DESC, orden ASC/);
});
test('CQREPO-002 activos conserva vigencia',async()=>{
 let c; const r=new R({async query(q,p){c={q:String(q),p};return{rows:[]}}});
 await r.listActiveByDate('2026-08-23');
 assert.match(c.q,/activo = true/); assert.match(c.q,/fecha_vigencia_desde <= \$1/);
 assert.match(c.q,/fecha_vigencia_hasta IS NULL/); assert.deepEqual(c.p,['2026-08-23']);
});
test('CQREPO-003 create conserva legacy',async()=>{
 let c; const r=new R({async query(q,p){c={q:String(q),p};return{rows:[{id:1}]}}});
 assert.deepEqual(await r.create({cuartil:'Q1',nombre:'Uno',limite_inferior:0,limite_superior:25,color_hex:'#fff',icono:'x',orden:1,fecha_vigencia_desde:'2026-08-01',fecha_vigencia_hasta:'',activo:undefined}),{id:1});
 assert.equal(c.p[8],null); assert.equal(c.p[9],'admin'); assert.equal(c.p[10],true);
});
test('CQREPO-004 update conserva posiciones actuales',async()=>{
 let c; const r=new R({async query(q,p){c={q:String(q),p};return{rows:[{id:9}]}}});
 await r.update(9,{cuartil:'Q2',nombre:'Dos',limite_inferior:25,limite_superior:50,color_hex:'#000',icono:'y',orden:2,fecha_vigencia_desde:'2026-08-01',fecha_vigencia_hasta:null,activo:false});
 assert.match(c.q,/WHERE id = \$11/); assert.equal(c.p.length,11); assert.equal(c.p[7],false); assert.equal(c.p[9],null); assert.equal(c.p[10],9);
});
test('CQREPO-005 findBasicById null',async()=>{
 const r=new R({async query(){return{rows:[]}}}); assert.equal(await r.findBasicById(99),null);
});
test('CQREPO-006 deactivate lógico',async()=>{
 let sql; const r=new R({async query(q){sql=String(q);return{rowCount:1}}});
 assert.equal(await r.deactivate(5),1); assert.match(sql,/activo = false/); assert.doesNotMatch(sql,/DELETE FROM/);
});
test('CQREPO-007 activate null',async()=>{
 const r=new R({async query(){return{rows:[]}}}); assert.equal(await r.activate(1),null);
});
