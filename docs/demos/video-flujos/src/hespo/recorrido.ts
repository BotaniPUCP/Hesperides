import type { EscenaId, Pose } from '../guion';
import { SUELO_PAGINA, SUELO_Y } from '../tema';
import { FPS, type TramoEscena } from '../tiempos';
import { mezclar, POSES_HESPO, type Articulaciones } from './poses';

/** Por dónde camina en cada escena: sobre las pantallas reales no hay suelo dibujado. */
const SUELO: Record<EscenaId, number> = {
  inicio: SUELO_Y,
  especies: SUELO_PAGINA,
  ejemplares: SUELO_PAGINA,
  incidencias: SUELO_PAGINA,
  cierre: SUELO_Y,
  frecuencias: SUELO_PAGINA,
  planificacion: SUELO_PAGINA,
  reservas: SUELO_PAGINA,
  problema: SUELO_Y,
  presentacion: SUELO_Y,
  informacion: SUELO_PAGINA,
  reporte: SUELO_PAGINA,
  seguimiento: SUELO_PAGINA,
  final: SUELO_Y,
  manana: SUELO_Y,
  hoy: SUELO_Y,
  aparece: SUELO_Y,
  solucion: SUELO_Y,
  resultado: SUELO_Y,
};

/** Posición de Hespo al empezar cada escena: entra desde fuera de cuadro. */
export const ENTRADA_X = -220;

const PX_POR_FRAME = 420 / FPS;
const PX_POR_FRAME_EN_SALTO = 900 / FPS;
const FRACCION_MAXIMA_DE_VIAJE = 0.8;
const FRAMES_MEZCLA = 6;
const FRAMES_MINIMOS_DE_SALTO = 12;
const ALTURA_BASE_DE_SALTO = 70;
const PERIODO_PASO = 14;
const PERIODO_SALUDO = 18;
const PERIODO_ASENTIR = 24;

export type EstadoHespo = {
  x: number;
  y: number;
  mira: 1 | -1;
  caminando: boolean;
  pose: Pose;
  articulaciones: Articulaciones;
};

/** Un desplazamiento: desde cuándo vale su pose, cuándo sale y hasta cuándo puede tardar. */
type Movimiento = { fraseId: string; paso: number; poseDesde: number; inicio: number; limite: number; x: number; y: number; pose: Pose };

/** Un movimiento ya resuelto: de dónde parte y cuánto tarda. */
type Viaje = Movimiento & { desdeX: number; desdeY: number; frames: number; llegada: number; salta: boolean };

const onda = (frame: number, periodo: number) => Math.sin((2 * Math.PI * frame) / periodo);

function movimientos(escena: TramoEscena): Movimiento[] {
  return escena.frases.flatMap(({ frase, desde, frames }) => {
    const { espera = 0, luego = [], ...primero } = frase.hespo;
    const enFrame = (fraccion: number) => desde + Math.round(fraccion * frames);
    const pasos = [{ ...primero, en: espera }, ...luego];
    return pasos.map((paso, i) => ({
      fraseId: frase.id,
      paso: i,
      poseDesde: i === 0 ? desde : enFrame(paso.en),
      inicio: enFrame(paso.en),
      limite: i + 1 < pasos.length ? enFrame(pasos[i + 1].en) : desde + frames,
      x: paso.x,
      y: paso.y ?? SUELO[escena.id],
      pose: paso.pose,
    }));
  });
}

function caminata(frame: number): Articulaciones {
  const paso = onda(frame, PERIODO_PASO);
  return {
    piernaI: paso * 24,
    piernaD: -paso * 24,
    brazoI: -paso * 18,
    brazoD: paso * 18,
    inclina: 3,
    saltoY: -Math.abs(paso) * 6,
    mirada: 12,
  };
}

function conVida(a: Articulaciones, pose: Pose, frame: number): Articulaciones {
  if (pose === 'saluda') return { ...a, brazoD: a.brazoD + onda(frame, PERIODO_SALUDO) * 16 };
  if (pose === 'asiente') return { ...a, inclina: a.inclina + onda(frame, PERIODO_ASENTIR) * 4 };
  return a;
}

