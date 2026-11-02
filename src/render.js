// Draws the multifunction display as one self-contained SVG.
// Pages cycle with pure CSS, since GitHub READMEs don't run JavaScript.

const W = 840, H = 320;
const SCREEN = { x: 18, y: 18, w: W - 36, h: H - 36 };
const BODY_Y = 66;          // top of the page area, under the tab bar
const BODY_H = 206;         // height of the page area
const PAGE_SECONDS = 6;

const C = {
  bezel: "#14181d", bezelEdge: "#2a3038", screen: "#05080b", grid: "#141b23",
  text: "#e9eef3", dim: "#6f7c89", faint: "#2b3540",
  red: "#ff2a1f", amber: "#ffb22e", green: "#3ddc84", cyan: "#4cc9ff",
};
const FONT = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

const PAGES = [
  { key: "boost", label: "BOOST", draw: pageBoost },
  { key: "temps", label: "TEMP / FUEL", draw: pageTemps },
  { key: "gmeter", label: "G-METER", draw: pageGMeter },
  { key: "lap", label: "LAP TIMER", draw: pageLap },
];

/**
 * @param {object} m metrics from computeMetrics
 * @param {{page?: number}} opts page = 0..3 renders that page alone with no animation
 */
export function renderMFD(m, opts = {}) {
  const only = Number.isInteger(opts.page) ? opts.page : null;
  const animated = only === null;
  const ctx = { animated, needles: [] };
  const cycle = PAGES.length * PAGE_SECONDS;

  const pages = PAGES.map((p, i) => {
    if (!animated && i !== only) return "";
    ctx.pageIndex = i;
    const cls = animated ? ` class="page p${i}"` : "";
    return `<g${cls}>${p.draw(m, ctx)}</g>`;
  }).join("");

  const tabs = PAGES.map((p, i) => {
    const tw = (SCREEN.w - 40) / PAGES.length;
    const x = SCREEN.x + 20 + i * tw;
    const active = !animated && i === only;
    return `<g>
      <rect x="${x + 3}" y="${SCREEN.y + 12}" width="${tw - 6}" height="24" rx="3" fill="${C.faint}" opacity="0.35"/>
      <rect x="${x + 3}" y="${SCREEN.y + 12}" width="${tw - 6}" height="24" rx="3" fill="${C.red}"${animated ? ` class="tab p${i}"` : ""} opacity="${active ? 1 : 0}"/>
      <text x="${x + tw / 2}" y="${SCREEN.y + 28.5}" text-anchor="middle" font-size="11" letter-spacing="1.5" fill="${C.text}" font-weight="700">${p.label}</text>
    </g>`;
  }).join("");

  const updated = m.updated.toISOString().slice(0, 10);
  const style = animated ? styles(cycle, ctx.needles) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}" role="img" aria-labelledby="t d">
<title id="t">${esc(m.name)}'s GitHub multifunction display</title>
<desc id="d">Contribution streak ${m.streak} days, ${m.week} contributions this week, ${m.openIssues} open issues, ${m.openPRs} open pull requests, top language ${m.languages[0]?.name ?? "none"}.</desc>
<defs>
  <linearGradient id="bez" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d232a"/><stop offset="1" stop-color="#0c0f12"/></linearGradient>
  <radialGradient id="glass" cx="0.3" cy="0" r="1.1"><stop offset="0" stop-color="#ffffff" stop-opacity="0.06"/><stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
  <filter id="glow" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <pattern id="scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity="0.18"/></pattern>
