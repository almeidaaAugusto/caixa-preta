import {
  getState, saveLink, saveEvent, deleteLink, deleteEvent,
  moveLink, toggleLink, toggleEvent, setFeatured, saveCategory, deleteCategory,
} from './store.js';
import { statusOf, formatDate } from './domain.js';
import {
  esc, icon, notify, openModal, imageField, bindImageFields, statusBadge, emptyState, safeImage,
} from './ui.js';

const filters = {
  links: { query: '', status: 'todos', category: 'todas' },
  eventos: { query: '', status: 'todos', period: 'todos' },
};

const iconChoices = [
  ['link', 'Link'], ['arrow-up-right', 'Seta'], ['music', 'Música'],
  ['ticket', 'Ingresso'], ['calendar', 'Agenda'], ['instagram', 'Instagram'],
  ['mail', 'E-mail'], ['external', 'Página externa'],
];

const selected = (value, current) => value === current ? ' selected' : '';
const checked = (value) => value ? ' checked' : '';
const normalize = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
const isFeatured = (state, kind, id) => state.featured?.kind === kind && state.featured?.id === id;

function runAction(action, message) {
  try {
    action();
    if (message) notify(message);
  } catch (error) {
    notify(error.message || 'Não foi possível salvar a alteração.', 'error');
  }
}

function categoryName(state, id) {
  return state.categories.find((category) => category.id === id)?.title || 'Sem categoria';
}

function recordTags(record, state, kind) {
  return `${statusBadge(statusOf(record))}
    ${!record.active ? '<span class="badge content-inactive">Inativo</span>' : ''}
    ${isFeatured(state, kind, record.id) ? '<span class="badge content-featured">Destaque</span>' : ''}
    ${record.demo ? '<span class="demo-tag">Demonstração</span>' : ''}`;
}

function filterOptions(current) {
  return [
    ['todos', 'Todos os status'], ['publicado', 'Publicados'],
    ['agendado', 'Agendados'], ['rascunho', 'Rascunhos'],
    ['encerrado', 'Encerrados'], ['inativo', 'Inativos'],
  ].map(([value, label]) => `<option value="${value}"${selected(value, current)}>${label}</option>`).join('');
}

function filteredRecords(state, section) {
  const current = filters[section];
  const query = normalize(current.query.trim());
  const records = section === 'links' ? state.links : state.events;
  return records.filter((item) => {
    const text = section === 'links'
      ? `${item.title} ${item.description} ${item.url} ${categoryName(state, item.categoryId)}`
      : `${item.title} ${item.description} ${item.location}`;
    if (query && !normalize(text).includes(query)) return false;
    if (current.status === 'inativo' && item.active) return false;
    if (current.status !== 'todos' && current.status !== 'inativo' && statusOf(item) !== current.status) return false;
    if (section === 'links' && current.category !== 'todas' && (item.categoryId || '') !== current.category) return false;
    if (section === 'eventos') {
      const past = new Date(item.date).getTime() < Date.now();
      if (current.period === 'proximos' && past) return false;
      if (current.period === 'encerrados' && !past) return false;
    }
    return true;
  });
}

function itemActions(item, state, kind) {
  const feature = isFeatured(state, kind, item.id);
  const title = esc(item.title);
  return `<div class="content-row-actions">
    <button type="button" class="icon-button content-feature-button${feature ? ' is-selected' : ''}" data-content-action="feature" data-id="${esc(item.id)}" aria-label="${feature ? 'Remover destaque de' : 'Destacar'} ${title}" title="${feature ? 'Remover destaque' : 'Destacar'}" aria-pressed="${feature}">${icon('arrow-up-right', 18)}</button>
    <button type="button" class="content-activation${item.active ? ' is-active' : ''}" data-content-action="toggle" data-id="${esc(item.id)}" role="switch" aria-checked="${item.active}" aria-label="${item.active ? 'Desativar' : 'Ativar'} ${title}" title="${item.active ? 'Desativar' : 'Ativar'}"><span></span></button>
    <button type="button" class="icon-button" data-content-action="edit" data-id="${esc(item.id)}" aria-label="Editar ${title}" title="Editar">${icon('edit', 18)}</button>
    <button type="button" class="icon-button content-delete" data-content-action="delete" data-id="${esc(item.id)}" aria-label="Excluir ${title}" title="Excluir">${icon('trash', 18)}</button>
  </div>`;
}

