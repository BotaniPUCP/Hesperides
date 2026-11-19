import sharp from 'sharp';

// Photo-guided approximation. Coordinates refer to the original SKP in meters.
// The unseen elevations extend the same material vocabulary, not a surveyed layout.
const planes = [
  { a: [489.78, 617.25], b: [502.8, 616.28], material: 5, top: 109.45, maxZ: 109.45 },
  { a: [489.7646, 617.4679], b: [513.1935, 619.5926], material: 1, top: 134.64 },
  { a: [488.6314, 629.9941], b: [512.175, 630.8241], material: 1, top: 134.64 },
  { a: [447.9593, 598.3219], b: [486.3592, 598.3219], material: 2, top: 109.44 },
  { a: [447.9593, 606.0719], b: [486.3592, 606.0719], material: 2, top: 109.44 },
  { a: [442.1144, 633.7144], b: [470.4768, 628.7134], material: 2, top: 109.44 },
  { a: [440.77, 626.08], b: [469.13, 621.08], material: 2, top: 109.44 },
];

const rect = (x, y, w, h, fill) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
async function png(svg, width, height) {
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${svg}</svg>`)).png().toBuffer();
}
async function facade(accent) {
  let svg = rect(0, 0, 1280, 1536, '#c7ccca');
  for (let row = 0; row < 12; row++) for (let col = 0; col < 20; col++) {
    const x = col * 64, y = row * 128;
    const shade = ['#647779', '#798889', '#899592', '#586b70'][(col * 3 + row * 7) % 4];
    svg += rect(x + 3, y + 9, 58, 58, shade);
    svg += rect(x + 5, y + 11, 54, 13, '#a5b1ad');
    svg += rect(x + 3, y + 68, 58, 53, (col + row * 3) % 9 === 2 ? accent : '#cbd0cc');
    svg += rect(x, y, 3, 128, '#a7afac') + rect(x + 61, y, 3, 128, '#e0e3dc');
    svg += rect(x, y, 64, 6, '#475657') + rect(x, y + 6, 64, 3, '#dee2db');
    svg += rect(x + 3, y + 65, 58, 3, '#e0e3dc');
  }
  return png(svg, 1280, 1536);
}

export async function createNAppearance() {
  let concrete = rect(0, 0, 512, 256, '#c5bca8');
  for (let row = 0; row < 2; row++) for (let col = 0; col < 2; col++) {
    concrete += rect(col * 256, row * 128, 255, 127, (row + col) % 2 ? '#c9c0ad' : '#c6bca7');
    concrete += rect(col * 256, row * 128, 1, 128, '#a79e8b');
    concrete += rect(col * 256, row * 128, 256, 1, '#a79e8b');
    for (const x of [28, 228]) for (const y of [25, 103]) concrete += `<circle cx="${col * 256 + x}" cy="${row * 128 + y}" r="1.5" fill="#a69c87"/>`;
  }
  let glass = '';
  for (let row = 0; row < 12; row++) for (let col = 0; col < 20; col++) {
    glass += rect(col * 64, row * 128, 64, 128, '#3e5050');
    glass += rect(col * 64 + 2, row * 128 + 2, 60, 124, (row + col) % 3 ? '#748480' : '#8d9990');
  }
  const images = [await png(concrete, 512, 256), await facade('#24608b'), await facade('#963e3d'), await png(glass, 1280, 1536)];
  const materials = [
    { name: 'Concreto beige — referencia fotográfica', pbrMetallicRoughness: { baseColorTexture: { index: 0 }, roughnessFactor: 0.94, metallicFactor: 0 } },
    { name: 'Torre — vidrio, marcos y paneles azules', pbrMetallicRoughness: { baseColorTexture: { index: 1 }, roughnessFactor: 0.48, metallicFactor: 0.12 } },
    { name: 'Cuerpos bajos — vidrio y paneles rojos', pbrMetallicRoughness: { baseColorTexture: { index: 2 }, roughnessFactor: 0.48, metallicFactor: 0.12 } },
    { name: 'Cubiertas gris cálido', pbrMetallicRoughness: { baseColorFactor: [0.42, 0.43, 0.4, 1], roughnessFactor: 0.95, metallicFactor: 0 } },
    { name: 'Remates metálicos claros', pbrMetallicRoughness: { baseColorFactor: [0.64, 0.69, 0.68, 1], roughnessFactor: 0.65, metallicFactor: 0.2 } },
    { name: 'Atrio — paños de vidrio gris verdoso', pbrMetallicRoughness: { baseColorTexture: { index: 3 }, roughnessFactor: 0.35, metallicFactor: 0.15 } },
  ].map((m) => ({ ...m, doubleSided: true }));
  return {
    images, materials,
    face(face) {
      const points = face.rings[0];
      const minZ = Math.min(...points.map((p) => p[2])), maxZ = Math.max(...points.map((p) => p[2]));
      if (maxZ - minZ < 0.02) return { material: 3, uv: (p) => [p[0] / 5, p[1] / 5] };
      for (const plane of planes) {
        if (plane.maxZ && maxZ > plane.maxZ) continue;
        const dx = plane.b[0] - plane.a[0], dy = plane.b[1] - plane.a[1];
        const length = Math.hypot(dx, dy);
        const along = (p) => ((p[0] - plane.a[0]) * dx + (p[1] - plane.a[1]) * dy) / length;
        const distance = (p) => Math.abs((p[0] - plane.a[0]) * dy - (p[1] - plane.a[1]) * dx) / length;
        if (points.every((p) => distance(p) < 0.42 && along(p) > -0.1 && along(p) < length + 0.1)) {
          if (minZ >= plane.top - 0.02) return { material: 4, uv: () => [0, 0] };
          return { material: plane.material, uv: (p) => [along(p) / 24, 1 - (p[2] - 91.4397) / 43.2] };
        }
      }
      const first = points[0];
      const other = points.find((p) => Math.hypot(p[0] - first[0], p[1] - first[1]) > 0.01) ?? [first[0] + 1, first[1]];
      const dx = other[0] - first[0], dy = other[1] - first[1], length = Math.hypot(dx, dy);
      return { material: 0, uv: (p) => [(p[0] * dx + p[1] * dy) / length / 3.6, 1 - (p[2] - 91.4397) / 2.4] };
    },
  };
}
