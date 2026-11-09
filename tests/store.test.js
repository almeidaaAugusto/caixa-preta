import test from 'node:test';
import assert from 'node:assert/strict';
import { createRepository, STORAGE_KEY } from '../src/store.js';

class MemoryStorage {
  data = new Map();
  getItem(key) { return this.data.get(key) ?? null; }
  setItem(key,value) { this.data.set(key,String(value)); }
}
const seed = () => ({version:1,settings:{name:'Caixa Preta',accent:'#f2e600',email:'',whatsapp:'',instagram:''},categories:[{id:'cat',title:'Categoria'}],links:[],events:[],featured:null,clicks:[]});
const example = {title:'Novo link',url:'https://example.com',description:'',categoryId:'cat',active:true,draft:false,startAt:'',endAt:'',demo:true};

test('link criado e editado sobrevive a nova instancia do repositorio', () => {
  const storage = new MemoryStorage();
  const repo = createRepository(storage,seed);
  const id = repo.saveLink(example);
  repo.saveLink({...repo.getState().links[0],title:'Editado',url:'https://example.org'});
  const recovered = createRepository(storage,seed);
  assert.equal(recovered.getState().links[0].id,id);
  assert.equal(recovered.getState().links[0].title,'Editado');
  assert.equal(recovered.getState().links[0].url,'https://example.org');
});

test('falha de armazenamento nao publica alteracoes nem feedback falso de gravacao', () => {
  const storage = new MemoryStorage();
  storage.setItem = () => { throw new Error('QuotaExceededError'); };
  const repo = createRepository(storage,seed);
  let notified = 0;
  repo.subscribe(()=>notified++);
  assert.throws(()=>repo.saveLink(example),/salvar|armazenamento/i);
  assert.equal(repo.getState().links.length,0);
  assert.equal(notified,0);
});

test('exclusao limpa destaque e remocao de categoria preserva links', () => {
  const repo = createRepository(new MemoryStorage(),seed);
  const id = repo.saveLink(example);
  repo.setFeatured('link',id);
  repo.deleteCategory('cat');
  assert.equal(repo.getState().links[0].categoryId,'');
  repo.deleteLink(id);
  assert.equal(repo.getState().featured,null);
});

test('conteudo local corrompido gera aviso e nao e sobrescrito na leitura', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY,'{broken');
  const repo = createRepository(storage,seed);
  assert.ok(repo.getStorageWarning().length);
  assert.equal(storage.getItem(STORAGE_KEY),'{broken');
});

test('metricas sao cliques reais locais e reset restaura demo sem contagens', () => {
  const repo = createRepository(new MemoryStorage(),seed);
  const id = repo.saveLink(example);
  assert.equal(repo.getState().clicks.length,0);
  repo.recordClick('link',id);
  assert.equal(repo.getState().clicks[0].targetId,id);
  repo.resetDemo();
  assert.equal(repo.getState().clicks.length,0);
  assert.equal(repo.getState().links.length,0);
});

test('settings corrompidos carregam demonstracao recuperavel com aviso', () => {
  const storage=new MemoryStorage();
  storage.setItem(STORAGE_KEY,JSON.stringify({...seed(),settings:{...seed().settings,accent:null}}));
  const repo=createRepository(storage,seed);
  assert.ok(repo.getStorageWarning().length);
  assert.equal(repo.getState().settings.accent,'#f2e600');
});
