// Lasers, receivers, motion sensors, sirens, searchlights, keycard readers,
// cell doors, pit trapdoors, wire, the winding bridge and bombs.
import { BlockPermutation, system, world } from '@minecraft/server';
import {
  add, centre, DIR, front, getState, heldItem, ignorable, key, NS, powered, seeThrough, setState, store, tell,
} from './util.js';

const pulses = new Map(); // block key -> { block, until }

/** Give an output block a redstone pulse that ends `ticks` from now (extended while re-triggered). */
export function pulse(block, ticks = 10) {
  setState(block, 'powered', true);
  pulses.set(key(block), { dimension: block.dimension, location: block.location, until: system.currentTick + ticks });
}

system.runInterval(() => {
  for (const [k, p] of pulses) {
    if (system.currentTick < p.until) continue;
    pulses.delete(k);
    try {
      const b = p.dimension.getBlock(p.location);
      if (b?.typeId.startsWith(`${NS}:`)) setState(b, 'powered', false);
    } catch {}
  }
}, 2);

// ---------------------------------------------------------------- beams

/** Trace a beam from a block along its front, up to `max` blocks. Returns { length, end }. */
function trace(block, max) {
  const d = DIR[front(block)];
  let length = 0;
  let end;
  for (let i = 1; i <= max; i++) {
    const b = block.offset(add({ x: 0, y: 0, z: 0 }, d, i));
    if (!b) break;
    if (!seeThrough(b)) { end = b; break; }
    length = i;
  }
  return { d, length, end };
}

function beamEntities(block, d, length) {
  if (length <= 0) return [];
  const start = add(centre(block), d, 0.5);
  try {
    return block.dimension.getEntitiesFromRay(start, d, { maxDistance: length + 0.5, ignoreBlockCollision: false }).map((h) => h.entity).filter((e) => !ignorable(e));
  } catch {
    return [];
  }
}

function particles(block, d, length, name, step = 0.5) {
  const start = add(centre(block), d, 0.3);
  for (let s = 0; s <= length + 0.2; s += step) {
    try { block.dimension.spawnParticle(name, add(start, d, s)); } catch {}
  }
}

export function laserTick({ block }, { params }) {
  if (powered(block)) return; // a redstone signal switches the laser off
  const fence = !!params?.fence;
  const { d, length, end } = trace(block, 16);
  particles(block, d, length, fence ? `${NS}:laser_blue` : `${NS}:laser_red`);
  const hit = beamEntities(block, d, length);
  if (!hit.length) return;
  if (end?.typeId === `${NS}:laser_receiver`) pulse(end, 10);
  if (fence) for (const e of hit) { try { e.applyDamage(2, { cause: 'magic' }); } catch {} }
}

export function tripwireTick({ block }) {
  const { d, length } = trace(block, 8);
  if (system.currentTick % 10 === 0) particles(block, d, length, `${NS}:tripwire`, 0.35);
  if (powered(block) || beamEntities(block, d, length).length) explode(block, 3.5);
}

// ---------------------------------------------------------------- sensors and alarms

export function motionTick({ block }) {
  const d = DIR[front(block)];
  const c = centre(block);
  const seen = block.dimension.getEntities({ location: c, maxDistance: 8 }).some((e) => {
    if (ignorable(e) || e.typeId === `${NS}:security_guard`) return false;
    if (e.typeId === 'minecraft:player' && e.isSneaking) return false; // sneaking slips past
    const to = { x: e.location.x - c.x, y: e.location.y + 0.5 - c.y, z: e.location.z - c.z };
    const dist = Math.hypot(to.x, to.y, to.z);
    if (dist < 0.5 || (to.x * d.x + to.y * d.y + to.z * d.z) / dist < 0.2) return false;
    const hit = block.dimension.getBlockFromRay(add(c, d, 0.5), { x: to.x / dist, y: to.y / dist, z: to.z / dist }, { maxDistance: dist - 0.6, includePassableBlocks: false });
    return !hit || seeThrough(hit.block);
  });
  if (seen) pulse(block, 14);
}

