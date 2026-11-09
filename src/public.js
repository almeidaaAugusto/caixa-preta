import { visibleLinks, visibleEvents, featuredItem, statusOf, isValidDestination, formatDate, dateParts } from './domain.js';
import { recordClick } from './store.js';
import { appMarkup } from './paths.js';
import { esc, icon, brand, statusBadge, safeImage } from './ui.js';

const listeners = new WeakMap();
const previewStatuses = new Set(['rascunho', 'agendado', 'publicado']);

function demoTag(item) {
  return item.demo ? '<span class="public-demo-tag">Demonstração</span>' : '';
}

function itemBadges(item, preview = false) {
  return `${demoTag(item)}${preview ? statusBadge(statusOf(item)) : ''}`;
}

function destinationAttributes(item, kind, preview) {
  const destination = String(item.url || '').trim();
  if (!isValidDestination(destination)) return '';
  const external = /^https?:\/\//i.test(destination);
  return `href="${esc(destination)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}${preview ? '' : ` data-track-kind="${kind}" data-track-id="${esc(item.id)}"`}`;
}

function itemAction(item, kind, preview, label, className = 'button') {
  const attributes = destinationAttributes(item, kind, preview);
  return attributes
    ? `<a class="${className}" ${attributes}>${esc(label)} ${icon('arrow-up-right', 18)}${/^https?:\/\//i.test(item.url) ? '<span class="public-sr-only"> (abre em nova aba)</span>' : ''}</a>`
    : '<span class="public-unavailable">Informações em breve</span>';
}

function eventMeta(event) {
  const parts = dateParts(event.date);
  return `<div class="public-event-meta"><span>${icon('calendar', 15)} ${esc(formatDate(event.date, { day: '2-digit', month: 'short' }))}</span><span>${icon('clock', 15)} ${esc(parts.time)}</span>${event.location ? `<span class="public-event-location">${esc(event.location)}</span>` : ''}</div>`;
}

function eventArtwork(event, className = '') {
  const source = safeImage(event.image);
  return source
    ? `<img class="${className}" src="${esc(source)}" alt="${esc(event.title)}" loading="lazy" decoding="async">`
    : `<div class="public-artwork-fallback ${className}" aria-hidden="true"><span>${icon('music', 44)}</span><strong>${esc(event.title)}</strong></div>`;
}

function empty(title, text) {
  return `<div class="public-empty">${icon('calendar', 24)}<div><h3>${esc(title)}</h3><p>${esc(text)}</p></div></div>`;
}

function contacts(settings, className = '') {
  const items = [];
  if (settings.instagram && isValidDestination(settings.instagram)) items.push({ title: 'Instagram', href: settings.instagram, icon: 'instagram' });
  const email = String(settings.email || '').trim();
  if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) items.push({ title: 'E-mail', href: `mailto:${email}`, icon: 'mail' });
  const whatsapp = String(settings.whatsapp || '').trim();
  if (whatsapp) {
    const number = whatsapp.replace(/[^\d]/g, '');
    const href = /^https?:\/\//i.test(whatsapp) ? whatsapp : number.length >= 10 ? `https://wa.me/${number}` : '';
    if (href && isValidDestination(href)) items.push({ title: 'WhatsApp', href, icon: 'arrow-up-right' });
  }
  return items.length
    ? `<div class="public-contacts ${className}">${items.map(item => `<a href="${esc(item.href)}"${/^https?:/.test(item.href) ? ' target="_blank" rel="noopener noreferrer"' : ''}>${icon(item.icon, 19)}<span>${item.title}</span>${icon('arrow-up-right', 16)}</a>`).join('')}</div>`
    : '<p class="public-contact-empty">Os canais de contato serão disponibilizados aqui.</p>';
}

