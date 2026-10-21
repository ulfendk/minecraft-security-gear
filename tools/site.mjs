// Builds the GitHub Pages site into build/site/ (English at the root, Danish in da/).
// The latest release is looked up in the browser (GitHub API), with the version
// from package.json as the fallback, so the page stays current between deploys.
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { build } from './build.mjs';
import { blockAtlas, render } from './render.mjs';
import { TEXTURES } from '../src/blocks.mjs';
import { items } from '../src/items.mjs';

const OUT = 'build/site';
const RP = 'build/resource_pack';
const repo = process.env.GITHUB_REPOSITORY ?? process.env.SITE_REPO ?? 'ulfendk/minecraft-security-gear';
const [owner, name] = repo.split('/');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** What each piece of gear does, grouped as on the page. [id, image, en, da] */
const SECTIONS = [
  {
    title: { en: 'Surveillance', da: 'Overvågning' },
    gear: [
      ['security_camera', 'entity:security_camera', ['Security Camera', 'Hangs on a wall or from a ceiling and pans slowly from side to side. Sneak and use it to make it hold still.'], ['Overvågningskamera', 'Hænger på en væg eller i loftet og panorerer langsomt fra side til side. Snig og brug det for at få det til at stå stille.']],
      ['monitor', 'block:monitor', ['Security Monitor', 'Java: shows a live picture from the camera, right on the screen. Use it to look through the camera, sneak and use it to switch camera. Bedrock: use it to look through the camera.'], ['Overvågningsskærm', 'Java: viser et levende billede fra kameraet direkte på skærmen. Brug den for at se gennem kameraet, snig og brug den for at skifte kamera. Bedrock: brug den for at se gennem kameraet.']],
      ['camera_linker', 'item:camera_linker', ['Camera Linker', 'Use it on up to 8 cameras, then on a monitor, to link them.'], ['Kameraforbinder', 'Brug den på op til 8 kameraer og derefter på en skærm for at forbinde dem.']],
      ['searchlight', 'block:searchlight', ['Searchlight', 'Powered, it sweeps the yard and really lights up where the beam lands. An inverted daylight sensor switches it on at night.'], ['Projektør', 'Med strøm fejer den hen over gården og lyser virkelig op, hvor strålen rammer. En omvendt dagslyssensor tænder den om natten.']],
    ],
  },
  {
    title: { en: 'Lasers and alarms', da: 'Lasere og alarmer' },
    gear: [
      ['laser_emitter', 'block:laser_emitter', ['Laser Tripwire', 'A red beam up to 16 blocks long. When something crosses it, a Laser Receiver at the far end gives a redstone pulse. Redstone switches the laser off.'], ['Laserstråle', 'En rød stråle på op til 16 blokke. Når noget krydser den, giver en lasermodtager i den anden ende et redstone-signal. Redstone slukker laseren.']],
      ['laser_fence', 'block:laser_fence', ['Laser Fence', 'A blue beam that also burns whatever walks through it.'], ['Laserhegn', 'En blå stråle, der også brænder alt, der går igennem den.']],
      ['laser_receiver', 'block:laser_receiver', ['Laser Receiver', 'Gives a redstone pulse while its beam is broken.'], ['Lasermodtager', 'Giver et redstone-signal, mens strålen er brudt.']],
      ['motion_sensor', 'block:motion_sensor', ['Motion Sensor', 'Gives a signal while it sees a creature within 8 blocks. Sneak past it and it won’t notice you.'], ['Bevægelsessensor', 'Giver et signal, mens den ser et væsen inden for 8 blokke. Snig dig forbi, så opdager den dig ikke.']],
      ['alarm_siren', 'block:alarm_siren', ['Alarm Siren', 'Flashes red and wails while powered.'], ['Alarmsirene', 'Blinker rødt og hyler, når den får strøm.']],
    ],
  },
  {
    title: { en: 'Access control and prisons', da: 'Adgangskontrol og fængsler' },
    gear: [
      ['keycard_reader', 'block:keycard_reader', ['Keycard Reader', 'Swipe a Guard, Officer or Warden keycard. With enough clearance it opens the cell door next to it. Sneak and use a Warden card to change the level.'], ['Nøglekortlæser', 'Stryg et vagt-, betjent- eller direktørnøglekort. Med højt nok adgangsniveau åbner den celledøren ved siden af. Snig og brug et direktørkort for at ændre niveauet.']],
      ['warden_keycard', 'item:warden_keycard', ['Keycards', 'Guard (blue), Officer (orange) and Warden (purple) clearance.'], ['Nøglekort', 'Adgangsniveau Vagt (blå), Betjent (orange) og Direktør (lilla).']],
      ['cell_door', 'block:cell_door', ['Cell Door', 'A barred iron door. Only redstone or a keycard reader opens it.'], ['Celledør', 'En jerndør med tremmer. Kun redstone eller en nøglekortlæser kan åbne den.']],
      ['prison_bars', 'block:prison_bars', ['Prison Bars', 'Thick steel bars that join up like iron bars.'], ['Fængselstremmer', 'Tykke ståltremmer, der sætter sig sammen som jerntremmer.']],
      ['prison_wall', 'block:prison_wall', ['Prison Wall and Reinforced Concrete', 'Very hard and blast proof.'], ['Fængselsmur og armeret beton', 'Meget hårde og bombesikre.']],
      ['razor_wire', 'block:razor_wire', ['Barbed and Razor Wire', 'Slows you down and cuts.'], ['Pigtråd og knivtråd', 'Sinker dig og skærer.']],
    ],
  },
  {
    title: { en: 'Traps and bombs', da: 'Fælder og bomber' },
    gear: [
      ['pit_trapdoor', 'block:pit_trapdoor_open', ['Pit Trapdoor', 'Looks just like stone bricks. Step on it and the whole pit swings open, then closes again.'], ['Faldlem', 'Ligner helt almindelige stenmursten. Træd på den, og hele graven åbner sig og lukker igen.']],
      ['timed_bomb', 'block:timed_bomb', ['Timed Bomb', 'Use it to choose a 5, 10, 30 or 60 second fuse, sneak and use it (or power it) to arm it. It beeps as it counts down. Shears defuse it.'], ['Tidsindstillet bombe', 'Brug den for at vælge 5, 10, 30 eller 60 sekunders lunte, snig og brug den (eller giv den strøm) for at aktivere den. Den bipper, mens den tæller ned. En saks desarmerer den.']],
      ['tripwire_bomb', 'block:tripwire_bomb', ['Tripwire Bomb', 'Strings a thin wire up to 8 blocks. Crossing it, or a redstone signal, sets it off.'], ['Snubletrådsbombe', 'Spænder en tynd tråd ud på op til 8 blokke. Krydser man den, eller får den et redstone-signal, springer den.']],
    ],
  },
  {
    title: { en: 'Bridges, towers and guards', da: 'Broer, tårne og vagter' },
    gear: [
      ['bridge_winch', 'block:bridge_deck', ['Bridge Winch', 'Powered, it winds out a rope bridge, one plank at a time, up to 12 blocks. Without power it winds it back in.'], ['Brospil', 'Med strøm vikler det en rebbro ud, en planke ad gangen, op til 12 blokke. Uden strøm vikler det den ind igen.']],
      ['guard_tower_blueprint', 'item:guard_tower_blueprint', ['Blueprints', 'Build a guard tower (with searchlight and guard), a prison cell with an inmate or a gatehouse with a laser fence, right in front of you.'], ['Tegninger', 'Byg et vagttårn (med projektør og vagt), en fængselscelle med en indsat eller et porthus med laserhegn lige foran dig.']],
      ['security_guard', 'entity:security_guard', ['Security Guard', 'Patrols, fights hostile mobs and is friendly unless you hit it.'], ['Sikkerhedsvagt', 'Patruljerer, bekæmper fjendtlige monstre og er venlig, medmindre du slår den.']],
      ['criminal', 'entity:criminal', ['Criminal', 'Someone to lock up: a striped convict, an inmate in an orange jumpsuit, a masked burglar or a gangster. Keeps away from guard dogs, hits back when hit, and guards leave them alone. The prison cell blueprint comes with one.'], ['Forbryder', 'En at spærre inde: en stribet fange, en indsat i orange kedeldragt, en maskeret indbrudstyv eller en gangster. Holder sig fra vagthunde, slår igen, hvis du slår, og vagterne lader dem være. Fængselscelle-tegningen kommer med en.']],
      ['brute', 'entity:brute', ['Brute', 'The big one: a muscular inmate in a tank top. Twice as tough as the others, hits hard, is hard to push back and is not afraid of guard dogs.'], ['Bølle', 'Den store: en muskuløs fange i undertrøje. Dobbelt så sej som de andre, slår hårdt, er svær at skubbe og er ikke bange for vagthunde.']],
      ['guard_dog', 'entity:guard_dog', ['Guard Dog', 'Tame it with bones. It follows you, sits on command and goes for monsters.'], ['Vagthund', 'Tæm den med knogler. Den følger dig, sætter sig på kommando og går efter monstre.']],
      ['baton', 'item:baton', ['Baton', 'A hit slows the target down.'], ['Knippel', 'Et slag sinker den, du rammer.']],
    ],
  },
];

