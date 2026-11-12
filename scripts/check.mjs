import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { episodes } from "../content/episodes.mjs";

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
