import * as THREE from 'three';

/**
 * Texturas procedurales del prototipo v39: se dibujan en un canvas al arrancar,
 * así que el visor no descarga imágenes. El estilo (paneles inflados, césped
 * ondulado) es el que el equipo validó.
 */

type Painter = (c: CanvasRenderingContext2D, width: number, height: number) => void;

function canvasOf(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

/** La textura se repite `rx × ry` veces por metro: las coordenadas de textura van en metros. */
function repeated(canvas: HTMLCanvasElement, anisotropy: number, rx: number, ry: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = anisotropy;
  t.repeat.set(rx, ry);
  return t;
}

function rectTexture(w: number, h: number, paint: Painter, anisotropy: number, rx: number, ry: number): THREE.CanvasTexture {
  const canvas = canvasOf(w, h);
  paint(canvas.getContext('2d') as CanvasRenderingContext2D, w, h);
  return repeated(canvas, anisotropy, rx, ry);
}

export function canvasTexture(size: number, paint: Painter, anisotropy: number, repeat: number): THREE.CanvasTexture {
  return rectTexture(size, size, paint, anisotropy, repeat, repeat);
}

/** Normal map a partir de un mapa de alturas en escala de grises. */
function rectNormal(w: number, h: number, paintHeight: Painter, strength: number, anisotropy: number, rx: number, ry: number): THREE.CanvasTexture {
  const sc = canvasOf(w, h).getContext('2d') as CanvasRenderingContext2D;
  paintHeight(sc, w, h);
  const d = sc.getImageData(0, 0, w, h).data;
  const at = (x: number, y: number) => d[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  const out = canvasOf(w, h);
  const oc = out.getContext('2d') as CanvasRenderingContext2D;
  const img = oc.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (at(x - 1, y) - at(x + 1, y)) * strength, dy = (at(x, y - 1) - at(x, y + 1)) * strength;
    const len = Math.sqrt(dx * dx + dy * dy + 1), i = (y * w + x) * 4;
    img.data[i] = (dx / len * 0.5 + 0.5) * 255;
    img.data[i + 1] = (dy / len * 0.5 + 0.5) * 255;
    img.data[i + 2] = (1 / len * 0.5 + 0.5) * 255;
    img.data[i + 3] = 255;
  }
  oc.putImageData(img, 0, 0);
  return repeated(out, anisotropy, rx, ry);
}

export function normalTexture(size: number, paintHeight: Painter, strength: number, anisotropy: number, repeat: number): THREE.CanvasTexture {
  return rectNormal(size, size, paintHeight, strength, anisotropy, repeat, repeat);
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
  for (const [x, y] of [[50, 50], [170, 40], [110, 140], [40, 200], [200, 180], [130, 240], [220, 80]]) {
    const g = c.createRadialGradient(x, y, 0, x, y, 22);
    g.addColorStop(0, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, 22, 0, 7); c.fill();
  }
  c.strokeStyle = '#D8D8D0'; c.lineWidth = 2;
  for (let row = 0; row < 4; row++) {
    c.beginPath();
    for (let x = 0; x <= s; x += 2) c.lineTo(x, row * 68 + 34 + Math.sin(x * 0.06) * 10);
    c.stroke();
  }
  c.fillStyle = '#D0D0C8';
  for (let i = 0; i < 15; i++) { c.beginPath(); c.arc((i * 43 + 17) % s, (i * 67 + 11) % s, 2.5, 0, 7); c.fill(); }
};

const ground: Painter = (c, s) => {
  c.fillStyle = '#E8E8E4'; c.fillRect(0, 0, s, s);
  const cs = s / 4;
  c.fillStyle = '#F0F0EC';
  for (let r = 0; r < 4; r++) for (let cl = 0; cl < 4; cl++) if ((r + cl) % 2) c.fillRect(cl * cs, r * cs, cs, cs);
  grid(c, s, 4, '#D0D0C8', 4);
  c.fillStyle = '#D8D8D0';
  for (let r = 0; r <= 4; r++) for (let cl = 0; cl <= 4; cl++) { c.beginPath(); c.arc(cl * cs, r * cs, 5, 0, 7); c.fill(); }
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
  // Un abombado por panel: es lo que da a los edificios su aspecto de bloque inflado.
  const cs = s / 4;
  for (let r = 0; r < 4; r++) for (let cl = 0; cl < 4; cl++) {
    const x = cl * cs + cs / 2, y = r * cs + cs / 2;
    const g = c.createRadialGradient(x, y, 0, x, y, cs * 0.42);
    g.addColorStop(0, '#B0B0B0'); g.addColorStop(1, '#808080');
    c.fillStyle = g; c.beginPath(); c.arc(x, y, cs * 0.38, 0, 7); c.fill();
  }
};

function bumps(c: CanvasRenderingContext2D, s: number, count: number, minR: number, spreadR: number, stops: [number, string][], inner = 0) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * s, y = Math.random() * s, r = minR + Math.random() * spreadR;
    const g = c.createRadialGradient(x, y, r * inner, x, y, r);
    for (const [at, color] of stops) g.addColorStop(at, color);
    c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  }
}

