// THE REST OF THE DASH: the README's intro, links and work timeline as panels in the contribution cluster's style
// (scripts/cluster.mjs), each with something moving. GitHub shows README images through <img>, so these are self-contained SVGs: CSS
// animation and SMIL only, system fonts, no scripts. One dark and one light variant each (the panels stay dark like the
// cluster's; the light variant takes the cluster's cream rim and blossom shadow so it sits well on a white page).
//   import { panels } from "./panels.mjs"; panels() -> { "intro-dark.svg": "<svg ...>", ... }

const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,monospace`;
const C = {
  ink: "#f4e9ea", dim: "#a39aa8", label: "#8b949e", track: "#2a2433", tick: "#6e6478", band: "#110e16", bandStroke: "#2a2433",
  pink: "#f0a9bc", rose: "#d0628c", wine: "#9b2f5e", red: "#e5202a",
};
export const THEME = {
  dark: { p0: "#1d1826", p1: "#141019", stroke: "#2f2839", shadow: "#000000", shadowOp: 0.35 },
  light: { p0: "#2a2433", p1: "#1b1622", stroke: "#d9ccd3", shadow: "#9b2f5e", shadowOp: 0.16 },
};
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r2 = (n) => Math.round(n * 100) / 100;

let BARE = false;
export const setBare = (b) => { BARE = b; };
// one panel: the cluster's plum gradient, rim, soft shadow and the glass sheen that crosses it now and then
function panel(key, theme, W, H, body, css, label) {
  const T = THEME[theme], id = (s) => `${key}${theme[0]}-${s}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>
<defs>
<linearGradient id="${id("pg")}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.p0}"/><stop offset="1" stop-color="${T.p1}"/></linearGradient>
<linearGradient id="${id("pr")}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.wine}"/><stop offset="0.5" stop-color="${C.rose}"/><stop offset="1" stop-color="${C.pink}"/></linearGradient>
<linearGradient id="${id("sh")}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.045"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="${id("glow")}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.2"/></filter>
<filter id="${id("blur")}" x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="3"/></filter>
<clipPath id="${id("clip")}"><rect x="6" y="4" width="${W - 12}" height="${H - 12}" rx="3"/></clipPath>
</defs>
<style>
text{font-variant-numeric:tabular-nums}
.sheen{animation:sh 11s ease-in-out 1.5s infinite}
@keyframes sh{0%{transform:skewX(-18deg) translateX(0px)}45%,100%{transform:skewX(-18deg) translateX(${W + 600}px)}}
${css.replaceAll("ID(", `${key}${theme[0]}-`).replaceAll("@@", "")}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.rm-hide{display:none}}
</style>
${BARE ? "" : `<rect x="6" y="4" width="${W - 12}" height="${H - 12}" rx="3" fill="url(#${id("pg")})"/>`}
<g clip-path="url(#${id("clip")})">
${body(id)}
${BARE ? "" : `<rect class="sheen" x="-260" y="0" width="200" height="${H}" fill="url(#${id("sh")})" transform="skewX(-18)"/>`}
</g>
${BARE ? "" : `<rect x="6.5" y="4.5" width="${W - 13}" height="${H - 13}" rx="2.5" fill="none" stroke="${T.stroke}" stroke-width="1"/>`}
</svg>`;
}

const label = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${o.size ?? 9}" font-weight="600" letter-spacing="${o.ls ?? 1.6}" fill="${o.fill ?? C.label}"${o.anchor ? ` text-anchor="${o.anchor}"` : ""}>${esc(s)}</text>`;
const text = (x, y, s, o = {}) => `<text x="${x}" y="${y}" font-family="${o.mono ? MONO : SANS}" font-size="${o.size ?? 12}" font-weight="${o.w ?? 400}" fill="${o.fill ?? C.dim}"${o.anchor ? ` text-anchor="${o.anchor}"` : ""}${o.ls != null ? ` letter-spacing="${o.ls}"` : ""}${o.cls ? ` class="${o.cls}"` : ""}>${esc(s)}</text>`;

