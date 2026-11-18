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

export function parseFeedEntries(xml,feed){
 if(typeof xml!=='string'||xml.length>1048576||/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('Feed inválido');
 const decode=s=>String(s||'').replace(/&(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi,m=>{const names={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};if(names[m])return names[m];const n=m[2].toLowerCase()==='x'?parseInt(m.slice(3,-1),16):parseInt(m.slice(2,-1),10);return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';});
 const clean=s=>decode(s).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
 const url=s=>{if(!s)return '';try{return sourceURL(new URL(decode(s).trim(),feed).href);}catch{return '';}};
 let stack=[],current=null,entries=[],rootSeen=false;const seen=new Set();
 const finish=()=>{if(!current)return;const title=clean(current.title).slice(0,1000),original=url(current.link||current.guid),body=clean(current.encoded||current.content||current.description||current.summary).slice(0,25000);if(title&&original&&!seen.has(original)){seen.add(original);entries.push({title,url:original,body,image:url(current.image),feed_url:feed});}current=null;};
 for(const match of xml.matchAll(/<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<[^>]*>|[^<]+/g)){
  const token=match[0];if(token.startsWith('<!--')||token.startsWith('<?'))continue;
  if(token.startsWith('<![CDATA[')||!token.startsWith('<')){if(current){const value=token.startsWith('<![CDATA[')?token.slice(9,-3):decode(token);for(const frame of stack)if(frame.capture){current[frame.capture]=(current[frame.capture]||'')+value;if(current[frame.capture].length>60000)throw Error('Entrada RSS demasiado grande');}}continue;}
  if(token.startsWith('</')){const name=token.slice(2,-1).trim();const frame=stack.pop();if(!frame||frame.name!==name)throw Error('XML RSS mal formado');if(frame.entry){finish();if(entries.length>=40)break;}continue;}
  if(token.startsWith('<!'))throw Error('Declaración XML no admitida');
  const m=token.match(/^<([A-Za-z_][\w:.-]*)\b/);if(!m)throw Error('XML RSS mal formado');const name=m[1],local=name.split(':').pop();const attrs={};for(const a of token.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[a[1]]=decode(a[2]??a[3]);const self=/\/\s*>$/.test(token);
  if(!rootSeen){if(!['rss','feed','RDF'].includes(local))throw Error('No es RSS/Atom');rootSeen=true;}
  const entry=['item','entry'].includes(local);if(entry){if(current)throw Error('Entrada RSS anidada');current={};}
  let capture=null;if(current&&['title','guid','encoded','content','description','summary'].includes(local)&&!attrs.url)capture=local;
  if(current&&local==='link'&&(!attrs.rel||attrs.rel==='alternate')){if(attrs.href)current.link=attrs.href;else capture='link';}
  if(current&&['enclosure','thumbnail','content'].includes(local)&&attrs.url&&((attrs.type||'').startsWith('image/')||local==='thumbnail'||attrs.medium==='image'))current.image=attrs.url;
  if(!self){stack.push({name,capture,entry});if(stack.length>64)throw Error('XML demasiado anidado');}else if(entry)finish();
 }
 if(stack.length&&entries.length<40)throw Error('XML incompleto');if(!rootSeen)throw Error('Feed vacío');return entries;
}
