import {
  safeLinkUrl, projectTerritoryLabel, responsiveImageAttrs, documentaryGroup, filterDocumentaryGroup, CONFIDENCE_HELP, MILESTONE_LABELS, READINESS_LABELS, ROLE_LABELS,
  chevronIcon, externalLinkIcon, sourceName, escapeHtml, formatDate, formatEmbeddedDates, formatTemporal, mediaAlt, mediaAttribution, mediaDisplayAttribution, projectHref, projectStatusLabel, statusBadge,
} from "./data.js?v=c70c9c584bd3";


const ACTIVE_STATUSES = new Set(["EN CHANTIER", "TRAVAUX PRÉPARATOIRES", "PROGRAMMÉ", "EN ÉTUDES"]);
const FUTURE_STATUSES = new Set(["PROGRAMMÉ", "EN ÉTUDES"]);


function hasCentralUncertainty(project) {
  return project.additive && (project.status === "STATUT INCONNU" || project.confidence === "NON CONFIRMÉ");
}


function readinessNote(project) {
  if (hasCentralUncertainty(project)) {
    return '<p class="readiness-note central-warning">Le stade d’avancement de ce projet reste à confirmer.</p>';
  }
  return "";
}

function publicLocation(project) {
  const location = project.locationText?.trim() || project.map.address || [project.map.sector, project.commune].filter(Boolean).join(", ");
  const sector = location.match(/^(\d+[a-z]?)\s*—\s*(.+?)\s*·\s*(.+)$/i);
  if (sector) return `Secteur ${sector[1]} — ${sector[2]}, ${sector[3]}`;
  return location;
}

function descriptionParagraphs(value) {
  const original = String(value || "").trim();
  let paragraphs = original.split(/\n\s*\n/).map(part => part.replace(/\s+/g, " ").trim()).filter(Boolean);
  if (paragraphs.length === 1 && original.length > 310) {
    const sentences = original.match(/[^.!?]+[.!?]+(?:[»”])?|[^.!?]+$/g)?.map(s => s.trim()).filter(Boolean) || [original];
    paragraphs = []; let current = "";
    for (const sentence of sentences) {
      if (current && current.length + sentence.length > 300) { paragraphs.push(current); current = ""; }
      current += (current ? " " : "") + sentence;
    }
    if (current) paragraphs.push(current);
  }
  return paragraphs.map(part => `<p class="project-description">${escapeHtml(part)}</p>`).join("");
}


export function cardVisual(project) {
  return project.visuals.find(visual => ["HERO", "GALERIE"].includes(visual.role) && !visual.src.includes("_ARCHIVES_TECHNIQUES/APERÇUS_PDF")) || null;
}

function imageMarkup(project, visual, className = "") {
  if (!visual) return `<div class="media-placeholder ${className}"><span>Aucun visuel disponible</span></div>`;
  return `<img class="${className}" src="${escapeHtml(visual.displaySrc || visual.src)}"${responsiveImageAttrs(visual)} alt="${escapeHtml(mediaAlt(project, visual))}" loading="lazy" decoding="async">`;
}


function mediaCredit(visual) {
  if (!visual) return "";
  const label = escapeHtml(mediaDisplayAttribution(visual));
  const full = escapeHtml(mediaAttribution(visual));
  return visual.sourceUrl ? `<a href="${escapeHtml(safeLinkUrl(visual.sourceUrl))}" target="_blank" rel="noopener" aria-label="${full}" title="${full}">${label}</a>` : `<span title="${full}">${label}</span>`;
}


export function projectCard(project, options = {}) {
  const visual = cardVisual(project);
  const compact = options.compact ? " is-compact" : "";
  return `<article class="project-card${compact}"><a class="project-card-link" href="${projectHref(project.id)}" data-project-link="${escapeHtml(project.id)}">
    <div class="project-card-media">
      ${imageMarkup(project, visual)}
      <span class="card-territory">${escapeHtml(projectTerritoryLabel(project))}</span>
      ${hasCentralUncertainty(project) ? '<span class="card-progress">Statut à confirmer</span>' : ""}
    </div>
    <div class="project-card-body">
      ${statusBadge(project)}
      <h3>${escapeHtml(project.name)}</h3>
      <p>${escapeHtml(formatEmbeddedDates(project.description))}</p>
      <div class="card-meta"><span>${escapeHtml(project.category)}</span><span>${escapeHtml(formatEmbeddedDates(project.dateText || publicLocation(project)))}</span></div>
    </div>
  </a></article>`;
}