function eventCard(event, preview = false, past = false) {
  const parts = dateParts(event.date);
  return `<article class="landing-event-card${past ? ' landing-event-past' : ''}">
    <div class="landing-event-cover">${eventArtwork(event)}<div class="public-card-badges">${itemBadges(event, preview)}${past ? '<span class="public-past-tag">Encerrado</span>' : ''}</div><div class="landing-date-stamp"><strong>${esc(parts.day)}</strong><span>${esc(parts.month)}</span></div></div>
    <div class="landing-event-info"><h3>${esc(event.title)}</h3>${eventMeta(event)}${event.description ? `<p>${esc(event.description)}</p>` : ''}<div class="landing-event-action">${itemAction(event, 'event', preview, past ? 'Ver registro' : 'Saiba mais', 'public-text-link')}</div></div>
  </article>`;
}

function featuredBlock(featured, preview = false, linksPage = false) {
  if (!featured) return '';
  const { kind, item } = featured;
  const source = safeImage(item.image);
  const artwork = source ? `<div class="public-featured-image"><img src="${esc(source)}" alt="${esc(item.title)}" loading="lazy" decoding="async"></div>` : '';
  return `<article class="public-featured${linksPage ? ' public-featured-compact' : ''}${artwork ? ' public-featured-has-image' : ''}">
    ${artwork}<div class="public-featured-content"><div class="public-featured-top"><span class="public-kicker">${icon('arrow-up-right', 15)} EM DESTAQUE</span><div class="public-inline-badges">${itemBadges(item, preview)}</div></div><h${linksPage ? '2' : '3'}>${esc(item.title)}</h${linksPage ? '2' : '3'}>${kind === 'event' ? eventMeta(item) : ''}${item.description ? `<p>${esc(item.description)}</p>` : ''}${itemAction(item, kind, preview, kind === 'event' ? 'Conheça o evento' : 'Acessar link', 'button')}</div>
  </article>`;
}

function pageContent(state, placement, now, preview) {
  const links = preview ? state.links.filter(item => previewStatuses.has(statusOf(item, now))) : visibleLinks(state, now);
  const upcoming = preview ? state.events.filter(item => item[placement === 'landing' ? 'onLanding' : 'onLinks'] && previewStatuses.has(statusOf(item, now))).sort((a, b) => new Date(a.date) - new Date(b.date)) : visibleEvents(state, placement, now);
  const past = visibleEvents(state, placement, now, true);
  let featured = featuredItem(state, placement, now);
  if (preview && state.featured) {
    const item = (state.featured.kind === 'link' ? links : upcoming).find(item => item.id === state.featured.id);
    if (item) featured = { kind: state.featured.kind, item };
  }
  return { links, upcoming, past, featured };
}

function previewNotice(route) {
  return `<aside class="links-preview-notice" role="status">${icon('eye', 21)}<div><strong>Você está no modo de prévia</strong><p>Rascunhos e itens agendados estão visíveis. Nenhum clique será registrado.</p></div><a href="${route}">Ver página pública ${icon('arrow-up-right', 16)}</a></aside>`;
}

