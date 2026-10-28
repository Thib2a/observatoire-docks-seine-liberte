import {projectionLayer, validCorners} from './projection.js?v=projection-1';

export function createProjectionControls(L, map, host) {
  const panel = document.createElement('details');
  panel.className = 'projection-controls';
  panel.id = 'projectionSettings';
  panel.hidden = true;
  panel.open = true;
  const summary = document.createElement('summary');
  summary.textContent = 'Plans de projet — calage indicatif';
  panel.append(summary);
  const body = document.createElement('div');
  panel.append(body);
  host.append(panel);
  L.DomEvent.disableClickPropagation(panel);
  L.DomEvent.disableScrollPropagation(panel);
  let active = false, loading = null;
  const layers = [];
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem('ods:projections:v1') || '{}') || {}; } catch { /* Storage may be disabled. */ }
  function remember() {
    try { sessionStorage.setItem('ods:projections:v1', JSON.stringify(Object.fromEntries(layers.map(row => [row.id, {visible: row.visible, opacity: row.opacity}])))); } catch { /* In-memory controls remain usable. */ }
  }
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  body.append(status);
  function sync() {
    for (const row of layers) {
      if (active && row.visible && !row.failed) { if (!map.hasLayer(row.layer)) row.layer.addTo(map); }
      else if (map.hasLayer(row.layer)) map.removeLayer(row.layer);
    }
  }
  async function load() {
    status.textContent = 'Chargement des projections…';
    try {
      const response = await fetch('/data/projections.json?v=projection-1', {cache: 'no-cache'});
      if (!response.ok) throw new Error();
      const manifest = await response.json();
      if (manifest.version !== 1 || !Array.isArray(manifest.layers)) throw new Error();
      let invalid = 0;
      const ids = new Set();
      for (const item of [...manifest.layers].sort((a,b) => (a?.order || 0) - (b?.order || 0))) {
        if (!item || !validCorners(item.corners) || typeof item.id !== 'string' || ids.has(item.id) || !Number.isFinite(item.opacity) || item.opacity < 0 || item.opacity > 1 || typeof item.image !== 'string' || !item.image.startsWith('/media/projections/') || item.image.includes('..')) { invalid++; continue; }
        ids.add(item.id);
        const previous = Object.hasOwn(saved, item.id) ? saved[item.id] : null;
        const opacity = Number.isFinite(previous?.opacity) && previous.opacity >= 0 && previous.opacity <= 1 ? previous.opacity : item.opacity;
        const row = {id: item.id, visible: typeof previous?.visible === 'boolean' ? previous.visible : true, opacity, failed: false};
        const field = document.createElement('fieldset');
        const label = document.createElement('label');
        const check = document.createElement('input');
        check.type = 'checkbox'; check.checked = row.visible;
        label.append(check, document.createTextNode(item.title || item.id));
        const opacityLabel = document.createElement('label');
        const range = document.createElement('input');
        range.type = 'range'; range.min = '0'; range.max = '100'; range.value = String(Math.round(opacity*100));
        const output = document.createElement('output');
        output.textContent = `${range.value} %`;
        opacityLabel.append(document.createTextNode('Opacité '), range, output);
        const credit = document.createElement('small');
        credit.textContent = item.credit || '';
        if (typeof item.source === 'string' && /^https?:\/\//i.test(item.source)) {
          const link = document.createElement('a'); link.href = item.source; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Source'; credit.append(credit.textContent ? ' · ' : '', link);
        } else if (item.source) credit.append(document.createTextNode(`${credit.textContent ? ' · ' : ''}${item.source}`));
        credit.hidden = !credit.textContent;
        const error = document.createElement('p'); error.setAttribute('role', 'status');
        row.layer = projectionLayer(L, {...item, opacity}, () => {
          row.failed = true; check.disabled = range.disabled = true;
          error.textContent = 'Image indisponible. Le fond aérien reste accessible.';
          sync();
        });
        check.addEventListener('change', () => { row.visible = check.checked; remember(); sync(); });
        range.addEventListener('input', () => { output.textContent = `${range.value} %`; row.opacity = Number(range.value)/100; row.layer.setOpacity(row.opacity); remember(); });
        field.append(label, opacityLabel, credit, error); body.append(field); layers.push(row);
      }
      status.textContent = invalid ? 'Certains plans ont un calage invalide et ne sont pas affichés.' : layers.length ? 'Plans indicatifs : leur contenu peut différer du projet actuel.' : 'Aucune projection validée disponible pour le moment.';
      sync();
    } catch {
      status.textContent = 'Projections indisponibles. Le fond aérien reste accessible.';
    }
  }
  return {
    setActive(value) { active = value; panel.hidden = !value; if (value && !loading) loading = load(); sync(); }
  };
}
