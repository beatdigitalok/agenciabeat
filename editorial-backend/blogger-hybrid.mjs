// Agencia Beat 2.0: utilidades de migración híbrida, sin operaciones de escritura.
// Blogger sigue siendo el origen público hasta una migración expresamente autorizada.
const BLOG_HOST='www.agenciabeat.com';
export function normalizeBloggerUrl(input){
 let url;try{url=new URL(input)}catch{return null}
 if(url.protocol!=='https:'||url.hostname.toLowerCase()!==BLOG_HOST||url.username||url.password)return null;
 const pathname=url.pathname.replace(/\/{2,}/g,'/');
 if(!/^\/\d{4}\/\d{2}\/[a-z0-9][a-z0-9._%-]*\.html$/i.test(pathname))return null;
 return 'https://'+BLOG_HOST+pathname;
}
export function buildHybridInventory(posts){
 if(!Array.isArray(posts))throw Error('Se requiere una lista de publicaciones');
 const seen=new Set();const rows=[];const rejected=[];
 for(const post of posts){
  const canonical=normalizeBloggerUrl(post?.url);
  if(!canonical){rejected.push({url:String(post?.url||''),reason:'URL de Blogger no válida'});continue;}
  if(seen.has(canonical)){rejected.push({url:canonical,reason:'URL duplicada'});continue;}
  seen.add(canonical);
  rows.push({blogger_url:canonical,canonical_url:canonical,public_owner:'blogger',portal_indexable:false,title:String(post?.title||''),published_at:post?.published_at||null,portal_url:null,migration_status:'pending'});
 }
 return {mode:'hybrid',production_changes:false,rows,rejected};
}
