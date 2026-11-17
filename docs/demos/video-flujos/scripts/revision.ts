// Lógica pura del bucle de revisión de fotogramas (scripts/revisar.ts): qué cuadros muestrear y
// cómo medir determinismo y parpadeo. Sin E/S, para poder probarla.
import { random } from 'remotion';
import type { Linea } from '../src/tiempos';

export type Clave = { id: string; fraccion: number };
export type Muestra = { frame: number; escena: string; tipo: 'inicio' | 'mitad' | 'final' | 'clave' | 'frase'; etiqueta: string };

/** Fracción entre `min` y `max` que cambia con cada corrida: así no se ajusta el video a cuadros fijos. */
export function fraccionRotada(corrida: number, clave: string, min = 0.25, max = 0.75): number {
  return min + (max - min) * random(`revision-${corrida}-${clave}`);
}

/** «h2:0.4,h10:0.47» → [{ id: 'h2', fraccion: 0.4 }, …]. */
export function leerClaves(texto: string): Clave[] {
  return texto
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [id, fraccion] = s.split(':');
      const f = Number(fraccion);
      if (!id || fraccion === undefined || !Number.isFinite(f)) throw new Error(`Momento clave mal escrito: «${s}» (se espera frase:fraccion)`);
      return { id, fraccion: f };
    });
}

/**
 * Cuadros a revisar: inicio, mitad (rotada) y final de cada escena, los momentos clave pedidos y,
 * con `porFrase`, un cuadro rotado dentro de cada frase. Ordenados y sin repetidos.
 */
export function muestrasDeRevision(linea: Linea, opciones: { corrida: number; claves: Clave[]; porFrase: boolean }): Muestra[] {
  const { corrida, claves, porFrase } = opciones;
  const muestras: Muestra[] = [];
  for (const e of linea.escenas) {
    const mitad = e.desde + Math.round(fraccionRotada(corrida, e.id) * (e.frames - 1));
    muestras.push({ frame: e.desde, escena: e.id, tipo: 'inicio', etiqueta: `${e.id} inicio` });
    muestras.push({ frame: mitad, escena: e.id, tipo: 'mitad', etiqueta: `${e.id} mitad` });
    muestras.push({ frame: e.desde + e.frames - 1, escena: e.id, tipo: 'final', etiqueta: `${e.id} final` });
    if (porFrase) {
      for (const t of e.frases) {
        const f = fraccionRotada(corrida, t.frase.id, 0.1, 0.9);
        muestras.push({ frame: t.desde + Math.round(f * (t.frames - 1)), escena: e.id, tipo: 'frase', etiqueta: `${t.frase.id}@${f.toFixed(2)}` });
      }
    }
  }
  const tramos = linea.escenas.flatMap((e) => e.frases.map((t) => ({ e, t })));
  for (const { id, fraccion } of claves) {
    const encontrado = tramos.find(({ t }) => t.frase.id === id);
    if (!encontrado) throw new Error(`No existe la frase ${id}`);
    const { e, t } = encontrado;
    muestras.push({ frame: t.desde + Math.round(fraccion * t.frames), escena: e.id, tipo: 'clave', etiqueta: `${id}@${fraccion}` });
  }
  // Un cuadro repetido se queda con la primera etiqueta, salvo que sea un momento clave.
  const porFrame = new Map<number, Muestra>();
  for (const m of muestras) {
    const previa = porFrame.get(m.frame);
    if (!previa || m.tipo === 'clave') porFrame.set(m.frame, m);
  }
  return [...porFrame.values()].sort((a, b) => a.frame - b.frame);
}

/** Píxeles (RGB) distintos entre dos imágenes del mismo tamaño. */
export function compararPixeles(a: Uint8Array, b: Uint8Array, canales = 3): { iguales: boolean; distintos: number } {
  if (a.length !== b.length) return { iguales: false, distintos: Math.max(a.length, b.length) / canales };
  let distintos = 0;
  for (let i = 0; i < a.length; i += canales) {
    for (let c = 0; c < canales; c++) {
      if (a[i + c] !== b[i + c]) {
        distintos++;
        break;
      }
    }
  }
  return { iguales: distintos === 0, distintos };
}

/**
 * Parpadeo entre dos cuadros (N y N+2 de un plano quieto): en una grilla de 16×9 celdas, la
 * proporción de píxeles cuyo canal más cambiado supera `umbral`/255. `global` es el promedio.
 */
export function metricaParpadeo(a: Uint8Array, b: Uint8Array, ancho: number, alto: number, umbral = 26, cols = 16, filas = 9): { global: number; peorCelda: number; celdas: number[] } {
  const cambian = new Array<number>(cols * filas).fill(0);
  const total = new Array<number>(cols * filas).fill(0);
  for (let y = 0; y < alto; y++) {
    const fila = Math.min(filas - 1, Math.floor((y * filas) / alto));
    for (let x = 0; x < ancho; x++) {
      const celda = fila * cols + Math.min(cols - 1, Math.floor((x * cols) / ancho));
      const i = (y * ancho + x) * 3;
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      total[celda]++;
      if (d > umbral) cambian[celda]++;
    }
  }
  const celdas = cambian.map((c, i) => (total[i] ? c / total[i] : 0));
  return { global: celdas.reduce((s, c) => s + c, 0) / celdas.length, peorCelda: Math.max(...celdas), celdas };
}
