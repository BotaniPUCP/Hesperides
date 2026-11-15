// Compara el GLSL de las fachadas con facadeColor, la copia que prueban los tests (SPEC-112 D-11 y D-22): compila el
// shader en Chrome sin ventana, dibuja cada caso y lo compara píxel a píxel: el color, y también el grano, el
// encendido, la rugosidad, el metal y el relieve. Falla si se separan.
// Uso, desde frontend/: node --import ./scripts/ts-register.mjs scripts/real-look-shader-check.mjs
// Chrome: la variable CHROME o las rutas de siempre.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outHtml = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'real-look-shader-')), 'check.html');
const mod = (p) => import(pathToFileURL(path.join(frontend, 'src/components/map3d/realLook', p)).href);
/** Diferencia máxima tolerada por canal (de 255): el redondeo a 8 bits y el float32 de la GPU. */
const TOLERANCE = 2;
const { buildLookTable } = await mod('lookTable.ts');
const { facadeColor } = await mod('facadeColor.ts');
const { LOOK_FRAGMENT_HEAD } = await mod('lookShader.ts');

const look = {
  planKey: 'k', name: 'prueba', folder: 'f', photos: ['a.jpg'],
  materials: {
    ladrillo: { color: '#c47a65' }, concreto: { color: '#b8b3ab' }, zocalo: { color: '#56616b' }, melon: { color: '#d9a888' },
    vidrio: { glass: '#5d646c', frame: '#e4e4df', moduleM: 1.2, heightM: 3.6, frameM: 0.08, spandrel: { color: '#cbd0cc', heightM: 1.4 }, accent: { color: '#24608b', share: 0.12 }, vary: 0.1 },
    cinta: { glass: '#2e3437', frame: '#3c4248', moduleM: 1.5, heightM: 3.5, frameM: 0.06 },
    chapa: { color: '#9aa0a6', finish: 'metal' },
  },
  zones: [{
    id: 'z', wall: 'ladrillo', roof: 'concreto',
    common: [{ material: 'zocalo', v: [-1, 0.45] }, { material: 'concreto', floors: { everyM: 3.5, startM: 0, bandM: [-0.2, 0.3] } }],
    faces: {
      N: [{ material: 'vidrio', u: [-6, 6], v: [1, 12] }, { material: 'melon', u: [-8, 8], v: [13, 13.5] }],
      S: [{ material: 'cinta', u: [-10, 10], floors: { everyM: 3.5, startM: 0, bandM: [1, 2.6] } }],
      W: [{ material: 'concreto', u: [-10, 10] }],
      NE: [{ material: 'chapa' }],
      NW: [{ material: 'melon' }],
    },
  }],
};
const table = buildLookTable([look]);
const rows = table.zones.get('k')[0];
const W = 128, H = 128;
const base = [
  { name: 'vidrio de cerca', face: rows.sides.N, range: [-8, -1, 8, 15] },
  { name: 'perfiles muy de cerca', face: rows.sides.N, range: [-2, 2, 0, 4] },
  { name: 'vidrio de lejos', face: rows.sides.N, range: [-200, -40, 200, 360] },
  { name: 'cintas por piso', face: rows.sides.S, range: [-12, -1, 12, 15] },
  { name: 'cara sin entrada', face: rows.sides.E, range: [-8, -1, 8, 15] },
  { name: 'techo', face: rows.roof, range: [-8, -1, 8, 15] },
  { name: 'ladrillo de cerca', face: rows.sides.E, range: [-1, 1, 1, 3] },
  { name: 'concreto de cerca', face: rows.sides.W, range: [-4, -1, 4, 7] },
  { name: 'metal de cerca', face: rows.sides.NE, range: [-2, 1, 2, 5] },
  { name: 'tarrajeo', face: rows.sides.NW, range: [-12, -1, 12, 23] },
];
/** Qué se compara en cada pasada: el color, y luego cada canal de luz llevado a [0, 1]. */
const CHANNELS = [
  ['color', (s) => s.rgb],
  ['grano · encendido · rugosidad', (s) => [s.shade * 0.5, s.lit, s.rough]],
  ['metal · relieve · vidrio', (s) => [s.metal, s.height * 40 + 0.5, s.glass]],
];
const cases = CHANNELS.flatMap(([label, pick], channel) => base.map((c) => ({ ...c, name: `${c.name} · ${label}`, channel, pick })));
for (const c of cases) {
  const [u0, v0, u1, v1] = c.range;
  const du = (u1 - u0) / W, dv = (v1 - v0) / H;
  c.want = [];
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const s = facadeColor(table, c.face, u0 + (px + 0.5) * du, v0 + (py + 0.5) * dv, [Math.max(du, 1e-4), Math.max(dv, 1e-4)]);
    c.want.push(...c.pick(s).map((x) => Math.round(Math.min(Math.max(x, 0), 1) * 255)));
  }
}

