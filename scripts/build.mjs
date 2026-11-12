import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { episodes } from "../content/episodes.mjs";
import { site } from "../content/site.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dist = path.join(root, "dist");
const assetDir = path.join(dist, "assets");
const imageDir = path.join(assetDir, "images");
const fontDir = path.join(assetDir, "fonts");

const escapeHtml = (value = "") =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const typeLabel = (type) => ({
  athlete: "Athlete",
  creator: "Creator",
  builder: "Builder",
  solo: "Solo",
}[type]);

const formatDate = (iso) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

const formatDuration = (value) => {
  const [minutes, seconds] = value.split(":").map(Number);
  return `PT${minutes}M${seconds}S`;
};

function runMagick(args) {
  const result = spawnSync("magick", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`ImageMagick failed: ${result.stderr || result.stdout}`);
}

function optimizeEpisodeImage(episode) {
  const source = path.resolve(root, episode.thumbnail);
  const stem = `episode-${episode.number}`;
  runMagick([source, "-auto-orient", "-strip", "-resize", "640x>", "-quality", "82", path.join(imageDir, `${stem}-640.webp`)]);
  runMagick([source, "-auto-orient", "-strip", "-resize", "1280x>", "-quality", "84", path.join(imageDir, `${stem}-1280.webp`)]);
  runMagick([source, "-auto-orient", "-strip", "-resize", "1280x>", "-quality", "54", path.join(imageDir, `${stem}-1280.avif`)]);
  runMagick([source, "-auto-orient", "-strip", "-resize", "1280x>", "-quality", "86", path.join(imageDir, `${stem}.jpg`)]);
}

function optimizeBrandImage(sourcePath, outputName, width) {
  runMagick([
    path.resolve(root, sourcePath),
    "-auto-orient",
    "-strip",
    "-resize",
    `${width}x${width}>`,
    path.join(imageDir, outputName),
  ]);
}

function episodePicture(episode, { className = "", loading = "lazy", alt = "" } = {}) {
  const stem = `/assets/images/episode-${episode.number}`;
  return `<picture class="${className}">
    <source type="image/avif" srcset="${stem}-1280.avif">
    <source type="image/webp" srcset="${stem}-640.webp 640w, ${stem}-1280.webp 1280w" sizes="(max-width: 720px) 100vw, 50vw">
    <img src="${stem}.jpg" width="1280" height="720" alt="${escapeHtml(alt || `Episode ${episode.number} with ${episode.guest}`)}" loading="${loading}" decoding="async">
  </picture>`;
}

function icon(name, className = "") {
  const paths = {
    arrow: '<path d="M5 12h13M14 7l5 5-5 5"/>',
    play: '<path d="m9 7 8 5-8 5V7Z"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    menu: '<path d="M4 8h16M4 16h16"/>',
    youtube: '<path d="M21 8.5a3 3 0 0 0-2.1-2.1C17 6 12 6 12 6s-5 0-6.9.4A3 3 0 0 0 3 8.5 31 31 0 0 0 2.6 12a31 31 0 0 0 .5 3.5 3 3 0 0 0 2.1 2.1C7 18 12 18 12 18s5 0 6.9-.4a3 3 0 0 0 2.1-2.1c.3-1.1.4-2.3.4-3.5s-.1-2.4-.4-3.5Z"/><path d="m10 9 5 3-5 3V9Z"/>',
    spotify: '<circle cx="12" cy="12" r="9"/><path d="M7.5 10.2c3-1 6.7-.7 9.2.6M8.2 13c2.6-.8 5.7-.5 7.9.5M8.8 15.5c2-.6 4.5-.4 6.2.4"/>',
  };
  return `<svg class="icon ${className}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`;
}

