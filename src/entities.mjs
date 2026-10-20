// Bedrock entity definitions (behavior + client) for the security guard, the
// guard dog and the security camera. On Java these are hand-written classes.
import { NS } from './lib/constants.mjs';
import { camera, dog, guard } from './models.mjs';

const anim = (id, name) => `animation.${NS}.${id}.${name}`;
const monsters = { any_of: [{ test: 'is_family', subject: 'other', value: 'monster' }] };

// ---------------------------------------------------------------- behaviour

function guardEntity() {
  const variants = Object.fromEntries(guard.variants.map((_, i) => [`${NS}:variant_${i}`, { 'minecraft:variant': { value: i } }]));
  return {
    format_version: '1.21.90',
    'minecraft:entity': {
      description: { identifier: `${NS}:security_guard`, spawn_category: 'creature', is_spawnable: true, is_summonable: true },
      component_groups: variants,
      components: {
        'minecraft:type_family': { family: ['security_guard', 'guard', 'mob'] },
        'minecraft:collision_box': { width: 0.6, height: 1.95 },
        'minecraft:health': { value: 30, max: 30 },
        'minecraft:movement': { value: 0.3 },
        'minecraft:navigation.walk': { can_path_over_water: true, can_open_doors: true, avoid_damage_blocks: true },
        'minecraft:movement.basic': {},
        'minecraft:jump.static': {},
        'minecraft:can_climb': {},
        'minecraft:physics': {},
        'minecraft:pushable': { is_pushable: true, is_pushable_by_piston: true },
        'minecraft:nameable': {},
        'minecraft:persistent': {},
        'minecraft:attack': { damage: 5, effect_name: 'slowness', effect_duration: 3 },
        'minecraft:follow_range': { value: 24 },
        'minecraft:conditional_bandwidth_optimization': {},
        'minecraft:behavior.float': { priority: 0 },
        'minecraft:behavior.melee_attack': { priority: 2, speed_multiplier: 1.2, track_target: true },
        'minecraft:behavior.hurt_by_target': { priority: 1 },
        'minecraft:behavior.nearest_attackable_target': {
          priority: 2, must_see: true, reselect_targets: true,
          entity_types: [{ filters: monsters, max_dist: 16 }],
        },
        'minecraft:behavior.random_stroll': { priority: 7, speed_multiplier: 0.8, xz_dist: 8 },
        'minecraft:behavior.look_at_player': { priority: 8, look_distance: 8, probability: 0.05 },
        'minecraft:behavior.random_look_around': { priority: 9 },
      },
      events: {
        'minecraft:entity_spawned': {
          randomize: guard.variants.map((_, i) => ({ weight: 1, add: { component_groups: [`${NS}:variant_${i}`] } })),
        },
      },
    },
  };
}

function dogEntity() {
  const wild = {
    'minecraft:tameable': { probability: 0.34, tame_items: 'minecraft:bone', tame_event: { event: `${NS}:on_tame`, target: 'self' } },
    'minecraft:behavior.random_stroll': { priority: 8, speed_multiplier: 1 },
    'minecraft:health': { value: 20, max: 20 },
    'minecraft:despawn': { despawn_from_distance: {} },
  };
  const tame = {
    'minecraft:is_tamed': {},
    'minecraft:sittable': {},
    'minecraft:health': { value: 30, max: 30 },
    'minecraft:healable': { items: [{ item: 'minecraft:bone', heal_amount: 4 }, { item: 'minecraft:cooked_beef', heal_amount: 8 }] },
    'minecraft:behavior.follow_owner': { priority: 6, speed_multiplier: 1.1, start_distance: 10, stop_distance: 2 },
    'minecraft:behavior.owner_hurt_by_target': { priority: 1 },
    'minecraft:behavior.owner_hurt_target': { priority: 2 },
    'minecraft:behavior.nearest_attackable_target': {
      priority: 3, must_see: true, reselect_targets: true, entity_types: [{ filters: monsters, max_dist: 16 }],
    },
    'minecraft:behavior.random_stroll': { priority: 9, speed_multiplier: 1 },
    'minecraft:persistent': {},
  };
  return {
    format_version: '1.21.90',
    'minecraft:entity': {
      description: { identifier: `${NS}:guard_dog`, spawn_category: 'creature', is_spawnable: true, is_summonable: true },
      component_groups: { [`${NS}:wild`]: wild, [`${NS}:tame`]: tame },
      components: {
        'minecraft:type_family': { family: ['guard_dog', 'dog', 'mob'] },
        'minecraft:collision_box': { width: 0.7, height: 0.9 },
        'minecraft:movement': { value: 0.32 },
        'minecraft:navigation.walk': { can_path_over_water: true, avoid_damage_blocks: true },
        'minecraft:movement.basic': {},
        'minecraft:jump.static': {},
        'minecraft:physics': {},
        'minecraft:pushable': { is_pushable: true, is_pushable_by_piston: true },
        'minecraft:nameable': {},
        'minecraft:leashable': {},
        'minecraft:attack': { damage: 4 },
        'minecraft:conditional_bandwidth_optimization': {},
        'minecraft:behavior.float': { priority: 0 },
        'minecraft:behavior.stay_while_sitting': { priority: 1 },
        'minecraft:behavior.leap_at_target': { priority: 4, yd: 0.4, must_be_on_ground: true },
        'minecraft:behavior.melee_attack': { priority: 5, speed_multiplier: 1.3, track_target: true },
        'minecraft:behavior.hurt_by_target': { priority: 2 },
        'minecraft:behavior.look_at_player': { priority: 10, look_distance: 8 },
        'minecraft:behavior.random_look_around': { priority: 11 },
      },
      events: {
        'minecraft:entity_spawned': { add: { component_groups: [`${NS}:wild`] } },
        [`${NS}:on_tame`]: { remove: { component_groups: [`${NS}:wild`] }, add: { component_groups: [`${NS}:tame`] } },
      },
    },
  };
}

