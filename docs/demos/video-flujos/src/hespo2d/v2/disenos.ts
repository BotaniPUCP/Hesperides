// PRUEBA DESECHABLE (spike): los cuatro rediseños de Hespo como datos.
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
  brazos: 'munones' | 'flotantes' | 'hojas' | 'fideo';
  pies: 'piernas' | 'botones' | 'ovalos';
  hojas: 'dos' | 'tres' | 'rizo';
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