</defs>
${style}
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="22" fill="url(#bez)" stroke="${C.bezelEdge}" stroke-width="2"/>
<rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="10" fill="${C.screen}" stroke="#000" stroke-width="2"/>
${gridLines()}
${tabs}
${pages}
<line x1="${SCREEN.x + 20}" y1="${H - 44}" x2="${W - SCREEN.x - 20}" y2="${H - 44}" stroke="${C.faint}"/>
<text x="${SCREEN.x + 22}" y="${H - 28}" font-size="10.5" fill="${C.dim}" letter-spacing="1">@${esc(m.login).toUpperCase()} · ${m.yearTotal.toLocaleString("en-US")} CONTRIBUTIONS / 1Y</text>
<text x="${W - SCREEN.x - 22}" y="${H - 28}" font-size="10.5" fill="${C.dim}" text-anchor="end" letter-spacing="1">UPDATED ${updated}</text>
<rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="10" fill="url(#scan)" pointer-events="none"/>
<rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="10" fill="url(#glass)" pointer-events="none"/>
</svg>`;
}

/* ---------- pages ---------- */

function pageBoost(m, ctx) {
  const cx = 230, cy = BODY_Y + 122, r = 92;
  const max = Math.max(30, Math.ceil(m.longest / 10) * 10);
  const gauge = arcGauge(ctx, { cx, cy, r, min: 0, max, value: m.streak, ticks: max / 5, redFrom: max * 0.8, label: "DAY STREAK" });

  // Seven-day bars, like the boost history graph on the real screen.
  const bx = 470, by = BODY_Y + 20, bw = 320, bh = 110;
  const peak = Math.max(1, ...m.week7);
  const barW = bw / 7 - 10;
  const labels = lastSevenLabels(m.updated);
  const bars = m.week7.map((v, i) => {
    const h = Math.max(2, (v / peak) * (bh - 18));
    const x = bx + i * (bw / 7) + 5;
    const color = v === peak && v > 0 ? C.red : C.cyan;
    return `<rect x="${x}" y="${by + bh - h}" width="${barW}" height="${h}" fill="${color}" opacity="${v ? 0.9 : 0.25}"/>
      <text x="${x + barW / 2}" y="${by + bh + 14}" font-size="10" fill="${C.dim}" text-anchor="middle">${labels[i]}</text>
      <text x="${x + barW / 2}" y="${by + bh - h - 5}" font-size="10" fill="${C.text}" text-anchor="middle">${v || ""}</text>`;
  }).join("");

  return `${gauge}
    <text x="${bx}" y="${by - 4}" font-size="10.5" fill="${C.dim}" letter-spacing="1.5">CONTRIBUTIONS · LAST 7 DAYS</text>
    <line x1="${bx}" y1="${by + bh}" x2="${bx + bw}" y2="${by + bh}" stroke="${C.faint}"/>
    ${bars}
    ${readout(bx, BODY_Y + 178, "THIS WEEK", m.week)}
    ${readout(bx + 120, BODY_Y + 178, "LONGEST STREAK", `${m.longest}d`)}
    ${readout(bx + 260, BODY_Y + 178, "PEAK DAY", Math.max(0, ...m.week7))}`;
}

function pageTemps(m, ctx) {
  const cy = BODY_Y + 100, r = 70;
  const fuelPct = Math.round(m.fuel * 100);
  const g1 = arcGauge(ctx, { cx: 160, cy, r, min: 0, max: 40, value: m.openIssues, ticks: 4, redFrom: 30, label: "OIL TEMP", sub: "OPEN ISSUES", small: true });
  const g2 = arcGauge(ctx, { cx: 420, cy, r, min: 0, max: 10, value: m.openPRs, ticks: 5, redFrom: 8, label: "TRANS TEMP", sub: "OPEN PRS", small: true });
  const g3 = arcGauge(ctx, { cx: 680, cy, r, min: 0, max: 150, value: fuelPct, ticks: 3, lowRed: 25, label: "FUEL", sub: "30D VS 1Y PACE", unit: "%", small: true });

  const status = m.openIssues >= 30 ? ["RUNNING HOT", C.red]
    : fuelPct < 25 ? ["LOW FUEL", C.amber]
    : ["ALL SYSTEMS NOMINAL", C.green];
  return `${g1}${g2}${g3}
    <text x="${W / 2}" y="${BODY_Y + 202}" text-anchor="middle" font-size="11" letter-spacing="2" fill="${status[1]}">● ${status[0]}</text>`;
}

function pageGMeter(m, ctx) {
  const cx = 230, cy = BODY_Y + 104, R = 74;
  // Top four languages pull in four directions: accel, right, brake, left.
  const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
  const langs = m.languages;
  let gx = 0, gy = 0;
  langs.forEach((l, i) => { gx += dirs[i][0] * l.pct; gy += dirs[i][1] * l.pct; });
  const dx = cx + gx * R, dy = cy + gy * R;
  const gForce = Math.hypot(gx, gy).toFixed(2);

  const rings = [0.33, 0.66, 1].map((f) =>
    `<circle cx="${cx}" cy="${cy}" r="${R * f}" fill="none" stroke="${f === 1 ? C.dim : C.faint}" stroke-width="${f === 1 ? 1.5 : 1}"/>`).join("");
  const axisLabels = langs.map((l, i) => {
    const [ax, ay] = dirs[i];
    const x = cx + ax * (R + 14), y = cy + ay * (R + 14) + 4;
    const anchor = ax > 0 ? "start" : ax < 0 ? "end" : "middle";
    const yy = ay < 0 ? y - 2 : ay > 0 ? y + 6 : y;
    return `<text x="${x}" y="${yy}" text-anchor="${anchor}" font-size="10.5" fill="${l.color}" font-weight="700">${esc(l.name.toUpperCase())}</text>`;
  }).join("");

  const dot = ctx.animated
    ? `<circle cx="${dx}" cy="${dy}" r="7" fill="${C.red}" filter="url(#glow)" class="pulse"/>`
    : `<circle cx="${dx}" cy="${dy}" r="7" fill="${C.red}" filter="url(#glow)"/>`;

  // Bar list on the right
  const lx = 470, ly = BODY_Y + 22, bw = 300;
  const list = langs.map((l, i) => {
    const y = ly + i * 38;
    return `<text x="${lx}" y="${y}" font-size="12" fill="${C.text}" font-weight="700">${esc(l.name)}</text>
      <text x="${lx + bw}" y="${y}" font-size="12" fill="${C.text}" text-anchor="end">${(l.pct * 100).toFixed(1)}%</text>
      <rect x="${lx}" y="${y + 7}" width="${bw}" height="8" fill="${C.faint}" opacity="0.6"/>
      <rect x="${lx}" y="${y + 7}" width="${Math.max(2, bw * l.pct)}" height="8" fill="${l.color}"/>`;
  }).join("");

  return `${rings}
    <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="${C.faint}"/>
    <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="${C.faint}"/>
    <line x1="${cx}" y1="${cy}" x2="${dx}" y2="${dy}" stroke="${C.red}" stroke-width="1.5" opacity="0.5"/>
    ${axisLabels}
    ${dot}
    <text x="${SCREEN.x + 22}" y="${BODY_Y + 6}" font-size="10.5" fill="${C.dim}" letter-spacing="1.5">LANGUAGE MIX</text>
    ${list}
    ${readout(lx, BODY_Y + 178, "LATERAL LOAD", `${gForce} G`)}
    ${readout(lx + 160, BODY_Y + 178, "LANGUAGES TRACKED", langs.length)}`;
}

function pageLap(m) {
  const x0 = 50;
  if (!m.laps.length) {
    return `<text x="${W / 2}" y="${BODY_Y + 96}" text-anchor="middle" font-size="22" fill="${C.text}" letter-spacing="3">NO LAPS YET</text>
      <text x="${W / 2}" y="${BODY_Y + 122}" text-anchor="middle" font-size="11" fill="${C.dim}" letter-spacing="1.5">MERGE TWO PULL REQUESTS TO SET A LAP TIME</text>`;
  }
  const since = m.sinceLastMerge != null ? fmtDur(m.sinceLastMerge) : "--";
  const rows = m.laps.map((l, i) => {
    const y = BODY_Y + 40 + i * 30;
    const delta = l.ms - m.bestLap;
    const best = delta === 0;
    const dTxt = best ? "BEST" : `+${fmtDur(delta)}`;
    return `<text x="390" y="${y}" font-size="11" fill="${C.dim}">L${m.mergedCount - 1 - i}</text>
      <text x="430" y="${y}" font-size="12" fill="${C.text}">${esc(trunc(l.repo, 18))}</text>
      <text x="660" y="${y}" font-size="13" fill="${best ? C.green : C.text}" text-anchor="end" font-weight="700">${fmtDur(l.ms)}</text>
      <text x="780" y="${y}" font-size="11" fill="${best ? C.green : C.amber}" text-anchor="end">${dTxt}</text>
      <line x1="390" y1="${y + 10}" x2="780" y2="${y + 10}" stroke="${C.faint}" opacity="0.6"/>`;
  }).join("");

  return `<text x="${x0}" y="${BODY_Y + 18}" font-size="10.5" fill="${C.dim}" letter-spacing="1.5">CURRENT LAP · SINCE LAST MERGE</text>
    <text x="${x0}" y="${BODY_Y + 84}" font-size="54" fill="${C.text}" font-weight="700" letter-spacing="2" filter="url(#glow)">${since}</text>
    ${readout(x0, BODY_Y + 132, "BEST LAP", fmtDur(m.bestLap), C.green)}
    ${readout(x0 + 150, BODY_Y + 132, "PRS MERGED", m.mergedCount >= 50 ? "50+" : m.mergedCount)}
    <text x="${x0}" y="${BODY_Y + 186}" font-size="10" fill="${C.dim}" letter-spacing="1">ONE LAP = TIME BETWEEN TWO MERGED PRS</text>
    <text x="390" y="${BODY_Y + 10}" font-size="10.5" fill="${C.dim}" letter-spacing="1.5">RECENT LAPS</text>
    ${rows}`;
}

/* ---------- pieces ---------- */

// 240° sweep arc gauge with ticks, redline and an animated needle.
function arcGauge(ctx, o) {
  const { cx, cy, r, min, max, value, ticks, label, sub, unit = "", small } = o;
  const a0 = -210, a1 = 30; // degrees, 0 = 3 o'clock
  const ang = (v) => a0 + ((Math.min(Math.max(v, min), max) - min) / (max - min)) * (a1 - a0);
  const parts = [];

  parts.push(arc(cx, cy, r, a0, a1, C.faint, small ? 5 : 7));
  if (o.redFrom != null) parts.push(arc(cx, cy, r, ang(o.redFrom), a1, C.red, small ? 5 : 7, 0.85));
  if (o.lowRed != null) parts.push(arc(cx, cy, r, a0, ang(o.lowRed), C.amber, small ? 5 : 7, 0.85));
  parts.push(arc(cx, cy, r, a0, ang(value), C.cyan, small ? 2 : 3, 0.9));

  for (let t = 0; t <= ticks; t++) {
    const v = min + (t / ticks) * (max - min);
    const a = rad(ang(v));
    const p1 = [cx + Math.cos(a) * (r - 10), cy + Math.sin(a) * (r - 10)];
    const p2 = [cx + Math.cos(a) * (r - (small ? 18 : 22)), cy + Math.sin(a) * (r - (small ? 18 : 22))];
    const lt = [cx + Math.cos(a) * (r - (small ? 28 : 34)), cy + Math.sin(a) * (r - (small ? 28 : 34)) + 4];
    parts.push(`<line x1="${f(p1[0])}" y1="${f(p1[1])}" x2="${f(p2[0])}" y2="${f(p2[1])}" stroke="${C.text}" stroke-width="2"/>`);
    if (!small || (t !== 0 && t !== ticks))
      parts.push(`<text x="${f(lt[0])}" y="${f(lt[1])}" font-size="${small ? 9 : 10.5}" fill="${C.dim}" text-anchor="middle">${Math.round(v)}</text>`);
  }

  const final = ang(value);
  const len = r - 8;
  const needle = `<line x1="${cx}" y1="${cy}" x2="${cx + len}" y2="${cy}" stroke="${C.red}" stroke-width="${small ? 3 : 4}" stroke-linecap="round" filter="url(#glow)"/>`;
  let needleG;
  if (ctx.animated) {
    const id = ctx.needles.length;
    ctx.needles.push({ id, from: a0 - final, page: ctx.pageIndex, cx, cy });
    needleG = `<g transform="rotate(${f(final)} ${cx} ${cy})"><g class="nd nd${id}">${needle}</g></g>`;
  } else {
    needleG = `<g transform="rotate(${f(final)} ${cx} ${cy})">${needle}</g>`;
  }

  parts.push(needleG);
  parts.push(`<circle cx="${cx}" cy="${cy}" r="${small ? 6 : 8}" fill="#1b2128" stroke="${C.dim}"/>`);
  parts.push(`<text x="${cx}" y="${cy + (small ? 46 : 44)}" text-anchor="middle" font-size="${small ? 24 : 34}" font-weight="700" fill="${C.text}">${value}${unit}</text>`);
  parts.push(`<text x="${cx}" y="${cy + (small ? 63 : 64)}" text-anchor="middle" font-size="${small ? 10.5 : 11}" letter-spacing="1.5" fill="${C.amber}" font-weight="700">${label}</text>`);
  if (sub) parts.push(`<text x="${cx}" y="${cy + 77}" text-anchor="middle" font-size="9.5" letter-spacing="1" fill="${C.dim}">${sub}</text>`);
  return parts.join("\n");
}

function arc(cx, cy, r, aStart, aEnd, color, width, opacity = 1) {
  if (aEnd - aStart < 0.5) return "";
  const s = rad(aStart), e = rad(aEnd);
  const large = aEnd - aStart > 180 ? 1 : 0;
  return `<path d="M ${f(cx + Math.cos(s) * r)} ${f(cy + Math.sin(s) * r)} A ${r} ${r} 0 ${large} 1 ${f(cx + Math.cos(e) * r)} ${f(cy + Math.sin(e) * r)}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
}

