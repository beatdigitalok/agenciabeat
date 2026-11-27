// Draft-only transport. Caller must persist an exclusive dispatch claim before calling.
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function buildBloggerDraft(article){
 const title=String(article.titulo??'').trim(),body=String(article.contenido??'').trim();
 const category=String(article.categoria??'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('es-AR');
 if(!title||!body||!category)throw Error('Borrador incompleto');
 const paragraphs=[String(article.bajada??'').trim(),...body.split(/\n+/)].filter(Boolean);
 return {title,content:paragraphs.map(p=>'<p>'+escapeHTML(p)+'</p>').join('\n'),labels:[category]};
}
export async function sendBloggerDraft({env,article,token,fetcher=fetch}){
 if(env.ENVIRONMENT!=='preview'||env.BLOGGER_DRAFT_WRITES_ENABLED!=='true'||!/^\d+$/.test(env.BLOGGER_QA_BLOG_ID||'')||env.BLOGGER_QA_BLOG_ID===env.BLOGGER_BLOG_ID)throw Error('Envío QA no autorizado');
 if(!token)throw Error('Falta autorización Blogger');
 const payload=buildBloggerDraft(article);
 const response=await fetcher('https://www.googleapis.com/blogger/v3/blogs/'+env.BLOGGER_QA_BLOG_ID+'/posts?isDraft=true',{method:'POST',headers:{authorization:'Bearer '+token,'content-type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
 if(!response.ok)return {ok:false,status:response.status,retryAfter:response.headers.get('Retry-After'),requiresReconciliation:true};
 const data=await response.json();
 if(!/^\d+$/.test(String(data.id??''))||String(data.blog?.id)!==env.BLOGGER_QA_BLOG_ID||data.status!=='DRAFT')return {ok:false,requiresReconciliation:true};
 return {ok:true,postId:String(data.id),labelsMatch:Array.isArray(data.labels)&&data.labels.includes(payload.labels[0])};
}
