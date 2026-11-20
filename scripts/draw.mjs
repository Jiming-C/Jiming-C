// Draws the README's dash (scripts/dash.mjs: the intro, the contribution cluster, the work timeline and the toolbox in
// one panel) from the last year of contributions, into dist/dash-dark.svg and dist/dash-light.svg.
// No dependencies: Node 20+, a token in GITHUB_TOKEN (or GH_TOKEN).
//   node scripts/draw.mjs [login] [outDir]
import { mkdirSync, writeFileSync } from "node:fs";
import { build } from "./dash.mjs";

const LOGIN = process.argv[2] || "Jiming-C";
const OUT = process.argv[3] || "dist";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
if (!TOKEN) throw new Error("set GITHUB_TOKEN");

const QUERY = `query($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
  totalContributions weeks { contributionDays { date contributionCount contributionLevel weekday } } } } } }`;
const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "readme-dash" },
  body: JSON.stringify({ query: QUERY, variables: { login: LOGIN } }),
});
const json = await res.json();
if (!res.ok || json.errors) throw new Error(JSON.stringify(json.errors || json));
const calendar = json.data.user.contributionsCollection.contributionCalendar;
// NOW on the work timeline is the calendar's last day
const [y, m] = calendar.weeks.at(-1).contributionDays.at(-1).date.split("-").map(Number);

mkdirSync(OUT, { recursive: true });
for (const theme of ["dark", "light"]) writeFileSync(`${OUT}/dash-${theme}.svg`, build(calendar, theme, [y, m]));
console.log(`dash: ${calendar.totalContributions} contributions -> ${OUT}/dash-{dark,light}.svg`);