function landing(state, now, preview) {
  const settings = state.settings;
  const { upcoming, past, featured } = pageContent(state, 'landing', now, preview);
  const title = String(settings.heroTitle || 'A CENA\nSE ENCONTRA\nAQUI.').split('\n').filter(Boolean);
  return `<div class="public-page landing-page" style="--public-accent:${accent(settings.accent)}">
    <a class="public-skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div class="landing-prototype"><span class="public-status-dot"></span> DEMONSTRAÇÃO <span class="landing-prototype-divider">/</span><span>IDENTIDADE EM AVALIAÇÃO</span></div>
    ${preview ? previewNotice('/') : ''}
    <header class="landing-header"><div class="landing-header-inner"><a class="landing-brand" href="/" aria-label="${esc(settings.name || 'Caixa Preta')} — início">${brand(settings)}</a><nav class="landing-nav" aria-label="Navegação principal"><a href="#agenda">Agenda</a><a href="#sobre">Sobre</a><a href="#arquivo">Arquivo</a></nav><a class="landing-header-link" href="/links">Todos os links ${icon('arrow-up-right', 18)}</a></div></header>
    <main id="conteudo">
      <section class="landing-hero" aria-labelledby="hero-title"><div class="landing-hero-copy"><p class="public-kicker"><span class="public-status-dot"></span>${esc(settings.tagline || settings.name || 'Caixa Preta')}</p><h1 id="hero-title">${title.map((line, i) => `<span${i === title.length - 1 ? ' class="landing-title-accent"' : ''}>${esc(line)}</span>`).join('')}</h1><p class="landing-hero-description">${esc(settings.description || 'Eventos, encontros e links reunidos em um só lugar.')}</p><div class="landing-hero-actions"><a class="button" href="${upcoming.length ? '#agenda' : '/links'}">${upcoming.length ? 'Explore a agenda' : 'Explore os links'} ${icon('arrow-up-right', 19)}</a><a class="public-text-link" href="#sobre">Conheça a Caixa ${icon('arrow-right', 17)}</a></div><div class="landing-hero-bottom"><button type="button" class="landing-replay" data-replay-entrance>Ver abertura 3D ${icon('arrow-up-right', 15)}</button><a href="#agenda" aria-label="Ir para a agenda">${icon('arrow-right', 19)}</a></div></div>
      <figure class="landing-hero-art"><div class="landing-art-grid" aria-hidden="true"></div><div class="landing-photo landing-photo-poster" role="img" aria-label="Material visual da referência fornecida do Instagram"></div><div class="landing-photo landing-photo-live" role="img" aria-label="Apresentação musical na referência fornecida do Instagram"></div><span class="landing-photo-note">UM RECORTE DA CENA</span><div class="landing-art-sticker" aria-hidden="true">SOM.<br>CORPO.<br>ENCONTRO.<span>↗</span></div><figcaption>IMAGENS DO MATERIAL FORNECIDO · REFERÊNCIA VISUAL</figcaption></figure></section>
      <div class="landing-ticker" aria-hidden="true"><div>MÚSICA <span>✳</span> CULTURA <span>✳</span> MOVIMENTO <span>✳</span> ENCONTRO <span>✳</span> MÚSICA <span>✳</span> CULTURA <span>✳</span> MOVIMENTO <span>✳</span></div></div>
      ${featured ? `<section class="landing-section landing-featured-section" aria-labelledby="featured-title"><div class="landing-section-heading"><p class="public-kicker">NO RADAR</p><h2 id="featured-title">A PRÓXIMA<br>CONEXÃO.</h2></div>${featuredBlock(featured, preview)}</section>` : ''}
      <section class="landing-section landing-agenda" id="agenda" aria-labelledby="agenda-title"><div class="landing-section-heading landing-section-heading-row"><div><p class="public-kicker">MARQUE NA AGENDA</p><h2 id="agenda-title">PRÓXIMOS<br>ENCONTROS<span class="landing-heading-dot">.</span></h2></div><span class="landing-section-index">${String(upcoming.length).padStart(2, '0')} ${upcoming.length === 1 ? 'EVENTO' : 'EVENTOS'}</span></div>${upcoming.length ? `<div class="landing-events-grid">${upcoming.map(event => eventCard(event, preview)).join('')}</div>` : empty('A próxima data vem aí.', 'Quando novos eventos forem publicados, eles aparecerão aqui. Enquanto isso, explore nossos links.')}<a class="public-text-link landing-section-link" href="/links">Todos os links e novidades ${icon('arrow-up-right', 18)}</a></section>
      <section class="landing-about" id="sobre" aria-labelledby="about-title"><div class="landing-about-inner"><div class="landing-about-label"><span class="public-kicker">POR TRÁS DA CAIXA</span><span class="landing-about-asterisk" aria-hidden="true">✳</span></div><div class="landing-about-copy"><h2 id="about-title">${esc(settings.name || 'Caixa Preta')}<span>.</span></h2><p>${esc(settings.about || 'Um espaço para acompanhar os eventos, os links e os registros da Caixa Preta.')}</p><div class="landing-about-bottom"><span>IDENTIDADE EM AVALIAÇÃO</span><a href="/links" class="public-text-link">Entre na conexão ${icon('arrow-up-right', 18)}</a></div></div></div></section>
      <section class="landing-section landing-archive" id="arquivo" aria-labelledby="archive-title"><div class="landing-section-heading landing-section-heading-row"><div><p class="public-kicker">O QUE FICA DEPOIS</p><h2 id="archive-title">NO ARQUIVO<span class="landing-heading-dot">.</span></h2></div><p class="landing-section-caption">Encontros que já aconteceram.<br>Registros que continuam aqui.</p></div>${past.length ? `<div class="landing-events-grid">${past.map(event => eventCard(event, preview, true)).join('')}</div>` : empty('O arquivo está sendo preparado.', 'Os eventos encerrados e publicados vão ocupar este espaço.')}</section>
      <section class="landing-contact" id="contato" aria-labelledby="contact-title"><div><p class="public-kicker">CONTINUE POR PERTO</p><h2 id="contact-title">VAMOS<br><span>NOS CONECTAR?</span></h2></div><div class="landing-contact-links">${contacts(settings)}<a class="landing-all-links" href="/links">A página de links ${icon('arrow-up-right', 23)}</a></div></section>
    </main><footer class="landing-footer"><div class="landing-footer-brand">${brand(settings, true)}<span>${esc(settings.name || 'Caixa Preta')}</span></div><p>Protótipo demonstrativo · identidade em avaliação</p><a href="/admin">Acessar painel ${icon('arrow-up-right', 14)}</a></footer>
  </div>`;
}

