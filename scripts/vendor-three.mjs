import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'node_modules/three');
const destination = path.join(root, 'assets/vendor/three');
const { version } = JSON.parse(await readFile(path.join(source, 'package.json'), 'utf8'));
if (version !== '0.180.0') throw new Error(`Esperado Three.js 0.180.0; encontrado ${version}.`);

await mkdir(destination, { recursive: true });
for (const [from, to] of [
  ['build/three.module.min.js', 'three.module.min.js'],
  ['build/three.core.min.js', 'three.core.min.js'],
  ['examples/jsm/geometries/RoundedBoxGeometry.js', 'RoundedBoxGeometry.js'],
  ['LICENSE', 'LICENSE'],
]) {
  await copyFile(path.join(source, from), path.join(destination, to));
}
console.log(`Three.js ${version}: módulos ESM, RoundedBoxGeometry e licença MIT copiados para assets/vendor/three.`);
