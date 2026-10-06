// Copias editoriales locales del preview. Nunca escribe en Supabase ni Blogger.
(()=>{
 const key='beat-editorial-preview:v1:'+((window.PORTAL_CONFIG||{}).sitioId||'agenciabeat');
 const allowed=new Set(['titulo','categoria','imagen_url','contenido','estado']);
 function read(){const raw=localStorage.getItem(key);if(!raw)return {};const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Datos locales inválidos');return data}
 function write(data){localStorage.setItem(key,JSON.stringify(data))}
 window.BeatEditorial={
  get(id){return read()[String(id)]||{}},
  save(id,fields){const data=read(),entry=data[String(id)]||{};for(const [k,v] of Object.entries(fields))if(allowed.has(k))entry[k]=String(v);entry.updated_at=new Date().toISOString();data[String(id)]=entry;write(data)},
  trash(id,deleted){const data=read();data[String(id)]={...(data[String(id)]||{}),deleted_at:deleted?new Date().toISOString():null};write(data)},
  reset(id){const data=read();delete data[String(id)];write(data)},
  apply(rows,{includeDeleted=false}={}){const data=read();return rows.map(n=>({...n,...(data[String(n.id)]||{})})).filter(n=>includeDeleted||!n.deleted_at)}
 };
})();