function linkCard(item, preview) {
  const source = safeImage(item.image);
  const attributes = destinationAttributes(item, 'link', preview);
  const content = `${source ? `<img class="links-card-image" src="${esc(source)}" alt="" loading="lazy" decoding="async">` : `<span class="links-card-icon">${icon(item.icon || 'link', 21)}</span>`}<div class="links-card-copy"><strong>${esc(item.title)}</strong>${item.description ? `<p>${esc(item.description)}</p>` : ''}<div class="public-inline-badges">${itemBadges(item, preview)}</div></div><span class="links-card-arrow" aria-hidden="true">${icon('arrow-up-right', 22)}</span>`;
  return attributes
    ? `<a class="links-card" ${attributes}>${content}${/^https?:\/\//i.test(item.url) ? '<span class="public-sr-only">Abre em nova aba.</span>' : ''}</a>`
    : `<div class="links-card links-card-unavailable">${content}<span class="public-sr-only">Destino indisponível.</span></div>`;
}

function linksEventCard(event, preview, past = false) {
  return `<article class="links-event-card"><div class="links-event-cover">${eventArtwork(event)}</div><div class="links-event-copy"><div class="public-inline-badges">${itemBadges(event, preview)}${past ? '<span class="public-past-tag">Encerrado</span>' : ''}</div><h3>${esc(event.title)}</h3>${eventMeta(event)}${itemAction(event, 'event', preview, past ? 'Ver registro' : 'Conheça o evento', 'public-text-link')}</div></article>`;
}