function linkRow(link, state) {
  const image = safeImage(link.image);
  const siblings = state.links.filter((item) => (item.categoryId || '') === (link.categoryId || ''));
  const position = siblings.findIndex((item) => item.id === link.id);
  return `<article class="content-row content-link-row" aria-label="${esc(link.title)}">
    <div class="content-order" aria-label="Ordenar link">
      <button type="button" class="icon-button" data-content-action="up" data-id="${esc(link.id)}" aria-label="Subir ${esc(link.title)} na categoria" title="Subir na categoria"${position <= 0 ? ' disabled' : ''}>${icon('chevron-up', 16)}</button>
      <button type="button" class="icon-button" data-content-action="down" data-id="${esc(link.id)}" aria-label="Descer ${esc(link.title)} na categoria" title="Descer na categoria"${position >= siblings.length - 1 ? ' disabled' : ''}>${icon('chevron-down', 16)}</button>
    </div>
    <div class="content-item-main">
      <div class="content-link-icon">${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : icon(link.icon || 'link', 22)}</div>
      <div class="content-item-copy"><h3><button type="button" data-content-action="edit" data-id="${esc(link.id)}">${esc(link.title)}</button></h3><p class="content-destination" title="${esc(link.url)}">${esc(link.url)}</p>${link.description ? `<p class="content-description">${esc(link.description)}</p>` : ''}</div>
    </div>
    <span class="content-category-name">${esc(categoryName(state, link.categoryId))}</span>
    <div class="content-tags">${recordTags(link, state, 'link')}</div>
    ${itemActions(link, state, 'link')}
  </article>`;
}

function eventRow(event, state) {
  const image = safeImage(event.image);
  const past = new Date(event.date).getTime() < Date.now();
  return `<article class="content-row content-event-row" aria-label="${esc(event.title)}">
    <div class="content-item-main">
      <div class="content-event-image">${image ? `<img src="${esc(image)}" alt="" loading="lazy">` : icon('calendar', 25)}</div>
      <div class="content-item-copy"><h3><button type="button" data-content-action="edit" data-id="${esc(event.id)}">${esc(event.title)}</button></h3><p class="content-event-date">${icon('calendar', 13)} ${esc(formatDate(event.date, { year: 'numeric', hour: '2-digit', minute: '2-digit' }))}</p><p class="content-description">${esc(event.location || 'Local a definir')}</p></div>
    </div>
    <div class="content-placements"><span class="content-period${past ? ' is-past' : ''}">${past ? 'Encerrado' : 'Próximo'}</span><span>${[event.onLanding ? 'Landing page' : '', event.onLinks ? 'Página de links' : ''].filter(Boolean).join(' · ') || 'Sem página selecionada'}</span></div>
    <div class="content-tags">${recordTags(event, state, 'event')}</div>
    ${itemActions(event, state, 'event')}
  </article>`;
}

