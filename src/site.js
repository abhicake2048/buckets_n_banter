document.documentElement.classList.add("js");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

function onScroll() {
  header?.classList.toggle("is-scrolled", window.scrollY > 24);
  if (!reducedMotion.matches) document.documentElement.style.setProperty("--parallax-y", `${Math.min(window.scrollY, 900)}px`);
}

let scrollQueued = false;
window.addEventListener(
  "scroll",
  () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      onScroll();
      scrollQueued = false;
    });
  },
  { passive: true },
);
onScroll();

const reveals = [...document.querySelectorAll(".reveal")];
if (reducedMotion.matches || !("IntersectionObserver" in window)) {
  reveals.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -7%", threshold: 0.08 },
  );
  reveals.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 65}ms`;
    revealObserver.observe(element);
  });
}

const archive = document.querySelector("[data-episode-grid]");
if (archive) {
  const cards = [...archive.querySelectorAll("[data-episode-card]")];
  const filters = [...document.querySelectorAll("[data-filter]")];
  const search = document.querySelector("[data-search]");
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
      const typeMatch = activeType === "all" || card.dataset.type === activeType;
      const searchMatch = !normalized || card.dataset.search.includes(normalized);
      const show = typeMatch && searchMatch;
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

  filters.forEach((button) =>
    button.addEventListener("click", () => {
      activeType = button.dataset.filter;
      updateArchive();
    }),
  );

  let searchTimer;
  search?.addEventListener("input", () => {
    query = search.value;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => updateArchive(), 90);
  });

  clear?.addEventListener("click", () => {
    activeType = "all";
    query = "";
    if (search) search.value = "";
    updateArchive();
    search?.focus();
  });

  updateArchive({ writeUrl: false });
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
  if (reducedMotion.matches) document.documentElement.style.removeProperty("--parallax-y");
});