/** Césped denso: hoyos de tierra, matas grandes y briznas. */
const greenRelief: Painter = (c, s) => {
  c.fillStyle = '#808080'; c.fillRect(0, 0, s, s);
  bumps(c, s, 30, 6, 12, [[0, '#606060'], [1, '#808080']]);
  bumps(c, s, 100, 10, 20, [[0, '#B0B0B0'], [0.6, '#959595'], [1, '#808080']], 0.3);
  c.lineWidth = 2;
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * s, y = Math.random() * s, v = 140 + Math.random() * 40;
    c.strokeStyle = `rgb(${v},${v},${v})`;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.random() * 6 - 3, y - 5 - Math.random() * 10); c.stroke();
  }
};

/** Follaje: casi blanco, para que el color de cada planta se vea intenso. */
const foliage: Painter = (c, s) => {
  c.fillStyle = '#F0F0F0'; c.fillRect(0, 0, s, s);
  c.fillStyle = '#FFFFFF';
  for (let i = 0; i < 30; i++) { c.beginPath(); c.arc(Math.random() * s, Math.random() * s, 4 + Math.random() * 8, 0, 7); c.fill(); }
  c.fillStyle = '#E0E0E0';
  for (let i = 0; i < 20; i++) { c.beginPath(); c.arc(Math.random() * s, Math.random() * s, 2 + Math.random() * 4, 0, 7); c.fill(); }
};

/** Follaje: hojas grandes en relieve. */
const foliageRelief: Painter = (c, s) => {
  c.fillStyle = '#808080'; c.fillRect(0, 0, s, s);
  bumps(c, s, 60, 6, 14, [[0, '#B8B8B8'], [0.5, '#909090'], [1, '#808080']]);
};

const groundRelief: Painter = (c, s) => {
  c.fillStyle = '#808080'; c.fillRect(0, 0, s, s);
  grid(c, s, 4, '#484848', 8);
  grain(c, s, 3000, 110, 30, 2.5);
};

/** Siempre la misma serie de azar: el tapial se ve igual en cada visita. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function stain(c: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer: string) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  c.fillStyle = g; c.fillRect(x - r, y - r, 2 * r, 2 * r);
}

/**
 * Tapial y tierra del Camino Prehispánico (SPEC-108 D-10), los de la página de
 * comparación aprobada: muros erosionados, grumosos y picados, con estratos de
 * apisonado ondulados y las juntas casi borradas; piso de tierra polvorienta.
 * Los colores se midieron en la foto «Camino Inca» de Google Maps (julio 2026):
 * muro #4A2011 / #7F5337 / #A47959 y piso #815633 / #966B4C / #AC825F, de la
 * sombra al sol. Lienzos de 128 px por metro.
 */
