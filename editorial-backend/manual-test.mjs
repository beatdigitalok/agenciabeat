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

test('IA privada: configuración, generación sin guardar y rechazo de salida incompleta',async()=>{
 let calls=[];const aiEnv={...env,AI_PREVIEW_ENABLED:'true',GEMINI_API_KEY:'test-secret',GEMINI_TEXT_MODEL:'gemini-test'};globalThis.fetch=async(u,o)=>{calls.push({u,o});return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify({titulo:'Título',bajada:'Bajada',contenido:'Cuerpo',prompt_imagen:'Ilustración',pendientes:[]})}]}}]});};
 const body={material:'Información de base suficiente para redactar una noticia propia de prueba.'};let r=await worker.fetch(req('/api/manual/generate',body),env);assert.equal(r.status,503);assert.equal(calls.length,0);
 r=await worker.fetch(req('/api/manual/generate',body),aiEnv);assert.equal(r.status,200);assert.equal((await r.json()).saved,false);assert.equal(calls.length,1);assert.match(calls[0].u,/generativelanguage.googleapis.com/);assert.equal(calls[0].o.headers['x-goog-api-key'],'test-secret');
 r=await worker.fetch(new Request('https://test/api/manual/generate',{method:'POST',body:JSON.stringify(body)}),aiEnv);assert.equal(r.status,401);assert.equal(calls.length,1);
 globalThis.fetch=async()=>Response.json({candidates:[{finishReason:'MAX_TOKENS'}]});r=await worker.fetch(req('/api/manual/generate',body),aiEnv);assert.equal(r.status,502);
});

test('Diagnóstico Gemini muestra HTTP y motivo permitido, nunca respuesta cruda',async()=>{
const e={...env,AI_PREVIEW_ENABLED:'true',GEMINI_API_KEY:'private-key',GEMINI_TEXT_MODEL:'gemini-test'};globalThis.fetch=async()=>Response.json({error:{message:'private-key',details:[{reason:'API_KEY_INVALID',metadata:{key:'private-key'}}]}},{status:400});const r=await worker.fetch(req('/api/manual/generate',{material:'Material de base suficientemente largo para una noticia de prueba.'}),e);const d=await r.json();assert.equal(d.upstream_status,400);assert.equal(d.reason,'API_KEY_INVALID');assert.ok(!JSON.stringify(d).includes('private-key'));
});

test('Ilustración: Storage preview, revisión explícita y producción bloqueada',async()=>{
const e={...env,AI_PREVIEW_ENABLED:'true',IMAGE_PREVIEW_ENABLED:'true',GEMINI_API_KEY:'test',GEMINI_IMAGE_MODEL:'gemini-test-image'},body={prompt:'Una carpa de circo ilustrada bajo un cielo azul',aspect_ratio:'4:5'};let calls=[];
globalThis.fetch=async(u,o)=>{calls.push({u,o});if(u.includes('/bucket/'))return Response.json({public:true});if(u.includes('generativelanguage'))return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{inlineData:{mimeType:'image/png',data:Buffer.from([137,80,78,71,13,10,26,10,0,0]).toString('base64')}}]}}]});return Response.json({Key:'generated/test'});};
let r=await worker.fetch(req('/api/manual/generate-image',body),{...e,PREVIEW_WRITES_ENABLED:'false'});assert.equal(r.status,503);assert.equal(calls.length,0);
r=await worker.fetch(req('/api/manual/generate-image',body),e);assert.equal(r.status,201);const d=await r.json();assert.equal(d.associated,false);assert.match(d.image_url,/tqxbwgirsytlplmxswyt.supabase.co\/storage\/v1\/object\/public\/beat-images-preview/);assert.equal(calls.length,3);assert.match(calls[1].u,/\/v1beta\/models\//);const config=JSON.parse(calls[1].o.body).generationConfig;assert.deepEqual(config.imageConfig,{aspectRatio:'4:5',imageSize:'1K'});assert.equal(config.responseFormat,undefined);assert.equal(calls[2].o.headers['x-upsert'],'false');assert.ok(calls[2].o.body instanceof Uint8Array);
calls=[];r=await worker.fetch(req('/api/manual/generate-image',body),{...e,SUPABASE_PREVIEW_URL:'https://opnuuhnjdbczevvgtnbw.supabase.co'});assert.equal(r.status,503);assert.equal(calls.length,0);
globalThis.fetch=async()=>Response.json({public:false});r=await worker.fetch(req('/api/manual/generate-image',body),e);assert.equal(r.status,503);
});

test('Errores de imagen distinguen facturación y parámetros sin revelar respuesta',async()=>{
 const e={...env,AI_PREVIEW_ENABLED:'true',IMAGE_PREVIEW_ENABLED:'true',GEMINI_API_KEY:'SECRET',GEMINI_IMAGE_MODEL:'gemini-test-image'};
 for(const [message,expected] of [['Paid tier billing required SECRET','facturación'],['Unknown name responseFormat SECRET','formato de parámetros']]){
 globalThis.fetch=async u=>u.includes('/bucket/')?Response.json({public:true}):Response.json({error:{message}},{status:400});
 const r=await worker.fetch(req('/api/manual/generate-image',{prompt:'Una ilustración conceptual de una carpa',aspect_ratio:'9:16'}),e);const data=await r.json();assert.equal(r.status,502);assert.equal(data.upstream_status,400);assert.ok(data.error.includes(expected));assert.ok(!JSON.stringify(data).includes('SECRET'));
 }
});
