// Shared with the local calibration tool. Corners: TL, TR, BR, BL; WGS84 [lat, lng].
export const UNIT = [[0, 0], [1, 0], [1, 1], [0, 1]];
export function transform(h, [x, y]) {
  const d = h[6] * x + h[7] * y + 1;
  if (Math.abs(d) < 1e-10) throw new Error('Transformation instable. Répartissez les repères.');
  return [(h[0] * x + h[1] * y + h[2]) / d, (h[3] * x + h[4] * y + h[5]) / d];
}
function linear(a, b) {
  a = a.map((r, i) => [...r, b[i]]);
  for (let k = 0; k < b.length; k++) {
    let p = k;
    for (let i = k + 1; i < b.length; i++) if (Math.abs(a[i][k]) > Math.abs(a[p][k])) p = i;
    if (Math.abs(a[p][k]) < 1e-10) throw new Error('Repères dégénérés : évitez les points alignés ou confondus.');
    [a[p], a[k]] = [a[k], a[p]];
    const v = a[k][k];
    for (let j = k; j <= b.length; j++) a[k][j] /= v;
    for (let i = 0; i < b.length; i++) if (i !== k) {
      const f = a[i][k];
      for (let j = k; j <= b.length; j++) a[i][j] -= f * a[k][j];
    }
  }
  return a.map(r => r[b.length]);
}
function normalize(points) {
  const center = [0, 1].map(k => points.reduce((s, p) => s + p[k], 0) / points.length);
  const scale = Math.sqrt(points.reduce((s, p) => s + (p[0] - center[0]) ** 2 + (p[1] - center[1]) ** 2, 0) / points.length);
  if (scale < 1e-10) throw new Error('Repères confondus.');
  return {center, scale, points: points.map(p => p.map((v, k) => (v - center[k]) / scale))};
}
export function fit(source, target) {
  if (source.length < 4 || source.length !== target.length) throw new Error('Associez au moins quatre repères complets.');
  const s = normalize(source), t = normalize(target), rows = [], values = [];
  s.points.forEach(([x, y], i) => {
    const [u, v] = t.points[i];
    rows.push([x, y, 1, 0, 0, 0, -u*x, -u*y], [0, 0, 0, x, y, 1, -v*x, -v*y]);
    values.push(u, v);
  });
  const a = Array.from({length: 8}, (_, i) => Array.from({length: 8}, (_, j) => rows.reduce((sum, r) => sum + r[i]*r[j], 0)));
  const b = Array.from({length: 8}, (_, i) => rows.reduce((sum, r, k) => sum + r[i]*values[k], 0));
  const h = linear(a, b);
  const apply = p => transform(h, p.map((v, k) => (v - s.center[k])/s.scale)).map((v, k) => v*t.scale + t.center[k]);
  const errors = source.map((p, i) => Math.hypot(...apply(p).map((v, k) => v - target[i][k])));
  return {apply, errors, rms: Math.sqrt(errors.reduce((sum, e) => sum + e*e, 0)/errors.length)};
}
export function validCorners(corners) {
  if (!Array.isArray(corners) || corners.length !== 4 || corners.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 85 || Math.abs(p[1]) > 180)) return false;
  const crosses = corners.map((a, i) => {
    const b = corners[(i+1)%4], c = corners[(i+2)%4];
    return (b[0]-a[0])*(c[1]-b[1]) - (b[1]-a[1])*(c[0]-b[0]);
  });
  return crosses.every(v => v > 1e-14) || crosses.every(v => v < -1e-14);
}
export function projectionLayer(L, config, onError = () => {}) {
  if (!validCorners(config.corners)) throw new Error('Coins invalides ou croisés.');
  const Overlay = L.Layer.extend({
    onAdd(map) {
      this.map = map;
      this.el = L.DomUtil.create('img', 'leaflet-zoom-hide');
      this.el.alt = config.title || '';
      Object.assign(this.el.style, {position: 'absolute', width: '1000px', height: '1000px', maxWidth: 'none', transformOrigin: '0 0', pointerEvents: 'none'});
      this.el.onerror = () => onError(config);
      this.el.src = config.image;
      map.getPane('overlayPane').appendChild(this.el);
      this.setOpacity(config.opacity ?? 0.65);
      this.el.style.zIndex = String(config.order ?? 0);
      map.on('zoomend viewreset moveend', this.redraw, this);
      this.redraw();
    },
    onRemove(map) { map.off('zoomend viewreset moveend', this.redraw, this); this.el.remove(); this.map = null; },
    redraw() {
      if (!this.map) return;
      const dest = this.corners.map(c => { const p = this.map.project(c).subtract(this.map.getPixelOrigin()); return [p.x, p.y]; });
      const f = fit(UNIT, dest);
      // fit() normalizes internally. Recover coefficients in CSS pixel coordinates.
      const points = UNIT.map(p => f.apply(p));
      const rows = [], rhs = [];
      UNIT.forEach(([x, y], i) => { const [u,v] = points[i]; x *= 1000; y *= 1000; rows.push([x,y,1,0,0,0,-u*x,-u*y],[0,0,0,x,y,1,-v*x,-v*y]); rhs.push(u,v); });
      const h = linear(rows, rhs);
      this.el.style.transform = `matrix3d(${h[0]},${h[3]},0,${h[6]},${h[1]},${h[4]},0,${h[7]},0,0,1,0,${h[2]},${h[5]},0,1)`;
    },
    setCorners(corners) { if (!validCorners(corners)) throw new Error('Coins invalides ou croisés.'); this.corners = corners.map(p => [...p]); this.redraw(); return this; },
    setOpacity(value) { config.opacity = Math.max(0, Math.min(1, Number(value))); if (this.el) this.el.style.opacity = config.opacity; return this; }
  });
  const layer = new Overlay();
  layer.corners = config.corners.map(p => [...p]);
  return layer;
}