function huacaPainters(random: () => number): Record<'tapial' | 'tapialRelief' | 'tierra' | 'tierraRelief', Painter> {
  return {
    tapial(c, w, h) {
      // Tono parejo con manchas sueltas (un degradado se repetiría cada 2 m y marcaría franjas)
      c.fillStyle = '#8E6440'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 30; i++) {
        const light = random() < 0.5;
        stain(c, random() * w, random() * h, 25 + random() * 50,
          light ? 'rgba(164,121,89,0.35)' : 'rgba(110,72,44,0.30)', light ? 'rgba(164,121,89,0)' : 'rgba(110,72,44,0)');
      }
      // Estratos de apisonado: bandas onduladas de tono algo distinto, cada 25 a 45 cm
      for (let y = 0; y < h;) {
        const band = 32 + random() * 26, light = random() < 0.5, phase = random() * 6;
        c.fillStyle = light ? 'rgba(182,138,107,0.20)' : 'rgba(79,40,18,0.13)';
        c.beginPath(); c.moveTo(0, y);
        for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x * 0.03 + phase) * 3);
        for (let x = w; x >= 0; x -= 8) c.lineTo(x, y + band + Math.sin(x * 0.025 + phase) * 4);
        c.fill(); y += band;
      }
      // Huecos de erosión
      for (let i = 0; i < 10; i++) stain(c, random() * w, random() * h, 10 + random() * 22, 'rgba(74,32,17,0.38)', 'rgba(74,32,17,0)');
      // Grumos: relieve con luz arriba y su sombra abajo
      for (let i = 0; i < 700; i++) {
        const x = random() * w, y = random() * h, r = 3 + random() * 8;
        stain(c, x, y + r * 0.45, r * 1.1, 'rgba(74,32,17,0.22)', 'rgba(74,32,17,0)');
        stain(c, x, y, r, 'rgba(182,138,107,0.38)', 'rgba(182,138,107,0)');
      }
      // Picaduras
      for (let i = 0; i < 1100; i++) {
        const x = random() * w, y = random() * h, r = 0.7 + random() * 2;
        c.fillStyle = 'rgba(74,32,17,0.55)'; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        c.fillStyle = 'rgba(190,150,115,0.35)'; c.beginPath(); c.arc(x, y - r, r * 0.7, 0, 7); c.fill();
      }
      // Juntas verticales entre tapias, casi borradas
      for (const x of [w / 4 + random() * 20, (3 * w) / 4 + random() * 20]) {
        c.strokeStyle = 'rgba(74,32,17,0.14)'; c.lineWidth = 2; c.beginPath();
        for (let y = 0; y <= h; y += 6) c.lineTo(x + Math.sin(y * 0.2) * 2, y);
        c.stroke();
      }
    },
    tapialRelief(c, w, h) {
      c.fillStyle = '#808080'; c.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 36) { c.fillStyle = 'rgba(0,0,0,0.10)'; c.fillRect(0, y, w, 3); }
      for (let i = 0; i < 10; i++) stain(c, random() * w, random() * h, 10 + random() * 22, 'rgba(30,30,30,0.6)', 'rgba(30,30,30,0)');
      for (let i = 0; i < 700; i++) stain(c, random() * w, random() * h, 3 + random() * 8, 'rgba(200,200,200,0.55)', 'rgba(200,200,200,0)');
      for (let i = 0; i < 1100; i++) {
        c.fillStyle = 'rgba(20,20,20,0.7)'; c.beginPath(); c.arc(random() * w, random() * h, 0.7 + random() * 2, 0, 7); c.fill();
      }
    },
    tierra(c, w, h) {
      c.fillStyle = '#966B4C'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 45; i++) {
        const light = random() < 0.55;
        stain(c, random() * w, random() * h, 15 + random() * 45,
          light ? 'rgba(178,138,104,0.35)' : 'rgba(129,86,51,0.30)', light ? 'rgba(178,138,104,0)' : 'rgba(129,86,51,0)');
      }
      for (let i = 0; i < 1800; i++) {
        c.fillStyle = random() < 0.5 ? 'rgba(190,152,118,0.6)' : 'rgba(100,66,40,0.5)';
        const s = 0.8 + random() * 2.4; c.fillRect(random() * w, random() * h, s, s);
      }
      c.strokeStyle = 'rgba(100,66,40,0.25)'; c.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        let x = random() * w, y = random() * h;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (random() - 0.5) * 30; y += (random() - 0.5) * 30; c.lineTo(x, y); }
        c.stroke();
      }
    },
    tierraRelief(c, w, h) {
      c.fillStyle = '#808080'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 300; i++) stain(c, random() * w, random() * h, 2 + random() * 6, 'rgba(190,190,190,0.5)', 'rgba(190,190,190,0)');
      for (let i = 0; i < 1500; i++) { c.fillStyle = random() < 0.5 ? '#9a9a9a' : '#666666'; c.fillRect(random() * w, random() * h, 2, 2); }
    },
  };
}

export interface SceneTextures {
  building: THREE.Texture;
  buildingNormal: THREE.Texture;
  green: THREE.Texture;
  greenNormal: THREE.Texture;
  ground: THREE.Texture;
  groundNormal: THREE.Texture;
  parking: THREE.Texture;
  foliage: THREE.Texture;
  foliageNormal: THREE.Texture;
  /** Muros de la huaca: un mosaico de 4 m × 2 m. */
  tapial: THREE.Texture;
  tapialNormal: THREE.Texture;
  /** Piso de la huaca: un mosaico de 2 m × 2 m. */
  tierra: THREE.Texture;
  tierraNormal: THREE.Texture;
}

export function createTextures(renderer: THREE.WebGLRenderer): SceneTextures {
  const aniso = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  // En el orden de la página aprobada: los cuatro comparten la misma serie de azar.
  const huaca = huacaPainters(seeded(20131));
  const tapial = rectTexture(512, 256, huaca.tapial, aniso, 1 / 4, 1 / 2);
  const tapialNormal = rectNormal(512, 256, huaca.tapialRelief, 4.5, aniso, 1 / 4, 1 / 2);
  const tierra = rectTexture(256, 256, huaca.tierra, aniso, 1 / 2, 1 / 2);
  const tierraNormal = rectNormal(256, 256, huaca.tierraRelief, 2.5, aniso, 1 / 2, 1 / 2);
  return {
    building: canvasTexture(256, building, aniso, 0.07),
    buildingNormal: normalTexture(256, buildingRelief, 4, aniso, 0.07),
    green: canvasTexture(256, green, aniso, 0.12),
    greenNormal: normalTexture(256, greenRelief, 3.5, aniso, 0.12),
    ground: canvasTexture(256, ground, aniso, 0.04),
    groundNormal: normalTexture(256, groundRelief, 3, aniso, 0.04),
    parking: canvasTexture(128, parking, aniso, 0.1),
    foliage: canvasTexture(128, foliage, aniso, 0.3),
    foliageNormal: normalTexture(128, foliageRelief, 3, aniso, 0.3),
    tapial, tapialNormal, tierra, tierraNormal,
  };
}
