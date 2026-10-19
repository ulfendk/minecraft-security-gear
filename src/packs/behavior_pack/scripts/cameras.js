// Security cameras (entities), the camera linker and monitors. Bedrock can't
// draw a live picture on a block, so using a monitor switches your view to the
// camera instead. Sneak to leave the camera view.
import { system, world } from '@minecraft/server';
import { ActionFormData } from '@minecraft/server-ui';
import { add, centre, DIR, getState, heldItem, isCreative, key, NS, playerFacing, store, tell, YAW } from './util.js';

const CAMERA = `${NS}:security_camera`;
const TILT = 20;
const monitors = store('monitors'); // monitor key -> [camera entity ids]
const viewers = new Map(); // player id -> { camera id, index, count }

// ---------------------------------------------------------------- placing cameras

/** Camera item used on a block face: hang a camera there, looking away from the block. */
export function placeCamera({ source: player, block, blockFace }) {
  if (!player || !block) return;
  const face = blockFace.toLowerCase();
  const at = block.offset(DIR[face]);
  if (!at?.isAir) return;
  const facing = face === 'up' || face === 'down' ? oppositeOf(playerFacing(player)) : face;
  spawnCamera(block.dimension, at.location, facing, face === 'down');
  if (!isCreative(player)) {
    const inv = player.getComponent('minecraft:inventory').container;
    const item = inv.getItem(player.selectedSlotIndex);
    if (item.amount > 1) { item.amount -= 1; inv.setItem(player.selectedSlotIndex, item); } else inv.setItem(player.selectedSlotIndex, undefined);
  }
  block.dimension.playSound('random.click', at.location);
}

const oppositeOf = (d) => ({ north: 'south', south: 'north', east: 'west', west: 'east' })[d];

export function spawnCamera(dimension, loc, facing, ceiling = false) {
  const cam = dimension.spawnEntity(CAMERA, { x: loc.x + 0.5, y: loc.y, z: loc.z + 0.5 });
  cam.setRotation({ x: 0, y: YAW[facing] ?? 0 });
  cam.setProperty(`${NS}:ceiling`, ceiling);
  return cam;
}

// ---------------------------------------------------------------- linker

const linked = (item) => {
  try { return JSON.parse(item.getDynamicProperty(`${NS}:cameras`) ?? '[]'); } catch { return []; }
};

/** Linker used on a camera: remember it. Sneak with an empty hand: toggle panning. */
export function onInteractEntity({ player, target, itemStack }) {
  if (target?.typeId !== CAMERA) return;
  if (itemStack?.typeId === `${NS}:camera_linker`) {
    const list = linked(itemStack);
    if (list.includes(target.id)) return tell(player, 'linker.known', list.length);
    if (list.length >= 8) return tell(player, 'linker.full');
    list.push(target.id);
    itemStack.setDynamicProperty(`${NS}:cameras`, JSON.stringify(list));
    player.getComponent('minecraft:inventory').container.setItem(player.selectedSlotIndex, itemStack);
    player.playSound('random.orb');
    return tell(player, 'linker.added', list.length);
  }
  if (!itemStack && player.isSneaking) {
    const still = !target.getProperty(`${NS}:still`);
    target.setProperty(`${NS}:still`, still);
    tell(player, still ? 'camera.still' : 'camera.panning');
  }
}

// ---------------------------------------------------------------- monitors

export function linkMonitor(block, ids) {
  monitors.set(key(block), [...new Set(ids)].slice(0, 8));
}

function camerasOf(block) {
  const ids = monitors.get(key(block)) ?? [];
  return ids.map((id) => world.getEntity(id)).filter((e) => e?.isValid);
}

export function onMonitorInteract({ block, player }) {
  if (!player) return;
  const item = heldItem(player);
  if (item?.typeId === `${NS}:camera_linker`) {
    const list = linked(item);
    if (!list.length) return tell(player, 'linker.empty');
    linkMonitor(block, [...(monitors.get(key(block)) ?? []), ...list]);
    item.setDynamicProperty(`${NS}:cameras`, undefined);
    player.getComponent('minecraft:inventory').container.setItem(player.selectedSlotIndex, item);
    player.playSound('random.levelup', { pitch: 1.6, volume: 0.4 });
    return tell(player, 'linker.linked', (monitors.get(key(block)) ?? []).length);
  }
  const cams = camerasOf(block);
  if (!cams.length) return tell(player, 'monitor.none');
  if (cams.length === 1) return view(player, cams, 0);
  const form = new ActionFormData().title({ translate: `${NS}.monitor.pick` });
  cams.forEach((c, i) => form.button(c.nameTag || { translate: `${NS}.monitor.camera`, with: [String(i + 1)] }));
  system.run(() => form.show(player).then((r) => {
    if (!r.canceled && r.selection !== undefined) view(player, cams, r.selection);
  }));
}

function lens(cam) {
  const yaw = cam.getRotation().y * (Math.PI / 180);
  // Yaw 0 looks south (+z).
  return { x: cam.location.x - Math.sin(yaw) * 0.45, y: cam.location.y + 0.55, z: cam.location.z + Math.cos(yaw) * 0.45 };
}

/** Pan the same way as the camera's animation: +-40 degrees over 8 seconds. */
function panAt(t, still) {
  if (still) return 0;
  const p = (t % 160) / 160;
  return p < 0.5 ? -40 + 160 * p : 40 - 160 * (p - 0.5);
}

function view(player, cams, index) {
  const cam = cams[index];
  viewers.set(player.id, { camera: cam.id, index, count: cams.length });
  player.camera.setCamera('minecraft:free', { location: lens(cam), rotation: { x: TILT, y: cam.getRotation().y + panAt(system.currentTick, cam.getProperty(`${NS}:still`)) } });
  player.playSound('random.click');
}

function stopViewing(player) {
  viewers.delete(player.id);
  try { player.camera.clear(); } catch {}
}

/** Keep camera views up to date: follow the pan, show the HUD line, sneak to exit. */
system.runInterval(() => {
  for (const [pid, v] of viewers) {
    const player = world.getEntity(pid);
    if (!player?.isValid) { viewers.delete(pid); continue; }
    const cam = world.getEntity(v.camera);
    if (!cam?.isValid) {
      tell(player, 'monitor.lost');
      stopViewing(player);
      continue;
    }
    if (player.isSneaking) { stopViewing(player); continue; }
    player.camera.setCamera('minecraft:free', {
      location: lens(cam),
      rotation: { x: TILT, y: cam.getRotation().y + panAt(system.currentTick, cam.getProperty(`${NS}:still`)) },
      easeOptions: { easeTime: 0.25, easeType: 'Linear' },
    });
    tell(player, 'monitor.viewing', v.index + 1, v.count);
  }
}, 5);

world.afterEvents.entityHurt.subscribe(({ hurtEntity }) => {
  if (hurtEntity.typeId === 'minecraft:player' && viewers.has(hurtEntity.id)) stopViewing(hurtEntity);
});

export { camerasOf, centre, getState };
