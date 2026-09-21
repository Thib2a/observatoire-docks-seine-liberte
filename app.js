import {
  DATA_URL, STATUS_ORDER, escapeHtml, formatDate, formatTemporal, loadData, normalize,
  projectStatusLabel, searchText, statusColor, statusLabel, statusSymbol,
} from "./modules/data.js";
import {ProjectMap} from "./modules/map.js";
import {cardVisual, projectCard, renderConfidenceCards, renderProject, renderTerritory, timelineEvent, updateRow} from "./modules/views.js";


const ACTIVE_STATUSES = new Set(["EN CHANTIER", "TRAVAUX PRÉPARATOIRES", "PROGRAMMÉ", "EN ÉTUDES"]);
const CONTACT_EMAIL = "dock-seine.carpool658@passmail.net";
const state = {
  data: null,
  byId: new Map(),
  route: "home",
  previousHash: "#accueil",
  search: "",
  status: "",
  territory: "",
  category: "",
  includeContext: true,
  map: null,
  carouselTimers: [],
  slideControllers: {},
  planIndex: 0,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];


function parseRoute() {
  const value = location.hash.replace(/^#\/?/, "") || "accueil";
  if (value.startsWith("projet/")) return {route: "project", id: decodeURIComponent(value.slice(7))};
  if (value.startsWith("territoire/")) return {route: "territory", territory: decodeURIComponent(value.slice(11))};
  if (["carte", "projets", "explorer"].includes(value)) return {route: "explore"};
  if (["evolutions", "actualites"].includes(value)) return {route: "updates"};
  if (["chronologie", "timeline"].includes(value)) return {route: "timeline"};
  if (["methode", "a-propos"].includes(value)) return {route: "method"};
  if (["contribuer", "signalement"].includes(value)) return {route: "contribute"};
  if (["mentions-legales", "legal"].includes(value)) return {route: "legal"};
  if (["confidentialite", "privacy"].includes(value)) return {route: "privacy"};
  if (["credits", "droits-images"].includes(value)) return {route: "credits"};
  return {route: "home"};
}


function routeHash(route) {
  return {home: "#accueil", explore: "#explorer", updates: "#evolutions", timeline: "#chronologie", method: "#a-propos", contribute: "#contribuer", legal: "#mentions-legales", privacy: "#confidentialite", credits: "#credits"}[route] || "#accueil";
}


function navigate(route, payload = {}) {
  if (route === "territory") location.hash = `#territoire/${encodeURIComponent(payload.territory)}`;
  else if (route === "project") location.hash = `#projet/${encodeURIComponent(payload.id)}`;
  else location.hash = routeHash(route);
}


function showRoute(parsed, options = {}) {
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
  $$(".main-nav button").forEach(button => button.removeAttribute("aria-current"));
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
    document.title = `${parsed.territory} — Observatoire`;
  } else if (parsed.route === "project") {
    const project = state.byId.get(parsed.id);
    if (!project) {
      const successor = state.data.retiredProjectRedirects?.[parsed.id];
      if (successor) navigate("project", {id: successor});
      else navigate("explore");
      return;
    }
    $("#project-content").innerHTML = renderProject(project);
    document.title = `${project.name} — Observatoire`;
  } else if (parsed.route === "explore") {
    document.title = "Carte & projets — Observatoire";
    updateExplorer();
    state.map.invalidate();
    if (options.focusSearch) setTimeout(() => $("#project-search")?.focus(), 100);
  } else {
    document.title = ({updates: "Actualités & évolutions — Observatoire", timeline: "Chronologie — Observatoire", method: "À propos de l’Observatoire", contribute: "Signaler une information — Observatoire", legal: "Mentions légales — Observatoire", privacy: "Confidentialité & cookies — Observatoire", credits: "Crédits & droits des images — Observatoire"})[parsed.route] || "Observatoire Docks & Seine-Liberté";
  }
  if (parsed.route === "home") mountHomeSlides();
  $("#main-content").focus({preventScroll: true});
  window.scrollTo({top: 0, behavior: options.instant ? "auto" : "smooth"});
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
  const active = projects.filter(project => ACTIVE_STATUSES.has(project.status));
  const delivered = projects.filter(project => project.status === "LIVRÉ / TERMINÉ");
  $("#stat-active").textContent = active.length;
  $("#stat-delivered").textContent = delivered.length;
  $("#stat-public").textContent = projects.length;
  $("#footer-date").textContent = formatDate(state.data.meta.lastReviewedAt);
  const featured = featuredProjects();
  $("#featured-projects").innerHTML = ["Docks de Saint-Ouen", "Seine-Liberté"].map(territory => {
    const group = featured.filter(project => project.territory === territory);
    return `<section class="feature-territory"><h3>${escapeHtml(territory)}</h3><div class="feature-rotator">${group.map((project, index) => `<div class="feature-slide ${index === 0 ? "is-active" : ""}" ${index ? 'aria-hidden="true" inert' : ""}>${projectCard(project)}</div>`).join("")}</div><div class="feature-controls"><button type="button" data-feature-step="-1" data-feature-territory="${escapeHtml(territory)}" aria-label="Projet précédent de ${escapeHtml(territory)}">←</button><span>1 / ${group.length}</span><button type="button" data-feature-step="1" data-feature-territory="${escapeHtml(territory)}" aria-label="Projet suivant de ${escapeHtml(territory)}">→</button></div></section>`;
  }).join("");

  $("#stat-public").textContent = projects.length;

  const updates = state.data.territoryNews.filter(update => state.byId.get(update.projectId)?.readiness !== "NON_PRET");
  $("#home-updates").innerHTML = updates.slice(0, 5).map(updateRow).join("");
  $("#territory-news-list").innerHTML = updates.map(updateRow).join("") || '<div class="empty-state"><strong>Aucune actualité datée</strong></div>';
  $("#observatory-journal-list").innerHTML = state.data.observatoryJournal.map(updateRow).join("") || '<div class="empty-state"><strong>Aucune mise à jour documentée</strong></div>';
  renderTimeline();
}

