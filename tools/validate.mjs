// Static checks for build/ (Bedrock packs) and java/src/generated/resources
// (Java resources). The dedicated server test checks the behavior pack in a real
// game; this mostly covers what only clients load: textures, models, names.
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { NS } from '../src/lib/constants.mjs';

const BP = 'build/behavior_pack';
const RP = 'build/resource_pack';
const JR = `java/src/generated/resources/assets/${NS}`;
const JD = `java/src/generated/resources/data/${NS}`;
const errors = [];
const err = (msg) => errors.push(msg);

async function files(dir, ext) {
  const out = [];
  async function walk(d) {
    let names;
    try { names = await readdir(d); } catch { return; }
    for (const n of names) {
      const p = join(d, n);
      if ((await stat(p)).isDirectory()) await walk(p);
      else if (!ext || n.endsWith(ext)) out.push(p);
    }
  }
  await walk(dir);
  return out;
}

async function json(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (e) {
    err(`${path}: invalid JSON (${e.message})`);
    return null;
  }
}

const exists = (p) => stat(p).then(() => true, () => false);
const langFile = async (p) => new Map((await readFile(p, 'utf8')).split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));

// ------------------------------------------------------------ Bedrock

for (const f of [...await files(BP, '.json'), ...await files(RP, '.json')]) await json(f);

const geometries = new Set();
for (const f of await files(join(RP, 'models'), '.json')) {
  for (const g of (await json(f))?.['minecraft:geometry'] ?? []) geometries.add(g.description.identifier);
}
const terrain = (await json(join(RP, 'textures', 'terrain_texture.json'))).texture_data;
const itemTextures = (await json(join(RP, 'textures', 'item_texture.json'))).texture_data;
for (const [k, v] of Object.entries({ ...terrain, ...itemTextures })) {
  if (!(await exists(join(RP, `${v.textures}.png`)))) err(`texture ${k}: missing ${v.textures}.png`);
}
const en = await langFile(join(RP, 'texts', 'en_US.lang'));
const da = await langFile(join(RP, 'texts', 'da_DK.lang'));
for (const k of en.keys()) if (!da.has(k)) err(`da_DK.lang is missing ${k}`);
for (const k of da.keys()) if (!en.has(k)) err(`en_US.lang is missing ${k}`);

function checkComponents(where, c) {
  const geo = c['minecraft:geometry'];
  const id = typeof geo === 'string' ? geo : geo?.identifier;
  if (id && !id.startsWith('minecraft:') && !geometries.has(id)) err(`${where}: unknown geometry ${id}`);
  for (const [k, m] of Object.entries(c['minecraft:material_instances'] ?? {})) {
    if (m.texture && !terrain[m.texture]) err(`${where}: material ${k} uses unknown texture ${m.texture}`);
  }
}

const blockIds = new Set();
for (const f of await files(join(BP, 'blocks'), '.json')) {
  const b = (await json(f))['minecraft:block'];
  const id = b.description.identifier;
  blockIds.add(id);
  checkComponents(id, b.components);
  for (const p of b.permutations ?? []) checkComponents(`${id} (${p.condition})`, p.components);
  const name = b.components['minecraft:display_name'];
  if (name && !en.has(name)) err(`${id}: no name (${name})`);
}

const itemIds = new Set();
for (const f of await files(join(BP, 'items'), '.json')) {
  const it = (await json(f))['minecraft:item'];
  itemIds.add(it.description.identifier);
  const icon = it.components['minecraft:icon'];
  if (!itemTextures[icon]) err(`${it.description.identifier}: unknown icon ${icon}`);
  if (!en.has(it.components['minecraft:display_name'].value)) err(`${it.description.identifier}: no name`);
}

for (const f of await files(join(RP, 'entity'), '.json')) {
  const d = (await json(f))['minecraft:client_entity'].description;
  for (const t of Object.values(d.textures)) if (!(await exists(join(RP, `${t}.png`)))) err(`${d.identifier}: missing texture ${t}`);
  for (const g of Object.values(d.geometry)) if (!geometries.has(g)) err(`${d.identifier}: unknown geometry ${g}`);
  if (!en.has(`entity.${d.identifier}.name`)) err(`${d.identifier}: no name`);
}

for (const f of await files(join(BP, 'recipes'), '.json')) {
  const body = Object.values(await json(f)).find((v) => typeof v === 'object');
  const refs = [body.result?.item, ...Object.values(body.key ?? {}).map((k) => k.item), ...(body.ingredients ?? []).map((i) => i.item)];
  for (const r of refs) if (r?.startsWith(`${NS}:`) && !itemIds.has(r) && !blockIds.has(r)) err(`${f}: unknown ${r}`);
}

// Every message key the scripts use must be translated.
for (const f of await files(join(BP, 'scripts'), '.js')) {
  const src = await readFile(f, 'utf8');
  for (const m of src.matchAll(/tell\(\w+, '([\w.]+)'/g)) if (!en.has(`${NS}.${m[1]}`)) err(`${f}: no text for ${NS}.${m[1]}`);
  for (const m of src.matchAll(/translate: `\$\{NS\}\.([\w.]+)`/g)) if (!en.has(`${NS}.${m[1]}`)) err(`${f}: no text for ${NS}.${m[1]}`);
}

for (const f of await files(join(RP, 'textures', 'blocks'), '.png')) {
  const png = PNG.sync.read(await readFile(f));
  if (png.width < 16 || png.height % png.width !== 0) err(`${f}: unexpected size ${png.width}x${png.height}`);
}

// ------------------------------------------------------------ Java

const jEn = await json(join(JR, 'lang', 'en_us.json'));
const jDa = await json(join(JR, 'lang', 'da_dk.json'));
for (const k of Object.keys(jEn)) if (!(k in jDa)) err(`da_dk.json is missing ${k}`);

async function javaTexture(ref, where) {
  const [ns, path] = ref.includes(':') ? ref.split(':') : ['minecraft', ref];
  if (ns !== NS) return;
  if (!(await exists(join(JR, 'textures', `${path}.png`)))) err(`${where}: missing texture ${ref}`);
}

async function javaModel(ref, where) {
  const [ns, path] = ref.split(':');
  if (ns !== NS) return;
  const file = join(JR, 'models', `${path}.json`);
  const m = await json(file);
  if (!m) return err(`${where}: missing model ${ref}`);
  for (const t of Object.values(m.textures ?? {})) if (!t.startsWith('#')) await javaTexture(t, file);
  if (m.parent) await javaModel(m.parent, file);
}

for (const f of await files(join(JR, 'blockstates'), '.json')) {
  const s = await json(f);
  const models = [...Object.values(s.variants ?? {}), ...(s.multipart ?? []).map((p) => p.apply)].flat().map((v) => v.model);
  for (const m of new Set(models)) await javaModel(m, f);
}
for (const f of await files(join(JR, 'items'), '.json')) await javaModel((await json(f)).model.model, f);

for (const f of await files('java/src', '.java')) {
  const src = await readFile(f, 'utf8');
  for (const m of src.matchAll(/translatable\("([\w.]+)"/g)) {
    const key = m[1];
    if (key.endsWith('.')) continue;
    if (!(key in jEn)) err(`${f}: no text for ${key}`);
  }
}
for (const f of await files(join(JD, 'recipe'), '.json')) await json(f);

if (errors.length) {
  console.error(errors.map((e) => `  ${e}`).join('\n'));
  console.error(`\n${errors.length} problem(s)`);
  process.exit(1);
}
console.log(`OK: ${blockIds.size} blocks, ${itemIds.size} items, ${en.size} texts in each language (Bedrock and Java)`);
