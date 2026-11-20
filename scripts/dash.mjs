// THE DASH: the whole README as one instrument panel. The intro (panels.mjs), the contribution cluster (cluster.mjs)
// and the toolbox (the work timeline came out on November 20, 2026, at Jiming's call), stacked in a single plum panel and parted by hairlines. Each section is
// drawn bare (no background or border of its own) and nested as an inner <svg> at its place; the dash draws the one
// sections on GitHub's own page colour (no panel of its own: Jiming, November 20, 2026, "make it the github color like
// the background"), parted by hairlines.
//   build(calendar, theme, now) -> SVG string
import { build as cluster } from "./cluster.mjs";
import { intro, setBare, PAL } from "./panels.mjs";

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
const heightOf = (svg) => Number(/height="(\d+(?:\.\d+)?)"/.exec(svg)[1]);
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// an inner section: its own svg, placed at y (its outer width and height kept, so its coordinates hold)
const inner = (svg, y) => svg.replace(/^<svg ([^>]*?)width="(\d+)" height="(\d+)"/, (_, a, w, h) => `<svg ${a}x="0" y="${y}" width="${w}" height="${h}"`);

export function build(calendar, theme = "dark", now) {
  const C = PAL[theme];
  setBare(true);
  const parts = [
    intro(theme),
    cluster(calendar, theme, { handle: "Last 12 months on GitHub", bare: true }),
  ];
  setBare(false);
  const W = 840;
  let y = 0, body = "";
  parts.forEach((svg, i) => {
    const h = heightOf(svg);
    if (i) body += `<line x1="30" y1="${y + 2}" x2="${W - 30}" y2="${y + 2}" stroke="${C.bandStroke}"/>`;
    body += inner(svg, y);
    y += h - 8;
  });
  // the toolbox, as the panel's spec sheet, and the links along the foot
  body += `<line x1="30" y1="${y + 2}" x2="${W - 30}" y2="${y + 2}" stroke="${C.bandStroke}"/>`;
  body += `<text x="30" y="${y + 34}" font-family="${SANS}" font-size="9" font-weight="600" letter-spacing="1.6" fill="${C.label}">TOOLBOX</text>`;
  TOOLS.forEach(([k, v], i) => {
    const ty = y + 62 + i * 22;
    body += `<g class="tl" style="animation-delay:${(0.4 + i * 0.12).toFixed(2)}s"><text x="30" y="${ty}" font-family="${SANS}" font-size="9" font-weight="600" letter-spacing="1.6" fill="${C.pink}">${k}</text><text x="142" y="${ty}" font-family="${MONO}" font-size="12" fill="${C.ink}">${esc(v)}</text></g>`;
  });
  y += 62 + TOOLS.length * 22 + 10;
  body += `<line x1="30" y1="${y}" x2="${W - 30}" y2="${y}" stroke="${C.bandStroke}"/>`;
  body += `<text x="30" y="${y + 30}" font-family="${MONO}" font-size="11" fill="${C.dim}">${LINKS.map((l, i) => `${i ? `<tspan fill="${C.rose}">  /  </tspan>` : ""}${esc(l)}`).join("")}</text>`;
  const H = y + 52;

  const label = "Jiming Chen: CS at the University of Maryland, open to 2027 new-grad SWE and APM roles and Winter/Spring 2027 co-ops. A dashboard of the last 12 months on GitHub, where I've worked, my toolbox and links.";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>
<defs>
<clipPath id="dash${theme[0]}-clip"><rect x="6" y="4" width="${W - 12}" height="${H - 12}" rx="3"/></clipPath>
</defs>
<style>.tl{animation:tl .6s ease-out both}@keyframes tl{0%{opacity:0;transform:translateX(-6px)}100%{opacity:1;transform:translateX(0px)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}</style>
<g clip-path="url(#dash${theme[0]}-clip)">
${body}
</g>
</svg>`;
}
