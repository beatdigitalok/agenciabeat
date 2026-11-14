import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizePost,visible,effective,validateOverrides} from './core.mjs';

const base={id:'123',blog:{id:'456'},title:'Nota de prueba',content:'<p>Contenido original</p>',labels:['Sociedad'],updated:'2026-11-14T12:00:00Z'};
const make=(status,extra={})=>({source:normalizePost({...base,status},'456'),overrides:{},deleted_at:null,revision:1,...extra});

test('matriz de visibilidad: solo LIVE sin papelera es público',()=>{
 for(const status of ['LIVE','DRAFT','SCHEDULED']){
  for(const deleted_at of [null,'2026-11-14T13:00:00Z']){
   const row=make(status,{deleted_at});
   assert.equal(visible(row),status==='LIVE'&&!deleted_at,`status=${status} deleted=${deleted_at}`);
  }
 }
});
test('una edición de texto no convierte borrador en publicado',()=>{
 const row=make('DRAFT',{overrides:{titulo:'Título editorial',contenido:'Versión corregida'}});
 assert.equal(effective(row).titulo,'Título editorial');
 assert.equal(effective(row).estado,'borrador');
 assert.equal(visible(row),false);
});
test('un override no permite forzar estado publicado',()=>{
 assert.throws(()=>validateOverrides({estado:'publicado'}));
 assert.throws(()=>validateOverrides({blogger_post_id:'999'}));
});
test('papelera mantiene oculta noticia LIVE aun con edición',()=>{
 const row=make('LIVE',{overrides:{titulo:'Corrección'},deleted_at:'2026-11-14T13:00:00Z'});
 assert.equal(visible(row),false);
 assert.equal(effective(row).titulo,'Corrección');
});
test('sin estado explícito de Blogger se rechaza una publicación',()=>{
 assert.throws(()=>normalizePost({...base},'456'));
 assert.throws(()=>normalizePost({...base,status:'PUBLISHED'},'456'));
});