export function updateRow(update) {
  return `<article class="update-item">
    <time datetime="${escapeHtml(update.date)}">${escapeHtml(formatTemporal(update.date, update.datePrecision || "JOUR"))}<small>${escapeHtml(update.dateContext || "Date documentée")}</small></time>
    <span class="update-kind">${escapeHtml(update.title)}</span>
    <strong>${update.projectId ? `<a href="${projectHref(update.projectId)}" data-project-link="${escapeHtml(update.projectId)}">${escapeHtml(update.projectName)}</a>` : escapeHtml(update.projectName)}</strong>
    <p>${escapeHtml(update.detail)}</p>
    ${update.sourceUrl ? `<a class="update-source" href="${escapeHtml(safeLinkUrl(update.sourceUrl))}" target="_blank" rel="noopener"${update.sourceDescription ? ` aria-label="${escapeHtml(update.sourceDescription)}" title="${escapeHtml(update.sourceDescription)}"` : ""}>${escapeHtml(sourceName(update.sourceUrl, update.sourceLabel))}&nbsp;${externalLinkIcon}</a>` : '<span aria-hidden="true">↗</span>'}
  </article>`;
}


export function timelineEvent(event, projectsById) {
  const related = (event.projectIds || []).map(id => projectsById.get(id)).filter(Boolean);
  return `<article class="history-event" id="timeline-${escapeHtml(event.id)}">
    <time datetime="${escapeHtml(event.date)}">${escapeHtml(formatTemporal(event.date, event.precision, event.dateLabel))}</time>
    <div><p class="eyebrow">${escapeHtml(event.territory)} · ${escapeHtml(event.kind.replaceAll("_", " "))}</p>
      <h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(event.summary)}</p>
      ${related.length ? `<div class="event-projects">${related.map(project => `<a href="${projectHref(project.id)}" data-project-link="${escapeHtml(project.id)}">${escapeHtml(project.name)}</a>`).join("")}</div>` : ""}
      ${event.sourceUrl ? `<a class="text-link" href="${escapeHtml(safeLinkUrl(event.sourceUrl))}" target="_blank" rel="noopener">${escapeHtml(sourceName(event.sourceUrl, event.sourceLabel))}&nbsp;${externalLinkIcon}</a>` : ""}
    </div>
  </article>`;
}