function viajes(escena: TramoEscena): Viaje[] {
  let x = ENTRADA_X;
  let y = SUELO[escena.id];
  return movimientos(escena).map((m) => {
    const distancia = Math.hypot(m.x - x, m.y - y);
    const salta = m.y !== y;
    const deseado = Math.ceil(distancia / (salta ? PX_POR_FRAME_EN_SALTO : PX_POR_FRAME));
    const tope = Math.floor((m.limite - m.inicio) * FRACCION_MAXIMA_DE_VIAJE);
    const frames = distancia === 0 ? 0 : Math.min(salta ? Math.max(deseado, FRAMES_MINIMOS_DE_SALTO) : deseado, tope);
    const viaje = { ...m, desdeX: x, desdeY: y, frames, llegada: m.inicio + frames, salta };
    x = m.x;
    y = m.y;
    return viaje;
  });
}

/** El fotograma en que Hespo termina un movimiento: lo que pulsa reacciona a partir de ahí. */
export function llegadaDe(escena: TramoEscena, fraseId: string, paso = 0): number {
  const viaje = viajes(escena).find((v) => v.fraseId === fraseId && v.paso === paso);
  if (!viaje) throw new Error(`La frase ${fraseId} no tiene el movimiento ${paso}`);
  return viaje.llegada;
}

/** Todo sale del fotograma: renderizar dos veces da el mismo resultado. */
/** La línea por la que camina Hespo en una escena. */
export function sueloDe(id: EscenaId): number {
  return SUELO[id];
}

export function estadoHespo(escena: TramoEscena, frame: number): EstadoHespo {
  let x = ENTRADA_X;
  let y = SUELO[escena.id];
  let mira: 1 | -1 = 1;
  let poseAnterior: Pose = 'quieto';
  const lista = viajes(escena);

  for (let i = 0; i < lista.length; i++) {
    const v = lista[i];
    const siguiente = lista[i + 1];
    if (frame < v.poseDesde) break;

    const dx = v.x - v.desdeX;
    const dy = v.y - v.desdeY;
    const miraAlViajar: 1 | -1 = dx === 0 ? mira : dx > 0 ? 1 : -1;

    if (siguiente && frame >= siguiente.poseDesde) {
      mira = v.frames > 0 ? miraAlViajar : mira;
      x = v.x;
      y = v.y;
      poseAnterior = v.pose;
      continue;
    }

    if (v.frames > 0 && frame >= v.inicio && frame < v.llegada) {
      const t = (frame - v.inicio) / v.frames;
      const arco = v.salta ? (ALTURA_BASE_DE_SALTO + Math.abs(dy) * 0.15) * 4 * t * (1 - t) : 0;
      return {
        x: v.desdeX + dx * t,
        y: v.desdeY + dy * t - arco,
        mira: miraAlViajar,
        caminando: true,
        pose: v.pose,
        articulaciones: v.salta ? { ...POSES_HESPO.salta, saltoY: 0 } : caminata(frame),
      };
    }

    const yaLlego = v.frames === 0 || frame >= v.llegada;
    const recienLlegado = v.frames > 0 && yaLlego;
    const origen = POSES_HESPO[recienLlegado ? 'quieto' : poseAnterior];
    const desde = recienLlegado ? v.llegada : v.poseDesde;
    const avance = Math.min(1, (frame - desde) / FRAMES_MEZCLA);
    return {
      x: yaLlego ? v.x : v.desdeX,
      y: yaLlego ? v.y : v.desdeY,
      mira: recienLlegado ? miraAlViajar : mira,
      caminando: false,
      pose: v.pose,
      articulaciones: conVida(mezclar(origen, POSES_HESPO[v.pose], avance), v.pose, frame),
    };
  }

  return { x, y, mira, caminando: false, pose: 'quieto', articulaciones: POSES_HESPO.quieto };
}

/** 1 con los ojos abiertos, 0 cerrados. */
export function parpadeo(frame: number): number {
  return (frame + 23) % 96 < 4 ? 0 : 1;
}
