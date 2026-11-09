import { brand, esc, icon } from './ui.js';

const SESSION_KEY='caixa-preta-entrance-v1';
let considered=false;
let currentSettings;
let active=null;

function hasEntered() {
  try{return sessionStorage.getItem(SESSION_KEY)==='entered';}catch{return false;}
}
function rememberEntry() {
  try{sessionStorage.setItem(SESSION_KEY,'entered');}catch{/* A entrada direta continua disponível sem sessionStorage. */}
}

export function syncEntrance(route,settings) {
  currentSettings=settings;
  if(route!=='/'){active?.finish(false);return;}
  if(active)active.update(settings);
  if(considered)return;
  considered=true;
  const preview=new URLSearchParams(location.search).get('preview')==='1';
  if(!preview&&!location.hash&&!hasEntered())showEntrance(settings);
}

document.addEventListener('click',event=>{
  const button=event.target.closest?.('[data-replay-entrance]');
  if(button&&currentSettings&&!active)showEntrance(currentSettings);
});

function showEntrance(settings) {
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  let paused=media.matches;
  let phase='idle';
  let scene=null;
  let openingAnimation=null;
  let fadeAnimation=null;
  let pointer=null;
  let suppressClick=false;
  let dragX=0;
  let dragY=0;
  const abort=new AbortController();
  const dialog=document.createElement('dialog');
  dialog.className='entrance-dialog';
  dialog.setAttribute('aria-labelledby','entrance-title');
  dialog.setAttribute('aria-describedby','entrance-description');
  dialog.innerHTML=`<div class="entrance-shell"><header class="entrance-header"><span class="entrance-brand" data-entrance-brand>${brand(settings)}</span><span class="entrance-edition">CAIXA PRETA / EXPERIÊNCIA 001</span><button type="button" class="entrance-skip" data-entrance-skip>Pular introdução ${icon('arrow-up-right',17)}</button></header><div class="entrance-main"><span class="entrance-background-word" aria-hidden="true">CAIXA</span><div class="entrance-stage" data-entrance-stage data-renderer="loading"><div class="entrance-orbit" aria-hidden="true"></div><button type="button" class="entrance-cube-button" aria-label="Abrir a caixa em 3D" aria-describedby="entrance-gesture"><div class="entrance-fallback" aria-hidden="true"><div class="entrance-fallback-cube"><span class="entrance-face entrance-face-front"><span class="entrance-face-number">CP / 001</span><span class="entrance-face-brand">${brand(settings,true)}<b>${esc(settings.name)}</b></span><small>O INTERIOR FAZ BARULHO.</small></span><span class="entrance-face entrance-face-back"></span><span class="entrance-face entrance-face-left"></span><span class="entrance-face entrance-face-right"><i>CP</i></span><span class="entrance-face entrance-face-top"><i>↗</i></span><span class="entrance-face entrance-face-bottom"></span></div></div><canvas data-entrance-canvas aria-hidden="true"></canvas></button><div class="entrance-light" aria-hidden="true"></div></div><p class="entrance-gesture" id="entrance-gesture"><span>ARRASTE PARA EXPLORAR</span><i></i><span>CLIQUE PARA ABRIR ${icon('arrow-up-right',13)}</span></p></div><footer class="entrance-footer"><div class="entrance-invitation"><span class="eyebrow">UMA CAIXA. MUITAS POSSIBILIDADES.</span><h1 id="entrance-title">Abra a <span>Caixa Preta.</span></h1><p id="entrance-description" data-entrance-description>${esc(settings.tagline)}</p></div><div class="entrance-actions"><button type="button" class="button entrance-open" data-entrance-open autofocus>Abrir a caixa ${icon('arrow-up-right',19)}</button><button type="button" class="entrance-pause" data-entrance-pause aria-pressed="false">${icon('clock',14)}<span>Pausar rotação</span></button></div></footer><div class="entrance-bottom"><span>DEMONSTRAÇÃO / IDENTIDADE EM AVALIAÇÃO</span><span>SOM. CORPO. ENCONTRO.</span></div></div>`;
  document.body.append(dialog);
  document.body.classList.add('has-entrance');
  const stage=dialog.querySelector('[data-entrance-stage]');
  const canvas=dialog.querySelector('canvas');
  const cube=dialog.querySelector('.entrance-cube-button');
  const openButton=dialog.querySelector('[data-entrance-open]');
  const pauseButton=dialog.querySelector('[data-entrance-pause]');

  function updatePause() {
    dialog.classList.toggle('is-paused',paused);
    pauseButton.setAttribute('aria-pressed',String(paused));
    pauseButton.querySelector('span').textContent=paused?'Ativar rotação':'Pausar rotação';
    scene?.setPaused(paused);
  }

  function finish(focus=true) {
    if(phase==='revealed')return;
    phase='revealed';rememberEntry();abort.abort();
    openingAnimation?.cancel();fadeAnimation?.cancel();
    scene?.dispose();scene=null;
    media.removeEventListener('change',onMotionChange);
    dialog.close();dialog.remove();document.body.classList.remove('has-entrance');
    if(active?.dialog===dialog)active=null;
    if(focus){
      const heading=document.querySelector('.landing-hero h1');
      heading?.setAttribute('tabindex','-1');heading?.focus({preventScroll:true});
      window.scrollTo({top:0,behavior:'instant'});
    }
  }

  function fallback() {
    if(phase==='revealed')return;
    scene?.dispose();scene=null;stage.dataset.renderer='fallback';
    stage.classList.remove('has-webgl');canvas.hidden=true;
  }

  async function open() {
    if(phase!=='idle')return;
    if(media.matches){finish();return;}
    phase='opening';dialog.classList.add('is-opening');
    cube.disabled=true;openButton.disabled=true;pauseButton.disabled=true;
    openButton.textContent='A cena se revela…';
    scene?.open({duration:1600}).catch(()=>{});
    openingAnimation=dialog.animate([{opacity:1},{opacity:1}],{duration:1600});
    await openingAnimation.finished.catch(()=>{});
    if(phase==='revealed')return;
    dialog.classList.add('is-revealing');
    fadeAnimation=dialog.animate([{opacity:1,transform:'translateY(0)'},{opacity:0,transform:'translateY(-12px)'}],{duration:420,easing:'cubic-bezier(.22,.7,.2,1)',fill:'forwards'});
    await fadeAnimation.finished.catch(()=>{});
    if(phase!=='revealed')finish();
  }

  function onMotionChange(event) {
    if(event.matches){paused=true;updatePause();if(phase==='opening')finish();}
  }
  media.addEventListener('change',onMotionChange);
  const listen=(target,event,handler)=>target.addEventListener(event,handler,{signal:abort.signal});
  listen(dialog,'cancel',event=>{event.preventDefault();finish();});
  listen(dialog.querySelector('[data-entrance-skip]'),'click',()=>finish());
  listen(openButton,'click',open);
  listen(pauseButton,'click',()=>{paused=!paused;updatePause();});
  listen(cube,'click',event=>{if(suppressClick&&event.detail>0){suppressClick=false;return;}suppressClick=false;open();});
  listen(cube,'pointerdown',event=>{
    if(phase!=='idle'||(event.pointerType==='mouse'&&event.button!==0))return;
    pointer={id:event.pointerId,x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,moved:false};
    cube.setPointerCapture(event.pointerId);
  });
  listen(cube,'pointermove',event=>{
    if(!pointer||pointer.id!==event.pointerId||phase!=='idle')return;
    if(Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>7)pointer.moved=true;
    if(pointer.moved){
      const dx=event.clientX-pointer.lastX;const dy=event.clientY-pointer.lastY;
      scene?.drag(dx,dy);dragY+=dx*.3;dragX-=dy*.2;
      stage.style.setProperty('--drag-y',`${dragY}deg`);stage.style.setProperty('--drag-x',`${dragX}deg`);
    }
    pointer.lastX=event.clientX;pointer.lastY=event.clientY;
  });
  listen(cube,'pointerup',event=>{
    if(!pointer||event.pointerId!==pointer.id)return;
    suppressClick=pointer.moved;pointer=null;
    if(cube.hasPointerCapture(event.pointerId))cube.releasePointerCapture(event.pointerId);
  });
  listen(cube,'pointercancel',()=>{pointer=null;suppressClick=true;});
  listen(document,'visibilitychange',()=>dialog.classList.toggle('is-tab-hidden',document.hidden));
  active={dialog,finish,update(next){
    const changed=next.name!==settings.name||next.logo!==settings.logo;
    settings=next;
    dialog.querySelector('[data-entrance-brand]').innerHTML=brand(next);
    dialog.querySelector('[data-entrance-description]').textContent=next.tagline;
    if(changed){
      dialog.querySelector('.entrance-face-brand').innerHTML=`${brand(next,true)}<b>${esc(next.name)}</b>`;
      scene?.setBrand({name:next.name,logo:next.logo});
    }
  }};
  updatePause();
  dialog.showModal();openButton.focus({preventScroll:true});

  import('./box-scene.js').then(({createBoxScene})=>{
    if(phase!=='idle'||abort.signal.aborted)return;
    try{
      scene=createBoxScene({canvas,logo:settings.logo,name:settings.name,paused,onError:fallback});
      stage.dataset.renderer='webgl';stage.classList.add('has-webgl');
    }catch{fallback();}
  }).catch(fallback);
}