const T = {
  en: {
    title: 'Security Gear for Minecraft',
    tagline: 'Security cameras with live monitors, laser tripwires, bombs, pit traps, prison walls, winding bridges, guard towers, guards and guard dogs.',
    bedrock: 'Bedrock Edition', bedrockHow: 'Download the .mcaddon and open it. Then turn on Security Gear under Behavior Packs for your world.',
    java: 'Java Edition (Fabric)', javaHow: 'Put the .jar in your mods folder with Fabric API and GeckoLib (Minecraft 26.3).',
    download: 'Download', latest: 'Latest version', released: 'released', source: 'Source code', other: 'Dansk',
    upgrade: 'Upgrading to a new version',
    upgradeSteps: [
      '<strong>Download the new version</strong> and open the file. A newer version replaces the one you have, and your worlds use it the next time you load them.',
      '<strong>Still running the old version?</strong> (or Minecraft says it is already installed): go to <em>Settings → Storage</em>, delete Security Gear under both <em>Resource Packs</em> and <em>Behavior Packs</em>, then open the new file again.',
      '<strong>Check the world:</strong> in the world\'s <em>Edit</em> screen, under <em>Behavior Packs</em> and <em>Resource Packs</em>, make sure Security Gear is active. A world you imported or downloaded can carry its own old copy: deactivate it there, save, and activate the new one.',
    ],
    upgradeServer: 'On a server, replace the add-on\'s folders in <em>behavior_packs</em> and <em>resource_packs</em> with the new ones and restart it.',
    upgradeJava: 'Delete the old Security Gear jar from your <em>mods</em> folder and put the new one in its place. Keep only one version in the folder. If the new version needs a newer Fabric API or GeckoLib, update those too.',
  },
  da: {
    title: 'Sikkerhedsudstyr til Minecraft',
    tagline: 'Overvågningskameraer med levende skærmbilleder, laserstråler, bomber, faldlemme, fængselsmure, rebbroer, vagttårne, vagter og vagthunde.',
    bedrock: 'Bedrock Edition', bedrockHow: 'Hent .mcaddon-filen og åbn den. Slå derefter Security Gear til under Adfærdspakker for din verden.',
    java: 'Java Edition (Fabric)', javaHow: 'Læg .jar-filen i din mods-mappe sammen med Fabric API og GeckoLib (Minecraft 26.3).',
    download: 'Hent', latest: 'Nyeste version', released: 'udgivet', source: 'Kildekode', other: 'English',
    upgrade: 'Opdatering til en ny version',
    upgradeSteps: [
      '<strong>Hent den nye version</strong>, og åbn filen. En nyere version erstatter den, du har, og dine verdener bruger den, næste gang du åbner dem.',
      '<strong>Kører den gamle version stadig?</strong> (eller siger Minecraft, at den allerede er installeret): Gå til <em>Indstillinger → Lagerplads</em>, slet Security Gear under både <em>Ressourcepakker</em> og <em>Adfærdspakker</em>, og åbn så den nye fil igen.',
      '<strong>Tjek verdenen:</strong> Sørg for, at Security Gear er slået til under <em>Adfærdspakker</em> og <em>Ressourcepakker</em>, når du redigerer verdenen. En verden, du har importeret eller hentet, kan have sin egen gamle kopi med: Slå den fra dér, gem, og slå den nye til.',
    ],
    upgradeServer: 'På en server skal du erstatte tilføjelsens mapper i <em>behavior_packs</em> og <em>resource_packs</em> med de nye og genstarte den.',
    upgradeJava: 'Slet den gamle Security Gear-jar fra din <em>mods</em>-mappe, og læg den nye i stedet. Hav kun én version i mappen. Kræver den nye version en nyere Fabric API eller GeckoLib, så opdatér dem også.',
  },
};

