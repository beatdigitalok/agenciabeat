// Agencia Beat 2.0 — contrato de Worker (ejemplo, NO desplegado)
// Los secretos deben configurarse como bindings/secrets del Worker, nunca aquí.

const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','access-control-allow-origin':'*',...extra}});

export default {async fetch(request,env){const url=new URL(request.url);if(request.method==='OPTIONS')return new Response(null,{headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,authorization'}});
try{
if(url.pathname==='/health')return json({ok:true,service:'agencia-beat-api',groq:!!env.GROQ_API_KEY,meta:!!env.META_ACCESS_TOKEN,x:!!env.X_ACCESS_TOKEN,telegram:!!env.TELEGRAM_BOT_TOKEN});
if(url.pathname==='/api/image-proxy'&&request.method==='GET'){const target=url.searchParams.get('url');if(!target)return json({ok:false,error:'url requerida'},400);const u=new URL(target);if(!['http:','https:'].includes(u.protocol))return json({ok:false,error:'protocolo no permitido'},400);const r=await fetch(u.toString(),{headers:{'user-agent':'AgenciaBeat/2.0'}});if(!r.ok)return json({ok:false,error:'imagen no disponible'},502);return new Response(r.body,{headers:{'content-type':r.headers.get('content-type')||'image/jpeg','cache-control':'public,max-age=86400','access-control-allow-origin':'*'}})}
if(url.pathname==='/api/ai/social'&&request.method==='POST'){if(!env.GROQ_API_KEY)return json({ok:false,error:'IA no configurada'},503);return json({ok:false,status:'contract-only',message:'Conectar Groq aquí y devolver captions por canal.'},501)}
if(url.pathname==='/api/publish'&&request.method==='POST')return json({ok:false,status:'disabled',message:'Autopublicación desactivada durante QA.'},403);
if(url.pathname==='/api/video/render'&&request.method==='POST')return json({ok:false,status:'contract-only',message:'Motor MP4 aún no configurado.'},501);
return json({ok:false,error:'ruta no encontrada'},404)}catch(e){return json({ok:false,error:e.message||'error interno'},500)}}};