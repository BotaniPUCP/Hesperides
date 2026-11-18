// Dibuja un edificio clasificado con z-buffer: cada píxel toma el color de su punto de la fachada con
// facadeColor, la copia probada del shader. Sombreado suave y sin la luz de la escena: el color es el de la
// ficha en una cara al sol, como lo deja la calibración (SPEC-112 D-11).
const SKY_HIGH = [0.78, 0.85, 0.92];
const SKY_LOW = [0.93, 0.95, 0.97];
const GROUND = [0.84, 0.86, 0.8];
const SUN = normalize([0.45, 0.8, 0.35]);
const NEAR_M = 0.5;
/** La sombra propia más oscura: una cara de espaldas al sol queda en este factor. */
const SHADE_MIN = 0.78;
const HORIZONTAL_NY = 0.7;
const GRID_M = 5;
const RED = [0.86, 0.12, 0.12], BLUE = [0.12, 0.32, 0.9];

function normalize(v) { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); }
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const mix = (a, b, t) => a.map((x, i) => x + (b[i] - x) * t);

export function camera(eye, target, fov, w, h) {
  const fwd = normalize(sub(target, eye));
  const right = normalize(cross(fwd, [0, 1, 0]));
  return { eye, fwd, right, up: cross(right, fwd), tanH: Math.tan((fov * Math.PI) / 360), aspect: w / h, w, h };
}

function project(p, cam) {
  const n = p.length / 3;
  const x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const rel = sub([p[i * 3], p[i * 3 + 1], p[i * 3 + 2]], cam.eye);
    z[i] = dot(rel, cam.fwd);
    x[i] = ((dot(rel, cam.right) / z[i] / (cam.tanH * cam.aspect) + 1) / 2) * cam.w;
    y[i] = ((1 - dot(rel, cam.up) / z[i] / cam.tanH) / 2) * cam.h;
  }
  return { x, y, z };
}

/** Cielo y suelo plano en la cota 0; el suelo entra al z-buffer para que tape lo que queda bajo tierra. */
function background(cam, rgb, zbuf) {
  for (let py = 0; py < cam.h; py++) for (let px = 0; px < cam.w; px++) {
    const sx = ((2 * (px + 0.5)) / cam.w - 1) * cam.tanH * cam.aspect, sy = (1 - (2 * (py + 0.5)) / cam.h) * cam.tanH;
    const dirY = cam.fwd[1] + sx * cam.right[1] + sy * cam.up[1];
    const i = py * cam.w + px;
    const t = dirY < 0 ? -cam.eye[1] / dirY : Infinity;
    const color = t < Infinity ? mix(GROUND, SKY_LOW, Math.min(t / 2500, 1)) : mix(SKY_LOW, SKY_HIGH, Math.min(dirY * 3, 1));
    rgb.set(color, i * 3);
    zbuf[i] = t;
  }
}

/** Líneas cada 5 m en la u y la v; la u = 0 (centro de la caja) en rojo y la cota 0 en azul. */
function gridOverlay(color, u, v, aa) {
  const near = (x, step, a) => Math.abs(x - Math.round(x / step) * step) < a;
  if (Math.abs(u) < aa[0] * 1.2) return RED;
  if (Math.abs(v) < aa[1] * 1.2) return BLUE;
  if (near(u, GRID_M, aa[0] * 0.9) || near(v, GRID_M, aa[1] * 0.9)) {
    return mix(color, [0.1, 0.1, 0.1], near(u, 2 * GRID_M, aa[0] * 0.9) || near(v, 2 * GRID_M, aa[1] * 0.9) ? 0.75 : 0.45);
  }
  return color;
}

function triangleNormal(p, a, eye) {
  const A = [p[a * 3], p[a * 3 + 1], p[a * 3 + 2]];
  const n = normalize(cross(sub([p[a * 3 + 3], p[a * 3 + 4], p[a * 3 + 5]], A), sub([p[a * 3 + 6], p[a * 3 + 7], p[a * 3 + 8]], A)));
  return dot(n, sub(A, eye)) > 0 ? n.map((x) => -x) : n;
}

