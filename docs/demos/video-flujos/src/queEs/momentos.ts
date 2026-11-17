// Los momentos clave del video «¿Qué es Hesperides?», en un solo lugar: las escenas los dibujan y
// los efectos de sonido suenan en el mismo cuadro.
import { ESPERA_BROTE } from '../hespo2d/semillaEnGuion';
import { fraseActiva, type Linea } from '../tiempos';

/** Frase y fracción de la frase. */
export type Momento = readonly [fraseId: string, fraccion: number];

export const MOMENTOS = {
  /** Don Julio envía el reporte desde el celular. */
  enviar: ['q19', 0.35],
  /** Lucía pulsa «Aprobar registro». */
  aprobar: ['q22', 0.32],
  /** Lucía elige la cuadrilla. */
  cuadrilla: ['q22', 0.62],
  /** El globo brota sobre el jardín (golpe). */
  globoAparece: ['q32', 0.5],
  /** El sello «Cerrada» cae (golpe). */
  sello: ['q37', 0.62],
  /** El globo se va del mapa (golpe suave). */
  globoSeVa: ['q38', 0.12],
  /** Las hojas de cálculo empiezan a caer. */
  hojas: ['q15', 0],
} as const satisfies Record<string, Momento>;

/** Cuadros entre una hoja de cálculo y la siguiente. */
export const CUADROS_ENTRE_HOJAS = 7;
export const HOJAS = 5;
/** Largo de las transiciones entre escenas: el hueco que deja construirLinea entre escenas. */
export const CUADROS_TRANSICION_QUE_ES = 18;

export function momentoEn(linea: Linea, [id, fraccion]: Momento): number {
  for (const escena of linea.escenas) {
    const tramo = escena.frases.find((f) => f.frase.id === id);
    if (tramo) return tramo.desde + Math.round(fraccion * tramo.frames);
  }
  throw new Error(`La frase ${id} no está en el video`);
}

export type Sonido = 'barrido' | 'clic' | 'pop' | 'campanita' | 'golpe' | 'papel';
export type Pista = { sonido: Sonido; frame: number; volumen: number };

/** Volumen base de cada sonido: suaves, debajo de la voz. */
const BASE: Record<Sonido, number> = { barrido: 0.22, clic: 0.35, pop: 0.4, campanita: 0.3, golpe: 0.5, papel: 0.28 };
/** Mientras habla la voz, los efectos bajan como la música. */
const BAJO_LA_VOZ = 0.6;

/** Qué suena y cuándo, a partir de la línea de tiempo de la voz. */
export function pistasDeSonido(linea: Linea): Pista[] {
  const tiene = (id: string) => linea.escenas.some((e) => e.frases.some((f) => f.frase.id === id));
  const crudas: Omit<Pista, 'volumen'>[] = [];
  linea.escenas.slice(1).forEach((e) => crudas.push({ sonido: 'barrido', frame: e.desde - CUADROS_TRANSICION_QUE_ES + 2 }));
  if (tiene(MOMENTOS.hojas[0])) {
    const inicio = momentoEn(linea, MOMENTOS.hojas);
    for (let i = 0; i < HOJAS; i++) crudas.push({ sonido: 'papel', frame: inicio + i * CUADROS_ENTRE_HOJAS + 6 });
  }
  if (tiene(MOMENTOS.enviar[0])) crudas.push({ sonido: 'clic', frame: momentoEn(linea, MOMENTOS.enviar) });
  if (tiene(MOMENTOS.aprobar[0])) crudas.push({ sonido: 'clic', frame: momentoEn(linea, MOMENTOS.aprobar) });
  if (tiene(MOMENTOS.globoAparece[0])) {
    const g = momentoEn(linea, MOMENTOS.globoAparece);
    crudas.push({ sonido: 'pop', frame: g }, { sonido: 'campanita', frame: g + 2 });
  }
  if (tiene(MOMENTOS.sello[0])) {
    const s = momentoEn(linea, MOMENTOS.sello);
    // Lucía pulsa «Cerrar» un instante antes de que caiga el sello.
    crudas.push({ sonido: 'clic', frame: s - 5 }, { sonido: 'golpe', frame: s });
  }
  if (tiene(MOMENTOS.globoSeVa[0])) crudas.push({ sonido: 'pop', frame: momentoEn(linea, MOMENTOS.globoSeVa) + 4 });
  const logo = linea.escenas.find((e) => e.id === 'logo');
  if (logo) crudas.push({ sonido: 'pop', frame: logo.desde + ESPERA_BROTE }, { sonido: 'campanita', frame: logo.desde + ESPERA_BROTE + 3 });
  return crudas
    .map((p) => ({ ...p, volumen: Math.round(BASE[p.sonido] * (fraseActiva(linea, p.frame) ? BAJO_LA_VOZ : 1) * 1000) / 1000 }))
    .sort((a, b) => a.frame - b.frame);
}
