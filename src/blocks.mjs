// Every block in the mod: textures, model elements (converted for both editions),
// Java blockstates, Bedrock block definitions, recipes and names.
import { NS } from './lib/constants.mjs';
import {
  bedrockBox, bedrockGeometry, blockId, box, cardinalPermutations, facingPermutations, facingVariants, horizontalVariants,
} from './lib/blockmodel.mjs';
import * as tx from './textures.mjs';

// ---------------------------------------------------------------- textures

/** name -> { png, animation? } ; block textures live in textures/block/<name>.png (Java) and textures/blocks/secgear/<name>.png (Bedrock). */
export const TEXTURES = {};
function t(name, png, animation) {
  TEXTURES[name] = { png, animation };
  return name;
}

t('reinforced_concrete', tx.reinforcedConcrete());
t('prison_wall', tx.prisonWall());
t('prison_bars', tx.prisonBars());
t('barbed_wire', tx.barbedWire());
t('razor_wire', tx.razorWire());
t('cell_door_bottom', tx.cellDoor(false));
t('cell_door_top', tx.cellDoor(true));
t('monitor_case', tx.monitorCase());
t('monitor_back', tx.monitorBack());
t('monitor_front', tx.monitorFront());
t('monitor_static', tx.monitorStatic(), { frames: 4, frametime: 2 });
t('laser_casing', tx.laserCasing());
t('laser_lens_red', tx.lens('#ff2a1a'));
t('laser_lens_blue', tx.lens('#2a8cff'));
t('laser_receiver_eye', tx.receiverFront(false));
t('laser_receiver_eye_on', tx.receiverFront(true));
t('sensor_case', tx.whitePlastic());
t('sensor_lens', tx.sensorLens(false));
t('sensor_lens_on', tx.sensorLens(true));
t('siren_base', tx.sirenBase());
t('siren_lens', tx.sirenLens(false));
t('siren_lens_on', tx.sirenLens(true));
t('reader_side', tx.readerSide());
for (const l of [1, 2, 3]) {
  t(`reader_front_${l}`, tx.readerFront(l, false));
  t(`reader_front_${l}_on`, tx.readerFront(l, true));
}
t('pit_trapdoor', tx.pitTrapdoor());
t('pit_trapdoor_underside', tx.pitTrapdoorUnderside());
t('winch_side', tx.winchSide());
t('winch_front', tx.winchFront());
t('winch_top', tx.winchTop());
t('deck_planks', tx.deckPlanks());
t('rope', tx.rope());
t('dynamite', tx.dynamite());
t('dynamite_end', tx.dynamiteEnd());
t('tape', tx.tape());
t('bomb_clock', tx.bombClock(false));
t('bomb_clock_armed', tx.bombClock(true));
t('mine_body', tx.mineBody());
t('mine_front', tx.mineFront());
t('searchlight_body', tx.searchlightBody());

// ---------------------------------------------------------------- helpers

const names = (en, da) => ({ en_US: en, da_DK: da });
const id = (name) => `${NS}:${name}`;
const geo = (name) => `geometry.${NS}.${name}`;

/** Bedrock material_instances from texture names; the first is the default ("*"). */
function materials(texNames, render = 'opaque', extra = {}) {
  const out = { '*': { texture: `${NS}_${texNames[0]}`, render_method: render } };
  for (const n of texNames) out[n] = { texture: `${NS}_${n}`, render_method: render };
  return { ...out, ...extra };
}

const shaped = (name, pattern, key, count = 1, result = name) => ({
  'minecraft:recipe_shaped': {
    description: { identifier: id(name) },
    tags: ['crafting_table'],
    pattern,
    key: Object.fromEntries(Object.entries(key).map(([k, v]) => [k, { item: v.includes(':') ? v : `minecraft:${v}` }])),
    result: { item: id(result), count },
    unlock: [{ item: Object.values(key)[0].includes(':') ? Object.values(key)[0] : `minecraft:${Object.values(key)[0]}` }],
  },
});
const shapeless = (name, ingredients, count = 1, result = name) => ({
  'minecraft:recipe_shapeless': {
    description: { identifier: id(name) },
    tags: ['crafting_table'],
    ingredients: ingredients.map((i) => ({ item: i.includes(':') ? i : `minecraft:${i}` })),
    result: { item: id(result), count },
    unlock: [{ item: ingredients[0].includes(':') ? ingredients[0] : `minecraft:${ingredients[0]}` }],
  },
});

