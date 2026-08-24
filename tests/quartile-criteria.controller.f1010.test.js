const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/modules/quartile-criteria/quartile-criteria.controller');

function out(){
  let status,payload;
  return {
    res:{
      writeHead(code){status=code},
      end(body){payload=JSON.parse(body)}
    },
    get(){return{status,payload}}
  };
}
function svc(overrides={}){
  return{
    listAll:async()=>[],
    listActive:async()=>[],
    create:async()=>({id:1}),
    update:async id=>({id}),
    deactivate:async id=>({id,nombre:'Uno'}),
    activate:async id=>({id,activo:true}),
    ...overrides
  };
}
test('CQCTRL-001 listAll 200 success data',async()=>{
  const o=out();await new C(svc({listAll:async()=>[{id:1}]})).listAll(o.res);
  assert.deepEqual(o.get(),{status:200,payload:{success:true,data:[{id:1}]}})
});
test('CQCTRL-002 listActive 200',async()=>{
  const o=out();await new C(svc()).listActive(o.res);
  assert.deepEqual(o.get(),{status:200,payload:{success:true,data:[]}})
});
test('CQCTRL-003 create 201',async()=>{
  const o=out();await new C(svc()).create(o.res,{nombre:'N',cuartil:'Q1'});
  assert.deepEqual(o.get(),{status:201,payload:{success:true,data:{id:1}}})
});
test('CQCTRL-004 update 404',async()=>{
  const o=out();await new C(svc({update:async()=>null})).update(o.res,9,{});
  assert.deepEqual(o.get(),{status:404,payload:{success:false,error:'Criterio no encontrado'}})
});
test('CQCTRL-005 deactivate 404',async()=>{
  const o=out();await new C(svc({deactivate:async()=>null})).deactivate(o.res,9);
  assert.deepEqual(o.get(),{status:404,payload:{success:false,error:'Criterio no encontrado'}})
});
test('CQCTRL-006 deactivate conserva mensaje',async()=>{
  const o=out();await new C(svc()).deactivate(o.res,7);
  assert.equal(o.get().status,200);
  assert.equal(o.get().payload.success,true);
  assert.match(o.get().payload.message,/desactivado correctamente/)
});
test('CQCTRL-007 activate 404',async()=>{
  const o=out();await new C(svc({activate:async()=>null})).activate(o.res,9);
  assert.deepEqual(o.get(),{status:404,payload:{success:false,error:'Criterio no encontrado'}})
});
test('CQCTRL-008 error Service usa status',async()=>{
  const o=out();await new C(svc({listAll:async()=>{const e=new Error('bad');e.status=400;throw e}})).listAll(o.res);
  assert.deepEqual(o.get(),{status:400,payload:{success:false,error:'bad'}})
});
