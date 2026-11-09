import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, stat, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { normalizeBase, baseFromModule, appPath, routePath, appMarkup } from '../src/paths.js';
import { build, configuredBase } from '../scripts/build.mjs';
import { safeImage } from '../src/ui.js';

const base = '/caixa-preta/';

test('prefixo deriva do modulo HTTP e nao de caminhos locais Windows', () => {
  assert.equal(baseFromModule('https://almeidaaAugusto.github.io/caixa-preta/src/paths.js'), base);
  assert.equal(baseFromModule('https://example.test/src/paths.js'), '/');
  assert.equal(baseFromModule('file:///C:/Users/Augusto/projeto/src/paths.js'), '/');
  assert.equal(normalizeBase('caixa-preta'), base);
  for (const invalid of ['https://evil.test/', '//evil.test/', '/a/../b/', '/a//b/', '/a/?x=1']) assert.throws(() => normalizeBase(invalid));
});

test('destinos internos preservam query, ancora e prefixo sem duplicacao', () => {
  assert.equal(appPath('/links?preview=1#destaque', base), '/caixa-preta/links?preview=1#destaque');
  assert.equal(appPath('/#agenda', base), '/caixa-preta/#agenda');
  assert.equal(appPath('/assets/sessions.svg', base), '/caixa-preta/assets/sessions.svg');
  assert.equal(appPath('/caixa-preta/assets/sessions.svg', base), '/caixa-preta/assets/sessions.svg');
  assert.equal(appPath('/caixa-preta-extra/links', base), '/caixa-preta/caixa-preta-extra/links');
  assert.equal(appPath('/links', '/'), '/links');
  for (const unchanged of ['#agenda', '?tab=links', 'https://example.test/x', 'http://example.test/', 'mailto:a@example.test', 'tel:+5511999999999', 'data:image/png;base64,AAAA', '//example.test/x']) assert.equal(appPath(unchanged, base), unchanged);
});

test('build aceita base do workflow com ou sem barra final e variavel de ambiente', () => {
  assert.equal(configuredBase(['--base', '/caixa-preta'], {}), base);
  assert.equal(configuredBase(['--base', '/caixa-preta/'], {}), base);
  assert.equal(configuredBase(['--base=/caixa-preta/'], {}), base);
  assert.equal(configuredBase([], { APP_BASE_PATH: '/caixa-preta' }), base);
  assert.equal(configuredBase([], {}), '/');
  assert.throws(() => configuredBase(['--base'], {}));
});

test('imagens salvas antigas, prefixadas e logo 3D usam a base sem alterar o valor original', () => {
  const record = { image: '/assets/sessions.svg', logo: '/assets/perfil-referencia.jpeg', url: '/#agenda' };
  const original = structuredClone(record);
  assert.equal(safeImage(record.image, base), '/caixa-preta/assets/sessions.svg');
  assert.equal(safeImage(safeImage(record.logo, base), base), '/caixa-preta/assets/perfil-referencia.jpeg');
  assert.equal(appPath(record.url, base), '/caixa-preta/#agenda');
  assert.deepEqual(record, original);
  for (const image of ['https://example.test/photo.jpg', 'data:image/png;base64,AAAA']) assert.equal(safeImage(image, base), image);
  for (const image of ['javascript:alert(1)', '//example.test/photo.jpg', '/other/private.jpg']) assert.equal(safeImage(image, base), '');
});

test('rotas de diretorio do Pages e index explicito chegam ao mesmo modulo', () => {
  for (const pathname of ['/caixa-preta', '/caixa-preta/', '/caixa-preta/index.html']) assert.equal(routePath(pathname, base), '/');
  for (const pathname of ['/caixa-preta/links', '/caixa-preta/links/', '/caixa-preta/links/index.html']) assert.equal(routePath(pathname, base), '/links');
  assert.equal(routePath('/caixa-preta/admin/', base), '/admin');
  assert.equal(routePath('/caixa-preta-extra/links', base), null);
  assert.equal(routePath('/admin', base), null);
  assert.equal(routePath('/links/', '/'), '/links');
});

test('markup adapta navegacao e imagens sem reescrever campos salvos ou externos', () => {
  const markup = '<a href="/links?preview=1&amp;x=2">Prévia</a><img src="/assets/sessions.svg"><input value="/links"><a href="https://example.test/links">Externo</a><a href="#agenda">Agenda</a><span data-href="/links"></span>';
  const resolved = appMarkup(markup, base);
  assert.ok(resolved.includes('href="/caixa-preta/links?preview=1&amp;x=2"'));
  assert.ok(resolved.includes('src="/caixa-preta/assets/sessions.svg"'));
  assert.ok(resolved.includes('value="/links"'));
  assert.ok(resolved.includes('data-href="/links"'));
  assert.ok(resolved.includes('href="https://example.test/links"'));
  assert.ok(resolved.includes('href="#agenda"'));
  assert.equal(appMarkup(resolved, base), resolved);
});

test('build de raiz e subpasta gera entradas, CSS e importmap com arquivos existentes', async t => {
  const temporary = await mkdtemp(path.join(tmpdir(), 'caixa-preta-pages-'));
  t.after(async () => {
    assert.equal(path.dirname(temporary), path.resolve(tmpdir()));
    await rm(temporary, { recursive: true, force: true });
  });
  for (const prefix of ['/', base]) {
    const output = path.join(temporary, prefix === '/' ? 'root' : 'pages');
    await build({ base: prefix, output });
    const html = await readFile(path.join(output, 'index.html'), 'utf8');
    assert.equal(await readFile(path.join(output, 'links/index.html'), 'utf8'), html);
    assert.equal(await readFile(path.join(output, 'admin/index.html'), 'utf8'), html);
    for (const [, resource] of html.matchAll(/(?:href|src)="(\/[^"#]+)"/g)) {
      assert.ok(resource.startsWith(prefix), resource);
      assert.ok((await stat(path.join(output, resource.slice(prefix.length)))).isFile(), resource);
    }
    const imports = JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
    assert.equal(imports.three, `${prefix}assets/vendor/three/three.module.min.js`);
    assert.ok((await stat(path.join(output, imports.three.slice(prefix.length)))).isFile());
    let localCssImages = 0;
    for (const filename of await readdir(path.join(output, 'styles'))) {
      const css = await readFile(path.join(output, 'styles', filename), 'utf8');
      for (const [, resource] of css.matchAll(/url\(["']?(\/[^)"']+)["']?\)/g)) {
        assert.ok(resource.startsWith(prefix), resource);
        assert.ok((await stat(path.join(output, resource.slice(prefix.length)))).isFile(), resource);
        localCssImages++;
      }
    }
    assert.ok(localCssImages >= 2, 'Logo e colagem devem existir no pacote.');
    assert.ok((await stat(path.join(output, 'assets/vendor/three/three.core.min.js'))).isFile());
    assert.match(await readFile(path.join(output, 'src/box-scene.js'), 'utf8'), /new URL\('\.\.\/assets\/perfil-referencia\.jpeg', import\.meta\.url\)/);
    const redirects = await readFile(path.join(output, '_redirects'), 'utf8');
    assert.ok(redirects.includes(`${prefix}links ${prefix}index.html 200`));
  }
});
