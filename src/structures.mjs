// Blueprint structures, drawn as map layers seen from above with north up, as
// if the player faced north. Rows run north -> south, columns west -> east and
// layers bottom -> top. The builder turns everything to the player's facing.
//   ' ' must be (and becomes) air     '.' is left untouched
// Facing values in the palette are in that north-facing frame.
import { NS } from './lib/constants.mjs';

const P = {
  S: { java: 'minecraft:stone_bricks', bedrock: { id: 'minecraft:stone_bricks' } },
  P: { java: 'minecraft:spruce_planks', bedrock: { id: 'minecraft:spruce_planks' } },
  R: { java: `${NS}:reinforced_concrete`, bedrock: { id: `${NS}:reinforced_concrete` } },
  W: { java: `${NS}:prison_wall`, bedrock: { id: `${NS}:prison_wall` } },
  B: { java: `${NS}:prison_bars`, bedrock: { id: `${NS}:prison_bars` } },
  F: { java: 'minecraft:spruce_fence', bedrock: { id: 'minecraft:spruce_fence' } },
  V: { java: 'minecraft:stone_brick_slab', props: { type: 'bottom' }, bedrock: { id: 'minecraft:stone_brick_slab', states: { 'minecraft:vertical_half': 'bottom' } } },
  O: { java: 'minecraft:glass_pane', bedrock: { id: 'minecraft:glass_pane' } },
  L: { java: 'minecraft:ladder', facing: 'south', bedrock: { id: 'minecraft:ladder', facingState: 'ladder' } },
  D: { java: 'minecraft:daylight_detector', props: { inverted: 'true' }, bedrock: { id: 'minecraft:daylight_detector_inverted' } },
  H: { java: `${NS}:searchlight`, facing: 'north', bedrock: { id: `${NS}:searchlight`, facingState: 'cardinal' } },
  N: { java: 'minecraft:lantern', props: { hanging: 'true' }, bedrock: { id: 'minecraft:lantern', states: { hanging: true } } },
  d: { java: `${NS}:cell_door`, props: { half: 'lower' }, facing: 'north', bedrock: { id: `${NS}:cell_door`, facingState: 'cardinal' } },
  u: { java: `${NS}:cell_door`, props: { half: 'upper' }, facing: 'north', bedrock: { id: `${NS}:cell_door_upper`, facingState: 'cardinal' } },
  K: { java: `${NS}:keycard_reader`, facing: 'south', bedrock: { id: `${NS}:keycard_reader`, facingState: 'cardinal' } },
  E: { java: `${NS}:laser_fence`, facing: 'east', bedrock: { id: `${NS}:laser_fence`, facingState: 'facing' } },
  Q: { java: `${NS}:laser_receiver`, facing: 'west', bedrock: { id: `${NS}:laser_receiver`, facingState: 'facing' } },
  M: { java: `${NS}:monitor`, facing: 'south', bedrock: { id: `${NS}:monitor`, facingState: 'cardinal' }, link: 'monitor' },
  C: { java: `${NS}:security_camera`, facing: 'east', bedrock: { camera: true }, link: 'camera' },
  X: { java: 'minecraft:lever', props: { face: 'floor' }, facing: 'east', bedrock: { id: 'minecraft:lever', facingState: 'lever' } },
  G: { spawn: `${NS}:security_guard` },
};

const layers = (...ls) => ls;
const repeat = (n, layer) => Array.from({ length: n }, () => layer);

export const structures = {
  guard_tower: {
    layers: layers(
      ...repeat(2, ['S...S', '.SSS.', '.SLS.', '.S S.', 'S...S']),
      ...repeat(4, ['S...S', '.SSS.', '.SLS.', '.SSS.', 'S...S']),
      ['PPPPP', 'PPPPP', 'PPLPP', 'PPPPP', 'PPPPP'],
      ['WWWWW', 'WHD W', 'W   W', 'W  GW', 'WWWWW'],
      ['F   F', '     ', '     ', '     ', 'F   F'],
      ['VVVVV', 'VVVVV', 'VVVVV', 'VVVVV', 'VVVVV'],
    ),
  },
  prison_cell: {
    layers: layers(
      ['RRRRR', 'RRRRR', 'RRRRR', 'RRRRR', 'RRRRR', '.....'],
      ['RRRRR', 'R   R', 'R   R', 'R   R', 'RBdRR', '...K.'],
      ['RRRRR', 'R   R', 'R N R', 'R   R', 'RBuRR', '.....'],
      ['RRRRR', 'RRRRR', 'RRRRR', 'RRRRR', 'RRRRR', '.....'],
    ),
  },
  gatehouse: {
    layers: layers(
      ['RRRR......', 'RRRR.....R', 'RRRR......', 'RRRR......'],
      ['RRRR......', 'RMXE     Q', '   R......', 'RRRR......'],
      ['ROOR......', 'R  R     R', '   R......', 'ROOR......'],
      ['RRRR......', 'RRRR......', 'RRRR......', 'RRRC......'],
    ),
  },
};

/** Flattened form for the Java mod and the Bedrock scripts: palette + layers. */
export function structureData() {
  return { palette: P, structures };
}
