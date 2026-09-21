import {escapeHtml, mediaAlt, projectHref, projectStatusLabel, statusColor, statusSymbol} from "./data.js";
import {cardVisual} from "./views.js";

const qualityLabel = quality => ({
  APPROX: "Localisation approximative",
  APPROXIMATIF: "Localisation approximative",
  SECTEUR: "Localisation de secteur",
  GLOBAL: "Localisation indicative",
  EXACT: "Adresse documentée",
})[quality] || "Localisation indicative";


export class ProjectMap {
  constructor(element, allProjects = []) {
    this.element = element;
    this.map = null;
    this.layer = null;
    this.projects = [];
    this.ready = false;
    this.visualUse = new Map();
    allProjects.forEach(project => project.visuals.forEach(visual => {
      this.visualUse.set(visual.src, (this.visualUse.get(visual.src) || 0) + 1);
    }));
    this.element.addEventListener("click", event => {
      const button = event.target.closest("[data-popup-src]");
      if (!button) return;
      const image = button.closest(".map-popup")?.querySelector("img");
      if (!image) return;
      image.src = button.dataset.popupSrc;
      image.alt = button.dataset.popupAlt || "";
      image.className = button.dataset.popupRole === "plan" ? "is-plan" : "is-photo";
    });
  }

  init() {
    if (this.ready) return;
    this.ready = true;
    if (!window.L) {
      this.element.classList.add("is-fallback");
      this.element.innerHTML = '<div class="map-fallback"><strong>Fond de carte indisponible</strong><p>Les projets restent accessibles dans la liste, avec leur adresse ou leur secteur.</p><div id="fallback-points"></div></div>';
      return;
    }
    this.map = L.map(this.element, {zoomControl: true, scrollWheelZoom: true, minZoom: 11, maxZoom: 19});
    this.planLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(this.map);
    this.aerialLayer = L.imageOverlay("assets/basemap-aerial.jpg",
      [[48.901, 2.307], [48.920, 2.339]], {opacity: 1, attribution: "Vue aérienne © IGN · date de prise de vue à confirmer"});
    this.layer = L.layerGroup().addTo(this.map);
    this.map.setView([48.914, 2.326], 14);
  }

  update(projects) {
    this.projects = projects.filter(project => project.map.latitude != null && project.map.longitude != null);
    if (!this.ready) this.init();
    if (!this.map) {
      const fallback = document.querySelector("#fallback-points");
      if (fallback) fallback.innerHTML = this.projects.slice(0, 14).map(project => `<a href="${projectHref(project.id)}"><i style="--status:${statusColor(project.status)}"></i><span>${escapeHtml(project.name)}</span></a>`).join("");
      return;
    }
    this.layer.clearLayers();
    const bounds = [];
    const groups = new Map();
    this.projects.forEach(project => {
      const key = `${project.map.latitude.toFixed(6)},${project.map.longitude.toFixed(6)}${["docks-zac", "seine-zac"].includes(project.id) ? `::${project.id}` : ""}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(project);
    });
    groups.forEach(group => {
      const project = group[0];
      const popupVisual = cardVisual(project) || project.visuals.find(visual => ["PLAN_MASSE", "PLAN_SITUATION"].includes(visual.role) && this.visualUse.get(visual.src) === 1);
      const popupPlan = project.visuals.find(visual => ["PLAN_MASSE", "PLAN_SITUATION"].includes(visual.role) && this.visualUse.get(visual.src) === 1 && visual.id !== popupVisual?.id);
      const isGroup = group.length > 1;
      const isTerritory = !isGroup && ["docks-zac", "seine-zac"].includes(project.id);
      const marker = L.marker([project.map.latitude, project.map.longitude], {
        icon: L.divIcon({
          className: "map-marker-wrap",
          html: isGroup
            ? `<span class="map-marker is-cluster" style="--marker:${statusColor(project.status)}">${group.length}</span>`
            : isTerritory ? `<span class="map-marker is-territory" title="Grand repère territorial"><b>⌖</b></span>`
            : `<span class="map-marker" style="--marker:${statusColor(project.status)}"><i aria-hidden="true">${statusSymbol(project.status)}</i></span>`,
          iconSize: isGroup ? [36, 36] : isTerritory ? [32, 32] : [30, 30],
          iconAnchor: isGroup ? [18, 18] : isTerritory ? [16, 16] : [15, 15],
        }),
        title: isGroup ? `${group.length} projets — ${project.map.quality.toLowerCase()}` : project.name,
      });
      const popup = isGroup
        ? `<div class="map-popup map-popup-group"><span>${escapeHtml(qualityLabel(project.map.quality))} · ${group.length} projets</span><strong>${escapeHtml(project.map.sector || project.map.zone || project.territory)}</strong>${group.slice(0, 14).map(item => `<a href="${projectHref(item.id)}" data-project-link="${escapeHtml(item.id)}">${escapeHtml(item.name)}</a>`).join("")}${group.length > 14 ? `<small>+ ${group.length - 14} autres projets dans la liste</small>` : ""}</div>`
        : `<div class="map-popup">
          ${popupVisual ? `<img class="${popupVisual.role.startsWith("PLAN_") ? "is-plan" : "is-photo"}" src="${escapeHtml(popupVisual.src)}" alt="${escapeHtml(mediaAlt(project, popupVisual))}" loading="lazy">` : ""}
          ${popupVisual && popupPlan ? `<div class="popup-media-switch"><button type="button" data-popup-src="${escapeHtml(popupVisual.src)}" data-popup-alt="${escapeHtml(mediaAlt(project, popupVisual))}" data-popup-role="photo">Photo</button><button type="button" data-popup-src="${escapeHtml(popupPlan.src)}" data-popup-alt="${escapeHtml(mediaAlt(project, popupPlan))}" data-popup-role="plan">Plan</button></div>` : ""}
          <span>${escapeHtml(project.territory)}${project.lot ? ` · lot ${escapeHtml(project.lot)}` : ""}</span>
          <strong>${escapeHtml(project.name)}</strong>
          <small>${isTerritory ? "Grand repère · " : `${escapeHtml(projectStatusLabel(project))} · `}${escapeHtml(qualityLabel(project.map.quality))}</small>
          <a href="${projectHref(project.id)}" data-project-link="${escapeHtml(project.id)}">Voir la fiche</a>
        </div>`;
      marker.bindPopup(popup);
      marker.addTo(this.layer);
      bounds.push([project.map.latitude, project.map.longitude]);
    });
    if (bounds.length) this.map.fitBounds(bounds, {padding: [40, 40], maxZoom: 15});
    else this.map.setView([48.914, 2.326], 14);
  }

  fit() {
    if (!this.map || !this.projects.length) return;
    const bounds = this.projects.map(project => [project.map.latitude, project.map.longitude]);
    this.map.fitBounds(bounds, {padding: [40, 40], maxZoom: 15});
  }

  setBase(mode) {
    this.init();
    if (!this.map) return;
    if (mode === "aerial") {
      this.map.removeLayer(this.planLayer);
      this.aerialLayer.addTo(this.map);
      this.map.setMaxBounds([[48.900, 2.306], [48.921, 2.340]]);
      this.map.setMinZoom(13);
      this.map.setMaxZoom(18);
      this.map.setView([48.912, 2.323], Math.max(14, this.map.getZoom()));
    } else {
      this.map.removeLayer(this.aerialLayer);
      this.planLayer.addTo(this.map);
      this.map.setMaxBounds(null);
      this.map.setMinZoom(11);
      this.map.setMaxZoom(19);
    }
  }

  invalidate() {
    setTimeout(() => this.map?.invalidateSize(), 80);
  }
}