function territoryOverview(isSeine, items, territory, presentation = {}, presentationMedia = {}) {
  const ensemble = items.find(project => project.projectType === "ENSEMBLE");
  const chosen = isSeine ? presentation.seineSlides : presentation.docksSlides;
  const plans = (chosen || []).map(key => presentationMedia[key]).filter(Boolean);
  const fallback = ensemble?.visuals.find(visual => visual.role === "PLAN_MASSE" || visual.role === "PLAN_SITUATION");
  if (!plans.length && fallback) plans.push(fallback);
  const sourceUrl = isSeine
    ? "https://www.ville-clichy.fr/170-les-projets-clichy.htm"
    : "https://www.docks-saintouen.fr/explorer-les-cartes-interactives/programmation-les-docks-de-saint-ouen/";
  const content = isSeine
    ? `<p>La ZAC Seine-Liberté prévoit la transformation d'anciens terrains d'activité en un nouveau quartier associant logements, équipements publics, espaces verts, nouvelles rues et berges aménagées.</p><p>Les plans d'ensemble permettent de comprendre son organisation, de situer les différents lots et de suivre la réalisation progressive des aménagements.</p>`
    : `<p>La ZAC des Docks réunit plusieurs secteurs aux caractéristiques et aux stades d'aménagement différents. Certains sont déjà livrés et habités, tandis que d'autres accueillent de nouveaux chantiers ou des projets encore à l'étude.</p><p>Les plans d'ensemble, photos et autre documents permettent de comprendre l'organisation du quartier, de situer les différentes opérations et de découvrir les aménagements à venir.</p>`;
  const planCredit = plans.length ? `<p class="presentation-plan-credit" data-plan-credit>${escapeHtml(plans[0].caption || `Visuel — ${territory}`)} · ${mediaCredit(plans[0])}</p>` : "";
  return `<section class="reference-plan territory-overview" aria-labelledby="overview-title">
    <div class="overview-copy"><p class="eyebrow">Vue d’ensemble</p><h2 id="overview-title">${isSeine ? "Découvrir le futur quartier Seine-Liberté" : "Découvrir les Docks et ses différents secteurs"}</h2>${content}<a class="overview-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${isSeine ? "Découvrir les projets urbains de Clichy" : "Consulter la carte officielle des Docks"}&nbsp;${externalLinkIcon}</a></div>
    <div class="overview-visual">${plans.length ? `<button class="plan-preview" type="button" data-lightbox-src="${escapeHtml(plans[0].src)}" data-lightbox-alt="Plan d’ensemble de ${escapeHtml(territory)}" data-lightbox-caption="${escapeHtml(plans[0].caption || "Plan d’ensemble")}" data-lightbox-credit="${escapeHtml(plans[0].credit || "")}" data-lightbox-source-url="${escapeHtml(plans[0].sourceUrl || "")}" data-lightbox-source-label="${escapeHtml(plans[0].sourceLabel || "")}"><img src="${escapeHtml(plans[0].displaySrc || plans[0].src)}"${responsiveImageAttrs(plans[0])} alt="Plan d’ensemble de ${escapeHtml(territory)}" loading="lazy"><span>Agrandir le plan d’ensemble</span></button>${planCredit}${plans.length > 1 ? `<div class="plan-pager"><button type="button" data-plan-step="-1" aria-label="Plan précédent" title="Plan précédent">${chevronIcon(-1)}</button><span data-plan-count>1 / ${plans.length}</span><button type="button" data-plan-step="1" aria-label="Plan suivant" title="Plan suivant">${chevronIcon(1)}</button></div>` : ""}` : `<div class="overview-map">Plan d’ensemble à sélectionner</div>`}<div class="overview-actions"><a class="button button-primary overview-explore" href="/carte/" data-route="explore">Voir les projets sur la carte interactive →</a><a class="button button-light overview-fiche" href="${projectHref(isSeine ? "seine-zac" : "docks-zac")}" data-project-link="${isSeine ? "seine-zac" : "docks-zac"}">Voir la fiche ${isSeine ? "Seine-Liberté" : "des Docks"} et ses projets →</a></div></div>
  </section>`;
}


