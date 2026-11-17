/**
 * GLSL del vidrio de las fachadas: la misma cuenta que `glassNear`, `glassFar`
 * y `glassSample` en `facadeColor.ts`. Usa `lookAt`, `lookBox`, `lookCellHash`
 * y `LookSurface`, que declara `lookShader.ts` antes de incluirlo.
 */
export const LOOK_GLASS_GLSL = /* glsl */ `
LookSurface lookGlassSurface(vec3 rgb, float glass, float lit) {
  LookSurface s;
  s.rgb = rgb;
  s.glass = glass;
  s.shade = 1.0;
  s.height = 0.0;
  s.rough = mix(LOOK_FRAME_ROUGH, LOOK_PANE_ROUGH, glass);
  s.metal = mix(LOOK_FRAME_METAL, LOOK_PANE_METAL, glass);
  s.lit = lit;
  return s;
}

// El módulo de cerca: paño con su tono, antepecho o acento, y perfiles. Un paño de acento no se enciende.
LookSurface lookGlassNear(float m, vec2 p, vec2 aa, float seed) {
  vec4 t0 = lookAt(m), t1 = lookAt(m + 1.0), t2 = lookAt(m + 2.0), t3 = lookAt(m + 3.0), t4 = lookAt(m + 4.0);
  vec2 size = t4.xy;
  vec2 cell = floor(p / size);
  vec2 f = p - cell * size;
  vec2 h = lookCellHash(cell, seed);
  bool accentOn = t3.a > 0.0 && h.x < t3.a;
  bool accentPane = accentOn && t2.a <= 0.0;
  float tone = 1.0 + t4.z * (2.0 * h.y - 1.0);
  vec3 pane = accentPane ? t3.rgb : t0.rgb * tone;
  // Suciedad que baja desde el borde inferior del paño sobre el antepecho.
  float grime = t2.a > 0.0 ? 1.0 - LOOK_GRIME.y * smoothstep(t2.a - LOOK_GRIME.x, t2.a, f.y) : 1.0;
  vec3 panel = (accentOn ? t3.rgb : t2.rgb) * grime;
  float halfFrame = t1.a * 0.5;
  float inPanel = t2.a > 0.0 ? 1.0 - smoothstep(t2.a - aa.y, t2.a + aa.y, f.y) : 0.0;
  float rail = t2.a > 0.0 ? lookBox(f.y, t2.a - halfFrame, t2.a + halfFrame, aa.y) : 0.0;
  float frame = max(max(1.0 - lookBox(f.x, halfFrame, size.x - halfFrame, aa.x), 1.0 - lookBox(f.y, halfFrame, size.y - halfFrame, aa.y)), rail);
  float glass = (1.0 - frame) * (1.0 - inPanel);
  vec2 litHash = lookCellHash(cell, seed + LOOK_LIT_SEED);
  bool litOn = !accentPane && litHash.x < LOOK_LIT_SHARE;
  float lit = litOn ? glass * mix(LOOK_LIT_DIM, 1.0, litHash.y) : 0.0;
  LookSurface s = lookGlassSurface(mix(mix(pane, panel, inPanel), t1.rgb, frame), glass, lit);
  // Brillo y relieve (D-23): paño hundido con reflejo, antepecho y acento abombados, perfil al ras.
  vec4 paneRect = vec4(halfFrame, size.x - halfFrame, t2.a > 0.0 ? t2.a + halfFrame : halfFrame, size.y - halfFrame);
  vec2 paneG = accentPane ? vec2(1.0, lookPanelPillow(f, paneRect, aa)) : lookPaneGloss(f, paneRect, aa);
  float panelH = t2.a > 0.0 ? lookPanelPillow(f, vec4(halfFrame, size.x - halfFrame, halfFrame, t2.a - halfFrame), aa) : 0.0;
  s.shade = mix(mix(paneG.x, 1.0, inPanel), 1.0, frame);
  s.height = (1.0 - frame) * mix(paneG.y, panelH, inPanel);
  return s;
}

// El módulo de lejos: el promedio de paños, antepechos, acentos, perfiles y paños encendidos, para que no titile.
LookSurface lookGlassFar(float m) {
  vec4 t0 = lookAt(m), t1 = lookAt(m + 1.0), t2 = lookAt(m + 2.0), t3 = lookAt(m + 3.0), t4 = lookAt(m + 4.0);
  float panelFrac = t2.a / t4.y;
  vec3 pane = t2.a > 0.0 ? t0.rgb : mix(t0.rgb, t3.rgb, t3.a);
  // De lejos, la suciedad promedio del antepecho: la mitad de la banda, sobre su alto.
  float grime = t2.a > 0.0 ? 1.0 - LOOK_GRIME.y * min(LOOK_GRIME.x, t2.a) * 0.5 / t2.a : 1.0;
  vec3 panel = mix(t2.rgb, t3.rgb, t3.a) * grime;
  float frameFrac = clamp(t1.a / t4.x + (t1.a / t4.y) * (t2.a > 0.0 ? 2.0 : 1.0), 0.0, 1.0);
  float glass = (1.0 - frameFrac) * (1.0 - panelFrac);
  float lit = glass * LOOK_LIT_SHARE * LOOK_LIT_MEAN * (t2.a > 0.0 ? 1.0 : 1.0 - t3.a);
  return lookGlassSurface(mix(mix(pane, panel, panelFrac), t1.rgb, frameFrac), glass, lit);
}
`;