/** The camera is a motionless entity that only players can knock down (it drops itself). */
function cameraEntity() {
  return {
    format_version: '1.21.90',
    'minecraft:entity': {
      description: {
        identifier: `${NS}:security_camera`, is_spawnable: false, is_summonable: true,
        properties: {
          [`${NS}:ceiling`]: { type: 'bool', default: false, client_sync: true },
          [`${NS}:still`]: { type: 'bool', default: false, client_sync: true },
        },
      },
      components: {
        'minecraft:type_family': { family: ['security_camera', 'inanimate'] },
        'minecraft:collision_box': { width: 0.6, height: 0.7 },
        'minecraft:health': { value: 6, max: 6 },
        'minecraft:physics': { has_gravity: false, has_collision: false },
        'minecraft:pushable': { is_pushable: false, is_pushable_by_piston: false },
        'minecraft:knockback_resistance': { value: 1 },
        'minecraft:persistent': {},
        'minecraft:nameable': {},
        'minecraft:fire_immune': {},
        // Makes the camera interactable, so the script's playerInteractWithEntity fires (and touch shows a button).
        'minecraft:interact': {
          interactions: [
            { on_interact: { filters: { test: 'has_equipment', subject: 'other', domain: 'hand', value: `${NS}:camera_linker` } }, interact_text: `${NS}.camera.link` },
            { on_interact: { filters: { test: 'is_sneaking', subject: 'other' } }, interact_text: `${NS}.camera.toggle` },
          ],
        },
        'minecraft:loot': { table: `loot_tables/entities/${NS}_security_camera.json` },
        'minecraft:damage_sensor': {
          triggers: [
            { on_damage: { filters: { test: 'is_family', subject: 'other', value: 'player' } }, deals_damage: 'yes' },
            { cause: 'entity_explosion', deals_damage: 'yes' },
            { cause: 'block_explosion', deals_damage: 'yes' },
            { deals_damage: 'no' },
          ],
        },
      },
    },
  };
}

// ---------------------------------------------------------------- client

function moveController(id, states) {
  const s = {
    default: { animations: ['idle'], transitions: states.map(([name, , cond]) => ({ [name]: cond })), blend_transition: 0.2 },
  };
  states.forEach(([name, a, cond], i) => {
    s[name] = {
      animations: [a],
      transitions: [...states.slice(0, i).map(([n, , c]) => ({ [n]: c })), { default: `!(${cond})` }],
      blend_transition: 0.2,
    };
  });
  return { initial_state: 'default', states: s };
}

const attackController = {
  initial_state: 'default',
  states: {
    default: { transitions: [{ attacking: 'variable.attack_time > 0' }] },
    attacking: { animations: ['attack'], transitions: [{ default: 'query.all_animations_finished' }] },
  },
};

function clientEntity(spec, { textures, animations, animate, renderController, egg }) {
  return {
    format_version: '1.10.0',
    'minecraft:client_entity': {
      description: {
        identifier: `${NS}:${spec.id}`,
        materials: { default: 'entity_alphatest' },
        textures,
        geometry: { default: `geometry.${NS}.${spec.id}` },
        animations,
        scripts: { animate },
        render_controllers: [renderController],
        ...(egg ? { spawn_egg: { base_color: egg[0], overlay_color: egg[1] } } : {}),
        enable_attachables: false,
      },
    },
  };
}