function mountSlides(selector, keys = [], delay = 0) {
  const target = $(selector);
  if (!target) return;
  const media = (keys || []).map(key => state.data.presentationMedia?.[key]).filter(Boolean);
  if (!media.length) return;
  let index = 0;
  let paintSerial = 0;
  const paint = () => {
    const serial = ++paintSerial;
    const item = media[index];
    const next = new Image();
    next.src = item.src;
    next.alt = item.caption || item.projectName || "";
    next.className = "crossfade-slide";
    const show = () => {
      if (serial !== paintSerial) return;
      const previous = [...target.children];
      target.append(next);
      requestAnimationFrame(() => next.classList.add("is-visible"));
      setTimeout(() => previous.forEach(child => child.remove()), 750);
    };
    if (next.complete) show(); else next.addEventListener("load", show, {once:true});
    if (selector === "#home-hero-media") $("#home-hero-caption").textContent = `${item.caption || item.projectName} · ${item.credit || "Source indiquée sur la fiche"}`;
    if (selector === "#territory-content .territory-hero-media") {
      const caption = $("#territory-content .territory-hero-caption");
      if (caption) caption.textContent = `${item.caption || item.projectName} · ${item.credit || "Source indiquée sur la fiche"}`;
    }
    target.dataset.slideIndex = String(index);
    const counter = document.querySelector(`[data-carousel-count="${selector}"]`);
    if (counter) counter.textContent = `${index + 1} / ${media.length}`;
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


function populateFilters() {
  const projects = state.data.projects.filter(project => project.additive);
  const addOptions = (selector, values) => {
    $(selector).insertAdjacentHTML("beforeend", values.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join(""));
  };
  const statuses = STATUS_ORDER.filter(status => projects.some(project => project.status === status)).map(status => ({value: status, label: statusLabel(status)}));
  $("#filter-status").insertAdjacentHTML("beforeend", statuses.map(({value, label}) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join(""));
  addOptions("#filter-territory", [...new Set(projects.map(project => project.territory))].sort((a, b) => a.localeCompare(b, "fr")));
  addOptions("#filter-category", [...new Set(projects.map(project => project.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr")));
}


function filteredProjects() {
  const query = normalize(state.search);
  let projects = state.data.projects.filter(project => {
    if (query && !searchText(project).includes(query)) return false;
    if (!state.includeContext && project.projectType === "ENSEMBLE") return false;
    return true;
  });
  if (state.status) projects = projects.filter(project => project.status === state.status);
  if (state.territory) projects = projects.filter(project => project.territory === state.territory);
  if (state.category) projects = projects.filter(project => project.category === state.category);
  projects.sort((a, b) =>
    STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
    a.name.localeCompare(b.name, "fr")
  );
  return projects;
}


function listRow(project) {
  const visual = project.visuals[0];
  const locationQuality = project.id === "docks-zac" || project.id === "seine-zac" ? "repère territorial" : ({APPROX: "localisation approximative", APPROXIMATIF: "localisation approximative", SECTEUR: "localisation de secteur", GLOBAL: "localisation indicative", EXACT: "adresse documentée"})[project.map.quality]
    || "localisation indicative";
  return `<a class="project-row" href="#projet/${encodeURIComponent(project.id)}" data-project-link="${escapeHtml(project.id)}">
    <span class="row-thumb">${visual ? `<img src="${escapeHtml(visual.src)}" alt="" loading="lazy">` : '<i aria-hidden="true"></i>'}</span>
    <span class="row-content"><small>${escapeHtml(project.territory)}${project.lot ? ` · Lot ${escapeHtml(project.lot)}` : ""}</small><strong>${escapeHtml(project.name)}</strong><span>${escapeHtml(project.category)} · ${escapeHtml(locationQuality)}</span></span>
    <span class="row-status" style="--status:${statusColor(project.status)}">${escapeHtml(projectStatusLabel(project))}</span>
  </a>`;
}


function updateMapLegend(projects) {
  const counts = new Map();
  projects.forEach(project => counts.set(project.status, (counts.get(project.status) || 0) + 1));
  $("#map-legend-items").innerHTML = STATUS_ORDER
    .filter(status => counts.has(status))
    .map(status => `<span class="map-legend-item">
      <i style="--legend:${statusColor(status)}" aria-hidden="true"><em>${statusSymbol(status)}</em></i>
      <span>${escapeHtml(statusLabel(status))}</span><b>${counts.get(status)}</b>
    </span>`).join("");
}


function updateExplorer() {
  if (!state.data) return;
  const projects = filteredProjects();
  const points = projects.filter(project => project.map.latitude != null);
  $("#project-list").innerHTML = projects.map(listRow).join("");
  $("#result-count").textContent = projects.length;
  $("#point-count").textContent = `${points.length} sur la carte`;
  $("#map-context").textContent = state.territory || "Tous les territoires";
  $("#empty-state").hidden = projects.length > 0;
  $("#clear-search").hidden = !state.search;
  updateMapLegend(projects);
  state.map.update(projects);
}


function bindEvents() {
  document.addEventListener("click", event => {
    const slideStep = event.target.closest("[data-carousel-step]");
    if (slideStep) { state.slideControllers[slideStep.dataset.carouselTarget]?.(Number(slideStep.dataset.carouselStep)); return; }
    const galleryMore = event.target.closest("[data-gallery-more]");
    if (galleryMore) { galleryMore.closest("[data-progressive-gallery]").classList.add("is-expanded"); galleryMore.remove(); return; }
    const sourceMore = event.target.closest("[data-source-more]");
    if (sourceMore) { sourceMore.closest(".sources-section").classList.add("is-expanded"); sourceMore.remove(); return; }
    const docMore = event.target.closest("[data-doc-more]");
    if (docMore) { docMore.closest(".documents-section").classList.add("is-expanded"); docMore.remove(); return; }
    const featureStep = event.target.closest("[data-feature-step]");
    if (featureStep) { rotateFeature(featureStep.closest(".feature-territory"), Number(featureStep.dataset.featureStep)); return; }
    const planStep = event.target.closest("[data-plan-step]");
    if (planStep) {
      const planKey = parseRoute().territory === "Seine-Liberté" ? "seinePlans" : "docksPlans";
      const plans = (state.data.presentation?.[planKey] || []).map(key => state.data.presentationMedia?.[key]).filter(Boolean);
      if (!plans.length) return;
      state.planIndex = (state.planIndex + Number(planStep.dataset.planStep) + plans.length) % plans.length;
      const item = plans[state.planIndex], root = planStep.closest(".overview-visual");
      const button = $(".plan-preview", root), next = new Image();
      next.src = item.src; next.alt = item.caption || "Plan d’ensemble";
      next.className = "plan-crossfade";
      const show = () => {
        if (plans[state.planIndex]?.src !== item.src) return;
        const previous = $$('img', button);
        button.append(next);
        requestAnimationFrame(() => next.classList.add("is-visible"));
        setTimeout(() => previous.forEach(image => image.remove()), 700);
        button.dataset.lightboxSrc = item.src; button.dataset.lightboxCaption = item.caption || "Plan d’ensemble";
      };
      if (next.complete) show(); else next.addEventListener("load", show, {once:true});
      $("[data-plan-count]", root).textContent = `${state.planIndex + 1} / ${plans.length}`;
      return;
    }
    const scrollButton = event.target.closest("[data-scroll-target], [data-timeline-target]");
    if (scrollButton) {
      document.getElementById(scrollButton.dataset.scrollTarget || scrollButton.dataset.timelineTarget)?.scrollIntoView({behavior: "smooth", block: "start"});
      return;
    }
    const routeButton = event.target.closest("[data-route]");
    if (routeButton) {
      event.preventDefault();
      const focusSearch = routeButton.hasAttribute("data-focus-search");
      const contributionProject = routeButton.dataset.contributionProject;
      navigate(routeButton.dataset.route);
      if (contributionProject) setTimeout(() => { $("#contribution-project").value = contributionProject; }, 50);
      if (focusSearch) setTimeout(() => $("#project-search")?.focus(), 150);
      return;
    }
    const territoryButton = event.target.closest("[data-territory]");
    if (territoryButton) {
      event.preventDefault();
      navigate("territory", {territory: territoryButton.dataset.territory});
      return;
    }
    const exploreTerritory = event.target.closest("[data-explore-territory]");
    if (exploreTerritory) {
      state.territory = exploreTerritory.dataset.exploreTerritory;
      $("#filter-territory").value = state.territory;
      navigate("explore");
      return;
    }
    const back = event.target.closest("[data-back]");
    if (back) {
      event.preventDefault();
      history.length > 1 ? history.back() : navigate("explore");
      return;
    }
    const lightbox = event.target.closest("[data-lightbox-src]");
    if (lightbox) {
      const dialog = $("#lightbox");
      $("#lightbox-image").src = lightbox.dataset.lightboxSrc;
      $("#lightbox-image").alt = lightbox.dataset.lightboxAlt || "";
      $("#lightbox-caption").textContent = lightbox.dataset.lightboxCaption || "";
      dialog.showModal();
    }
  });

  $("#project-search").addEventListener("input", event => { state.search = event.target.value; updateExplorer(); });
  $("#clear-search").addEventListener("click", () => { state.search = ""; $("#project-search").value = ""; updateExplorer(); $("#project-search").focus(); });
  $("#filter-status").addEventListener("change", event => { state.status = event.target.value; updateExplorer(); });
  $("#filter-territory").addEventListener("change", event => { state.territory = event.target.value; updateExplorer(); });
  $("#filter-category").addEventListener("change", event => { state.category = event.target.value; updateExplorer(); });
  $("#include-context").addEventListener("change", event => { state.includeContext = event.target.checked; updateExplorer(); });
  $("#fit-map").addEventListener("click", () => state.map.fit());
  $("#map-base").addEventListener("change", event => state.map.setBase(event.target.value));
  $("#timeline-territory").addEventListener("change", renderTimeline);
  $("#timeline-order").addEventListener("change", renderTimeline);
  $("#timeline-today").addEventListener("click", goToToday);
  $("#lightbox-close").addEventListener("click", () => $("#lightbox").close());
  $("#lightbox").addEventListener("click", event => { if (event.target === $("#lightbox")) $("#lightbox").close(); });
  $("#menu-toggle").addEventListener("click", () => {
    const open = $("#menu-toggle").getAttribute("aria-expanded") === "true";
    $("#menu-toggle").setAttribute("aria-expanded", String(!open));
    $("#main-nav").classList.toggle("is-open", !open);
  });
  $("#contribution-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const projectSelect = $("#contribution-project");
    const selectedProject = projectSelect.options[projectSelect.selectedIndex]?.textContent || values.get("project") || "Non précisé";
    const photo = values.get("photo");
    const pseudonym = String(values.get("pseudonym") || "").trim();
    const email = String(values.get("email") || "").trim();
    const source = String(values.get("source") || "").trim();
    const imageRights = String(values.get("image_rights") || "").trim();
    const lines = [
      `Projet : ${selectedProject}`,
      `Type de signalement : ${values.get("type") || "Non précisé"}`,
      `Pseudonyme : ${pseudonym || "Contribution anonyme"}`,
      `Publication du pseudonyme autorisée : ${values.get("publish_pseudonym") ? "Oui" : "Non"}`,
      `Adresse de réponse : ${email || "Non fournie"}`,
      `Source : ${source || "Non fournie"}`,
      `Photo à joindre : ${photo instanceof File && photo.name ? photo.name : "Aucune"}`,
      `Droits de la photo : ${imageRights || "Sans objet ou à préciser"}`,
      "",
      "Message :",
      String(values.get("message") || "").trim(),
    ];
    const preparedMessage = lines.join("\n");
    const subject = `Signalement Observatoire — ${selectedProject}`;
    $("#prepared-contribution").value = preparedMessage;
    $("#email-contribution").href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(preparedMessage)}`;
    $("#copy-feedback").hidden = true;
    $("#form-success").hidden = false;
    $("#form-success").scrollIntoView({behavior: "smooth", block: "nearest"});
  });
  $("#copy-contribution").addEventListener("click", async () => {
    const field = $("#prepared-contribution");
    try {
      await navigator.clipboard.writeText(field.value);
    } catch {
      field.select();
      document.execCommand("copy");
      field.setSelectionRange(0, 0);
    }
    $("#copy-feedback").hidden = false;
  });
  window.addEventListener("hashchange", () => showRoute(parseRoute()));
  window.addEventListener("resize", () => state.map.invalidate());
  document.addEventListener("error", event => {
    if (event.target.tagName === "IMG") event.target.closest("figure, .project-card-media, .row-thumb, .project-header-media, .territory-hero-media, .plan-preview")?.classList.add("image-missing");
  }, true);
}


async function start() {
  try {
    state.data = await loadData();
    state.byId = new Map(state.data.projects.map(project => [project.id, project]));
    state.map = new ProjectMap($("#map"), state.data.projects);
    if (window.matchMedia("(max-width: 760px)").matches) $("#map-legend").open = false;
    if (window.matchMedia("(max-width: 760px)").matches) $("#timeline-order").value = "newest";
    populateFilters();
    $("#contribution-project").insertAdjacentHTML("beforeend", state.data.projects
      .filter(project => project.additive)
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))
      .map(project => `<option value="${escapeHtml(project.id)}">${escapeHtml(project.name)}</option>`).join(""));
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
