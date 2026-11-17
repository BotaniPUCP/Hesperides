// Resortes que convierten la intención de Hespo en movimiento con inercia.
// Determinista: se integra siempre desde el inicio del tramo hasta el cuadro pedido.
import { altura, caminata, emocion, objetivo, type Emocion, type Objetivo } from './coreografia';

type Resorte = { x: number; v: number };
const SUBPASOS = 4;
const DT = 1 / 30 / SUBPASOS;

function seguir(r: Resorte, meta: number, k: number, c: number) {
  for (let i = 0; i < SUBPASOS; i++) {
    r.v += (-k * (r.x - meta) - c * r.v) * DT;
    r.x += r.v * DT;
  }
}

/** Lo que Hespo quiere en un cuadro: posición directa más metas que los resortes siguen. */
export type Meta = {
  x: number;
  /** Altura de los pies sobre el suelo, px de video. */
  h: number;
  brazoI: number;
  brazoD: number;
  inclina: number;
  miradaX: number;
  miradaY: number;
  agachado: number;
  fase: number;
  w: number;
  ojos: Objetivo['ojos'];
  mano: Objetivo['mano'];
  emocion: Emocion;
};

export type EstadoSim = Omit<Meta, 'agachado'> & {
  agachado: number;
  /** Deformación: + se estira, - se aplasta. */
  deforma: number;
  hojaI: number;
  hojaD: number;
  /** Temblor del cuerpo blando. */
  temblor: number;
  /** Velocidad del brazo derecho en grados/s: para el smear. */
  velBrazoD: number;
};

/** Integra los resortes de `desde` a `hasta` siguiendo `metaEn(f)`. */
export function integrar(metaEn: (f: number) => Meta, desde: number, hasta: number): EstadoSim {
  const m0 = metaEn(desde);
  const brazoI = { x: m0.brazoI, v: 0 };
  const brazoD = { x: m0.brazoD, v: 0 };
  const inclina = { x: m0.inclina, v: 0 };
  const arrastre = { x: 0, v: 0 };
  const mx = { x: m0.miradaX, v: 0 };
  const my = { x: m0.miradaY, v: 0 };
  const agachado = { x: m0.agachado, v: 0 };
  const deforma = { x: 0, v: 0 };
  const hojaI = { x: 0, v: 0 };
  const hojaD = { x: 0, v: 0 };
  const temblor = { x: 0, v: 0 };

  let anterior = m0;
  let vhAnterior = 0;
  let vxAnterior = 0;
  for (let f = desde + 1; f <= hasta; f++) {
    const m = metaEn(f);
    const vh = (m.h - anterior.h) * 30;
    const vx = (m.x - anterior.x) * 30;
    const dvh = vh - vhAnterior;
    const dvx = vx - vxAnterior;

    // Impactos: al aterrizar (venía cayendo) se aplasta; al despegar se estira.
    if (vhAnterior < -50 && dvh > 0) deforma.v -= dvh * 0.0011;
    else if (vhAnterior <= 50 && dvh > 0) deforma.v += dvh * 0.0007;
    // Cuerpo blando: cada impacto lo hace temblar como gelatina.
    if (Math.abs(dvh) > 40) temblor.v += Math.abs(dvh) * 0.0032;
    seguir(temblor, 0, 900, 7);
    // Hojas: se abren al caer y quedan atrás al arrancar (positivo = hacia afuera).
    hojaI.v += dvh * 0.12 + dvx * 0.09;
    hojaD.v += dvh * 0.12 - dvx * 0.09;

    const estiraPorVelocidad = Math.min(0.2, Math.abs(vh) * 0.00016);
    seguir(deforma, estiraPorVelocidad - m.agachado * 0.16, 260, 9);
    seguir(brazoI, m.brazoI, 170, 13);
    seguir(brazoD, m.brazoD, 190, 13);
    seguir(inclina, m.inclina, 120, 12);
    // Arrastre: al acelerar se echa hacia atrás un instante y luego se inclina al avanzar.
    seguir(arrastre, Math.max(-600, Math.min(600, vx)) * 0.03, 70, 9);
    seguir(mx, m.miradaX, 500, 40);
    seguir(my, m.miradaY, 500, 40);
    seguir(agachado, m.agachado, 320, 26);
    seguir(hojaI, Math.sin(f / 17) * 3, 150, 5);
    seguir(hojaD, Math.sin((f - 7) / 19) * 3, 105, 4);

    anterior = m;
    vhAnterior = vh;
    vxAnterior = vx;
  }

  const m = metaEn(hasta);
  return {
    ...m,
    brazoI: brazoI.x,
    brazoD: brazoD.x,
    inclina: inclina.x + arrastre.x,
    miradaX: mx.x,
    miradaY: my.x,
    agachado: agachado.x,
    deforma: deforma.x,
    hojaI: hojaI.x,
    hojaD: hojaD.x,
    temblor: temblor.x,
    velBrazoD: brazoD.v,
  };
}

/** La demo de 10 s: la coreografía fija de coreografia.ts. */
function metaDemo(f: number): Meta {
  const o = objetivo(f);
  const { fase, w, x } = caminata(f);
  return { ...o, x, h: altura(f), fase, w, emocion: emocion(f) };
}

export function simular(frame: number): EstadoSim {
  return integrar(metaDemo, 0, frame);
}
