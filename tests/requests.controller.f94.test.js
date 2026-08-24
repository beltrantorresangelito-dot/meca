const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/modules/requests/requests.controller');
function out(){let status,payload;return{res:{writeHead(c){status=c},end(b){payload=JSON.parse(b)}},get(){return{status,payload}}}}
function svc(o={}){return{listByUser:async()=>[],listAll:async()=>[],create:async()=>({id:1}),getById:async id=>({id}),updateStatus:async()=>1,...o}}
test('REQCTRL-001 listByUser 200',async()=>{const o=out();await new C(svc({listByUser:async()=>[{id:1}]})).listByUser(o.res,1);assert.deepEqual(o.get(),{status:200,payload:[{id:1}]})});
test('REQCTRL-002 listAll 200',async()=>{const o=out();await new C(svc()).listAll(o.res);assert.deepEqual(o.get(),{status:200,payload:[]})});
test('REQCTRL-003 create 201',async()=>{const o=out();await new C(svc()).create(o.res,{});assert.deepEqual(o.get(),{status:201,payload:{success:true,solicitud:{id:1}}})});
test('REQCTRL-004 getById 404',async()=>{const o=out();await new C(svc({getById:async()=>null})).getById(o.res,9);assert.deepEqual(o.get(),{status:404,payload:{error:'Solicitud no encontrada'}})});
test('REQCTRL-005 update 404',async()=>{const o=out();await new C(svc({updateStatus:async()=>0})).updateStatus(o.res,9,{estado:'X'});assert.deepEqual(o.get(),{status:404,payload:{error:'Solicitud no encontrada'}})});
test('REQCTRL-006 update 200',async()=>{const o=out();await new C(svc()).updateStatus(o.res,1,{estado:'OK'});assert.deepEqual(o.get(),{status:200,payload:{success:true}})});
test('REQCTRL-007 status Service',async()=>{const o=out();await new C(svc({listAll:async()=>{const e=new Error('bad');e.status=400;throw e}})).listAll(o.res);assert.deepEqual(o.get(),{status:400,payload:{error:'bad'}})});
test('REQCTRL-008 default 500',async()=>{const o=out();await new C(svc({create:async()=>{throw new Error('boom')}})).create(o.res,{});assert.deepEqual(o.get(),{status:500,payload:{error:'boom'}})});
