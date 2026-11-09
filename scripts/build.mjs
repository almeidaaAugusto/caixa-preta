import { cp, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
for(const name of await readdir(path.join(root,'src')))if(name.endsWith('.js'))execFileSync(process.execPath,['--check',path.join(root,'src',name)],{stdio:'inherit'});
const output=path.join(root,'dist');await mkdir(output,{recursive:true});
for(const name of ['src','styles','assets'])await cp(path.join(root,name),path.join(output,name),{recursive:true});
const html=await readFile(path.join(root,'index.html'));
await writeFile(path.join(output,'index.html'),html);
for(const route of ['links','admin']){await mkdir(path.join(output,route),{recursive:true});await writeFile(path.join(output,route,'index.html'),html);}
await writeFile(path.join(output,'_redirects'),'/links /index.html 200\n/admin /index.html 200\n');
console.log('Build concluído: dist/ com entradas para /, /links e /admin.');