/** Common Bedrock components. */
function base({ hardness = 3, blast = 6, light = 0, map = '#7a7a7a', collision = true, selection, opacity } = {}) {
  const c = {
    'minecraft:destructible_by_mining': { seconds_to_destroy: hardness },
    'minecraft:destructible_by_explosion': { explosion_resistance: blast },
    'minecraft:map_color': map,
  };
  if (light) c['minecraft:light_emission'] = light;
  if (collision === false) c['minecraft:collision_box'] = false;
  else if (collision !== true) c['minecraft:collision_box'] = collision;
  if (selection) c['minecraft:selection_box'] = selection;
  if (opacity !== undefined) c['minecraft:light_dampening'] = opacity;
  return c;
}

const state = (name) => `q.block_state('${NS}:${name}')`;

/** A Java model whose only job is the particle texture (the block entity draws the block). */
const particleOnly = (texture) => ({ textures: { particle: texture } });

// ---------------------------------------------------------------- shapes

const monitorModel = {
  elements: [
    box([1, 1, 4], [15, 13, 12], { north: 'monitor_front', rest: 'monitor_case' }),
    box([3, 3, 12], [13, 11, 15], { south: 'monitor_back', rest: 'monitor_case' }),
    box([5, 0, 6], [11, 1, 11], 'monitor_case'),
    // The screen sits just in front of the bezel; Java draws the live feed over it.
    { from: [2, 3, 3.95], to: [14, 12, 4], faces: { north: { tex: 'monitor_static', uv: [0, 0, 16, 16] } }, light: 10 },
  ],
  particle: 'monitor_case',
};

const emitterModel = (lensTex) => ({
  elements: [
    box([3, 3, 13], [13, 13, 16], 'laser_casing'),
    box([5, 5, 8], [11, 11, 13], 'laser_casing'),
    box([6, 6, 7], [10, 10, 8], { north: { tex: lensTex, uv: [0, 0, 16, 16] }, rest: 'laser_casing' }, { light: 12 }),
  ],
});

const receiverModel = (eye) => ({
  elements: [
    box([3, 3, 13], [13, 13, 16], 'laser_casing'),
    box([4, 4, 10], [12, 12, 13], { north: { tex: eye, uv: [0, 0, 16, 16] }, rest: 'laser_casing' }),
  ],
});

const sensorModel = (lens) => ({
  elements: [
    box([4, 4, 14], [12, 12, 16], 'sensor_case'),
    box([5, 5, 12], [11, 11, 14], { north: { tex: lens, uv: [2, 2, 14, 14] }, rest: 'sensor_case' }),
  ],
});

const sirenModel = (lens) => ({
  elements: [
    box([4, 4, 14], [12, 12, 16], 'siren_base'),
    box([5, 5, 10], [11, 11, 14], { south: 'siren_base', rest: lens }, lens.endsWith('_on') ? { light: 15 } : {}),
  ],
});

const readerModel = (front) => ({
  elements: [box([4, 2, 14], [12, 14, 16], { north: { tex: front, uv: [4, 2, 12, 14] }, rest: 'reader_side' })],
});

const pitClosed = { elements: [box([0, 0, 0], [16, 16, 16], { down: 'pit_trapdoor_underside', rest: 'pit_trapdoor' })] };
const pitOpen = {
  elements: [
    box([0, 8, 0], [16, 16, 2], { south: 'pit_trapdoor_underside', rest: 'pit_trapdoor' }),
    box([0, 8, 14], [16, 16, 16], { north: 'pit_trapdoor_underside', rest: 'pit_trapdoor' }),
  ],
};

const winchModel = { elements: [box([0, 0, 0], [16, 16, 16], { north: 'winch_front', up: 'winch_top', down: 'winch_top', rest: 'winch_side' })] };

const deckModel = {
  elements: [
    box([0, 0, 0], [16, 3, 16], 'deck_planks'),
    box([0, 3, 7], [1, 12, 9], 'deck_planks'),
    box([15, 3, 7], [16, 12, 9], 'deck_planks'),
    box([0, 10, 0], [1, 11, 16], 'rope'),
    box([15, 10, 0], [16, 11, 16], 'rope'),
  ],
  particle: 'deck_planks',
};

