#!/usr/bin/env node
// Usage:
//   GITHUB_TOKEN=... node index.js --user <login> [--out dist/gtr-mfd.svg]
//   node index.js --demo            # fake data, no token needed
// Also writes one static SVG per page (gtr-mfd-0.svg ... -3.svg) next to the animated one.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, basename, extname } from "node:path";
import { fetchUser, computeMetrics } from "./src/data.js";
import { renderMFD } from "./src/render.js";
import { demoUser } from "./src/demo.js";

const args = parseArgs(process.argv.slice(2));
const out = args.out || process.env.MFD_OUT || "dist/gtr-mfd.svg";
const login = args.user || process.env.MFD_USER || process.env.GITHUB_REPOSITORY_OWNER;

const now = new Date();
let user;
if (args.demo) {
  user = demoUser(now);
} else {
  if (!login) die("Pass --user <login> or set MFD_USER.");
  user = await fetchUser(login, process.env.GITHUB_TOKEN).catch((e) => die(e.message));
}

const metrics = computeMetrics(user, now);
await mkdir(dirname(out), { recursive: true });
await writeFile(out, renderMFD(metrics));

const stem = join(dirname(out), basename(out, extname(out)));
for (let p = 0; p < 4; p++) await writeFile(`${stem}-${p}.svg`, renderMFD(metrics, { page: p }));

console.log(`Wrote ${out} for @${metrics.login}: streak ${metrics.streak}d, ${metrics.week} this week, ` +
  `${metrics.openIssues} open issues, ${metrics.openPRs} open PRs, ${metrics.laps.length} laps.`);

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--demo") o.demo = true;
    else if (a.startsWith("--")) o[a.slice(2)] = argv[++i];
  }
  return o;
}
function die(msg) {
  console.error(`gtr-mfd: ${msg}`);
  process.exit(1);
}