// ---------------------------------------------------------------------------------------------------------------- intro
const ROLES = ["Software Engineer", "Full-Stack Developer", "Founder", "Car Enthusiast", "Product Manager"];
export function intro(theme) {
  const W = 840, H = 168, per = 3.2, cyc = per * ROLES.length;
  let css = `.caret{animation:bl 1s steps(1) infinite}@keyframes bl{50%{opacity:0}}
.led{animation:led 2.4s ease-in-out infinite}@keyframes led{0%,100%{opacity:1}50%{opacity:.35}}`;
  // the role ticker: each role types in, holds and leaves in turn (a clip that grows in steps), one at a time
  const roles = ROLES.map((r, i) => {
    const w = r.length * 9.7 + 6, a = (i * per) / cyc * 100, b = ((i + 1) * per) / cyc * 100;
    const t1 = a + (0.9 / cyc) * 100, t2 = b - (0.5 / cyc) * 100;
    css += `.r${i}{animation:r${i} ${cyc}s steps(1) infinite}@keyframes r${i}{0%{opacity:0}${r2(a)}%{opacity:1}${r2(b)}%{opacity:0}100%{opacity:0}}
.rc${i}{animation:rc${i} ${cyc}s linear infinite}@keyframes rc${i}{0%,${r2(a)}%{width:0px}${r2(t1)}%{width:${w}px;animation-timing-function:steps(1)}${r2(t2)}%{width:${w}px}${r2(b)}%,100%{width:0px}}`;
    return { r, i };
  });
  const body = (id) => `
${label(30, 34, "JIMING-C · DRIVER PROFILE")}
${text(30, 78, "Hi, I'm Jiming", { size: 34, w: 300, fill: C.ink, ls: -0.5 })}
<g transform="translate(30 104)">
  ${roles.map(({ r, i }) => `<g class="r${i}"><clipPath id="${id(`rc${i}`)}"><rect class="rc${i}" x="0" y="-14" width="0" height="20"/></clipPath><text x="0" y="0" font-family="${MONO}" font-size="16" fill="${C.pink}" clip-path="url(#${id(`rc${i}`)})">${esc(r)}</text></g>`).join("")}
</g>
<rect class="caret" x="${30 + 0}" y="91" width="2" height="17" fill="${C.pink}" opacity="0"/>
${text(30, 136, "CS @ University of Maryland. I build software that touches the real world:", { size: 12.5 })}
${text(30, 153, "cars, markets, and the people who use them.", { size: 12.5 })}
<line x1="520" y1="26" x2="520" y2="146" stroke="${C.bandStroke}"/>
${label(548, 34, "NOW")}
<circle class="led" cx="584" cy="31" r="3" fill="${C.pink}"/><circle class="led" cx="584" cy="31" r="6" fill="${C.pink}" opacity=".35" filter="url(#${id("glow")})"/>
${text(548, 66, "Open to 2027 new-grad", { size: 15, fill: C.ink })}
${text(548, 86, "SWE / APM roles", { size: 15, fill: C.ink })}
${text(548, 112, "and Winter / Spring 2027 co-ops", { size: 12.5 })}
${label(548, 142, "GRADUATING MAY 2027", { fill: C.pink, size: 9 })}`;
  // the caret rides the typing: one caret per role, moved to that role's end while it shows
  const carets = ROLES.map((r, i) => {
    const a = (i * per) / cyc * 100, b = ((i + 1) * per) / cyc * 100, t1 = a + (0.9 / cyc) * 100, x = r.length * 9.7 + 4;
    const t2 = b - (0.5 / cyc) * 100;
    css += `.cx${i}{animation:cx${i} ${cyc}s linear infinite}@keyframes cx${i}{0%,${r2(a)}%{opacity:0;transform:translateX(0px)}${r2(a + 0.01)}%{opacity:1;transform:translateX(0px)}${r2(t1)}%{transform:translateX(${r2(x)}px)}${r2(t2)}%{opacity:1;transform:translateX(${r2(x)}px)}${r2(b - 0.01)}%{opacity:1;transform:translateX(0px)}${r2(b)}%,100%{opacity:0}}`;
    return `<rect class="cx${i} rm-hide" x="30" y="91" width="2" height="17" fill="${C.pink}" opacity="0"/>`;
  }).join("");
  return panel("in", theme, W, H, (id) => body(id).replace(`<rect class="caret"`, `${carets}<rect class="caret rm-hide"`), css,
    "Hi, I'm Jiming. Software engineer, full-stack developer, founder. CS at the University of Maryland. Open to 2027 new-grad SWE and APM roles and Winter/Spring 2027 co-ops; graduating May 2027.");
}

// ---------------------------------------------------------------------------------------------------------------- links
function button(theme, key, word, sub) {
  const W = 272, H = 64;
  const css = `.dot{animation:dt 2.6s ease-in-out infinite}@keyframes dt{0%,100%{opacity:1}50%{opacity:.3}}`;
  return panel(`b${key}`, theme, W, H, (id) => `
${text(26, 38, word, { size: 15, w: 600, fill: C.ink })}
${text(W - 46, 37, sub, { size: 10, anchor: "end", mono: true, fill: C.label })}
<path d="M${W - 34} 26 L${W - 26} 32 L${W - 34} 38" fill="none" stroke="${C.pink}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
<circle class="dot" cx="16" cy="32" r="2.6" fill="${C.pink}"/>`, css, `${word} ${sub}`);
}

