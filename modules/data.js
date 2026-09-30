export const DATA_URL = "./data/app-data.json";

export function mediaCreditLabel(value) {
  const credit = String(value || "").trim();
  return normalizeAttribution(credit || "Non précisé");
}

export function normalizeAttribution(value) {
  return String(value || "").replace(/(\s(?:\/|--|—|–|-)\s+)([a-zà-ÿ]\S*)/g,
    (whole, separator, label) => {
      if (label.includes(".") || label.includes("-") || /^n[°º]/i.test(label)) return whole;
      return separator + label[0].toLocaleUpperCase("fr-FR") + label.slice(1);
    });
}

function attributionKey(value) {
  return String(value || "").toLocaleLowerCase("fr-FR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/\bet\b/g, "&")
    .replace(/[^a-z0-9&]/g, "");
}

export function mediaAttribution(visual) {
  const credit = normalizeAttribution(visual?.credit || visual?.sourceLabel || "Non précisé");
  const source = sourceName(visual?.sourceUrl, visual?.sourceLabel);
  const repeated = attributionKey(credit).includes(attributionKey(source));
  return mediaCreditLabel(credit + (visual?.sourceUrl && source && !repeated ? ` · ${source}` : ""));
}

export const STATUS_ORDER = [
  "EN CHANTIER", "TRAVAUX PRÉPARATOIRES", "PROGRAMMÉ", "EN ÉTUDES",
  "SUSPENDU / RETARDÉ", "LIVRÉ / TERMINÉ", "ABANDONNÉ", "STATUT INCONNU",
];

export const STATUS_LABELS = {
  "LIVRÉ / TERMINÉ": "Livré / terminé",
  "EN CHANTIER": "En chantier",
  "TRAVAUX PRÉPARATOIRES": "Travaux préparatoires",
  "PROGRAMMÉ": "Programmé",
  "EN ÉTUDES": "En études",
  "SUSPENDU / RETARDÉ": "Suspendu / retardé",
  "ABANDONNÉ": "Abandonné",
  "STATUT INCONNU": "Statut à préciser",
};

export const STATUS_COLORS = {
  "LIVRÉ / TERMINÉ": "#237a63",
  "EN CHANTIER": "#e0643a",
  "TRAVAUX PRÉPARATOIRES": "#c28a12",
  "PROGRAMMÉ": "#1565b0",
  "EN ÉTUDES": "#a32679",
  "SUSPENDU / RETARDÉ": "#a94452",
  "ABANDONNÉ": "#555d5a",
  "STATUT INCONNU": "#98a09c",
};

export const STATUS_SYMBOLS = {
  "LIVRÉ / TERMINÉ": "✓",
  "EN CHANTIER": "●",
  "TRAVAUX PRÉPARATOIRES": "◐",
  "PROGRAMMÉ": "○",
  "EN ÉTUDES": "◇",
  "SUSPENDU / RETARDÉ": "!",
  "ABANDONNÉ": "×",
  "STATUT INCONNU": "?",
};

export const MILESTONE_LABELS = {
  ETUDE: "Étude",
  PERMIS_DEPOT: "Permis déposé",
  PERMIS_ACCORDE: "Permis accordé",
  DEMOLITION: "Démolition",
  DEPOLLUTION: "Dépollution",
  DOC: "Début déclaré",
  DEBUT_TRAVAUX: "Début des travaux",
  COMMERCIALISATION: "Commercialisation",
  LIVRAISON_PREVUE: "Livraison annoncée",
  LIVRAISON_REELLE: "Livraison réalisée",
  OUVERTURE: "Ouverture",
  DAACT: "Achèvement déclaré",
  AUTRE: "Étape documentée",
};

export const ROLE_LABELS = {
  AMENAGEUR: "Aménageur",
  PROMOTEUR: "Promoteur",
  MAITRE_OUVRAGE: "Maîtrise d’ouvrage",
  ARCHITECTE: "Architecture",
  PAYSAGISTE: "Paysage",
  ENTREPRISE: "Entreprise",
  BAILLEUR: "Bailleur",
  EXPLOITANT: "Exploitant",
  COLLECTIVITE: "Collectivité",
  AUTRE: "Autre rôle",
};

export const READINESS_LABELS = {
  PRET: "Fiche documentée",
  PRET_MINIMAL: "L’essentiel disponible",
  A_COMPLETER: "Certaines caractéristiques restent à préciser.",
  NON_PRET: "Repère minimal",
};

export const CONFIDENCE_HELP = {
  "CONFIRMÉ": "Une source officielle ou primaire soutient directement l’information.",
  "PROBABLE": "Les éléments concordent, mais la preuve disponible reste partielle.",
  "À SURVEILLER": "L’information est ancienne ou encore susceptible d’évoluer.",
  "NON CONFIRMÉ": "La piste demande une confirmation avant d’être affirmée.",
};

export const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[char]));

