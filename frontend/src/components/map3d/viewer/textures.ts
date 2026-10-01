import * as THREE from 'three';

/**
 * Texturas procedurales del prototipo v39: se dibujan en un canvas al arrancar,
 * así que el visor no descarga imágenes. El estilo (paneles inflados, césped
 * ondulado) es el que el equipo validó.
 */

type Painter = (c: CanvasRenderingContext2D, size: number) => void;

function canvasTexture(size: number, paint: Painter, anisotropy: number, repeat: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  paint(canvas.getContext('2d') as CanvasRenderingContext2D, size);
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  t.repeat.set(repeat, repeat);
  return t;
}

/** Normal map a partir de un mapa de alturas en escala de grises. */
function normalTexture(size: number, paintHeight: Painter, strength: number, anisotropy: number, repeat: number): THREE.CanvasTexture {
  const src = document.createElement('canvas');
  src.width = src.height = size;
  const sc = src.getContext('2d') as CanvasRenderingContext2D;
  paintHeight(sc, size);
  const h = sc.getImageData(0, 0, size, size).data;
  const at = (x: number, y: number) => h[(((y + size) % size) * size + ((x + size) % size)) * 4] / 255;
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const oc = out.getContext('2d') as CanvasRenderingContext2D;
  const img = oc.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (at(x - 1, y) - at(x + 1, y)) * strength, dy = (at(x, y - 1) - at(x, y + 1)) * strength;
    const len = Math.sqrt(dx * dx + dy * dy + 1), i = (y * size + x) * 4;
    img.data[i] = (dx / len * 0.5 + 0.5) * 255;
    img.data[i + 1] = (dy / len * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(out);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  t.repeat.set(repeat, repeat);
  return t;
}

function grid(c: CanvasRenderingContext2D, s: number, div: number, color: string, width: number) {
  const cs = s / div;
  c.strokeStyle = color;
  c.lineWidth = width;
  for (let i = 0; i <= div; i++) {
    const p = i * cs;
    c.beginPath(); c.moveTo(p, 0); c.lineTo(p, s); c.stroke();
    c.beginPath(); c.moveTo(0, p); c.lineTo(s, p); c.stroke();
  }
}

function grain(c: CanvasRenderingContext2D, s: number, count: number, base: number, spread: number, dot: number) {
  for (let i = 0; i < count; i++) {
    const v = base + Math.random() * spread;
    c.fillStyle = `rgb(${v},${v},${v})`;
    c.fillRect(Math.random() * s, Math.random() * s, dot, dot);
  }
}

const building: Painter = (c, s) => {
  const div = 4, cs = s / div;
  for (let r = 0; r < div; r++) for (let cl = 0; cl < div; cl++) {
    const g = c.createRadialGradient(cl * cs + cs / 2, r * cs + cs / 2, 0, cl * cs + cs / 2, r * cs + cs / 2, cs * 0.7);
    g.addColorStop(0, '#F0E8F0'); g.addColorStop(1, '#D8D0DC');
    c.fillStyle = g; c.fillRect(cl * cs, r * cs, cs, cs);
  }
  grid(c, s, div, '#C0B8C8', 3);
  c.strokeStyle = '#B0A8BC'; c.lineWidth = 5; c.strokeRect(0, 0, s, s);
};

const green: Painter = (c, s) => {
  const bg = c.createLinearGradient(0, 0, 0, s);
  bg.addColorStop(0, '#F4F4F0'); bg.addColorStop(1, '#E4E4E0');
  c.fillStyle = bg; c.fillRect(0, 0, s, s);
  c.strokeStyle = '#D8D8D0'; c.lineWidth = 2;
  for (let row = 0; row < 4; row++) {
    c.beginPath();
    for (let x = 0; x <= s; x += 2) c.lineTo(x, row * 68 + 34 + Math.sin(x * 0.06) * 10);
    c.stroke();
  }
};

const ground: Painter = (c, s) => {
  c.fillStyle = '#E8E8E4'; c.fillRect(0, 0, s, s);
  const cs = s / 4;
  c.fillStyle = '#F0F0EC';
  for (let r = 0; r < 4; r++) for (let cl = 0; cl < 4; cl++) if ((r + cl) % 2) c.fillRect(cl * cs, r * cs, cs, cs);
  grid(c, s, 4, '#D0D0C8', 4);
};

const parking: Painter = (c, s) => {
  c.fillStyle = '#F0E8C0'; c.fillRect(0, 0, s, s);
  c.strokeStyle = '#E8D060'; c.lineWidth = 10;
  for (let i = -s; i < s * 2; i += 24) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i + s, s); c.stroke(); }
};

const buildingRelief: Painter = (c, s) => {
  c.fillStyle = '#808080'; c.fillRect(0, 0, s, s);
  grain(c, s, 6000, 105, 40, 3);
  grid(c, s, 4, '#484848', 8);
};

const greenRelief: Painter = (c, s) => {
  c.fillStyle = '#808080'; c.fillRect(0, 0, s, s);
  for (let i = 0; i < 100; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = 10 + Math.random() * 20;
    const g = c.createRadialGradient(x, y, r * 0.3, x, y, r);
    g.addColorStop(0, '#B0B0B0'); g.addColorStop(1, '#808080');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
};

const groundRelief: Painter = (c, s) => {
  c.fillStyle = '#808080'; c.fillRect(0, 0, s, s);
  grid(c, s, 4, '#484848', 8);
  grain(c, s, 3000, 110, 30, 2.5);
};

export interface SceneTextures {
  building: THREE.Texture;
  buildingNormal: THREE.Texture;
  green: THREE.Texture;
  greenNormal: THREE.Texture;
  ground: THREE.Texture;
  groundNormal: THREE.Texture;
  parking: THREE.Texture;
}

export function createTextures(renderer: THREE.WebGLRenderer): SceneTextures {
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return {
    building: canvasTexture(256, building, aniso, 0.07),
    buildingNormal: normalTexture(256, buildingRelief, 4, aniso, 0.07),
    green: canvasTexture(256, green, aniso, 0.12),
    greenNormal: normalTexture(256, greenRelief, 3.5, aniso, 0.12),
    ground: canvasTexture(256, ground, aniso, 0.04),
    groundNormal: normalTexture(256, groundRelief, 3, aniso, 0.04),
    parking: canvasTexture(128, parking, aniso, 0.1),
  };
}
