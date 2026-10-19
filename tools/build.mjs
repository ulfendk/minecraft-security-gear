// Generates the Bedrock behavior and resource packs into build/, and the Java
// edition's resources into java/src/generated/resources (see tools/java.mjs).
import { existsSync } from 'node:fs';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { animationFile } from '../src/lib/anim.mjs';
import { bedrockGeometry, cardinalPermutations, facingPermutations, geometryFile } from '../src/lib/blockmodel.mjs';
import { MIN_ENGINE, NS, PACK_NAME, SCRIPT_SERVER_VERSION, SCRIPT_UI_VERSION } from '../src/lib/constants.mjs';
import { buildGeometry } from '../src/lib/model.mjs';
import { paintTexture } from '../src/lib/texture.mjs';
import { packIcon } from '../src/icon.mjs';
import { blocks, TEXTURES } from '../src/blocks.mjs';
import { bedrockEntities } from '../src/entities.mjs';
import { BLOCK_ICONS, items, KEYCARD_LEVELS } from '../src/items.mjs';
import { langEntries, LOCALES } from '../src/lang.mjs';
import { ENTITY_MODELS } from '../src/models.mjs';
import { structureData } from '../src/structures.mjs';
import { buildJava } from './java.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'build');
const BP = join(OUT, 'behavior_pack');
const RP = join(OUT, 'resource_pack');

const UUID = {
  bpHeader: '6f1d3c8a-2b7e-4d59-9a61-0c4e8b2f7a13',
  bpData: 'a83b5e27-91c4-4f0d-b6e2-5d7f1a9c3e48',
  bpScript: 'd4e29a71-6c3b-4b8e-8f15-27a0c9e6b5d2',
  rpHeader: '1c9e7b42-5f8a-4e63-a2d0-8b6f3e1c7d95',
  rpResources: 'e7b25d18-3a9c-4f71-9e46-c0d8a2b5f163',
};

async function write(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data, null, 2) + '\n');
}

function manifests(version) {
  const v = version.split('.').map(Number);
  const meta = { authors: ['Security Gear contributors'], license: 'MIT' };
  const bp = {
    format_version: 2,
    header: { name: `${PACK_NAME} v${version} (Behavior)`, description: 'pack.description', uuid: UUID.bpHeader, version: v, min_engine_version: MIN_ENGINE },
    modules: [
      { type: 'data', uuid: UUID.bpData, version: v },
      { type: 'script', language: 'javascript', uuid: UUID.bpScript, version: v, entry: 'scripts/main.js' },
    ],
    dependencies: [
      { uuid: UUID.rpHeader, version: v },
      { module_name: '@minecraft/server', version: SCRIPT_SERVER_VERSION },
      { module_name: '@minecraft/server-ui', version: SCRIPT_UI_VERSION },
    ],
    metadata: meta,
  };
  const rp = {
    format_version: 2,
    header: { name: `${PACK_NAME} v${version} (Resources)`, description: 'pack.description', uuid: UUID.rpHeader, version: v, min_engine_version: MIN_ENGINE },
    modules: [{ type: 'resources', uuid: UUID.rpResources, version: v }],
    dependencies: [{ uuid: UUID.bpHeader, version: v }],
    metadata: meta,
  };
  return { bp, rp };
}

// ---------------------------------------------------------------- Bedrock blocks

const DIRS = ['north', 'east', 'south', 'west'];

/** Replace texture names in a material_instances object. */
function swapTextures(mats, swaps) {
  const out = structuredClone(mats);
  for (const [from, to] of Object.entries(swaps)) {
    for (const m of Object.values(out)) if (m.texture === `${NS}_${from}`) m.texture = `${NS}_${to}`;
  }
  return out;
}