function header(active = "") {
  return `<header class="site-header" data-header>
    <a class="brand-pill" href="/" aria-label="Buckets N Banter home">
      <img src="/assets/images/logo-short.png" width="76" height="76" alt="">
    </a>
    <nav class="nav-pill" aria-label="Primary navigation">
      <a class="nav-link ${active === "episodes" ? "is-active" : ""}" href="/#episodes">Episodes</a>
      <a class="nav-link" href="#listen">Listen</a>
    </nav>
    <button class="menu-toggle" type="button" data-menu-toggle aria-expanded="false" aria-controls="site-menu">
      <span>Menu</span>${icon("menu", "menu-icon")}
    </button>
  </header>
  <aside class="menu-panel" id="site-menu" data-menu aria-hidden="true">
    <div class="menu-panel__top">
      <img src="/assets/images/logo-full.png" width="260" height="260" alt="Buckets N Banter">
      <button class="menu-close" type="button" data-menu-close aria-label="Close menu">${icon("close")}</button>
    </div>
    <nav class="menu-links" aria-label="Menu">
      <a href="/" data-menu-link><span>01</span>Home</a>
      <a href="/#featured" data-menu-link><span>02</span>Featured</a>
      <a href="/#episodes" data-menu-link><span>03</span>All episodes</a>
      <a href="#listen" data-menu-link><span>04</span>Listen</a>
    </nav>
    <div class="menu-social">
      <a href="${site.youtube}" target="_blank" rel="noopener noreferrer">YouTube ↗</a>
      <a href="${site.spotify}" target="_blank" rel="noopener noreferrer">Spotify ↗</a>
      <a href="${site.instagram}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
      <a href="${site.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
    </div>
  </aside>`;
}

function episodeCard(episode, { related = false } = {}) {
  const search = `${episode.number} ${episode.title} ${episode.guest} ${episode.summary}`.toLowerCase();
  return `<article class="episode-card reveal ${related ? "episode-card--related" : ""}" data-episode-card data-type="${episode.guestType}" data-search="${escapeHtml(search)}">
    <a class="episode-card__media" href="/episodes/${episode.slug}/" aria-label="Open episode ${episode.number}: ${escapeHtml(episode.title)}">
      ${episodePicture(episode, { alt: `Episode ${episode.number}: ${episode.guest}` })}
      <span class="episode-card__number">EP ${String(episode.number).padStart(2, "0")}</span>
      <span class="episode-card__open">View ${icon("arrow")}</span>
    </a>
    <div class="episode-card__body">
      <div class="episode-card__meta"><span>${typeLabel(episode.guestType)}</span><span>${episode.duration}</span></div>
      <h3><a href="/episodes/${episode.slug}/">${escapeHtml(episode.title)}</a></h3>
      <p>${escapeHtml(episode.guest)}</p>
    </div>
  </article>`;
}

function listenSection() {
  return `<section class="listen-section" id="listen">
    <div class="listen-mark reveal"><img src="/assets/images/logo-mic.png" width="190" height="190" alt=""></div>
    <p class="eyebrow reveal">Take the show with you</p>
    <h2 class="listen-title reveal">STORIES THAT<br><em>TRAVEL.</em></h2>
    <p class="listen-copy reveal">New conversations, full episodes and the moments behind the game.</p>
    <div class="listen-actions reveal">
      <a class="platform-button platform-button--youtube" href="${site.youtube}" target="_blank" rel="noopener noreferrer">${icon("youtube")} YouTube ${icon("arrow")}</a>
      <a class="platform-button platform-button--spotify" href="${site.spotify}" target="_blank" rel="noopener noreferrer">${icon("spotify")} Spotify ${icon("arrow")}</a>
    </div>
  </section>`;
}

function footer() {
  return `<footer class="site-footer">
    <div class="footer-logo"><img src="/assets/images/logo-full.png" width="300" height="300" alt="Buckets N Banter"></div>
    <div class="footer-line">
      <p>Hosted by Joseph Antony.</p>
      <div class="footer-links">
        <a href="${site.instagram}" target="_blank" rel="noopener noreferrer">Instagram ↗</a>
        <a href="${site.linkedin}" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
        <a href="${site.youtube}" target="_blank" rel="noopener noreferrer">YouTube ↗</a>
        <a href="${site.spotify}" target="_blank" rel="noopener noreferrer">Spotify ↗</a>
      </div>
    </div>
    <div class="footer-base"><span>© ${new Date().getFullYear()} Buckets N Banter</span><a href="#top">Back to top ↑</a></div>
  </footer>`;
}

