export function mountExplorer(host, data) {
  "use strict";
  const root = host.attachShadow({mode: "open"});
  root.append(document.getElementById("map-v13-template").content.cloneNode(true));
  const STATUS_ORDER = ["EN CHANTIER", "TRAVAUX PRÉPARATOIRES", "PROGRAMMÉ", "EN ÉTUDES", "SUSPENDU / RETARDÉ", "LIVRÉ / TERMINÉ", "ABANDONNÉ", "STATUT INCONNU"];
  const STATUS_LABELS = { "EN CHANTIER": "En chantier", "TRAVAUX PRÉPARATOIRES": "Travaux préparatoires", "PROGRAMMÉ": "Programmé", "EN ÉTUDES": "En études", "SUSPENDU / RETARDÉ": "Suspendu / retardé", "LIVRÉ / TERMINÉ": "Livré / terminé", "ABANDONNÉ": "Abandonné", "STATUT INCONNU": "Statut à préciser" };
  const STATUS_COLORS = { "EN CHANTIER": "#e0643a", "TRAVAUX PRÉPARATOIRES": "#c28a12", "PROGRAMMÉ": "#1565b0", "EN ÉTUDES": "#a32679", "SUSPENDU / RETARDÉ": "#a94452", "LIVRÉ / TERMINÉ": "#52b38a", "ABANDONNÉ": "#555d5a", "STATUT INCONNU": "#98a09c" };
  const STATUS_SYMBOLS = { "EN CHANTIER": "●", "TRAVAUX PRÉPARATOIRES": "◐", "PROGRAMMÉ": "○", "EN ÉTUDES": "◇", "SUSPENDU / RETARDÉ": "!", "LIVRÉ / TERMINÉ": "✓", "ABANDONNÉ": "×", "STATUT INCONNU": "?" };
  const isMarker = (project) => ["docks-zac", "seine-zac"].includes(project.id);
  const desktopQuery = matchMedia("(min-width: 900px)");
  const $ = (id) => root.getElementById(id);
  const syncSearchCopy = () => {
    $("search").placeholder = "Projet, lot ou adresse";
    $("search").setAttribute("aria-label", "Rechercher un projet ou un repère de quartier");
    $("more").textContent = "Voir les autres résultats";
  };
  const params = new URLSearchParams(location.search);
  const territoryParam = {"Docks": "docks", "Seine-Liberté": "seine", "Abords": "abords"};
  const state = { projects: [], territory: territoryParam[params.get("secteur")] || "all", status: params.get("statut") || "all", category: params.get("categorie") || "all", query: "", mode: desktopQuery.matches ? "map" : "list", base: "plan", limit: 5, selected: null, map: null, markers: null, planLayer: null, aerialLayer: null };
  const publishFilters = () => host.dispatchEvent(new CustomEvent("ods:filters", {detail: {search: $("search").value, status: state.status === "all" ? "" : state.status, category: state.category === "all" ? "" : state.category, territory: {all: "", docks: "Docks", seine: "Seine-Liberté", abords: "Abords"}[state.territory]}}));
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const territoryOf = (project) => project.documentaryGroup === "Abords" ? "abords" : project.territory === "Seine-Liberté" ? "seine" : "docks";
  const matches = (project) => {
    if (state.territory !== "all" && territoryOf(project) !== state.territory) return false;
    if (state.status !== "all" && project.status !== state.status) return false;
    if (state.category !== "all" && project.category !== state.category) return false;
    const haystack = [project.name, project.officialName, project.lot, project.commune, project.zone, project.sector, project.map?.address].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return haystack.includes(state.query);
  };
  const filtered = () => state.projects.filter(matches);
  const sorted = (projects) => [...projects].sort((a, b) => Number(isMarker(a)) - Number(isMarker(b)) || STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.name.localeCompare(b.name, "fr"));
  const statusLabel = (status) => STATUS_LABELS[status] || "Statut à préciser";
  const statusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS["STATUT INCONNU"];
  const statusSymbol = (status) => STATUS_SYMBOLS[status] || "?";
  const projectHref = (project) => `/#fiche/${encodeURIComponent(project.id)}`;
  const groupLabel = (project) => project.documentaryGroup || (territoryOf(project) === "abords" ? "Abords" : territoryOf(project) === "seine" ? "Seine-Liberté" : "Docks");
  const projectStatus = (project) => isMarker(project) ? "Repère de quartier" : statusLabel(project.status);
  const imageUrl = (project) => {
    const visual = project.visuals?.find((item) => item.role === "HERO") || project.visuals?.[0];
    const src = visual?.thumbnail || visual?.displaySrc || visual?.src;
    return src ? (src.startsWith("/") ? src : `/${src}`) : "";
  };
  const renderLegend = (rows) => {
    const counts = new Map();
    rows.filter((project) => !isMarker(project)).forEach((project) => counts.set(project.status, (counts.get(project.status) || 0) + 1));
    $("legendItems").innerHTML = STATUS_ORDER.filter((status) => counts.has(status)).map((status) => `<span><i class="legend-pin${status === "LIVRÉ / TERMINÉ" ? " is-delivered" : ""}" style="--marker:${statusColor(status)}"><em>${statusSymbol(status)}</em></i><span>${statusLabel(status)}</span><b>${counts.get(status)}</b></span>`).join("");
  };
  const renderList = () => {
    const rows = sorted(filtered());
    const operations = rows.filter((project) => !isMarker(project)).length;
    const markers = rows.length - operations;
    const countText = `${operations} projet${operations > 1 ? "s" : ""}${markers ? ` · ${markers} repère${markers > 1 ? "s" : ""}` : ""}`;
    $("count").textContent = `${operations} projet${operations > 1 ? "s" : ""}${state.query ? ` trouvé${operations > 1 ? "s" : ""}` : ""}`;
    $("mapCount").textContent = countText;
    renderLegend(rows);
    if (!rows.length) {
      $("results").innerHTML = `<div class="empty">Aucun projet ne correspond à ces filtres. Essayez un autre terme ou un autre secteur.</div>`;
    } else {
      $("results").innerHTML = rows.slice(0, state.limit).map((project) => {
        const image = imageUrl(project);
        const place = [groupLabel(project), project.lot ? `Lot ${project.lot}` : ""].filter(Boolean).join(" · ");
        return `<a class="result" href="${projectHref(project)}" aria-label="Voir la fiche : ${escapeHtml(project.name)}">${image ? `<img class="thumb" src="${escapeHtml(image)}" alt="" loading="lazy">` : '<span class="thumb thumb-fallback" aria-hidden="true">⌖</span>'}<span class="result-main"><span class="result-place">${escapeHtml(place)}</span><strong>${escapeHtml(project.name)}</strong><span class="meta">${escapeHtml(project.category || "Projet")} · ${isMarker(project) ? "repère de quartier" : "emplacement vérifié"}</span><span class="badge" style="--status:${statusColor(project.status)}">${projectStatus(project)}</span></span><span class="arrow" aria-hidden="true">›</span></a>`;
      }).join("");
    }
    $("more").hidden = rows.length <= state.limit;
  };
  const clearSelection = () => { state.selected = null; if (state.map) state.map.closePopup(); $("selected").hidden = true; $("mapHint").hidden = false; $("legend").hidden = false; };
  const showSelection = (project, offsetX = 0, offsetY = 0) => {
    clearSelection();
    state.selected = project.id;
    const image = imageUrl(project);
    const place = [groupLabel(project), project.lot ? `Lot ${project.lot}` : ""].filter(Boolean).join(" · ");
    const role = isMarker(project) ? `<span class="badge marker-kind">Repère de quartier</span>` : "";
    const status = isMarker(project) ? "" : `<span class="badge" style="--status:${statusColor(project.status)}">${projectStatus(project)}</span>`;
    const content = `<article class="project-preview${isMarker(project) ? " is-quarter-marker" : ""}">${image ? `<img class="selected-image" src="${escapeHtml(image)}" alt="">` : ""}<span class="result-place">${escapeHtml(place)}</span>${role}<div class="preview-heading"><h2>${escapeHtml(project.name)}</h2>${status}</div><p>${escapeHtml(project.category || "Projet")}</p><a href="${projectHref(project)}">Voir la fiche ↗</a></article>`;
    L.popup({ className: "project-popup", maxWidth: 340, minWidth: Math.min(260, state.map.getSize().x - 64), offset: L.point(offsetX, offsetY - 16), autoPanPaddingTopLeft: [12, 54], autoPanPaddingBottomRight: [12, 20], closeButton: true })
      .setLatLng([project.map.latitude, project.map.longitude]).setContent(content).openOn(state.map);
    const close = root.querySelector(".project-popup .leaflet-popup-close-button");
    if (close) close.setAttribute("aria-label", "Fermer la fiche");
  };
  const showClusterSelection = (projects) => {
    clearSelection();
    state.selected = "cluster";
    $("selected").innerHTML = `<button class="close" type="button" aria-label="Fermer la liste des fiches">×</button><h2>${projects.length} fiches à cet emplacement</h2><p>Choisissez une fiche pour consulter ses informations complètes.</p><div class="selected-links">${sorted(projects).map((project) => `<a href="${projectHref(project)}">${escapeHtml(project.name)} <small>${projectStatus(project)}</small></a>`).join("")}</div>`;
    $("selected").hidden = false;
    $("mapHint").hidden = true;
    $("legend").hidden = true;
    $("selected").querySelector(".close").addEventListener("click", clearSelection);
  };
  const initMap = () => {
    if (state.map || !window.L) return;
    state.map = L.map($("map"), { zoomControl: false, scrollWheelZoom: desktopQuery.matches, touchZoom: true, preferCanvas: true }).setView([48.914, 2.323], 13);
    if (!desktopQuery.matches) {
      state.map.dragging.disable();
      state.map.touchZoom.enable();
    }
    state.map.on("popupopen", () => $("mapView").classList.add("has-selection"));
    state.map.on("popupclose", () => { state.selected = null; $("mapView").classList.remove("has-selection"); });
    state.planLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(state.map);
    state.aerialLayer = L.tileLayer("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&FORMAT=image/jpeg&TILEMATRIXSET=PM_0_19&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", { maxZoom: 19, tileSize: 256, attribution: '&copy; <a href="https://www.ign.fr/">IGN</a>' });
    L.control.zoom({ position: "topright" }).addTo(state.map);
    state.markers = L.layerGroup().addTo(state.map);
    state.map.on("zoomend moveend", renderMapMarkers);
  };
  const setBase = (base) => {
    state.base = base;
    for (const name of ["plan", "aerial"]) {
      const button = $(`${name}Base`);
      button.classList.toggle("active", name === base);
      button.setAttribute("aria-pressed", String(name === base));
    }
    if (!state.map) return;
    state.map.removeLayer(base === "aerial" ? state.planLayer : state.aerialLayer);
    (base === "aerial" ? state.aerialLayer : state.planLayer).addTo(state.map);
  };
  const renderMapMarkers = () => {
    if (!state.map || !state.markers || (state.mode !== "map" && !desktopQuery.matches)) return;
    state.markers.clearLayers();
    const visible = filtered().filter((project) => Number.isFinite(project.map?.latitude) && Number.isFinite(project.map?.longitude));
    const addPin = (project, offsetX = 0, offsetY = 0) => {
      const territory = isMarker(project);
      const marker = L.marker([project.map.latitude, project.map.longitude], {
        zIndexOffset: territory ? 1000 : 0,
        icon: L.divIcon({ className: "pin-wrap", html: `<span class="pin-marker${territory ? " is-territory" : ""}${project.status === "LIVRÉ / TERMINÉ" && !territory ? " is-delivered" : ""}" style="--marker:${territory ? "#123c34" : statusColor(project.status)};--offset-x:${offsetX}px;--offset-y:${offsetY}px">${territory ? "⌖" : `<i>${statusSymbol(project.status)}</i>`}</span>`, iconSize: desktopQuery.matches ? [32, 32] : [48, 48], iconAnchor: desktopQuery.matches ? [16, 16] : [24, 24] }),
        keyboard: true,
        title: project.name,
      });
      marker.on("click", () => showSelection(project, offsetX, offsetY));
      state.markers.addLayer(marker);
    };
    if (desktopQuery.matches) {
      // Les fiches gardent chacune leur pin ; seuls les emplacements identiques sont écartés visuellement.
      const exactLocations = new Map();
      visible.forEach((project) => {
        const key = `${project.map.latitude.toFixed(6)},${project.map.longitude.toFixed(6)}`;
        if (!exactLocations.has(key)) exactLocations.set(key, []);
        exactLocations.get(key).push(project);
      });
      exactLocations.forEach((projects) => projects.forEach((project, index) => {
        const radius = projects.length > 1 ? Math.min(18 + Math.floor(index / 8) * 10, 38) : 0;
        const angle = 2 * Math.PI * (index % 8) / Math.min(projects.length, 8);
        addPin(project, Math.round(Math.cos(angle) * radius), Math.round(Math.sin(angle) * radius));
      }));
      return;
    }
    const groups = new Map();
    const width = state.map.getSize().x;
    const zoom = state.map.getZoom();
    const cell = zoom >= 17 ? 31 : zoom >= 15 ? 43 : 58;
    visible.forEach((project) => {
      const latlng = [project.map.latitude, project.map.longitude];
      const point = state.map.latLngToContainerPoint(latlng);
      if (point.x < -40 || point.x > width + 40 || point.y < -40 || point.y > state.map.getSize().y + 40) return;
      const key = `${Math.round(point.x / cell)}:${Math.round(point.y / cell)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(project);
    });
    groups.forEach((projects) => {
      const lat = projects.reduce((sum, project) => sum + project.map.latitude, 0) / projects.length;
      const lon = projects.reduce((sum, project) => sum + project.map.longitude, 0) / projects.length;
      const isCluster = projects.length > 1;
      const mixed = new Set(projects.map((project) => project.status)).size > 1;
      const color = mixed ? "#123c34" : statusColor(projects[0].status);
      if (!isCluster) { addPin(projects[0]); return; }
      const marker = L.marker([lat, lon], { icon: L.divIcon({ className: "cluster-wrap", html: `<span class="cluster-marker${!mixed && projects[0].status === "LIVRÉ / TERMINÉ" ? " is-delivered" : ""}" style="--marker:${color}">${projects.length}</span>`, iconSize: [48, 48], iconAnchor: [24, 24] }), keyboard: true, title: `${projects.length} fiches — zoomer` });
      marker.on("click", () => zoom < 19 ? state.map.setView([lat, lon], Math.min(zoom + 2, 19), { animate: true }) : showClusterSelection(projects));
      state.markers.addLayer(marker);
    });
  };
  const fitProjects = () => {
    if (!state.map) return;
    const points = filtered().filter((project) => Number.isFinite(project.map?.latitude) && Number.isFinite(project.map?.longitude)).map((project) => [project.map.latitude, project.map.longitude]);
    if (points.length) state.map.fitBounds(L.latLngBounds(points), { padding: [36, 36], maxZoom: points.length === 1 ? 16 : 15, animate: false });
    else state.map.setView([48.914, 2.323], 13);
    renderMapMarkers();
  };
  const setMobileFiltersOpen = (open) => {
    $("mobileFiltersToggle").setAttribute("aria-expanded", String(open));
    root.querySelector(".controls").classList.toggle("filters-open", open);
    $("advancedFilters").open = desktopQuery.matches || open;
  };
  const setMode = (mode) => {
    clearSelection();
    state.mode = mode;
    host.dataset.mode = mode;
    if (!desktopQuery.matches) setMobileFiltersOpen(false);
    $("mobileFiltersLabel").textContent = mode === "map" ? "Recherche et filtres" : "Filtres";
    $("listView").hidden = !desktopQuery.matches && mode !== "list";
    $("mapView").hidden = !desktopQuery.matches && mode !== "map";
    for (const name of ["list", "map"]) {
      const button = $(`${name}Mode`);
      button.classList.toggle("active", mode === name);
      button.setAttribute("aria-pressed", String(mode === name));
    }
    if ((mode === "map" || desktopQuery.matches) && !host.closest("[data-view]").hidden) {
      if (!window.L) $("mapUnavailable").hidden = false;
      else {
        initMap();
        requestAnimationFrame(() => { state.map.invalidateSize(); fitProjects(); });
      }
    }
    $("mapHint").textContent = desktopQuery.matches ? "Sélectionnez un point pour explorer." : "Sélectionnez un point ou un groupe pour explorer.";
  };
  const updateFilterControls = () => {
    const count = Number(state.status !== "all") + Number(state.category !== "all");
    $("filterCount").hidden = count === 0;
    $("filterCount").textContent = `${count} filtre${count > 1 ? "s" : ""} actif${count > 1 ? "s" : ""}`;
    const mobileCount = count + Number(state.territory !== "all") + Number(Boolean(state.query));
    $("resetAdvancedFilters").hidden = mobileCount === 0;
    $("resetFiltersDesktop").hidden = mobileCount === 0;
    $("resetFiltersMobile").hidden = mobileCount === 0;
    $("mobileFiltersCount").hidden = mobileCount === 0;
    $("mobileFiltersCount").textContent = `${mobileCount} actif${mobileCount > 1 ? "s" : ""}`;
  };
  const refresh = () => { state.limit = 5; clearSelection(); renderList(); if (state.map && (state.mode === "map" || desktopQuery.matches)) fitProjects(); publishFilters(); };
  $("search").addEventListener("input", (event) => { state.query = event.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); $("clear").hidden = !event.target.value; updateFilterControls(); refresh(); });
  $("clear").addEventListener("click", () => { $("search").value = ""; $("search").dispatchEvent(new Event("input")); $("search").focus(); });
  root.querySelectorAll(".chip").forEach((button) => button.addEventListener("click", () => { state.territory = button.dataset.territory; root.querySelectorAll(".chip").forEach((chip) => { chip.classList.toggle("active", chip === button); chip.setAttribute("aria-pressed", String(chip === button)); }); updateFilterControls(); refresh(); }));
  $("status").addEventListener("change", (event) => { state.status = event.target.value; updateFilterControls(); refresh(); });
  $("category").addEventListener("change", (event) => { state.category = event.target.value; updateFilterControls(); refresh(); });
  const resetFilters = () => { state.status = state.category = state.territory = "all"; state.query = ""; $("status").value = $("category").value = "all"; $("search").value = ""; $("clear").hidden = true; root.querySelectorAll(".chip").forEach((chip) => { const active = chip.dataset.territory === "all"; chip.classList.toggle("active", active); chip.setAttribute("aria-pressed", String(active)); }); updateFilterControls(); refresh(); };
  ["resetAdvancedFilters", "resetFiltersDesktop", "resetFiltersMobile"].forEach((id) => $(id).addEventListener("click", resetFilters));
  $("more").addEventListener("click", () => { state.limit = sorted(filtered()).length; renderList(); });
  $("listMode").addEventListener("click", () => setMode("list"));
  $("mapMode").addEventListener("click", () => setMode("map"));
  $("mobileFiltersToggle").addEventListener("click", () => setMobileFiltersOpen($("mobileFiltersToggle").getAttribute("aria-expanded") !== "true"));
  $("planBase").addEventListener("click", () => setBase("plan"));
  $("aerialBase").addEventListener("click", () => setBase("aerial"));
  desktopQuery.addEventListener("change", () => { if (state.map) { if (desktopQuery.matches) { state.map.scrollWheelZoom.enable(); state.map.dragging.enable(); } else { state.map.scrollWheelZoom.disable(); state.map.dragging.disable(); state.map.touchZoom.enable(); } } $("advancedFilters").open = desktopQuery.matches; syncSearchCopy(); state.limit = 5; $("legend").open = desktopQuery.matches; clearSelection(); if (state.projects.length) renderList(); setMode(state.mode); });
  $("resetMap").addEventListener("click", () => { clearSelection(); fitProjects(); });
  syncSearchCopy();
  $("advancedFilters").open = desktopQuery.matches;
  updateFilterControls();
  root.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='/#fiche/']");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    host.dispatchEvent(new CustomEvent("ods:project", {detail: decodeURIComponent(link.getAttribute("href").split("/").at(-1))}));
  });
  {
    state.projects = (data.projects || []).filter((project) => Number.isFinite(project.map?.latitude) && Number.isFinite(project.map?.longitude));
    const operations = state.projects.filter((project) => !isMarker(project)).length;
    $("introTotal").textContent = state.projects.length;
    $("introOperations").textContent = operations;
    const categories = [...new Set(state.projects.filter((project) => !isMarker(project)).map((project) => project.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"));
    $("category").insertAdjacentHTML("beforeend", categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join(""));
    const statuses = STATUS_ORDER.filter((status) => state.projects.some((project) => project.status === status && !isMarker(project)));
    $("status").innerHTML = '<option value="all">Tous les statuts</option>' + statuses.map((status) => `<option value="${escapeHtml(status)}">${statusLabel(status)}</option>`).join("");
    $("legend").open = desktopQuery.matches;
    $("search").value = params.get("q") || "";
    state.query = $("search").value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    $("status").value = state.status;
    if ($( "status" ).selectedIndex < 0) state.status = $("status").value = "all";
    $("category").value = state.category;
    if ($( "category" ).selectedIndex < 0) state.category = $("category").value = "all";
    root.querySelectorAll(".chip").forEach(chip => { const active = chip.dataset.territory === state.territory; chip.classList.toggle("active", active); chip.setAttribute("aria-pressed", String(active)); });
    $("clear").hidden = !$("search").value;
    updateFilterControls();
    renderList();
    setMode(desktopQuery.matches ? "map" : "list");
  }
  return {
    enter() {
      if (state.mode !== "map" && !desktopQuery.matches) return;
      if (!window.L) { $("mapUnavailable").hidden = false; return; }
      initMap();
      requestAnimationFrame(() => { state.map.invalidateSize(); fitProjects(); });
    },
    setHeading(active) {
      const heading = root.querySelector("[data-page-heading]");
      const tag = active ? "H1" : "H2";
      if (heading.tagName === tag) return;
      const replacement = document.createElement(tag.toLowerCase());
      for (const attribute of heading.attributes) replacement.setAttribute(attribute.name, attribute.value);
      replacement.append(...heading.childNodes);
      heading.replaceWith(replacement);
    },
    focusSearch() { setMobileFiltersOpen(true); $("search").focus(); },
    filters() { return {search: $("search").value, status: state.status === "all" ? "" : state.status, category: state.category === "all" ? "" : state.category, territory: {all: "", docks: "Docks", seine: "Seine-Liberté", abords: "Abords"}[state.territory]}; },
    setTerritory(value) {
      state.status = state.category = "all";
      state.query = "";
      state.territory = {Docks: "docks", "Seine-Liberté": "seine", Abords: "abords"}[value] || "all";
      $("search").value = ""; $("clear").hidden = true;
      $("status").value = $("category").value = "all";
      root.querySelectorAll(".chip").forEach(chip => { const active = chip.dataset.territory === state.territory; chip.classList.toggle("active", active); chip.setAttribute("aria-pressed", String(active)); });
      updateFilterControls(); refresh();
    },
    syncUrlFilters() {
      const search = new URLSearchParams(location.search);
      state.territory = {Docks: "docks", "Seine-Liberté": "seine", Abords: "abords"}[search.get("secteur")] || "all";
      state.status = search.get("statut") || "all";
      state.category = search.get("categorie") || "all";
      $("search").value = search.get("q") || "";
      state.query = $("search").value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      $("status").value = state.status; if ($("status").selectedIndex < 0) state.status = $("status").value = "all";
      $("category").value = state.category; if ($("category").selectedIndex < 0) state.category = $("category").value = "all";
      root.querySelectorAll(".chip").forEach(chip => { const active = chip.dataset.territory === state.territory; chip.classList.toggle("active", active); chip.setAttribute("aria-pressed", String(active)); });
      updateFilterControls(); refresh();
    },
    viewport() { if (!state.map) return null; const center = state.map.getCenter(); return {lat: center.lat, lng: center.lng, zoom: state.map.getZoom()}; },
    restoreViewport(view) { if (state.map && view) state.map.setView([view.lat, view.lng], view.zoom, {animate: false}); },
    invalidate() { if (state.map) requestAnimationFrame(() => state.map.invalidateSize()); },
    listScroll() { return $("listView").scrollTop; },
    restoreListScroll(top) { $("listView").scrollTop = top; },
  };
}
