// THE CLUSTER: a minimal five-dial style instrument cluster that reads a GitHub contribution calendar.
// build(calendar, theme, extra) -> SVG string. Run directly to write cluster-dark.svg / cluster-light.svg.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,monospace`;
const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const Mon = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const A0 = 150, SWEEP = 240; // dial: 0 at lower left, max at lower right, clockwise through the top
const r2 = (n) => Math.round(n * 100) / 100;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pt = (cx, cy, r, deg) => [r2(cx + r * Math.cos((deg * Math.PI) / 180)), r2(cy + r * Math.sin((deg * Math.PI) / 180))];
const ang = (f) => A0 + SWEEP * Math.max(0, Math.min(1, f));
function arc(cx, cy, r, d0, d1) {
  const [x0, y0] = pt(cx, cy, r, d0), [x1, y1] = pt(cx, cy, r, d1);
  return `M${x0} ${y0}A${r} ${r} 0 ${d1 - d0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}
const fmt = (n) => n.toLocaleString("en-US");
const parseD = (s) => { const [y, m, d] = s.split("-").map(Number); return { y, m: m - 1, d }; };

export function stats(calendar) {
  const days = calendar.weeks.flatMap((w) => w.contributionDays);
  const n = days.length;
  // the calendar's last day is "today"; an empty today does not break the streak
  let i = n - 1, cur = 0;
  if (i >= 0 && days[i].contributionCount === 0) i--;
  for (; i >= 0 && days[i].contributionCount > 0; i--) cur++;
  const streakStart = cur > 0 ? days[i + 1].date : null;
  let best = 0, run = 0;
  for (const d of days) { run = d.contributionCount > 0 ? run + 1 : 0; best = Math.max(best, run); }
  const last7 = days.slice(-7).reduce((a, d) => a + d.contributionCount, 0);
  let bestWeek = 0;
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let j = Math.max(0, k - 6); j <= k; j++) s += days[j].contributionCount;
    bestWeek = Math.max(bestWeek, s);
  }
  const bestDay = days.reduce((a, d) => (d.contributionCount > a.contributionCount ? d : a), days[0]);
  const active = days.filter((d) => d.contributionCount > 0).length;
  return { days, total: calendar.totalContributions, cur, best, streakStart, last7, bestWeek, bestDay, active, today: days[n - 1]?.date };
}

function divs(max) {
  const round = (x) => { const p = 10 ** Math.floor(Math.log10(x)); const m = x / p; return [1, 2, 5].some((k) => Math.abs(m - k) < 1e-9); };
  for (const n of [4, 3, 5, 6, 2]) { const s = max / n; if (round(s)) return { step: s, minor: s / (round(s / 5) && s / 5 >= 1 ? 5 : 4) }; }
  return { step: max / 4, minor: max / 16 };
}

function niceMax(v, steps) {
  for (const s of steps) if (s >= v) return s;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

const THEMES = {
  dark: {
    panel: ["#1d1826", "#141019"], stroke: "#2f2839", shadow: "#000000", shadowOp: 0.35,
    face: ["#231d2c", "#15111b"], bezel: "#3a3145", track: "#2a2433", tick: "#6e6478", tickMajor: "#c9bcc4",
    label: "#8b949e", ink: "#f4e9ea", dim: "#8b949e", band: "#110e16", bandStroke: "#2a2433",
    empty: "#262030", lv: ["#5a2848", "#9b2f5e", "#d0628c", "#f0a9bc"], drum: "#1c1724", drumDim: "#4a4155",
  },
  light: {
    panel: ["#2a2433", "#1b1622"], stroke: "#d9ccd3", shadow: "#9b2f5e", shadowOp: 0.16,
    face: ["#2e2738", "#1a1520"], bezel: "#463c52", track: "#352d40", tick: "#7a7084", tickMajor: "#d6c9d0",
    label: "#a39aa8", ink: "#f4e9ea", dim: "#a39aa8", band: "#15111b", bandStroke: "#3a3145",
    empty: "#2e2738", lv: ["#62294f", "#9b2f5e", "#d0628c", "#f0a9bc"], drum: "#221c2b", drumDim: "#52485e",
  },
};

export function build(input, theme = "dark", extra = {}) {
  const calendar = input?.data?.user?.contributionsCollection?.contributionCalendar ?? input;
  const T = THEMES[theme] ?? THEMES.dark;
  const S = stats(calendar);
  const W = 840, H = 278;
  const id = (s) => `cl${theme[0]}-${s}`; // ids unique per theme so both can live on one page
  const out = [];
  const css = [];
  const SWEEP_MS = 2200;

  // ---------- a dial ----------
  // opts: cx, cy, R (scale radius), max, value, step (label step), minor (minor tick step), red [from,to], name, needle len
  function dial(o) {
    // MINIMAL GAUGE: a hairline track, the value as a pink arc with a round end and a small glowing dot riding its tip,
    // no face, no bezel, no numbers on the scale, no needle; the tach alone keeps a thin red segment past the record
    const { cx, cy, R, max, value, key } = o;
    const g = [];
    const tw = o.trackW;
    g.push(`<path d="${arc(cx, cy, R, A0, A0 + SWEEP)}" fill="none" stroke="${T.track}" stroke-width="${tw}" stroke-linecap="round"/>`);
    if (o.red) {
      const a0 = ang(o.red[0] / max), a1 = ang(o.red[1] / max);
      g.push(`<path class="red" d="${arc(cx, cy, R + tw + 3, a0, a1)}" fill="none" stroke="#e5202a" stroke-width="1.4" stroke-linecap="round" opacity="0.9"/>`);
    }
    // three quiet marks: zero, half and full scale
    for (const f of [0, 0.5, 1]) {
      const [x0, y0] = pt(cx, cy, R - tw / 2 - 5, ang(f)), [x1, y1] = pt(cx, cy, R - tw / 2 - 9, ang(f));
      g.push(`<line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}" stroke="${T.tick}" stroke-width="1" stroke-linecap="round" opacity="0.7"/>`);
    }
    const len = r2((Math.PI * R * SWEEP) / 180);
    const f = Math.max(0, Math.min(1, value / max));
    const off = r2(len * (1 - f));
    g.push(`<path class="p-${key}" d="${arc(cx, cy, R, A0, A0 + SWEEP)}" fill="none" stroke="url(#${id("prog")})" stroke-width="${tw}" stroke-linecap="round" stroke-dasharray="${len} ${len + 2}" stroke-dashoffset="${off}"/>`);
    css.push(`.p-${key}{stroke-dashoffset:${off}px;animation:p-${key} ${SWEEP_MS}ms cubic-bezier(.45,0,.25,1) ${o.delay}ms both}`);
    css.push(`@keyframes p-${key}{0%{stroke-dashoffset:${len}px}46%{stroke-dashoffset:0px}100%{stroke-dashoffset:${off}px}}`);
    // the tip: a dot on the arc's end, rotated about the dial's centre with the sweep
    const va = r2(ang(f));
    const dot = `<circle cx="${R}" cy="0" r="${tw * 1.6}" fill="#f0a9bc" filter="url(#${id("glow")})" opacity="0.9"/><circle cx="${R}" cy="0" r="${tw * 0.95}" fill="${T.ink}"/>`;
    g.push(`<g transform="translate(${cx} ${cy})"><g class="n-${key}">${dot}</g></g>`);
    css.push(`.n-${key}{transform:rotate(${va}deg);animation:n-${key} ${SWEEP_MS}ms cubic-bezier(.45,0,.25,1) ${o.delay}ms both}`);
    css.push(`@keyframes n-${key}{0%{transform:rotate(${A0}deg)}46%{transform:rotate(${A0 + SWEEP}deg)}100%{transform:rotate(${va}deg)}}`);
    return g.join("");
  }

  // ---------- data ----------
  const redFrom = Math.max(1, S.best);
  const tachMax = Math.max(10, Math.ceil((Math.max(S.best, S.cur, 6) * 1.35) / 2) * 2);
  const tachStep = tachMax <= 20 ? 2 : tachMax <= 50 ? 5 : 10;
  const tachMaxR = Math.ceil(tachMax / tachStep) * tachStep;
  const weekMax = niceMax(Math.max(S.bestWeek, S.last7, 10), [10, 20, 40, 50, 80, 100, 150, 200, 300, 400, 500, 600, 800, 1000]);
  const dayMax = niceMax(Math.max(S.bestDay.contributionCount * 1.15, 5), [5, 10, 20, 40, 50, 60, 80, 100, 150, 200, 300, 400, 500]);
  const bd = parseD(S.bestDay.date), td = parseD(S.today);
  const ss = S.streakStart ? parseD(S.streakStart) : null;

  // ---------- layout ----------
  const TX = 420, TY = 110, SY = 116, LX = 170, RX = 670;

  // defs
  out.push(`<defs>
<linearGradient id="${id("panel")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.panel[0]}"/><stop offset="1" stop-color="${T.panel[1]}"/></linearGradient>
<radialGradient id="${id("face")}" cx="0.5" cy="0.38" r="0.62"><stop offset="0" stop-color="${T.face[0]}"/><stop offset="1" stop-color="${T.face[1]}"/></radialGradient>
<linearGradient id="${id("prog")}" gradientUnits="userSpaceOnUse" x1="60" y1="0" x2="780" y2="0"><stop offset="0" stop-color="#9b2f5e"/><stop offset="0.5" stop-color="#d0628c"/><stop offset="1" stop-color="#f0a9bc"/></linearGradient>
<linearGradient id="${id("sheen")}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.045"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="${id("drumG")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0.55"/><stop offset="0.3" stop-color="#000" stop-opacity="0"/><stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.55"/></linearGradient>
<filter id="${id("glow")}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
<filter id="${id("shadow")}" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
<clipPath id="${id("clip")}"><rect x="6" y="4" width="828" height="266" rx="3"/></clipPath>
<clipPath id="${id("drum")}"><rect x="0" y="0" width="15" height="22" rx="2.5"/></clipPath>
</defs>`);

  // panel
    if (!extra.bare) out.push(`<rect x="6" y="4" width="828" height="266" rx="3" fill="url(#${id("panel")})"/>`);
  out.push(`<g clip-path="url(#${id("clip")})">`);

  // top status line
  out.push(`<text x="30" y="27" font-family="${SANS}" font-size="9" font-weight="600" letter-spacing="1.6" fill="${T.label}">${esc((extra.handle ?? "JIMING-C").toUpperCase())}</text>`);
  out.push(`<text x="810" y="27" text-anchor="end" font-family="${MONO}" font-size="9" letter-spacing="1" fill="${T.label}">${MON[td.m]} ${td.d} ${td.y}</text>`);

  // dials
  out.push(dial({
    key: "l", cx: LX, cy: SY, R: 60, faceR: 74, trackW: 3, max: weekMax, value: S.last7, ...divs(weekMax), tickL: 7, labelGap: 8, labelSize: 8.5, needleIn: 42, delay: 120, trembleMs: 3700,
  }));
  out.push(dial({
    key: "c", cx: TX, cy: TY, R: 86, faceR: 98, trackW: 3.5, max: tachMaxR, value: S.cur, step: tachStep, minor: tachMaxR <= 40 ? 1 : tachStep / 5,
    tickL: 9, labelGap: 9, labelSize: 10, needleIn: 60, delay: 0, trembleMs: 3100, red: [redFrom, tachMaxR],
  }));
  out.push(dial({
    key: "r", cx: RX, cy: SY, R: 60, faceR: 74, trackW: 3, max: dayMax, value: S.bestDay.contributionCount, ...divs(dayMax),
    tickL: 7, labelGap: 8, labelSize: 8.5, needleIn: 42, delay: 240, trembleMs: 4300,
  }));

  // readouts (fade in once the self-test needle passes back down)
  const lab = (x, y, s, size = 8.5, fill = T.label, extraAttr = "") =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="${SANS}" font-size="${size}" font-weight="600" letter-spacing="1.4" fill="${fill}"${extraAttr}>${esc(s)}</text>`;
  const big = (x, y, s, size) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="${SANS}" font-size="${size}" font-weight="300" letter-spacing="-1" fill="${T.ink}">${esc(s)}</text>`;
  out.push(`<g class="ro">`);
  // tach
  out.push(big(TX, TY + 14, S.cur, 54));
  out.push(lab(TX, TY + 36, S.cur === 1 ? "DAY STREAK" : "DAY STREAK", 8.5, T.ink));
  out.push(`<text x="${TX}" y="${TY + 64}" text-anchor="middle" font-family="${SANS}" font-size="10" fill="${T.dim}">${ss ? `since ${Mon[ss.m]} ${ss.d}` : "no active streak"}</text>`);
  // left
  out.push(big(LX, SY + 10, fmt(S.last7), 28));
  out.push(lab(LX, SY + 46, "LAST 7 DAYS", 8));
  out.push(`<text x="${LX}" y="${SY + 59}" text-anchor="middle" font-family="${SANS}" font-size="9" fill="${T.dim}">contributions</text>`);
  // right
  out.push(big(RX, SY + 10, fmt(S.bestDay.contributionCount), 28));
  out.push(lab(RX, SY + 46, "BEST DAY", 8));
  out.push(`<text x="${RX}" y="${SY + 59}" text-anchor="middle" font-family="${SANS}" font-size="9" fill="${T.dim}">${Mon[bd.m]} ${bd.d}, ${bd.y}</text>`);
  out.push(`</g>`);

  // ---------- bottom band: odometer | map | records ----------
  const BY = 209, BH = 52;
  out.push(`<rect x="22" y="${BY}" width="796" height="${BH}" rx="2" fill="${T.band}" stroke="${T.bandStroke}" stroke-width="1"/>`);
  // heatmap
  const P = 6, C = 4.8;
  const weeks = calendar.weeks;
  const hmW = weeks.length * P - (P - C);
  const hx = r2(TX - hmW / 2), hy = r2(BY + (BH - (7 * P - (P - C))) / 2);
  const lvIdx = { NONE: -1, FIRST_QUARTILE: 0, SECOND_QUARTILE: 1, THIRD_QUARTILE: 2, FOURTH_QUARTILE: 3 };
  out.push(`<g class="hm">`);
  weeks.forEach((w, wi) => {
    const cells = w.contributionDays.map((d) => {
      const li = lvIdx[d.contributionLevel] ?? -1;
      const fill = li < 0 ? T.empty : T.lv[li];
      const isToday = d.date === S.today;
      return `<rect x="${r2(hx + wi * P)}" y="${r2(hy + d.weekday * P)}" width="${C}" height="${C}" rx="0.6" fill="${fill}"${isToday ? ` class="today"` : ""}/>`;
    }).join("");
    out.push(`<g class="k" style="animation-delay:${600 + wi * 22}ms">${cells}</g>`);
  });
  out.push(`</g>`);
  // dividers
  const dl = r2(hx - 16), dr = r2(hx + hmW + 16);
  out.push(`<line x1="${dl}" y1="${BY + 10}" x2="${dl}" y2="${BY + BH - 10}" stroke="${T.bandStroke}"/>`);
  out.push(`<line x1="${dr}" y1="${BY + 10}" x2="${dr}" y2="${BY + BH - 10}" stroke="${T.bandStroke}"/>`);

  // odometer drums
  const digits = String(S.total);
  const nd = Math.max(6, digits.length);
  const padded = digits.padStart(nd, "0");
  const DW = 15, DG = 2, DH = 22;
  const ox = 38, oy = BY + (BH - DH) / 2;
  padded.split("").forEach((ch, k) => {
    const dv = Number(ch);
    const lead = k < nd - digits.length;
    const x = ox + k * (DW + DG);
    const strip = [];
    for (let v = 0; v <= 10; v++) strip.push(`<text x="7.5" y="${r2(v * DH + 15.5)}" text-anchor="middle" font-family="${MONO}" font-size="13.5" font-weight="600" fill="${lead ? T.drumDim : T.ink}">${v % 10}</text>`);
    const ty = -dv * DH;
    const key = `d${k}`;
    out.push(`<g transform="translate(${x} ${r2(oy)})"><rect width="${DW}" height="${DH}" rx="1" fill="${T.drum}"/><g clip-path="url(#${id("drum")})"><g class="${key}">${strip.join("")}</g></g><rect width="${DW}" height="${DH}" rx="1" fill="url(#${id("drumG")})"/></g>`);
    // roll: spin up through a full turn then land on the digit (lands right to left like a real odometer settling)
    css.push(`.${key}{transform:translateY(${ty}px);animation:${key} 1600ms cubic-bezier(.3,0,.2,1) ${700 + (nd - 1 - k) * 90}ms both}`);
    css.push(`@keyframes ${key}{0%{transform:translateY(0px)}100%{transform:translateY(${ty}px)}}`);
  });
  const otx = ox + nd * (DW + DG) + 8;
  out.push(`<text x="${otx}" y="${BY + 21}" font-family="${SANS}" font-size="8" font-weight="600" letter-spacing="1.4" fill="${T.label}">ODO</text>`);
  out.push(`<text x="${otx}" y="${BY + 33}" font-family="${SANS}" font-size="9" fill="${T.dim}">contributions</text>`);
  out.push(`<text x="${otx}" y="${BY + 44}" font-family="${SANS}" font-size="9" fill="${T.dim}">last 12 months</text>`);

  // records on the right
  const rx0 = dr + 18;
  const rec = (x, v, l1, l2) =>
    `<text x="${x}" y="${BY + 22}" font-family="${MONO}" font-size="17" font-weight="600" fill="${T.ink}">${esc(v)}</text>` +
    `<text x="${x}" y="${BY + 33}" font-family="${SANS}" font-size="7.5" font-weight="600" letter-spacing="1.2" fill="${T.label}">${esc(l1)}</text>` +
    `<text x="${x}" y="${BY + 42}" font-family="${SANS}" font-size="7.5" letter-spacing="0.3" fill="${T.dim}">${esc(l2)}</text>`;
  out.push(rec(rx0, S.best, "BEST STREAK", "days, 12 mo"));
  out.push(rec(rx0 + 98, S.active, "ACTIVE DAYS", `of ${S.days.length}`));

  // glass sheen
  if (!extra.bare) out.push(`<rect class="sheen" x="-260" y="0" width="220" height="${H}" fill="url(#${id("sheen")})" transform="skewX(-18)"/>`);
  out.push(`</g>`);
  if (!extra.bare) out.push(`<rect x="6.5" y="4.5" width="827" height="265" rx="2.5" fill="none" stroke="${T.stroke}" stroke-width="1"/>`);

  // ---------- style ----------
  const style = `
text{font-variant-numeric:tabular-nums}
.ro{animation:ro 700ms ease-out ${Math.round(SWEEP_MS * 0.62)}ms both}
@keyframes ro{0%{opacity:0}100%{opacity:1}}
.red{animation:red ${SWEEP_MS}ms ease-in-out both}
@keyframes red{0%,30%{opacity:.55}46%{opacity:1}70%,100%{opacity:.9}}
@keyframes tr{0%,100%{transform:rotate(0deg)}22%{transform:rotate(.35deg)}48%{transform:rotate(-.25deg)}74%{transform:rotate(.18deg)}}
.k{animation:k 500ms ease-out both}
@keyframes k{0%{opacity:0}100%{opacity:1}}
.today{animation:td 2.8s ease-in-out 3.2s infinite}
@keyframes td{0%,100%{opacity:1}50%{opacity:.45}}
.sheen{animation:sh 11s ease-in-out 2.6s infinite}
@keyframes sh{0%{transform:skewX(-18deg) translateX(0px)}45%,100%{transform:skewX(-18deg) translateX(1400px)}}
${css.join("\n")}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

  const title = `Contribution cluster: ${S.cur} day streak, ${fmt(S.last7)} contributions in the last 7 days, best day ${S.bestDay.contributionCount}, ${fmt(S.total)} in the last year`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(title)}"><title>${esc(title)}</title><style>${style}</style>${out.join("")}</svg>`;
}

// ---------- CLI ----------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const here = dirname(fileURLToPath(import.meta.url));
  const json = JSON.parse(readFileSync(join(here, "..", "contrib.json"), "utf8"));
  for (const t of ["dark", "light"]) {
    const svg = build(json, t);
    writeFileSync(join(here, `cluster-${t}.svg`), svg);
    console.log(`cluster-${t}.svg`, (svg.length / 1024).toFixed(1), "KB");
  }
}
