import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from './worker-cloudflare-preview.mjs';
if(!globalThis.crypto)globalThis.crypto=webcrypto;
const env={ENVIRONMENT:'preview',EDITORIAL_ADMIN_TOKEN:'x'.repeat(40),SUPABASE_PREVIEW_URL:'https://tqxbwgirsytlplmxswyt.supabase.co',SUPABASE_PREVIEW_SERVICE_KEY:'test',PREVIEW_WRITES_ENABLED:'true'};
const req=(path,body)=>new Request('https://test'+path,{method:'POST',headers:{authorization:'Bearer '+env.EDITORIAL_ADMIN_TOKEN},body:JSON.stringify(body)});
test('Manual: bloqueo, creación, conflicto y campos protegidos',async()=>{
 let calls=[];globalThis.fetch=async(u,o)=>{calls.push({u,o});return Response.json(o.method==='PATCH'?[]:[{id:'test',titulo:'Nota propia'}]);};
 let r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'Nota propia'}}),{...env,PREVIEW_WRITES_ENABLED:'false'});assert.equal(r.status,403);assert.equal(calls.length,0);
 r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'Nota propia'}}),env);assert.equal(r.status,201);assert.equal(JSON.parse(calls[0].o.body).sitio_id,'agenciabeat');
 for(const fields of [{titulo:'x',estado:'archivado'},{titulo:'x',revision:50},{titulo:'x',imagen_url:'http://unsafe.test'}]){r=await worker.fetch(req('/api/manual/create',{fields}),env);assert.equal(r.status,400);}
 r=await worker.fetch(req('/api/manual/change',{id:'12345678-1234-1234-1234-123456789012',expected_revision:2,action:'trash'}),env);assert.equal(r.status,409);assert.equal(calls[1].o.method,'PATCH');assert.match(calls[1].u,/revision=eq.2/);assert.equal(JSON.parse(calls[1].o.body).revision,3);
 r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'x'}}),{...env,SUPABASE_PREVIEW_URL:'https://opnuuhnjdbczevvgtnbw.supabase.co'});assert.equal(r.status,503);assert.equal(calls.length,2);
});
test('Lectura pública exige publicado y excluye papelera; publicación válida en preview',async()=>{
 let calls=[];globalThis.fetch=async(u,o)=>{calls.push({u,o});return Response.json([{id:'test',titulo:'Prueba'}]);};
 let r=await worker.fetch(new Request('https://test/api/public/manual'),env);assert.equal(r.status,200);assert.match(calls[0].u,/estado=eq.publicado&deleted_at=is.null/);assert.match(calls[0].u,/select=id,titulo/);
 r=await worker.fetch(req('/api/manual/change',{id:'12345678-1234-1234-1234-123456789012',expected_revision:1,action:'edit',fields:{estado:'publicado'}}),env);assert.equal(r.status,200);
 r=await worker.fetch(new Request('https://test/api/public/manual'),{...env,ENVIRONMENT:'production'});assert.equal(r.status,503);assert.equal(calls.length,2);
});