function paintList(root, state, section) {
  const records = filteredRecords(state, section);
  const all = section === 'links' ? state.links : state.events;
  const target = root.querySelector('[data-content-list]');
  const summary = root.querySelector('[data-content-result]');
  if (!target || !summary) return;
  summary.textContent = `${records.length} de ${all.length} ${section === 'links' ? 'links' : 'eventos'}`;
  if (!records.length) {
    target.innerHTML = all.length
      ? emptyState('Nenhum resultado por aqui', 'Ajuste a busca ou os filtros para encontrar seu conteúdo.', '<button type="button" class="button secondary" data-content-action="clear-filters">Limpar filtros</button>')
      : emptyState(section === 'links' ? 'Seu próximo destino começa aqui' : 'A agenda está aberta', section === 'links' ? 'Adicione seu primeiro link e reúna os destinos da produtora.' : 'Cadastre um evento para começar a preencher sua agenda.', `<button type="button" class="button" data-content-action="new">${icon('plus', 17)} ${section === 'links' ? 'Criar primeiro link' : 'Criar primeiro evento'}</button>`);
    return;
  }
  if (section === 'links') {
    const categoryIds = [...state.categories.map((category) => category.id), ''];
    for (const link of records) if (!categoryIds.includes(link.categoryId || '')) categoryIds.push(link.categoryId || '');
    target.innerHTML = categoryIds.map((id) => {
      const links = records.filter((link) => (link.categoryId || '') === id);
      if (!links.length) return '';
      return `<section class="content-category-group" aria-label="${esc(categoryName(state, id))}"><div class="content-group-heading"><h2>${esc(categoryName(state, id))}</h2><span>${String(links.length).padStart(2, '0')}</span></div>${links.map((link) => linkRow(link, state)).join('')}</section>`;
    }).join('');
  } else {
    const upcoming = records.filter((event) => new Date(event.date).getTime() >= Date.now()).sort((a, b) => new Date(a.date) - new Date(b.date));
    const past = records.filter((event) => new Date(event.date).getTime() < Date.now()).sort((a, b) => new Date(b.date) - new Date(a.date));
    target.innerHTML = [[upcoming, 'Próximos eventos'], [past, 'Eventos encerrados']].map(([items, title]) => items.length ? `<section class="content-category-group" aria-label="${title}"><div class="content-group-heading"><h2>${title}</h2><span>${String(items.length).padStart(2, '0')}</span></div>${items.map((event) => eventRow(event, state)).join('')}</section>` : '').join('');
  }
}

