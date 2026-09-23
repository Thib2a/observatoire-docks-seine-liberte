import {
  CONFIDENCE_HELP, MILESTONE_LABELS, READINESS_LABELS, ROLE_LABELS,
  escapeHtml, formatDate, formatEmbeddedDates, formatTemporal, mediaAlt, projectHref, projectStatusLabel, statusBadge,
} from "./data.js";


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


export function cardVisual(project) {
  return project.visuals.find(visual => ["HERO", "GALERIE"].includes(visual.role) && !visual.src.includes("_ARCHIVES_TECHNIQUES/APERÇUS_PDF")) || null;
}

function imageMarkup(project, visual, className = "") {
  if (!visual) return `<div class="media-placeholder ${className}"><span>Aucun visuel disponible</span></div>`;
  return `<img class="${className}" src="${escapeHtml(visual.src)}" alt="${escapeHtml(mediaAlt(project, visual))}" loading="lazy" decoding="async">`;
}


function mediaCredit(visual) {
  if (!visual) return "";
  const credit = visual.credit || "Crédit non précisé";
  const sourceLabel = visual.sourceLabel && visual.sourceLabel !== credit ? visual.sourceLabel : "Source";
  const source = visual.sourceUrl
    ? `<a href="${escapeHtml(visual.sourceUrl)}" target="_blank" rel="noopener">${escapeHtml(sourceLabel)}</a>`
    : (visual.sourceLabel && visual.sourceLabel !== credit ? escapeHtml(visual.sourceLabel) : "");
  return `<span>${escapeHtml(credit)}${source ? ` · ${source}` : ""}</span>`;
}


export function projectCard(project, options = {}) {
  const visual = cardVisual(project);
  const compact = options.compact ? " is-compact" : "";
  return `<a class="project-card${compact}" href="${projectHref(project.id)}" data-project-link="${escapeHtml(project.id)}">
    <div class="project-card-media">
      ${imageMarkup(project, visual)}
      <span class="card-territory">${escapeHtml(project.territory)}</span>
      ${hasCentralUncertainty(project) ? '<span class="card-progress">Statut à confirmer</span>' : ""}
    </div>
    <div class="project-card-body">
      ${statusBadge(project)}
      <h3>${escapeHtml(project.name)}</h3>
      <p>${escapeHtml(formatEmbeddedDates(project.description))}</p>
      <div class="card-meta"><span>${escapeHtml(project.lot ? `Lot ${project.lot}` : project.category)}</span><span>${escapeHtml(formatEmbeddedDates(project.dateText || publicLocation(project)))}</span></div>
    </div>
  </a>`;
}


export function updateRow(update) {
  return `<article class="update-item">
    <time datetime="${escapeHtml(update.date)}">${escapeHtml(formatTemporal(update.date, update.datePrecision || "JOUR"))}<small>${escapeHtml(update.dateContext || "Date documentée")}</small></time>
    <span class="update-kind">${escapeHtml(update.title)}</span>
    <strong>${update.projectId ? `<a href="${projectHref(update.projectId)}" data-project-link="${escapeHtml(update.projectId)}">${escapeHtml(update.projectName)}</a>` : escapeHtml(update.projectName)}</strong>
    <p>${escapeHtml(update.detail)}</p>
    ${update.sourceUrl ? `<a class="update-source" href="${escapeHtml(update.sourceUrl)}" target="_blank" rel="noopener"${update.sourceDescription ? ` aria-label="${escapeHtml(update.sourceDescription)}" title="${escapeHtml(update.sourceDescription)}"` : ""}>${escapeHtml(update.sourceLabel || "Source")} ↗</a>` : '<span aria-hidden="true">↗</span>'}
  </article>`;
}