export function safeLinkUrl(value = "") {
  const url = String(value).trim();
  if (!url || /[\\\u0000-\u0020\u007f]/.test(url) || url.startsWith("//")) return "";
  try {
    const parsed = new URL(url, "https://observatoire-docks-seine.org/");
    if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) return "";
    if (!/^(https?:\/\/|\/(?!\/)|#|assets\/|media\/)/i.test(url)) return "";
    return url;
  } catch { return ""; }
}

export function projectTerritoryLabel(project) {
  return documentaryGroup(project) === "Abords" ? "Abords" : project.territory;
}

export function sanitizePublicLinks(value) {
  if (Array.isArray(value)) value.forEach(sanitizePublicLinks);
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      if (/(?:Url|url)$/.test(key) && typeof child === "string") value[key] = safeLinkUrl(child);
      else sanitizePublicLinks(child);
    }
  }
  return value;
}

export const normalize = (value = "") => String(value)
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();

export const statusLabel = status => STATUS_LABELS[status] || status;
export const statusColor = status => STATUS_COLORS[status] || STATUS_COLORS["STATUT INCONNU"];
export const statusSymbol = status => status === "PROGRAMMÉ"
  ? '<span class="status-ring"></span>'
  : STATUS_SYMBOLS[status] || STATUS_SYMBOLS["STATUT INCONNU"];

export const externalLinkIcon = '<svg class="external-link-icon lucide lucide-arrow-up-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7h10v10M7 17 17 7"/></svg>';

