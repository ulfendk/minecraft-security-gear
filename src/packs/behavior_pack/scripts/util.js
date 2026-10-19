// Shared helpers for the Security Gear scripts.
import { system, world } from '@minecraft/server';

export const NS = 'secgear';

export const DIR = {
  north: { x: 0, y: 0, z: -1 },
  south: { x: 0, y: 0, z: 1 },
  east: { x: 1, y: 0, z: 0 },
  west: { x: -1, y: 0, z: 0 },
  up: { x: 0, y: 1, z: 0 },
  down: { x: 0, y: -1, z: 0 },
};

/** Entity yaw (degrees) that looks in a horizontal direction. */
export const YAW = { south: 0, west: 90, north: 180, east: -90 };

export const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
export const centre = (b) => ({ x: b.location.x + 0.5, y: b.location.y + 0.5, z: b.location.z + 0.5 });
export const key = (b) => `${b.dimension.id}|${b.location.x},${b.location.y},${b.location.z}`;

/** Front direction of a block from its placement state. */
export function front(block) {
  const p = block.permutation;
  return p.getState('minecraft:block_face') ?? p.getState('minecraft:cardinal_direction') ?? 'north';
}

export const getState = (block, name) => block.permutation.getState(`${NS}:${name}`);

export function setState(block, name, value) {
  try {
    if (getState(block, name) !== value) block.setPermutation(block.permutation.withState(`${NS}:${name}`, value));
  } catch (e) {
    console.warn(`[secgear] setState ${name}: ${e}`);
  }
}

/** Blocks that beams, wires and searchlight light pass through. */
const SEE_THROUGH = /glass|bars|air|light_block|short_grass|tall_grass|fern|flower|torch|vine|wire|carpet|rail|button|lever|sapling|snow_layer|water|deck/;

export function seeThrough(block) {
  return !block || block.isAir || block.isLiquid || SEE_THROUGH.test(block.typeId);
}

/** Things a beam or sensor should ignore. */
export function ignorable(e) {
  if (!e.isValid) return true;
  const t = e.typeId;
  if (t === 'minecraft:item' || t === 'minecraft:xp_orb' || t === `${NS}:security_camera` || t.includes('arrow')) return true;
  if (t === 'minecraft:player' && e.getGameMode?.() === 'Spectator') return true;
  return false;
}

/** Redstone power at a block or in any of its neighbours (sources such as levers, redstone blocks, dust). */
export function powered(block) {
  try {
    if ((block.getRedstonePower() ?? 0) > 0) return true;
  } catch {}
  for (const d of Object.values(DIR)) {
    try {
      const n = block.offset(d);
      if (!n || n.typeId.startsWith(`${NS}:`)) continue;
      if ((n.getRedstonePower() ?? 0) > 0) return true;
      if (n.typeId === 'minecraft:redstone_block') return true;
    } catch {}
  }
  return false;
}

// ---------------------------------------------------------------- persistent maps

const cache = new Map();

/** A JSON object stored in a world dynamic property. */
export function store(name) {
  if (!cache.has(name)) {
    let data = {};
    try { data = JSON.parse(world.getDynamicProperty(`${NS}:${name}`) ?? '{}'); } catch {}
    cache.set(name, data);
  }
  const data = cache.get(name);
  return {
    get: (k) => data[k],
    set: (k, v) => {
      if (v === undefined) delete data[k];
      else data[k] = v;
      world.setDynamicProperty(`${NS}:${name}`, JSON.stringify(data));
    },
    entries: () => Object.entries(data),
  };
}

/** Action-bar message from a translation key. */
export function tell(player, key, ...args) {
  player.onScreenDisplay.setActionBar({ rawtext: [{ translate: `${NS}.${key}`, with: args.map(String) }] });
}

export const tick = () => system.currentTick;

export function isCreative(player) {
  return player.getGameMode?.() === 'Creative';
}

export function heldItem(player) {
  return player.getComponent('minecraft:inventory')?.container?.getItem(player.selectedSlotIndex);
}

export function consumeHeld(player) {
  if (isCreative(player)) return;
  const inv = player.getComponent('minecraft:inventory')?.container;
  const item = inv?.getItem(player.selectedSlotIndex);
  if (!item) return;
  if (item.amount > 1) {
    item.amount -= 1;
    inv.setItem(player.selectedSlotIndex, item);
  } else inv.setItem(player.selectedSlotIndex, undefined);
}

/** Facing of a player rounded to a cardinal direction. */
export function playerFacing(player) {
  const y = ((player.getRotation().y % 360) + 360) % 360;
  if (y >= 45 && y < 135) return 'west';
  if (y >= 135 && y < 225) return 'north';
  if (y >= 225 && y < 315) return 'east';
  return 'south';
}

const ORDER = ['north', 'east', 'south', 'west'];
/** Turn a direction given for a north-facing frame into the frame facing `facing`. */
export function turn(dir, facing) {
  if (dir === 'up' || dir === 'down') return dir;
  return ORDER[(ORDER.indexOf(dir) + ORDER.indexOf(facing)) % 4];
}