function upscale(buf, k) {
  const src = PNG.sync.read(buf);
  const out = new PNG({ width: src.width * k, height: src.height * k });
  for (let y = 0; y < out.height; y++)
    for (let x = 0; x < out.width; x++) {
      const s = (Math.floor(y / k) * src.width + Math.floor(x / k)) * 4;
      out.data.set(src.data.subarray(s, s + 4), (y * out.width + x) * 4);
    }
  return PNG.sync.write(out);
}

const { version, models } = await build({ quiet: true });
await mkdir(join(OUT, 'img'), { recursive: true });
await mkdir(join(OUT, 'da'), { recursive: true });

// Pictures: rendered blocks and entities, upscaled item icons.
const geos = {};
for (const file of ['monitor', 'searchlight', 'laser_emitter', 'laser_fence', 'laser_receiver', 'motion_sensor', 'alarm_siren', 'keycard_reader', 'cell_door', 'prison_bars', 'prison_wall', 'razor_wire', 'pit_trapdoor', 'timed_bomb', 'tripwire_bomb', 'bridge_deck']) {
  const g = JSON.parse(await readFile(join(RP, 'models', 'blocks', `${file}.geo.json`), 'utf8'));
  for (const geo of g['minecraft:geometry']) geos[geo.description.identifier.split('.').pop()] = geo;
}
for (const section of SECTIONS) {
  for (const [id, image] of section.gear) {
    const [kind, ref] = image.split(':');
    let png;
    if (kind === 'item') png = upscale(items.find((i) => i.id === ref).icon, 12);
    else if (kind === 'entity') png = render(models[ref].geometry, models[ref].texture, { yaw: 35, size: 192, hidden: new Set(['ceiling_mount']) });
    else if (ref === 'searchlight') png = render({ format_version: '1.12.0', 'minecraft:geometry': [geos.searchlight] }, models.searchlight.litTexture, { yaw: 35, size: 192 });
    else {
      const pair = blockAtlas(geos[ref], (n) => TEXTURES[n].png);
      png = render(pair.geometry, pair.texture, { yaw: 35, size: 192 });
    }
    await writeFile(join(OUT, 'img', `${id}.png`), png);
  }
}
await copyFile(join(RP, 'pack_icon.png'), join(OUT, 'img', 'icon.png'));
await copyFile(join(RP, 'pack_icon.png'), join(OUT, 'favicon.png'));
await writeFile(join(OUT, 'version.json'), JSON.stringify({ version }));