function readout(x, y, label, value, color = C.text) {
  return `<text x="${x}" y="${y}" font-size="9.5" fill="${C.dim}" letter-spacing="1.2">${label}</text>
    <text x="${x}" y="${y + 20}" font-size="17" fill="${color}" font-weight="700">${value}</text>`;
}

function gridLines() {
  const lines = [];
  for (let x = SCREEN.x + 40; x < SCREEN.x + SCREEN.w; x += 40)
    lines.push(`<line x1="${x}" y1="${BODY_Y - 8}" x2="${x}" y2="${H - 50}" stroke="${C.grid}"/>`);
  return lines.join("");
}

function styles(cycle, needles) {
  const n = PAGES.length;
  const slot = 100 / n;
  const fade = 1.2;
  const pageKF = `@keyframes show{0%{opacity:0}${f(fade)}%{opacity:1}${f(slot - fade)}%{opacity:1}${f(slot)}%{opacity:0}100%{opacity:0}}`;
  const pageRules = PAGES.map((_, i) =>
    `.p${i}{animation:show ${cycle}s linear ${i * PAGE_SECONDS}s infinite both}`).join("");
  // Each needle sweeps up from zero whenever its page appears.
  const needleRules = needles.map((nd) => {
    const sweep = slot * 0.18;
    return `@keyframes sw${nd.id}{0%{transform:rotate(${f(nd.from)}deg)}${f(sweep)}%{transform:rotate(0deg)}100%{transform:rotate(0deg)}}` +
      `.nd${nd.id}{transform-origin:${nd.cx}px ${nd.cy}px;animation:sw${nd.id} ${cycle}s cubic-bezier(.2,.9,.25,1.15) ${nd.page * PAGE_SECONDS}s infinite both}`;
  }).join("");
  return `<style>
.page,.tab{opacity:0}
${pageKF}${pageRules}${needleRules}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.45}}
.pulse{animation:pulse 1.4s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.nd{animation:none!important}}
</style>`;
}

/* ---------- helpers ---------- */

function fmtDur(ms) {
  if (ms == null) return "--";
  const mins = Math.floor(ms / 60000);
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), mm = mins % 60;
  return d > 0 ? `${d}d ${pad(h)}:${pad(mm)}` : `${pad(h)}:${pad(mm)}`;
}
function lastSevenLabels(now) {
  const names = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now); d.setUTCDate(d.getUTCDate() - (6 - i));
    return names[d.getUTCDay()];
  });
}
const pad = (n) => String(n).padStart(2, "0");
const rad = (d) => (d * Math.PI) / 180;
const f = (n) => Number(n.toFixed(2));
const trunc = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
