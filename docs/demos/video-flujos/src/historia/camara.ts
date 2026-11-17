// Cámara virtual de la historia (al estilo de Portals): acercamientos lentos, banco de ±1°, vaivén
// suave, encuadres con peso en campana y un tope de velocidad de giro, zoom y paneo.
// Determinista: cada plano se integra desde su primer cuadro hasta el pedido.
import { random } from 'remotion';
import { ESPERA_BROTE } from '../hespo2d/semillaEnGuion';
import type { Linea, TramoEscena } from '../tiempos';
import { momentoDe } from '../ui/anim';
import { corrimientoManana, fraccionesH10, LAPTOP_SOLUCION, pinEnVideo, SELLO, SUELO, X_ARBOL, X_ARBOL_MANANA, X_BROTE } from './posiciones';

export const ANCHO_CUADRO = 1920;
export const ALTO_CUADRO = 940;
const CENTRO = { x: ANCHO_CUADRO / 2, y: ALTO_CUADRO / 2 };

/** Topes por cuadro: giro en grados, zoom en logaritmo (≈ proporción) y paneo en px de escena. */
export const LIMITES = { giro: 0.05, zoom: 0.006, paneo: 8 } as const;

/** Punto de la escena que queda al centro del cuadro, zoom y giro (grados). */
export type Toma = { x: number; y: number; zoom: number; giro: number };
export type Objetivo = { centro: number; ancho: number; x: number; y: number; zoom: number };
export type Plano = {
  desde: number;
  hasta: number;
  base: { x: number; y: number; zoom: number };
  /** Cuánto crece el zoom a lo largo del plano (acercamiento lento). */
  empuje: number;
  /** Amplitud del banco, en grados. */
  banco: number;
  semilla: string;
  objetivos: Objetivo[];
};

const REPOSO: Toma = { x: CENTRO.x, y: CENTRO.y, zoom: 1, giro: 0 };
/** Cuánto pesa la base frente a los objetivos: con un objetivo en su pico, la cámara va ~87 % hacia él. */
const PESO_BASE = 0.15;

/** Zoom mínimo para que un cuadro girado `giro` grados no deje ver los bordes de la escena. */
export function zoomParaCubrir(giro: number): number {
  const r = (Math.abs(giro) * Math.PI) / 180;
  return Math.cos(r) + (ANCHO_CUADRO / ALTO_CUADRO) * Math.sin(r);
}

const suave = (p: number) => p * p * (3 - 2 * p);

/** Lo que la cámara quiere en un cuadro, antes de limitar la velocidad. */
function deseada(p: Plano, f: number): Toma {
  const avance = suave(Math.min(1, Math.max(0, (f - p.desde) / Math.max(1, p.hasta - p.desde))));
  const empuje = 1 + p.empuje * avance;
  let peso = PESO_BASE;
  let x = PESO_BASE * p.base.x;
  let y = PESO_BASE * p.base.y;
  let lz = PESO_BASE * Math.log(p.base.zoom);
  for (const o of p.objetivos) {
    const w = Math.exp(-0.5 * ((f - o.centro) / o.ancho) ** 2);
    peso += w;
    x += w * o.x;
    y += w * o.y;
    lz += w * Math.log(o.zoom);
  }
  const fase = (eje: string) => random(`camara-${p.semilla}-${eje}`) * Math.PI * 2;
  const t = f - p.desde;
  return {
    x: x / peso + 5 * Math.sin((2 * Math.PI * t) / 210 + fase('x')),
    y: y / peso + 3 * Math.sin((2 * Math.PI * t) / 170 + fase('y')),
    zoom: Math.exp(lz / peso) * empuje,
    giro: p.banco * Math.sin((2 * Math.PI * t) / 270 + fase('g')),
  };
}

const tope = (v: number, m: number) => Math.max(-m, Math.min(m, v));

/** Ajusta zoom y centro para que el cuadro siempre caiga dentro de la escena. */
function encuadrar(t: Toma): Toma {
  const r = (Math.abs(t.giro) * Math.PI) / 180;
  const zoom = Math.max(t.zoom, zoomParaCubrir(t.giro));
  const ex = ((ANCHO_CUADRO / 2) * Math.cos(r) + (ALTO_CUADRO / 2) * Math.sin(r)) / zoom;
  const ey = ((ANCHO_CUADRO / 2) * Math.sin(r) + (ALTO_CUADRO / 2) * Math.cos(r)) / zoom;
  return {
    x: Math.min(ANCHO_CUADRO - ex, Math.max(ex, t.x)),
    y: Math.min(ALTO_CUADRO - ey, Math.max(ey, t.y)),
    zoom,
    giro: t.giro,
  };
}

/** La toma de la cámara en un cuadro: busca su plano e integra con velocidad limitada. */
export function camaraEn(planos: Plano[], frame: number): Toma {
  const p = planos.find((x) => frame >= x.desde && frame < x.hasta);
  if (!p) return REPOSO;
  const s = { ...deseada(p, p.desde) };
  for (let f = p.desde + 1; f <= frame; f++) {
    const d = deseada(p, f);
    const dx = d.x - s.x;
    const dy = d.y - s.y;
    const largo = Math.hypot(dx, dy);
    const k = largo > LIMITES.paneo ? LIMITES.paneo / largo : 1;
    s.x += dx * k;
    s.y += dy * k;
    s.zoom *= Math.exp(tope(Math.log(d.zoom / s.zoom), LIMITES.zoom));
    s.giro += tope(d.giro - s.giro, LIMITES.giro);
  }
  return encuadrar(s);
}

