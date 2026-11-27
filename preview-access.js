// Acceso temporal sólo para Agencia Beat preview.
(()=>{'use strict';const key='beat-editorial-preview-access-v2',old='beat-editorial-preview-session',ttl=12*60*60*1000;let memory=null;
function clear(){memory=null;try{localStorage.removeItem(key);sessionStorage.removeItem(old);}catch{}}
function read(){try{const raw=localStorage.getItem(key);if(raw)memory=JSON.parse(raw);else memory=null;}catch{}if(!memory)return '';if(typeof memory.token!=='string'||memory.token.length<32||!Number.isFinite(memory.expires)||memory.expires<=Date.now()){clear();return '';}return memory.token;}
function remember(token){if(typeof token!=='string'||token.length<32)return;const existing=read();if(existing===token)return;memory={token,expires:Date.now()+ttl};try{localStorage.setItem(key,JSON.stringify(memory));sessionStorage.removeItem(old);}catch{}}
// Migra la sesión anterior sin pedir otra vez la clave.
try{if(!read()){const previous=sessionStorage.getItem(old);if(previous)remember(previous);}}catch{}
window.BeatPreviewAccess={read,remember,clear};})();
