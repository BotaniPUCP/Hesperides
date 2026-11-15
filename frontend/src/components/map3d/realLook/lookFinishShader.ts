/**
 * GLSL del grano de cada acabado (SPEC-112 D-17): la misma cuenta que
 * `finishGrain.ts`. Devuelve (shade, height). Usa `lookBox`, `lookDetail` y
 * `lookCellHash`, y las medidas de `FINISH_GLSL`.
 */
export const LOOK_FINISH_GLSL = /* glsl */ `
// Piezas con juntas: cuánto del píxel es pieza en cada eje, fundido en la proporción de pieza de lejos.
vec2 lookPieceCover(vec2 p, vec2 size, float joint, vec2 aa) {
  float hj = joint * 0.5;
  float inX = mix(1.0 - joint / size.x, lookBox(mod(p.x, size.x), hj, size.x - hj, aa.x), lookDetail(aa.x, size.x));
  float inY = mix(1.0 - joint / size.y, lookBox(mod(p.y, size.y), hj, size.y - hj, aa.y), lookDetail(aa.y, size.y));
  return vec2(inX, inY);
}

// Ladrillo o concreto: piezas con su tono, juntas más oscuras y hundidas; shift corre las hiladas impares.
vec2 lookTiled(vec2 size, float joint, float vary, float jointShade, float relief, vec2 p, vec2 aa, float seed, float shift) {
  float row = floor(p.y / size.y);
  float x = p.x + mod(row, 2.0) * shift;
  vec2 c = lookPieceCover(vec2(x, p.y), size, joint, aa);
  float piece = c.x * c.y;
  float near = min(lookDetail(aa.x, size.x), lookDetail(aa.y, size.y));
  float h = lookCellHash(vec2(floor(x / size.x), row), seed + LOOK_GRAIN_SEED).y;
  float tone = 1.0 + vary * (2.0 * h - 1.0) * lookDetail(aa.x, size.x);
  float fill = (1.0 - joint / size.x) * (1.0 - joint / size.y);
  return vec2(mix(jointShade, tone, piece) / mix(jointShade, 1.0, fill), (piece - 1.0) * relief * near);
}

// Engrapes verticales: una franja clara y en relieve cada tanto.
vec2 lookSeams(float u, vec2 aa) {
  float every = LOOK_METAL.x, width = LOOK_METAL.y, hw = width * 0.5;
  float d = lookDetail(aa.x, every);
  float seam = mix(width / every, 1.0 - lookBox(mod(u, every), hw, every - hw, aa.x), d);
  float mean = mix(1.0, LOOK_METAL.z, width / every);
  return vec2(mix(1.0, LOOK_METAL.z, seam) / mean, seam * LOOK_METAL.w * d);
}

// Manchas suaves: ruido de valor sobre celdas, interpolado sin bordes.
vec2 lookMottle(vec2 p, vec2 aa, float seed) {
  vec2 g = p / LOOK_PLASTER.x;
  vec2 i = floor(g);
  vec2 s = smoothstep(0.0, 1.0, g - i);
  float k = seed + LOOK_GRAIN_SEED;
  float h00 = lookCellHash(i, k).y, h10 = lookCellHash(i + vec2(1.0, 0.0), k).y;
  float h01 = lookCellHash(i + vec2(0.0, 1.0), k).y, h11 = lookCellHash(i + vec2(1.0, 1.0), k).y;
  float n = mix(mix(h00, h10, s.x), mix(h01, h11, s.x), s.y);
  float d = min(lookDetail(aa.x, LOOK_PLASTER.x), lookDetail(aa.y, LOOK_PLASTER.x));
  return vec2(1.0 + LOOK_PLASTER.y * (2.0 * n - 1.0) * d, 0.0);
}

// Un techo (semilla negativa) no lleva grano: sus coordenadas no son las de una fachada.
vec2 lookGrain(float finish, vec2 p, vec2 aa, float seed) {
  if (seed < 0.0) return vec2(1.0, 0.0);
  if (finish == LOOK_FINISH_BRICK) {
    return lookTiled(vec2(LOOK_BRICK.y, LOOK_BRICK.x), LOOK_BRICK.z, LOOK_BRICK.w, LOOK_BRICK_MORTAR, LOOK_BRICK_RELIEF, p, aa, seed, LOOK_BRICK.y * 0.5);
  }
  if (finish == LOOK_FINISH_CONCRETE) {
    return lookTiled(LOOK_CONCRETE.xy, LOOK_CONCRETE.z, LOOK_CONCRETE.w, LOOK_CONCRETE_JOINT, LOOK_CONCRETE_RELIEF, p, aa, seed, 0.0);
  }
  if (finish == LOOK_FINISH_METAL) return lookSeams(p.x, aa);
  if (finish == LOOK_FINISH_PLASTER) return lookMottle(p, aa, seed);
  return vec2(1.0, 0.0);
}
`;
