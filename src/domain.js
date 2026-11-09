export function isValidDestination(value, allowEmpty = false) {
  const input = String(value ?? '').trim();
  if (!input) return allowEmpty;
  if (/[\u0000-\u001f\u007f\\]/.test(input)) return false;
  if (input.startsWith('//')) return false;
  if (input.startsWith('/') || input.startsWith('#')) return true;
  try {
    const url = new URL(input);
    if (url.username || url.password) return false;
    if (url.protocol === 'mailto:') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.pathname);
    if (url.protocol === 'tel:') return /^\+?[\d ()-]{7,20}$/.test(url.pathname);
    return /^https?:\/\//i.test(input) && ['https:', 'http:'].includes(url.protocol) && !!url.hostname;
  } catch { return false; }
}

export function statusOf(item, now = new Date()) {
  const time = +new Date(now);
  if (!item.active || item.draft) return 'rascunho';
  if (item.startAt && !Number.isFinite(+new Date(item.startAt))) return 'rascunho';
  if (item.endAt && !Number.isFinite(+new Date(item.endAt))) return 'rascunho';
  if (item.startAt && +new Date(item.startAt) > time) return 'agendado';
  if (item.endAt && +new Date(item.endAt) <= time) return 'encerrado';
  if (item.date && +new Date(item.date) < time) return 'encerrado';
  return 'publicado';
}

export const visibleLinks = (state, now = new Date()) => state.links.filter(link => statusOf(link, now) === 'publicado');

export function visibleEvents(state, placement = 'landing', now = new Date(), past = false) {
  return state.events.filter(event => {
    if (!event[placement === 'landing' ? 'onLanding' : 'onLinks'] || !event.active || event.draft) return false;
    if (!Number.isFinite(+new Date(event.date))) return false;
    if (event.startAt && +new Date(event.startAt) > +new Date(now)) return false;
    if (event.endAt && +new Date(event.endAt) <= +new Date(now)) return false;
    return past ? +new Date(event.date) < +new Date(now) : statusOf(event, now) === 'publicado';
  }).sort((a, b) => (past ? -1 : 1) * (new Date(a.date) - new Date(b.date)));
}

export function featuredItem(state, placement = 'landing', now = new Date()) {
  if (!state.featured) return null;
  const { kind, id } = state.featured;
  const item = (kind === 'link' ? visibleLinks(state, now) : visibleEvents(state, placement, now)).find(record => record.id === id);
  return item ? { kind, item } : null;
}

function scheduleErrors(item) {
  const errors = [];
  if (item.startAt && !Number.isFinite(+new Date(item.startAt))) errors.push('Informe um início da exibição válido.');
  if (item.endAt && !Number.isFinite(+new Date(item.endAt))) errors.push('Informe um fim da exibição válido.');
  if (item.startAt && item.endAt && new Date(item.startAt) >= new Date(item.endAt)) errors.push('O fim da exibição deve ser posterior ao início.');
  return errors;
}
export function validateLink(item) {
  const errors = scheduleErrors(item);
  if (!String(item.title ?? '').trim()) errors.push('Informe o título do link.');
  if (String(item.title ?? '').length > 120) errors.push('Use até 120 caracteres no título.');
  if (!isValidDestination(item.url)) errors.push('Informe um endereço válido: https://, http:// ou caminho interno.');
  return errors;
}
export function validateEvent(item) {
  const errors = scheduleErrors(item);
  if (!String(item.title ?? '').trim()) errors.push('Informe o título do evento.');
  if (!item.date || !Number.isFinite(+new Date(item.date))) errors.push('Informe uma data e um horário válidos.');
  if (!isValidDestination(item.url, true)) errors.push('Informe um endereço válido para ingressos ou deixe vazio.');
  return errors;
}

export function moveWithinCategory(links, id, direction) {
  const result = [...links];
  const index = result.findIndex(item => item.id === id);
  if (index < 0) return result;
  const step = direction < 0 ? -1 : 1;
  for (let target = index + step; target >= 0 && target < result.length; target += step) {
    if (result[target].categoryId === result[index].categoryId) {
      [result[index], result[target]] = [result[target], result[index]];
      break;
    }
  }
  return result;
}

export function formatDate(value, options = {}) {
  const date = new Date(value);
  if (!Number.isFinite(+date)) return 'Data a definir';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', ...options }).format(date);
}
export function dateParts(value) {
  const date = new Date(value);
  if (!Number.isFinite(+date)) return { day: '—', month: 'DATA', time: 'A definir' };
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
    time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}