const fragment = `#version 300 es
precision highp float;
#define varying in
#define texture2D texture
${LOOK_FRAGMENT_HEAD}
uniform float uFace;
uniform int uChannel;
out vec4 outColor;
void main() {
  LookSurface s = lookDisplay(uFace, vLookFace);
  vec3 c = uChannel == 0 ? s.rgb : uChannel == 1 ? vec3(s.shade * 0.5, s.lit, s.rough) : vec3(s.metal, s.height * 40.0 + 0.5, s.glass);
  outColor = vec4(c, 1.0);
}`;
const vertex = `#version 300 es
in vec2 pos;
uniform vec4 uRange;
out vec2 vLookFace;
void main() { vLookFace = mix(uRange.xy, uRange.zw, pos * 0.5 + 0.5); gl_Position = vec4(pos, 0.0, 1.0); }`;

const page = `<!doctype html><meta charset="utf-8"><canvas id="c" width="${W}" height="${H}"></canvas><pre id="out"></pre><script>
const out = document.getElementById('out');
try {
  const gl = document.getElementById('c').getContext('webgl2', { antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('sin webgl2');
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, ${JSON.stringify(vertex)}));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, ${JSON.stringify(fragment)}));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'pos'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, ${table.width}, ${table.height}, 0, gl.RGBA, gl.FLOAT, new Float32Array(${JSON.stringify(Array.from(table.data))}));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.uniform1i(gl.getUniformLocation(prog, 'lookTable'), 0);
  gl.uniform1f(gl.getUniformLocation(prog, 'lookRows'), ${table.height});
  const cases = ${JSON.stringify(cases.map(({ name, face, range, channel }) => ({ name, face, range, channel })))};
  const res = [];
  for (const c of cases) {
    gl.uniform1f(gl.getUniformLocation(prog, 'uFace'), c.face);
    gl.uniform1i(gl.getUniformLocation(prog, 'uChannel'), c.channel);
    gl.uniform4f(gl.getUniformLocation(prog, 'uRange'), c.range[0], c.range[1], c.range[2], c.range[3]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const px = new Uint8Array(${W * H * 4}); gl.readPixels(0, 0, ${W}, ${H}, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const rgb = []; for (let i = 0; i < px.length; i += 4) rgb.push(px[i], px[i + 1], px[i + 2]);
    res.push(btoa(String.fromCharCode(...rgb)));
  }
  out.textContent = JSON.stringify({ ok: true, res });
} catch (e) { out.textContent = JSON.stringify({ ok: false, error: String(e.message || e) }); }
</script>`;
fs.writeFileSync(outHtml, page);

const chrome = [process.env.CHROME, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => p && fs.existsSync(p));
if (!chrome) throw new Error('No encuentro Chrome: indica su ruta en la variable CHROME');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'shader-check-'));
const dom = execFileSync(chrome, ['--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', `--user-data-dir=${profile}`,
  '--dump-dom', `file:///${outHtml.replace(/\\/g, '/')}`], { encoding: 'utf8', maxBuffer: 64 << 20 });
const json = JSON.parse(dom.match(/<pre id="out">([\s\S]*?)<\/pre>/)[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
if (!json.ok) { console.log('ERROR GLSL:', json.error); process.exit(1); }
let failed = false;
cases.forEach((c, k) => {
  const got = Buffer.from(json.res[k], 'base64');
  let max = 0, over = 0, worst = 0;
  for (let i = 0; i < c.want.length; i++) {
    const d = Math.abs(got[i] - c.want[i]);
    if (d > max) { max = d; worst = i; }
    if (d > 6) over++;
  }
  const p = Math.floor(worst / 3), x = p % W, y = Math.floor(p / W);
  failed ||= max > TOLERANCE;
  console.log(`${max > TOLERANCE ? 'DIFIERE' : 'igual  '} ${c.name.padEnd(52)} máx ${String(max).padStart(3)} · más de 6: ${(100 * over / c.want.length).toFixed(2)} % · peor en (${x},${y}) quiere ${c.want.slice(p * 3, p * 3 + 3)} y da ${[...got.slice(p * 3, p * 3 + 3)]}`);
});
process.exit(failed ? 1 : 0);
