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

// GITHUB'S OWN GROUND (November 20, 2026, Jiming: "make it the github color like the background, so it doesn't read as a
// sharp contrast"): no panel of its own; the page's colour shows through, and each theme takes GitHub's own text and
// border greys with the blossom pinks as the one accent
const THEMES = {
  dark: {
    panel: ["#0d1117", "#0d1117"], stroke: "#30363d", track: "#262c36", tick: "#484f58", label: "#9198a1", ink: "#f0f6fc", dim: "#9198a1",
    empty: "#151b23", lv: ["#5a2848", "#9b2f5e", "#d0628c", "#f0a9bc"], drum: "#151b23", drumDim: "#3d444d", prog: ["#9b2f5e", "#d0628c", "#f0a9bc"], shade: 0.55,
  },
  light: {
    panel: ["#ffffff", "#ffffff"], stroke: "#d1d9e0", track: "#e5e8ec", tick: "#a6aeb7", label: "#59636e", ink: "#1f2328", dim: "#59636e",
    empty: "#eff2f5", lv: ["#f7c9d6", "#ec98b3", "#d2628d", "#9b2f5e"], drum: "#f6f8fa", drumDim: "#c8ced5", prog: ["#c4507f", "#d2628d", "#e98aa8"], shade: 0.12,
  },
};

