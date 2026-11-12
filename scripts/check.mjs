import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { episodes } from "../content/episodes.mjs";
import { home } from "../content/home.mjs";

const allowedTypes = new Set(["athlete", "creator", "builder", "solo"]);
const required = [
  "number",
  "slug",
  "title",
  "guest",
  "guestType",
  "youtubeId",
  "publishedAt",
  "duration",
  "summary",
  "thumbnail",
];
const numbers = new Set();
const slugs = new Set();
const errors = [];

for (const episode of episodes) {
  for (const key of required) if (!episode[key]) errors.push(`Episode ${episode.number}: missing ${key}`);
  if (numbers.has(episode.number)) errors.push(`Duplicate episode number ${episode.number}`);
  if (slugs.has(episode.slug)) errors.push(`Duplicate slug ${episode.slug}`);
  if (!allowedTypes.has(episode.guestType)) errors.push(`Episode ${episode.number}: invalid guestType`);
  if (!/^[A-Za-z0-9_-]{11}$/.test(episode.youtubeId)) errors.push(`Episode ${episode.number}: invalid YouTube ID`);
  numbers.add(episode.number);
  slugs.add(episode.slug);
  await access(path.resolve(episode.thumbnail)).catch(() => errors.push(`Episode ${episode.number}: missing thumbnail ${episode.thumbnail}`));
}

if (home.metrics.length !== 3) errors.push("Homepage must contain exactly three metrics");
for (const metric of home.metrics) if (!metric.value || !metric.label) errors.push("Homepage metric is missing a value or label");
if (home.topVideos.length !== 3 || new Set(home.topVideos).size !== 3) errors.push("Homepage top videos must contain three unique episodes");
for (const number of home.topVideos) if (!numbers.has(number)) errors.push(`Top video references missing episode ${number}`);
if (home.guests.length !== 15) errors.push(`Expected 15 guest carousel entries, found ${home.guests.length}`);
for (const guest of home.guests) {
  if (!guest.name || !numbers.has(guest.episode)) errors.push(`Invalid guest carousel entry: ${guest.name || "unnamed"}`);
  if (guest.portrait) await access(path.resolve(guest.portrait)).catch(() => errors.push(`Missing guest portrait ${guest.portrait}`));
}


for (const episode of episodes) {
  const route = path.resolve("dist", "episodes", episode.slug, "index.html");
  const html = await readFile(route, "utf8").catch(() => "");
  if (!html) errors.push(`Missing generated route /episodes/${episode.slug}/`);
  if (html && !html.includes(episode.youtubeId)) errors.push(`Route ${episode.slug} is missing its YouTube ID`);
}

const index = await readFile(path.resolve("dist", "index.html"), "utf8").catch(() => "");
if (!index) errors.push("Missing dist/index.html");
for (const episode of episodes) {
  if (index && !index.includes(`/episodes/${episode.slug}/`)) errors.push(`Homepage missing episode ${episode.number}`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Validated ${episodes.length} episodes, ${episodes.length + 1} public pages, and all required source assets.`);