const bombModel = (clock) => ({
  elements: [
    box([2, 0, 5], [6, 9, 11], { up: 'dynamite_end', down: 'dynamite_end', rest: 'dynamite' }),
    box([6, 0, 5], [10, 9, 11], { up: 'dynamite_end', down: 'dynamite_end', rest: 'dynamite' }),
    box([10, 0, 5], [14, 9, 11], { up: 'dynamite_end', down: 'dynamite_end', rest: 'dynamite' }),
    box([1, 3, 4], [15, 5, 12], 'tape'),
    box([4, 2, 3], [12, 8, 4], { north: { tex: clock, uv: [2, 3, 14, 11] }, rest: 'tape' }),
  ],
  particle: 'dynamite',
});

const mineModel = {
  elements: [
    box([3, 3, 12], [13, 10, 16], { north: { tex: 'mine_front', uv: [3, 4, 13, 11] }, rest: 'mine_body' }),
    box([7, 6, 11], [9, 8, 12], 'tape'),
  ],
  particle: 'mine_body',
};

// Prison bars: a thick centre post and chunky bars with three cross rails per side.
const barsPost = { elements: [box([6.5, 0, 6.5], [9.5, 16, 9.5], 'prison_bars')] };
const barsSide = {
  elements: [
    box([7, 0, 1], [9, 16, 3], 'prison_bars'),
    box([7, 0, 4], [9, 16, 6], 'prison_bars'),
    box([7.25, 0, 0], [8.75, 1.5, 6.5], 'prison_bars'),
    box([7.25, 7.25, 0], [8.75, 8.75, 6.5], 'prison_bars'),
    box([7.25, 14.5, 0], [8.75, 16, 6.5], 'prison_bars'),
  ],
};

/** Rotate a north-pointing side (z 0..8) to the other directions, for Bedrock bones. */
function rotateSide(elements, dir, bone) {
  const rot = {
    north: (x, z) => [x, z],
    south: (x, z) => [16 - x, 16 - z],
    east: (x, z) => [16 - z, x],
    west: (x, z) => [z, 16 - x],
  }[dir];
  return elements.map((el) => {
    const [ax, az] = rot(el.from[0], el.from[2]);
    const [bx, bz] = rot(el.to[0], el.to[2]);
    const faces = Object.fromEntries(Object.entries(el.faces).map(([f, v]) => [f, typeof v === 'string' ? v : v.tex]));
    return { ...el, from: [Math.min(ax, bx), el.from[1], Math.min(az, bz)], to: [Math.max(ax, bx), el.to[1], Math.max(az, bz)], faces, bone };
  });
}

const wallPost = box([4, 0, 4], [12, 16, 12], 'prison_wall');
const wallSide = box([5, 0, 0], [11, 14, 8], 'prison_wall');

const crossModel = (tex) => ({
  elements: [
    { from: [0.8, 0, 8], to: [15.2, 16, 8], faces: { north: tex, south: tex }, rotation: { axis: 'y', angle: 45, origin: [8, 8, 8] }, shade: false },
    { from: [8, 0, 0.8], to: [8, 16, 15.2], faces: { east: tex, west: tex }, rotation: { axis: 'y', angle: 45, origin: [8, 8, 8] }, shade: false },
  ],
});

const doorClosed = { elements: [box([0, 0, 13], [16, 16, 16], 'cell_door_bottom')] };
const doorOpen = { elements: [box([13, 0, 0], [16, 16, 16], 'cell_door_bottom')] };
const doorClosedTop = { elements: [box([0, 0, 13], [16, 16, 16], 'cell_door_top')] };
const doorOpenTop = { elements: [box([13, 0, 0], [16, 16, 16], 'cell_door_top')] };

// ---------------------------------------------------------------- Java blockstate helpers

const DIRS = ['north', 'east', 'south', 'west'];
const Y = { north: 0, east: 90, south: 180, west: 270 };

function wallBlockstate(name) {
  const mp = [{ apply: { model: blockId(`${name}_post`) }, when: { up: 'true' } }];
  for (const d of DIRS) {
    mp.push({ apply: { model: blockId(`${name}_side`), uvlock: true, ...(Y[d] ? { y: Y[d] } : {}) }, when: { [d]: 'low' } });
    mp.push({ apply: { model: blockId(`${name}_side_tall`), uvlock: true, ...(Y[d] ? { y: Y[d] } : {}) }, when: { [d]: 'tall' } });
  }
  return { multipart: mp };
}