export function build(input, theme = "dark", extra = {}) {
  const calendar = input?.data?.user?.contributionsCollection?.contributionCalendar ?? input;
  const T = THEMES[theme] ?? THEMES.dark;
  const S = stats(calendar);
  const W = 840, H = 318;
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
  // SMALLER GAUGES, A BIGGER MAP (November 20, 2026, Jiming: "make the gauges smaller and the contribution map larger"):
  // three compact dials across the top, then the year at GitHub's own size, months and weekdays labelled, then a
  // single strip with the odometer and the records
  const TX = 420, TY = 104, SY = 108, LX = 190, RX = 650;
  const P = 12.4, C = 10;
  const weeks = calendar.weeks;
  const hmW = r2(weeks.length * P - (P - C));
  const hx = r2((W - hmW) / 2 + 12), hy = 196;
  const footY = r2(hy + 7 * P + 22);

  out.push(`<defs>
<linearGradient id="${id("panel")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.panel[0]}"/><stop offset="1" stop-color="${T.panel[1]}"/></linearGradient>
<linearGradient id="${id("prog")}" gradientUnits="userSpaceOnUse" x1="120" y1="0" x2="720" y2="0"><stop offset="0" stop-color="${T.prog[0]}"/><stop offset="0.5" stop-color="${T.prog[1]}"/><stop offset="1" stop-color="${T.prog[2]}"/></linearGradient>
<linearGradient id="${id("drumG")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="${T.shade}"/><stop offset="0.3" stop-color="#000" stop-opacity="0"/><stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${T.shade}"/></linearGradient>
<filter id="${id("glow")}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
<clipPath id="${id("clip")}"><rect x="6" y="4" width="828" height="${H - 12}" rx="3"/></clipPath>
<clipPath id="${id("drum")}"><rect x="0" y="0" width="13" height="19" rx="1"/></clipPath>
</defs>`);

  if (!extra.bare) out.push(`<rect x="6" y="4" width="828" height="${H - 12}" rx="3" fill="url(#${id("panel")})"/>`);
  out.push(`<g clip-path="url(#${id("clip")})">`);

  // top status line
  out.push(`<text x="30" y="27" font-family="${SANS}" font-size="9" font-weight="600" letter-spacing="1.6" fill="${T.label}">${esc((extra.handle ?? "JIMING-C").toUpperCase())}</text>`);
  out.push(`<text x="810" y="27" text-anchor="end" font-family="${MONO}" font-size="9" letter-spacing="1" fill="${T.label}">${MON[td.m]} ${td.d} ${td.y}</text>`);

  // dials
  out.push(dial({ key: "l", cx: LX, cy: SY, R: 44, trackW: 2.5, max: weekMax, value: S.last7, ...divs(weekMax), delay: 120 }));
  out.push(dial({ key: "c", cx: TX, cy: TY, R: 62, trackW: 3, max: tachMaxR, value: S.cur, step: tachStep, delay: 0, red: [redFrom, tachMaxR] }));
  out.push(dial({ key: "r", cx: RX, cy: SY, R: 44, trackW: 2.5, max: dayMax, value: S.bestDay.contributionCount, ...divs(dayMax), delay: 240 }));

  const lab = (x, y, s, size = 8.5, fill = T.label) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="${SANS}" font-size="${size}" font-weight="600" letter-spacing="1.4" fill="${fill}">${esc(s)}</text>`;
  const big = (x, y, s, size) =>
    `<text x="${x}" y="${y}" text-anchor="middle" font-family="${SANS}" font-size="${size}" font-weight="300" letter-spacing="-1" fill="${T.ink}">${esc(s)}</text>`;
  out.push(`<g class="ro">`);
  out.push(big(TX, TY + 13, S.cur, 40));
  out.push(lab(TX, TY + 31, "DAY STREAK", 8, T.ink));
  out.push(`<text x="${TX}" y="${TY + 52}" text-anchor="middle" font-family="${SANS}" font-size="10" fill="${T.dim}">${ss ? `since ${Mon[ss.m]} ${ss.d}` : "no active streak"}</text>`);
  out.push(big(LX, SY + 8, fmt(S.last7), 22));
  out.push(lab(LX, SY + 38, "LAST 7 DAYS", 7.5));
  out.push(`<text x="${LX}" y="${SY + 50}" text-anchor="middle" font-family="${SANS}" font-size="9" fill="${T.dim}">contributions</text>`);
  out.push(big(RX, SY + 8, fmt(S.bestDay.contributionCount), 22));
  out.push(lab(RX, SY + 38, "BEST DAY", 7.5));
  out.push(`<text x="${RX}" y="${SY + 50}" text-anchor="middle" font-family="${SANS}" font-size="9" fill="${T.dim}">${Mon[bd.m]} ${bd.d}, ${bd.y}</text>`);
  out.push(`</g>`);

  // ---------- the year, at GitHub's own size ----------
  const lvIdx = { NONE: -1, FIRST_QUARTILE: 0, SECOND_QUARTILE: 1, THIRD_QUARTILE: 2, FOURTH_QUARTILE: 3 };
  let lastM = -1;
  weeks.forEach((w, wi) => {
    const m = parseD(w.contributionDays[0].date).m;
    if (m !== lastM && wi < weeks.length - 2) { out.push(`<text x="${r2(hx + wi * P)}" y="${hy - 8}" font-family="${SANS}" font-size="9.5" fill="${T.label}">${Mon[m]}</text>`); lastM = m; }
  });
  for (const [r, s2] of [[1, "Mon"], [3, "Wed"], [5, "Fri"]]) out.push(`<text x="${r2(hx - 8)}" y="${r2(hy + r * P + C - 1.5)}" text-anchor="end" font-family="${SANS}" font-size="9.5" fill="${T.label}">${s2}</text>`);
  out.push(`<g class="hm">`);
  weeks.forEach((w, wi) => {
    const cells = w.contributionDays.map((d) => {
      const li = lvIdx[d.contributionLevel] ?? -1;
      const isToday = d.date === S.today;
      return `<rect x="${r2(hx + wi * P)}" y="${r2(hy + d.weekday * P)}" width="${C}" height="${C}" rx="1.5" fill="${li < 0 ? T.empty : T.lv[li]}"${isToday ? ` class="today"` : ""}/>`;
    }).join("");
    out.push(`<g class="k" style="animation-delay:${600 + wi * 22}ms">${cells}</g>`);
  });
  out.push(`</g>`);

  // ---------- the strip under the map: the odometer, then the records ----------
  const digits = String(S.total), nd = Math.max(6, digits.length), padded = digits.padStart(nd, "0");
  const DW = 13, DG = 2, DH = 19, oy = r2(footY - 14);
  padded.split("").forEach((ch, k) => {
    const dv = Number(ch), lead = k < nd - digits.length, x = r2(hx + k * (DW + DG)), key = `d${k}`;
    const strip = [];
    for (let v = 0; v <= 10; v++) strip.push(`<text x="6.5" y="${r2(v * DH + 13.5)}" text-anchor="middle" font-family="${MONO}" font-size="12" font-weight="600" fill="${lead ? T.drumDim : T.ink}">${v % 10}</text>`);
    out.push(`<g transform="translate(${x} ${oy})"><rect width="${DW}" height="${DH}" rx="1" fill="${T.drum}"/><g clip-path="url(#${id("drum")})"><g class="${key}">${strip.join("")}</g></g><rect width="${DW}" height="${DH}" rx="1" fill="url(#${id("drumG")})"/></g>`);
    css.push(`.${key}{transform:translateY(${-dv * DH}px);animation:${key} 1600ms cubic-bezier(.3,0,.2,1) ${700 + (nd - 1 - k) * 90}ms both}`);
    css.push(`@keyframes ${key}{0%{transform:translateY(0px)}100%{transform:translateY(${-dv * DH}px)}}`);
  });
  out.push(`<text x="${r2(hx + nd * (DW + DG) + 8)}" y="${footY}" font-family="${SANS}" font-size="10" fill="${T.dim}">contributions in the last 12 months</text>`);
  const recs = [["BEST STREAK", `${S.best} days`], ["ACTIVE DAYS", `${S.active} of ${S.days.length}`]];
  let rx = r2(hx + hmW);
  for (const [k, v] of recs.reverse()) {
    out.push(`<text x="${rx}" y="${footY}" text-anchor="end" font-family="${SANS}" font-size="10" fill="${T.ink}" font-weight="600">${esc(v)}</text>`);
    const vw = v.length * 6.2 + 8;
    out.push(`<text x="${r2(rx - vw)}" y="${footY}" text-anchor="end" font-family="${SANS}" font-size="8" font-weight="600" letter-spacing="1.4" fill="${T.label}">${k}</text>`);
    rx = r2(rx - vw - k.length * 7 - 22);
  }

  out.push(`</g>`);
  if (!extra.bare) out.push(`<rect x="6.5" y="4.5" width="827" height="${H - 13}" rx="2.5" fill="none" stroke="${T.stroke}" stroke-width="1"/>`);

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
