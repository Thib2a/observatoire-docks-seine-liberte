export function resolveRoute(pathname, hash, redirects = {}, currentIds = []) {
  const decodeRoutePart = value => {
    try { return decodeURIComponent(value); }
    catch { return null; }
  };
  const fragment = hash.replace(/^#\/?/, "");
  const value = (!fragment || fragment === "main-content")
    ? (/^\/carte\/?$/.test(pathname) ? "explorer" : "accueil") : fragment;
  if (value.startsWith("fiche/")) {
    const id = decodeRoutePart(value.slice(6));
    if (id === null) return {route: "home"};
    return {route: "project", id: currentIds.includes(id) ? id : (redirects[id] || id)};
  }
  if (value.startsWith("projet/")) {
    const id = decodeRoutePart(value.slice(7));
    if (id === null) return {route: "home"};
    return {route: "project", id: redirects[id] || id};
  }
  if (value.startsWith("territoire/")) {
    const territory = decodeRoutePart(value.slice(11));
    return territory === null ? {route: "home"} : {route: "territory", territory};
  }
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

export function routeHref(route, payload = {}, pathname = "/") {
  if (route === "explore") return "/carte/";
  const hash = route === "territory"
    ? `#territoire/${encodeURIComponent(payload.territory)}`
    : route === "project"
      ? `#fiche/${encodeURIComponent(payload.id)}`
      : ({home: "#accueil", updates: "#evolutions", timeline: "#chronologie", method: "#a-propos", contribute: "#contribuer", legal: "#mentions-legales", privacy: "#confidentialite", credits: "#credits"}[route] || "#accueil");
  return /^\/carte\/?$/.test(pathname) ? `/${hash}` : hash;
}