function barsBlockstate(name) {
  const mp = [{ apply: { model: blockId(`${name}_post`) } }];
  for (const d of DIRS) mp.push({ apply: { model: blockId(`${name}_side`), ...(Y[d] ? { y: Y[d] } : {}) }, when: { [d]: 'true' } });
  return { multipart: mp };
}

/** Same layout as vanilla's iron door blockstate. */
function doorBlockstate(name) {
  const variants = {};
  const base = { east: 0, south: 90, west: 180, north: 270 };
  for (const facing of DIRS)
    for (const half of ['lower', 'upper'])
      for (const hinge of ['left', 'right'])
        for (const open of [false, true]) {
          const part = `${half === 'lower' ? 'bottom' : 'top'}_${hinge}${open ? '_open' : ''}`;
          let y = base[facing] + (open ? (hinge === 'left' ? 90 : 270) : 0);
          y %= 360;
          variants[`facing=${facing},half=${half},hinge=${hinge},open=${open}`] = { model: blockId(`${name}_${part}`), ...(y ? { y } : {}) };
        }
  return { variants };
}

function doorModels(name) {
  const out = {};
  for (const half of ['bottom', 'top'])
    for (const hinge of ['left', 'right'])
      for (const open of ['', '_open'])
        out[`${name}_${half}_${hinge}${open}`] = {
          parent: `minecraft:block/door_${half}_${hinge}${open}`,
          textures: { bottom: blockId('cell_door_bottom'), top: blockId('cell_door_top') },
        };
  return out;
}

// ---------------------------------------------------------------- the blocks

/**
 * Block spec:
 *   java.models   { modelName: element model | raw Java model JSON (has "parent" or "textures") }
 *   java.blockstate
 *   java.item     'block' (use the block model) | { icon } (flat icon in textures/item)
 *   bedrock       Bedrock block definition parts (null: not a Bedrock block, e.g. the camera is an entity there)
 */