function bedrockBlock(spec, geometries, extraTextures) {
  const b = spec.bedrock;
  const states = { ...(b.states ?? {}) };
  const powered = !!(b.poweredTexture || b.poweredLight || b.components[`${NS}:output`] || b.components[`${NS}:winch`] || b.components[`${NS}:searchlight`]);
  if (powered) states[`${NS}:powered`] = [false, true];
  if (b.door) states[`${NS}:open`] = [false, true];

  const traits = {};
  if (b.cardinal || b.door) traits['minecraft:placement_direction'] = { enabled_states: ['minecraft:cardinal_direction'], y_rotation_offset: 180 };
  if (b.facing) traits['minecraft:placement_position'] = { enabled_states: ['minecraft:block_face'] };

  const components = { ...b.components };
  if (b.geometry) components['minecraft:geometry'] = b.geometry;
  else if (b.connects) components['minecraft:geometry'] = { identifier: `geometry.${NS}.${spec.id}`, bone_visibility: Object.fromEntries(DIRS.map((d) => [d, false])) };
  else components['minecraft:geometry'] = `geometry.${NS}.${b.door ? 'cell_door' : spec.id}`;
  if (b.entityModel) components['minecraft:material_instances'] = { '*': { texture: `${NS}_${spec.id}_model`, render_method: 'alpha_test' } };
  components['minecraft:display_name'] = `tile.${NS}:${spec.id}.name`;
  if (b.connects) components['minecraft:collision_box'] = components['minecraft:collision_box'] ?? { origin: [-8, 0, -8], size: [16, spec.id === 'prison_wall' ? 24 : 16, 16] };

  const permutations = [];
  if (b.cardinal || b.door) permutations.push(...cardinalPermutations());
  if (b.facing) permutations.push(...facingPermutations());
  const mats = components['minecraft:material_instances'];
  const when = (cond, comps) => permutations.push({ condition: cond, components: comps });
  const st = (n) => `q.block_state('${NS}:${n}')`;
  if (b.connects) {
    // One permutation per combination of connected sides (Molang in bone_visibility can't read custom states).
    for (let m = 1; m < 16; m++) {
      const sides = DIRS.map((d, i) => [d, !!(m & (1 << i))]);
      when(sides.map(([d, on]) => `${on ? '' : '!'}${st(d)}`).join(' && '), {
        'minecraft:geometry': { identifier: `geometry.${NS}.${spec.id}`, bone_visibility: Object.fromEntries(sides) },
      });
    }
  }
  if (b.poweredTexture) when(st('powered'), { 'minecraft:material_instances': swapTextures(mats, b.poweredTexture) });
  if (b.poweredLight) when(st('powered'), { 'minecraft:light_emission': b.poweredLight });
  if (b.components[`${NS}:output`]) when(st('powered'), { 'minecraft:redstone_producer': { power: 15 } });
  if (b.entityModel) when(st('powered'), { 'minecraft:material_instances': { '*': { texture: `${NS}_${spec.id}_model_lit`, render_method: 'alpha_test' } }, 'minecraft:light_emission': 15 });
  if (b.armedTexture) when(st('armed'), { 'minecraft:material_instances': swapTextures(mats, b.armedTexture) });
  if (b.levelTextures) {
    for (const l of [1, 2, 3])
      for (const p of [false, true]) {
        const tex = `reader_front_${l}${p ? '_on' : ''}`;
        when(`${st('level')} == ${l} && ${p ? '' : '!'}${st('powered')}`, { 'minecraft:material_instances': swapTextures(mats, { reader_front_1: tex }) });
      }
  }
  if (b.openGeometry) {
    when(st('open'), { 'minecraft:geometry': `geometry.${NS}.${spec.id}_open`, 'minecraft:collision_box': false });
  }
  if (b.door) {
    when(st('open'), {
      'minecraft:geometry': `geometry.${NS}.cell_door_open`,
      'minecraft:collision_box': { origin: [-8, 0, -8], size: [3, 16, 16] },
      'minecraft:selection_box': { origin: [-8, 0, -8], size: [3, 16, 16] },
    });
    when(`!${st('open')}`, {
      'minecraft:collision_box': { origin: [-8, 0, 5], size: [16, 16, 3] },
      'minecraft:selection_box': { origin: [-8, 0, 5], size: [16, 16, 3] },
    });
  }

  const def = {
    format_version: '1.21.130',
    'minecraft:block': {
      description: {
        identifier: `${NS}:${spec.id}`,
        menu_category: { category: b.menu ?? 'construction' },
        ...(Object.keys(states).length ? { states } : {}),
        ...(Object.keys(traits).length ? { traits } : {}),
      },
      components,
      ...(permutations.length ? { permutations } : {}),
    },
  };
  return def;
}

/** The cell door's upper half: same rules, top textures, no item. */
function doorUpper(lower) {
  const def = structuredClone(lower);
  const blk = def['minecraft:block'];
  blk.description.identifier = `${NS}:cell_door_upper`;
  blk.description.menu_category = { category: 'none', is_hidden_in_commands: false };
  blk.components['minecraft:geometry'] = `geometry.${NS}.cell_door_top`;
  blk.components['minecraft:display_name'] = `tile.${NS}:cell_door_upper.name`;
  blk.components['minecraft:loot'] = 'loot_tables/empty.json';
  for (const p of blk.permutations) if (p.components['minecraft:geometry']) p.components['minecraft:geometry'] = `geometry.${NS}.cell_door_top_open`;
  return def;
}

// ---------------------------------------------------------------- build

