import {
  DATA_URL, safeLinkUrl, responsiveImageAttrs, groupValue, chevronIcon, escapeHtml, formatDate, formatTemporal, loadData, mediaAttribution, mediaDisplayAttribution,
  projectHref, searchText,
} from "./modules/data.js?v=263a50b2f67c";
import {mapFilterHref} from "./modules/map_filters.js?v=263a50b2f67c";
import {syncPageHeading} from "./modules/headings.js?v=263a50b2f67c";
import {resolveRoute, routeHref} from "./modules/routes.js?v=263a50b2f67c";
import {mountExplorer} from "./modules/map_v13.js?v=263a50b2f67c";
import {cardVisual, projectCard, renderConfidenceCards, renderProject, renderTerritory, timelineEvent, updateRow} from "./modules/views.js?v=263a50b2f67c";


const ACTIVE_STATUSES = new Set(["EN CHANTIER", "TRAVAUX PRÉPARATOIRES", "PROGRAMMÉ", "EN ÉTUDES"]);
const CANONICAL_URL = "https://observatoire-docks-seine.org/";
const HOME_TITLE = "Docks de Saint-Ouen & ZAC Seine-Liberté à Clichy | Observatoire";
const HOME_DESCRIPTION = "Explorez les transformations des Docks de Saint-Ouen, de la ZAC Seine-Liberté à Clichy et de leurs abords immédiats : projets, chantiers, plans et actualités.";
const ROUTE_SEO = {
  home: {title: HOME_TITLE, description: HOME_DESCRIPTION},
  explore: {
    title: "Carte des projets | Docks de Saint-Ouen & Seine-Liberté",
    description: "Explorez sur la carte les projets et opérations des Docks de Saint-Ouen et de la ZAC Seine-Liberté à Clichy : emplacement, avancement et fiches documentées.",
  },
  updates: {
    title: "Actualités des Docks de Saint-Ouen & Seine-Liberté",
    description: "Suivez les actualités des projets urbains, travaux et chantiers des Docks de Saint-Ouen-sur-Seine, de Seine-Liberté à Clichy et de leurs abords immédiats.",
  },
  timeline: {
    title: "Chronologie des Docks de Saint-Ouen & Seine-Liberté",
    description: "Parcourez les étapes documentées des projets urbains et des transformations des Docks de Saint-Ouen, de Seine-Liberté à Clichy et de leurs abords immédiats.",
  },
  method: {
    title: "À propos de l’Observatoire | Observatoire Docks & Seine-Liberté",
    description: "Découvrez la démarche citoyenne et indépendante de l’Observatoire des Docks de Saint-Ouen, de Seine-Liberté à Clichy et de leurs abords immédiats.",
  },
  contribute: {title: "Contact & signalements | Observatoire Docks & Seine-Liberté", description: "Signalez une correction, proposez une information ou contactez l’Observatoire Docks & Seine-Liberté."},
  legal: {title: "Mentions légales | Observatoire Docks & Seine-Liberté", description: "Mentions légales de l’Observatoire citoyen Docks & Seine-Liberté."},
  privacy: {title: "Confidentialité & données personnelles | Observatoire Docks & Seine-Liberté", description: "Données personnelles, formulaire Contact & signalements et services externes de l’Observatoire Docks & Seine-Liberté."},
  credits: {title: "Crédits et droits des images | Observatoire", description: "Crédits, sources et informations relatives aux images publiées par l’Observatoire Docks & Seine-Liberté."},
};
const state = {
  data: null,
  byId: new Map(),
  route: "home",
  previousHash: "#accueil",
  search: "",
  status: "",
  territory: "",
  category: "",
  map: null,
  carouselTimers: [],
  slideGeneration: 0,
  slideControllers: {},
  planIndex: 0,
  renderedHash: null,
  lightboxItems: [],
  lightboxIndex: 0,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];


function conciseDescription(value, maxLength = 160) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const shortened = text.slice(0, maxLength - 1).replace(/\s+\S*$/, "").replace(/[,:;.!?\s]+$/, "");
  return `${shortened}…`;
}


function setMeta(selector, content) {
  const element = $(selector);
  if (element) element.setAttribute("content", content);
}