export function timelineEvent(event, projectsById) {
  const related = (event.projectIds || []).map(id => projectsById.get(id)).filter(Boolean);
  return `<article class="history-event" id="timeline-${escapeHtml(event.id)}">
    <time datetime="${escapeHtml(event.date)}">${escapeHtml(formatTemporal(event.date, event.precision, event.dateLabel))}</time>
    <div><p class="eyebrow">${escapeHtml(event.territory)} · ${escapeHtml(event.kind.replaceAll("_", " "))}</p>
      <h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(event.summary)}</p>
      ${related.length ? `<div class="event-projects">${related.map(project => `<a href="${projectHref(project.id)}" data-project-link="${escapeHtml(project.id)}">${escapeHtml(project.name)}</a>`).join("")}</div>` : ""}
      ${event.sourceUrl ? `<a class="text-link" href="${escapeHtml(event.sourceUrl)}" target="_blank" rel="noopener">Consulter la source ↗</a>` : ""}
    </div>
  </article>`;
}


function territoryOverview(isSeine, items, territory, presentation = {}, presentationMedia = {}) {
  const ensemble = items.find(project => project.projectType === "ENSEMBLE");
  const chosen = isSeine ? presentation.seinePlans : (presentation.docksPlans || [presentation.docksPlan]);
  const plans = (chosen || []).map(key => presentationMedia[key]).filter(Boolean);
  const fallback = ensemble?.visuals.find(visual => visual.role === "PLAN_MASSE" || visual.role === "PLAN_SITUATION");
  if (!plans.length && fallback) plans.push(fallback);
  const sourceUrl = isSeine
    ? "https://www.ville-clichy.fr/170-les-projets-clichy.htm"
    : "https://www.docks-saintouen.fr/explorer-les-cartes-interactives/programmation-les-docks-de-saint-ouen/";
  const content = isSeine
    ? `<p>La ZAC Seine-Liberté prévoit la transformation d'anciens terrains d'activité en un nouveau quartier associant logements, équipements publics, espaces verts, nouvelles rues et berges aménagées.</p><p>Les plans d'ensemble permettent de comprendre son organisation, de situer les différents lots et de suivre la réalisation progressive des aménagements.</p>`
    : `<p>Les Docks réunissent plusieurs secteurs aux caractéristiques et aux stades d'aménagement différents. Certains sont déjà livrés et habités, tandis que d'autres accueillent de nouveaux chantiers ou des projets encore à l'étude.</p><p>Les plans d'ensemble permettent de comprendre l'organisation du quartier, de situer les différentes opérations et de découvrir les aménagements à venir.</p>`;
  return `<section class="reference-plan territory-overview" aria-labelledby="overview-title">
    <div><p class="eyebrow">Vue d’ensemble</p><h2 id="overview-title">${isSeine ? "Découvrir le futur quartier Seine-Liberté" : "Découvrir les Docks et leurs différents secteurs"}</h2>${content}<a class="overview-source" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">${isSeine ? "Découvrir les projets urbains de Clichy" : "Consulter la carte officielle des Docks"} ↗</a></div>
    <div class="overview-visual">${plans.length ? `<button class="plan-preview" type="button" data-lightbox-src="${escapeHtml(plans[0].src)}" data-lightbox-alt="Plan d’ensemble de ${escapeHtml(territory)}" data-lightbox-caption="${escapeHtml(plans[0].caption || "Plan d’ensemble")}"><img src="${escapeHtml(plans[0].src)}" alt="Plan d’ensemble de ${escapeHtml(territory)}" loading="lazy"><span>Agrandir le plan d’ensemble</span></button>${plans.length > 1 ? `<div class="plan-pager"><button type="button" data-plan-step="-1">← Précédent</button><span data-plan-count>1 / ${plans.length}</span><button type="button" data-plan-step="1">Suivant →</button></div>` : ""}` : `<div class="overview-map">Plan d’ensemble à sélectionner</div>`}<a class="overview-source" href="#explorer">Voir les projets sur la carte interactive →</a></div>
  </section>`;
}