export function renderTerritory(territory, projects, presentation = {}, presentationMedia = {}) {
  const isSeine = territory === "Seine-Liberté";
  const items = filterDocumentaryGroup(projects, territory);
  const abords = projects.filter(project => project.documentaryGroup === "Abords" && project.territory === territory);
  const operations = items.filter(project => project.projectType !== "ENSEMBLE");
  const additive = items.filter(project => project.additive);
  const current = operations.filter(project => ACTIVE_STATUSES.has(project.status));
  const future = additive.filter(project => FUTURE_STATUSES.has(project.status));
  const delivered = operations.filter(project => project.status === "LIVRÉ / TERMINÉ");
  const publicSpaces = additive.filter(project => ["Espaces publics", "Espaces verts", "Infrastructures", "Équipements"].includes(project.category));
  const visualProject = items
    .filter(project => cardVisual(project))
    .sort((a, b) => Number(b.projectType === "ENSEMBLE") - Number(a.projectType === "ENSEMBLE") || b.visuals.length - a.visuals.length)[0];
  const visual = visualProject ? cardVisual(visualProject) : null;
  const contextProject = isSeine ? items.find(project => project.projectType === "ENSEMBLE") : null;
  const contextVisual = contextProject?.visuals.find(item => item.role === "GALERIE" && item.caption.includes("Perspective urbaine Seine-Liberté"));
  const intro = isSeine
    ? ["À Clichy, en bord de Seine et dans le prolongement des Docks de Saint-Ouen, la ZAC Seine-Liberté prend progressivement forme.", "Cette page rassemble les projets de Seine-Liberté ainsi que certains projets situés à ses abords immédiats lorsqu’ils participent directement aux transformations du secteur."]
    : ["La ZAC des Docks de Saint-Ouen-sur-Seine, ancien territoire industriel devenu un quartier de vie, poursuit sa transformation.", "Cette page rassemble les projets suivis dans les Docks de Saint-Ouen ainsi que certains projets situés à leurs abords immédiats lorsqu’ils participent directement aux transformations du secteur."];
  const eyebrow = isSeine ? "Clichy · bord de Seine" : "Saint-Ouen-sur-Seine";

  const projectStrip = (title, subtitle, rows) => rows.length ? `<section class="territory-section">
    <div class="section-heading"><div><p class="eyebrow">${escapeHtml(subtitle)}</p><h2>${escapeHtml(title)}</h2></div></div>
    <div class="project-grid">${rows.slice(0, 8).map(project => projectCard(project, {compact: true})).join("")}</div>
  </section>` : "";

  return `<header class="territory-hero ${isSeine ? "is-seine" : "is-docks"}">
    <div class="territory-hero-media">${isSeine ? imageMarkup(contextProject || {name: territory}, contextVisual) : imageMarkup(visualProject || {name: territory, map: items[0]?.map}, visual)}</div>
    <div class="territory-hero-shade"></div>
    <div class="territory-hero-content">
      <button class="back-link" type="button" data-route="home">← Accueil</button>
      <p class="eyebrow">${escapeHtml(eyebrow)}</p>
      <h1 class="view-title" data-page-heading>${escapeHtml(territory)}</h1>
      ${intro.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}
      <button class="button button-primary" type="button" data-explore-territory="${escapeHtml(territory)}">Explorer la carte et les projets</button>
      <dl><div><dt>${operations.length}</dt><dd>Opérations suivies</dd></div><div><dt>${current.length}</dt><dd>En cours / à venir</dd></div><div><dt>${delivered.length}</dt><dd>Opérations livrées</dd></div></dl>
      <button class="swipe-hint" type="button" data-scroll-target="overview-title" aria-label="Descendre vers la vue d’ensemble"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 8 8 8 8-8"/></svg></button>
    </div>
    <div class="territory-hero-caption">${isSeine ? (contextVisual ? `Vue de contexte du site, non rendu du projet final · ${mediaCredit(contextVisual)}` : "") : (visual ? `${escapeHtml(visual.caption)} · ${mediaCredit(visual)}` : "")}</div>
  </header>
  <div class="territory-body">
    ${territoryOverview(isSeine, items, territory, presentation, presentationMedia)}
    ${projectStrip("Chantiers et projets à suivre", "Aujourd’hui et demain", current)}
    ${projectStrip("Espaces publics et équipements", "Le cadre de vie", publicSpaces)}
    ${projectStrip("Quartier déjà réalisé", "Mémoire récente", delivered)}
    ${projectStrip("Abords de la ZAC", "Les Projets des abords", abords)}
  </div>`;
}


function figureItems(project) {
  const labels = {
    housing: "logements", socialHousing: "logements sociaux", rooms: "chambres",
    capacity: "places", surface: "surface", shops: "commerces", facilities: "équipements", budget: "budget",
    householdsSupplied: "foyers alimentés", businessesSupplied: "PME et commerces alimentés",
  };
  return Object.entries(project.figures)
    .filter(([key, value]) => value && !(key === "housing" && value === project.figures.socialHousing))
    .map(([key, value]) => {
      const label = labels[key] || key;
      const alreadyLabeled = /[a-zà-ÿ]/i.test(String(value).replace(/m²|m2|\bSDP\b/gi, ""));
      const longValue = String(value).trim().length > 28;
      return `<div class="${longValue ? "is-long" : ""}"><strong>${escapeHtml(value)}</strong>${alreadyLabeled ? "" : `<span>${escapeHtml(label)}</span>`}</div>`;
    })
    .join("");
}


