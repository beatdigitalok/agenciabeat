import test from 'node:test';import assert from 'node:assert/strict';import {fetchRSS,sourceURL,rssURL} from './rss-core.mjs';import worker from './worker-cloudflare-preview.mjs';
const env={ENVIRONMENT:'preview',EDITORIAL_ADMIN_TOKEN:'x'.repeat(40),PREVIEW_WRITES_ENABLED:'true',SUPABASE_PREVIEW_URL:'https://tqxbwgirsytlplmxswyt.supabase.co',SUPABASE_PREVIEW_SERVICE_KEY:'TEST',RSS_ALLOWED_HOSTS:'news.example.com'};
const req=(path,body)=>new Request('https://test'+path,{method:'POST',headers:{authorization:'Bearer '+env.EDITORIAL_ADMIN_TOKEN},body:JSON.stringify(body)});
test('RSS: dominio cerrado, HTTPS, redirecciones y sin secretos',async()=>{
 assert.throws(()=>rssURL('https://127.0.0.1/rss',['127.0.0.1']));assert.throws(()=>rssURL('http://news.example.com/rss',['news.example.com']));
 let calls=[];globalThis.fetch=async(u,o)=>{calls.push({u,o});return new Response('<rss><channel><item><title>Nota</title></item></channel></rss>',{headers:{'content-type':'application/rss+xml'}});};
 assert.equal((await fetchRSS('https://news.example.com/rss',env)).feed_url,'https://news.example.com/rss');assert.equal(calls[0].o.redirect,'manual');assert.equal(calls[0].o.headers.authorization,undefined);
 calls=[];globalThis.fetch=async()=>{calls.push(1);return new Response(null,{status:302,headers:{location:'https://internal.example.com/rss'}});};
 await assert.rejects(fetchRSS('https://news.example.com/rss',env));assert.equal(calls.length,1);
});
test('RSS: tamaño, XML hostil y HTTP rechazados',async()=>{
 for(const [content,type,status] of [['<!DOCTYPE rss><rss/>','text/xml',200],['A'.repeat(1048577),'text/xml',200],['<html/>','text/html',200],['','text/xml',403]]){
 globalThis.fetch=async()=>new Response(content,{status,headers:{'content-type':type}});await assert.rejects(fetchRSS('https://news.example.com/rss',env));}
});
test('RSS: borrador obligatorio, fuente conservada y duplicados',async()=>{
 const source={url:'https://news.example.com/nota?utm_source=rss#top',feed_url:'https://news.example.com/rss',title:'Título original'};assert.equal(sourceURL(source.url),'https://news.example.com/nota');let calls=[];
 globalThis.fetch=async(u,o)=>{calls.push({u,o});if(o.method==='GET')return Response.json([]);const row=JSON.parse(o.body);return Response.json([{...row,id:'test',revision:1}]);};
 let r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'Reescrita',estado:'publicado'},source}),env);assert.equal(r.status,201);const row=(await r.json()).row;assert.equal(row.estado,'borrador');assert.equal(row.fuentes[0].url,'https://news.example.com/nota');assert.equal(calls.length,2);
 calls=[];globalThis.fetch=async()=>{calls.push(1);return Response.json([{id:'existing'}]);};r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'Duplicada'},source}),env);assert.equal(r.status,409);assert.equal(calls.length,1);
 let phase=0;globalThis.fetch=async()=>++phase===1?Response.json([]):Response.json({code:'23505'},{status:409});r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'Concurrente'},source}),env);assert.equal(r.status,409);
 calls=[];globalThis.fetch=async()=>{calls.push(1);throw Error('No debería consultarse');};r=await worker.fetch(req('/api/manual/create',{fields:{titulo:'Prod'},source}),{...env,SUPABASE_PREVIEW_URL:'https://opnuuhnjdbczevvgtnbw.supabase.co'});assert.equal(r.status,503);assert.equal(calls.length,0);
});
