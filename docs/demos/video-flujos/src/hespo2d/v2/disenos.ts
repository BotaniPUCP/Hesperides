// PRUEBA DESECHABLE (spike): los cuatro rediseños de Hespo como datos.
import { COLOR } from '../../tema';
import type { MedidasCuerpo } from './geometria';

export type Diseno = {
  id: string;
  nombre: string;
  idea: string;
  cuerpo: MedidasCuerpo;
  /** Altura de la base del cuerpo (y local); la suela queda en 323. */
  base: number;
  ojos: { tipo: 'ovalo' | 'grandes' | 'puntos'; sep: number; y: number; tam: number };
  cejas: boolean;
  brazos: 'munones' | 'flotantes' | 'hojas' | 'fideo' | 'palitos';
  pies: 'piernas' | 'botones' | 'ovalos' | 'palitos';
  hojas: 'dos' | 'tres' | 'rizo' | 'brote';
  /** Color de la cáscara; si falta, el verde del cuerpo de la marca. */
  relleno?: string;
  /** Parte de arriba de otro color (cáscara o gorro), con borde curvo o quebrado. */
  gorro?: { color: string; borde: 'curva' | 'zigzag'; altura: number };
  /** Cantidad de pecas en la cáscara. */
  pecas?: number;
  /** Pequitas en las mejillas. */
  pequitas?: boolean;
  /** Migas de tierra alrededor de los pies. */
  migas?: boolean;
  tamHojas: number;
  contorno: number;
  sombreado: 'cel' | 'suave';
  trazoAMano: boolean;
  barriga: boolean;
};

export const DISENOS: Diseno[] = [
  {
    id: 'brote',
    nombre: '1 · Brote',
    idea: 'Evolución del actual: brazos cortos, ojos más grandes',
    cuerpo: { forma: 'huevo', ancho: 84, alto: 98, potencia: 2, panza: 0.08 },
    base: 290,
    ojos: { tipo: 'ovalo', sep: 30, y: -14, tam: 1.15 },
    cejas: false,
    brazos: 'munones',
    pies: 'piernas',
    hojas: 'dos',
    tamHojas: 1,
    contorno: 6,
    sombreado: 'cel',
    trazoAMano: false,
    barriga: true,
  },
  {
    id: 'semilla',
    nombre: '2 · Semilla',
    idea: 'Chibi redondo, manos flotantes, hojas-oreja',
    cuerpo: { forma: 'frijol', ancho: 98, alto: 86, potencia: 2.4, panza: 0.04 },
    base: 306,
    ojos: { tipo: 'grandes', sep: 34, y: -10, tam: 1.1 },
    cejas: true,
    brazos: 'flotantes',
    pies: 'botones',
    hojas: 'dos',
    tamHojas: 1.15,
    contorno: 6,
    sombreado: 'cel',
    trazoAMano: false,
    barriga: true,
  },
  {
    id: 'gota',
    nombre: '3 · Gota',
    idea: 'El cuerpo sube hasta el tallo, manos de hoja, trazo a mano',
    cuerpo: { forma: 'gota', ancho: 86, alto: 112, potencia: 2, panza: 0 },
    base: 306,
    ojos: { tipo: 'ovalo', sep: 26, y: 18, tam: 1 },
    cejas: false,
    brazos: 'hojas',
    pies: 'botones',
    hojas: 'tres',
    tamHojas: 1.2,
    contorno: 5,
    sombreado: 'cel',
    trazoAMano: true,
    barriga: false,
  },
  {
    id: 'plano',
    nombre: '4 · Plano moderno',
    idea: 'Sin contorno, ojos de punto, hoja enrulada',
    cuerpo: { forma: 'huevo', ancho: 86, alto: 100, potencia: 2.15, panza: 0.06 },
    base: 300,
    ojos: { tipo: 'puntos', sep: 28, y: -10, tam: 1 },
    cejas: true,
    brazos: 'fideo',
    pies: 'ovalos',
    hojas: 'rizo',
    tamHojas: 1.05,
    contorno: 0,
    sombreado: 'suave',
    trazoAMano: false,
    barriga: false,
  },
];

const ESTILO_SEMILLA = {
  cejas: true,
  brazos: 'palitos',
  pies: 'palitos',
  hojas: 'brote',
  contorno: 4,
  sombreado: 'cel',
  trazoAMano: false,
  barriga: false,
  pequitas: true,
  migas: true,
  base: 296,
} as const;

/** Variantes de la Semilla en el estilo de la referencia: pecas, brote curvo, extremidades de palito y migas. */
export const VARIANTES_SEMILLA: Diseno[] = [
  {
    ...ESTILO_SEMILLA,
    id: 'crema',
    nombre: 'A · Crema',
    idea: 'Semilla arena con pecas y brote verde',
    cuerpo: { forma: 'huevo', ancho: 82, alto: 90, potencia: 2.1, panza: 0.1 },
    ojos: { tipo: 'grandes', sep: 30, y: 10, tam: 1 },
    tamHojas: 1.1,
    relleno: COLOR.arena,
    pecas: 12,
  },
  {
    ...ESTILO_SEMILLA,
    id: 'almendra',
    nombre: 'B · Almendra',
    idea: 'Semilla verde en forma de almendra, ojos grandes',
    cuerpo: { forma: 'gota', ancho: 82, alto: 104, potencia: 2.4, panza: 0 },
    ojos: { tipo: 'grandes', sep: 28, y: 26, tam: 1 },
    tamHojas: 0.85,
    pecas: 16,
  },
  {
    ...ESTILO_SEMILLA,
    id: 'bellota',
    nombre: 'C · Bellota',
    idea: 'Dos tonos: cuerpo arena y gorro verde con pecas',
    cuerpo: { forma: 'frijol', ancho: 88, alto: 88, potencia: 2.2, panza: 0.08 },
    ojos: { tipo: 'grandes', sep: 30, y: 16, tam: 1 },
    tamHojas: 1,
    relleno: COLOR.arena,
    gorro: { color: COLOR.cuerpo, borde: 'curva', altura: 0.32 },
    pecas: 14,
  },
  {
    ...ESTILO_SEMILLA,
    id: 'brotando',
    nombre: 'D · Brotando',
    idea: 'Rompe su cáscara y saca el brote: el campus que crece',
    cuerpo: { forma: 'huevo', ancho: 84, alto: 94, potencia: 2.1, panza: 0.08 },
    ojos: { tipo: 'grandes', sep: 30, y: 16, tam: 1 },
    tamHojas: 1.1,
    gorro: { color: COLOR.arena, borde: 'zigzag', altura: 0.4 },
    pecas: 12,
  },
];
