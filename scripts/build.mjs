import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { normalizeBase, appPath, appMarkup } from '../src/paths.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

export function configuredBase(args = process.argv.slice(2), environment = process.env) {
  const index = args.indexOf('--base');
  if (index !== -1 && (!args[index + 1] || args[index + 1].startsWith('--'))) throw new Error('Informe o caminho após --base.');
  return normalizeBase(index !== -1 ? args[index + 1] : args.find(value => value.startsWith('--base='))?.slice(7) ?? environment.APP_BASE_PATH ?? '/');
}

export function buildHtml(source, base) {
  return appMarkup(source, base).replace(/(<script\s+type="importmap">)([\s\S]*?)(<\/script>)/g, (_match, start, content, end) => {
    const map = JSON.parse(content);
    map.imports = Object.fromEntries(Object.entries(map.imports || {}).map(([name, value]) => [name, appPath(value, base)]));
    return `${start}${JSON.stringify(map)}${end}`;
  });
}

export function buildCss(source, base) {
  return source.replace(/url\(\s*(["']?)(\/(?!\/)[^)"']*)\1\s*\)/gi, (_match, quote, value) => `url(${quote}${appPath(value.trim(), base)}${quote})`);
}

export async function build({ base = '/', output = path.join(root, 'dist') } = {}) {
  base = normalizeBase(base);
  for(const name of await readdir(path.join(root,'src')))if(name.endsWith('.js'))execFileSync(process.execPath,['--check',path.join(root,'src',name)],{stdio:'inherit'});
  await mkdir(output,{recursive:true});
  for(const name of ['src','styles','assets'])await cp(path.join(root,name),path.join(output,name),{recursive:true});
  const html=buildHtml(await readFile(path.join(root,'index.html'),'utf8'),base);
  await writeFile(path.join(output,'index.html'),html);
  for(const route of ['links','admin']){await mkdir(path.join(output,route),{recursive:true});await writeFile(path.join(output,route,'index.html'),html);}
  for(const name of await readdir(path.join(output,'styles')))if(name.endsWith('.css')){
    const filename=path.join(output,'styles',name);
    await writeFile(filename,buildCss(await readFile(filename,'utf8'),base));
  }
  await writeFile(path.join(output,'_redirects'),`${base}links ${base}index.html 200\n${base}admin ${base}index.html 200\n`);
  console.log(`Build concluído: ${output} (base ${base}).`);
}

if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await build({base:configuredBase()});
