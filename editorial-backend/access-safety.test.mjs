import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from './worker.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const env={ENVIRONMENT:'preview',PREVIEW_ORIGIN:'https://agenciabeat-preview.pages.dev',EDITORIAL_ADMIN_TOKEN:'qa-only-abcdefghijklmnopqrstuvwxyz012345'};
const url='https://editorial.example.test';
const req=(path,opts={})=>new Request(url+path,opts);

test('sin credenciales no se puede listar contenido editorial privado',async()=>{
 const response=await worker.fetch(req('/api/editorial/list'),env);
 assert.equal(response.status,401);
});
test('sin credenciales no se puede editar ni enviar a papelera',async()=>{
 for(const action of ['edit','trash','restore','reset']){
  const response=await worker.fetch(req('/api/editorial/change',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,post_id:'123',expected_revision:1,fields:{titulo:'No autorizado'}})}),env);
  assert.equal(response.status,401,action);
 }
});
test('escrituras desactivadas impiden cambios incluso con autorización',async()=>{
 const response=await worker.fetch(req('/api/editorial/change',{method:'POST',headers:{authorization:'Bearer '+env.EDITORIAL_ADMIN_TOKEN,'content-type':'application/json'},body:JSON.stringify({action:'trash',post_id:'123',expected_revision:1})}),env);
 assert.equal(response.status,403);
});
test('origen no autorizado se rechaza antes de ejecutar rutas',async()=>{
 const response=await worker.fetch(req('/api/editorial/list',{headers:{origin:'https://sitio-ajeno.example'}}),env);
 assert.equal(response.status,403);
});
test('entorno production no habilita accidentalmente Worker de preview',async()=>{
 const response=await worker.fetch(req('/health'),{...env,ENVIRONMENT:'production'});
 assert.equal(response.status,503);
});