/** Transformación CSS (origen arriba a la izquierda) que lleva la escena a la toma. */
export function transformarToma(t: Toma): string {
  return `translate(${CENTRO.x}px, ${CENTRO.y}px) rotate(${t.giro}deg) scale(${t.zoom}) translate(${-t.x}px, ${-t.y}px)`;
}

function escena(linea: Linea, id: string): TramoEscena {
  const e = linea.escenas.find((x) => x.id === id);
  if (!e) throw new Error(`Falta la escena ${id}`);
  return e;
}

/** Los planos de la historia: uno por toma, cada uno con sus acercamientos. */
export function planosDeHistoria(linea: Linea, cola = 0): Plano[] {
  const manana = escena(linea, 'manana');
  const hoy = escena(linea, 'hoy');
  const aparece = escena(linea, 'aparece');
  const solucion = escena(linea, 'solucion');
  const resultado = escena(linea, 'resultado');
  const fin = linea.framesTotales + cola;
  const base = { x: CENTRO.x, y: CENTRO.y, zoom: 1.04 };

  const h2 = momentoDe(manana, 'h2', 0.55);
  const brote = aparece.desde + ESPERA_BROTE;
  const pin = pinEnVideo();
  const cae = momentoDe(solucion, 'h10', fraccionesH10.cae);
  const sello = momentoDe(solucion, 'h10', fraccionesH10.sello);
  const cortes = [
    0,
    hoy.desde,
    momentoDe(hoy, 'h4'),
    momentoDe(hoy, 'h5'),
    aparece.desde,
    solucion.desde,
    momentoDe(solucion, 'h8'),
    momentoDe(solucion, 'h10'),
    resultado.desde,
    momentoDe(resultado, 'h12'),
    fin,
  ];
  const plano = (i: number, semilla: string, extra: Partial<Plano>): Plano => ({ desde: cortes[i], hasta: cortes[i + 1], base, empuje: 0.04, banco: 0.8, semilla, objetivos: [], ...extra });
  return [
    // Mañana: el paneo ya lo hace el decorado; la cámara se acerca a la rama rajada cuando aparece el aviso.
    plano(0, 'manana', {
      objetivos: [{ centro: h2, ancho: 45, x: X_ARBOL_MANANA - corrimientoManana(manana, h2) - 200, y: SUELO - 420, zoom: 1.16 }],
    }),
    // h3: acercamiento al celular mientras llueven los mensajes.
    plano(1, 'h3', { empuje: 0.03, objetivos: [{ centro: momentoDe(hoy, 'h3', 0.85), ancho: 60, x: 1020, y: 460, zoom: 1.1 }] }),
    // h4: del jefe a lo que imagina.
    plano(2, 'h4', { empuje: 0.05, objetivos: [{ centro: momentoDe(hoy, 'h4', 0.8), ancho: 40, x: 560, y: 380, zoom: 1.12 }] }),
    plano(3, 'h5', { empuje: 0.03 }),
    // Brote: la cámara busca el suelo donde aparece Hespo y vuelve a abrir.
    plano(4, 'aparece', { objetivos: [{ centro: brote + 8, ancho: 22, x: X_BROTE, y: SUELO - 200, zoom: 1.14 }] }),
    // h7: acercamiento al celular de Don Julio.
    plano(5, 'h7', { empuje: 0.02, objetivos: [{ centro: momentoDe(solucion, 'h7', 0.7), ancho: 50, x: 1060, y: 460, zoom: 1.12 }] }),
    // h8-h9: a la laptop y luego al pin del mapa.
    plano(6, 'h8', {
      empuje: 0.03,
      objetivos: [
        { centro: momentoDe(solucion, 'h8', 0.6), ancho: 50, x: LAPTOP_SOLUCION.x - 180, y: 440, zoom: 1.08 },
        { centro: momentoDe(solucion, 'h9', 0.32), ancho: 22, x: pin.x, y: pin.y, zoom: 1.2 },
        // Vuelve a abrir para la tarjeta «Activada».
        { centro: momentoDe(solucion, 'h9', 0.85), ancho: 40, x: CENTRO.x, y: CENTRO.y, zoom: 1.0 },
      ],
    }),
    // h10: la rama que cae y el sello.
    plano(7, 'h10', {
      objetivos: [
        { centro: cae, ancho: 20, x: X_ARBOL - 300, y: SUELO - 260, zoom: 1.12 },
        { centro: sello + 14, ancho: 22, x: SELLO.x, y: SELLO.y + 80, zoom: 1.12 },
      ],
    }),
    // h11: acercamiento lento a la laptop con el campus en verde.
    plano(8, 'h11', { empuje: 0.03, objetivos: [{ centro: momentoDe(resultado, 'h11', 0.7), ancho: 60, x: 1000, y: 400, zoom: 1.06 }] }),
    // h12: cierre casi quieto.
    plano(9, 'h12', { empuje: 0.03, banco: 0.5 }),
  ];
}
