// Renders every block geometry and entity model into build/preview/ (two views
// each), plus a contact sheet of everything: build/preview/sheet.png.
// Usage: npm run preview [id ...]
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from './build.mjs';
import { blockAtlas, render, sheet } from './render.mjs';
import { TEXTURES } from '../src/blocks.mjs';

const RP = 'build/resource_pack';
const OUT = 'build/preview';
const only = process.argv.slice(2);

const { models } = await build({ quiet: true });
await mkdir(OUT, { recursive: true });

const views = [];
const files = (await readdir(join(RP, 'models', 'blocks'))).sort();
for (const file of files) {
  const geoFile = JSON.parse(await readFile(join(RP, 'models', 'blocks', file), 'utf8'));
  for (const geo of geoFile['minecraft:geometry']) {
    const id = geo.description.identifier.split('.').pop();
    if (only.length && !only.some((o) => id.startsWith(o))) continue;
    let pair;
    if (geo.bones.some((b) => Array.isArray(b.cubes?.[0]?.uv))) {
      pair = { geometry: { format_version: '1.12.0', 'minecraft:geometry': [geo] }, texture: models[id]?.texture ?? models.searchlight.texture };
    } else {
      pair = blockAtlas(geo, (name) => TEXTURES[name].png);
    }
    const a = render(pair.geometry, pair.texture, { yaw: 35, size: 128 });
    const b = render(pair.geometry, pair.texture, { yaw: 215, size: 128 });
    await writeFile(join(OUT, `${id}.png`), sheet([a, b], { cols: 2, cell: 128 }));
    views.push(a);
  }
}
for (const id of ['security_camera', 'security_guard', 'criminal', 'guard_dog']) {
  if (only.length && !only.includes(id)) continue;
  const hidden = new Set(id === 'security_camera' ? ['ceiling_mount'] : []);
  // Front and back of the default texture, then the front of each variant.
  const textures = [models[id].texture, ...models[id].variants.map(([, png]) => png)];
  const shots = [render(models[id].geometry, textures[0], { yaw: 35, size: 128, hidden }), render(models[id].geometry, textures[0], { yaw: 215, size: 128, hidden })];
  for (const png of textures.slice(1)) shots.push(render(models[id].geometry, png, { yaw: 35, size: 128, hidden }));
  await writeFile(join(OUT, `${id}.png`), sheet(shots, { cols: shots.length, cell: 128 }));
  views.push(...shots.filter((_, i) => i !== 1));
}
await writeFile(join(OUT, 'sheet.png'), sheet(views, { cols: 6, cell: 128 }));
console.log(`Wrote ${views.length} previews to ${OUT}/`);