function documentShell({ title, description, canonical, image, body, schema = "" }) {
  return `<!doctype html>
<html lang="en" id="top">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#171717">
  <meta name="color-scheme" content="dark light">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Buckets N Banter">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${image}">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/images/logo-n.png" type="image/png">
  <link rel="preload" href="/assets/fonts/barlow-condensed-800.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/styles.css">
  ${schema ? `<script type="application/ld+json">${schema}</script>` : ""}
  <script type="module" src="/assets/site.js"></script>
</head>
<body>${body}</body>
</html>`;
}

function homepage() {
  const featured = episodes[0];
  const cards = episodes.map((episode) => episodeCard(episode)).join("\n");
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    name: site.name,
    description: site.description,
    url: site.siteUrl,
    author: { "@type": "Person", name: "Joseph Antony" },
    webFeed: site.youtube,
  }).replaceAll("<", "\\u003c");

  const body = `${header("episodes")}
  <main>
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-media" data-parallax>${episodePicture(featured, { className: "hero-picture", loading: "eager", alt: "Aaron Monteiro on Buckets N Banter episode 19" })}</div>
      <div class="hero-overlay"></div>
      <img class="hero-watermark" src="/assets/images/logo-n.png" width="180" height="180" alt="">
      <div class="hero-copy">
        <p class="eyebrow hero-eyebrow reveal">A sports podcast by Joseph Antony</p>
        <h1 id="hero-title" class="hero-title"><span class="reveal">THE STORIES</span><span class="reveal">BEHIND <em>THE GAME.</em></span></h1>
        <div class="hero-bottom reveal">
          <p>Athletes, creators and builders. Honest conversations from inside the game and beyond it.</p>
          <div class="hero-actions">
            <a class="button button--orange" href="/episodes/${featured.slug}/">Watch episode 19 ${icon("play")}</a>
            <a class="button button--ghost" href="#episodes">Explore all ${icon("arrow")}</a>
          </div>
        </div>
      </div>
      <a class="scroll-cue" href="#featured"><span>Scroll to explore</span><i></i></a>
    </section>

    <div class="marquee" aria-hidden="true"><div class="marquee-track">ATHLETES <b>●</b> CREATORS <b>●</b> BUILDERS <b>●</b> STORIES <b>●</b> ATHLETES <b>●</b> CREATORS <b>●</b> BUILDERS <b>●</b> STORIES <b>●</b></div></div>

    <section class="featured-section" id="featured">
      <div class="section-label reveal"><span>01</span> Featured episode</div>
      <div class="featured-grid">
        <a class="featured-media reveal" href="/episodes/${featured.slug}/">
          ${episodePicture(featured, { alt: "Episode 19 with Aaron Monteiro" })}
          <span class="featured-play">${icon("play")} Play episode</span>
        </a>
        <div class="featured-copy">
          <p class="featured-kicker reveal">Episode 19 · ${formatDate(featured.publishedAt)} · ${featured.duration}</p>
          <h2 class="reveal">${escapeHtml(featured.title)}</h2>
          <p class="featured-guest reveal">With ${escapeHtml(featured.guest)}</p>
          <p class="featured-summary reveal">${escapeHtml(featured.summary)}</p>
          <a class="text-link reveal" href="/episodes/${featured.slug}/">Enter the episode ${icon("arrow")}</a>
        </div>
      </div>
    </section>

    <section class="episodes-section" id="episodes">
      <div class="episodes-heading">
        <div class="section-label reveal"><span>02</span> The archive</div>
        <h2 class="reveal">ALL EPISODES</h2>
        <p class="reveal">Stories from the people playing, shaping and sharing sport.</p>
      </div>
      <div class="archive-controls reveal" data-archive-controls>
        <div class="filter-row" role="group" aria-label="Filter episodes by guest type">
          <button type="button" class="filter-button is-active" data-filter="all" aria-pressed="true">All</button>
          <button type="button" class="filter-button" data-filter="athlete" aria-pressed="false">Athletes</button>
          <button type="button" class="filter-button" data-filter="creator" aria-pressed="false">Creators</button>
          <button type="button" class="filter-button" data-filter="builder" aria-pressed="false">Builders</button>
          <button type="button" class="filter-button" data-filter="solo" aria-pressed="false">Solo</button>
        </div>
        <label class="search-field">${icon("search")}<span class="sr-only">Search episodes</span><input type="search" data-search placeholder="Search by episode, guest or story…" autocomplete="off"></label>
      </div>
      <div class="archive-status"><span data-result-count>${episodes.length} episodes</span></div>
      <div class="episode-grid" data-episode-grid>${cards}</div>
      <div class="empty-state" data-empty-state hidden><img src="/assets/images/logo-dunk.png" width="150" height="150" alt=""><h3>No clean look.</h3><p>Try another guest type or a different search.</p><button type="button" class="button button--dark" data-clear-filters>Reset the archive</button></div>
    </section>

    ${listenSection()}
  </main>
  ${footer()}`;

  return documentShell({
    title: site.title,
    description: site.description,
    canonical: `${site.siteUrl}/`,
    image: `${site.siteUrl}/assets/images/episode-19.jpg`,
    body,
    schema,
  });
}