export function sirenTick({ block }) {
  const on = powered(block);
  setState(block, 'powered', on);
  if (!on) return;
  const t = Math.floor(system.currentTick / 10) % 2;
  block.dimension.playSound('note.pling', centre(block), { pitch: t ? 1.4 : 0.9, volume: 3 });
}

const lights = store('searchlights'); // searchlight key -> placed light location

export function searchlightTick({ block }) {
  const on = powered(block);
  setState(block, 'powered', on);
  const k = key(block);
  const old = lights.get(k);
  const clearOld = () => {
    if (!old) return;
    try {
      const b = block.dimension.getBlock(old);
      if (b?.typeId.startsWith('minecraft:light_block')) b.setType('minecraft:air');
    } catch {}
    lights.set(k, undefined);
  };
  if (!on) return clearOld();
  const baseYaw = { north: 180, south: 0, west: 90, east: -90 }[front(block)];
  const yaw = (baseYaw + 60 * Math.sin(system.currentTick / 60)) * (Math.PI / 180);
  const pitch = -12 * (Math.PI / 180);
  const dir = { x: -Math.sin(yaw) * Math.cos(pitch), y: Math.sin(pitch), z: Math.cos(yaw) * Math.cos(pitch) };
  const from = { x: block.location.x + 0.5, y: block.location.y + 0.7, z: block.location.z + 0.5 };
  const hit = block.dimension.getBlockFromRay(add(from, dir, 0.8), dir, { maxDistance: 32, includePassableBlocks: false });
  const dist = hit ? Math.hypot(hit.block.location.x + hit.faceLocation.x - from.x, hit.block.location.y + hit.faceLocation.y - from.y, hit.block.location.z + hit.faceLocation.z - from.z) : 32;
  for (let s = 1; s < dist; s += 1.2) {
    try { block.dimension.spawnParticle(`${NS}:searchlight`, add(from, dir, s)); } catch {}
  }
  if (!hit) return clearOld();
  const spot = add(from, dir, Math.max(1, dist - 0.7));
  const target = block.dimension.getBlock({ x: Math.floor(spot.x), y: Math.floor(spot.y), z: Math.floor(spot.z) });
  if (!target?.isAir) return;
  if (old && old.x === target.location.x && old.y === target.location.y && old.z === target.location.z) return;
  clearOld();
  try {
    target.setType('minecraft:light_block_14');
    lights.set(k, target.location);
  } catch {}
}

// ---------------------------------------------------------------- keycards and cell doors

const doorTimers = new Map(); // lower door key -> until tick

export function readerInteract({ block, player }) {
  if (!player) return;
  const item = heldItem(player);
  const levels = { [`${NS}:guard_keycard`]: 1, [`${NS}:officer_keycard`]: 2, [`${NS}:warden_keycard`]: 3 };
  const level = levels[item?.typeId] ?? 0;
  const required = getState(block, 'level') ?? 1;
  if (player.isSneaking && level === 3) {
    const next = (required % 3) + 1;
    setState(block, 'level', next);
    return player.onScreenDisplay.setActionBar({ rawtext: [{ translate: `${NS}.reader.level`, with: { rawtext: [{ translate: `${NS}.level.${next}` }] } }] });
  }
  if (level >= required) {
    pulse(block, 40);
    openNearbyDoors(block, 60);
    block.dimension.playSound('random.orb', centre(block), { pitch: 1.5 });
    tell(player, 'reader.granted');
  } else {
    block.dimension.playSound('note.bass', centre(block), { pitch: 0.6 });
    tell(player, 'reader.denied');
  }
}

function openNearbyDoors(block, ticks) {
  for (let dx = -2; dx <= 2; dx++)
    for (let dy = -2; dy <= 2; dy++)
      for (let dz = -2; dz <= 2; dz++) {
        const b = block.offset({ x: dx, y: dy, z: dz });
        if (b?.typeId === `${NS}:cell_door`) {
          doorTimers.set(key(b), system.currentTick + ticks);
          setDoor(b, true);
        }
      }
}

