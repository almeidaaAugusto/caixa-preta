import { createDemoState } from './data.js';
import { validateLink, validateEvent, moveWithinCategory, isValidDestination } from './domain.js';

export const STORAGE_KEY = 'caixa-preta-demo-v1';
const id = () => globalThis.crypto.randomUUID();

function normalize(raw, seed) {
  if (!raw || raw.version !== 1 || !raw.settings || typeof raw.settings !== 'object' ||
    !['categories','links','events','clicks'].every(key => Array.isArray(raw[key]))) throw new Error('Formato inválido');
  if (!raw.links.every(item => item && typeof item.id === 'string' && !validateLink(item).length) ||
    !raw.events.every(item => item && typeof item.id === 'string' && !validateEvent(item).length) ||
    !raw.categories.every(item => item && typeof item.id === 'string' && typeof item.title === 'string') ||
    !raw.clicks.every(item => item && ['link','event'].includes(item.kind) && typeof item.targetId === 'string' && Number.isFinite(+new Date(item.at)))) throw new Error('Registros inválidos');
  const defaults = seed();
  if (Object.keys(defaults.settings).some(key => raw.settings[key] !== undefined && typeof raw.settings[key] !== 'string') ||
    (raw.settings.accent !== undefined && !/^#[0-9a-f]{6}$/i.test(raw.settings.accent))) throw new Error('Informações da produtora inválidas');
  return { ...raw, settings:{...defaults.settings,...raw.settings} };
}

export function createRepository(storage, seed = createDemoState) {
  let state = seed();
  let warning = '';
  const listeners = new Set();
  try {
    if (!storage) throw new Error('Armazenamento indisponível');
    const saved = storage.getItem(STORAGE_KEY);
    if (saved !== null) state = normalize(JSON.parse(saved), seed);
  } catch {
    warning = 'Não foi possível ler os dados deste navegador. Uma demonstração temporária foi carregada; use Restaurar demonstração para recuperar o armazenamento.';
  }
  const emit = () => listeners.forEach(fn => fn(state));
  function commit(update) {
    const next = structuredClone(state);
    update(next);
    try {
      if (!storage) throw new Error('Sem armazenamento');
      storage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error('Não foi possível salvar no armazenamento deste navegador. Libere espaço ou permita o armazenamento local e tente novamente.');
    }
    state = next;
    warning = '';
    emit();
  }
  function saveRecord(kind, value, validate) {
    const errors = validate(value);
    if (errors.length) throw new Error(errors.join(' '));
    const record = {...value,id:value.id || id(),title:value.title.trim(),url:String(value.url ?? '').trim()};
    commit(next => {
      if (kind === 'links' && record.categoryId && !next.categories.some(cat=>cat.id===record.categoryId)) record.categoryId = '';
      const index = next[kind].findIndex(item=>item.id===record.id);
      if (index < 0) next[kind].push(record); else next[kind][index] = record;
    });
    return record.id;
  }
  const repo = {
    getState:()=>state,
    getStorageWarning:()=>warning,
    subscribe(fn) { listeners.add(fn); return ()=>listeners.delete(fn); },
    saveLink: value => saveRecord('links',value,validateLink),
    saveEvent: value => saveRecord('events',value,validateEvent),
    deleteLink(recordId) { commit(next=>{next.links=next.links.filter(x=>x.id!==recordId); if(next.featured?.kind==='link' && next.featured.id===recordId) next.featured=null;}); },
    deleteEvent(recordId) { commit(next=>{next.events=next.events.filter(x=>x.id!==recordId); if(next.featured?.kind==='event' && next.featured.id===recordId) next.featured=null;}); },
    moveLink(recordId,direction) { commit(next=>{next.links=moveWithinCategory(next.links,recordId,direction);}); },
    toggleLink(recordId) { commit(next=>{const item=next.links.find(x=>x.id===recordId); if(item)item.active=!item.active;}); },
    toggleEvent(recordId) { commit(next=>{const item=next.events.find(x=>x.id===recordId); if(item)item.active=!item.active;}); },
    setFeatured(kind,recordId) { commit(next=>{const list=kind==='link'?next.links:next.events; if(!list.some(x=>x.id===recordId))throw new Error('Conteúdo não encontrado.'); next.featured=next.featured?.kind===kind && next.featured.id===recordId?null:{kind,id:recordId};}); },
    saveCategory(value) {
      const title=String(value.title??'').trim();
      if(!title)throw new Error('Informe o nome da categoria.');
      if(state.categories.some(x=>x.id!==value.id && x.title.toLocaleLowerCase()===title.toLocaleLowerCase()))throw new Error('Já existe uma categoria com esse nome.');
      const record={id:value.id||id(),title};
      commit(next=>{const index=next.categories.findIndex(x=>x.id===record.id); if(index<0)next.categories.push(record);else next.categories[index]=record;});
      return record.id;
    },
    deleteCategory(recordId) { commit(next=>{next.categories=next.categories.filter(x=>x.id!==recordId);next.links=next.links.map(x=>x.categoryId===recordId?{...x,categoryId:''}:x);}); },
    saveSettings(value) {
      if(!String(value.name??'').trim())throw new Error('Informe o nome da produtora.');
      if(!/^#[0-9a-fA-F]{6}$/.test(value.accent))throw new Error('Escolha uma cor válida.');
      if(value.instagram && (!isValidDestination(value.instagram) || !/^https?:\/\//i.test(value.instagram)))throw new Error('Informe uma URL válida para o Instagram.');
      if(value.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))throw new Error('Informe um e-mail válido.');
      if(value.whatsapp && !/^\+?[\d ()-]{10,20}$/.test(value.whatsapp))throw new Error('Informe o WhatsApp com DDI e DDD.');
      commit(next=>{next.settings={...next.settings,...value,name:value.name.trim()};});
    },
    resetDemo() { commit(next=>{for(const key of Object.keys(next))delete next[key];Object.assign(next,seed());}); },
    recordClick(kind,recordId) {
      const list=kind==='link'?state.links:state.events;
      if(!list.some(x=>x.id===recordId))return;
      try { commit(next=>{next.clicks.push({id:id(),kind,targetId:recordId,at:new Date().toISOString()}); if(next.clicks.length>5000)next.clicks=next.clicks.slice(-5000);}); } catch { /* Navegação pública continua mesmo sem armazenamento. */ }
    },
    sync(raw) {
      try { state=raw===null?seed():normalize(JSON.parse(raw),seed);warning='';emit(); }
      catch { warning='Dados de outra aba não puderam ser lidos. Recarregue ou restaure a demonstração.';emit(); }
    },
  };
  return repo;
}

let browserStorage;
try { browserStorage = typeof window === 'undefined' ? null : window.localStorage; } catch { browserStorage = null; }
const repository = createRepository(browserStorage);
if (typeof window !== 'undefined') window.addEventListener('storage', event => { if(event.key===STORAGE_KEY || event.key===null)repository.sync(event.newValue); });
export const getState = repository.getState;
export const getStorageWarning = repository.getStorageWarning;
export const subscribe = repository.subscribe;
export const saveLink = repository.saveLink;
export const saveEvent = repository.saveEvent;
export const deleteLink = repository.deleteLink;
export const deleteEvent = repository.deleteEvent;
export const moveLink = repository.moveLink;
export const toggleLink = repository.toggleLink;
export const toggleEvent = repository.toggleEvent;
export const setFeatured = repository.setFeatured;
export const saveCategory = repository.saveCategory;
export const deleteCategory = repository.deleteCategory;
export const saveSettings = repository.saveSettings;
export const resetDemo = repository.resetDemo;
export const recordClick = repository.recordClick;
