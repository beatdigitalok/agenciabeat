import {normalizePost,validateOverrides,InputError,effective} from './core.mjs';
const PROD='opnuuhnjdbczevvgtnbw.supabase.co';
const reply=(data,status=200,origin='')=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json','cache-control':'no-store','x-content-type-options':'nosniff',...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}});
export function databaseUrl(env) {const u=new URL(env.SUPABASE_PREVIEW_URL);if(u.protocol!=='https:'||!u.hostname.endsWith('.supabase.co')||u.hostname===PROD||u.username||u.password||u.port||u.pathname!=='/'||u.search||u.hash)throw new Error('Sólo se admite proyecto Supabase separado de prueba');return u.origin;}
async function authorized(request,env){if(!env.EDITORIAL_ADMIN_TOKEN||env.EDITORIAL_ADMIN_TOKEN.length<32)return false;const actual=request.headers.get('authorization')||'',expected='Bearer '+env.EDITORIAL_ADMIN_TOKEN;const hash=async s=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));const a=await hash(actual),b=await hash(expected);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];return diff===0;}
async function db(env,path,body){const r=await fetch(databaseUrl(env)+'/rest/v1/'+path,{method:body?'POST':'GET',headers:{apikey:env.SUPABASE_PREVIEW_SERVICE_KEY,authorization:'Bearer '+env.SUPABASE_PREVIEW_SERVICE_KEY,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('storage');return r.json();}
export default {async fetch(request,env){const url=new URL(request.url),origin=request.headers.get('origin')||'',allowed=env.PREVIEW_ORIGIN||'https://agenciabeat-preview.pages.dev';
 if(origin&&origin!==allowed)return reply({error:'Origen no permitido'},403);
 if(env.ENVIRONMENT!=='preview')return reply({error:'Servicio limitado a preview'},503,origin);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'access-control-allow-origin':allowed,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type','vary':'Origin'}});
 if(url.pathname==='/health'&&request.method==='GET')return reply({ok:true,service:'beat-editorial-preview',writes_enabled:env.PREVIEW_WRITES_ENABLED==='true'},200,origin);
 if(!await authorized(request,env))return reply({error:'Autorización requerida'},401,origin);
 try{
  if(url.pathname==='/api/editorial/list'&&request.method==='GET'){if(!env.SUPABASE_PREVIEW_SERVICE_KEY)throw Error('config');const rows=await db(env,'beat_editorial_preview?sitio_id=eq.agenciabeat&order=changed_at.desc&limit=100');return reply({rows:rows.map(r=>({...r,effective:effective(r)}))},200,origin);}
  if(request.method!=='POST')return reply({error:'Ruta o método no permitido'},404,origin);
  if(Number(request.headers.get('content-length'))>600000)return reply({error:'Solicitud demasiado grande'},413,origin);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>600000)return reply({error:'Solicitud demasiado grande'},413,origin);const body=JSON.parse(raw);
  let action,postId,payload={};
  if(url.pathname==='/api/editorial/validate'){const source=normalizePost(body.post,env.BLOGGER_BLOG_ID);return reply({dry_run:true,source},200,origin);}
  if(url.pathname==='/api/editorial/sync'){
   postId=String(body.post_id||'');if(!/^\d+$/.test(postId)||!/^\d+$/.test(env.BLOGGER_BLOG_ID||''))throw new InputError('ID inválido');
   if(!env.BLOGGER_ACCESS_TOKEN)throw Error('config');
   const r=await fetch(`https://www.googleapis.com/blogger/v3/blogs/${env.BLOGGER_BLOG_ID}/posts/${postId}?view=ADMIN`,{headers:{authorization:'Bearer '+env.BLOGGER_ACCESS_TOKEN},signal:AbortSignal.timeout(10000)});
   if(!r.ok)return reply({error:'No se pudo leer Blogger. No se cambió la copia.'},502,origin);
   payload=normalizePost(await r.json(),env.BLOGGER_BLOG_ID);action='sync';
   if(env.PREVIEW_WRITES_ENABLED!=='true')return reply({dry_run:true,source:payload},200,origin);
  }else if(url.pathname==='/api/editorial/change'){
   action=body.action;postId=String(body.post_id||'');if(!/^\d+$/.test(postId)||!['edit','trash','restore','reset'].includes(action)||!Number.isSafeInteger(body.expected_revision)||body.expected_revision<1)throw new InputError('Acción o revisión inválida');
   if(action==='edit')payload=validateOverrides(body.fields);
  }else return reply({error:'Ruta no encontrada'},404,origin);
  if(env.PREVIEW_WRITES_ENABLED!=='true')return reply({error:'Escrituras desactivadas'},403,origin);
  if(!env.SUPABASE_PREVIEW_SERVICE_KEY||!/^\d+$/.test(env.BLOGGER_BLOG_ID||''))throw Error('config');
  const result=await db(env,'rpc/beat_editorial_preview_change',{p_sitio:'agenciabeat',p_blog:env.BLOGGER_BLOG_ID,p_post:postId,p_action:action,p_payload:payload,p_revision:body.expected_revision??null});
  return reply(result,result.error==='conflict'?409:result.error==='not_found'?404:200,origin);
 }catch(e){return reply({error:e instanceof InputError?e.message:e instanceof SyntaxError?'JSON inválido':'Configuración o servicio no disponible'},e instanceof InputError||e instanceof SyntaxError?400:503,origin);}
}};
