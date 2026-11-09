# Contrato entre módulos

App sem framework, ES modules, caminho base `/`. Toda interface pt-BR. Arquivos deste contrato são a referência das integrações; não inventar funções paralelas.

## Dados e domínio (`src/domain.js`, `src/data.js`)

`state = {version:1, settings, categories:[], links:[], events:[], featured:null|{kind:'link'|'event',id}, clicks:[]}`.

`settings = {name, tagline, heroTitle, description, about, accent, logo, instagram, email, whatsapp}`. Strings. Logo vazio usa símbolo da captura fornecida; imagens opcionais são URL http(s) ou data URL raster. `heroTitle` pode conter quebra de linha.

`category = {id,title}`.

`link = {id,title,url,description,icon,image,categoryId,active,draft,startAt,endAt,demo}`. `icon` é nome do ícone; `image`, `categoryId`, `startAt`, `endAt` opcionais como string vazia; demais campos presentes.

`event = {id,title,description,image,date,location,url,active,draft,startAt,endAt,onLanding,onLinks,demo}`. `date` é datetime-local obrigatório; location/url podem ser vazios. Publicação segue `active/draft/startAt/endAt`; evento passado é encerrado.

`click = {id,kind:'link'|'event',targetId,at}`. Só contagens reais daquele navegador; sem visitantes fictícios.

Exportações domínio:

- `statusOf(item, now = new Date()) -> 'rascunho'|'agendado'|'publicado'|'encerrado'`.
- `visibleLinks(state, now) -> link[]` na ordem original, somente publicados.
- `visibleEvents(state, placement='landing', now, past=false) -> event[]`, próximos por data crescente e passados decrescente. `placement` é `'landing'|'links'`.
- `featuredItem(state, placement='landing', now) -> null | {kind,item}`; nunca retorna item invisível.
- `isValidDestination(value, allowEmpty=false) -> boolean`; http(s), mailto/tel ou caminho interno iniciado por `/` (sem `//`) e âncora; proíbe javascript/data e credenciais.
- `validateLink(value) -> string[]`; `validateEvent(value) -> string[]`; mensagens pt-BR. Agenda início < fim.
- `formatDate(value, options?) -> string`; `dateParts(value) -> {day,month,time}`.
- `moveWithinCategory(links,id,direction) -> array`; direction `-1|1`, só troca com vizinho da mesma categoria.

## Repositório (`src/store.js`)

`getState()`, `subscribe(fn)->unsubscribe`, `getStorageWarning()->string`.
`saveLink(record)`, `saveEvent(record)`: validar e salvar, criar id se vazio, retornar id; lança Error com mensagem legível se falha.
`deleteLink(id)`, `deleteEvent(id)`, `moveLink(id,direction)`, `toggleLink(id)`, `toggleEvent(id)`, `setFeatured(kind,id)`; clicar no mesmo destaque remove seleção.
`saveCategory({id?,title})`, `deleteCategory(id)` (links passam para sem categoria).
`saveSettings(settings)`, `resetDemo()`, `recordClick(kind,id)`.
Todas as mutações persistem antes de publicar o novo estado e notificam assinatura. Chamadas de edição podem lançar erro: tratar com `notify(error.message,'error')`. Não mutar `getState()` diretamente.

## UI compartilhada (`src/ui.js`)

- `esc(text)` escapa HTML.
- `icon(name, size=20)` retorna SVG estático. Nomes: arrow-up-right, arrow-right, arrow-left, plus, close, link, calendar, grid, palette, chart, external, edit, trash, eye, grip, chevron-up, chevron-down, check, clock, copy, ticket, instagram, mail, music, settings, reset, upload, warning, menu, search.
- `brand(settings, compact=false)` retorna marca em HTML. `notify(message,type='success')`.
- `openModal({title,content,wide=false,onMount}) -> {dialog,close}`; onMount recebe `{dialog,close}` após showModal. `content` é HTML seguro produzido pelos módulos. Native dialog com botão fechar `.modal-close` e `form` interno opcional. Proteção de alterações não salvas é automática em formulários por eventos input/change; salvamento chama close(true), cancelamento close().
- `imageField(name,value='',label='Imagem')` retorna HTML com input name, upload associado `data-image-upload=name`, e prévia; `bindImageFields(container)` instala uploads e prévias, com erros via notify.
- `statusBadge(status)` retorna HTML. `emptyState(title,text,actionHtml='')`.