function setDoor(lower, open) {
  if (getState(lower, 'open') === open) return;
  setState(lower, 'open', open);
  const upper = lower.above();
  if (upper?.typeId === `${NS}:cell_door_upper`) setState(upper, 'open', open);
  lower.dimension.playSound(open ? 'open.iron_door' : 'close.iron_door', centre(lower));
}

export function doorBeforePlace(e) {
  const above = e.block.above();
  if (!above?.isAir) e.cancel = true;
}

export function doorPlaced({ block }) {
  if (block.typeId !== `${NS}:cell_door`) return;
  const dir = block.permutation.getState('minecraft:cardinal_direction');
  block.above()?.setPermutation(BlockPermutation.resolve(`${NS}:cell_door_upper`, { 'minecraft:cardinal_direction': dir }));
}

export function doorBroken({ block, brokenBlockPermutation }) {
  const other = brokenBlockPermutation.type.id === `${NS}:cell_door` ? block.above() : block.below();
  if (other?.typeId.startsWith(`${NS}:cell_door`)) other.setType('minecraft:air');
}

export function doorTick({ block }) {
  if (block.typeId !== `${NS}:cell_door`) return;
  const held = (doorTimers.get(key(block)) ?? 0) > system.currentTick;
  const on = held || powered(block) || powered(block.above());
  setDoor(block, on);
}

// ---------------------------------------------------------------- pit trapdoor

const pitTimers = new Map(); // key -> close tick

function openPit(block) {
  // Open this trapdoor and every pit trapdoor joined to it (a whole pit opens at once).
  const seen = new Set();
  const queue = [block];
  while (queue.length && seen.size < 49) {
    const b = queue.shift();
    if (!b || b.typeId !== `${NS}:pit_trapdoor` || seen.has(key(b))) continue;
    seen.add(key(b));
    if (!getState(b, 'open')) setState(b, 'open', true);
    pitTimers.set(key(b), system.currentTick + 60);
    for (const d of ['north', 'south', 'east', 'west']) queue.push(b.offset(DIR[d]));
  }
  block.dimension.playSound('random.door_open', centre(block), { pitch: 0.6 });
}

export function pitStepOn({ block, entity }) {
  if (!entity || ignorable(entity)) return;
  if (entity.typeId === 'minecraft:player' && entity.isSneaking) return;
  system.runTimeout(() => { if (block.isValid && block.typeId === `${NS}:pit_trapdoor`) openPit(block); }, 4);
}

export function pitTick({ block }) {
  if (powered(block)) {
    if (!getState(block, 'open')) openPit(block);
    pitTimers.set(key(block), system.currentTick + 20);
    return;
  }
  if (!getState(block, 'open')) return;
  if ((pitTimers.get(key(block)) ?? 0) > system.currentTick) return;
  const inside = block.dimension.getEntities({ location: centre(block), maxDistance: 1.2 }).some((e) => !ignorable(e));
  if (inside) return;
  pitTimers.delete(key(block));
  setState(block, 'open', false);
}

// ---------------------------------------------------------------- wire

export function wireTick({ block }, { params }) {
  for (const e of block.dimension.getEntities({ location: centre(block), maxDistance: 0.9 })) {
    if (ignorable(e) || e.typeId === 'minecraft:item') continue;
    try {
      e.addEffect('slowness', 30, { amplifier: 3, showParticles: false });
      e.applyDamage(params?.damage ?? 1, { cause: 'contact' });
    } catch {}
  }
}

// ---------------------------------------------------------------- winding bridge

const bridges = store('bridges'); // winch key -> deck length