function updateSeo(parsed, project = null) {
  let seo = ROUTE_SEO[parsed.route] || ROUTE_SEO.home;
  if (parsed.route === "territory") {
    seo = parsed.territory === "Seine-Liberté"
      ? {
          title: "ZAC Seine-Liberté à Clichy : plans, projets et travaux | Observatoire",
          description: "Retrouvez les plans, projets, travaux et calendriers documentés de la ZAC Seine-Liberté à Clichy, avec les sources publiques et leur état d’avancement.",
        }
      : {
          title: "ZAC des Docks de Saint-Ouen : plans et aménagements | Observatoire",
          description: "Consultez les plans, projets et travaux de la ZAC des Docks de Saint-Ouen : logements, équipements, espaces publics et aménagements du quartier.",
        };
  } else if (parsed.route === "project" && project) {
    seo = {
      title: `${project.name} | ${project.territory}`,
      description: conciseDescription(`${project.name} à ${project.commune || project.territory}. ${project.description}`),
    };
  }

  document.title = seo.title;
  setMeta('meta[name="description"]', seo.description);
  setMeta('meta[property="og:title"]', seo.title);
  setMeta('meta[property="og:description"]', seo.description);
  const canonical = project && parsed.route === "project"
    ? new URL(projectHref(project.id), CANONICAL_URL).href
    : parsed.route === "explore" ? new URL("carte/", CANONICAL_URL).href
    : parsed.route === "territory" ? new URL(projectHref(parsed.territory === "Seine-Liberté" ? "seine-zac" : "docks-zac"), CANONICAL_URL).href
    : CANONICAL_URL;
  setMeta('meta[property="og:url"]', canonical);
  $('link[rel="canonical"]')?.setAttribute("href", canonical);
  setMeta('meta[name="twitter:title"]', seo.title);
  setMeta('meta[name="twitter:description"]', seo.description);
}


function parseRoute() {
  return resolveRoute(location.pathname, location.hash, state.data?.retiredProjectRedirects, state.data?.projects.map(p => p.id));
}

function rememberView() {
  history.replaceState({...history.state, odsEntry: true, view: {
    scrollY: window.scrollY, listScroll: state.map?.listScroll() || 0,
    map: state.map?.viewport(),
  }}, "", location.href);
}

function navigate(route, payload = {}) {
  const nextUrl = route === "explore" ? mapFilterHref(state) : routeHref(route, payload, location.pathname);
  const target = new URL(nextUrl, location.href);
  if (location.href !== target.href) {
    rememberView();
    history.pushState({odsEntry: true, internalReturn: true}, "", nextUrl);
  }
  showRoute(parseRoute());
}


