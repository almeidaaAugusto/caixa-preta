// Data stays independent of hosting. Resolve its internal URLs only when rendering.
export function normalizeBase(value = '/') {
  const input = String(value).trim();
  if (!input || input === '/') return '/';
  const segments = input.replace(/^\//, '').replace(/\/$/, '').split('/');
  if (input.startsWith('//') || segments.some(segment => !/^[a-z\d._~-]+$/i.test(segment) || segment === '.' || segment === '..')) {
    throw new Error('Informe uma base válida, como / ou /caixa-preta/.');
  }
  return `/${segments.join('/')}/`;
}

export function baseFromModule(moduleUrl) {
  const url = new URL(moduleUrl);
  return ['http:', 'https:'].includes(url.protocol) ? normalizeBase(new URL('../', url).pathname) : '/';
}

export const BASE_PATH = baseFromModule(import.meta.url);

export function appPath(value, base = BASE_PATH) {
  const input = String(value ?? '');
  if (!input.startsWith('/') || input.startsWith('//')) return input;
  const prefix = normalizeBase(base);
  const pathname = input.split(/[?#]/, 1)[0];
  if (prefix === '/' || pathname === prefix.slice(0, -1) || pathname.startsWith(prefix)) return input;
  return `${prefix}${input.slice(1)}`;
}

export function routePath(value, base = BASE_PATH) {
  const pathname = String(value ?? '/').split(/[?#]/, 1)[0];
  const prefix = normalizeBase(base);
  let local;
  if (prefix === '/') local = pathname;
  else if (pathname === prefix.slice(0, -1)) local = '/';
  else if (pathname.startsWith(prefix)) local = `/${pathname.slice(prefix.length)}`;
  else return null;
  return local.replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
}

export function appMarkup(markup, base = BASE_PATH) {
  return String(markup).replace(/(\s(?:href|src)\s*=\s*)(["'])(\/(?!\/)[^"']*)\2/gi,
    (_match, attribute, quote, value) => `${attribute}${quote}${appPath(value, base)}${quote}`);
}