export function winchTick({ block }) {
  const on = powered(block);
  setState(block, 'powered', on);
  const dirName = front(block);
  const d = DIR[dirName];
  const k = key(block);
  let n = bridges.get(k) ?? 0;
  if (on && n < 12) {
    const next = block.offset(add({ x: 0, y: 0, z: 0 }, d, n + 1));
    if (next && (next.isAir || next.isLiquid || /short_grass|snow_layer/.test(next.typeId))) {
      next.setPermutation(BlockPermutation.resolve(`${NS}:bridge_deck`, { 'minecraft:cardinal_direction': dirName }));
      bridges.set(k, n + 1);
      block.dimension.playSound('dig.wood', centre(next), { pitch: 1.3 });
      block.dimension.playSound('random.click', centre(block), { pitch: 0.7 });
    }
  } else if (!on && n > 0) {
    const last = block.offset(add({ x: 0, y: 0, z: 0 }, d, n));
    if (last?.typeId === `${NS}:bridge_deck`) last.setType('minecraft:air');
    bridges.set(k, n - 1 || undefined);
    block.dimension.playSound('random.click', centre(block), { pitch: 0.6 });
  }
}

export function winchBroken({ block }) {
  bridges.set(key(block), undefined);
}

// ---------------------------------------------------------------- bombs

const TIMERS = [5, 10, 30, 60];
const bombs = store('bombs'); // bomb key -> detonation tick

export function explode(block, power = 4) {
  const loc = centre(block);
  const dim = block.dimension;
  block.setType('minecraft:air');
  // Not from inside the block's own tick callback: run it on the next tick.
  system.run(() => {
    try { dim.createExplosion(loc, power, { breaksBlocks: world.gameRules.tntExplodes ?? true }); } catch (e) { console.warn(`[secgear] explosion: ${e}`); }
  });
}

export function bombInteract({ block, player }) {
  if (!player) return;
  const item = heldItem(player);
  const armed = getState(block, 'armed');
  if (armed) {
    if (item?.typeId === 'minecraft:shears') {
      setState(block, 'armed', false);
      bombs.set(key(block), undefined);
      block.dimension.playSound('mob.sheep.shear', centre(block));
      tell(player, 'bomb.defused');
    }
    return;
  }
  const timer = getState(block, 'timer') ?? 1;
  if (player.isSneaking) return arm(block, player);
  const next = (timer + 1) % TIMERS.length;
  setState(block, 'timer', next);
  block.dimension.playSound('random.click', centre(block));
  tell(player, 'bomb.timer', TIMERS[next]);
}

function arm(block, player) {
  const seconds = TIMERS[getState(block, 'timer') ?? 1];
  setState(block, 'armed', true);
  bombs.set(key(block), system.currentTick + seconds * 20);
  block.dimension.playSound('random.fuse', centre(block));
  if (player) tell(player, 'bomb.armed', seconds);
}

export function bombTick({ block }) {
  if (!getState(block, 'armed')) {
    if (powered(block)) arm(block);
    return;
  }
  const at = bombs.get(key(block));
  if (at === undefined) return arm(block);
  const left = at - system.currentTick;
  if (left <= 0) {
    bombs.set(key(block), undefined);
    return explode(block, 4);
  }
  block.dimension.playSound('note.hat', centre(block), { pitch: left < 100 ? 2 : 1.5, volume: 1.5 });
}

export function bombBroken({ block }) {
  bombs.set(key(block), undefined);
}

// ---------------------------------------------------------------- connecting bars and walls

const CONNECTS = new Set([`${NS}:prison_bars`, `${NS}:prison_wall`]);
const SIDES = ['north', 'east', 'south', 'west'];

export function updateConnections(block) {
  if (!block || !CONNECTS.has(block.typeId)) return;
  let perm = block.permutation;
  for (const s of SIDES) {
    const n = block.offset(DIR[s]);
    const joins = !!n && (CONNECTS.has(n.typeId) || /glass_pane|iron_bars|wall|fence_gate/.test(n.typeId) || (!seeThrough(n) && !n.typeId.includes('door') && !n.typeId.startsWith(`${NS}:`)) || n.typeId === `${NS}:reinforced_concrete`);
    perm = perm.withState(`${NS}:${s}`, joins);
  }
  block.setPermutation(perm);
}

export function updateAround(block) {
  if (!block) return;
  updateConnections(block);
  for (const s of SIDES) updateConnections(block.offset(DIR[s]));
}

world.afterEvents.playerPlaceBlock.subscribe(({ block }) => updateAround(block));
world.afterEvents.playerBreakBlock.subscribe(({ block }) => updateAround(block));