function linksPage(state, now, preview) {
  const settings = state.settings;
  const { links, upcoming, past, featured } = pageContent(state, 'links', now, preview);
  const groups = state.categories.map(category => ({ id: category.id, title: category.title, items: links.filter(item => item.categoryId === category.id) })).filter(group => group.items.length);
  const uncategorized = links.filter(item => !state.categories.some(category => category.id === item.categoryId));
  if (uncategorized.length) groups.push({ id: 'outros', title: groups.length ? 'Outros links' : 'Explore os links', items: uncategorized });
  return `<div class="public-page links-page" style="--public-accent:${accent(settings.accent)}"><a class="public-skip-link" href="#conteudo">Pular para o conteúdo</a>
    ${preview ? previewNotice('/links') : ''}
    <div class="links-shell"><header class="links-topbar"><a href="/">${icon('arrow-left', 17)} Início</a><span>PÁGINA DE LINKS</span><a href="#links-content" aria-label="Ir para os links">${icon('arrow-right', 17)}</a></header><main id="conteudo"><div class="links-profile"><div class="links-profile-mark">${brand(settings, true)}</div><p class="links-profile-kicker">${esc(settings.tagline || 'Caixa Preta')}</p><h1>${esc(settings.name || 'Caixa Preta')}<span>↗</span></h1>${settings.description ? `<p class="links-profile-description">${esc(settings.description)}</p>` : ''}<span class="links-demo-notice"><span class="public-status-dot"></span>Demonstração · identidade em avaliação</span></div>
      <div id="links-content" class="links-content">${featuredBlock(featured, preview, true)}${groups.length > 1 ? `<nav class="links-category-nav" aria-label="Categorias de links">${groups.map((group, i) => `<a href="#links-category-${i}">${esc(group.title)}</a>`).join('')}${upcoming.length ? '<a href="#links-eventos">Eventos</a>' : ''}</nav>` : ''}${groups.map((group, i) => `<section class="links-group" id="links-category-${i}" aria-labelledby="links-title-${i}"><div class="links-section-heading"><h2 id="links-title-${i}">${esc(group.title)}</h2><span>${String(group.items.length).padStart(2, '0')}</span></div><div class="links-cards">${group.items.map(item => linkCard(item, preview)).join('')}</div></section>`).join('')}${!links.length ? empty('Novos links em breve.', 'Assim que houver links publicados, você vai encontrá-los aqui.') : ''}
      ${upcoming.length ? `<section class="links-group" id="links-eventos" aria-labelledby="links-eventos-title"><div class="links-section-heading"><h2 id="links-eventos-title">Na agenda</h2>${icon('calendar', 17)}</div><div class="links-event-list">${upcoming.map(event => linksEventCard(event, preview)).join('')}</div></section>` : ''}
      ${past.length ? `<section class="links-group" aria-labelledby="links-arquivo-title"><div class="links-section-heading"><h2 id="links-arquivo-title">Já aconteceu</h2><span>ARQUIVO</span></div><div class="links-event-list">${past.map(event => linksEventCard(event, preview, true)).join('')}</div></section>` : ''}
      <section class="links-contact" aria-labelledby="links-contact-title"><h2 id="links-contact-title">Continue por perto.</h2>${contacts(settings)}</section></div>
    </main><footer class="links-footer"><a href="/">Conheça a Caixa Preta ${icon('arrow-up-right', 15)}</a><p>Protótipo demonstrativo<br>Conteúdo e identidade sujeitos a avaliação.</p><span class="links-footer-asterisk" aria-hidden="true">✳</span></footer></div></div>`;
}

function accent(value) {
  return /^#[\da-f]{6}$/i.test(value || '') ? value : '#f2e600';
}

function bindImageFallbacks(root) {
  root.querySelectorAll('img').forEach(image => image.addEventListener('error', () => {
    if (image.classList.contains('brand-custom')) {
      const symbol = document.createElement('span');
      symbol.className = 'brand-symbol';
      symbol.setAttribute('aria-hidden', 'true');
      image.replaceWith(symbol);
    } else if (image.classList.contains('links-card-image')) {
      const placeholder = document.createElement('span');
      placeholder.className = 'links-card-icon';
      placeholder.innerHTML = icon('link', 21);
      image.replaceWith(placeholder);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'public-artwork-fallback';
      placeholder.innerHTML = `<span>${icon('music', 35)}</span><strong>${esc(image.alt || 'Caixa Preta')}</strong>`;
      image.replaceWith(placeholder);
    }
  }, { once: true }));
}

export function renderPublic(root, state, route) {
  const previousListener = listeners.get(root);
  if (previousListener) {
    root.removeEventListener('click', previousListener);
    root.removeEventListener('auxclick', previousListener);
  }
  const preview = new URLSearchParams(window.location.search).get('preview') === '1';
  root.innerHTML = appMarkup(route === '/links' ? linksPage(state, new Date(), preview) : landing(state, new Date(), preview));
  bindImageFallbacks(root);
  document.title = `${route === '/links' ? 'Links' : 'Cultura em movimento'} — ${state.settings.name || 'Caixa Preta'}`;
  if (!preview) {
    const onClick = event => {
      if (event.defaultPrevented || (event.type === 'click' && event.button !== 0) || (event.type === 'auxclick' && event.button !== 1)) return;
      const anchor = event.target.closest?.('a[data-track-kind][data-track-id]');
      if (anchor && root.contains(anchor)) recordClick(anchor.dataset.trackKind, anchor.dataset.trackId);
    };
    root.addEventListener('click', onClick);
    root.addEventListener('auxclick', onClick);
    listeners.set(root, onClick);
  } else listeners.delete(root);
}