export function renderContent(root, state, section) {
  const isLinks = section === 'links';
  if (!isLinks && section !== 'eventos') return;
  if (isLinks && filters.links.category !== 'todas' && filters.links.category && !state.categories.some((category) => category.id === filters.links.category)) filters.links.category = 'todas';
  const current = filters[section];
  const records = isLinks ? state.links : state.events;
  const published = records.filter((item) => statusOf(item) === 'publicado').length;
  const scheduled = records.filter((item) => statusOf(item) === 'agendado').length;
  root.innerHTML = `<div class="content-page">
    <header class="content-heading"><div><p class="eyebrow">CONTEÚDO / ${isLinks ? 'LINKS' : 'EVENTOS'}</p><h1>${isLinks ? 'Links e categorias' : 'Agenda de eventos'}</h1><p class="muted">${isLinks ? 'Todos os caminhos da Caixa Preta, no mesmo lugar.' : 'Organize o que vem aí e dê espaço para o que já aconteceu.'}</p></div><div class="content-heading-actions">${isLinks ? `<button type="button" class="button secondary" data-content-action="categories">${icon('grid', 17)} Categorias</button>` : ''}<button type="button" class="button" data-content-action="new">${icon('plus', 18)} ${isLinks ? 'Novo link' : 'Novo evento'}</button></div></header>
    <div class="content-summary"><span><strong>${String(records.length).padStart(2, '0')}</strong> ${isLinks ? 'links no total' : 'eventos no total'}</span><span><i class="content-dot"></i> ${published} ${published === 1 ? 'publicado' : 'publicados'}</span><span>${icon('clock', 14)} ${scheduled} ${scheduled === 1 ? 'agendado' : 'agendados'}</span><a href="${isLinks ? '/links?preview=1' : '/?preview=1'}" target="_blank" rel="noopener">${icon('eye', 16)} Prévia da ${isLinks ? 'página de links' : 'landing page'} ${icon('arrow-up-right', 14)}</a></div>
    <section class="content-panel" aria-label="${isLinks ? 'Gerenciar links' : 'Gerenciar eventos'}">
      <div class="content-toolbar"><div class="content-search">${icon('search', 18)}<label class="content-sr-only" for="content-search-${section}">Buscar ${isLinks ? 'links' : 'eventos'}</label><input id="content-search-${section}" data-content-filter="query" type="search" placeholder="${isLinks ? 'Buscar por título ou endereço...' : 'Buscar por título ou local...'}" value="${esc(current.query)}" autocomplete="off"></div><div class="content-filter-fields"><label class="content-sr-only" for="content-status-${section}">Filtrar por status</label><select id="content-status-${section}" data-content-filter="status">${filterOptions(current.status)}</select>${isLinks ? `<label class="content-sr-only" for="content-category-filter">Filtrar por categoria</label><select id="content-category-filter" data-content-filter="category"><option value="todas"${selected('todas', current.category)}>Todas as categorias</option>${state.categories.map((category) => `<option value="${esc(category.id)}"${selected(category.id, current.category)}>${esc(category.title)}</option>`).join('')}<option value=""${selected('', current.category)}>Sem categoria</option></select>` : `<label class="content-sr-only" for="content-period-filter">Filtrar por período</label><select id="content-period-filter" data-content-filter="period"><option value="todos"${selected('todos', current.period)}>Todos os períodos</option><option value="proximos"${selected('proximos', current.period)}>Próximos eventos</option><option value="encerrados"${selected('encerrados', current.period)}>Eventos encerrados</option></select>`}</div></div>
      <div class="content-table-heading${isLinks ? '' : ' content-event-heading'}" aria-hidden="true"><span>${isLinks ? 'LINK / DESTINO' : 'EVENTO / DATA'}</span><span>${isLinks ? 'CATEGORIA' : 'EXIBIÇÃO'}</span><span>STATUS</span><span>AÇÕES</span></div>
      <div data-content-list></div>
      <footer class="content-panel-footer"><span data-content-result aria-live="polite"></span><span>${isLinks ? 'A ordem é compartilhada com a página pública.' : 'Horários no fuso local deste navegador.'}</span></footer>
    </section>
    <p class="content-footnote">${icon('link', 14)} As alterações são compartilhadas entre o painel e as páginas públicas.</p>
  </div>`;
  paintList(root, state, section);

  root.oninput = (event) => {
    if (event.target.dataset.contentFilter !== 'query') return;
    current.query = event.target.value;
    paintList(root, getState(), section);
  };
  root.onchange = (event) => {
    const name = event.target.dataset.contentFilter;
    if (!name || name === 'query') return;
    current[name] = event.target.value;
    paintList(root, getState(), section);
  };
  root.onclick = (event) => {
    const button = event.target.closest('[data-content-action]');
    if (!button || !root.contains(button)) return;
    const action = button.dataset.contentAction;
    const id = button.dataset.id;
    const fresh = getState();
    const item = (isLinks ? fresh.links : fresh.events).find((record) => record.id === id);
    if (action === 'new') return openEditor(isLinks ? 'link' : 'event');
    if (action === 'categories') return openCategories();
    if (action === 'clear-filters') {
      Object.assign(current, isLinks ? { query: '', status: 'todos', category: 'todas' } : { query: '', status: 'todos', period: 'todos' });
      renderContent(root, fresh, section);
      return;
    }
    if (!item) return;
    if (action === 'edit') return openEditor(isLinks ? 'link' : 'event', item);
    if (action === 'delete') return confirmDelete({
      title: `Excluir ${isLinks ? 'link' : 'evento'}?`,
      message: `“${item.title}” será removido das páginas públicas e deste painel. Esta ação não pode ser desfeita.`,
      button: `Excluir ${isLinks ? 'link' : 'evento'}`,
      action: () => isLinks ? deleteLink(id) : deleteEvent(id),
    });
    if (action === 'toggle') runAction(() => isLinks ? toggleLink(id) : toggleEvent(id), `${isLinks ? 'Link' : 'Evento'} ${item.active ? 'desativado' : 'ativado'}.`);
    if (action === 'feature') runAction(() => setFeatured(isLinks ? 'link' : 'event', id), isFeatured(fresh, isLinks ? 'link' : 'event', id) ? 'Destaque removido.' : 'Destaque atualizado.');
    if (isLinks && (action === 'up' || action === 'down')) runAction(() => moveLink(id, action === 'up' ? -1 : 1), 'Ordem dos links atualizada.');
  };
}

