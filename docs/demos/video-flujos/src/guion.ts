import datos from '../guion.json';

export const POSES = ['quieto', 'saluda', 'senala', 'presenta', 'pulgar', 'sorpresa', 'asiente', 'salta'] as const;
export type Pose = (typeof POSES)[number];

/** Adónde va Hespo. `y` es la altura de los pies; sin ella camina por el suelo. */
export type Paso = { x: number; y?: number; pose: Pose };

export type Frase = {
  id: string;
  /** Lo que se lee en los subtítulos. */
  texto: string;
  /** Lo que se envía a la voz, si debe pronunciarse distinto de como se escribe. */
  textoVoz?: string;
  hespo: Paso & {
    /** Fracción de la frase que Hespo espera antes de moverse. */
    espera?: number;
    /** Más movimientos dentro de la frase; `en` es la fracción en que empieza cada uno. */
    luego?: (Paso & { en: number })[];
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
  | 'reservas';
export type Escena = { id: EscenaId; frases: Frase[] };
export type Guion = { voz: string; escenas: Escena[] };

export const guion = datos as Guion;
