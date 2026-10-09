import type { ImportKind } from '@shared/types';
import { COLUMNAS_INFORMATIVAS, ESTANDAR_EJEMPLARES, type GrupoDeColumnas } from './estandarEjemplares';
import { ESTANDAR_BEBEDEROS, ESTANDAR_FOTOS_ESPECIES, ESTANDAR_TACHOS } from './estandaresComponentes';

/** Un estándar de carga: lo que muestran Importar y Estándares. */
export interface Estandar {
  kind: ImportKind;
  titulo: string;
  archivo: string;
  /** Cómo se llama lo que carga, en plural: «ejemplares», «tachos»… */
  plural: string;
  /** Las cifras de la vista previa y del resultado. */
  textos: { nuevos: string; aCorregir: string; corregidos: string };
  /** Si sus filas nombran una especie que puede no estar en el catálogo. */
  porEspecie: boolean;
  grupos: GrupoDeColumnas[];
  informativas: string[];
}

export const ESTANDARES: Estandar[] = [
  {
    kind: 'specimens', titulo: 'Ejemplares', archivo: 'ejemplares.csv', plural: 'ejemplares', porEspecie: true,
    textos: { nuevos: 'ejemplares nuevos', aCorregir: 'ejemplares a corregir', corregidos: 'ejemplares corregidos' },
    grupos: ESTANDAR_EJEMPLARES, informativas: COLUMNAS_INFORMATIVAS,
  },
  {
    kind: 'waste-bins', titulo: 'Tachos', archivo: 'tachos.csv', plural: 'tachos', porEspecie: false,
    textos: { nuevos: 'tachos nuevos', aCorregir: 'tachos a corregir', corregidos: 'tachos corregidos' },
    grupos: ESTANDAR_TACHOS, informativas: [],
  },
  {
    kind: 'drinking-fountains', titulo: 'Bebederos', archivo: 'bebederos.csv', plural: 'bebederos', porEspecie: false,
    textos: { nuevos: 'bebederos nuevos', aCorregir: 'bebederos a corregir', corregidos: 'bebederos corregidos' },
    grupos: ESTANDAR_BEBEDEROS, informativas: [],
  },
  {
    kind: 'species-photos', titulo: 'Fotos de especies', archivo: 'fotos-especies.csv', plural: 'fotos', porEspecie: true,
    textos: { nuevos: '—', aCorregir: 'fotos a guardar', corregidos: 'fotos guardadas' },
    grupos: ESTANDAR_FOTOS_ESPECIES, informativas: [],
  },
];

export function estandar(kind: ImportKind): Estandar {
  const e = ESTANDARES.find((x) => x.kind === kind);
  if (!e) throw new Error(`Estándar desconocido: ${kind}`);
  return e;
}
