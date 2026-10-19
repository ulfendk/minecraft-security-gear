// Items that aren't blocks: the camera linker, keycards, blueprints and the baton.
import { NS } from './lib/constants.mjs';
import { pixelIcon } from './lib/texture.mjs';
import { blueprintIcon, ICONS, keycardIcon } from './textures.mjs';
import { names, shaped, shapeless } from './blocks.mjs';

const PALETTE = {
  k: '#1b1d20', d: '#3a3d42', g: '#6b7078', l: '#b9bec4', w: '#f2f2f2', r: '#d8352a', s: '#e4e5e0',
  C: '#89b3e0', c: '#4f7fb8', G: '#3c8f3c', y: '#e8c547', o: '#58603f', b: '#4d5a3a', L: '#fff3b8',
};

ICONS.searchlight = [
  '................',
  '.....bbbbbb.....',
  '....bLLLLLLb....',
  '...bLLLLLLLLb...',
  '...bLLLLLLLLb...',
  '...bLLLLLLLLb...',
  '...bLLLLLLLLb...',
  '....bLLLLLLb....',
  '..g..bbbbbb..g..',
  '..g....dd....g..',
  '..gggggddggggg..',
  '.......dd.......',
  '.......dd.......',
  '....dddddddd....',
  '...dddddddddd...',
  '................',
];

export const KEYCARD_LEVELS = { guard_keycard: 1, officer_keycard: 2, warden_keycard: 3 };

export const items = [
  {
    id: 'camera_linker',
    name: names('Camera Linker', 'Kameraforbinder'),
    icon: pixelIcon(ICONS.camera_linker, PALETTE),
    stack: 1,
    recipe: shaped('camera_linker', ['IRI', 'IGI'], { I: 'iron_ingot', R: 'redstone', G: 'glass_pane' }),
  },
  ...Object.entries(KEYCARD_LEVELS).map(([cardId, level]) => {
    const { rows, palette } = keycardIcon(level);
    return {
      id: cardId,
      name: [names('Guard Keycard', 'Vagtnøglekort'), names('Officer Keycard', 'Betjentnøglekort'), names('Warden Keycard', 'Direktørnøglekort')][level - 1],
      icon: pixelIcon(rows, palette),
      stack: 1,
      level,
      recipe: level === 1
        ? shapeless('guard_keycard', ['paper', 'iron_nugget', 'lapis_lazuli'])
        : level === 2 ? shapeless('officer_keycard', [`${NS}:guard_keycard`, 'gold_ingot']) : shapeless('warden_keycard', [`${NS}:officer_keycard`, 'diamond']),
    };
  }),
  ...['guard_tower', 'prison_cell', 'gatehouse'].map((kind) => {
    const { rows, palette } = blueprintIcon(kind);
    return {
      id: `${kind}_blueprint`,
      name: {
        guard_tower: names('Guard Tower Blueprint', 'Vagttårn-tegning'),
        prison_cell: names('Prison Cell Blueprint', 'Fængselscelle-tegning'),
        gatehouse: names('Gatehouse Blueprint', 'Porthus-tegning'),
      }[kind],
      icon: pixelIcon(rows, palette),
      stack: 16,
      structure: kind,
      recipe: {
        guard_tower: shaped('guard_tower_blueprint', ['SSS', 'SPS', 'SLS'], { S: 'stone_bricks', P: 'paper', L: 'ladder' }),
        prison_cell: shaped('prison_cell_blueprint', ['RRR', 'RPR', 'RBR'], { R: `${NS}:reinforced_concrete`, P: 'paper', B: `${NS}:prison_bars` }),
        gatehouse: shaped('gatehouse_blueprint', ['RER', 'RPR', 'RRR'], { R: `${NS}:reinforced_concrete`, E: `${NS}:laser_fence`, P: 'paper' }),
      }[kind],
    };
  }),
  {
    id: 'baton',
    name: names('Baton', 'Knippel'),
    icon: pixelIcon(ICONS.baton, PALETTE),
    stack: 1,
    handheld: true,
    damage: 5,
    durability: 250,
    recipe: shaped('baton', ['N', 'I', 'S'], { N: 'iron_nugget', I: 'iron_ingot', S: 'stick' }),
  },
];

/** Flat icons for blocks whose Java item can't use the block model. */
export const BLOCK_ICONS = {
  security_camera: pixelIcon(ICONS.security_camera, PALETTE),
  searchlight: pixelIcon(ICONS.searchlight, PALETTE),
};
