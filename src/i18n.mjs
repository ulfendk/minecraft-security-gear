// Website texts in English and Danish. In-game texts are in lang.mjs.

export const LANGUAGES = {
  en: { label: 'English', dir: '', htmlLang: 'en', dateLocale: 'en-GB' },
  da: { label: 'Dansk', dir: 'da', htmlLang: 'da', dateLocale: 'da-DK' },
};

const en = {
  allMods: 'All our mods',
  name: 'Security Gear',
  title: 'Security Gear – Minecraft add-on and mod',
  description: 'Security gear for Minecraft Bedrock and Java Edition: security cameras with live monitors, laser tripwires, motion sensors, keycard doors, prison walls, pit traps, bombs, rope bridges, guard towers, guards and guard dogs. Free download.',
  tagline: 'Security cameras with live monitors, laser tripwires, bombs, pit traps, prison walls, winding bridges, guard towers, guards and guard dogs.',
  download: 'iPad, phone, console & Windows: Bedrock',
  downloadJava: 'Mac & PC: Java Edition',
  which: '<b>Which one do I need?</b> Playing on an <b>iPad</b>, iPhone, Android, Xbox, PlayStation, Switch or Minecraft for Windows? That is <b>Bedrock Edition</b> – take the first download. Playing on a computer with the Minecraft <b>Java Edition</b> launcher (Mac, Windows or Linux)? Take the Java download. Not sure? If you bought Minecraft in the App Store or Google Play, it is Bedrock.',
  allVersions: 'All versions',
  latestVersion: 'Latest version',
  released: 'released',
  install: 'Install',
  bedrockTitle: 'Install on iPad, phone, console or Windows (Bedrock)',
  javaTitle: 'Install on Mac or PC (Java Edition)',
  steps: (link) => [
    `<strong>Download</strong> ${link} on your Windows PC, Android phone or tablet, or iPhone or iPad.`,
    '<strong>Open the file.</strong> Minecraft starts and imports both packs.',
    '<strong>Create or edit a world.</strong> Under <em>Behavior Packs</em>, turn on <em>Security Gear</em>. The resource pack is added automatically.',
    '<strong>Find the gear</strong> in the creative inventory, or craft it. Needs Minecraft 1.21.130 or newer.',
  ],
  javaSteps: (jar, fabric, api, gecko) => [
    `<strong>Install</strong> ${fabric} for Minecraft 26.3.`,
    `<strong>Download</strong> ${jar}, plus ${api} and ${gecko}.`,
    '<strong>Put all three files</strong> in your <em>mods</em> folder and start Minecraft with the Fabric profile.',
    '<strong>Find the gear</strong> in the <em>Security Gear</em> creative tab, or craft it.',
  ],
  serverNote: (bp, rp) => `Running a server? Use the separate ${bp('behavior pack')} and ${rp('resource pack')}. Xbox, PlayStation and Switch can’t import add-ons from files, but you can join a world or Realm that has the add-on.`,
  upgradeTitle: 'Upgrading to a new version',
  upgradeSteps: [
    '<strong>Download the new version</strong> and open the file. A newer version replaces the one you have, and your worlds use it the next time you load them.',
    '<strong>Still running the old version?</strong> (or Minecraft says it is already installed): go to <em>Settings → Storage</em>, delete Security Gear under both <em>Resource Packs</em> and <em>Behavior Packs</em>, then open the new file again.',
    '<strong>Check the world:</strong> in the world’s <em>Edit</em> screen, under <em>Behavior Packs</em> and <em>Resource Packs</em>, make sure Security Gear is active. A world you imported or downloaded can carry its own old copy: deactivate it there, save, and activate the new one.',
  ],
  upgradeServer: 'On a server, replace the add-on’s folders in <em>behavior_packs</em> and <em>resource_packs</em> with the new ones and restart it.',
  upgradeJava: 'Java Edition: delete the old Security Gear jar from your <em>mods</em> folder and put the new one in its place. Keep only one version in the folder. If the new version needs a newer Fabric API or GeckoLib, update those too.',
  footerSource: (src, issues) => `Security Gear is free and open source. ${src('Source code on GitHub')} · ${issues('Report a problem')}`,
  footerLegal: 'Not an official Minecraft product. Not approved by or associated with Mojang or Microsoft.',
};

