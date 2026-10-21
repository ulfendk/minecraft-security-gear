// In-game self test, run by tools/bds-test.sh with `/scriptevent secgear:selftest`.
// Builds small test rigs in a flat world and logs SELFTEST PASS/FAIL lines.
import { BlockPermutation, system, world } from '@minecraft/server';
import { buildStructure } from './blueprints.js';
import { grantAccess } from './devices.js';
import { NS } from './util.js';

const wait = (ticks) => new Promise((r) => system.runTimeout(r, ticks));
const Y = -60;

async function run() {
  console.log('SELFTEST START');
  const dim = world.getDimension('overworld');
  const results = [];
  const check = (name, ok, detail = '') => {
    results.push(ok);
    console.log(`SELFTEST ${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`);
  };
  const set = (x, y, z, id, states = {}) => dim.getBlock({ x, y, z }).setPermutation(BlockPermutation.resolve(id, states));
  const state = (x, y, z, s) => dim.getBlock({ x, y, z })?.permutation.getState(`${NS}:${s}`);
  const type = (x, y, z) => dim.getBlock({ x, y, z })?.typeId;

  // Laser tripwire: a cow standing in the beam powers the receiver.
  set(4, Y, 4, `${NS}:laser_emitter`, { 'minecraft:block_face': 'east' });
  set(10, Y, 4, `${NS}:laser_receiver`, { 'minecraft:block_face': 'west' });
  const cow = dim.spawnEntity('minecraft:cow', { x: 7.5, y: Y, z: 4.5 });
  // Keep the cow in the beam; left alone it can wander out before the check.
  cow.addEffect('slowness', 200, { amplifier: 255, showParticles: false });
  // Motion sensor looking east at a pig.
  set(4, Y, 8, `${NS}:motion_sensor`, { 'minecraft:block_face': 'east' });
  dim.spawnEntity('minecraft:pig', { x: 7.5, y: Y, z: 8.5 }).addEffect('slowness', 200, { amplifier: 255, showParticles: false });
  // Winding bridge, powered by a redstone block.
  set(4, Y, 12, `${NS}:bridge_winch`, { 'minecraft:cardinal_direction': 'east' });
  set(3, Y, 12, 'minecraft:redstone_block');
  // Siren and searchlight, both powered.
  set(4, Y, 16, `${NS}:alarm_siren`, { 'minecraft:block_face': 'up' });
  set(3, Y, 16, 'minecraft:redstone_block');
  set(8, Y, 16, `${NS}:searchlight`, { 'minecraft:cardinal_direction': 'north' });
  set(7, Y, 16, 'minecraft:redstone_block');
  // Cell door opened by redstone.
  set(12, Y, 16, `${NS}:cell_door`, { 'minecraft:cardinal_direction': 'north' });
  set(12, Y + 1, 16, `${NS}:cell_door_upper`, { 'minecraft:cardinal_direction': 'north' });
  set(11, Y, 16, 'minecraft:redstone_block');

  await wait(30);
  check('laser_receiver', state(10, Y, 4, 'powered') === true);
  check('motion_sensor', state(4, Y, 8, 'powered') === true);
  check('siren', state(4, Y, 16, 'powered') === true);
  check('searchlight', state(8, Y, 16, 'powered') === true);
  check('cell_door', state(12, Y, 16, 'open') === true);
  cow.remove();

  await wait(80);
  let deck = 0;
  for (let x = 5; x <= 16; x++) if (type(x, Y, 12) === `${NS}:bridge_deck`) deck++;
  check('bridge_extends', deck === 12, `(${deck} deck blocks)`);
  set(3, Y, 12, 'minecraft:air');

  await wait(100);
  deck = 0;
  for (let x = 5; x <= 16; x++) if (type(x, Y, 12) === `${NS}:bridge_deck`) deck++;
  check('bridge_retracts', deck === 0, `(${deck} deck blocks)`);

  // Keycard reader on the wall beside a cell door: a valid card opens the door, which closes again on its own.
  set(17, Y + 1, 21, 'minecraft:stone_bricks');
  set(17, Y + 1, 20, `${NS}:keycard_reader`, { 'minecraft:cardinal_direction': 'north' });
  set(16, Y, 20, `${NS}:cell_door`, { 'minecraft:cardinal_direction': 'north' });
  set(16, Y + 1, 20, `${NS}:cell_door_upper`, { 'minecraft:cardinal_direction': 'north' });
  await wait(10);
  grantAccess(dim.getBlock({ x: 17, y: Y + 1, z: 20 }));
  await wait(10);
  check('reader_opens_door', state(16, Y, 20, 'open') === true);
  await wait(100);
  check('reader_door_closes', state(16, Y, 20, 'open') === false, `(reader powered: ${state(17, Y + 1, 20, 'powered')})`);

  // Blueprints
  for (const [i, name] of ['guard_tower', 'prison_cell', 'gatehouse'].entries()) {
    const r = buildStructure(dim, name, { x: 2 + i * 14, y: Y, z: 40 }, 'north');
    check(`blueprint_${name}`, r.ok && r.placed > 20, `(${r.placed} blocks)`);
  }
  const inmates = dim.getEntities({ type: `${NS}:criminal`, location: { x: 16, y: Y, z: 40 }, maxDistance: 10 });
  check('prison_cell_inmate', inmates.length === 1, `(${inmates.length} criminals, outfit ${inmates[0]?.getComponent('minecraft:variant')?.value})`);

  // Timed bomb on a 5 second fuse, armed by redstone.
  set(24, Y, 24, `${NS}:timed_bomb`, { [`${NS}:timer`]: 0 });
  set(24, Y, 25, 'minecraft:redstone_block');
  await wait(40);
  check('timed_bomb_armed', state(24, Y, 24, 'armed') === true);
  await wait(120);
  check('timed_bomb_exploded', type(24, Y, 24) !== `${NS}:timed_bomb`, `(${type(24, Y, 24)})`);

  const passed = results.filter(Boolean).length;
  console.log(`SELFTEST DONE ${passed}/${results.length}`);
}

system.afterEvents.scriptEventReceive.subscribe((e) => {
  if (e.id !== `${NS}:selftest`) return;
  run().catch((err) => console.log(`SELFTEST FAIL exception ${err}\n${err?.stack ?? ''}`));
});
