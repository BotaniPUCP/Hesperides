import datos from '../guion.json';
import datosPlanificacion from '../guion-planificacion.json';
import datosVenta from '../guion-venta.json';
import datosHistoria from '../guion-historia.json';

export const POSES = ['quieto', 'saluda', 'senala', 'presenta', 'pulgar', 'sorpresa', 'asiente', 'salta', 'confundido'] as const;
export type Pose = (typeof POSES)[number];

/** Adónde va Hespo. `y` es la altura de los pies; sin ella camina por el suelo. */
export type Paso = { x: number; y?: number; pose: Pose };

export type Frase = {
  id: string;
  /** Lo que se lee en los subtítulos. */
  texto: string;
  /** Lo que se envía a la voz, si debe pronunciarse distinto de como se escribe. */
  textoVoz?: string;
  /** Segundos de silencio después de la frase, para que la imagen respire. */
  respiro?: number;
  hespo: Paso & {
    /** Fracción de la frase que Hespo espera antes de moverse. */
    espera?: number;
    /** Más movimientos dentro de la frase; `en` es la fracción en que empieza cada uno. */
    luego?: (Paso & { en: number })[];
    /** Cara y hojas de Hespo en esta frase (solo el Hespo Semilla); si falta, neutral. */
    emocion?: 'neutral' | 'feliz' | 'sorpresa' | 'pensativo' | 'triste';
  };
};

export type EscenaId =
  | 'inicio'
  | 'especies'
  | 'ejemplares'
  | 'incidencias'
  | 'cierre'
  | 'frecuencias'
  | 'planificacion'
  | 'reservas'
  | 'problema'
  | 'presentacion'
  | 'informacion'
  | 'reporte'
  | 'seguimiento'
  | 'final'
  | 'manana'
  | 'hoy'
  | 'aparece'
  | 'solucion'
  | 'resultado';
export type Escena = { id: EscenaId; frases: Frase[] };
export type Guion = { voz: string; escenas: Escena[] };

export const guion = datos as Guion;

/** Segundo video: frecuencias, planificación y reservas de jardines. */
export const guionPlanificacion = datosPlanificacion as Guion;

/** Tercer video: presentación de Hesperides para el cliente, con Hespo en 3D. */
export const guionVenta = datosVenta as Guion;

/** Cuarto video: la venta contada como historia, con Don Julio, el jefe y Hespo Semilla. */
export const guionHistoria = datosHistoria as Guion;