const da = {
  allMods: 'Alle vores mods',
  name: 'Sikkerhedsudstyr',
  title: 'Sikkerhedsudstyr – tilføjelse og mod til Minecraft',
  description: 'Sikkerhedsudstyr til Minecraft Bedrock og Java Edition: overvågningskameraer med levende skærmbilleder, laserstråler, bevægelsessensorer, nøglekortdøre, fængselsmure, faldlemme, bomber, rebbroer, vagttårne, vagter og vagthunde. Gratis download.',
  tagline: 'Overvågningskameraer med levende skærmbilleder, laserstråler, bomber, faldlemme, fængselsmure, rebbroer, vagttårne, vagter og vagthunde.',
  download: 'iPad, telefon, konsol & Windows: Bedrock',
  downloadJava: 'Mac & pc: Java Edition',
  which: '<b>Hvilken skal jeg bruge?</b> Spiller du på <b>iPad</b>, iPhone, Android, Xbox, PlayStation, Switch eller Minecraft til Windows? Så er det <b>Bedrock Edition</b> – tag den første download. Spiller du på en computer med Minecraft <b>Java Edition</b>-launcheren (Mac, Windows eller Linux)? Så tag Java-downloaden. I tvivl? Hvis Minecraft er købt i App Store eller Google Play, er det Bedrock.',
  allVersions: 'Alle versioner',
  latestVersion: 'Nyeste version',
  released: 'udgivet',
  install: 'Installér',
  bedrockTitle: 'Installér på iPad, telefon, konsol eller Windows (Bedrock)',
  javaTitle: 'Installér på Mac eller pc (Java Edition)',
  steps: (link) => [
    `<strong>Download</strong> ${link} på din Windows-pc, Android-telefon eller -tablet, iPhone eller iPad.`,
    '<strong>Åbn filen.</strong> Minecraft starter og importerer begge pakker.',
    '<strong>Opret eller redigér en verden.</strong> Slå <em>Security Gear</em> til under <em>Adfærdspakker</em>. Ressourcepakken kommer automatisk med.',
    '<strong>Find udstyret</strong> i den kreative oversigt, eller lav det. Kræver Minecraft 1.21.130 eller nyere.',
  ],
  javaSteps: (jar, fabric, api, gecko) => [
    `<strong>Installér</strong> ${fabric} til Minecraft 26.3.`,
    `<strong>Download</strong> ${jar} samt ${api} og ${gecko}.`,
    '<strong>Læg alle tre filer</strong> i din <em>mods</em>-mappe, og start Minecraft med Fabric-profilen.',
    '<strong>Find udstyret</strong> under fanen <em>Sikkerhedsudstyr</em> i kreativ tilstand, eller lav det.',
  ],
  serverNote: (bp, rp) => `Kører du en server? Brug den separate ${bp('adfærdspakke')} og ${rp('ressourcepakke')}. Xbox, PlayStation og Switch kan ikke importere tilføjelser fra filer, men du kan deltage i en verden eller Realm, der har tilføjelsen.`,
  upgradeTitle: 'Opdatering til en ny version',
  upgradeSteps: [
    '<strong>Hent den nye version</strong>, og åbn filen. En nyere version erstatter den, du har, og dine verdener bruger den, næste gang du åbner dem.',
    '<strong>Kører den gamle version stadig?</strong> (eller siger Minecraft, at den allerede er installeret): Gå til <em>Indstillinger → Lagerplads</em>, slet Security Gear under både <em>Ressourcepakker</em> og <em>Adfærdspakker</em>, og åbn så den nye fil igen.',
    '<strong>Tjek verdenen:</strong> Sørg for, at Security Gear er slået til under <em>Adfærdspakker</em> og <em>Ressourcepakker</em>, når du redigerer verdenen. En verden, du har importeret eller hentet, kan have sin egen gamle kopi med: Slå den fra dér, gem, og slå den nye til.',
  ],
  upgradeServer: 'På en server skal du erstatte tilføjelsens mapper i <em>behavior_packs</em> og <em>resource_packs</em> med de nye og genstarte den.',
  upgradeJava: 'Java Edition: Slet den gamle Security Gear-jar fra din <em>mods</em>-mappe, og læg den nye i stedet. Hav kun én version i mappen. Kræver den nye version en nyere Fabric API eller GeckoLib, så opdatér dem også.',
  footerSource: (src, issues) => `Sikkerhedsudstyr er gratis og open source. ${src('Kildekode på GitHub')} · ${issues('Meld et problem')}`,
  footerLegal: 'Ikke et officielt Minecraft-produkt. Ikke godkendt af eller tilknyttet Mojang eller Microsoft.',
};

export const STRINGS = { en, da };