function actorItems(project) {
  const roleOrder = ["AMENAGEUR", "MAITRE_OUVRAGE", "PROMOTEUR", "ARCHITECTE", "PAYSAGISTE", "BAILLEUR", "EXPLOITANT", "COLLECTIVITE", "ENTREPRISE", "AUTRE"];
  const priority = role => {
    const index = roleOrder.indexOf(role);
    return index < 0 ? roleOrder.length : index;
  };
  const redundantDetails = {
    ARCHITECTE: ["architecte"],
    PAYSAGISTE: ["paysagiste"],
    PROMOTEUR: ["promoteur", "operateur", "operateur / responsable du projet"],
    MAITRE_OUVRAGE: ["maitre d'ouvrage / petitionnaire", "maitrise d'ouvrage / developpement"],
  };
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr").replaceAll("’", "'").replace(/\s+/g, " ").trim();
  return [...project.actors].sort((a, b) => priority(a.role) - priority(b.role)).map(actor => {
    const normalized = normalize(actor.detail);
    const detail = normalized === normalize(actor.name) || normalized === "x"
      || normalized.startsWith("extrait du texte source conserve")
      || redundantDetails[actor.role]?.includes(normalized)
      ? ""
      : normalized === "societe de projet / maitre d'ouvrage" ? "société de projet" : actor.detail;
    return `<div class="actor-row"><span>${escapeHtml(ROLE_LABELS[actor.role] || actor.role)}</span><strong>${escapeHtml(actor.name)}</strong>${detail ? `<small>${escapeHtml(detail)}</small>` : ""}</div>`;
  }).join("");
}


function timelineItems(project) {
  return project.milestones.map(item => `
    <li class="timeline-item ${item.type === "LIVRAISON_PREVUE" ? "is-announced" : item.type === "DEBUT_TRAVAUX" ? "is-work-start" : ""}">
      <span></span><div><small>${escapeHtml(item.displayLabel || item.permitLabel || MILESTONE_LABELS[item.type] || "Étape")}</small><strong>${escapeHtml(formatTemporal(item.date, item.precision, item.label))}</strong>${item.permitReferences?.length ? `<small>${escapeHtml([item.permitContext, item.permitReferences.join(" · ")].filter(Boolean).join(" : "))}</small>` : ""}${(item.permitSources || []).map(source => `<a class="permit-source" href="${escapeHtml(safeLinkUrl(source.url))}" target="_blank" rel="noopener" aria-label="${escapeHtml(source.label)}, source complémentaire pour ${escapeHtml(source.reference)}" title="${escapeHtml(source.label)}, source complémentaire">${escapeHtml(source.label)}${item.permitSources.length > 1 ? ` ${escapeHtml(source.reference)}` : ""}&nbsp;${externalLinkIcon}</a>`).join("")}${item.source?.url ? `<a class="permit-source" href="${escapeHtml(item.source.url)}" target="_blank" rel="noopener" title="${escapeHtml(item.source.locator ? `Source du jalon : ${item.source.locator}` : "Source du jalon")}">${escapeHtml(sourceName(item.source.url, item.source.organization || item.source.title))}${item.source.locator ? ` · ${escapeHtml(item.source.locator)}` : ""}&nbsp;${externalLinkIcon}</a>` : ""}</div>
    </li>`).join("");
}


export function groupTerritoryRelations(project, projectsById = new Map()) {
  const groups = new Map();
  for (const related of project.relatedProjects || []) {
    const target = projectsById.get(related.id);
    let label = "Autres opérations liées";
    if (project.projectType === "ENSEMBLE") {
      if (target?.documentaryGroup === "Abords") {
        label = "Projets des abords";
      } else if (project.id === "seine-zac") {
        label = "Opérations de Seine-Liberté et aménagements liés";
      } else if (["infra-passerelle-seine", "infra-pole-bus"].includes(related.id)) {
        label = target?.sector || "Aménagements en lien";
      } else if (related.relation === "Comprend") {
        label = target?.sector || (related.id === "infra-passerelle-college"
          ? projectsById.get("docks-m8")?.sector : "") || "Autres opérations des Docks";
      } else {
        label = "Aménagements en lien";
      }
    }
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(related);
  }
  return [...groups].sort(([a], [b]) => {
    const rank = label => label === "Projets des abords" ? 2 : label === "Aménagements en lien" ? 1 : 0;
    return rank(a) - rank(b) || a.localeCompare(b, "fr", {numeric: true});
  });
}

