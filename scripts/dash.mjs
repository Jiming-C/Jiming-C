// THE DASH: the whole README as one instrument panel. The intro (panels.mjs), the contribution cluster (cluster.mjs),
// the work timeline (panels.mjs) and the toolbox, stacked in a single plum panel and parted by hairlines. Each section is
// drawn bare (no background or border of its own) and nested as an inner <svg> at its place; the dash draws the one
// panel, its rim and the glass sheen that crosses all of it.
//   build(calendar, theme, now) -> SVG string
import { build as cluster } from "./cluster.mjs";
import { intro, worked, setBare, THEME } from "./panels.mjs";

const SANS = `-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans',Helvetica,Arial,sans-serif`;
const MONO = `ui-monospace,SFMono-Regular,Menlo,monospace`;
const TOOLS = [
  ["LANGUAGES", "Python · Java · C# · C · JavaScript / TypeScript · SQL"],
  ["BUILD", "React · Next.js · three.js · FastAPI · Flask · Tailwind"],
  ["AI", "RAG · MCP servers · agent orchestration · evals · PyTorch · YOLOv8"],
  ["INFRA", "AWS · Vercel · Cloudflare Workers · Docker · Git · Linux"],
  ["CARS", "CAN bus · DBC · openpilot · sunnypilot"],
];
const LINKS = ["jimingc.com", "linkedin.com/in/jimingc", "jimingchen2015@gmail.com"];
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// an inner section: its own svg, placed at y (its outer width and height kept, so its coordinates hold)
const inner = (svg, y) => svg.replace(/^<svg ([^>]*?)width="(\d+)" height="(\d+)"/, (_, a, w, h) => `<svg ${a}x="0" y="${y}" width="${w}" height="${h}"`);

export function build(calendar, theme = "dark", now) {
  const T = THEME[theme];
  setBare(true);
  const parts = [
    [intro(theme), 168],
    [cluster(calendar, theme, { handle: "Last 12 months on GitHub", bare: true }), 278],
    [worked(theme, now), 318],
  ];
  setBare(false);
  const W = 840;
  let y = 0, body = "";
  parts.forEach(([svg, h], i) => {
    if (i) body += `<line x1="30" y1="${y + 2}" x2="${W - 30}" y2="${y + 2}" stroke="#2a2433"/>`;
    body += inner(svg, y);
    y += h - 8;
  });
  // the toolbox, as the panel's spec sheet, and the links along the foot
  body += `<line x1="30" y1="${y + 2}" x2="${W - 30}" y2="${y + 2}" stroke="#2a2433"/>`;
  body += `<text x="30" y="${y + 34}" font-family="${SANS}" font-size="9" font-weight="600" letter-spacing="1.6" fill="#8b949e">TOOLBOX</text>`;
  TOOLS.forEach(([k, v], i) => {
    const ty = y + 62 + i * 22;
    body += `<g class="tl" style="animation-delay:${(0.4 + i * 0.12).toFixed(2)}s"><text x="30" y="${ty}" font-family="${SANS}" font-size="9" font-weight="600" letter-spacing="1.6" fill="#f0a9bc">${k}</text><text x="142" y="${ty}" font-family="${MONO}" font-size="12" fill="#f4e9ea">${esc(v)}</text></g>`;
  });
  y += 62 + TOOLS.length * 22 + 10;
  body += `<line x1="30" y1="${y}" x2="${W - 30}" y2="${y}" stroke="#2a2433"/>`;
  body += `<text x="30" y="${y + 30}" font-family="${MONO}" font-size="11" fill="#a39aa8">${LINKS.map((l, i) => `${i ? `<tspan fill="#d0628c">  /  </tspan>` : ""}${esc(l)}`).join("")}</text>`;
  body += `<text x="${W - 30}" y="${y + 30}" text-anchor="end" font-family="${SANS}" font-size="9" font-weight="600" letter-spacing="1.6" fill="#8b949e">REDRAWN EVERY FEW HOURS</text>`;
  const H = y + 52;

  const label = "Jiming Chen: CS at the University of Maryland, open to 2027 new-grad SWE and APM roles and Winter/Spring 2027 co-ops. A dashboard of the last 12 months on GitHub, where I've worked, my toolbox and links.";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>
<defs>
<linearGradient id="dash${theme[0]}-pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${T.p0}"/><stop offset="1" stop-color="${T.p1}"/></linearGradient>
<linearGradient id="dash${theme[0]}-sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.04"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<clipPath id="dash${theme[0]}-clip"><rect x="6" y="4" width="${W - 12}" height="${H - 12}" rx="3"/></clipPath>
</defs>
<style>.dsh{animation:dsh 12s ease-in-out 2s infinite}@keyframes dsh{0%{transform:skewX(-18deg) translateX(0px)}45%,100%{transform:skewX(-18deg) translateX(${W + 700}px)}}
.tl{animation:tl .6s ease-out both}@keyframes tl{0%{opacity:0;transform:translateX(-6px)}100%{opacity:1;transform:translateX(0px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
<rect x="6" y="4" width="${W - 12}" height="${H - 12}" rx="3" fill="url(#dash${theme[0]}-pg)"/>
<g clip-path="url(#dash${theme[0]}-clip)">
${body}
<rect class="dsh" x="-300" y="0" width="240" height="${H}" fill="url(#dash${theme[0]}-sh)" transform="skewX(-18)"/>
</g>
<rect x="6.5" y="4.5" width="${W - 13}" height="${H - 13}" rx="2.5" fill="none" stroke="${T.stroke}" stroke-width="1"/>
</svg>`;
}
