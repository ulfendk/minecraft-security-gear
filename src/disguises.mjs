// What camouflaged blocks (hidden doors, secret passages) can look like: common
// wall blocks, drawn with the game's own textures. A camouflaged block copies the
// wall it is placed in; using one of these blocks on it changes its look.
// Mirrored by java/.../block/Disguise.java (tools/validate.mjs checks the names).
// At most 16 entries: Bedrock's limit for an enum block state.
import { NS } from './lib/constants.mjs';

const vanilla = (name, bedrockId, texture) => ({
  name,
  java: { block: `minecraft:${name}`, model: `minecraft:block/${name}` },
  bedrock: { block: `minecraft:${bedrockId ?? name}`, texture: `textures/blocks/${texture}` },
});

export const DISGUISES = [
  vanilla('stone_bricks', null, 'stonebrick'),
  vanilla('cobblestone', null, 'cobblestone'),
  vanilla('stone', null, 'stone'),
  vanilla('mossy_stone_bricks', null, 'stonebrick_mossy'),
  vanilla('deepslate_bricks', null, 'deepslate/deepslate_bricks'),
  vanilla('bricks', 'brick_block', 'brick'),
  vanilla('oak_planks', null, 'planks_oak'),
  vanilla('spruce_planks', null, 'planks_spruce'),
  vanilla('birch_planks', null, 'planks_birch'),
  vanilla('dark_oak_planks', null, 'planks_big_oak'),
  vanilla('smooth_stone', null, 'stone_slab_top'),
  vanilla('andesite', null, 'stone_andesite'),
  vanilla('white_concrete', null, 'concrete_white'),
  {
    name: 'reinforced_concrete',
    java: { block: `${NS}:reinforced_concrete`, model: `${NS}:block/reinforced_concrete` },
    bedrock: { block: `${NS}:reinforced_concrete`, texture: `textures/blocks/${NS}/reinforced_concrete` },
  },
];

export const DISGUISE_NAMES = DISGUISES.map((d) => d.name);

/** Bedrock terrain texture key for a disguise. */
export const disguiseTexture = (name) => `${NS}_disguise_${name}`;