export function renderProject(project, projectsById = new Map()) {
  const hero = project.visuals.find(item => item.role === "HERO") || project.visuals[0];
  const seenVisuals = new Set();
  const gallery = project.visuals.filter(item => {
    if (seenVisuals.has(item.src)) return false;
    seenVisuals.add(item.src);
    return true;
  });
  const figures = figureItems(project);
  const actors = actorItems(project);
  const timeline = timelineItems(project);
  const announcedDelivery = ["EN CHANTIER", "TRAVAUX PRÉPARATOIRES", "PROGRAMMÉ", "EN ÉTUDES"].includes(project.status)
    ? project.milestones.find(item => item.type === "LIVRAISON_PREVUE" && item.nature === "ACTUEL")
    : null;
  const mainDate = project.dateText || (announcedDelivery
    ? `Livraison annoncée : ${formatTemporal(announcedDelivery.date, announcedDelivery.precision, announcedDelivery.label)}`
    : "");
  const locationText = publicLocation(project);
  const locationQualifier = project.map?.verified
    ? "Emplacement vérifié"
    : (project.map?.precision || "Emplacement à vérifier");
  const mediaGroup = (title, kind, visuals) => !visuals.length ? "" : `<section class="detail-section gallery-section">
    <div class="detail-heading"><p class="eyebrow">Images et documents graphiques</p><h2>${title}</h2></div>
    <div class="gallery-content">
    ${visuals.length > 1 ? `<div class="gallery-controls"><button type="button" data-gallery-step="-1" aria-label="Image précédente" title="Image précédente"><svg class="lucide lucide-chevron-left" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button><button type="button" data-gallery-step="1" aria-label="Image suivante" title="Image suivante"><svg class="lucide lucide-chevron-right" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button><span>${visuals.length} ${kind}</span></div>` : ""}
    <div class="gallery-grid" data-gallery-scroll>${visuals.map(visual => `
      <figure class="gallery-item">
        ${visual.src.toLowerCase().split("?")[0].endsWith(".pdf")
          ? `<a class="pdf-visual-link" href="${escapeHtml(visual.src)}" target="_blank" rel="noopener">${visual.thumbnail ? `<img src="${escapeHtml(visual.thumbnail)}" alt="Première page de ${escapeHtml(visual.caption)}" loading="lazy">` : '<span class="pdf-thumb-fallback">PDF</span>'}<span>${escapeHtml(visual.caption)}</span><em>Consulter le PDF&nbsp;${externalLinkIcon}</em></a>`
          : `<button type="button" data-lightbox-src="${escapeHtml(visual.src)}" data-lightbox-alt="${escapeHtml(mediaAlt(project, visual))}" data-lightbox-caption="${escapeHtml(visual.caption)}" data-lightbox-credit="${escapeHtml(visual.credit || "")}" data-lightbox-source-url="${escapeHtml(visual.sourceUrl || "")}" data-lightbox-source-label="${escapeHtml(visual.sourceLabel || "")}">${imageMarkup(project, visual)}<span>${escapeHtml(({PLAN_SITUATION: "Plan de situation", PLAN_MASSE: "Plan de masse"})[visual.role] || visual.role.replaceAll("_", " ").toLowerCase())}</span></button>`}
        <figcaption><strong>${escapeHtml(visual.caption)}</strong>${visual.originProjectName ? `<small>Rattaché depuis ${escapeHtml(visual.originProjectName)}</small>` : ""}${mediaCredit(visual)}</figcaption>
      </figure>`).join("")}</div>
    </div>
  </section>`;
  const gallerySection = [
    mediaGroup("Photos et perspectives", "visuels", gallery.filter(item => ["GALERIE", "HERO"].includes(item.role))),
    mediaGroup("Photos de chantier", "photos", gallery.filter(item => item.role === "PHOTO_CHANTIER")),
    mediaGroup("Contexte et versions anciennes", "visuels", gallery.filter(item => ["CONTEXTE", "HISTORIQUE"].includes(item.role))),
    mediaGroup("Documents graphiques", "documents", gallery.filter(item => item.role === "DOCUMENT")),
    mediaGroup("Plans de situation et de masse", "plans", gallery.filter(item => ["PLAN_SITUATION", "PLAN_MASSE"].includes(item.role))),
  ].join("");

  const documentsSection = project.documents.length ? `<section class="detail-section documents-section">
    <div class="detail-heading"><p class="eyebrow">Pour aller plus loin</p><h2>Documents utiles</h2></div>
    <div class="document-list">${project.documents.map((document, index) => document.isPdf ? `
      <a class="pdf-document ${index >= 5 ? "is-extra-document" : ""}" href="${escapeHtml(safeLinkUrl(document.url))}" target="_blank" rel="noopener">${document.thumbnail ? `<img class="pdf-document-thumb" src="${escapeHtml(document.thumbnail)}" alt="Première page de ${escapeHtml(document.title)}" loading="lazy">` : '<span class="pdf-document-thumb pdf-thumb-fallback">PDF</span>'}<span class="pdf-document-info"><small>${escapeHtml(document.type || "PDF")}${document.date ? ` · ${escapeHtml(formatDate(document.date))}` : ""}${document.originProjectName ? ` · Dossier ${escapeHtml(document.originProjectName)}` : ""}</small><strong>${escapeHtml(document.title)}</strong><em>Consulter le PDF&nbsp;${externalLinkIcon}</em></span></a>` : `
      <a class="${index >= 5 ? "is-extra-document" : ""}" href="${escapeHtml(safeLinkUrl(document.url))}" target="_blank" rel="noopener"><span>${escapeHtml(document.type || "Document")}${document.date ? ` · ${escapeHtml(formatDate(document.date))}` : ""}${document.originProjectName ? ` · Dossier ${escapeHtml(document.originProjectName)}` : ""}</span><strong>${escapeHtml(document.title)}</strong><i aria-hidden="true">${externalLinkIcon}</i></a>`).join("")}</div>
    ${project.documents.length > 5 ? `<button type="button" class="button source-more" data-doc-more>Voir les ${project.documents.length - 5} autres documents</button>` : ""}
  </section>` : "";

  const sourcesSection = project.sources.length || project.links.length ? `<section class="detail-section sources-section">
    <div class="detail-heading"><p class="eyebrow">Provenance</p><h2>Sources principales</h2></div>
    <div class="source-list">${project.sources.map((source, index) => `
      <a class="${index >= 5 ? "is-extra-source" : ""}" href="${escapeHtml(safeLinkUrl(source.url))}" target="_blank" rel="noopener"><span>${escapeHtml(source.organization)}${source.date ? ` · ${escapeHtml(formatDate(source.date))}` : ""}${source.originProjectName ? ` · Dossier ${escapeHtml(source.originProjectName)}` : ""}</span><strong>${escapeHtml(source.title)}</strong><i aria-hidden="true">${externalLinkIcon}</i></a>`).join("")}
      ${project.links.map(link => `<a href="${escapeHtml(safeLinkUrl(link.url))}" target="_blank" rel="noopener"><span>${escapeHtml(link.type)}</span><strong>${escapeHtml(link.label)}</strong><i aria-hidden="true">${externalLinkIcon}</i></a>`).join("")}</div>
    ${project.sources.length > 5 ? `<button type="button" class="button source-more" data-source-more>Voir les ${project.sources.length - 5} autres sources</button>` : ""}
  </section>` : "";
  const relatedCard = related => {
    const target = projectsById.get(related.id);
    const thumb = target && cardVisual(target);
    return `<a class="related-card" href="${projectHref(related.id)}" data-project-link="${escapeHtml(related.id)}">${thumb ? `<img src="${escapeHtml(thumb.displaySrc || thumb.src)}" alt="" loading="lazy">` : '<span class="related-thumb-placeholder" aria-hidden="true">↗</span>'}<span class="related-card-copy"><small>${escapeHtml(related.relation)}</small><strong>${escapeHtml(related.name)}</strong><em>Découvrir la fiche <span aria-hidden="true">→</span></em></span></a>`;
  };
  const componentsSection = project.relatedProjects?.length ? `<section class="detail-section components-section">
    <div class="detail-heading"><p class="eyebrow">Pour explorer les projets</p><h2>Opérations liées</h2></div>
    ${project.projectType === "ENSEMBLE"
      ? `<div class="related-groups">${groupTerritoryRelations(project, projectsById).map(([label, related]) => `<details class="related-group"><summary>${escapeHtml(label)} <span>${related.length}</span></summary><div class="component-list">${related.map(relatedCard).join("")}</div></details>`).join("")}</div>`
      : `<div class="component-list">${project.relatedProjects.map(relatedCard).join("")}</div>`}
  </section>` : "";

  return `<header class="project-header ${hero ? "has-media" : "no-media"}">
    <div class="project-header-media">${imageMarkup(project, hero)}</div>
    <div class="project-header-shade"></div>
    <button class="back-link" type="button" data-back>← Retour</button>
    <div class="project-header-content">
      <div class="project-kicker"><span>${escapeHtml(projectTerritoryLabel(project))}</span><span>${escapeHtml(project.category)}</span></div>
      ${statusBadge(project)}
      <h1 class="view-title" data-page-heading>${escapeHtml(project.name)}</h1>
      ${mainDate ? `<p class="project-main-date">${escapeHtml(formatEmbeddedDates(mainDate))}</p>` : ""}
    </div>
    ${hero ? `<div class="project-hero-credit">${escapeHtml(hero.caption)} · ${mediaCredit(hero)}</div>` : ""}
  </header>
  <div class="project-body">
    <section class="project-summary">
      <div>
        ${readinessNote(project)}
        <h2>Le projet</h2>${descriptionParagraphs(formatEmbeddedDates(project.description))}
      </div>
      <aside class="project-at-glance">
        <div><span>Statut</span><strong>${escapeHtml(projectStatusLabel(project))}</strong></div>
        <div><span>Où</span><strong>${escapeHtml(locationText || "Secteur à préciser")}</strong><small>${escapeHtml(locationQualifier)}</small></div>
        ${hasCentralUncertainty(project) ? '<div><span>À préciser</span><strong>Le statut du projet reste à vérifier</strong></div>' : ""}
      </aside>
    </section>
    ${figures ? `<section class="key-figures" aria-label="Chiffres clés">${figures}</section>` : ""}
    ${timeline ? `<section class="detail-section timeline-section"><div class="detail-heading"><p class="eyebrow">Calendrier</p><h2>Les grandes étapes</h2></div><ol>${timeline}</ol></section>` : ""}
    ${gallerySection}
    ${actors ? `<section class="detail-section actors-section"><div class="detail-heading"><p class="eyebrow">Équipe</p><h2>Qui porte le projet ?</h2></div><div class="actor-list">${actors}</div></section>` : ""}
    ${documentsSection}
    ${sourcesSection}
    ${componentsSection}
    <section class="community-cta"><div><p class="eyebrow">OBSERVATOIRE CITOYEN ET INDÉPENDANT</p><h2>Une information à compléter ou un contenu à signaler ?</h2><p>Une précision sur un projet, une erreur à corriger, une source ou une photographie à proposer, ou une demande de retrait ? Vos contributions et signalements sont les bienvenus.</p></div><button class="button button-primary" type="button" data-route="contribute" data-contribution-project="${escapeHtml(project.id)}">Contribuer ou signaler</button></section>
  </div>`;
}


export function renderConfidenceCards() {
  return Object.entries(CONFIDENCE_HELP).map(([level, description]) => `<article><strong>${escapeHtml(level)}</strong><p>${escapeHtml(description)}</p></article>`).join("");
}
