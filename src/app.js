import { getState, subscribe } from './store.js';
import { renderPublic } from './public.js';
import { renderAdmin } from './admin.js';
import { hasUnsavedChanges, esc, icon } from './ui.js';
import { syncEntrance } from './entrance.js';

const root=document.getElementById('app');
function render() {
  if(root.querySelector('form')&&hasUnsavedChanges()&&!root.querySelector('form[data-saving=true]'))return;
  const state=getState();
  const accent=/^#[0-9a-f]{6}$/i.test(state.settings.accent)?state.settings.accent:'#f2e600';
  document.documentElement.style.setProperty('--accent',accent);
  const rgb=accent.slice(1).match(/.{2}/g).map(value=>parseInt(value,16)/255);
  const luminance=rgb.map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
  document.documentElement.style.setProperty('--accent-ink',luminance>.179?'#10110f':'#ffffff');
  const path=location.pathname.replace(/\/$/,'')||'/';
  document.querySelector('.skip-link').href=path==='/'||path==='/links'?'#conteudo':'#main';
  document.body.classList.toggle('is-admin',path==='/admin');
  document.title=`${path==='/admin'?'Painel':path==='/links'?'Links':'O interior faz barulho'} — ${state.settings.name}`;
  try {
    if(path==='/admin')renderAdmin(root,state);
    else if(path==='/'||path==='/links')renderPublic(root,state,path);
    else root.innerHTML=`<main id="main" class="route-error"><span class="eyebrow">404 / FORA DA FREQUÊNCIA</span><h1>Esse caminho ainda não existe.</h1><a class="button" href="/">Voltar para o início ${icon('arrow-right')}</a></main>`;
    syncEntrance(path,state.settings);
  } catch(error) {
    console.error(error);
    root.innerHTML=`<main id="main" class="route-error"><h1>Não foi possível abrir esta página.</h1><p>${esc(error.message)}</p><a class="button" href="/admin">Abrir painel de demonstração</a></main>`;
  }
}
let pendingFrame;
subscribe(()=>{cancelAnimationFrame(pendingFrame);pendingFrame=requestAnimationFrame(render);});
render();
setInterval(()=>{if(!document.hidden&&!document.querySelector('dialog[open]')&&!hasUnsavedChanges()&&document.activeElement===document.body)render();},30000);
window.addEventListener('pageshow',event=>{if(event.persisted)render();});
