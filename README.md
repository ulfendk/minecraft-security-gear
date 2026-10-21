# Security Gear

A Minecraft **Bedrock Edition** add-on and **Java Edition** (Fabric) mod full of security gear: security cameras with monitors that show the camera's live picture, laser tripwires and laser fences, motion sensors, alarm sirens, searchlights, keycard readers and cell doors, prison walls and bars, barbed and razor wire, pit trapdoors, timed and tripwire bombs, winding rope bridges, blueprints for guard towers, prison cells and gatehouses, security guards with guard dogs, and criminals to lock up.

**Download and info: https://ulfendk.github.io/minecraft-security-gear/** (på dansk: https://ulfendk.github.io/minecraft-security-gear/da/)

## Features
- **Security cameras** on walls or ceilings that pan slowly from side to side. Link up to 8 to a **monitor** with a Camera Linker.
  - On Java, the monitor shows the camera's **live picture**, with a camera label, a clock and a blinking REC dot.
  - Use the monitor to look through the camera (sneak to stop). Sneak and use it to switch camera.
- **Laser tripwires** shoot a red beam up to 16 blocks, and a **laser receiver** gives a redstone pulse when something crosses it. **Laser fences** (blue) also burn whatever walks through them. A redstone signal switches a laser off.
- **Motion sensors** see creatures within 8 blocks (sneak past them). **Alarm sirens** flash and wail.
- **Searchlights** sweep the yard and really light up the spot the beam lands on. An inverted daylight sensor turns them on at night.
- **Keycard readers** and **Guard, Officer and Warden keycards** open the **cell door** next to the reader.
- **Prison walls, reinforced concrete and prison bars** are hard and blast proof. **Barbed and razor wire** slow you down and cut.
- **Pit trapdoors** look like stone bricks. Step on one and the whole pit swings open, then closes again.
- **Timed bombs** take a 5, 10, 30 or 60 second fuse, beep as they count down, and can be defused with shears. **Tripwire bombs** string a wire up to 8 blocks. Both respect the TNT game rule.
- **Bridge winches** wind out a rope bridge, plank by plank, when powered, and wind it back in without power.
- **Blueprints** build a guard tower (with a searchlight and a guard), a prison cell (with a keycard door and an inmate) or a gatehouse (with a laser fence, a camera and a monitor), right in front of you.
- **Criminals** to lock up: a striped convict, an inmate in an orange jumpsuit, a masked burglar and a gangster. They keep away from guard dogs and hit back when hit, and guards leave them alone. The prison cell blueprint comes with one inside.
  - The **brute** is the big one: a broad, muscular inmate in a tank top (still under two blocks tall, so he fits in a cell), twice as tough, hits hard, hard to push back and not afraid of dogs.
- **Security guards** patrol and fight hostile mobs. **Guard dogs** (German shepherds) can be tamed with bones. The guard's **baton** slows down whoever it hits.
- English and Danish.

## Install
1. Download `SecurityGear.mcaddon` from the [latest release](https://github.com/ulfendk/minecraft-security-gear/releases/latest).
2. Open it on Windows, Android or iOS. Minecraft imports both packs.
3. In your world settings, turn on **Security Gear** under *Behavior Packs*.

Requires Minecraft Bedrock 1.21.130 or newer.

### Java Edition
1. Install [Fabric Loader](https://fabricmc.net/use/installer/) for Minecraft 26.3.
2. Download `security-gear-fabric-<version>.jar` from the [latest release](https://github.com/ulfendk/minecraft-security-gear/releases/latest), plus [Fabric API](https://modrinth.com/mod/fabric-api) and [GeckoLib](https://modrinth.com/mod/geckolib).
3. Put all three in your `mods` folder.

## How the two editions differ
The editions share every texture, model, name and recipe, and behave the same, with three exceptions:
- **Monitors.** Bedrock can't draw a live picture on a block, so there a monitor shows static and switches your view to the camera instead.
- **Cameras.** A camera is a block on Java and an entity on Bedrock.
- **Searchlight.** On Bedrock the searchlight doesn't turn; its beam is drawn with particles.

On Java, the live picture is drawn on the CPU. One ray per pixel goes through the world from the camera and samples the blocks' real textures. The image is 96×72 and drawn a third at a time, like an old CCTV camera, so several monitors cost only a few milliseconds per tick.

## Development
Everything is generated from code: models, textures (painted pixel by pixel), animations, names, recipes and both editions' resources.

```sh
npm ci
npm run build        # writes build/behavior_pack, build/resource_pack and java/src/generated/resources
npm run validate     # static checks of both editions' resources
npm run preview      # renders every block and mob to build/preview/*.png
npm run package      # dist/*.mcaddon and *.mcpack
npm run site         # the website, in build/site/
npm run test:server  # loads the packs into a Bedrock Dedicated Server and runs the in-game self test (needs Docker)

cd java                       # Java edition (needs JDK 25; run `npm run build` first)
./gradlew build               # the Fabric mod jar in java/build/libs
./gradlew runGameTest         # server-side game tests
./gradlew runClientGameTest   # starts a client, checks the live feed and takes screenshots
./gradlew runClient           # play it
```

| Path | What it is |
| --- | --- |
| `src/blocks.mjs` | Every block: model elements, Java blockstates, Bedrock definitions, recipes, names |
| `src/textures.mjs` | The block and item textures, painted in code |
| `src/models.mjs` | Box-UV models and animations: camera, searchlight, guard, guard dog |
| `src/items.mjs`, `src/entities.mjs`, `src/structures.mjs`, `src/lang.mjs` | Items, Bedrock entities, blueprint layouts, English and Danish texts |
| `src/lib/` | Generators: block model conversion, UV packing, texture painting, animations |
| `src/packs/behavior_pack/scripts/` | The Bedrock Script API code |
| `tools/` | Build, validation, preview renderer, packaging, website, server test, Java resources |
| `java/` | The Fabric mod (Java edition) |

### Releases
Bump `version` in `package.json`, add a section to `CHANGELOG.md`, then push a tag such as `v0.2.0`. The release workflow builds and tests both editions, publishes a GitHub Release with the files, and updates the website.

## License
MIT. Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.
