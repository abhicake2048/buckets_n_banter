# Buckets N Banter Website

The official website for **Buckets N Banter**, a sports podcast hosted by Joseph Anthony Matthew Kunnukadan.

The project is a dependency-light static website generated with Node.js. It includes a motion-rich homepage, a searchable podcast archive, guest carousel, featured videos, and one generated page for every podcast episode.

## Requirements

Install the following before working with the project:

- [Node.js](https://nodejs.org/) 20 or newer
- npm, included with Node.js
- [ImageMagick](https://imagemagick.org/) with the `magick` command available in your terminal

Confirm the installations:

```powershell
node --version
npm --version
magick -version
```

## Initial setup

Clone the repository and install its dependencies:

```powershell
git clone https://github.com/abhicake2048/buckets_n_banter.git
cd buckets-n-banter
npm ci
```

Replace the example GitHub URL with the real repository URL.

## Run the website locally

First generate the complete website:

```powershell
npm run build
```

Then start the local server:

```powershell
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173) in a browser.

The development server reads from `dist/`. After changing source files, run `npm run build` again and refresh the browser.

To use a different port in PowerShell:

```powershell
$env:PORT = 5000
npm run dev
```

On macOS or Linux, use:

```bash
PORT=5000 npm run dev
```

## Available commands

| Command | Purpose |
| --- | --- |
| `npm ci` | Installs the exact dependency versions in `package-lock.json`. |
| `npm install` | Updates dependencies after intentionally changing `package.json`. |
| `npm run build` | Recreates `dist/`, optimizes images, and generates every public page. |
| `npm run dev` | Serves the generated `dist/` folder locally. |
| `npm run check` | Validates episode data, assets, generated routes, and YouTube IDs. |

Before committing changes, run:

```powershell
npm run build
npm run check
```

## Editing the website

### Site information and social links

Edit [`content/site.mjs`](content/site.mjs) to change:

- Site title and description
- Production URL
- YouTube, Spotify, Instagram, and LinkedIn links

### Homepage content

Edit [`content/home.mjs`](content/home.mjs) to change:

- Presenter and homepage statement
- Podcast statistics
- The three featured videos
- Guest carousel names, portraits, and crop positions

The `topVideos` array contains episode numbers. For example:

```js
topVideos: [11, 19, 18]
```

Each guest carousel entry must reference an existing episode number.

### Adding a podcast episode

Add a new object to the `episodes` array in [`content/episodes.mjs`](content/episodes.mjs):

```js
{
  number: 20,
  slug: "guest-name-episode-topic",
  title: "Episode title",
  guest: "Guest name",
  guestType: "athlete",
  youtubeId: "XXXXXXXXXXX",
  publishedAt: "2026-04-12",
  duration: "48:30",
  summary: "A concise description of the conversation.",
  thumbnail: "static/assets/episodes/episode-20.jpg",
}
```

Field requirements:

- `number` and `slug` must be unique.
- `slug` becomes `/episodes/<slug>/`.
- `guestType` must be `athlete`, `creator`, `builder`, or `solo`.
- `youtubeId` is the 11-character ID from the YouTube URL, not the complete URL.
- `publishedAt` uses `YYYY-MM-DD` format.
- `duration` uses `MM:SS` format.
- `thumbnail` is a path relative to the project root.

After adding the episode, update the metrics, featured videos, or guest carousel in `content/home.mjs` when appropriate. Then rebuild and validate:

```powershell
npm run build
npm run check
```

## Images and brand assets

- Original podcast artwork and logos live in `design_assets/`.
- New episode artwork can be placed in `static/assets/episodes/`.
- Self-hosted Satoshi font files live in `static/assets/fonts/`.
- Generated WebP, AVIF, and resized JPEG files are written to `dist/assets/images/`.

Do not edit generated files inside `dist/`; they are deleted and recreated during every build.

ImageMagick generates the responsive episode images, guest crops, and optimized logo files. A build will fail if the `magick` command is unavailable or a referenced source image is missing.

## Project structure

```text
content/
  episodes.mjs       Podcast episode data
  home.mjs           Homepage metrics, featured videos, and guests
  site.mjs           Metadata and external links
design_assets/       Original thumbnails, portraits, and logo files
scripts/
  build.mjs          Static-site and responsive-image generator
  check.mjs          Data and generated-route validation
  dev.mjs            Local static server
src/
  site.js            Search, filters, menu, video, and scroll behavior
  styles.css         Layout, typography, responsive design, and animation
static/
  assets/            Source episode images and self-hosted fonts
dist/                Generated website; not committed to Git
```

## Generated routes

The build creates:

- `/` — homepage, featured videos, guests, and podcast archive
- `/episodes/<slug>/` — one page for every episode
- `/404.html` — fallback page

All pages include their required metadata, responsive images, internal links, and podcast structured data.

## Deployment

The production build is the `dist/` directory. The current private deployment configuration is stored in `.openai/hosting.json` and publishes `dist/` as a static Site.

For another static host, run `npm run build` and configure the provider to publish `dist/`. The website uses root-relative URLs, so it should be hosted at the root of its domain or configured with an equivalent URL rewrite setup.

## Git workflow

This project may have both a hosting remote and a GitHub remote. Check them with:

```powershell
git remote -v
```

Create and push a change to GitHub with:

```powershell
git add -A
git commit -m "Describe the website update"
git push github main
```

`git add -A` stages every new, modified, and deleted project file. Generated dependencies and build output are excluded by `.gitignore`, so `node_modules/` and `dist/` will not be committed.

If your GitHub remote is named `origin` instead, use `git push origin main`.

## Troubleshooting

### `ImageMagick failed` or `magick` is not recognized

Install ImageMagick, ensure its installation folder is in `PATH`, restart the terminal, and verify with `magick -version`.

### The local server shows an old version

Stop the server, rebuild, and restart it:

```powershell
npm run build
npm run dev
```

### A build reports a missing thumbnail or portrait

Check that the path in `content/episodes.mjs` or `content/home.mjs` exactly matches the file, including spaces and the file extension.

### A new episode page is missing

Confirm that its episode data is valid, then run both `npm run build` and `npm run check`.