function episodePage(episode) {
  const related = [
    ...episodes.filter((item) => item.number !== episode.number && item.guestType === episode.guestType),
    ...episodes.filter((item) => item.number !== episode.number && item.guestType !== episode.guestType),
  ].slice(0, 3);
  const canonical = `${site.siteUrl}/episodes/${episode.slug}/`;
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "PodcastEpisode",
    name: `Episode ${episode.number}: ${episode.title}`,
    description: episode.summary,
    episodeNumber: episode.number,
    datePublished: episode.publishedAt,
    duration: formatDuration(episode.duration),
    url: canonical,
    image: `${site.siteUrl}/assets/images/episode-${episode.number}.jpg`,
    associatedMedia: {
      "@type": "VideoObject",
      name: episode.title,
      thumbnailUrl: `https://i.ytimg.com/vi/${episode.youtubeId}/maxresdefault.jpg`,
      uploadDate: episode.publishedAt,
      embedUrl: `https://www.youtube-nocookie.com/embed/${episode.youtubeId}`,
      contentUrl: `https://www.youtube.com/watch?v=${episode.youtubeId}`,
    },
    partOfSeries: { "@type": "PodcastSeries", name: site.name, url: site.siteUrl },
  }).replaceAll("<", "\\u003c");

  const body = `${header()}
  <main class="episode-page">
    <section class="episode-hero">
      <div class="episode-hero__media" data-parallax>${episodePicture(episode, { className: "episode-hero__picture", loading: "eager", alt: `Episode ${episode.number}: ${episode.guest}` })}</div>
      <div class="episode-hero__overlay"></div>
      <div class="episode-hero__copy">
        <a class="back-link reveal" href="/#episodes">${icon("arrow", "icon--back")} All episodes</a>
        <p class="episode-hero__meta reveal"><span>${typeLabel(episode.guestType)}</span><span>${formatDate(episode.publishedAt)}</span><span>${episode.duration}</span></p>
        <p class="episode-hero__number reveal">EPISODE ${String(episode.number).padStart(2, "0")}</p>
        <h1 class="reveal">${escapeHtml(episode.title)}</h1>
        <p class="episode-hero__guest reveal">With ${escapeHtml(episode.guest)}</p>
      </div>
    </section>

    <section class="watch-section">
      <div class="section-label reveal"><span>01</span> Watch the conversation</div>
      <div class="video-shell reveal" data-video-shell>
        ${episodePicture(episode, { className: "video-poster", alt: `Play episode ${episode.number} with ${episode.guest}` })}
        <button class="video-play" type="button" data-play-video data-video-id="${episode.youtubeId}" aria-label="Play episode ${episode.number}">${icon("play")}<span>Play full episode</span></button>
      </div>
    </section>

    <section class="episode-story">
      <div class="section-label reveal"><span>02</span> The conversation</div>
      <div class="episode-story__grid">
        <h2 class="reveal">INSIDE<br>THE STORY.</h2>
        <div class="episode-story__copy reveal">
          <p>${escapeHtml(episode.summary)}</p>
          <a class="button button--dark" href="https://www.youtube.com/watch?v=${episode.youtubeId}" target="_blank" rel="noopener noreferrer">Watch on YouTube ${icon("arrow")}</a>
        </div>
      </div>
    </section>

    <section class="related-section">
      <div class="section-label reveal"><span>03</span> Keep listening</div>
      <div class="related-heading"><h2 class="reveal">RELATED STORIES</h2><a class="text-link reveal" href="/#episodes">View all episodes ${icon("arrow")}</a></div>
      <div class="episode-grid episode-grid--related">${related.map((item) => episodeCard(item, { related: true })).join("\n")}</div>
    </section>
    ${listenSection()}
  </main>
  ${footer()}`;

  return documentShell({
    title: `Episode ${episode.number}: ${episode.title} — Buckets N Banter`,
    description: episode.summary,
    canonical,
    image: `${site.siteUrl}/assets/images/episode-${episode.number}.jpg`,
    body,
    schema,
  });
}

