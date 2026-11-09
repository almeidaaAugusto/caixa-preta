import { isValidDestination } from './domain.js';
import { appPath, appMarkup, BASE_PATH } from './paths.js';

export const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const paths = {
  'arrow-up-right':'M7 17 17 7M7 7h10v10', 'arrow-right':'M4 12h16m-6-6 6 6-6 6','arrow-left':'M20 12H4m6-6-6 6 6 6',
  plus:'M12 5v14M5 12h14', close:'m6 6 12 12M6 18 18 6', link:'m10 13 4-4m-6 7-2 2a4 4 0 0 1-6-6l4-4m12 0 2-2a4 4 0 0 1 6 6l-4 4',
  calendar:'M4 5h16v16H4zM4 10h16M8 3v4m8-4v4M8 14h2m4 0h2m-8 3h2', grid:'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z',
  palette:'M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4c0-3-4-6-9-6ZM7 8h.01M12 6h.01M17 8h.01M5 13h.01',
  chart:'M4 3v18h17M8 16v-4m5 4V7m5 9V9',external:'M13 4h7v7m-1-6L9 15m1-11H4v16h16v-6',edit:'m15 4 5 5M4 15l11-11a3.5 3.5 0 0 1 5 5L9 20H4z',
  trash:'M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7m4-7v7',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  grip:'M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01','chevron-up':'m6 15 6-6 6 6','chevron-down':'m6 9 6 6 6-6',
  check:'m5 12 4 4L19 6',clock:'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v5l3 2',copy:'M9 8h12v13H9zM15 5V2H2v14h4',
  ticket:'M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4zM15 5v3m0 3v2m0 3v3',instagram:'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm9 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0M17.5 6.5h.01',
  mail:'M3 5h18v14H3zm0 0 9 8 9-8',music:'M9 18V5l12-2v13M9 8l12-2M9 18a3 2 0 1 1-6 0 3 2 0 0 1 6 0m12-2a3 2 0 1 1-6 0 3 2 0 0 1 6 0',
  settings:'M12 8a4 4 0 1 1 0 8 4 4 0 0 1 0-8M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  reset:'M3 10a9 9 0 1 1 1 7M3 3v7h7',upload:'M12 16V3m-5 5 5-5 5 5M4 16v5h16v-5',warning:'m12 3 10 18H2zM12 9v5m0 3h.01',menu:'M4 6h16M4 12h16M4 18h16',search:'M16 16l5 5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
};
export const icon = (name, size=20) => `<svg width="${Number(size)||20}" height="${Number(size)||20}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.link}"/></svg>`;

export function safeImage(value, base=BASE_PATH) {
  const input = String(value ?? '').trim();
  const local=input.startsWith('/assets/')||input.startsWith(appPath('/assets/',base));
  return /^data:image\/(png|jpeg|webp|gif);base64,/i.test(input) || ((local||/^https?:\/\//i.test(input))&&isValidDestination(input)) ? appPath(input,base) : '';
}

export function brand(settings, compact=false) {
  const source = safeImage(settings.logo);
  return `<span class="brand ${compact?'brand-compact':''}">${source?`<img class="brand-custom" src="${esc(source)}" alt="" />`:'<span class="brand-symbol" aria-hidden="true"></span>'}<span class="brand-words">${esc(settings.name)}<small>PRODUTORA</small></span></span>`;
}

export function notify(message,type='success') {
  const activeDialog=[...document.querySelectorAll('dialog[open]')].at(-1);
  if(type==='error'&&activeDialog){
    activeDialog.querySelector('.modal-error')?.remove();
    const feedback=document.createElement('div');feedback.className='toast toast-error modal-error';feedback.setAttribute('role','alert');
    feedback.innerHTML=`${icon('warning')}<span>${esc(message)}</span>`;
    const actions=activeDialog.querySelector('.form-actions');
    if(actions)actions.before(feedback);else activeDialog.querySelector('.modal-body').append(feedback);
    feedback.scrollIntoView({block:'nearest',behavior:'instant'});return;
  }
  let region=document.getElementById('notifications');
  if(!region){region=document.createElement('div');region.id='notifications';region.className='notifications';region.setAttribute('aria-live','polite');document.body.append(region);}
  const toast=document.createElement('div');toast.className=`toast ${type==='error'?'toast-error':''}`;toast.setAttribute('role',type==='error'?'alert':'status');
  toast.innerHTML=`${icon(type==='error'?'warning':'check')}<span>${esc(message)}</span>`;region.append(toast);setTimeout(()=>toast.remove(),5500);
}

const dirtyForms = new Map();
const snapshot = form => JSON.stringify([...new FormData(form)].filter(([,value])=>typeof value==='string'));
export function guardForm(form) {
  let baseline=snapshot(form);
  const isDirty=()=>snapshot(form)!==baseline;
  const update=()=>{form.querySelectorAll('[data-dirty]').forEach(el=>{el.hidden=!isDirty();});};
  form.addEventListener('input',update);form.addEventListener('change',update);dirtyForms.set(form,isDirty);
  return {isDirty,markClean(){baseline=snapshot(form);update();},destroy(){dirtyForms.delete(form);form.removeEventListener('input',update);form.removeEventListener('change',update);}};
}
export function hasUnsavedChanges() {
  for(const [form,check] of dirtyForms){if(!form.isConnected){dirtyForms.delete(form);continue;}if(check())return true;}
  return false;
}
if(typeof window!=='undefined')window.addEventListener('beforeunload',event=>{if(hasUnsavedChanges()){event.preventDefault();event.returnValue='';}});

export function openModal({title,content,wide=false,onMount}) {
  const previous=document.activeElement;
  const dialog=document.createElement('dialog');dialog.className=`modal ${wide?'modal-wide':''}`;
  const titleId=`modal-${crypto.randomUUID()}`;dialog.setAttribute('aria-labelledby',titleId);
  dialog.innerHTML=`<div class="modal-heading"><div><span class="eyebrow">SEU CONTEÚDO, DO SEU JEITO</span><h2 id="${titleId}">${esc(title)}</h2></div><button type="button" class="icon-button modal-close" aria-label="Fechar">${icon('close')}</button></div><div class="modal-body">${appMarkup(content)}</div>`;
  document.body.append(dialog);
  const guards=[...dialog.querySelectorAll('form')].map(guardForm);
  const close=(force=false)=>{if(!force&&guards.some(g=>g.isDirty())&&!confirm('Descartar as alterações não salvas?'))return;guards.forEach(g=>g.destroy());dialog.close();dialog.remove();if(previous?.isConnected)previous.focus();};
  dialog.querySelector('.modal-close').addEventListener('click',()=>close());
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();}});
  dialog.showModal();
  onMount?.({dialog,close});
  return {dialog,close};
}