export async function build({ quiet = false } = {}) {
  const pkg = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8'));
  await rm(BP, { recursive: true, force: true });
  await rm(RP, { recursive: true, force: true });
  // Hand-written pack files (the scripts); generated files are added below.
  for (const [from, to] of [['behavior_pack', BP], ['resource_pack', RP]]) {
    const dir = join(ROOT, 'src', 'packs', from);
    if (existsSync(dir)) await cp(dir, to, { recursive: true });
  }

  const { bp, rp } = manifests(pkg.version);
  await write(join(BP, 'manifest.json'), bp);
  await write(join(RP, 'manifest.json'), rp);
  const icon = packIcon();
  await write(join(BP, 'pack_icon.png'), icon);
  await write(join(RP, 'pack_icon.png'), icon);

  // Box-UV models (camera, searchlight, guard, dog): geometry + painted textures.
  const models = {};
  for (const m of ENTITY_MODELS) {
    const g = buildGeometry(`geometry.${NS}.${m.id}`, m.model);
    models[m.id] = { geometry: g.geometry, texture: paintTexture(g, m.materials), anims: m.anims ? animationFile(m.id, m.anims) : null };
    if (m.litMaterials) models[m.id].litTexture = paintTexture(g, { ...m.materials, ...m.litMaterials });
    models[m.id].variants = (m.variants ?? []).filter((v) => v.texture).map((v) => [v.texture, paintTexture(g, v.materials)]);
  }

  // Entities
  const ent = bedrockEntities();
  for (const [p, body] of Object.entries(ent.bp)) await write(join(BP, p), body);
  for (const [p, body] of Object.entries(ent.rp)) await write(join(RP, p), body);
  for (const id of ['security_guard', 'guard_dog', 'security_camera']) {
    const m = models[id];
    await write(join(RP, 'models', 'entity', `${id}.geo.json`), m.geometry);
    await write(join(RP, 'textures', 'entity', NS, `${id}.png`), m.texture);
    for (const [suffix, png] of m.variants) await write(join(RP, 'textures', 'entity', NS, `${id}_${suffix}.png`), png);
    if (m.anims) await write(join(RP, 'animations', `${id}.animation.json`), m.anims);
  }

  // Block textures
  const terrain = {};
  for (const [name, { png }] of Object.entries(TEXTURES)) {
    await write(join(RP, 'textures', 'blocks', NS, `${name}.png`), png);
    terrain[`${NS}_${name}`] = { textures: `textures/blocks/${NS}/${name}` };
  }
  // Searchlight: a block with box-UV geometry and its own (lit) texture.
  await write(join(RP, 'textures', 'blocks', NS, 'searchlight_model.png'), models.searchlight.texture);
  await write(join(RP, 'textures', 'blocks', NS, 'searchlight_model_lit.png'), models.searchlight.litTexture);
  terrain[`${NS}_searchlight_model`] = { textures: `textures/blocks/${NS}/searchlight_model` };
  terrain[`${NS}_searchlight_model_lit`] = { textures: `textures/blocks/${NS}/searchlight_model_lit` };
  await write(join(RP, 'textures', 'terrain_texture.json'), { resource_pack_name: NS, texture_name: 'atlas.terrain', padding: 8, num_mip_levels: 4, texture_data: terrain });
  await write(join(RP, 'textures', 'flipbook_textures.json'), Object.entries(TEXTURES).filter(([, t]) => t.animation).map(([name, t]) => ({
    flipbook_texture: `textures/blocks/${NS}/${name}`, atlas_tile: `${NS}_${name}`, ticks_per_frame: t.animation.frametime,
  })));

  // Blocks
  const blockSounds = { format_version: [1, 1, 0] };
  const recipes = [];
  for (const spec of blocks) {
    if (spec.recipe) recipes.push(spec.recipe);
    const b = spec.bedrock;
    if (!b) continue;
    const geos = [];
    if (b.model) {
      const g = bedrockGeometry(`geometry.${NS}.${spec.id}`, b.model);
      geos.push(g);
    }
    if (b.geometries) geos.push(...b.geometries);
    if (b.entityModel) {
      const g = structuredClone(models[b.entityModel].geometry['minecraft:geometry'][0]);
      g.description.identifier = `geometry.${NS}.${spec.id}`;
      geos.push(g);
    }
    if (geos.length) await write(join(RP, 'models', 'blocks', `${spec.id}.geo.json`), geometryFile(geos));
    const def = bedrockBlock(spec, geos);
    await write(join(BP, 'blocks', `${spec.id}.json`), def);
    blockSounds[`${NS}:${spec.id}`] = { sound: spec.sound ?? 'stone' };
    if (b.door) {
      await write(join(BP, 'blocks', 'cell_door_upper.json'), doorUpper(def));
      blockSounds[`${NS}:cell_door_upper`] = { sound: spec.sound };
    }
  }
  await write(join(RP, 'blocks.json'), blockSounds);
  await write(join(BP, 'loot_tables', 'empty.json'), { pools: [] });

  // Items
  const itemTextures = {};
  const bedrockItems = [...items, { id: 'security_camera', icon: BLOCK_ICONS.security_camera, stack: 16, placesCamera: true }];
  for (const item of bedrockItems) {
    await write(join(RP, 'textures', 'items', NS, `${item.id}.png`), item.icon);
    itemTextures[`${NS}_${item.id}`] = { textures: `textures/items/${NS}/${item.id}` };
    const components = {
      'minecraft:icon': `${NS}_${item.id}`,
      'minecraft:display_name': { value: `item.${NS}:${item.id}.name` },
      'minecraft:max_stack_size': item.stack ?? 64,
    };
    if (item.id === 'camera_linker') components[`${NS}:linker`] = {};
    if (item.level) components[`${NS}:keycard`] = { level: KEYCARD_LEVELS[item.id] };
    if (item.structure) components[`${NS}:blueprint`] = { structure: item.structure };
    if (item.placesCamera) components[`${NS}:camera_item`] = {};
    if (item.id === 'baton') {
      Object.assign(components, {
        'minecraft:damage': item.damage,
        'minecraft:durability': { max_durability: item.durability },
        'minecraft:hand_equipped': true,
        'minecraft:enchantable': { slot: 'sword', value: 10 },
        [`${NS}:baton`]: {},
      });
    }
    await write(join(BP, 'items', `${item.id}.json`), {
      format_version: '1.21.90',
      'minecraft:item': { description: { identifier: `${NS}:${item.id}`, menu_category: { category: 'equipment' } }, components },
    });
    if (item.recipe) recipes.push(item.recipe);
  }
  await write(join(RP, 'textures', 'item_texture.json'), { resource_pack_name: NS, texture_name: 'atlas.items', texture_data: itemTextures });

  for (const recipe of recipes) {
    const body = Object.values(recipe)[0];
    await write(join(BP, 'recipes', `${body.description.identifier.split(':')[1]}.json`), { format_version: '1.21.90', ...recipe });
  }

  // Particles for laser beams and the searchlight cone.
  for (const [name, color, size] of [['laser_red', [1, 0.15, 0.1, 1], 0.06], ['laser_blue', [0.15, 0.55, 1, 1], 0.06], ['tripwire', [0.85, 0.85, 0.85, 1], 0.03], ['searchlight', [1, 0.97, 0.75, 0.6], 0.25]]) {
    await write(join(RP, 'particles', `${name}.json`), {
      format_version: '1.10.0',
      particle_effect: {
        description: { identifier: `${NS}:${name}`, basic_render_parameters: { material: 'particles_add', texture: 'textures/particle/particles' } },
        components: {
          'minecraft:emitter_rate_instant': { num_particles: 1 },
          'minecraft:emitter_lifetime_once': { active_time: 0.25 },
          'minecraft:emitter_shape_point': {},
          'minecraft:particle_lifetime_expression': { max_lifetime: 0.3 },
          'minecraft:particle_appearance_billboard': {
            size: [size, size], facing_camera_mode: 'lookat_xyz',
            uv: { texture_width: 128, texture_height: 128, uv: [0, 24], uv_size: [8, 8] },
          },
          'minecraft:particle_appearance_tinting': { color },
          'minecraft:particle_appearance_lighting': {},
        },
      },
    });
  }

  // Data for the scripts.
  const data = {
    structures: structureData(),
    keycards: KEYCARD_LEVELS,
  };
  await write(join(BP, 'scripts', 'data.js'), `// Generated by tools/build.mjs\nexport const DATA = ${JSON.stringify(data, null, 2)};\n`);

  // Language
  const langs = {};
  for (const locale of LOCALES) {
    const entries = langEntries(locale, { blocks, items, description: pkg.description, version: pkg.version });
    langs[locale] = entries;
    const text = entries.map(([k, v]) => `${k}=${v}`).join('\n') + '\n';
    for (const pack of [BP, RP]) await write(join(pack, 'texts', `${locale}.lang`), text);
  }
  for (const pack of [BP, RP]) await write(join(pack, 'texts', 'languages.json'), LOCALES);

  // Java edition
  await buildJava({ blocks, items, models, icon, OUT: join(ROOT, 'java', 'src', 'generated', 'resources') });

  if (!quiet) console.log(`Built ${blocks.length} blocks, ${items.length} items and 3 entities (Bedrock packs in build/, Java resources in java/src/generated/resources)`);
  return { version: pkg.version, models };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