function showRoute(parsed, options = {}) {
  state.renderedHash = location.pathname + location.search + location.hash;
  state.slideGeneration += 1;
  state.carouselTimers.forEach(clearInterval);
  state.carouselTimers = [];
  state.slideControllers = {};
  const oldHash = location.hash;
  if (state.route !== "project") state.previousHash = oldHash || "#accueil";
  state.route = parsed.route;
  $$('[data-view]').forEach(view => {
    const active = view.dataset.view === parsed.route;
    view.hidden = !active;
    view.classList.toggle("is-active", active);
  });
  $$(".main-nav [aria-current]").forEach(item => item.removeAttribute("aria-current"));
  const activeNav = parsed.route === "territory"
    ? $(`.main-nav [data-territory="${CSS.escape(parsed.territory)}"]`)
    : $(`.main-nav [data-route="${parsed.route}"]`);
  activeNav?.setAttribute("aria-current", "page");
  document.body.classList.toggle("project-open", parsed.route === "project");

  if (parsed.route === "territory") {
    $("#territory-content").innerHTML = renderTerritory(parsed.territory, state.data.projects, state.data.presentation, state.data.presentationMedia);
    state.planIndex = 0;
    const key = parsed.territory === "Seine-Liberté" ? "seineSlides" : "docksSlides";
    mountSlides("#territory-content .territory-hero-media", state.data.presentation?.[key], 8000);
  } else if (parsed.route === "project") {
    const project = state.byId.get(parsed.id);
    if (!project) {
      const successor = state.data.retiredProjectRedirects?.[parsed.id];
      if (successor) navigate("project", {id: successor});
      else navigate("explore");
      return;
    }
    $("#project-content").innerHTML = renderProject(project, state.byId);
  } else if (parsed.route === "explore") {
    state.map.enter();
    if (options.focusSearch) setTimeout(() => state.map.focusSearch(), 100);
  }
  syncPageHeading(document, parsed.route);
  state.map?.setHeading(parsed.route === "explore");
  updateSeo(parsed, parsed.route === "project" ? state.byId.get(parsed.id) : null);
  if (parsed.route === "home") mountHomeSlides();
  $("#main-content").focus({preventScroll: true});
  if (options.restore) {
    const view = options.restore;
    requestAnimationFrame(() => {
      window.scrollTo({top: view.scrollY || 0, behavior: "instant"});
      if (parsed.route === "explore") {
        state.map.restoreListScroll(view.listScroll || 0);
        state.map.restoreViewport(view.map);
      }
    });
  } else window.scrollTo({top: 0, behavior: options.instant || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
  $("#menu-toggle").setAttribute("aria-expanded", "false");
  $("#main-nav").classList.remove("is-open");
}


function featuredProjects() {
  const chosen = state.data.presentation || {};
  const byId = state.byId;
  const statusScore = {"EN CHANTIER": 5, "TRAVAUX PRÉPARATOIRES": 4, "PROGRAMMÉ": 3, "EN ÉTUDES": 2};
  return [["Docks de Saint-Ouen", chosen.featuredDocks || []], ["Seine-Liberté", chosen.featuredSeine || []]].flatMap(([territory, ids]) => {
    const eligible = project => territory === "Docks de Saint-Ouen" ? project.status === "EN CHANTIER" : ACTIVE_STATUSES.has(project.status);
    const selected = ids.map(id => byId.get(id)).filter(project => project?.territory === territory && eligible(project));
    const remaining = state.data.projects
      .filter(project => project.territory === territory && project.additive && project.readiness !== "NON_PRET" && eligible(project) && !selected.includes(project))
      .sort((a, b) =>
        Number(Boolean(cardVisual(b))) - Number(Boolean(cardVisual(a))) ||
        (statusScore[b.status] || 0) - (statusScore[a.status] || 0) ||
        a.name.localeCompare(b.name, "fr")
      );
    return [...selected, ...remaining].slice(0, 5);
  });
}


function renderHome() {
  const projects = state.data.projects;
  const operations = projects.filter(project => project.projectType !== "ENSEMBLE");
  const active = operations.filter(project => ACTIVE_STATUSES.has(project.status));
  const delivered = operations.filter(project => project.status === "LIVRÉ / TERMINÉ");
  $("#stat-territories").textContent = new Set(projects.map(project => project.territory)).size;
  $("#stat-public").textContent = operations.length;
  $("#stat-active").textContent = active.length;
  $("#stat-delivered").textContent = delivered.length;
  $("#footer-date").textContent = formatDate(state.data.meta.lastReviewedAt);
  $("#footer-date").dateTime = state.data.meta.lastReviewedAt;
  const featured = featuredProjects();
  $("#featured-projects").innerHTML = ["Docks de Saint-Ouen", "Seine-Liberté"].map(territory => {
    const group = featured.filter(project => project.territory === territory);
    const heading = territory === "Seine-Liberté" ? "ZAC Seine-Liberté à Clichy" : "ZAC des Docks de Saint-Ouen";
    return `<section class="feature-territory"><h3>${escapeHtml(heading)}</h3><div class="feature-rotator">${group.map((project, index) => `<div class="feature-slide ${index === 0 ? "is-active" : ""}" ${index ? 'aria-hidden="true" inert' : ""}>${projectCard(project)}</div>`).join("")}</div><div class="feature-controls"><button type="button" data-feature-step="-1" data-feature-territory="${escapeHtml(territory)}" aria-label="Projet précédent de ${escapeHtml(territory)}">${chevronIcon(-1)}</button><span>1 / ${group.length}</span><button type="button" data-feature-step="1" data-feature-territory="${escapeHtml(territory)}" aria-label="Projet suivant de ${escapeHtml(territory)}">${chevronIcon(1)}</button></div></section>`;
  }).join("");

  const updates = state.data.territoryNews.filter(update => state.byId.get(update.projectId)?.readiness !== "NON_PRET");
  $("#home-updates").innerHTML = updates.slice(0, 5).map(updateRow).join("");
  renderLimitedUpdates("#territory-news-list", updates, "actualités", "Aucune actualité datée");
  renderLimitedUpdates("#observatory-journal-list", state.data.observatoryJournal, "entrées du journal", "Aucune mise à jour documentée");
  renderTimeline();
}

function renderLimitedUpdates(selector, rows, label, emptyMessage) {
  const first = rows.slice(0, 10).map(updateRow).join("");
  const rest = rows.slice(10);
  const more = rest.length
    ? `<details class="updates-more related-group"><summary><span class="updates-more-closed">Afficher les ${rest.length} autres ${label}</span><span class="updates-more-open">Masquer les autres ${label}</span></summary><div class="update-list">${rest.map(updateRow).join("")}</div></details>`
    : "";
  $(selector).innerHTML = first + more || `<div class="empty-state"><strong>${emptyMessage}</strong></div>`;
}

function setPresentationCredit(container, item, includeCaption = true) {
  if (!container || !item) return;
  container.textContent = includeCaption ? `${item.caption || item.projectName || "Visuel"} · ` : "";
  container.removeAttribute("title");
  const url = safeLinkUrl(item.sourceUrl);
  const label = mediaDisplayAttribution(item);
  const full = mediaAttribution(item);
  if (!url) { container.title = full; container.append(document.createTextNode(label)); return; }
  const source = document.createElement("a");
  source.href = url;
  source.target = "_blank";
  source.rel = "noopener noreferrer";
  source.textContent = label;
  source.title = full;
  source.setAttribute("aria-label", full);
  container.append(source);
}

function mountSlides(selector, keys = [], delay = 0) {
  const target = $(selector);
  if (!target) return;
  const media = (keys || []).map(key => state.data.presentationMedia?.[key]).filter(Boolean);
  if (!media.length) return;
  let index = 0;
  let paintSerial = 0;
  const generation = state.slideGeneration;
  const paint = () => {
    const serial = ++paintSerial;
    const item = media[index];
    const next = new Image();
    next.src = item.displaySrc || item.src;
    if (item.responsiveSources?.length) {
      next.srcset = item.responsiveSources.map(source => `${source.src} ${source.width}w`).join(", ");
      next.sizes = "100vw";
      next.width = item.width;
      next.height = item.height;
    }
    next.alt = item.caption || item.projectName || "";
    next.className = "crossfade-slide";
    const show = () => {
      if (serial !== paintSerial || generation !== state.slideGeneration || !target.isConnected || !next.naturalWidth) return;
      target.querySelector(".media-loading-error")?.remove();
      const previous = [...target.children];
      target.append(next);
      requestAnimationFrame(() => next.classList.add("is-visible"));
      setTimeout(() => previous.forEach(child => child.remove()), 750);
      const captionSelector = {
        "#home-hero-media": "#home-hero-caption",
        "#docks-door-media": "#docks-door-caption",
        "#seine-door-media": "#seine-door-caption",
        "#territory-content .territory-hero-media": "#territory-content .territory-hero-caption",
      }[selector];
      if (captionSelector) setPresentationCredit($(captionSelector), item);
      target.dataset.slideIndex = String(index);
      const counter = document.querySelector(`[data-carousel-count="${selector}"]`);
      if (counter) counter.textContent = `${index + 1} / ${media.length}`;
    };
    const fail = () => {
      if (serial !== paintSerial || generation !== state.slideGeneration || !target.isConnected) return;
      if (!target.querySelector(".media-loading-error")) target.insertAdjacentHTML("beforeend", '<span class="media-loading-error">Visuel momentanément indisponible</span>');
    };
    if (next.complete) { if (next.naturalWidth) show(); else fail(); }
    else { next.addEventListener("load", show, {once:true}); next.addEventListener("error", fail, {once:true}); }
  };
  paint();
  state.slideControllers[selector] = step => { index = (index + step + media.length) % media.length; paint(); };
  if (delay > 0 && media.length > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const timer = setInterval(() => { if (!document.hidden) { index = (index + 1) % media.length; paint(); } }, delay);
    state.carouselTimers.push(timer);
  }
}

function mountHomeSlides() {
  const p = state.data.presentation || {};
  mountSlides("#home-hero-media", p.homeHero, 8000);
  mountSlides("#docks-door-media", p.docksSlides);
  mountSlides("#seine-door-media", p.seineSlides);
}

function rotateFeature(group, step) {
  const slides = $$(".feature-slide", group);
  if (!slides.length) return;
  let next = (slides.findIndex(slide => slide.classList.contains("is-active")) + step + slides.length) % slides.length;
  slides.forEach((slide, index) => {
    slide.classList.toggle("is-active", index === next);
    slide.toggleAttribute("inert", index !== next);
    if (index === next) slide.removeAttribute("aria-hidden"); else slide.setAttribute("aria-hidden", "true");
  });
  $(".feature-controls span", group).textContent = `${next + 1} / ${slides.length}`;
}


function renderTimeline() {
  const territory = $("#timeline-territory").value;
  const newest = $("#timeline-order").value === "newest";
  const events = state.data.timelineEvents
    .filter(event => !territory || event.territory.toLowerCase().includes(territory.toLowerCase()))
    .sort((a, b) => newest ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  $("#timeline-list").innerHTML = events.map(event => timelineEvent(event, state.byId)).join("") || '<div class="empty-state"><strong>Aucune étape pour ce filtre</strong></div>';
  $("#timeline-rail").innerHTML = events.map(event => `<button type="button" class="rail-event ${event.territory.toLowerCase().includes("seine") ? "is-seine" : "is-docks"}" data-timeline-target="timeline-${escapeHtml(event.id)}"><time>${escapeHtml(formatTemporal(event.date, event.precision, event.dateLabel))}</time><strong>${escapeHtml(event.title)}</strong><small>${escapeHtml(event.territory)}</small></button>`).join("");
}


function goToToday() {
  const events = state.data.timelineEvents.filter(event => !$("#timeline-territory").value || event.territory.toLowerCase().includes($("#timeline-territory").value.toLowerCase()));
  if (!events.length) return;
  const now = Date.now();
  const nearest = events.reduce((best, event) => Math.abs(Date.parse(event.date) - now) < Math.abs(Date.parse(best.date) - now) ? event : best);
  $(`#timeline-${CSS.escape(nearest.id)}`)?.scrollIntoView({behavior: "smooth", block: "center"});
}


function showLightboxItem(index) {
  const items = state.lightboxItems;
  if (!items.length) return;
  state.lightboxIndex = (index + items.length) % items.length;
  const item = items[state.lightboxIndex];
  $("#lightbox-image").src = item.src;
  $("#lightbox-image").alt = item.alt;
  $("#lightbox-caption").textContent = item.caption;
  setPresentationCredit($("#lightbox-credit"), item, false);
  $("#lightbox-count").textContent = items.length > 1 ? `${state.lightboxIndex + 1} / ${items.length}` : "";
  $$("[data-lightbox-step]").forEach(button => { button.hidden = items.length < 2; });
}

function normalizeSourceInput(input) {
  const value = input.value.trim();
  input.setCustomValidity("");
  if (!value) {
    input.value = "";
    return;
  }
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    const labels = url.hostname.split(".");
    if (!/^https?:$/.test(url.protocol) || url.username || url.password || /\s/.test(value)
      || labels.length < 2 || !labels.every(label => /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label))) {
      throw new Error("Invalid source URL");
    }
    input.value = candidate;
  } catch {
    input.setCustomValidity("Indiquez un lien valide, par exemple exemple.fr/page ou https://exemple.fr/page.");
  }
}

function bindEvents() {
  const backToTop = $(".back-to-top");
  const updateBackToTop = () => backToTop.classList.toggle("is-visible", window.scrollY > 500);
  window.addEventListener("scroll", updateBackToTop, {passive: true});
  updateBackToTop();
  backToTop.addEventListener("click", event => {
    event.preventDefault();
    window.scrollTo({top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
  });
  document.addEventListener("click", event => {
    const slideStep = event.target.closest("[data-carousel-step]");
    if (slideStep) { state.slideControllers[slideStep.dataset.carouselTarget]?.(Number(slideStep.dataset.carouselStep)); return; }
    const galleryStep = event.target.closest("[data-gallery-step]");
    if (galleryStep) {
      const track = galleryStep.closest(".gallery-content").querySelector("[data-gallery-scroll]");
      const item = track.querySelector(".gallery-item");
      if (item) track.scrollLeft += Number(galleryStep.dataset.galleryStep) * (item.getBoundingClientRect().width + 16);
      return;
    }
    const sourceMore = event.target.closest("[data-source-more]");
    if (sourceMore) { sourceMore.closest(".sources-section").classList.add("is-expanded"); sourceMore.remove(); return; }
    const docMore = event.target.closest("[data-doc-more]");
    if (docMore) { docMore.closest(".documents-section").classList.add("is-expanded"); docMore.remove(); return; }
    const featureStep = event.target.closest("[data-feature-step]");
    if (featureStep) { rotateFeature(featureStep.closest(".feature-territory"), Number(featureStep.dataset.featureStep)); return; }
    const planStep = event.target.closest("[data-plan-step]");
    if (planStep) {
      const planKey = parseRoute().territory === "Seine-Liberté" ? "seineSlides" : "docksSlides";
      const plans = (state.data.presentation?.[planKey] || []).map(key => state.data.presentationMedia?.[key]).filter(Boolean);
      if (!plans.length) return;
      const nextIndex = (state.planIndex + Number(planStep.dataset.planStep) + plans.length) % plans.length;
      const item = plans[nextIndex], root = planStep.closest(".overview-visual");
      const button = $(".plan-preview", root), next = new Image();
      const generation = state.slideGeneration;
      const serial = Number(root.dataset.planRequest || 0) + 1;
      root.dataset.planRequest = String(serial);
      next.src = item.displaySrc || item.src; next.alt = item.caption || "Plan d’ensemble";
      if (item.responsiveSources?.length) {
        next.srcset = item.responsiveSources.map(source => `${source.src} ${source.width}w`).join(", ");
        next.sizes = "(max-width: 760px) 100vw, 720px";
        next.width = item.width; next.height = item.height;
      }
      next.className = "plan-crossfade";
      const show = () => {
        if (generation !== state.slideGeneration || !root.isConnected || Number(root.dataset.planRequest) !== serial || !next.naturalWidth) return;
        $("[data-plan-error]", root).hidden = true;
        const previous = $$('img', button);
        button.append(next);
        requestAnimationFrame(() => next.classList.add("is-visible"));
        setTimeout(() => previous.forEach(image => image.remove()), 700);
        button.dataset.lightboxSrc = item.src; button.dataset.lightboxCaption = item.caption || "Plan d’ensemble";
        button.dataset.lightboxCredit = item.credit || "";
        button.dataset.lightboxSourceUrl = item.sourceUrl || "";
        button.dataset.lightboxSourceLabel = item.sourceLabel || "";
        state.planIndex = nextIndex;
        $("[data-plan-count]", root).textContent = `${nextIndex + 1} / ${plans.length}`;
        setPresentationCredit($("[data-plan-credit]", root), item);
      };
      const fail = () => {
        if (generation === state.slideGeneration && root.isConnected && Number(root.dataset.planRequest) === serial) $("[data-plan-error]", root).hidden = false;
      };
      if (next.complete) { if (next.naturalWidth) show(); else fail(); }
      else { next.addEventListener("load", show, {once:true}); next.addEventListener("error", fail, {once:true}); }
      return;
    }
    const scrollButton = event.target.closest("[data-scroll-target], [data-timeline-target]");
    if (scrollButton) {
      document.getElementById(scrollButton.dataset.scrollTarget || scrollButton.dataset.timelineTarget)?.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"});
      return;
    }
    const projectLink = event.target.closest("[data-project-link]");
    if (projectLink && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      navigate("project", {id: projectLink.dataset.projectLink});
      return;
    }
    const routeButton = event.target.closest("[data-route]");
    if (routeButton && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault();
      const focusSearch = routeButton.hasAttribute("data-focus-search");
      const contributionProject = routeButton.dataset.contributionProject;
      navigate(routeButton.dataset.route);
      if (routeButton.dataset.route === "contribute") $("#contribution-project").value = contributionProject || "";
      if (focusSearch) setTimeout(() => state.map.focusSearch(), 150);
      return;
    }
    const territoryButton = event.target.closest("[data-territory]");
    if (territoryButton && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault();
      navigate("territory", {territory: territoryButton.dataset.territory});
      return;
    }
    const exploreTerritory = event.target.closest("[data-explore-territory]");
    if (exploreTerritory) {
      state.search = "";
      state.status = "";
      state.category = "";
      state.territory = groupValue(exploreTerritory.dataset.exploreTerritory);
      state.map.setTerritory(state.territory);
      navigate("explore");
      return;
    }
    const back = event.target.closest("[data-back]");
    if (back) {
      event.preventDefault();
      history.state?.internalReturn ? history.back() : navigate("explore");
      return;
    }
    const lightbox = event.target.closest("[data-lightbox-src]");
    if (lightbox) {
      const dialog = $("#lightbox");
      const gallery = lightbox.closest(".gallery-section");
      const buttons = gallery ? $$("[data-lightbox-src]", gallery) : [lightbox];
      state.lightboxItems = buttons.map(button => ({
        src: button.dataset.lightboxSrc,
        alt: button.dataset.lightboxAlt || "",
        caption: button.dataset.lightboxCaption || "",
        credit: button.dataset.lightboxCredit || "",
        sourceUrl: button.dataset.lightboxSourceUrl || "",
        sourceLabel: button.dataset.lightboxSourceLabel || "",
      }));
      showLightboxItem(buttons.indexOf(lightbox));
      dialog.showModal();
    }
  });

  $("#map-v13-host").addEventListener("ods:project", event => navigate("project", {id: event.detail}));
  $("#map-v13-host").addEventListener("ods:filters", event => {
    Object.assign(state, event.detail);
    if (state.route === "explore") {
      history.replaceState(history.state, "", mapFilterHref(state) + location.hash);
      state.renderedHash = location.pathname + location.search + location.hash;
    }
  });
  $("#timeline-territory").addEventListener("change", renderTimeline);
  $("#timeline-order").addEventListener("change", renderTimeline);
  $("#timeline-today").addEventListener("click", goToToday);
  $("#lightbox-close").addEventListener("click", () => $("#lightbox").close());
  $$("[data-lightbox-step]").forEach(button => button.addEventListener("click", () => {
    showLightboxItem(state.lightboxIndex + Number(button.dataset.lightboxStep));
  }));
  $("#lightbox").addEventListener("keydown", event => {
    if (state.lightboxItems.length < 2 || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
    event.preventDefault();
    showLightboxItem(state.lightboxIndex + (event.key === "ArrowLeft" ? -1 : 1));
  });
  $("#lightbox").addEventListener("close", () => { state.lightboxItems = []; });
  $("#lightbox").addEventListener("click", event => { if (event.target === $("#lightbox")) $("#lightbox").close(); });
  $("#menu-toggle").addEventListener("click", () => {
    const open = $("#menu-toggle").getAttribute("aria-expanded") === "true";
    $("#menu-toggle").setAttribute("aria-expanded", String(!open));
    $("#main-nav").classList.toggle("is-open", !open);
  });
  const reasonHelp = {
    "Signaler une erreur ou une information à actualiser": "Indiquez l'information concernée et, si possible, la source de la correction.",
    "Proposer une information ou un document": "Décrivez l'information et indiquez le lien du PDF dans le champ source, si vous proposez un document.",
    "Proposer une photographie": "Indiquez le lien de la photographie, sa provenance et sa situation au regard des droits.",
    "Demander une correction de crédit ou de source": "Précisez le média, le crédit ou le lien concerné et la correction demandée. Une adresse de réponse facilitera le suivi.",
    "Demander le retrait d'un contenu": "Indiquez le lien ou la fiche, le média concerné et le motif du retrait. Une adresse de réponse facilitera le suivi.",
    "Autre demande": "Précisez l'objet de votre demande dans le message.",
  };
  const updateContributionFields = () => {
    const reason = $("#contribution-reason").value;
    const help = $("#contribution-reason-help");
    help.textContent = reasonHelp[reason] || "";
    help.hidden = !help.textContent;
    const rights = $("#contribution-photo-rights");
    rights.hidden = reason !== "Proposer une photographie";
    if (rights.hidden) rights.querySelector("select").value = "";
  };
  $("#contribution-reason").addEventListener("change", updateContributionFields);
  const sourceInput = $('#contribution-form input[name="source"]');
  sourceInput.addEventListener("input", () => sourceInput.setCustomValidity(""));
  sourceInput.addEventListener("blur", () => normalizeSourceInput(sourceInput));
  $("#contribution-form").addEventListener("submit", async event => {
    event.preventDefault();
    const form = event.currentTarget;
    normalizeSourceInput(sourceInput);
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const projectSelect = $("#contribution-project");
    const selectedProject = projectSelect.value ? projectSelect.options[projectSelect.selectedIndex]?.textContent : "Aucun projet particulier";
    const reason = String(values.get("type") || "Demande générale");
    const submit = $("#contribution-submit");
    const success = $("#form-success");
    const failure = $("#form-error");
    values.set("project_name", selectedProject);
    values.set("publish_pseudonym", values.get("publish_pseudonym") ? "Oui" : "Non");
    values.set("privacy_acknowledged", "Oui");
    values.set("_subject", `Observatoire — ${reason} — ${selectedProject}`);
    success.hidden = true;
    failure.hidden = true;
    submit.disabled = true;
    submit.textContent = "Envoi en cours…";
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: values,
        headers: {Accept: "application/json"},
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const details = Array.isArray(result.errors) ? result.errors.map(item => item.message).filter(Boolean).join(" ") : "";
        throw new Error(details || `Le service de formulaire a répondu avec le code ${response.status}.`);
      }
      form.reset();
      updateContributionFields();
      success.hidden = false;
      success.scrollIntoView({behavior: "smooth", block: "nearest"});
    } catch (error) {
      console.error(error);
      $("#form-error-detail").textContent = error.message || "Veuillez réessayer dans quelques instants via le formulaire Contact & signalements.";
      failure.hidden = false;
      failure.scrollIntoView({behavior: "smooth", block: "nearest"});
    } finally {
      submit.disabled = false;
      submit.textContent = "Envoyer ma demande";
    }
  });
  const syncRoute = () => {
    const currentHash = location.pathname + location.search + location.hash;
    if (state.renderedHash !== currentHash) {
      if (parseRoute().route === "explore") state.map.syncUrlFilters();
      showRoute(parseRoute(), {instant: true, restore: history.state?.view});
    }
  };
  window.addEventListener("hashchange", syncRoute);
  window.addEventListener("popstate", syncRoute);
  window.addEventListener("resize", () => state.map.invalidate());
  document.addEventListener("error", event => {
    if (event.target.tagName === "IMG") event.target.closest("figure, .project-card-media, .row-thumb, .project-header-media, .territory-hero-media, .plan-preview")?.classList.add("image-missing");
  }, true);
}


async function start() {
  try {
    history.scrollRestoration = "manual";
    history.replaceState({...history.state, odsEntry: true}, "", location.href);
    state.data = await loadData();
    state.byId = new Map(state.data.projects.map(project => [project.id, project]));
    state.map = mountExplorer($("#map-v13-host"), state.data);
    Object.assign(state, state.map.filters());
    if (window.matchMedia("(max-width: 760px)").matches) $("#timeline-order").value = "newest";
    $("#contribution-project").insertAdjacentHTML("beforeend", state.data.projects
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`).join(""));
    const initialContribution = new URLSearchParams(location.search).get("contribution");
    if (initialContribution && state.byId.has(initialContribution)) {
      $("#contribution-project").value = initialContribution;
      const cleanUrl = new URL(location.href);
      cleanUrl.searchParams.delete("contribution");
      history.replaceState(history.state, "", cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
    }
    renderHome();
    bindEvents();
    $("#loading-screen").classList.add("is-hidden");
    setTimeout(() => $("#loading-screen").remove(), 450);
    showRoute(parseRoute(), {instant: true});
  } catch (error) {
    console.error(error, DATA_URL);
    $("#loading-screen").hidden = true;
    $("#fatal-error").hidden = false;
  }
}

start();