export function chevronIcon(direction) {
  const path = direction < 0 ? "m15 18-6-6 6-6" : "m9 18 6-6-6-6";
  return `<svg class="lucide" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
}

const sourceNames = new Map();

function sourceKey(value) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.href;
  } catch {
    return "";
  }
}

export function sourceName(url, label = "") {
  const name = String(label || "").trim();
  if (name && !/^(source|consulter la source)$/i.test(name)) return normalizeAttribution(name);
  const recorded = sourceNames.get(sourceKey(url));
  if (recorded) return normalizeAttribution(recorded);
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return "Source"; }
}

export function formatDate(value) {
  if (!value) return "Date à préciser";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    return new Intl.DateTimeFormat("fr-FR", {day: "numeric", month: "long", year: "numeric"})
      .format(new Date(`${value.slice(0, 10)}T12:00:00`));
  }
  if (/^\d{4}-\d{2}$/.test(value)) {
    return new Intl.DateTimeFormat("fr-FR", {month: "long", year: "numeric"})
      .format(new Date(`${value}-15T12:00:00`));
  }
  return value;
}

export function formatEmbeddedDates(value = "") {
  return String(value).replace(/\b(?:19|20)\d{2}-\d{2}-\d{2}\b/g, date => formatDate(date));
}

export function formatTemporal(value, precision = "JOUR", label = "") {
  const safeLabel = String(label || "").trim();
  const safeValue = String(value || "").trim();
  if (["TEXTE", "PERIODE", "HORIZON"].includes(precision)) {
    if (safeLabel) return safeLabel;
    return (safeValue.match(/^\d{4}/) || [safeValue || "Date à préciser"])[0];
  }
  if (precision === "ANNEE") {
    if (/(?<!\p{L})(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre|printemps|été|automne|hiver)(?!\p{L})/iu.test(safeLabel)) return safeLabel;
    return (safeValue.match(/^\d{4}/) || safeLabel.match(/\b(?:19|20)\d{2}\b/) || [safeLabel])[0];
  }
  if (precision === "TRIMESTRE") return safeLabel || safeValue;
  if (precision === "MOIS" && /^\d{4}-\d{2}/.test(safeValue)) return formatDate(safeValue.slice(0, 7));
  if (precision === "JOUR" && safeValue) return formatDate(safeValue);
  if (safeLabel && !/^\d{4}-\d{2}(?:-\d{2})?$/.test(safeLabel)) return safeLabel;
  return safeValue ? formatDate(safeValue) : (safeLabel || "Date à préciser");
}

export function projectStatusLabel(project) {
  if (!project.additive && project.status === "STATUT INCONNU") {
    return project.projectType === "VERSION" ? "Ancienne version" : "Repère cartographique";
  }
  return statusLabel(project.status);
}

export function responsiveImageAttrs(visual, sizes = "(max-width: 760px) 100vw, 720px") {
  const sources = visual?.responsiveSources || [];
  if (!sources.length) return "";
  return ` srcset="${escapeHtml(sources.map(item => `${item.src} ${item.width}w`).join(", "))}" sizes="${escapeHtml(sizes)}" width="${visual.width}" height="${visual.height}"`;
}

export function documentaryGroup(project) {
  return project.documentaryGroup || (project.id?.startsWith("abords-") ? "Abords" : groupValue(project.territory));
}

export function groupValue(value) {
  return value === "Docks de Saint-Ouen" ? "Docks" : value;
}

export function filterDocumentaryGroup(projects, value) {
  return value ? projects.filter(project => documentaryGroup(project) === groupValue(value)) : projects;
}

export function searchText(project) {
  const address = normalize(project.locationText || project.map?.address || "");
  const districtOnlyAddress = /^\d+[a-z]? (?:dhalenne|parc|ardoin|rer)/.test(address);
  return normalize([
    project.name, project.officialName, project.lot, project.category, project.subcategory,
    documentaryGroup(project), ...(project.secondaryTerritories || []), project.territory,
    project.commune, ...(project.aliases || []), districtOnlyAddress ? "" : address,
  ].join(" "));
}

export function matchesSearch(project, query) {
  const text = normalize(query);
  if (!text) return true;
  if (/^secteur\s+/.test(text)) {
    const target = text.replace(/^secteur\s+/, "");
    const sector = normalize(project.sector || "");
    return target.split(" ").every(word => sector.split(" ").some(value => value.startsWith(word)));
  }
  const words = searchText(project).split(" ");
  return text.split(" ").every(word => words.some(value => value.startsWith(word)));
}


let publicProjectSlugs = {};

export function projectHref(projectId) {
  return `/projets/${encodeURIComponent(publicProjectSlugs[projectId] || projectId)}/`;
}

export function statusBadge(project) {
  return `<span class="status-badge" style="--status:${statusColor(project.status)}"><i></i>${escapeHtml(projectStatusLabel(project))}</span>`;
}

export function mediaAlt(project, visual) {
  const kind = {
    HERO: "Vue principale", RENDU: "Rendu du projet", PHOTO_CHANTIER: "Vue du chantier",
    PHOTO_LIVRE: "Vue du projet livré", PLAN_MASSE: "Plan du projet", PLAN_SITUATION: "Plan de situation",
    SCHEMA: "Schéma", PHOTO_CONTEXTE: "Vue du contexte",
  }[visual.role] || "Illustration";
  return `${kind} — ${project.name}`;
}

export async function loadData() {
  const response = await fetch(DATA_URL, {cache: "no-store"});
  if (!response.ok) throw new Error(`Chargement impossible (${response.status})`);
  const payload = await response.json();
  sanitizePublicLinks(payload);
  sourceNames.clear();
  for (const project of payload.projects) {
    for (const source of project.sources) {
      const name = (source.organization || "").trim();
      const key = sourceKey(source.url);
      if (key && name && !/^source$/i.test(name) && !sourceNames.has(key)) sourceNames.set(key, name);
    }
  }
  publicProjectSlugs = payload.projectPublicSlugs || {};
  return payload;
}