function publicationFields(record) {
  return `<fieldset class="editor-section"><legend>Publicação</legend>
    <div class="editor-checks"><label class="toggle"><input type="checkbox" name="active"${checked(record.active ?? true)}> Conteúdo ativo</label><label class="toggle"><input type="checkbox" name="draft"${checked(record.draft ?? false)}> Salvar como rascunho</label></div>
    <div class="field-row"><div class="field"><label for="editor-startAt">Início da exibição</label><input id="editor-startAt" type="datetime-local" name="startAt" value="${esc(record.startAt || '')}"><small>Vazio para publicar assim que salvar.</small></div><div class="field"><label for="editor-endAt">Fim da exibição</label><input id="editor-endAt" type="datetime-local" name="endAt" value="${esc(record.endAt || '')}"><small>Vazio para manter sem prazo.</small></div></div>
    <div class="editor-status-preview">Status ao salvar <span data-editor-status>${statusBadge(statusOf({ ...record, active: record.active ?? true, draft: record.draft ?? false }))}</span></div>
    <label class="toggle editor-demo"><input type="checkbox" name="demo"${checked(record.demo ?? true)}> Conteúdo de demonstração</label><p class="editor-help">Desmarque apenas quando este conteúdo representar informações reais da produtora.</p>
  </fieldset>`;
}

function linkFields(record, state) {
  const choices = iconChoices.some(([value]) => value === record.icon) || !record.icon ? iconChoices : [...iconChoices, [record.icon, record.icon]];
  return `<div class="editor-section"><div class="field"><label for="editor-title">Título <span aria-hidden="true">*</span></label><input id="editor-title" name="title" value="${esc(record.title || '')}" required minlength="2" maxlength="120" autocomplete="off" placeholder="Ex.: Ingressos para a próxima edição"></div>
    <div class="field"><label for="editor-url">Endereço de destino <span aria-hidden="true">*</span></label><input id="editor-url" name="url" type="text" inputmode="url" value="${esc(record.url || '')}" required autocomplete="off" placeholder="https://"><small>Use https://, http://, mailto:, tel: ou um caminho do site.</small></div>
    <div class="field"><label for="editor-description">Descrição</label><textarea id="editor-description" name="description" rows="3" maxlength="500" placeholder="Uma frase para apresentar este destino">${esc(record.description || '')}</textarea></div>
    <div class="field-row"><div class="field"><label for="editor-category">Categoria</label><select id="editor-category" name="categoryId"><option value="">Sem categoria</option>${state.categories.map((category) => `<option value="${esc(category.id)}"${selected(category.id, record.categoryId)}>${esc(category.title)}</option>`).join('')}</select></div><div class="field"><label for="editor-icon">Ícone</label><select id="editor-icon" name="icon">${choices.map(([value, label]) => `<option value="${esc(value)}"${selected(value, record.icon || 'link')}>${esc(label)}</option>`).join('')}</select></div></div>
    ${imageField('image', record.image || '', 'Imagem do link')}
  </div>`;
}

