// PRUEBA DESECHABLE (spike): formas del Hespo rediseñado.
export type Punto = { x: number; y: number };
export type FormaCuerpo = 'huevo' | 'frijol' | 'gota';

const PUNTOS_CONTORNO = 28;
const signo = (v: number) => (v < 0 ? -1 : 1);

/** Curva cerrada suave que pasa por todos los puntos (Catmull-Rom convertido a Bézier cúbica). */
export function curvaCerrada(p: Punto[]): string {
  const n = p.length;
  let d = `M${p[0].x.toFixed(1)} ${p[0].y.toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n];
    const p1 = p[i];
    const p2 = p[(i + 1) % n];
    const p3 = p[(i + 2) % n];
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return `${d} Z`;
}

export type MedidasCuerpo = { forma: FormaCuerpo; ancho: number; alto: number; potencia: number; panza: number };

/**
 * Contorno del cuerpo alrededor de (0, 0), con temblor de cuerpo blando: el modo 2 lo ensancha
 * y aplana alternadamente; el modo 3 lo hace orgánico.
 */
export function contorno(m: MedidasCuerpo, temblor: number): Punto[] {
  return Array.from({ length: PUNTOS_CONTORNO }, (_, i) => {
    const t = (i / PUNTOS_CONTORNO) * 2 * Math.PI;
    const c = Math.cos(t);
    const s = Math.sin(t); // s > 0: mitad de abajo (y del SVG crece hacia abajo)
    const px = signo(c) * Math.abs(c) ** (2 / m.potencia);
    const py = signo(s) * Math.abs(s) ** (2 / m.potencia);
    let x = m.ancho * px * (1 + m.panza * s);
    const y = m.alto * py;
    if (m.forma === 'gota') x = m.ancho * 1.22 * px * ((1 + s) / 2) ** 0.5;
    const blando = 1 + temblor * (0.5 * Math.cos(2 * t) + 0.22 * Math.cos(3 * t + 1));
    return { x: x * blando, y: y * (2 - blando) };
  });
}

/**
 * Hoja con nervio curvo: sale de (0, 0) con `angulo` (radianes, 0 = derecha, −π/2 = arriba)
 * y se va doblando `curva` radianes hasta la punta. Devuelve el contorno y el nervio.
 */
export function hoja(largo: number, ancho: number, angulo: number, curva: number): { contorno: string; nervio: string } {
  const PASOS = 8;
  const espina: Punto[] = [{ x: 0, y: 0 }];
  for (let i = 1; i <= PASOS; i++) {
    const u = (i - 0.5) / PASOS;
    const a = angulo + curva * u;
    const prev = espina[i - 1];
    espina.push({ x: prev.x + (Math.cos(a) * largo) / PASOS, y: prev.y + (Math.sin(a) * largo) / PASOS });
  }
  const izquierda: Punto[] = [];
  const derecha: Punto[] = [];
  espina.forEach((p, i) => {
    const u = i / PASOS;
    const a = angulo + curva * u;
    const w = ancho * Math.sin(Math.PI * u) ** 0.75 * (u < 0.5 ? 1 : 1 - (u - 0.5) * 0.4);
    izquierda.push({ x: p.x + Math.cos(a - Math.PI / 2) * w, y: p.y + Math.sin(a - Math.PI / 2) * w });
    derecha.push({ x: p.x + Math.cos(a + Math.PI / 2) * w * 0.8, y: p.y + Math.sin(a + Math.PI / 2) * w * 0.8 });
  });
  const borde = [...izquierda, ...derecha.slice(1, -1).reverse()];
  const nervio = espina.slice(0, -1).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  return { contorno: curvaCerrada(borde), nervio };
}
