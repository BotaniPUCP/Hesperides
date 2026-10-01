import * as THREE from 'three';

/**
 * Fondo de la escena (un canvas 2D detrás del WebGL) y mapas de entorno para los
 * reflejos, del prototipo v39: cielo turquesa con trama triangular de día, y
 * cielo estrellado con luna de noche.
 */

/** Pseudoaleatorio con semilla: las estrellas no cambian de sitio entre redibujos. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function sky(c: CanvasRenderingContext2D, w: number, h: number, night: boolean) {
  const bg = c.createLinearGradient(0, 0, 0, h);
  const stops = night
    ? ['#05073A', '#12175C', '#2C2E74', '#8C5F9F']
    : ['#41C9FF', '#74DFFF', '#C9F3FF', '#F6FCFF'];
  [0, 0.34, 0.68, 1].forEach((p, i) => bg.addColorStop(p, stops[i]));
  c.fillStyle = bg;
  c.fillRect(0, 0, w, h);
}

function triangles(c: CanvasRenderingContext2D, w: number, h: number, night: boolean) {
  const tw = night ? 34 : 42, th = night ? 30 : 36;
  c.lineWidth = 1;
  for (let row = -2; row < h / th + 3; row++) {
    const y0 = row * th, yn = Math.max(0, Math.min(1, y0 / h));
    const fade = night ? 0.5 + 0.5 * Math.pow(1 - Math.abs(yn - 0.52) / 0.52, 1.35) : Math.pow(1 - yn, 0.8);
    for (let col = -2; col < w / tw + 3; col++) {
      const x0 = col * tw + (row & 1) * (tw / 2), up = ((row + col) & 1) === 0;
      c.fillStyle = night
        ? `rgba(117,133,255,${((row + col) % 5 === 0 ? 0.028 : 0.014) * fade})`
        : `rgba(255,255,255,${(0.05 + ((row + col) % 5 === 0 ? 0.018 : 0)) * fade})`;
      c.strokeStyle = night ? `rgba(92,110,255,${0.11 * fade})` : `rgba(255,255,255,${0.07 * fade})`;
      c.beginPath();
      if (up) { c.moveTo(x0, y0 + th); c.lineTo(x0 + tw / 2, y0); c.lineTo(x0 + tw, y0 + th); }
      else { c.moveTo(x0, y0); c.lineTo(x0 + tw / 2, y0 + th); c.lineTo(x0 + tw, y0); }
      c.closePath(); c.fill(); c.stroke();
    }
  }
}

function starsAndMoon(c: CanvasRenderingContext2D, w: number, h: number) {
  const rnd = seeded(0x6d2b79f5);
  for (let i = 0; i < 260; i++) {
    const x = rnd() * w, y = rnd() * h * 0.68, r = 0.5 + rnd() * 1.6, a = 0.24 + rnd() * 0.65;
    c.fillStyle = `rgba(245,248,255,${a})`;
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  }
  const mx = w * 0.77, my = h * 0.16, mr = Math.max(20, Math.min(w, h) * 0.028);
  c.fillStyle = '#FFF8EF';
  c.beginPath(); c.arc(mx, my, mr, 0, Math.PI * 2); c.fill();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath(); c.arc(mx + mr * 0.48, my - mr * 0.35, mr * 0.92, 0, Math.PI * 2); c.fill();
  c.globalCompositeOperation = 'source-over';
}

/** Redibuja el fondo al tamaño CSS del contenedor, con la densidad de la pantalla. */
export function drawBackdrop(canvas: HTMLCanvasElement, width: number, height: number, night: boolean) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  sky(c, width, height, night);
  triangles(c, width, height, night);
  if (night) starsAndMoon(c, width, height);
}

/** Mapa de entorno equirectangular para reflejos suaves en techos y césped. */
export function environmentMap(renderer: THREE.WebGLRenderer, night: boolean): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const c = canvas.getContext('2d') as CanvasRenderingContext2D;
  const g = c.createLinearGradient(0, 0, 0, 256);
  const stops: [number, string][] = night
    ? [[0, '#0B1547'], [0.3, '#202768'], [0.48, '#4B4388'], [0.58, '#7A5596'], [0.7, '#3B315F'], [1, '#17152F']]
    : [[0, '#70B8D8'], [0.35, '#A0CCE0'], [0.45, '#FFD898'], [0.55, '#FFC878'], [0.65, '#B09868'], [1, '#705838']];
  stops.forEach(([p, col]) => g.addColorStop(p, col));
  c.fillStyle = g;
  c.fillRect(0, 0, 512, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.encoding = THREE.sRGBEncoding;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromEquirectangular(tex);
  tex.dispose();
  pmrem.dispose();
  return target.texture;
}
