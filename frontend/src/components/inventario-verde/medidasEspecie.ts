import type { Species, SpeciesForm } from '@shared/types';

export interface MedidaAdicional {
  code: string;
  label: string;
  unitCode: string;
  nota: string;
}

/**
 * Las medidas de una especie mientras se editan: textos sin convertir, porque
 * así se escriben (admiten coma decimal). Reglas en SPEC-105 §5.1.
 */
export interface MedidasEspecie {
  critical: boolean;
  alturaM: string;
  fuenteAltura: string | null;
  radioM: string;
  fuenteRadio: string | null;
  usaFuste: boolean;
  usaDap: boolean;
  adicionales: MedidaAdicional[];
}

export type ErroresMedidas = Partial<Record<'altura' | 'fuenteAltura' | 'radio' | 'fuenteRadio', string>>;

const TIPOS_NO_CRITICOS_POR_DEFECTO = ['SHRUB', 'GROUNDCOVER', 'CLIMBER', 'HEDGE', 'HERB', 'SUCCULENT', 'POTTED_HERB'];

/** Un tipo desconocido queda crítico: es el lado seguro. */
export function criticaPorTipo(tipo: string | null): boolean {
  return !TIPOS_NO_CRITICOS_POR_DEFECTO.includes(tipo ?? '');
}

export function medidasPorTipo(tipo: string | null): MedidasEspecie {
  return {
    critical: criticaPorTipo(tipo), alturaM: '', fuenteAltura: null, radioM: '', fuenteRadio: null,
    usaFuste: true, usaDap: true, adicionales: [],
  };
}

export function medidasDe(especie: Species): MedidasEspecie {
  return {
    critical: especie.critical,
    alturaM: especie.referenceHeightM === null ? '' : String(especie.referenceHeightM),
    fuenteAltura: especie.referenceHeightSourceCode,
    radioM: especie.referenceCrownRadiusM === null ? '' : String(especie.referenceCrownRadiusM),
    fuenteRadio: especie.referenceCrownRadiusSourceCode,
    usaFuste: especie.usesTrunkHeight,
    usaDap: especie.usesDbh,
    adicionales: especie.extraMeasures.map((m) => ({
      code: m.code, label: m.label, unitCode: m.unitCode, nota: m.referenceNote ?? '',
    })),
  };
}

const numero = (texto: string) => Number(texto.trim().replace(',', '.'));
const vacio = (texto: string) => texto.trim() === '';

function errorDeValor(texto: string, fuente: string | null, exigido: boolean, faltante: string): string | undefined {
  if (vacio(texto)) {
    return exigido || fuente ? faltante : undefined;
  }
  const valor = numero(texto);
  return Number.isFinite(valor) && valor > 0 ? undefined : 'Debe ser un número mayor que 0';
}

export function erroresMedidas(m: MedidasEspecie): ErroresMedidas {
  const errores: ErroresMedidas = {};
  const altura = errorDeValor(m.alturaM, m.fuenteAltura, !m.critical, 'Indica la altura promedio');
  const radio = errorDeValor(m.radioM, m.fuenteRadio, !m.critical, 'Indica el radio de copa promedio');
  if (altura) errores.altura = altura;
  if (radio) errores.radio = radio;
  if (!vacio(m.alturaM) && !m.fuenteAltura) errores.fuenteAltura = 'Indica la fuente de la altura';
  if (!vacio(m.radioM) && !m.fuenteRadio) errores.fuenteRadio = 'Indica la fuente del radio';
  return errores;
}

type CamposDeMedidas = Required<Pick<SpeciesForm,
  'critical' | 'referenceHeightM' | 'referenceHeightSourceCode' | 'referenceCrownRadiusM'
  | 'referenceCrownRadiusSourceCode' | 'usesTrunkHeight' | 'usesDbh' | 'extraMeasures'>>;

export function aFormulario(m: MedidasEspecie): CamposDeMedidas {
  return {
    critical: m.critical,
    referenceHeightM: vacio(m.alturaM) ? null : numero(m.alturaM),
    referenceHeightSourceCode: m.fuenteAltura,
    referenceCrownRadiusM: vacio(m.radioM) ? null : numero(m.radioM),
    referenceCrownRadiusSourceCode: m.fuenteRadio,
    usesTrunkHeight: m.usaFuste,
    usesDbh: m.usaDap,
    extraMeasures: m.adicionales.map((a) => ({ code: a.code, referenceNote: a.nota.trim() || null })),
  };
}

const UNIDADES: Record<string, string> = { UNIT: 'und', M: 'm', M2: 'm²', M3: 'm³' };

/** Las unidades del catálogo, como se leen junto a un número. */
export const unidadCorta = (codigo: string) => UNIDADES[codigo] ?? codigo;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'set', 'oct', 'nov', 'dic'];

export function fechaCorta(iso: string): string {
  const [anio, mes, dia] = iso.split('-').map(Number);
  return `${dia} ${MESES[mes - 1]} ${anio}`;
}
