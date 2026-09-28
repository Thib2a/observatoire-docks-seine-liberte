// Keep the active view's title as the only H1, without changing its styling.
export function syncPageHeading(root, activeView) {
  for (const heading of root.querySelectorAll("[data-page-heading]")) {
    const tag = heading.closest("[data-view]")?.dataset.view === activeView ? "H1" : "H2";
    if (heading.tagName === tag) continue;
    const replacement = root.createElement(tag.toLowerCase());
    for (const attribute of heading.attributes) replacement.setAttribute(attribute.name, attribute.value);
    replacement.append(...heading.childNodes);
    heading.replaceWith(replacement);
  }
}
