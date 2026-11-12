import type { EscenaId, Frase, Guion } from './guion';

export const FPS = 30;
export const FRAMES_PAUSA = 8; // 0,25 s redondeado
export const FRAMES_TRANSICION = 18; // 0,6 s

export type Manifiesto = {
  voz: string;
  frases: Record<string, { archivo: string; duracion: number; texto: string }>;
};

export type TramoFrase = { frase: Frase; escenaId: EscenaId; desde: number; frames: number; archivo: string };
export type TramoEscena = { id: EscenaId; desde: number; frames: number; frases: TramoFrase[] };
export type Linea = { escenas: TramoEscena[]; framesTotales: number };

const TOLERANCIA = 1e-9;

/** Qué impide usar el audio actual: la voz, si cambió, y cada frase desactualizada. */
export function problemasDeVoz(guion: Guion, manifiesto: Manifiesto): string[] {
  const problemas: string[] = manifiesto.voz === guion.voz ? [] : [guion.voz];
  for (const { frases } of guion.escenas) {
    for (const frase of frases) {
      const audio = manifiesto.frases[frase.id];
      const texto = frase.textoVoz ?? frase.texto;
      if (!audio || audio.texto !== texto || !(audio.duracion > 0)) problemas.push(frase.id);
    }
  }
  return problemas;
}

export function construirLinea(guion: Guion, manifiesto: Manifiesto): Linea {
  const problemas = problemasDeVoz(guion, manifiesto);
  if (problemas.length > 0) throw new Error(`Voz desactualizada: ${problemas.join(', ')}`);

  let cursor = 0;
  let fin = 0;
  const escenas = guion.escenas.map(({ id, frases }) => {
    const desde = cursor;
    const tramos = frases.map((frase) => {
      const { archivo, duracion } = manifiesto.frases[frase.id];
      const frames = Math.ceil(duracion * FPS - TOLERANCIA);
      const tramo: TramoFrase = { frase, escenaId: id, desde: cursor, frames, archivo };
      fin = cursor + frames;
      cursor = fin + FRAMES_PAUSA;
      return tramo;
    });
    cursor = fin + FRAMES_TRANSICION;
    return { id, desde, frames: fin - desde, frases: tramos };
  });

  return { escenas, framesTotales: fin };
}

export async function comprobarAudios(linea: Linea, existe: (archivo: string) => Promise<boolean>): Promise<void> {
  const archivos = linea.escenas.flatMap((e) => e.frases.map((f) => f.archivo));
  const presentes = await Promise.all(archivos.map(existe));
  const faltantes = archivos.filter((_, i) => !presentes[i]);
  if (faltantes.length > 0) throw new Error(`Faltan audios: ${faltantes.join(', ')}`);
}

export function fraseActiva(linea: Linea, frame: number): TramoFrase | null {
  for (const escena of linea.escenas) {
    for (const tramo of escena.frases) {
      if (frame >= tramo.desde && frame < tramo.desde + tramo.frames) return tramo;
    }
  }
  return null;
}

export function framesClave(linea: Linea): { id: string; frame: number; momento: 'inicio' | 'mitad' | 'final' }[] {
  return linea.escenas.flatMap((e) =>
    e.frases.flatMap(({ frase, desde, frames }) => [
      { id: frase.id, frame: desde, momento: 'inicio' as const },
      { id: frase.id, frame: desde + Math.floor(frames / 2), momento: 'mitad' as const },
      { id: frase.id, frame: desde + frames - 1, momento: 'final' as const },
    ]),
  );
}
