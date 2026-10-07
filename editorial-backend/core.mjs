export class InputError extends Error {}
const categories = ['politica','economia argentina','gremiales','judiciales','sociedad','deportes','espectaculos','internacionales','informacion general'];
const norm = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/-/g,' ');
export function normalizePost(post, blogId) {
 if (!post || !/^\d+$/.test(post.id||'') || String(post.blog?.id)!==String(blogId)) throw new InputError('Identidad Blogger inválida');
 if (!['LIVE','DRAFT','SCHEDULED'].includes(post.status)) throw new InputError('Se requiere status de Blogger ADMIN; no se infiere publicación por fecha');
 if (!post.title?.trim() || typeof post.content!=='string' || post.content.length>500000) throw new InputError('Contenido inválido');
 if (!post.updated || !Number.isFinite(Date.parse(post.updated))) throw new InputError('Falta fecha de actualización válida');
 const labels=Array.isArray(post.labels)?post.labels.filter(x=>typeof x==='string'):[];
 const matches=[...new Set(labels.map(norm).filter(x=>categories.includes(x)))];
 const image=post.images?.[0]?.url||post.content.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1]||'';
 const imageUrl=image.startsWith('//')?'https:'+image:image;
 return {blogger_blog_id:String(blogId),blogger_post_id:String(post.id),titulo:post.title.trim().slice(0,1000),contenido:post.content,
 categoria:matches.length===1?matches[0]:'informacion general',requiere_revision_categoria:matches.length!==1,labels,
 imagen_url:/^https:\/\//i.test(imageUrl)?imageUrl:'',estado:post.status==='LIVE'?'publicado':post.status==='DRAFT'?'borrador':'programado',source_updated_at:new Date(post.updated).toISOString()};
}
export function validateOverrides(value) {
 if (!value||typeof value!=='object'||Array.isArray(value)) throw new InputError('Edición inválida');
 const out={};for(const [key,val] of Object.entries(value)) {
  if (!['titulo','categoria','imagen_url','contenido'].includes(key)||typeof val!=='string') throw new InputError('Campo no permitido');
  if (val.length>(key==='contenido'?500000:key==='titulo'?1000:2048)) throw new InputError('Campo demasiado largo');
  if (['titulo','categoria'].includes(key)&&!val.trim()) throw new InputError('Campo vacío');
  if (key==='imagen_url'&&val&&!/^https:\/\//i.test(val)) throw new InputError('Imagen requiere HTTPS');
  out[key]=val;
 }return out;
}
export function effective(row) {return {...row.source,...row.overrides,deleted_at:row.deleted_at,revision:row.revision};}
export function visible(row) {return !row.deleted_at&&row.source.estado==='publicado';}
