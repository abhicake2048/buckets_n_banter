document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const header = document.querySelector("[data-header]");
const menu = document.querySelector("[data-menu]");
const menuToggle = document.querySelector("[data-menu-toggle]");
const menuClose = document.querySelector("[data-menu-close]");
let lastFocused = null;

function setMenu(open) {
  if (!menu || !menuToggle) return;
  lastFocused = open ? document.activeElement : lastFocused;
  menu.classList.toggle("is-open", open);
  menu.setAttribute("aria-hidden", String(!open));
  menuToggle.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("menu-open", open);
  if (open) menuClose?.focus();
  else if (lastFocused instanceof HTMLElement) lastFocused.focus();
}

menuToggle?.addEventListener("click", () => setMenu(true));
menuClose?.addEventListener("click", () => setMenu(false));
menu?.querySelectorAll("[data-menu-link]").forEach((link) => link.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menu?.classList.contains("is-open")) setMenu(false);
  if (event.key !== "Tab" || !menu?.classList.contains("is-open")) return;
  const focusable = [...menu.querySelectorAll('a[href],button:not([disabled])')];
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});

const zoomStory = document.querySelector("[data-zoom-story]");
const zoomFrame = document.querySelector("[data-zoom-frame]");
const statementStory = document.querySelector("[data-statement-story]");
const statementWords = [...document.querySelectorAll("[data-statement-word]")];
const metricBadges = [...document.querySelectorAll("[data-metric-badge]")];
const metricRotations = [-6, 4, -3];
const topVideoPanels = [...document.querySelectorAll(".top-video-panel")];

function progressThrough(element) {
  if (!element) return 0;
  const rect = element.getBoundingClientRect();
  const distance = Math.max(1, element.offsetHeight - window.innerHeight);
  return clamp(-rect.top / distance);
}

function updateMotion() {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
  if (reducedMotion.matches) return;
  document.documentElement.style.setProperty("--parallax-y", `${Math.min(window.scrollY, 900)}px`);

  if (zoomStory && zoomFrame) {
    const progress = progressThrough(zoomStory);
    zoomFrame.style.setProperty("--zoom-scale", String(0.58 + progress * 0.42));
    zoomFrame.style.setProperty("--zoom-rotate", `${-5 + progress * 5}deg`);
    zoomFrame.style.setProperty("--zoom-caption-opacity", String(clamp((progress - 0.38) / 0.24)));
  }

  if (statementStory) {
    const progress = progressThrough(statementStory);
    const activeWords = Math.floor(clamp(progress / 0.58) * (statementWords.length + 1));
    statementWords.forEach((word, index) => word.classList.toggle("is-lit", index < activeWords));
    metricBadges.forEach((badge, index) => {
      const enter = clamp((progress - (0.32 + index * 0.055)) / 0.18);
      const exit = clamp((progress - (0.78 + index * 0.025)) / 0.16);
      const y = (1 - enter) * 105 - exit * 125;
      const scale = 0.82 + enter * 0.18 - exit * 0.08;
      badge.style.opacity = String(enter * (1 - exit));
      badge.style.transform = `translateY(${y}px) rotate(${metricRotations[index]}deg) scale(${scale})`;
    });
  }

  topVideoPanels.forEach((panel, index) => {
    const card = panel.querySelector(".top-video-card");
    const nextPanel = topVideoPanels[index + 1];
    if (!card || !nextPanel) return;
    const pinTop = window.innerWidth <= 720 ? 72 : 94;
    const nextTop = nextPanel.getBoundingClientRect().top;
    const cover = clamp((window.innerHeight - nextTop) / Math.max(1, window.innerHeight - pinTop));
    card.style.setProperty("--stack-scale", String(1 - cover * 0.038));
    card.style.setProperty("--stack-brightness", String(1 - cover * 0.13));
  });
}

let scrollQueued = false;
window.addEventListener("scroll", () => {
  if (scrollQueued) return;
  scrollQueued = true;
  requestAnimationFrame(() => { updateMotion(); scrollQueued = false; });
}, { passive: true });
window.addEventListener("resize", updateMotion, { passive: true });
updateMotion();

