import test from 'node:test';
import assert from 'node:assert/strict';
import { statusOf, visibleLinks, visibleEvents, featuredItem, isValidDestination, validateLink, validateEvent, moveWithinCategory } from '../src/domain.js';

const now = new Date('2026-11-09T15:00:00Z');
const link = { id:'a',title:'Instagram',url:'https://www.instagram.com/prod.caixapreta/',active:true,draft:false,startAt:'',endAt:'',categoryId:'pista' };

test('publicacao respeita inicio inclusivo, fim exclusivo e inatividade', () => {
  assert.equal(statusOf({...link,startAt:'2026-11-09T15:00:00Z'},now),'publicado');
  assert.equal(statusOf({...link,startAt:'2026-11-09T15:00:01Z'},now),'agendado');
  assert.equal(statusOf({...link,endAt:'2026-11-09T15:00:00Z'},now),'encerrado');
  assert.equal(statusOf({...link,active:false},now),'rascunho');
  assert.equal(statusOf({...link,draft:true},now),'rascunho');
});

test('filtros publicos removem rascunhos e destaque desativado', () => {
  const state = {links:[link,{...link,id:'b',draft:true}],events:[],featured:{kind:'link',id:'b'}};
  assert.deepEqual(visibleLinks(state,now).map(x=>x.id),['a']);
  assert.equal(featuredItem(state,'links',now),null);
});

test('eventos seguem pagina escolhida e separam arquivo de proximos', () => {
  const event = {...link,date:'2026-11-10T22:00:00Z',onLanding:true,onLinks:false};
  const state = {events:[event,{...event,id:'past',date:'2026-11-01T22:00:00Z'}]};
  assert.deepEqual(visibleEvents(state,'landing',now).map(x=>x.id),['a']);
  assert.deepEqual(visibleEvents(state,'links',now).map(x=>x.id),[]);
  assert.deepEqual(visibleEvents(state,'landing',now,true).map(x=>x.id),['past']);
});

test('destinos perigosos, intervalos invertidos e campos vazios sao rejeitados', () => {
  for (const value of ['javascript:alert(1)','data:text/html,x','//evil.test','http:example.com','https:example.com','https://user:pass@example.com','nota de texto','/\\evil.test']) assert.equal(isValidDestination(value),false,value);
  for (const value of ['https://example.com/a','/#agenda','/links','mailto:contato@example.com','tel:+5511999999999']) assert.equal(isValidDestination(value),true,value);
  assert.ok(validateLink({...link,title:' '}).length);
  assert.ok(validateLink({...link,startAt:'2026-11-11T00:00:00Z',endAt:'2026-11-10T00:00:00Z'}).length);
  assert.ok(validateEvent({...link,date:'invalida'}).length);
  assert.deepEqual(validateEvent({...link,date:'2026-11-10T22:00',onLanding:true,onLinks:true}),[]);
});

test('reordenacao troca somente vizinhos da mesma categoria sem mutar entrada', () => {
  const links = [link,{...link,id:'b',categoryId:'outra'},{...link,id:'c'}];
  assert.deepEqual(moveWithinCategory(links,'c',-1).map(x=>x.id),['c','b','a']);
  assert.deepEqual(links.map(x=>x.id),['a','b','c']);
});

test('fim da exibicao tambem remove evento do arquivo publico', () => {
  const state={events:[{...link,date:'2026-11-01T22:00:00Z',endAt:'2026-11-02T00:00:00Z',onLanding:true,onLinks:true}]};
  assert.deepEqual(visibleEvents(state,'landing',now,true),[]);
  assert.deepEqual(visibleEvents(state,'links',now,true),[]);
});