function eventFields(record) {
  return `<div class="editor-section"><div class="field"><label for="editor-title">Título <span aria-hidden="true">*</span></label><input id="editor-title" name="title" value="${esc(record.title || '')}" required minlength="2" maxlength="120" autocomplete="off" placeholder="Nome do evento"></div>
    <div class="field"><label for="editor-description">Descrição</label><textarea id="editor-description" name="description" rows="3" maxlength="2000" placeholder="O que o público precisa saber sobre o evento?">${esc(record.description || '')}</textarea></div>
    ${imageField('image', record.image || '', 'Capa do evento')}
    <div class="field-row"><div class="field"><label for="editor-date">Data e horário <span aria-hidden="true">*</span></label><input id="editor-date" type="datetime-local" name="date" value="${esc(record.date || '')}" required><small>Horário local deste navegador.</small></div><div class="field"><label for="editor-location">Local</label><input id="editor-location" name="location" value="${esc(record.location || '')}" maxlength="180" placeholder="Espaço e cidade"></div></div>
    <div class="field"><label for="editor-url">Endereço para ingressos</label><input id="editor-url" name="url" type="text" inputmode="url" value="${esc(record.url || '')}" placeholder="https://" autocomplete="off"><small>Opcional. Use o destino de ingressos ou mais informações.</small></div>
    <div class="editor-checks"><label class="toggle"><input type="checkbox" name="onLanding"${checked(record.onLanding ?? true)}> Exibir na landing page</label><label class="toggle"><input type="checkbox" name="onLinks"${checked(record.onLinks ?? true)}> Exibir na página de links</label></div>
  </div>`;
}

function formRecord(form, kind, id) {
  const values = new FormData(form);
  const text = (name) => String(values.get(name) || '').trim();
  const common = {
    id: id || '', title: text('title'), description: text('description'), image: text('image'),
    url: text('url'), active: values.has('active'), draft: values.has('draft'),
    startAt: text('startAt'), endAt: text('endAt'), demo: values.has('demo'),
  };
  return kind === 'link'
    ? { ...common, icon: text('icon'), categoryId: text('categoryId') }
    : { ...common, date: text('date'), location: text('location'), onLanding: values.has('onLanding'), onLinks: values.has('onLinks') };
}

function openEditor(kind, record = {}) {
  const isLink = kind === 'link';
  const noun = isLink ? 'link' : 'evento';
  openModal({
    title: `${record.id ? 'Editar' : 'Novo'} ${noun}`,
    wide: true,
    content: `<form class="editor-form"><span class="unsaved-indicator" data-dirty hidden>Alterações não salvas</span><p class="editor-intro">${record.id ? 'Atualize os detalhes e salve suas alterações.' : `Preencha os detalhes do ${noun}. Campos com * são obrigatórios.`}</p>${isLink ? linkFields(record, getState()) : eventFields(record)}${publicationFields(record)}<div class="form-actions editor-form-actions"><a class="button ghost" href="${isLink ? '/links?preview=1' : '/?preview=1'}" target="_blank" rel="noopener">${icon('eye', 17)} Ver prévia salva</a><div><button type="button" class="button secondary" data-editor-cancel>Cancelar</button><button type="submit" class="button">${icon('check', 17)} Salvar ${noun}</button></div></div><p class="editor-help editor-preview-help">A prévia mostra os dados já salvos. Salve para visualizar suas alterações.</p></form>`,
    onMount({ dialog, close }) {
      bindImageFields(dialog);
      const form = dialog.querySelector('form');
      dialog.querySelector('[data-editor-cancel]').onclick = () => close();
      const updateStatus = () => {
        form.querySelector('[data-editor-status]').innerHTML = statusBadge(statusOf(formRecord(form, kind, record.id)));
      };
      form.addEventListener('input', updateStatus);
      form.addEventListener('change', updateStatus);
      form.onsubmit = (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        try {
          const value = formRecord(form, kind, record.id);
          if (isLink) saveLink(value); else saveEvent(value);
          close(true);
          notify(`${isLink ? 'Link' : 'Evento'} ${record.id ? 'atualizado' : 'criado'} com sucesso.`);
        } catch (error) {
          notify(error.message || `Não foi possível salvar o ${noun}.`, 'error');
        }
      };
    },
  });
}