const reveals = [...document.querySelectorAll(".reveal")];
if (reducedMotion.matches || !("IntersectionObserver" in window)) reveals.forEach((element) => element.classList.add("is-visible"));
else {
  const revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -7%", threshold: 0.08 });
  reveals.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 65}ms`;
    revealObserver.observe(element);
  });
}

const archive = document.querySelector("[data-episode-grid]");
if (archive) {
  const cards = [...archive.querySelectorAll("[data-episode-card]")];
  const filters = [...document.querySelectorAll("[data-filter]")];
  const search = document.querySelector("[data-search-input]");
  const count = document.querySelector("[data-result-count]");
  const empty = document.querySelector("[data-empty-state]");
  const clear = document.querySelector("[data-clear-filters]");
  const params = new URLSearchParams(window.location.search);
  let activeType = filters.some((button) => button.dataset.filter === params.get("type")) ? params.get("type") : "all";
  let query = params.get("q") || "";
  if (search) search.value = query;

  function updateArchive({ writeUrl = true } = {}) {
    const normalized = query.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      const show = (activeType === "all" || card.dataset.type === activeType) && (!normalized || card.dataset.searchText.includes(normalized));
      card.hidden = !show;
      if (show) visible += 1;
    }
    filters.forEach((button) => {
      const selected = button.dataset.filter === activeType;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    if (count) count.textContent = `${visible} ${visible === 1 ? "episode" : "episodes"}`;
    if (empty) empty.hidden = visible !== 0;
    if (writeUrl) {
      const next = new URL(window.location.href);
      activeType === "all" ? next.searchParams.delete("type") : next.searchParams.set("type", activeType);
      normalized ? next.searchParams.set("q", query.trim()) : next.searchParams.delete("q");
      history.replaceState({}, "", `${next.pathname}${next.search}${next.hash}`);
    }
  }
  filters.forEach((button) => button.addEventListener("click", () => { activeType = button.dataset.filter; updateArchive(); }));
  let searchTimer;
  search?.addEventListener("input", () => { query = search.value; clearTimeout(searchTimer); searchTimer = setTimeout(() => updateArchive(), 90); });
  clear?.addEventListener("click", () => { activeType = "all"; query = ""; if (search) search.value = ""; updateArchive(); search?.focus(); });
  updateArchive({ writeUrl: false });
}

const guestViewport = document.querySelector("[data-guest-viewport]");
const guestTrack = document.querySelector("[data-guest-track]");
const guestPrevious = document.querySelector("[data-guest-prev]");
const guestNext = document.querySelector("[data-guest-next]");
if (guestViewport && guestTrack) {
  let paused = false;
  let previousTime = performance.now();
  const cardStep = () => guestTrack.querySelector(".guest-card")?.getBoundingClientRect().width + 24 || 280;
  function advance(time) {
    const delta = Math.min(40, time - previousTime);
    previousTime = time;
    if (!paused && !reducedMotion.matches) {
      guestViewport.scrollLeft += delta * 0.035;
      const midpoint = guestTrack.scrollWidth / 2;
      if (guestViewport.scrollLeft >= midpoint) guestViewport.scrollLeft -= midpoint;
    }
    requestAnimationFrame(advance);
  }
  guestViewport.addEventListener("pointerenter", () => { paused = true; });
  guestViewport.addEventListener("pointerleave", () => { paused = false; });
  guestViewport.addEventListener("focusin", () => { paused = true; });
  guestViewport.addEventListener("focusout", () => { paused = false; });
  guestPrevious?.addEventListener("click", () => { paused = true; guestViewport.scrollBy({ left: -cardStep(), behavior: reducedMotion.matches ? "auto" : "smooth" }); });
  guestNext?.addEventListener("click", () => { paused = true; guestViewport.scrollBy({ left: cardStep(), behavior: reducedMotion.matches ? "auto" : "smooth" }); });
  requestAnimationFrame(advance);
}

document.querySelectorAll("[data-play-video]").forEach((button) => {
  button.addEventListener("click", () => {
    const shell = button.closest("[data-video-shell]");
    const id = button.dataset.videoId;
    if (!shell || !id) return;
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    iframe.title = "Buckets N Banter episode player";
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = "strict-origin-when-cross-origin";
    shell.replaceChildren(iframe);
  });
});

reducedMotion.addEventListener?.("change", () => {
  if (reducedMotion.matches) {
    document.documentElement.style.removeProperty("--parallax-y");
    statementWords.forEach((word) => word.classList.add("is-lit"));
    metricBadges.forEach((badge) => { badge.style.opacity = "1"; badge.style.transform = "none"; });
  }
  updateMotion();
});
