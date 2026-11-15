import test from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from './worker.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const token='test-editorial-abcdefghijklmnopqrstuvwxyz012345';
const env={ENVIRONMENT:'preview',PREVIEW_ORIGIN:'https://agenciabeat-preview.pages.dev',EDITORIAL_ADMIN_TOKEN:token,PREVIEW_WRITES_ENABLED:'true',SUPABASE_PREVIEW_URL:'https://qa-project.supabase.co',SUPABASE_PREVIEW_SERVICE_KEY:'qa-only-test'};
const req=(path,body,auth=true)=>new Request('https://worker.example.test'+path,{method:'POST',headers:{'content-type':'application/json',...(auth?{authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});
const uuid='12345678-1234-4234-8234-123456789abc';
test('CMS manual: no acepta borrar definitivamente ni acciones desconocidas',async()=>{
 for(const action of ['delete','purge','publish','unpublish']){
  const r=await worker.fetch(req('/api/manual/change',{id:uuid,expected_revision:1,action}),env);
  assert.equal(r.status,400,action);
 }
});
test('CMS manual: exige revisión para cambios de noticia',async()=>{
 const r=await worker.fetch(req('/api/manual/change',{id:uuid,action:'trash'}),env);
 assert.equal(r.status,400);
});
test('CMS manual: papelera y restauración usan PATCH condicional por revisión',async()=>{
 const old=globalThis.fetch;
 try{
  for(const action of ['trash','restore']){
   let count=0;
   globalThis.fetch=async(url,options)=>{
    count++;
    assert.equal(options.method,'PATCH');
    assert.match(url,/revision=eq\.7/);
    assert.match(url,/id=eq\.12345678-1234-4234-8234-123456789abc/);
    const payload=JSON.parse(options.body);
    assert.equal(payload.revision,8);
    assert.equal(action==='restore',payload.deleted_at===null);
    if(action==='trash')assert.ok(payload.deleted_at);
    return Response.json([{id:uuid,revision:8,deleted_at:payload.deleted_at}]);
   };
   const r=await worker.fetch(req('/api/manual/change',{id:uuid,expected_revision:7,action}),env);
   assert.equal(r.status,200,action);
   assert.equal(count,1);
  }
 }finally{globalThis.fetch=old;}
});
test('CMS manual: conflicto de revisión no sobrescribe cambios',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async()=>Response.json([]);
  const r=await worker.fetch(req('/api/manual/change',{id:uuid,expected_revision:7,action:'edit',fields:{titulo:'Título corregido'}}),env);
  assert.equal(r.status,409);
 }finally{globalThis.fetch=old;}
});
test('CMS manual: visitante sin token no puede modificar noticias',async()=>{
 const r=await worker.fetch(req('/api/manual/change',{id:uuid,expected_revision:7,action:'trash'},false),env);
 assert.equal(r.status,401);
});
test('CMS manual: publicación pública excluye borradores y papelera en consulta',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=async(url,options)=>{
   assert.match(url,/estado=eq\.publicado/);
   assert.match(url,/deleted_at=is\.null/);
   assert.equal(options.method,'GET');
   return Response.json([{id:uuid,titulo:'Nota publicada'}]);
  };
  const r=await worker.fetch(new Request('https://worker.example.test/api/public/manual'),env);
  assert.equal(r.status,200);
  assert.equal((await r.json()).rows.length,1);
 }finally{globalThis.fetch=old;}
});

test('CMS manual: crear noticia propia inicia en borrador y no llama Blogger',async()=>{
 const old=globalThis.fetch;let calls=0;
 try{
  globalThis.fetch=async(url,options)=>{
   calls++;
   assert.match(url,/qa-project\.supabase\.co\/rest\/v1\/beat_manual_preview$/);
   assert.equal(options.method,'POST');
   const payload=JSON.parse(options.body);
   assert.equal(payload.titulo,'Nueva nota');
   assert.equal(payload.estado,'borrador');
   assert.equal(payload.sitio_id,'agenciabeat');
   return Response.json([{id:uuid,revision:1,...payload}]);
  };
  const r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'Nueva nota',categoria:'sociedad',contenido:'Contenido',estado:'borrador'}}),env);
  assert.equal(r.status,201);
  assert.equal((await r.json()).row.id,uuid);
  assert.equal(calls,1);
 }finally{globalThis.fetch=old;}
});
test('CMS manual: creación rechaza título vacío sin escritura',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=()=>{throw Error('No debe escribir en QA')};
  const r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'  '}}),env);
  assert.equal(r.status,400);
 }finally{globalThis.fetch=old;}
});
test('CMS manual: creación rechaza imagen insegura sin escritura',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=()=>{throw Error('No debe escribir en QA')};
  const r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'Nota',imagen_url:'http://inseguro.example/imagen.jpg'}}),env);
  assert.equal(r.status,400);
 }finally{globalThis.fetch=old;}
});
test('CMS manual: escritura desactivada impide alta incluso con token válido',async()=>{
 const old=globalThis.fetch;
 try{
  globalThis.fetch=()=>{throw Error('No debe escribir en QA')};
  const r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'Nota'}}),{...env,PREVIEW_WRITES_ENABLED:'false'});
  assert.equal(r.status,403);
 }finally{globalThis.fetch=old;}
});