function confirmDelete({ title, message, button, action, after }) {
  openModal({
    title,
    content: `<div class="editor-confirm"><div class="editor-warning-icon">${icon('trash', 26)}</div><p>${esc(message)}</p><div class="form-actions"><button type="button" class="button secondary" data-delete-cancel>Cancelar</button><button type="button" class="button danger" data-delete-confirm>${esc(button)}</button></div></div>`,
    onMount({ dialog, close }) {
      dialog.querySelector('[data-delete-cancel]').onclick = () => close();
      dialog.querySelector('[data-delete-confirm]').onclick = () => {
        try {
          action();
          close(true);
          after?.();
          notify('Conteúdo excluído.');
        } catch (error) {
          notify(error.message || 'Não foi possível excluir o conteúdo.', 'error');
        }
      };
    },
  });
}

function openCategoryEditor(record = {}, after) {
  openModal({
    title: record.id ? 'Editar categoria' : 'Nova categoria',
    content: `<form class="editor-form"><span class="unsaved-indicator" data-dirty hidden>Alterações não salvas</span><div class="field"><label for="editor-category-title">Nome da categoria</label><input id="editor-category-title" name="title" value="${esc(record.title || '')}" required minlength="2" maxlength="80" placeholder="Ex.: Ingressos" autocomplete="off"></div><p class="editor-help">Use categorias para organizar os links na página pública.</p><div class="form-actions"><button type="button" class="button secondary" data-category-cancel>Cancelar</button><button type="submit" class="button">Salvar categoria</button></div></form>`,
    onMount({ dialog, close }) {
      const form = dialog.querySelector('form');
      dialog.querySelector('[data-category-cancel]').onclick = () => close();
      form.onsubmit = (event) => {
        event.preventDefault();
        if (!form.reportValidity()) return;
        try {
          saveCategory({ id: record.id || '', title: String(new FormData(form).get('title') || '').trim() });
          close(true);
          after?.();
          notify(`Categoria ${record.id ? 'atualizada' : 'criada'}.`);
        } catch (error) {
          notify(error.message || 'Não foi possível salvar a categoria.', 'error');
        }
      };
    },
  });
}

function openCategories() {
  openModal({
    title: 'Categorias de links',
    content: `<div class="content-category-manager"><p class="editor-intro">Agrupe os destinos da página de links. A ordem dos links pode ser ajustada dentro de cada categoria.</p><div data-category-list></div><div class="form-actions"><button type="button" class="button secondary" data-category-close>Concluir</button><button type="button" class="button" data-category-new>${icon('plus', 17)} Nova categoria</button></div></div>`,
    onMount({ dialog, close }) {
      const paint = () => {
        const state = getState();
        dialog.querySelector('[data-category-list]').innerHTML = state.categories.length
          ? `<div class="content-category-list">${state.categories.map((category) => `<div class="content-category-entry"><div><strong>${esc(category.title)}</strong><span>${state.links.filter((link) => link.categoryId === category.id).length} links</span></div><div><button type="button" class="icon-button" data-category-edit="${esc(category.id)}" aria-label="Editar categoria ${esc(category.title)}">${icon('edit', 18)}</button><button type="button" class="icon-button content-delete" data-category-delete="${esc(category.id)}" aria-label="Excluir categoria ${esc(category.title)}">${icon('trash', 18)}</button></div></div>`).join('')}</div>`
          : emptyState('Nenhuma categoria criada', 'Seus links ficam em “Sem categoria” até você organizá-los.');
      };
      paint();
      dialog.querySelector('[data-category-close]').onclick = () => close();
      dialog.querySelector('[data-category-new]').onclick = () => openCategoryEditor({}, paint);
      dialog.addEventListener('click', (event) => {
        const edit = event.target.closest('[data-category-edit]');
        const remove = event.target.closest('[data-category-delete]');
        if (!edit && !remove) return;
        const id = edit?.dataset.categoryEdit || remove?.dataset.categoryDelete;
        const category = getState().categories.find((item) => item.id === id);
        if (!category) return;
        if (edit) openCategoryEditor(category, paint);
        else confirmDelete({ title: 'Excluir categoria?', message: `A categoria “${category.title}” será excluída. Seus links serão mantidos em “Sem categoria”.`, button: 'Excluir categoria', action: () => deleteCategory(id), after: paint });
      });
    },
  });
}
