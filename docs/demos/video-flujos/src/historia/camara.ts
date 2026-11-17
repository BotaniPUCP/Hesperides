// Cámara de la historia: QUIETA por defecto. Solo hay unos pocos acercamientos deliberados en los
// golpes clave: un zoom lento hacia el objetivo (con el corrimiento justo para centrarlo), una vez
// por toma, y después se sostiene. Sin vaivén, sin banco, sin paneos de relleno.
import { Easing } from 'remotion';
import { ESPERA_BROTE } from '../hespo2d/semillaEnGuion';
import type { Linea, TramoEscena } from '../tiempos';
import { momentoDe } from '../ui/anim';
import { fraccionesH10 } from './posiciones';

export const ANCHO_CUADRO = 1920;
export const ALTO_CUADRO = 940;
const CENTRO = { x: ANCHO_CUADRO / 2, y: ALTO_CUADRO / 2 };

/** Topes por cuadro dentro de un acercamiento: zoom en logaritmo (≈ proporción) y paneo en px. */
export const LIMITES = { zoom: 0.006, paneo: 12 } as const;

/** Punto de la escena que queda al centro del cuadro, zoom y giro (grados; siempre 0). */
export type Toma = { x: number; y: number; zoom: number; giro: number };
/** Acercamiento: desde `inicio`, en `duracion` cuadros, hasta centrar (x, y) con `zoom`. */
export type Empuje = { inicio: number; duracion: number; x: number; y: number; zoom: number };
export type Plano = { desde: number; hasta: number; empuje?: Empuje };

const REPOSO: Toma = { x: CENTRO.x, y: CENTRO.y, zoom: 1, giro: 0 };
/** Arranque y llegada suaves, sin rebote. */
const curva = Easing.bezier(0.45, 0, 0.2, 1);

/** Ajusta el centro para que el cuadro siempre caiga dentro de la escena. */
function encuadrar(t: Toma): Toma {
  const ex = ANCHO_CUADRO / 2 / t.zoom;
  const ey = ALTO_CUADRO / 2 / t.zoom;
  return { x: Math.min(ANCHO_CUADRO - ex, Math.max(ex, t.x)), y: Math.min(ALTO_CUADRO - ey, Math.max(ey, t.y)), zoom: t.zoom, giro: 0 };
}

/** La toma en un cuadro: reposo, el acercamiento de su plano, o el acercamiento sostenido. */
export function camaraEn(planos: Plano[], frame: number): Toma {
  const p = planos.find((x) => frame >= x.desde && frame < x.hasta);
  if (!p?.empuje) return REPOSO;
  const e = p.empuje;
  const k = curva(Math.min(1, Math.max(0, (frame - e.inicio) / e.duracion)));
  if (k === 0) return REPOSO;
  return encuadrar({
    x: CENTRO.x + (e.x - CENTRO.x) * k,
    y: CENTRO.y + (e.y - CENTRO.y) * k,
    zoom: Math.exp(Math.log(e.zoom) * k),
    giro: 0,
  });
}

/** Transformación CSS (origen arriba a la izquierda) que lleva la escena a la toma. */
export function transformarToma(t: Toma): string {
  return `translate(${CENTRO.x}px, ${CENTRO.y}px) scale(${t.zoom}) translate(${-t.x}px, ${-t.y}px)`;
}

function escena(linea: Linea, id: string): TramoEscena {
  const e = linea.escenas.find((x) => x.id === id);
  if (!e) throw new Error(`Falta la escena ${id}`);
  return e;
}

/** Los planos de la historia: uno por toma; solo los golpes clave tienen acercamiento. */
export function planosDeHistoria(linea: Linea, cola = 0): Plano[] {
  const manana = escena(linea, 'manana');
  const hoy = escena(linea, 'hoy');
  const aparece = escena(linea, 'aparece');
  const solucion = escena(linea, 'solucion');
  const resultado = escena(linea, 'resultado');
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
    linea.framesTotales + cola,
  ];
  // Los `y` dejan ver el sendero entero: el borde inferior del cuadro queda bajo los pies.
  const empujes: (Empuje | undefined)[] = [
    // La rama rajada, cuando aparece el aviso.
    { inicio: momentoDe(manana, 'h2', 0.42), duracion: 60, x: 1150, y: 476, zoom: 1.12 },
    // El celular, cuando empiezan a llover los mensajes (los pies de Don Julio están en 910).
    { inicio: momentoDe(hoy, 'h3', 0.42), duracion: 60, x: 1000, y: 500, zoom: 1.08 },
    undefined,
    undefined,
    // Hespo brota.
    { inicio: aparece.desde + ESPERA_BROTE + 12, duracion: 50, x: 900, y: 470, zoom: 1.1 },
    // El celular de Don Julio.
    { inicio: momentoDe(solucion, 'h7', 0.3), duracion: 60, x: 1000, y: 470, zoom: 1.08 },
    // El mapa: hacia la laptop sin dejar fuera al jefe.
    { inicio: momentoDe(solucion, 'h9', 0.2), duracion: 60, x: 1000, y: 476, zoom: 1.08 },
    // El sello «Cerrada».
    { inicio: momentoDe(solucion, 'h10', fraccionesH10.sello), duracion: 50, x: 960, y: 470, zoom: 1.07 },
    // El campus en verde en la laptop.
    { inicio: momentoDe(resultado, 'h11', 0.2), duracion: 70, x: 960, y: 470, zoom: 1.05 },
    undefined,
  ];
  return empujes.map((empuje, i) => ({ desde: cortes[i], hasta: cortes[i + 1], empuje }));
}