export function renderTerritory(territory, projects, presentation = {}, presentationMedia = {}) {
  const items = projects.filter(project => project.territory === territory);
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
  const isSeine = territory === "Seine-Liberté";
  const contextProject = isSeine ? items.find(project => project.projectType === "ENSEMBLE") : null;
  const contextVisual = contextProject?.visuals.find(item => item.role === "GALERIE" && item.caption.includes("Perspective urbaine Seine-Liberté"));
  const intro = isSeine
    ? "À Clichy, en bord de Seine et dans le prolongement des Docks de Saint-Ouen, Seine-Liberté prend progressivement forme. Logements, équipements publics, espaces verts, nouvelles rues et berges aménagées composeront ce nouveau quartier, dont les différentes opérations avancent à leur rythme."
    : "Ancien territoire industriel devenu un quartier de vie, les Docks de Saint-Ouen poursuivent leur transformation. Entre secteurs déjà habités, nouveaux programmes immobiliers, équipements et espaces publics, découvrez les projets qui façonnent le quartier d'aujourd'hui et de demain.";
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
      <h1>${escapeHtml(territory)}</h1>
      <p>${escapeHtml(intro)}</p>
      <button class="button button-light" type="button" data-explore-territory="${escapeHtml(territory)}">Voir sur la carte</button>
      <dl><div><dt>${operations.length}</dt><dd>Opérations suivies</dd></div><div><dt>${current.length}</dt><dd>En cours / à venir</dd></div><div><dt>${delivered.length}</dt><dd>Opérations livrées</dd></div></dl>
    </div>
    ${isSeine ? (contextVisual ? `<div class="territory-hero-caption">Vue de contexte du site, non rendu du projet final · ${mediaCredit(contextVisual)}</div>` : "") : (visual ? `<div class="territory-hero-caption">${escapeHtml(visual.caption)} · ${mediaCredit(visual)}</div>` : "")}
  </header>
  <div class="territory-body">
    ${territoryOverview(isSeine, items, territory, presentation, presentationMedia)}
    ${projectStrip("Chantiers et projets à suivre", "Aujourd’hui et demain", current)}
    ${projectStrip("Espaces publics et équipements", "Le cadre de vie", publicSpaces)}
    ${projectStrip("Quartier déjà réalisé", "Mémoire récente", delivered)}
  </div>`;
}


function figureItems(project) {
  const labels = {
    housing: "logements", socialHousing: "logements sociaux", rooms: "chambres",
    capacity: "places", surface: "surface", shops: "commerces", facilities: "équipements", budget: "budget",
  };
  return Object.entries(project.figures)
    .filter(([key, value]) => value && !(key === "housing" && value === project.figures.socialHousing))
    .map(([key, value]) => {
      const label = labels[key] || key;
      const alreadyLabeled = /[a-zà-ÿ]/i.test(String(value).replace(/m²|m2|\bSDP\b/gi, ""));
      return `<div><strong>${escapeHtml(value)}</strong>${alreadyLabeled ? "" : `<span>${escapeHtml(label)}</span>`}</div>`;
    })
    .join("");
}


function actorItems(project) {
  const majorRoles = ["AMENAGEUR", "PROMOTEUR", "MAITRE_OUVRAGE", "ARCHITECTE", "PAYSAGISTE", "BAILLEUR", "EXPLOITANT", "COLLECTIVITE"];
  return project.actors.filter(actor => majorRoles.includes(actor.role)).slice(0, 8).map(actor => `
    <div class="actor-row"><span>${escapeHtml(ROLE_LABELS[actor.role] || actor.role)}</span><strong>${escapeHtml(actor.name)}</strong>${actor.detail ? `<small>${escapeHtml(actor.detail)}</small>` : ""}</div>`).join("");
}


function timelineItems(project) {
  return project.milestones.map(item => `
    <li class="timeline-item ${item.nature === "ACTUEL" ? "is-current" : ""}">
      <span></span><div><small>${escapeHtml(item.permitLabel || MILESTONE_LABELS[item.type] || "Étape")}</small><strong>${escapeHtml(formatTemporal(item.date, item.precision, item.label))}</strong>${item.permitReferences?.length ? `<small>${escapeHtml([item.permitContext, item.permitReferences.join(" · ")].filter(Boolean).join(" : "))}</small>` : ""}${(item.permitSources || []).map(source => `<a class="permit-source" href="${escapeHtml(source.url)}" target="_blank" rel="noopener" aria-label="${escapeHtml(source.label)}, source complémentaire pour ${escapeHtml(source.reference)}" title="${escapeHtml(source.label)}, source complémentaire">${escapeHtml(source.label)}${item.permitSources.length > 1 ? ` ${escapeHtml(source.reference)}` : ""} ↗</a>`).join("")}${item.nature === "ACTUEL" ? "<em>Référence actuelle</em>" : ""}</div>
    </li>`).join("");
}


export function renderProject(project) {
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
  const locationText = publicLocation(project);
  const locationQualifier = "Emplacement vérifié";
  const mediaGroup = (title, kind, visuals) => !visuals.length ? "" : `<section class="detail-section gallery-section" data-progressive-gallery>
    <div class="detail-heading"><p class="eyebrow">Images et documents graphiques</p><h2>${title}</h2></div>
    <div class="gallery-grid">${visuals.map((visual, index) => `
      <figure class="gallery-item ${index === 0 ? "is-wide" : ""}">
        ${visual.src.toLowerCase().split("?")[0].endsWith(".pdf")
          ? `<a class="pdf-visual-link" href="${escapeHtml(visual.src)}" target="_blank" rel="noopener">${visual.thumbnail ? `<img src="${escapeHtml(visual.thumbnail)}" alt="Première page de ${escapeHtml(visual.caption)}" loading="lazy">` : '<span class="pdf-thumb-fallback">PDF</span>'}<span>${escapeHtml(visual.caption)}</span><em>Consulter le PDF ↗</em></a>`
          : `<button type="button" data-lightbox-src="${escapeHtml(visual.src)}" data-lightbox-alt="${escapeHtml(mediaAlt(project, visual))}" data-lightbox-caption="${escapeHtml(visual.caption)}">${imageMarkup(project, visual)}<span>${escapeHtml(({PLAN_SITUATION: "Plan de situation", PLAN_MASSE: "Plan de masse"})[visual.role] || visual.role.replaceAll("_", " ").toLowerCase())}</span></button>`}
        <figcaption><strong>${escapeHtml(visual.caption)}</strong>${visual.originProjectName ? `<small>Rattaché depuis ${escapeHtml(visual.originProjectName)}</small>` : ""}${mediaCredit(visual)}</figcaption>
      </figure>`).join("")}</div>
    ${visuals.length > 8 ? `<button class="button gallery-more" type="button" data-gallery-more>Voir tous les ${kind} (${visuals.length})</button>` : ""}
  </section>`;
  const gallerySection = [
    mediaGroup("Photos et perspectives", "visuels", gallery.filter(item => ["GALERIE", "HERO"].includes(item.role))),
    mediaGroup("Plans de situation et de masse", "plans", gallery.filter(item => ["PLAN_SITUATION", "PLAN_MASSE"].includes(item.role))),
    mediaGroup("Documents graphiques", "documents", gallery.filter(item => item.role === "DOCUMENT")),
    mediaGroup("Images de contexte et versions anciennes", "visuels", gallery.filter(item => ["CONTEXTE", "HISTORIQUE"].includes(item.role))),
  ].join("");

  const documentsSection = project.documents.length ? `<section class="detail-section documents-section">
    <div class="detail-heading"><p class="eyebrow">Pour aller plus loin</p><h2>Documents utiles</h2></div>
    <div class="document-list">${project.documents.map((document, index) => document.isPdf ? `
      <a class="pdf-document ${index >= 5 ? "is-extra-document" : ""}" href="${escapeHtml(document.url)}" target="_blank" rel="noopener">${document.thumbnail ? `<img class="pdf-document-thumb" src="${escapeHtml(document.thumbnail)}" alt="Première page de ${escapeHtml(document.title)}" loading="lazy">` : '<span class="pdf-document-thumb pdf-thumb-fallback">PDF</span>'}<span class="pdf-document-info"><small>${escapeHtml(document.type || "PDF")}${document.date ? ` · ${escapeHtml(formatDate(document.date))}` : ""}${document.originProjectName ? ` · Dossier ${escapeHtml(document.originProjectName)}` : ""}</small><strong>${escapeHtml(document.title)}</strong><em>Consulter le PDF ↗</em></span></a>` : `
      <a class="${index >= 5 ? "is-extra-document" : ""}" href="${escapeHtml(document.url)}" target="_blank" rel="noopener"><span>${escapeHtml(document.type || "Document")}${document.date ? ` · ${escapeHtml(formatDate(document.date))}` : ""}${document.originProjectName ? ` · Dossier ${escapeHtml(document.originProjectName)}` : ""}</span><strong>${escapeHtml(document.title)}</strong><i aria-hidden="true">↗</i></a>`).join("")}</div>
    ${project.documents.length > 5 ? `<button type="button" class="button source-more" data-doc-more>Voir les ${project.documents.length - 5} autres documents</button>` : ""}
  </section>` : "";

  const sourcesSection = project.sources.length || project.links.length ? `<section class="detail-section sources-section">
    <div class="detail-heading"><p class="eyebrow">Provenance</p><h2>Sources principales</h2></div>
    <div class="source-list">${project.sources.map((source, index) => `
      <a class="${index >= 5 ? "is-extra-source" : ""}" href="${escapeHtml(source.url)}" target="_blank" rel="noopener"><span>${escapeHtml(source.organization)}${source.date ? ` · ${escapeHtml(formatDate(source.date))}` : ""}${source.originProjectName ? ` · Dossier ${escapeHtml(source.originProjectName)}` : ""}</span><strong>${escapeHtml(source.title)}</strong><i aria-hidden="true">↗</i></a>`).join("")}
      ${project.links.map(link => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener"><span>${escapeHtml(link.type)}</span><strong>${escapeHtml(link.label)}</strong><i aria-hidden="true">↗</i></a>`).join("")}</div>
    ${project.sources.length > 5 ? `<button type="button" class="button source-more" data-source-more>Voir les ${project.sources.length - 5} autres sources</button>` : ""}
  </section>` : "";
  const componentsSection = project.relatedProjects?.length ? `<section class="detail-section components-section">
    <div class="detail-heading"><p class="eyebrow">Pour comprendre ce projet</p><h2>Éléments liés</h2></div>
    <div class="component-list">${project.relatedProjects.map(related => `<article><small>${escapeHtml(related.relation)}</small><strong><a href="${projectHref(related.id)}" data-project-link="${escapeHtml(related.id)}">${escapeHtml(related.name)} ↗</a></strong></article>`).join("")}</div>
  </section>` : "";

  return `<header class="project-header ${hero ? "has-media" : "no-media"}">
    <div class="project-header-media">${imageMarkup(project, hero)}</div>
    <div class="project-header-shade"></div>
    <div class="project-header-content">
      <button class="back-link" type="button" data-back>← Retour</button>
      <div class="project-kicker"><span>${escapeHtml(project.territory)}</span>${project.lot ? `<span>Lot ${escapeHtml(project.lot)}</span>` : ""}<span>${escapeHtml(project.category)}</span></div>
      ${statusBadge(project)}
      <h1>${escapeHtml(project.name)}</h1>
      ${project.dateText ? `<p class="project-main-date">${escapeHtml(formatEmbeddedDates(project.dateText))}</p>` : ""}
    </div>
    ${hero ? `<div class="project-hero-credit">${escapeHtml(hero.caption)} · ${mediaCredit(hero)}</div>` : ""}
  </header>
  <div class="project-body">
    <section class="project-summary">
      <div>
        ${readinessNote(project)}
        <h2>Le projet</h2><p class="project-description">${escapeHtml(formatEmbeddedDates(project.description))}</p>
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
    <section class="community-cta"><div><p class="eyebrow">OBSERVATOIRE CITOYEN ET INDÉPENDANT</p><h2>Une information à compléter ou un contenu à signaler ?</h2><p>Vous avez repéré une erreur, souhaitez proposer une information ou demander la correction ou le retrait d'un contenu ? Utilisez le formulaire de signalement.</p></div><button class="button button-primary" type="button" data-route="contribute" data-contribution-project="${escapeHtml(project.id)}">Faire un signalement</button></section>
  </div>`;
}


export function renderConfidenceCards() {
  return Object.entries(CONFIDENCE_HELP).map(([level, description]) => `<article><strong>${escapeHtml(level)}</strong><p>${escapeHtml(description)}</p></article>`).join("");
}