export function bedrockEntities() {
  const files = { bp: {}, rp: {} };
  const ctrl = (id, controllers) => ({ format_version: '1.10.0', animation_controllers: controllers });

  // Guard
  files.bp[`entities/security_guard.json`] = guardEntity();
  const guardTextures = { default: `textures/entity/${NS}/security_guard` };
  guard.variants.forEach((v, i) => { if (i) guardTextures[`skin${i}`] = `textures/entity/${NS}/security_guard_skin${i}`; });
  files.rp[`entity/security_guard.entity.json`] = clientEntity(guard, {
    textures: guardTextures,
    animations: {
      ...Object.fromEntries(Object.keys(guard.anims).map((n) => [n, anim('security_guard', n)])),
      look_at_target: `animation.${NS}.common.look_at_target`,
      move_controller: `controller.animation.${NS}.security_guard.move`,
      attack_controller: `controller.animation.${NS}.security_guard.attack`,
    },
    animate: ['move_controller', 'attack_controller', 'look_at_target'],
    renderController: `controller.render.${NS}.security_guard`,
    egg: guard.egg,
  });
  files.rp[`animation_controllers/security_guard.animation_controllers.json`] = ctrl('security_guard', {
    [`controller.animation.${NS}.security_guard.move`]: moveController('security_guard', [
      ['running', 'run', 'query.ground_speed > 4.5'], ['walking', 'walk', 'query.ground_speed > 0.4'],
    ]),
    [`controller.animation.${NS}.security_guard.attack`]: attackController,
  });
  files.rp[`render_controllers/security_guard.render_controllers.json`] = {
    format_version: '1.8.0',
    render_controllers: {
      [`controller.render.${NS}.security_guard`]: {
        arrays: { textures: { 'Array.skins': ['Texture.default', ...guard.variants.slice(1).map((_, i) => `Texture.skin${i + 1}`)] } },
        geometry: 'Geometry.default',
        materials: [{ '*': 'Material.default' }],
        textures: ['Array.skins[query.variant]'],
      },
    },
  };

  // Dog
  files.bp[`entities/guard_dog.json`] = dogEntity();
  files.rp[`entity/guard_dog.entity.json`] = clientEntity(dog, {
    textures: { default: `textures/entity/${NS}/guard_dog` },
    animations: {
      ...Object.fromEntries(Object.keys(dog.anims).map((n) => [n, anim('guard_dog', n)])),
      look_at_target: `animation.${NS}.common.look_at_target`,
      move_controller: `controller.animation.${NS}.guard_dog.move`,
      attack_controller: `controller.animation.${NS}.guard_dog.attack`,
    },
    animate: ['move_controller', 'attack_controller', { look_at_target: '!query.is_sitting' }],
    renderController: `controller.render.${NS}.guard_dog`,
    egg: dog.egg,
  });
  files.rp[`animation_controllers/guard_dog.animation_controllers.json`] = ctrl('guard_dog', {
    [`controller.animation.${NS}.guard_dog.move`]: moveController('guard_dog', [
      ['sitting', 'sit', 'query.is_sitting'], ['running', 'run', 'query.ground_speed > 5'], ['walking', 'walk', 'query.ground_speed > 0.4'],
    ]),
    [`controller.animation.${NS}.guard_dog.attack`]: attackController,
  });
  files.rp[`render_controllers/guard_dog.render_controllers.json`] = {
    format_version: '1.8.0',
    render_controllers: { [`controller.render.${NS}.guard_dog`]: { geometry: 'Geometry.default', materials: [{ '*': 'Material.default' }], textures: ['Texture.default'] } },
  };

  // Camera
  files.bp[`entities/security_camera.json`] = cameraEntity();
  files.rp[`entity/security_camera.entity.json`] = clientEntity(camera, {
    textures: { default: `textures/entity/${NS}/security_camera` },
    animations: { pan: anim('security_camera', 'pan') },
    animate: [{ pan: `!query.property('${NS}:still')` }],
    renderController: `controller.render.${NS}.security_camera`,
  });
  files.rp[`render_controllers/security_camera.render_controllers.json`] = {
    format_version: '1.8.0',
    render_controllers: {
      [`controller.render.${NS}.security_camera`]: {
        geometry: 'Geometry.default',
        materials: [{ '*': 'Material.default' }],
        textures: ['Texture.default'],
        part_visibility: [
          { wall_mount: `!query.property('${NS}:ceiling')` },
          { ceiling_mount: `query.property('${NS}:ceiling')` },
        ],
      },
    },
  };
  files.bp[`loot_tables/entities/${NS}_security_camera.json`] = {
    pools: [{ rolls: 1, entries: [{ type: 'item', name: `${NS}:security_camera`, weight: 1 }] }],
  };

  files.rp['sounds.json'] = {
    entity_sounds: {
      entities: {
        [`${NS}:security_guard`]: { volume: 1, pitch: [0.9, 1.1], events: { hurt: 'game.player.hurt', death: 'game.player.die' } },
        [`${NS}:guard_dog`]: { volume: 1, pitch: [0.9, 1.1], events: { ambient: 'mob.wolf.bark', hurt: 'mob.wolf.hurt', death: 'mob.wolf.death' } },
      },
    },
  };
  files.rp[`animations/common.animation.json`] = {
    format_version: '1.8.0',
    animations: {
      [`animation.${NS}.common.look_at_target`]: {
        loop: true,
        bones: { head: { relative_to: { rotation: 'entity' }, rotation: ['query.target_x_rotation', 'query.target_y_rotation', 0.0] } },
      },
    },
  };
  return files;
}