export const blocks = [
  {
    id: 'reinforced_concrete',
    name: names('Reinforced Concrete', 'Armeret beton'),
    java: {
      models: { reinforced_concrete: { parent: 'minecraft:block/cube_all', textures: { all: blockId('reinforced_concrete') } } },
      blockstate: { variants: { '': { model: blockId('reinforced_concrete') } } },
      item: 'block',
    },
    bedrock: {
      geometry: 'minecraft:geometry.full_block',
      components: { ...base({ hardness: 25, blast: 1200, map: '#8e9095' }), 'minecraft:material_instances': materials(['reinforced_concrete']) },
      menu: 'construction',
    },
    sound: 'stone',
    recipe: shaped('reinforced_concrete', ['CCC', 'CIC', 'CCC'], { C: 'gray_concrete', I: 'iron_ingot' }, 8),
  },
  {
    id: 'prison_wall',
    name: names('Prison Wall', 'Fængselsmur'),
    java: {
      models: {
        prison_wall_post: { parent: 'minecraft:block/template_wall_post', textures: { wall: blockId('prison_wall') } },
        prison_wall_side: { parent: 'minecraft:block/template_wall_side', textures: { wall: blockId('prison_wall') } },
        prison_wall_side_tall: { parent: 'minecraft:block/template_wall_side_tall', textures: { wall: blockId('prison_wall') } },
        prison_wall_inventory: { parent: 'minecraft:block/wall_inventory', textures: { wall: blockId('prison_wall') } },
      },
      blockstate: wallBlockstate('prison_wall'),
      item: { model: blockId('prison_wall_inventory') },
    },
    bedrock: {
      connects: true,
      model: { elements: [wallPost, ...DIRS.flatMap((d) => rotateSide([wallSide], d, d))] },
      states: Object.fromEntries(DIRS.map((d) => [`${NS}:${d}`, [false, true]])),
      components: { ...base({ hardness: 25, blast: 1200, map: '#999ba0' }), 'minecraft:material_instances': materials(['prison_wall']) },
      menu: 'construction',
    },
    sound: 'stone',
    recipe: shaped('prison_wall', ['RRR', 'RRR'], { R: id('reinforced_concrete') }, 6),
  },
  {
    id: 'prison_bars',
    name: names('Prison Bars', 'Fængselstremmer'),
    java: {
      models: {
        prison_bars_post: barsPost,
        prison_bars_side: barsSide,
        prison_bars_inventory: { elements: [...barsPost.elements, ...rotateSide(barsSide.elements, 'north'), ...rotateSide(barsSide.elements, 'south')] },
      },
      blockstate: barsBlockstate('prison_bars'),
      item: { model: blockId('prison_bars_inventory') },
    },
    bedrock: {
      connects: true,
      model: { elements: [...barsPost.elements, ...DIRS.flatMap((d) => rotateSide(barsSide.elements, d, d))] },
      states: Object.fromEntries(DIRS.map((d) => [`${NS}:${d}`, [false, true]])),
      components: { ...base({ hardness: 10, blast: 1200, map: '#4b5057', opacity: 0 }), 'minecraft:material_instances': materials(['prison_bars']) },
      menu: 'construction',
    },
    sound: 'metal',
    recipe: shaped('prison_bars', ['IBI', 'IBI'], { I: 'iron_ingot', B: 'iron_bars' }, 4),
  },
  ...['barbed_wire', 'razor_wire'].map((wire) => ({
    id: wire,
    name: wire === 'barbed_wire' ? names('Barbed Wire', 'Pigtråd') : names('Razor Wire', 'Knivtråd'),
    java: {
      models: { [wire]: { parent: 'minecraft:block/cross', textures: { cross: blockId(wire) } } },
      blockstate: { variants: { '': { model: blockId(wire) } } },
      item: { icon: wire, fromBlock: true },
    },
    bedrock: {
      model: crossModel(wire),
      components: {
        ...base({ hardness: 2, blast: 6, collision: false, map: '#6d6f72', opacity: 0 }),
        'minecraft:material_instances': materials([wire], 'alpha_test_single_sided'),
        'minecraft:tick': { interval_range: [10, 10], looping: true },
        [`${NS}:wire`]: { damage: wire === 'razor_wire' ? 3 : 1 },
      },
      menu: 'construction',
    },
    sound: 'metal',
    recipe: wire === 'barbed_wire'
      ? shaped('barbed_wire', ['N N', ' N ', 'N N'], { N: 'iron_nugget' }, 4)
      : shapeless('razor_wire', [id('barbed_wire'), id('barbed_wire'), 'iron_ingot'], 2),
  })),
  {
    id: 'cell_door',
    name: names('Cell Door', 'Celledør'),
    java: { models: doorModels('cell_door'), blockstate: doorBlockstate('cell_door'), item: { icon: 'cell_door', png: tx.cellDoorIcon() } },
    bedrock: {
      door: true,
      geometries: [
        bedrockGeometry(geo('cell_door'), doorClosed), bedrockGeometry(geo('cell_door_open'), doorOpen),
        bedrockGeometry(geo('cell_door_top'), doorClosedTop), bedrockGeometry(geo('cell_door_top_open'), doorOpenTop),
      ],
      components: {
        ...base({ hardness: 5, blast: 25, map: '#5a6068', opacity: 0 }),
        'minecraft:material_instances': materials(['cell_door_bottom', 'cell_door_top'], 'alpha_test'),
        'minecraft:tick': { interval_range: [4, 4], looping: true },
        [`${NS}:cell_door`]: {},
      },
      menu: 'construction',
    },
    sound: 'metal',
    recipe: shaped('cell_door', ['II', 'BB', 'II'], { I: 'iron_ingot', B: id('prison_bars') }, 2),
  },
  {
    id: 'security_camera',
    name: names('Security Camera', 'Overvågningskamera'),
    java: { models: { security_camera: particleOnly(blockId('monitor_case')) }, blockstate: { variants: { '': { model: blockId('security_camera') } } }, item: { icon: 'security_camera' } },
    bedrock: null, // an entity on Bedrock (see src/entities.mjs), placed by the item of the same name
    sound: 'metal',
    recipe: shaped('security_camera', ['III', 'IGR', 'III'], { I: 'iron_ingot', G: 'glass_pane', R: 'redstone' }),
  },
  {
    id: 'monitor',
    name: names('Security Monitor', 'Overvågningsskærm'),
    java: { models: { monitor: monitorModel }, blockstate: horizontalVariants(() => blockId('monitor')), item: 'block' },
    bedrock: {
      model: monitorModel,
      cardinal: true,
      components: {
        ...base({ hardness: 2, blast: 6, map: '#3a3d42', opacity: 0 }),
        'minecraft:collision_box': bedrockBox([1, 0, 4], [15, 13, 15]),
        'minecraft:selection_box': bedrockBox([1, 0, 4], [15, 13, 15]),
        'minecraft:material_instances': materials(['monitor_case', 'monitor_front', 'monitor_back', 'monitor_static']),
        [`${NS}:monitor`]: {},
      },
      menu: 'equipment',
    },
    sound: 'metal',
    recipe: shaped('monitor', ['III', 'IGI', 'IRI'], { I: 'iron_ingot', G: 'glass_pane', R: 'redstone' }),
  },
  ...[['laser_emitter', 'laser_lens_red', names('Laser Tripwire Emitter', 'Laserstråle-sender')],
    ['laser_fence', 'laser_lens_blue', names('Laser Fence Emitter', 'Laserhegn-sender')]].map(([name, lens, n]) => ({
    id: name,
    name: n,
    java: { models: { [name]: emitterModel(lens) }, blockstate: facingVariants(() => blockId(name)), item: 'block' },
    bedrock: {
      model: emitterModel(lens),
      facing: true,
      components: {
        ...base({ hardness: 3, blast: 6, map: '#4b5057', light: 7, opacity: 0 }),
        'minecraft:material_instances': materials(['laser_casing', lens]),
        'minecraft:tick': { interval_range: [4, 4], looping: true },
        [`${NS}:laser`]: { fence: name === 'laser_fence' },
      },
      menu: 'equipment',
    },
    sound: 'metal',
    recipe: name === 'laser_emitter'
      ? shaped('laser_emitter', ['III', 'RQG', 'III'], { I: 'iron_ingot', R: 'redstone', Q: 'quartz', G: 'glass' }, 2)
      : shapeless('laser_fence', [id('laser_emitter'), 'blaze_powder', 'lapis_lazuli']),
  })),
  {
    id: 'laser_receiver',
    name: names('Laser Receiver', 'Lasermodtager'),
    java: { models: { laser_receiver: receiverModel('laser_receiver_eye'), laser_receiver_on: receiverModel('laser_receiver_eye_on') }, blockstate: facingVariants((e) => blockId(e === 'powered=true' ? 'laser_receiver_on' : 'laser_receiver'), ['powered=false', 'powered=true']), item: 'block' },
    bedrock: {
      model: receiverModel('laser_receiver_eye'),
      facing: true,
      poweredTexture: { laser_receiver_eye: 'laser_receiver_eye_on' },
      components: {
        ...base({ hardness: 3, blast: 6, map: '#4b5057', opacity: 0 }),
        'minecraft:material_instances': materials(['laser_casing', 'laser_receiver_eye']),
        [`${NS}:output`]: {},
      },
      menu: 'equipment',
    },
    sound: 'metal',
    recipe: shaped('laser_receiver', ['IGI', 'IRI', 'III'], { I: 'iron_ingot', G: 'glass', R: 'redstone' }, 2),
  },
  {
    id: 'motion_sensor',
    name: names('Motion Sensor', 'Bevægelsessensor'),
    java: { models: { motion_sensor: sensorModel('sensor_lens'), motion_sensor_on: sensorModel('sensor_lens_on') }, blockstate: facingVariants((e) => blockId(e === 'powered=true' ? 'motion_sensor_on' : 'motion_sensor'), ['powered=false', 'powered=true']), item: 'block' },
    bedrock: {
      model: sensorModel('sensor_lens'),
      facing: true,
      poweredTexture: { sensor_lens: 'sensor_lens_on' },
      components: {
        ...base({ hardness: 1, blast: 3, map: '#d9dcd8', opacity: 0 }),
        'minecraft:material_instances': materials(['sensor_case', 'sensor_lens']),
        'minecraft:tick': { interval_range: [10, 10], looping: true },
        [`${NS}:motion_sensor`]: {},
      },
      menu: 'equipment',
    },
    sound: 'stone',
    recipe: shaped('motion_sensor', [' Q ', 'QOQ'], { Q: 'quartz', O: 'observer' }),
  },
  {
    id: 'alarm_siren',
    name: names('Alarm Siren', 'Alarmsirene'),
    java: { models: { alarm_siren: sirenModel('siren_lens'), alarm_siren_on: sirenModel('siren_lens_on') }, blockstate: facingVariants((e) => blockId(e === 'powered=true' ? 'alarm_siren_on' : 'alarm_siren'), ['powered=false', 'powered=true']), item: 'block' },
    bedrock: {
      model: sirenModel('siren_lens'),
      facing: true,
      poweredTexture: { siren_lens: 'siren_lens_on' },
      poweredLight: 13,
      components: {
        ...base({ hardness: 1, blast: 3, map: '#a8281c', opacity: 0 }),
        'minecraft:material_instances': materials(['siren_base', 'siren_lens']),
        'minecraft:tick': { interval_range: [10, 10], looping: true },
        [`${NS}:siren`]: {},
      },
      menu: 'equipment',
    },
    sound: 'metal',
    recipe: shaped('alarm_siren', [' G ', 'RNR', 'III'], { G: 'glass', R: 'redstone', N: 'noteblock', I: 'iron_ingot' }),
  },
  {
    id: 'searchlight',
    name: names('Searchlight', 'Projektør'),
    java: { models: { searchlight: particleOnly(blockId('searchlight_body')) }, blockstate: { variants: { '': { model: blockId('searchlight') } } }, item: { icon: 'searchlight' } },
    bedrock: {
      entityModel: 'searchlight', // box-UV geometry from src/models.mjs
      cardinal: true,
      components: {
        ...base({ hardness: 3, blast: 6, map: '#4d5a3a', opacity: 0 }),
        'minecraft:collision_box': bedrockBox([2, 0, 2], [14, 15, 14]),
        'minecraft:selection_box': bedrockBox([2, 0, 2], [14, 15, 14]),
        'minecraft:tick': { interval_range: [5, 5], looping: true },
        [`${NS}:searchlight`]: {},
      },
      menu: 'equipment',
    },
    sound: 'metal',
    recipe: shaped('searchlight', ['IGI', 'ILI', 'I I'], { I: 'iron_ingot', G: 'glass', L: 'redstone_lamp' }),
  },
  {
    id: 'keycard_reader',
    name: names('Keycard Reader', 'Nøglekortlæser'),
    java: {
      models: Object.fromEntries([1, 2, 3].flatMap((l) => [[`keycard_reader_${l}`, readerModel(`reader_front_${l}`)], [`keycard_reader_${l}_on`, readerModel(`reader_front_${l}_on`)]])),
      blockstate: horizontalVariants((e) => {
        const [lv, pw] = e.split(',');
        return blockId(`keycard_reader_${lv.split('=')[1]}${pw === 'powered=true' ? '_on' : ''}`);
      }, [1, 2, 3].flatMap((l) => [`level=${l},powered=false`, `level=${l},powered=true`])),
      item: { model: blockId('keycard_reader_1') },
    },
    bedrock: {
      model: readerModel('reader_front_1'),
      cardinal: true,
      states: { [`${NS}:level`]: [1, 2, 3] },
      levelTextures: true,
      components: {
        ...base({ hardness: 3, blast: 1200, map: '#2f3236', opacity: 0 }),
        'minecraft:collision_box': bedrockBox([4, 2, 14], [12, 14, 16]),
        'minecraft:selection_box': bedrockBox([4, 2, 14], [12, 14, 16]),
        'minecraft:material_instances': materials(['reader_side', 'reader_front_1']),
        [`${NS}:keycard_reader`]: {},
        [`${NS}:output`]: {},
      },
      menu: 'equipment',
    },
    sound: 'metal',
    recipe: shaped('keycard_reader', ['III', 'IRI', 'IQI'], { I: 'iron_ingot', R: 'redstone', Q: 'quartz' }),
  },
  {
    id: 'pit_trapdoor',
    name: names('Pit Trapdoor', 'Faldlem'),
    java: { models: { pit_trapdoor: pitClosed, pit_trapdoor_open: pitOpen }, blockstate: { variants: { 'open=false': { model: blockId('pit_trapdoor') }, 'open=true': { model: blockId('pit_trapdoor_open') } } }, item: 'block' },
    bedrock: {
      geometries: [bedrockGeometry(geo('pit_trapdoor'), pitClosed), bedrockGeometry(geo('pit_trapdoor_open'), pitOpen)],
      states: { [`${NS}:open`]: [false, true] },
      openGeometry: true,
      components: {
        ...base({ hardness: 2, blast: 6, map: '#7b7b7b' }),
        'minecraft:material_instances': materials(['pit_trapdoor', 'pit_trapdoor_underside']),
        'minecraft:tick': { interval_range: [10, 10], looping: true },
        [`${NS}:pit_trapdoor`]: {},
      },
      menu: 'construction',
    },
    sound: 'stone',
    recipe: shaped('pit_trapdoor', ['S', 'T'], { S: 'stone_bricks', T: 'iron_trapdoor' }),
  },
  {
    id: 'bridge_winch',
    name: names('Bridge Winch', 'Brospil'),
    java: { models: { bridge_winch: winchModel }, blockstate: horizontalVariants(() => blockId('bridge_winch')), item: 'block' },
    bedrock: {
      model: winchModel,
      cardinal: true,
      components: {
        ...base({ hardness: 3, blast: 6, map: '#6b4f30' }),
        'minecraft:material_instances': materials(['winch_side', 'winch_front', 'winch_top']),
        'minecraft:tick': { interval_range: [6, 6], looping: true },
        [`${NS}:winch`]: {},
      },
      menu: 'equipment',
    },
    sound: 'wood',
    recipe: shaped('bridge_winch', ['III', 'SRS', 'PPP'], { I: 'iron_ingot', S: 'string', R: 'redstone', P: 'oak_planks' }),
  },
  {
    id: 'bridge_deck',
    name: names('Bridge Deck', 'Brodæk'),
    java: { models: { bridge_deck: deckModel }, blockstate: horizontalVariants(() => blockId('bridge_deck')), item: null },
    bedrock: {
      model: deckModel,
      cardinal: true,
      components: {
        ...base({ hardness: 1, blast: 3, map: '#8a6a42', opacity: 0 }),
        'minecraft:collision_box': bedrockBox([0, 0, 0], [16, 3, 16]),
        'minecraft:selection_box': bedrockBox([0, 0, 0], [16, 3, 16]),
        'minecraft:material_instances': materials(['deck_planks', 'rope']),
        'minecraft:loot': 'loot_tables/empty.json',
      },
      menu: 'none',
    },
    sound: 'wood',
    loot: false,
  },
  {
    id: 'timed_bomb',
    name: names('Timed Bomb', 'Tidsindstillet bombe'),
    java: { models: { timed_bomb: bombModel('bomb_clock'), timed_bomb_armed: bombModel('bomb_clock_armed') }, blockstate: horizontalVariants((e) => blockId(e === 'armed=true' ? 'timed_bomb_armed' : 'timed_bomb'), ['armed=false', 'armed=true']), item: 'block' },
    bedrock: {
      model: bombModel('bomb_clock'),
      cardinal: true,
      states: { [`${NS}:armed`]: [false, true], [`${NS}:timer`]: [0, 1, 2, 3] },
      armedTexture: { bomb_clock: 'bomb_clock_armed' },
      components: {
        ...base({ hardness: 0.5, blast: 0, map: '#b3261e', opacity: 0 }),
        'minecraft:collision_box': bedrockBox([1, 0, 3], [15, 9, 12]),
        'minecraft:selection_box': bedrockBox([1, 0, 3], [15, 9, 12]),
        'minecraft:material_instances': materials(['dynamite', 'dynamite_end', 'tape', 'bomb_clock']),
        'minecraft:tick': { interval_range: [20, 20], looping: true },
        [`${NS}:timed_bomb`]: {},
      },
      menu: 'equipment',
    },
    sound: 'grass',
    recipe: shaped('timed_bomb', [' C ', 'TTT'], { C: 'clock', T: 'tnt' }),
  },
  {
    id: 'tripwire_bomb',
    name: names('Tripwire Bomb', 'Snubletrådsbombe'),
    java: { models: { tripwire_bomb: mineModel }, blockstate: facingVariants(() => blockId('tripwire_bomb')), item: 'block' },
    bedrock: {
      model: mineModel,
      facing: true,
      components: {
        ...base({ hardness: 0.5, blast: 0, map: '#58603f', opacity: 0 }),
        'minecraft:material_instances': materials(['mine_body', 'mine_front', 'tape']),
        'minecraft:tick': { interval_range: [2, 2], looping: true },
        [`${NS}:tripwire_bomb`]: {},
      },
      menu: 'equipment',
    },
    sound: 'grass',
    recipe: shapeless('tripwire_bomb', ['tnt', 'tripwire_hook', 'string']),
  },
];

/** The upper half of the cell door is its own block on Bedrock (no item). */
export const bedrockOnlyBlocks = ['cell_door_upper'];

export { shaped, shapeless, materials, base, names };
