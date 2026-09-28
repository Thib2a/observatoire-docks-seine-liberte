const FIELDS = {search: "q", status: "statut", territory: "secteur", category: "categorie"};

export function readMapFilters(search, choices = {}) {
  const params = new URLSearchParams(search);
  return Object.fromEntries(Object.entries(FIELDS).map(([field, key]) => {
    let value = (params.get(key) || "").trim();
    if (field === "search") value = value.slice(0, 200);
    else if (choices[field] && !choices[field].includes(value)) value = "";
    return [field, value];
  }));
}

export function mapFilterHref(filters) {
  const params = new URLSearchParams();
  for (const [field, key] of Object.entries(FIELDS)) {
    const value = String(filters[field] || "").trim();
    if (value) params.set(key, value);
  }
  return "/carte/" + (params.size ? "?" + params.toString() : "");
}
