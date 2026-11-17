// PRUEBA DESECHABLE (spike): resortes que convierten la intención en movimiento con inercia.
// Determinista: se integra siempre desde el cuadro 0 hasta el pedido.
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

export type EstadoSim = {
  x: number;
  /** Altura de los pies sobre el suelo, px de video. */
  h: number;
  brazoI: number;
  brazoD: number;
  /** Inclinación total en grados (intención + arrastre al caminar). */
  inclina: number;
  miradaX: number;
  miradaY: number;
  agachado: number;
  /** Deformación: + se estira, - se aplasta. */
  deforma: number;
  hojaI: number;
  hojaD: number;
  /** Caminata: fase y cuánto camina. */
  fase: number;
  w: number;
  ojos: Objetivo['ojos'];
  mano: Objetivo['mano'];
  /** Temblor del cuerpo blando (modo 2 y 3 del contorno). */
  temblor: number;
  /** Velocidad del brazo derecho en grados/s: para el smear. */
  velBrazoD: number;
  emocion: Emocion;
};

export function simular(frame: number): EstadoSim {
  const o0 = objetivo(0);
  const brazoI = { x: o0.brazoI, v: 0 };
  const brazoD = { x: o0.brazoD, v: 0 };
  const inclina = { x: 0, v: 0 };
  const arrastre = { x: 0, v: 0 };
  const mx = { x: 0, v: 0 };
  const my = { x: 0, v: 0 };
  const agachado = { x: 0, v: 0 };
  const deforma = { x: 0, v: 0 };
  const hojaI = { x: 0, v: 0 };
  const hojaD = { x: 0, v: 0 };
  const temblor = { x: 0, v: 0 };

  let vhAnterior = 0;
  let vxAnterior = 0;
  for (let f = 1; f <= frame; f++) {
    const o = objetivo(f);
    const vh = (altura(f) - altura(f - 1)) * 30;
    const vx = (caminata(f).x - caminata(f - 1).x) * 30;
    const dvh = vh - vhAnterior;
    const dvx = vx - vxAnterior;

    // Impactos: al aterrizar (venía cayendo) se aplasta; al despegar se estira.
    if (vhAnterior < -50 && dvh > 0) deforma.v -= dvh * 0.0011;
    else if (vhAnterior <= 50 && dvh > 0) deforma.v += dvh * 0.0007;
    // Las hojas, por inercia, se abren al caer y se cierran al subir; se quedan atrás al arrancar.
    // Cuerpo blando: cada impacto lo hace temblar como gelatina; los pasos, apenas.
    if (Math.abs(dvh) > 40) temblor.v += Math.abs(dvh) * 0.0032;
    seguir(temblor, 0, 900, 7);
    // Positivo = la hoja se abre hacia afuera (cada lado gira en sentido contrario al dibujarse).
    hojaI.v += dvh * 0.12 + dvx * 0.09;
    hojaD.v += dvh * 0.12 - dvx * 0.09;

    // Se estira mientras va rápido en vertical; se aplasta al agacharse.
    const estiraPorVelocidad = Math.min(0.2, Math.abs(vh) * 0.00016);
    seguir(deforma, estiraPorVelocidad - o.agachado * 0.16, 260, 9);
    seguir(brazoI, o.brazoI, 170, 13);
    seguir(brazoD, o.brazoD, 190, 13);
    seguir(inclina, o.inclina, 120, 12);
    // Arrastre: al acelerar se echa hacia atrás un instante y luego se inclina al avanzar.
    seguir(arrastre, vx * 0.03, 70, 9);
    seguir(mx, o.miradaX, 500, 40);
    seguir(my, o.miradaY, 500, 40);
    seguir(agachado, o.agachado, 320, 26);
    // Vaivén suave permanente; la hoja grande es más pesada y oscila más lento.
    seguir(hojaI, Math.sin(f / 17) * 3, 150, 5);
    seguir(hojaD, Math.sin((f - 7) / 19) * 3, 105, 4);

    vhAnterior = vh;
    vxAnterior = vx;
  }

  const o = objetivo(frame);
  const { fase, w, x } = caminata(frame);
  return {
    x,
    h: altura(frame),
    brazoI: brazoI.x,
    brazoD: brazoD.x,
    inclina: inclina.x + arrastre.x,
    miradaX: mx.x,
    miradaY: my.x,
    agachado: agachado.x,
    deforma: deforma.x,
    hojaI: hojaI.x,
    hojaD: hojaD.x,
    fase,
    w,
    ojos: o.ojos,
    mano: o.mano,
    temblor: temblor.x,
    velBrazoD: brazoD.v,
    emocion: emocion(frame),
  };
}