const releases = `https://github.com/${repo}/releases`;
const dl = (file) => `${releases}/latest/download/${file}`;

function page(lang) {
  const t = T[lang];
  const up = lang === 'en' ? '' : '../';
  const sections = SECTIONS.map((s) => `
    <section>
      <h2>${esc(s.title[lang])}</h2>
      <div class="grid">${s.gear.map(([id, , en, da]) => {
        const [title, text] = lang === 'en' ? en : da;
        return `
        <article class="card">
          <img src="${up}img/${id}.png" alt="" width="192" height="192" loading="lazy">
          <h3>${esc(title)}</h3>
          <p>${esc(text)}</p>
        </article>`;
      }).join('')}
      </div>
    </section>`).join('');
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.tagline)}">
<link rel="icon" href="${up}favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500&display=swap" rel="stylesheet">
<style>
:root { --bg: #e9ecef; --surface: #ffffff; --ink: #1d2126; --muted: #5a6370; --line: #d3d8de; --accent: #c0281e; --accent-ink: #fff; --hero-from: #0b1026; --hero-to: #28345e; }
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --bg: #14171b; --surface: #1d2126; --ink: #e8ebee; --muted: #9aa3ad; --line: #2c3238; --accent: #ff5a4c; --accent-ink: #14171b; }
}
:root[data-theme="dark"] { --bg: #14171b; --surface: #1d2126; --ink: #e8ebee; --muted: #9aa3ad; --line: #2c3238; --accent: #ff5a4c; --accent-ink: #14171b; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 16px/1.5 system-ui, sans-serif; }
header { background: linear-gradient(160deg, var(--hero-from), var(--hero-to)); color: #f2f4f8; padding: 40px 16px 32px; }
.wrap { max-width: 1080px; margin: 0 auto; }
.brand { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
.brand img { width: 96px; height: 96px; image-rendering: pixelated; border-radius: 8px; }
h1, h2, h3 { font-family: 'Pixelify Sans', system-ui, sans-serif; font-weight: 500; }
h1 { font-size: clamp(28px, 6vw, 44px); margin: 0; }
.tagline { max-width: 680px; color: #cfd6e2; }
.lang { color: #f2f4f8; float: right; }
.downloads { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; margin-top: 24px; }
.dl { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; padding: 16px; }
.dl h2 { margin: 0 0 4px; font-size: 20px; }
.dl p { margin: 0 0 12px; color: #cfd6e2; font-size: 14px; }
.button { display: inline-block; background: var(--accent); color: #fff; padding: 8px 14px; border-radius: 6px; text-decoration: none; font-weight: 600; }
.version { margin-top: 16px; color: #cfd6e2; font-size: 14px; }
main { padding: 8px 16px 48px; }
section h2 { font-size: 26px; margin: 32px 0 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 14px; }
.card { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 14px; }
.card img { display: block; width: 128px; height: 128px; margin: 0 auto 8px; image-rendering: pixelated; }
.card h3 { margin: 0 0 4px; font-size: 19px; }
.card p { margin: 0; color: var(--muted); font-size: 14px; }
footer { color: var(--muted); text-align: center; padding: 24px 16px 40px; font-size: 14px; }
footer a { color: var(--accent); }
</style>
</head>
<body>
<header>
  <div class="wrap">
    <a class="lang" href="${lang === 'en' ? 'da/' : '../'}">${esc(t.other)}</a>
    <div class="brand">
      <img src="${up}img/icon.png" alt="" width="96" height="96">
      <div>
        <h1>${esc(t.title)}</h1>
        <p class="tagline">${esc(t.tagline)}</p>
      </div>
    </div>
    <div class="downloads">
      <div class="dl">
        <h2>${esc(t.bedrock)}</h2>
        <p>${esc(t.bedrockHow)}</p>
        <a class="button" href="${dl('SecurityGear.mcaddon')}">${esc(t.download)} .mcaddon</a>
      </div>
      <div class="dl">
        <h2>${esc(t.java)}</h2>
        <p>${esc(t.javaHow)}</p>
        <a class="button" href="${dl('SecurityGear-fabric.jar')}">${esc(t.download)} .jar</a>
      </div>
    </div>
    <p class="version" id="version">${esc(t.latest)}: <strong>${esc(version)}</strong></p>
  </div>
</header>
<main class="wrap">
    <section>
      <h2>${esc(t.upgrade)}</h2>
      <h3>${esc(t.bedrock)}</h3>
      <ol>${t.upgradeSteps.map((step) => `
        <li>${step}</li>`).join('')}
      </ol>
      <p>${t.upgradeServer}</p>
      <h3>${esc(t.java)}</h3>
      <p>${t.upgradeJava}</p>
    </section>${sections}
</main>
<footer><a href="https://github.com/${repo}">${esc(t.source)}</a> · MIT</footer>
<script>
fetch('https://api.github.com/repos/${owner}/${name}/releases/latest')
  .then((r) => (r.ok ? r.json() : null))
  .then((rel) => {
    if (!rel) return;
    const date = new Date(rel.published_at).toLocaleDateString('${lang === 'en' ? 'en-GB' : 'da-DK'}');
    document.getElementById('version').innerHTML = '${t.latest}: <strong>' + rel.tag_name.replace(/^v/, '') + '</strong> · ${t.released} ' + date;
  })
  .catch(() => {});
</script>
</body>
</html>
`;
}

await writeFile(join(OUT, 'index.html'), page('en'));
await writeFile(join(OUT, 'da', 'index.html'), page('da'));
console.log(`Site written to ${OUT}/ (${name} ${version})`);