## Módulos de páginas

`src/public.js`: exporta `renderPublic(root,state,route)`; route `'/'|'/links'`. Pode importar store/domain/ui. Prévia em `/links?preview=1` mostra rascunhos/agendados com aviso. Rastreamento real só nas páginas normais, em cliques de links/eventos.

`src/admin-content.js`: exporta `renderContent(root,state,section)`; section `'links'|'eventos'`. Inclui cabeçalho próprio da seção, filtros e todas ações/formulários. Os estilos ficam em `styles/content.css`, prefixos `.content-*` e `.editor-*` para evitar colisões.

`src/admin.js`: exporta `renderAdmin(root,state)`; navegação por query `?tab=links|eventos|aparencia|metricas` (sem tab = visão geral). Chama renderContent num elemento interno; gráficos só locais. Root controla shell.

`src/app.js`: renderiza por pathname, assina store e re-renderiza. Dialogs são anexados a document.body, fora de root. Cliques de navegação interna podem usar `<a href>` nativo; não há roteador para aprender.

## Entrada interativa

`src/entrance.js`: exporta `syncEntrance(route, settings)`, chamado após renderizar a página. Mantém a entrada fora do root para preservar a cena em atualizações do conteúdo; acompanha nome, logo e frase compartilhados. Carrega Three.js somente quando a entrada é exibida. A chave `caixa-preta-entrance-v1` em `sessionStorage` controla a primeira visita por sessão/aba; `[data-replay-entrance]` permite repetir. Rotas `/links`, `/admin`, prévias e âncoras entram diretamente. O diálogo tem pausa, teclado, movimento reduzido e fallback CSS; ao terminar, remove listeners/canvas e devolve foco à landing.

`src/box-scene.js`: exporta `createBoxScene({canvas, logo='', name='Caixa Preta', paused=false, onError=()=>{}})`, que retorna `{setPaused, setBrand, drag, open, dispose}`. `setBrand({name,logo})` invalida cargas de imagem antigas; `drag(dx,dy)` explora o objeto; `open({duration=1600}={})` retorna uma Promise que também resolve no descarte. Falha inicial lança erro; perda de contexto chama `onError`. A cena respeita visibilidade, limita a resolução e libera recursos de GPU em `dispose()`.

O importmap de `index.html` mapeia `three` à biblioteca local em `assets/vendor/three`. `scripts/vendor-three.mjs` reproduz as cópias da versão fixada em package-lock, preservando a licença MIT. A biblioteca e o helper de geometria não dependem de CDN no navegador.

## Identidade e assets

Paleta: `--bg:#10110f`, `--surface:#1b1c19`, `--paper:#f0efe7`, `--accent:#f2e600`, cinzas quentes. Tipografia: Arial/Helvetica no corpo, Impact/Arial Narrow nos grandes títulos, monospace para metadados. Direção editorial, grid intencional, bordas finas, sem gradientes genéricos.

Assets locais: `/assets/perfil-referencia.jpeg`, `/assets/feed-referencia.jpeg`, `/assets/links-referencia.jpeg` (originais fornecidos); `/assets/sessions.svg`, `/assets/frequencia.svg`, `/assets/arquivo.svg` (artes fictícias geradas em código, com “Demonstração”). Nunca apresentar datas da captura como próximas datas reais.

Base CSS fornece `.button` (amarelo), `.button.secondary`, `.button.ghost`, `.button.danger`, `.icon-button`, `.badge`, `.eyebrow`, `.muted`, `.demo-tag`, `.field`, `.field-row`, `.form-actions`, `.toggle`, `.card`. Botões sempre `type=button` fora de submit intencional. Inputs têm labels associados. Ícones sempre acompanhados de rótulos/aria-label. Use `data-track-kind` e `data-track-id` se delegar rastreamento no módulo público.
