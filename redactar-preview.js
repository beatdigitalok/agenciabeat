'use strict';
const API='https://beat-editorial-preview.beatdigitalok-bac.workers.dev';
const $=id=>document.getElementById(id);let current=null,busy=false,rowsCache=[],pendingSource=null;
const access=window.BeatPreviewAccess;
function forget(){access.clear();$('token').value='';rowsCache=[];renderList();savedFeeds=[];selectedFeed=null;$('rssSaved').replaceChildren(new Option('Elegir fuente',''));selectFeed(null);$('rssItems').replaceChildren();$('accessPanel').open=true;}
$('token').value=access.read();
window.addEventListener('storage',()=>{$('token').value=access.read();if(!$('token').value){edit(null);$('list').replaceChildren();}});
$('logout').onclick=()=>{forget();edit(null);$('list').replaceChildren();$('msg').textContent='Sesión cerrada';};
async function api(path,body){const token=$('token').value;if(token.length<32)throw Error('Ingresá el token editorial de al menos 32 caracteres.');const r=await fetch(API+path,{method:body?'POST':'GET',headers:{authorization:'Bearer '+token,...(body?{'content-type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});const data=await r.json();if(r.status===401)forget();if(!r.ok)throw Error(data.message||data.error||'Error '+r.status);access.remember(token);return data;}
async function run(fn){if(busy)return;busy=true;try{await fn();}catch(e){$('msg').textContent=e.message;}finally{busy=false;}}
function edit(row){current=row;const distributionStatus=document.getElementById('bloggerDistributionStatus');if(distributionStatus)distributionStatus.textContent='Blogger QA: consultá el estado de esta noticia.';pendingSource=null;showSource(row?.fuentes?.[0]);$('editorHeading').textContent=row?'Editar noticia':'Nueva noticia';$('form').reset();for(const key of ['titulo','bajada','contenido','categoria','imagen_url','imagen_tipo','estado'])$(key).value=row?.[key]??(key==='categoria'?'informacion general':key==='estado'?'borrador':key==='imagen_tipo'?'sin_imagen':'');$('msg').textContent=row?'Editando revisión '+row.revision:'Nueva noticia';updatePreview();}
function renderList(){const query=$('newsSearch').value.trim().toLocaleLowerCase('es'),state=$('newsState').value;const rows=rowsCache.filter(row=>(row.titulo+' '+row.categoria).toLocaleLowerCase('es').includes(query)&&(state==='trash'?!!row.deleted_at:!row.deleted_at&&(state==='all'||row.estado===state)));$('newsCount').textContent=rows.length+' noticias en esta vista';$('list').replaceChildren();for(const row of rows){const article=document.createElement('article'),title=document.createElement('p');title.textContent=row.titulo+' · '+(row.deleted_at?'Papelera':row.estado);article.append(title);const button=document.createElement('button');button.textContent='Editar';button.onclick=()=>edit(row);article.append(button);const view=document.createElement('a');view.textContent='Ver noticia';view.href='noticia-propia-preview.html?id='+encodeURIComponent(row.id);article.append(view);if(!row.deleted_at){const pub=document.createElement('button');pub.textContent=row.estado==='publicado'?'Retirar de preview':'Publicar en preview';pub.onclick=()=>run(async()=>{await api('/api/manual/change',{id:row.id,expected_revision:row.revision,action:'edit',fields:{estado:row.estado==='publicado'?'borrador':'publicado'}});await load();if(current?.id===row.id)edit(null);$('msg').textContent='Estado actualizado en la web de prueba';});article.append(pub);}const trash=document.createElement('button');trash.textContent=row.deleted_at?'Restaurar':'Enviar a papelera';trash.onclick=()=>run(async()=>{await api('/api/manual/change',{id:row.id,expected_revision:row.revision,action:row.deleted_at?'restore':'trash'});await load();if(current?.id===row.id)edit(null);$('msg').textContent='Cambio guardado';});article.append(trash);$('list').append(article);}if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='No hay noticias en esta vista.';$('list').append(p);}}async function load(){const data=await api('/api/manual/list');rowsCache=data.rows;renderList();return rowsCache.length;}
$('load').onclick=()=>run(async()=>{$('msg').textContent=(await load())+' borradores cargados';});$('new').onclick=()=>edit(null);
$('form').onsubmit=e=>{e.preventDefault();run(async()=>{const fields={};for(const key of ['titulo','bajada','contenido','categoria','imagen_url','imagen_tipo','estado'])fields[key]=$(key).value;if(!fields.imagen_url)fields.imagen_tipo='sin_imagen';else if(fields.imagen_tipo==='sin_imagen')fields.imagen_tipo='foto';const result=await api(current?'/api/manual/change':'/api/manual/create',current?{id:current.id,expected_revision:current.revision,action:'edit',fields}:{fields,...(pendingSource?{source:pendingSource}:{})});edit(result.row);await load();$('msg').textContent='Guardado en Supabase preview · revisión '+result.row.revision;});};

let aiDraft=null;
$('aiGenerate').onclick=()=>run(async()=>{const button=$('aiGenerate');button.disabled=true;$('msg').textContent='Generando propuesta…';try{const result=await api('/api/manual/generate',{material:$('aiMaterial').value,provider:$('aiProvider').value});aiDraft=result.draft;$('aiProposal').textContent=aiDraft.titulo+'\n\n'+aiDraft.bajada+'\n\n'+aiDraft.contenido;$('aiPending').textContent='Datos a revisar: '+(aiDraft.pendientes.join('; ')||'Verificá la propuesta contra tus fuentes.');$('aiImage').value=aiDraft.prompt_imagen;$('aiReview').hidden=false;$('msg').textContent='Propuesta generada. Todavía no está guardada ni publicada.';}finally{button.disabled=false;}});
$('aiApply').onclick=()=>{if(!aiDraft)return;for(const key of ['titulo','bajada','contenido'])$(key).value=aiDraft[key];$('estado').value='borrador';updatePreview();$('msg').textContent='Propuesta aplicada. Revisá los datos y guardá cuando esté lista.';};


$('newsSearch').oninput=renderList;$('newsState').onchange=renderList;$('newTop').onclick=()=>{edit(null);$('titulo').focus();};if(!access.read())$('accessPanel').open=true;else run(async()=>{await load();try{await loadSources();}catch(e){$('rssStatus').textContent=e.message;}$('msg').textContent='Noticias cargadas. Elegí una o comenzá una nueva.';});

function updatePreview(){ $('livePreviewTitle').textContent=$('titulo').value||'Tu próximo titular';$('livePreviewCategory').textContent=$('categoria').value||'Información general';const im=$('livePreviewImage');let url='';try{const u=new URL($('imagen_url').value);if(u.protocol==='https:'&&!u.username&&!u.password)url=u.href;}catch{}im.hidden=!url;if(url&&im.getAttribute('src')!==url)im.src=url;if(!url)im.removeAttribute('src');}['titulo','categoria','imagen_url'].forEach(id=>$(id).addEventListener('input',updatePreview));$('livePreviewImage').onerror=()=>{$('livePreviewImage').hidden=true;};$('studio').ontoggle=()=>{if($('studio').open&&!$('studioFrame').getAttribute('src'))$('studioFrame').src=$('studioFrame').dataset.src;};$('openStudio').onclick=()=>{$('studio').open=true;};updatePreview();

$('useEditorText').onclick=()=>{$('aiMaterial').value=[$('titulo').value,$('bajada').value,$('contenido').value].filter(Boolean).join('\n\n');$('aiMaterial').focus();$('msg').textContent='Texto copiado como base. Elegí el motor y generá una propuesta para revisar.';};

function showSource(source){const el=$('sourceInfo');el.replaceChildren();if(!source?.url)return;const text=document.createElement('span');text.textContent='Fuente original: ';const link=document.createElement('a');link.textContent=source.title||source.titulo_original||source.url;link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';el.append(text,link);const notes=Array.isArray(source.review_notes)?source.review_notes.filter(n=>typeof n==='string'&&n.trim()):[];if(notes.length){const panel=document.createElement('details');panel.open=true;const heading=document.createElement('summary');heading.textContent='Observaciones editoriales · '+notes.length;const list=document.createElement('ul');for(const note of notes){const item=document.createElement('li');item.textContent=note;list.append(item);}panel.append(heading,list);el.append(panel);}}
function rssText(value){const stripped=String(value||'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ');const el=document.createElement('textarea');el.innerHTML=stripped;return el.value.replace(/\s+/g,' ').trim();}
function safeRSSLink(value,base){if(!value||!String(value).trim())return '';try{const u=new URL(value,base);if(u.protocol!=='https:'||u.username||u.password)return '';u.hash='';for(const key of [...u.searchParams.keys()])if(/^utm_/i.test(key)||['fbclid','gclid'].includes(key))u.searchParams.delete(key);u.searchParams.sort();return u.href;}catch{return '';}}
function parseRSS(xml,feed){if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('XML no admitido');const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('RSS/Atom inválido');const nodes=[...doc.getElementsByTagNameNS('*','item'),...doc.getElementsByTagNameNS('*','entry')];if(!nodes.length)throw Error('El feed no contiene entradas RSS/Atom');const seen=new Set();return nodes.slice(0,80).map(n=>{const elements=name=>[...n.getElementsByTagNameNS('*',name)],text=name=>elements(name)[0]?.textContent||'';const linkNode=elements('link').find(e=>!e.getAttribute('rel')||e.getAttribute('rel')==='alternate');const url=safeRSSLink(linkNode?.getAttribute('href')||linkNode?.textContent||text('guid'),feed);const title=rssText(text('title')).slice(0,1000);const body=rssText(text('encoded')||text('content')||text('description')||text('summary')).slice(0,25000);const imageNode=[...elements('enclosure'),...elements('thumbnail'),...elements('content')].find(e=>(e.getAttribute('type')||'').startsWith('image/')||e.localName==='thumbnail'||e.getAttribute('medium')==='image');const image=safeRSSLink(imageNode?.getAttribute('url')||'',feed);return {url,title,body,image,feed_url:feed};}).filter(n=>{if(!n.url||!n.title||seen.has(n.url))return false;seen.add(n.url);return true;}).slice(0,40);}

let savedFeeds=[],selectedFeed=null;
function selectFeed(row){selectedFeed=row||null;$('rssName').value=row?.nombre||'';$('rssURL').value=row?.url||'';$('rssCategory').value=row?.categoria||'informacion general';$('rssProvider').value=row?.provider||'groq';$('rssActive').value=String(row?.active??true);$('rssAuto').value=String(row?.auto_enabled??false);$('rssInterval').value=String(row?.interval_minutes??60);$('rssMax').value=String(row?.max_items??1);$('rssSaved').value=row?.id||'';const diag=$('rssDiagnostics');diag.replaceChildren();if(row){const text=document.createElement('p');text.className='muted';text.textContent='Revisión '+row.revision+' · '+(row.last_checked_at?'Última consulta: '+new Date(row.last_checked_at).toLocaleString('es-AR'):'Sin consultas todavía')+(row.last_error?' · Error: '+row.last_error:'');diag.append(text);if(row.last_result){const result=document.createElement('p');result.textContent='Última campaña: '+(row.last_result.created||0)+' borradores creados · '+(row.last_result.skipped||0)+' entradas omitidas';diag.append(result);const d=row.last_result.diagnostics;if(d){const detail=document.createElement('p');detail.className='muted';detail.textContent='Detalle: '+(d.duplicates||0)+' duplicadas · '+(d.insufficient_feed||0)+' sin contenido suficiente · '+(d.ai_pending||0)+' pendientes por IA · '+(d.summary_from_rss||0)+' bajadas recuperadas del RSS · '+(d.created||0)+' borradores nuevos';diag.append(detail);}else{const note=document.createElement('p');note.className='muted';note.textContent='Esta ejecución es anterior al diagnóstico detallado. Los motivos de omisión todavía no están disponibles.';diag.append(note);}}}}
async function loadSources(){const selected=selectedFeed?.id;const data=await api('/api/rss/sources');savedFeeds=data.rows;$('rssSaved').replaceChildren(new Option('Elegir fuente',''));for(const row of savedFeeds)$('rssSaved').add(new Option(row.nombre+(row.active?'':' · Desactivada'),row.id));if(selected)selectFeed(savedFeeds.find(row=>row.id===selected));$('rssStatus').textContent=savedFeeds.length+' fuentes configuradas';}
$('rssSaved').onchange=()=>selectFeed(savedFeeds.find(row=>row.id===$('rssSaved').value));$('rssNew').onclick=()=>selectFeed(null);
$('rssReload').onclick=()=>run(loadSources);
$('rssRemember').onclick=()=>run(async()=>{const button=$('rssRemember');button.disabled=true;try{const fields={nombre:$('rssName').value.trim(),url:$('rssURL').value.trim(),categoria:$('rssCategory').value.trim(),provider:$('rssProvider').value,active:$('rssActive').value==='true',auto_enabled:$('rssAuto').value==='true',interval_minutes:Number($('rssInterval').value),max_items:Number($('rssMax').value)};const result=await api('/api/rss/source/save',{fields,...(selectedFeed?{id:selectedFeed.id,expected_revision:selectedFeed.revision}:{})});selectedFeed=result.row;await loadSources();$('rssStatus').textContent='Configuración guardada en Supabase de prueba';}finally{button.disabled=false;}});
$('rssFetch').onclick=()=>run(async()=>{const button=$('rssFetch');button.disabled=true;$('rssStatus').textContent='Consultando fuente…';try{if(!selectedFeed)throw Error('Guardá o elegí una fuente antes de consultar');if($('rssURL').value.trim()!==selectedFeed.url)throw Error('Guardá el cambio de URL antes de consultar');const data=await api('/api/rss/fetch',{source_id:selectedFeed.id});$('aiProvider').value=data.source.provider;const captureCategory=data.source.categoria;const items=parseRSS(data.xml,data.feed_url);$('rssItems').replaceChildren();for(const item of items){const article=document.createElement('article'),title=document.createElement('p'),summary=document.createElement('p'),button=document.createElement('button');title.textContent=item.title;summary.textContent=item.body.slice(0,250)||'La fuente sólo entregó el título. Completá los datos antes de generar.';button.textContent='Preparar reescritura';button.onclick=()=>{edit(null);pendingSource={url:item.url,feed_url:item.feed_url,title:item.title};showSource(pendingSource);$('titulo').value=item.title;$('categoria').value=captureCategory||'informacion general';$('imagen_url').value=item.image;$('imagen_tipo').value=item.image?'foto':'sin_imagen';$('contenido').value=item.body;$('estado').value='borrador';$('aiMaterial').value='FUENTE ORIGINAL: '+item.url+'\nTÍTULO: '+item.title+'\nCONTENIDO DEL RSS: '+item.body;aiDraft=null;$('aiReview').hidden=true;$('aiPanel').open=true;updatePreview();$('aiPanel').scrollIntoView({behavior:'smooth',block:'start'});$('msg').textContent='Fuente cargada. Elegí Groq o Gemini y generá una propuesta. Al guardar se conservará el origen y se creará un borrador.';};article.append(title,summary,button);$('rssItems').append(article);}$('rssStatus').textContent=items.length+' entradas disponibles. Consulta finalizada. Elegí una entrada para preparar su borrador.';}catch(e){$('rssStatus').textContent=e.message;}finally{button.disabled=false;}});
$('openRSS').onclick=()=>{$('rssPanel').open=true;};

$('rssRun').onclick=()=>run(async()=>{if(!selectedFeed)throw Error('Guardá o elegí una fuente primero');const button=$('rssRun');button.disabled=true;$('rssStatus').textContent='Capturando y reescribiendo. Esperá: puede tardar hasta varios minutos.';try{const result=await api('/api/rss/campaign/run',{source_id:selectedFeed.id});await loadSources();await load();$('rssStatus').textContent=result.message||('Campaña finalizada: '+result.created+' borradores creados · '+result.skipped+' omitidos'+(result.errors.length?' · '+result.errors.join('; '):''));$('msg').textContent='Los borradores capturados están en Mis noticias y requieren revisión.';}finally{button.disabled=false;}});

const bloggerSend=document.createElement('button');
bloggerSend.type='button';bloggerSend.textContent='Enviar borrador a Blogger QA';
$('form').append(bloggerSend);
bloggerSend.onclick=()=>run(async()=>{
 if(!current||current.deleted_at||current.estado!=='borrador')throw Error('Guardá primero la noticia aprobada como borrador.');
 for(const key of ['titulo','bajada','contenido','categoria','imagen_url','imagen_tipo','estado']){
 if($(key).value!==String(current[key]??''))throw Error('Guardá los cambios antes de enviar.');
 }
 if(!confirm('¿Enviar esta revisión como borrador al blog de pruebas?'))return;
 bloggerSend.disabled=true;
 try{
 const result=await api('/api/blogger/send-draft',{id:current.id,expected_revision:current.revision,approved:true});
 $('msg').textContent='Borrador confirmado en Blogger QA · '+result.post_id+(result.labels_match?'':' · Revisar categoría');
 }finally{bloggerSend.disabled=false;}
});

const bloggerStatus=document.createElement('p');bloggerStatus.id='bloggerDistributionStatus';bloggerStatus.setAttribute('role','status');bloggerStatus.textContent='Blogger QA: seleccioná una noticia.';
const bloggerRefresh=document.createElement('button');bloggerRefresh.type='button';bloggerRefresh.textContent='Consultar estado en Blogger';
$('form').append(bloggerStatus,bloggerRefresh);
const bloggerStates={pending:'Pendiente de envío',sending:'Envío en curso o pendiente de confirmación',draft:'Borrador confirmado',published:'Publicado',reconcile:'Requiere revisión en Blogger',cancelled:'Cancelado'};
async function refreshBloggerStatus(){
 const id=current?.id;
 if(!id){bloggerStatus.textContent='Blogger QA: guardá la noticia primero.';return;}
 bloggerStatus.textContent='Consultando registro de distribución…';
 try{
 const result=await api('/api/blogger/status?id='+encodeURIComponent(id));
 if(current?.id!==id)return;
 const d=result.distribution;
 bloggerStatus.textContent='Blogger QA: '+(d?(bloggerStates[d.state]||d.state)+(d.post_id?' · ID '+d.post_id:'')+(d.last_error?' · '+d.last_error:''):'Sin envío registrado');
 }catch(e){if(current?.id===id)bloggerStatus.textContent='Blogger QA: '+e.message;}
}
bloggerRefresh.textContent='Actualizar estado de Blogger';
bloggerRefresh.onclick=()=>run(async()=>{
 const id=current?.id;
 if(!id){await refreshBloggerStatus();return;}
 bloggerRefresh.disabled=true;
 try{
 const local=await api('/api/blogger/status?id='+encodeURIComponent(id));
 if(current?.id!==id)return;
 const d=local.distribution;
 if(!d?.post_id||!['draft','published'].includes(d.state)){await refreshBloggerStatus();return;}
 const result=await api('/api/blogger/sync-status',{id});
 if(current?.id!==id)return;
 const remote={LIVE:'Publicado',DRAFT:'Borrador confirmado',SCHEDULED:'Publicación programada'};
 bloggerStatus.textContent='Blogger QA: '+(remote[result.remote_status]||'Estado no reconocido')+' · ID '+d.post_id;
 }catch(e){if(current?.id===id)bloggerStatus.textContent='No se pudo sincronizar: '+e.message+' · Registro anterior conservado.';}
 finally{bloggerRefresh.disabled=false;}
});

 // Manual batch capture: reuse existing server claims, never bypass source eligibility.
window.captureAllEditorialCampaigns=()=>run(async()=>{
 const button=document.getElementById('captureAll');if(!button)return;
 button.disabled=true;const status=document.getElementById('captureAllStatus');
 let created=0,skipped=0,failed=0,completed=0;
 try{
 await loadSources();
 const eligible=savedFeeds.filter(row=>row.active===true);
 if(!eligible.length){status.textContent='No hay campañas activas. Configurá una en Campañas RSS.';return;}
 for(const source of eligible){
 if($('token').value.length<32){status.textContent='Sesión cerrada. Captura interrumpida.';return;}
 status.textContent='Capturando '+(completed+1)+' de '+eligible.length+': '+source.nombre;
 try{const result=await api('/api/rss/campaign/run',{source_id:source.id});created+=Number(result.created)||0;skipped+=Number(result.skipped)||0;if(result.errors?.length)failed++;}catch(e){failed++;}finally{completed++;}
 }
 await loadSources();await load();
 status.textContent='Captura finalizada: '+created+' noticias nuevas, '+skipped+' omitidas. '+(failed?failed+' campañas requieren atención.':'Sin errores de campaña informados.');
 }catch(e){status.textContent='No se pudo completar la captura: '+e.message;}
 finally{button.disabled=false;}
});