await rm(dist, { recursive: true, force: true });
await mkdir(imageDir, { recursive: true });
await mkdir(fontDir, { recursive: true });

const fontCopies = [
  ["node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-500-normal.woff2", "barlow-condensed-500.woff2"],
  ["node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2", "barlow-condensed-700.woff2"],
  ["node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-800-normal.woff2", "barlow-condensed-800.woff2"],
  ["node_modules/@fontsource/barlow-condensed/files/barlow-condensed-latin-900-normal.woff2", "barlow-condensed-900.woff2"],
  ["node_modules/@fontsource/inter/files/inter-latin-400-normal.woff2", "inter-400.woff2"],
  ["node_modules/@fontsource/inter/files/inter-latin-500-normal.woff2", "inter-500.woff2"],
  ["node_modules/@fontsource/inter/files/inter-latin-600-normal.woff2", "inter-600.woff2"],
  ["node_modules/@fontsource/inter/files/inter-latin-700-normal.woff2", "inter-700.woff2"],
];

for (const [source, name] of fontCopies) await cp(path.resolve(root, source), path.join(fontDir, name));
for (const episode of episodes) optimizeEpisodeImage(episode);

optimizeBrandImage("Graphics/Logo Pack/Full-Dark.png", "logo-full.png", 900);
optimizeBrandImage("Graphics/Logo Pack/Short-Dark.png", "logo-short.png", 220);
optimizeBrandImage("Graphics/Logo Pack/N-Dark.png", "logo-n.png", 240);
optimizeBrandImage("Graphics/Logo Pack/Mic-Dark.png", "logo-mic.png", 360);
optimizeBrandImage("Graphics/Logo Pack/Dunk-Dark.png", "logo-dunk.png", 360);

await cp(path.resolve(root, "src/styles.css"), path.join(assetDir, "styles.css"));
await cp(path.resolve(root, "src/site.js"), path.join(assetDir, "site.js"));
await writeFile(path.join(dist, "index.html"), homepage());

for (const episode of episodes) {
  const routeDir = path.join(dist, "episodes", episode.slug);
  await mkdir(routeDir, { recursive: true });
  await writeFile(path.join(routeDir, "index.html"), episodePage(episode));
}

const notFound = documentShell({
  title: "Page not found — Buckets N Banter",
  description: site.description,
  canonical: `${site.siteUrl}/404.html`,
  image: `${site.siteUrl}/assets/images/episode-19.jpg`,
  body: `${header()}<main class="not-found"><img src="/assets/images/logo-dunk.png" width="180" height="180" alt=""><p class="eyebrow">404 · Air ball</p><h1>THAT PAGE<br>LEFT THE COURT.</h1><a class="button button--orange" href="/">Back home ${icon("arrow")}</a></main>${footer()}`,
});
await writeFile(path.join(dist, "404.html"), notFound);
await writeFile(path.join(dist, "robots.txt"), "User-agent: *\nDisallow: /\n");

await mkdir(path.join(dist, ".openai"), { recursive: true });
await cp(path.resolve(root, ".openai/hosting.json"), path.join(dist, ".openai/hosting.json"));

const hosting = JSON.parse(await readFile(path.resolve(root, ".openai/hosting.json"), "utf8"));
if (!hosting.project_id || hosting.static?.directory !== "dist") throw new Error("Invalid hosting manifest");
if (!existsSync(path.join(dist, "index.html"))) throw new Error("Homepage generation failed");

console.log(`Built ${episodes.length + 1} pages in ${dist}`);
