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
  if(env.RSS_VERIFY_DNS==='true')await checkPublicDNS(target.hostname,signal);
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

// Complementa la lista de fuentes registradas. Sólo consultas DNS públicas.
export function publicAddress(ip){
 if(ip.includes(':')){const first=parseInt(ip.split(':')[0],16);return first>=0x2000&&first<=0x3fff&&!/^2001:(db8|0):|^2002:/i.test(ip);}
 const p=ip.split('.').map(Number);if(p.length!==4||p.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
 const [a,b,c]=p;return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||(b===88&&c===99)))||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19||(b===51&&c===100)))||(a===203&&b===0&&c===113));
}
export async function checkPublicDNS(host,signal){
 const results=await Promise.all(['A','AAAA'].map(async type=>{const r=await fetch('https://cloudflare-dns.com/dns-query?name='+encodeURIComponent(host)+'&type='+type,{headers:{accept:'application/dns-json'},signal});if(!r.ok)throw Error('No se pudo verificar el dominio RSS');const data=await r.json();if(data.Status!==0)throw Error('El dominio RSS no resolvió correctamente');return (data.Answer||[]).filter(a=>[1,28].includes(a.type)).map(a=>a.data);}));
 const ips=results.flat();if(!ips.length||ips.some(ip=>!publicAddress(ip)))throw Error('La fuente RSS debe resolver sólo a direcciones públicas');
}
