// Emberfall Duel — entry program (Node 22, standard library only).
// The game itself is the static site under game/ (plain ES modules, no network,
// no build step). This program hands the entry in: it copies game/ and
// screenshots/ into the output folder and writes dossier.json there with the
// vendored make.fun library, under the scorer's caps.
// Local run: mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(fromName: string, toName: string): void {
  const from = join(repoRoot, fromName);
  if (!existsSync(from)) return;
  mkdirSync(join(outputDir, toName), { recursive: true });
  cpSync(from, join(outputDir, toName), { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree('game', 'game');
copyTree('screenshots', 'screenshots');

const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

// A one-line receipt for whoever runs this by hand (the grader ignores stdout).
const gameFileCount = readdirSync(join(outputDir, 'game'), { recursive: true }).length;
const shotCount = readdirSync(join(outputDir, 'screenshots')).length;
console.log(
  `Emberfall Duel handed in: ${gameFileCount} game files, ${shotCount} screenshots, ` +
  `dossier at ${join(outputDir, 'dossier.json')}`,
);
