export const DATA_URL = "./data/app-data.json";

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
  "PROGRAMMÉ": "#3478c8",
  "EN ÉTUDES": "#7861a8",
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
  LIVRAISON_PREVUE: "Livraison prévue",
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

export const normalize = (value = "") => String(value)
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9]+/g, " ").trim();

export const statusLabel = status => STATUS_LABELS[status] || status;
export const statusColor = status => STATUS_COLORS[status] || STATUS_COLORS["STATUT INCONNU"];
export const statusSymbol = status => STATUS_SYMBOLS[status] || STATUS_SYMBOLS["STATUT INCONNU"];

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
  if (precision === "ANNEE") return (safeValue.match(/^\d{4}/) || safeLabel.match(/\b(?:19|20)\d{2}\b/) || [safeLabel])[0];
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

export function searchText(project) {
  return normalize([
    project.name, project.officialName, project.lot, project.category, project.subcategory,
    project.territory, project.zone, project.sector, project.commune, ...project.aliases,
  ].join(" "));
}

export function projectHref(projectId) {
  return `#projet/${encodeURIComponent(projectId)}`;
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
  return response.json();
}