// ---------------------------------------------------------------------------------------------------------------- worked
// where I've worked, as a lap chart across the years: each role a bar on its own line, drawn in turn, a dot driving to NOW
const JOBS = [
  { co: "JPMorgan Chase", role: "Software Engineering Intern", what: "RAG code search over a 340K-line codebase, in Copilot via MCP", from: [2026, 5], to: [2026, 8] },
  { co: "AWS", role: "Student Ambassador, UMD", what: "EC2 and S3 workshops, 70+ Builder Center signups", from: [2026, 3], to: [2026, 5] },
  { co: "Systems Planning & Analysis", role: "Software Engineering Intern", what: "C# simulation tools for the U.S. Navy; cut latency 40%", from: [2025, 5], to: [2025, 8] },
  { co: "Johns Hopkins APL", role: "Software Development Intern", what: "C# automation, a PowerShell/Bash pipeline across 10+ machines", from: [2023, 10], to: [2024, 5] },
  { co: "NIO Detailing", role: "Founder", what: "400+ customers; automated booking cut booking time 70%", from: [2023, 4], to: null },
];
export function worked(theme, now = [2026, 11]) {
  const W = 840, top = 58, rowH = 44, H = top + JOBS.length * rowH + 40;
  const L = 420, R = 806, y0 = 2023, y1 = 2027;
  const X = ([y, m]) => r2(L + (((y - y0) * 12 + (m - 1)) / ((y1 - y0) * 12)) * (R - L));
  let css = `.bar{transform-box:fill-box;transform-origin:left center;animation:bar 1.1s cubic-bezier(.3,0,.2,1) both}@keyframes bar{0%{transform:scaleX(0)}100%{transform:scaleX(1)}}
.row{animation:row .6s ease-out both}@keyframes row{0%{opacity:0;transform:translateX(-8px)}100%{opacity:1;transform:translateX(0px)}}
.now{animation:nw 2.2s ease-in-out infinite}@keyframes nw{0%,100%{opacity:1}50%{opacity:.3}}`;
  const body = (id) => {
    let g = `${label(30, 34, "WHERE I'VE WORKED")}`;
    for (let yy = y0; yy <= y1; yy++) {
      const x = X([yy, 1]);
      g += `<line x1="${x}" y1="${top - 6}" x2="${x}" y2="${top + JOBS.length * rowH - 8}" stroke="${C.bandStroke}" stroke-dasharray="2 4"/>${text(x, top + JOBS.length * rowH + 10, String(yy), { size: 10, mono: true, anchor: "middle", fill: C.label })}`;
    }
    const nx = X(now);
    g += `<line x1="${nx}" y1="${top - 10}" x2="${nx}" y2="${top + JOBS.length * rowH - 6}" stroke="${C.pink}" stroke-width="1" opacity=".5"/>${label(nx, top - 14, "NOW", { anchor: "middle", fill: C.pink, size: 8 })}`;
    JOBS.forEach((j, i) => {
      const y = top + i * rowH, d = 0.25 + i * 0.22;
      const x0 = X(j.from), x1 = j.to ? X(j.to) : nx;
      g += `<g class="row" style="animation-delay:${d}s">
${text(30, y + 12, j.co, { size: 13, w: 600, fill: C.ink })}${text(30 + j.co.length * 7.6 + 10, y + 12, j.role, { size: 10.5, fill: C.label })}
${text(30, y + 28, j.what, { size: 11 })}</g>
<rect x="${L}" y="${y + 7}" width="${R - L}" height="4" fill="${C.track}"/>
<rect class="bar" x="${x0}" y="${y + 7}" width="${r2(Math.max(6, x1 - x0))}" height="4" fill="url(#${id("pr")})" style="animation-delay:${d + 0.15}s"/>`;
      if (!j.to) g += `<circle class="now" cx="${nx}" cy="${y + 10}" r="4" fill="${C.ink}"/><circle class="now" cx="${nx}" cy="${y + 10}" r="8" fill="${C.pink}" opacity=".35" filter="url(#${id("glow")})"/>`;
    });
    return g;
  };
  return panel("wk", theme, W, H, body, css, "Where I've worked: " + JOBS.map((j) => `${j.co}, ${j.role}: ${j.what}`).join(". ") + ".");
}

export function panels(now) {
  const out = {};
  for (const theme of ["dark", "light"]) {
    out[`intro-${theme}.svg`] = intro(theme);
    out[`worked-${theme}.svg`] = worked(theme, now);
    out[`btn-site-${theme}.svg`] = button(theme, "site", "jimingc.com", "the drive");
    out[`btn-li-${theme}.svg`] = button(theme, "li", "LinkedIn", "in/jimingc");
    out[`btn-mail-${theme}.svg`] = button(theme, "mail", "Email", "say hi");
  }
  return out;
}