function drawTriangle(ctx, t) {
  const { proj, building, cam, rgb, zbuf, grid, facadeColor } = ctx;
  const [a, b, c] = [t * 3, t * 3 + 1, t * 3 + 2];
  const { x, y, z } = proj;
  if (Math.min(z[a], z[b], z[c]) < NEAR_M) return;
  const d = (y[b] - y[c]) * (x[a] - x[c]) + (x[c] - x[b]) * (y[a] - y[c]);
  if (Math.abs(d) < 1e-9) return;
  const x0 = Math.max(0, Math.floor(Math.min(x[a], x[b], x[c]))), x1 = Math.min(cam.w - 1, Math.ceil(Math.max(x[a], x[b], x[c])));
  const y0 = Math.max(0, Math.floor(Math.min(y[a], y[b], y[c]))), y1 = Math.min(cam.h - 1, Math.ceil(Math.max(y[a], y[b], y[c])));
  const n = triangleNormal(building.positions, a, cam.eye);
  const shade = SHADE_MIN + (1 - SHADE_MIN) * Math.max(0, dot(n, SUN));
  const wall = Math.abs(n[1]) <= HORIZONTAL_NY;
  const f = building.face, row = building.row[a];
  const weights = (sx, sy) => {
    const l0 = ((y[b] - y[c]) * (sx - x[c]) + (x[c] - x[b]) * (sy - y[c])) / d;
    const l1 = ((y[c] - y[a]) * (sx - x[c]) + (x[a] - x[c]) * (sy - y[c])) / d;
    return [l0, l1, 1 - l0 - l1];
  };
  const uvAt = ([l0, l1, l2]) => {
    const iz = l0 / z[a] + l1 / z[b] + l2 / z[c];
    return [0, 1].map((k) => (l0 * f[a * 2 + k] / z[a] + l1 * f[b * 2 + k] / z[b] + l2 * f[c * 2 + k] / z[c]) / iz);
  };
  for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) {
    const l = weights(px + 0.5, py + 0.5);
    if (l[0] < -1e-6 || l[1] < -1e-6 || l[2] < -1e-6) continue;
    const depth = 1 / (l[0] / z[a] + l[1] / z[b] + l[2] / z[c]);
    const i = py * cam.w + px;
    if (depth >= zbuf[i]) continue;
    zbuf[i] = depth;
    const uv = uvAt(l), ux = uvAt(weights(px + 1.5, py + 0.5)), uy = uvAt(weights(px + 0.5, py + 1.5));
    const aa = [0, 1].map((k) => Math.max(Math.abs(ux[k] - uv[k]) + Math.abs(uy[k] - uv[k]), 1e-4));
    let color = row >= 0 ? facadeColor(building.table, row, uv[0], uv[1], aa).rgb : [1, 0.1, 0.5];
    if (grid && wall) color = gridOverlay(color, uv[0], uv[1], aa);
    rgb.set(color.map((v) => v * shade), i * 3);
  }
}

/** Una vista del edificio como RGB de 8 bits. */
export function render(building, view, facadeColor) {
  const { eye, target, fov = 38, w = 640, h = 400, grid = false } = view;
  const cam = camera(eye, target, fov, w, h);
  const rgb = new Float32Array(w * h * 3);
  const zbuf = new Float32Array(w * h);
  background(cam, rgb, zbuf);
  const ctx = { proj: project(building.positions, cam), building, cam, rgb, zbuf, grid, facadeColor };
  for (let t = 0; t < building.positions.length / 9; t++) drawTriangle(ctx, t);
  return Uint8Array.from(rgb, (v) => Math.round(Math.min(Math.max(v, 0), 1) * 255));
}
