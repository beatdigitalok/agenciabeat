import test from 'node:test';import assert from 'node:assert/strict';import worker from './worker-cloudflare-preview.mjs';import {publicAddress,checkPublicDNS} from './rss-core.mjs';
const env={ENVIRONMENT:'preview',EDITORIAL_ADMIN_TOKEN:'x'.repeat(40),PREVIEW_WRITES_ENABLED:'true',SUPABASE_PREVIEW_URL:'https://tqxbwgirsytlplmxswyt.supabase.co',SUPABASE_PREVIEW_SERVICE_KEY:'TEST'};const id='11111111-1111-4111-8111-111111111111';
const req=(path,body)=>new Request('https://test'+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+env.EDITORIAL_ADMIN_TOKEN},...(body?{body:JSON.stringify(body)}:{})});
test('Fuentes: creación persistida, edición con revisión y conflicto',async()=>{
 let calls=[];globalThis.fetch=async(u,o)=>{calls.push({u,o});return Response.json([{...JSON.parse(o.body),id,revision:1}]);};const fields={nombre:'Fuente',url:'https://news.example.com/rss',categoria:'sociedad',provider:'groq',active:true};let r=await worker.fetch(req('/api/rss/source/save',{fields}),env);assert.equal(r.status,201);assert.equal(JSON.parse(calls[0].o.body).sitio_id,'agenciabeat');
 globalThis.fetch=async(u,o)=>{calls.push({u,o});return Response.json([]);};r=await worker.fetch(req('/api/rss/source/save',{fields,id,expected_revision:1}),env);assert.equal(r.status,409);assert.equal(calls.at(-1).o.method,'PATCH');assert.match(calls.at(-1).u,/revision=eq.1/);
 r=await worker.fetch(req('/api/rss/source/save',{fields}),{...env,PREVIEW_WRITES_ENABLED:'false'});assert.equal(r.status,403);
});
test('Consulta: sólo fuentes guardadas y activas; registra última consulta sin enviar secretos',async()=>{
 const source={id,url:'https://news.example.com/rss',nombre:'Fuente',active:true,provider:'groq',categoria:'sociedad'};let calls=[];
 globalThis.fetch=async(u,o)=>{calls.push({u,o});if(u.includes('/rest/v1/'))return Response.json(o.method==='GET'?[source]:[]);if(u.includes('cloudflare-dns.com'))return Response.json({Status:0,Answer:u.includes('type=AAAA')?[]:[{type:1,data:'93.184.215.14'}]});return new Response('<rss><channel/></rss>',{headers:{'content-type':'text/xml'}});};
 let r=await worker.fetch(req('/api/rss/fetch',{url:source.url}),env);assert.equal(r.status,400);assert.equal(calls.length,0);
 r=await worker.fetch(req('/api/rss/fetch',{source_id:id}),env);assert.equal(r.status,200);assert.equal((await r.json()).source.provider,'groq');const outbound=calls.find(c=>c.u===source.url);assert.equal(outbound.o.headers.authorization,undefined);assert.ok(calls.some(c=>c.o.method==='PATCH'));
 calls=[];globalThis.fetch=async()=>{calls.push(1);return Response.json([{...source,active:false}]);};r=await worker.fetch(req('/api/rss/fetch',{source_id:id}),env);assert.equal(r.status,409);assert.equal(calls.length,1);
});
test('DNS: direcciones locales, reservadas y respuestas mixtas bloqueadas',async()=>{
 for(const ip of ['127.0.0.1','10.1.1.1','192.168.1.1','169.254.169.254','100.64.0.1','198.18.1.1','::1','fc00::1','fe80::1','2001:db8::1'])assert.equal(publicAddress(ip),false,ip);
 assert.equal(publicAddress('1.1.1.1'),true);assert.equal(publicAddress('2606:4700::1111'),true);
 globalThis.fetch=async()=>Response.json({Status:0,Answer:[{type:1,data:'127.0.0.1'}]});await assert.rejects(checkPublicDNS('news.example.com',AbortSignal.timeout(1000)));
});
