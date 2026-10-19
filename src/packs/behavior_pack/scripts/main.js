// Security Gear: registers the custom block and item components.
import { system, world } from '@minecraft/server';
import { onInteractEntity, onMonitorInteract, placeCamera } from './cameras.js';
import {
  bombBroken, bombInteract, bombTick, doorBeforePlace, doorBroken, doorPlaced, doorTick, laserTick, motionTick, pitStepOn, pitTick,
  readerInteract, searchlightTick, sirenTick, tripwireTick, winchBroken, winchTick, wireTick,
} from './devices.js';
import { useBlueprint } from './blueprints.js';
import { NS } from './util.js';
import './selftest.js';

system.beforeEvents.startup.subscribe(({ blockComponentRegistry: blocks, itemComponentRegistry: items }) => {
  blocks.registerCustomComponent(`${NS}:laser`, { onTick: laserTick });
  blocks.registerCustomComponent(`${NS}:output`, {});
  blocks.registerCustomComponent(`${NS}:motion_sensor`, { onTick: motionTick });
  blocks.registerCustomComponent(`${NS}:siren`, { onTick: sirenTick });
  blocks.registerCustomComponent(`${NS}:searchlight`, { onTick: searchlightTick });
  blocks.registerCustomComponent(`${NS}:keycard_reader`, { onPlayerInteract: readerInteract });
  blocks.registerCustomComponent(`${NS}:monitor`, { onPlayerInteract: onMonitorInteract });
  blocks.registerCustomComponent(`${NS}:cell_door`, { beforeOnPlayerPlace: doorBeforePlace, onPlace: doorPlaced, onPlayerBreak: doorBroken, onTick: doorTick });
  blocks.registerCustomComponent(`${NS}:pit_trapdoor`, { onStepOn: pitStepOn, onTick: pitTick });
  blocks.registerCustomComponent(`${NS}:wire`, { onTick: wireTick });
  blocks.registerCustomComponent(`${NS}:winch`, { onTick: winchTick, onPlayerBreak: winchBroken });
  blocks.registerCustomComponent(`${NS}:timed_bomb`, { onPlayerInteract: bombInteract, onTick: bombTick, onPlayerBreak: bombBroken });
  blocks.registerCustomComponent(`${NS}:tripwire_bomb`, { onTick: tripwireTick });

  items.registerCustomComponent(`${NS}:camera_item`, { onUseOn: placeCamera });
  items.registerCustomComponent(`${NS}:linker`, {});
  items.registerCustomComponent(`${NS}:keycard`, {});
  items.registerCustomComponent(`${NS}:blueprint`, { onUseOn: useBlueprint });
  items.registerCustomComponent(`${NS}:baton`, {
    onHitEntity: ({ hitEntity }) => {
      try { hitEntity.addEffect('slowness', 60, { amplifier: 1 }); } catch {}
    },
  });
});

world.afterEvents.playerInteractWithEntity.subscribe(onInteractEntity);
console.log('[Security Gear] loaded');
