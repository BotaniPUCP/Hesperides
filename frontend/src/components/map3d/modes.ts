import type { ZoneProperties } from '@shared/types';

/**
 * Modos para colorear las áreas verdes, los del prototipo v39. «Jefe» pasa a
 * «Sector»: el sector es territorio, no persona (SPEC-005 §4.4).
 */

export type ModeId = 'base' | 'uso' | 'riego' | 'proyecto' | 'tamano' | 'sector';

export interface ModeCategory {
  key: string;
  label: string;
  color: string;
}

export interface Mode {
  label: string;
  cats: ModeCategory[];
}

/** Color de una categoría que el modo no declara: visible, pero distinto. */
export const FALLBACK_COLOR = '#60E880';

const cat = (key: string, label: string, color: string): ModeCategory => ({ key, label, color });

export const MODES: Record<ModeId, Mode> = {
  base: { label: 'General', cats: [cat('base', 'Área verde', '#1A9828')] },
  uso: {
    label: 'Uso',
    cats: [
      cat('Áreas de uso administrativo', 'Uso administrativo', '#FF0000'),
      cat('Áreas de manejo sostenible y reducción de consumo de agua', 'Manejo sostenible, ahorro de agua', '#FFE600'),
      cat('Áreas de uso recreativo/descanso', 'Recreativo y descanso', '#00E5FF'),
      cat('Áreas deportivas y recreación activa', 'Deportivo', '#0040FF'),
      cat('Uso institucional', 'Institucional', '#D400FF'),
      cat('Áreas de conservación', 'Conservación', '#00C800'),
    ],
  },
  riego: {
    label: 'Riego',
    cats: [
      cat('Sin riego tecnificado', 'Sin riego tecnificado', '#FF0000'),
      cat('Riego por aspersión', 'Aspersión', '#0050FF'),
      cat('Riego por goteo', 'Goteo', '#00E000'),
    ],
  },
  proyecto: {
    label: 'Proyecto',
    cats: [
      cat('Por validar con unidad', 'Por validar con la unidad', '#FF00CC'),
      cat('Falta aspersión', 'Falta aspersión', '#FF6A00'),
      cat('Goteo', 'Goteo', '#00E000'),
      cat('Cuenta con aspersión', 'Ya cuenta con aspersión', '#0050FF'),
    ],
  },
  tamano: {
    label: 'Tamaño',
    cats: [
      cat('a', 'Menos de 100 m²', '#FFFF00'),
      cat('b', '100 a 500 m²', '#FF9900'),
      cat('c', '500 a 2 000 m²', '#FF0000'),
      cat('d', '2 000 a 5 000 m²', '#C000FF'),
      cat('e', 'Más de 5 000 m²', '#0030FF'),
    ],
  },
  sector: {
    label: 'Sector',
    cats: [
      cat('SEC-VERDE-01', 'Sector verde 01', '#FF0000'),
      cat('SEC-VERDE-02', 'Sector verde 02', '#0050FF'),
      cat('SEC-VERDE-03', 'Sector verde 03', '#00D000'),
      cat('SEC-POLIDEPORT', 'Sector Polideportivo', '#FF9900'),
      cat('SEC-BOSQUE-HUM', 'Sector Bosque húmedo', '#C000FF'),
      cat('', 'Sin sector', '#00E5FF'),
    ],
  },
};

const AREA_LIMITS_M2 = [100, 500, 2000, 5000];

function areaBin(area: number): string {
  const index = AREA_LIMITS_M2.findIndex((limit) => area < limit);
  return 'abcde'[index === -1 ? 4 : index];
}

export function categoryOf(props: ZoneProperties, mode: ModeId): string {
  switch (mode) {
    case 'base':
      return 'base';
    case 'uso':
      return props.useType ?? '';
    case 'riego':
      return props.irrigationCurrent ?? '';
    case 'proyecto':
      return props.irrigationProject ?? '';
    case 'tamano':
      return areaBin(props.areaM2 ?? 0);
    case 'sector':
      return props.parentCode ?? '';
  }
}

export function colorOf(props: ZoneProperties, mode: ModeId): string {
  const key = categoryOf(props, mode);
  return MODES[mode].cats.find((c) => c.key === key)?.color ?? FALLBACK_COLOR;
}
