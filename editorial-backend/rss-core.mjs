// Consulta de feeds autorizados; no escribe ni publica.
export function rssURL(value,hosts){
 let u;try{u=new URL(value);}catch{throw new Error('URL RSS inválida');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!hosts.includes(u.hostname)||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':')||/\.(local|internal|localhost)$/.test(u.hostname))throw new Error('Dominio RSS no autorizado. Configurá RSS_ALLOWED_HOSTS en Cloudflare.');
 return u;
}
export function sourceURL(value){let u;try{u=new URL(value);}catch{throw new Error('Enlace original inválido');}if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':')||/\.(local|internal|localhost)$/.test(u.hostname))throw new Error('Enlace original requiere HTTPS público');u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key)||['fbclid','gclid'].includes(key))u.searchParams.delete(key);u.searchParams.sort();return u.href;}
export async function fetchRSS(value,env){
 const hosts=(env.RSS_ALLOWED_HOSTS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
 let target=rssURL(value,hosts);const signal=AbortSignal.timeout(15000);
 for(let redirects=0;redirects<=3;redirects++){
  const r=await fetch(target.href,{method:'GET',redirect:'manual',headers:{accept:'application/rss+xml, application/atom+xml, application/xml, text/xml'},signal});
  if([301,302,303,307,308].includes(r.status)){await r.body?.cancel();if(redirects===3)throw new Error('Demasiadas redirecciones RSS');target=rssURL(new URL(r.headers.get('location'),target).href,hosts);continue;}
  if(!r.ok){await r.body?.cancel();throw new Error('Fuente RSS HTTP '+r.status);}
  if(!/(xml|rss|atom|text\/plain)/i.test(r.headers.get('content-type')||'')){await r.body?.cancel();throw new Error('La fuente no devolvió XML RSS/Atom');}
  if(Number(r.headers.get('content-length'))>1048576){await r.body?.cancel();throw new Error('Feed mayor a 1 MB');}
  if(!r.body)throw new Error('Feed vacío');const reader=r.body.getReader(),chunks=[];let bytes=0;
  try{for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1048576)throw new Error('Feed mayor a 1 MB');chunks.push(value);}}catch(e){await reader.cancel();throw e;}
  const data=new Uint8Array(bytes);let offset=0;for(const part of chunks){data.set(part,offset);offset+=part.length;}const xml=new TextDecoder().decode(data);
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Error('Feed con DTD o entidades no admitido');
  return {xml,feed_url:target.href};
 }
}