export function imageField(name,value='',label='Imagem') {
  const image=safeImage(value);const uid=`image-${crypto.randomUUID()}`;
  return `<div class="field image-field"><label for="${uid}">${esc(label)}</label><div class="image-field-row"><input id="${uid}" name="${esc(name)}" data-image-source="${esc(name)}" value="${esc(value)}" placeholder="URL da imagem ou envie um arquivo" maxlength="3000000"><label class="button secondary upload-button">${icon('upload',16)} Enviar imagem<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" data-image-upload="${esc(name)}" aria-label="Enviar ${esc(label.toLowerCase())}"></label></div><span class="field-hint">PNG, JPG ou WebP. Otimizada ao enviar; dados ficam neste navegador.</span><img class="image-field-preview" data-image-preview="${esc(name)}" ${image?`src="${esc(image)}"`:'hidden'} alt="Prévia da imagem"></div>`;
}

export async function readImage(file) {
  if(!/^image\/(png|jpeg|webp|gif)$/.test(file.type))throw new Error('Use uma imagem PNG, JPG, WebP ou GIF.');
  if(file.size>12*1024*1024)throw new Error('Escolha uma imagem menor que 12 MB.');
  const url=URL.createObjectURL(file);
  try {
    const picture=new Image();picture.src=url;await picture.decode();
    const scale=Math.min(1,1400/Math.max(picture.width,picture.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(picture.width*scale);canvas.height=Math.round(picture.height*scale);
    const context=canvas.getContext('2d');context.drawImage(picture,0,0,canvas.width,canvas.height);
    return canvas.toDataURL('image/webp',.82);
  } finally {URL.revokeObjectURL(url);}
}

export function bindImageFields(container) {
  container.querySelectorAll('[data-image-source]').forEach(input=>{
    const preview=[...container.querySelectorAll('[data-image-preview]')].find(el=>el.dataset.imagePreview===input.name);
    const update=()=>{const source=safeImage(input.value);if(preview){preview.hidden=!source;if(source)preview.src=source;else preview.removeAttribute('src');}};
    input.addEventListener('input',update);
    const upload=[...container.querySelectorAll('[data-image-upload]')].find(el=>el.dataset.imageUpload===input.name);
    upload?.addEventListener('change',async()=>{if(!upload.files[0])return;upload.disabled=true;try{input.value=await readImage(upload.files[0]);input.dispatchEvent(new Event('input',{bubbles:true}));notify('Imagem pronta. Salve as alterações para aplicar.');}catch(error){notify(error.message,'error');}finally{upload.disabled=false;}});
  });
}

export const statusBadge = status => `<span class="badge badge-${esc(status)}"><i></i>${esc({rascunho:'Rascunho',agendado:'Agendado',publicado:'Publicado',encerrado:'Encerrado'}[status]||status)}</span>`;
export const emptyState = (title,text,actionHtml='') => `<div class="empty-state">${icon('grid',28)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${actionHtml}</div>`;
