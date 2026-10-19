// Blueprints build a structure in front of the player (see src/structures.mjs).
import { BlockPermutation } from '@minecraft/server';
import { DATA } from './data.js';
import { linkMonitor, spawnCamera } from './cameras.js';
import { updateAround } from './devices.js';
import { add, consumeHeld, DIR, NS, playerFacing, turn } from './util.js';

const REPLACEABLE = /air|short_grass|tall_grass|fern|flower|dandelion|poppy|snow_layer|dead_bush|light_block|tulip|orchid|allium|bluet|daisy/;

const RIGHT = { north: 'east', east: 'south', south: 'west', west: 'north' };

/** World positions of every cell, given the front-centre base position and facing. */
function cells(structure, base, facing) {
  const out = [];
  const fwd = DIR[facing], right = DIR[RIGHT[facing]];
  structure.layers.forEach((layer, y) => {
    const depth = layer.length;
    layer.forEach((row, r) => {
      const width = row.length;
      [...row].forEach((ch, c) => {
        if (ch === '.') return;
        const f = depth - 1 - r, s = c - Math.floor(width / 2);
        out.push({ ch, pos: add(add({ x: base.x, y: base.y + y, z: base.z }, fwd, f), right, s) });
      });
    });
  });
  return out;
}

function states(entry, facing) {
  const b = entry.bedrock;
  const st = { ...(b.states ?? {}) };
  if (!entry.facing) return st;
  const dir = turn(entry.facing, facing);
  switch (b.facingState) {
    case 'cardinal': st['minecraft:cardinal_direction'] = dir; break;
    case 'facing': st['minecraft:block_face'] = dir; break;
    case 'ladder': st.facing_direction = { north: 2, south: 3, west: 4, east: 5 }[dir]; break;
    case 'lever': st.lever_direction = dir === 'east' || dir === 'west' ? 'up_east_west' : 'up_north_south'; break;
  }
  return st;
}

/** Build a structure. Returns { ok, placed } or { ok: false } when something is in the way. */
export function buildStructure(dimension, name, base, facing) {
  const { palette, structures } = DATA.structures;
  const structure = structures[name];
  const list = cells(structure, base, facing);
  for (const { pos } of list) {
    const b = dimension.getBlock(pos);
    if (!b || !REPLACEABLE.test(b.typeId)) return { ok: false };
  }
  let placed = 0;
  const cameras = [], monitors = [], connect = [], spawns = [];
  for (const { ch, pos } of list) {
    const b = dimension.getBlock(pos);
    const entry = palette[ch];
    if (ch === ' ' || !entry) { b.setType('minecraft:air'); continue; }
    if (entry.spawn) { b.setType('minecraft:air'); spawns.push([entry.spawn, pos]); continue; }
    if (entry.bedrock.camera) {
      b.setType('minecraft:air');
      cameras.push(spawnCamera(dimension, pos, turn(entry.facing, facing)));
      continue;
    }
    b.setPermutation(BlockPermutation.resolve(entry.bedrock.id, states(entry, facing)));
    placed++;
    if (entry.link === 'monitor') monitors.push(b);
    if (/prison_(bars|wall)/.test(entry.bedrock.id)) connect.push(b);
  }
  for (const b of connect) updateAround(b);
  for (const m of monitors) linkMonitor(m, cameras.map((c) => c.id));
  for (const [id, pos] of spawns) dimension.spawnEntity(id, { x: pos.x + 0.5, y: pos.y, z: pos.z + 0.5 });
  return { ok: true, placed: placed + cameras.length };
}

export function useBlueprint({ source: player, block, blockFace, itemStack }, { params }) {
  if (!player || !block) return;
  const name = params?.structure;
  const facing = playerFacing(player);
  const base = blockFace === 'Up' ? block.above().location : block.offset(DIR[blockFace.toLowerCase()]).location;
  const result = buildStructure(block.dimension, name, base, facing);
  if (!result.ok) {
    player.onScreenDisplay.setActionBar({ rawtext: [{ translate: `${NS}.blueprint.blocked` }] });
    player.playSound('note.bass');
    return;
  }
  consumeHeld(player);
  player.playSound('random.levelup', { pitch: 1.2, volume: 0.5 });
  player.onScreenDisplay.setActionBar({ rawtext: [{ translate: `${NS}.blueprint.built`, with: { rawtext: [{ translate: `item.${NS}:${itemStack?.typeId?.split(':')[1] ?? name}.name` }] } }] });
}
