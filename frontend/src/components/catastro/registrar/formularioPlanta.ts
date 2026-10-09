import type { AssessmentForm, MeasurementForm, SpecimenForm } from '@shared/types';

/** Un sí/no de evaluación: vacío es «no se evaluó», distinto de «no». */
export type SiNo = '' | 'si' | 'no';

export const PREGUNTAS_EVALUACION = [
  ['hasDisease', 'Enfermedades'],
  ['hasPests', 'Plagas'],
  ['hasMechanicalDamage', 'Daños mecánicos'],
  ['isLeaning', 'Inclinación riesgosa'],
  ['hasDeadBranches', 'Ramas secas'],
  ['hasCavitiesOrRot', 'Cavidades o pudrición'],
  ['hasExposedRoots', 'Raíces expuestas'],
  ['interferesWithInfrastructure', 'Interfiere con infraestructura'],
] as const;

export type Pregunta = (typeof PREGUNTAS_EVALUACION)[number][0];

/** Lo que se escribe en el formulario, tal cual: todo texto hasta enviarlo. */
export interface FormularioPlanta {
  especie: string;
  lat: string;
  lon: string;
  cantidad: string;
  fechaMedicion: string;
  alturaM: string;
  alturaFusteM: string;
  dapCm: string;
  radioCopaM: string;
  zunchado: SiNo;
  fechaEvaluacion: string;
  respuestas: Record<Pregunta, SiNo>;
  manejo: string;
  observacionEvaluacion: string;
  observaciones: string;
}

export const FORMULARIO_VACIO: FormularioPlanta = {
  especie: '', lat: '', lon: '', cantidad: '1',
  fechaMedicion: '', alturaM: '', alturaFusteM: '', dapCm: '', radioCopaM: '', zunchado: '',
  fechaEvaluacion: '',
  respuestas: Object.fromEntries(PREGUNTAS_EVALUACION.map(([k]) => [k, ''])) as Record<Pregunta, SiNo>,
  manejo: '', observacionEvaluacion: '', observaciones: '',
};

export type Errores = Partial<Record<'especie' | 'lat' | 'lon' | 'cantidad' | 'fechaMedicion' | 'fechaEvaluacion' | 'medidas', string>>;

/** Acepta la coma decimal que se escribe por costumbre. Vacío es null; algo ilegible, NaN. */
const numero = (texto: string) => (texto.trim() === '' ? null : Number(texto.trim().replace(',', '.')));
const siNo = (v: SiNo) => (v === '' ? null : v === 'si');
const texto = (v: string) => (v.trim() === '' ? null : v.trim());

function medicion(f: FormularioPlanta, errores: Errores): MeasurementForm | null {
  const valores = [f.alturaM, f.alturaFusteM, f.dapCm, f.radioCopaM].map(numero);
  if (valores.every((v) => v === null) && f.zunchado === '') return null;
  if (valores.some((v) => v !== null && (Number.isNaN(v) || v < 0))) errores.medidas = 'Las medidas deben ser números positivos';
  if (!f.fechaMedicion) errores.fechaMedicion = 'Una medición necesita su fecha';
  const [heightM, trunkHeightM, dbhCm, crownRadiusM] = valores;
  return { date: f.fechaMedicion, heightM, trunkHeightM, dbhCm, crownRadiusM, banded: siNo(f.zunchado) };
}

function evaluacion(f: FormularioPlanta, errores: Errores): AssessmentForm | null {
  const respondidas = PREGUNTAS_EVALUACION.some(([k]) => f.respuestas[k] !== '');
  if (!respondidas && !texto(f.manejo) && !texto(f.observacionEvaluacion)) return null;
  if (!f.fechaEvaluacion) errores.fechaEvaluacion = 'Una evaluación necesita su fecha';
  const respuestas = Object.fromEntries(PREGUNTAS_EVALUACION.map(([k]) => [k, siNo(f.respuestas[k])]));
  return { date: f.fechaEvaluacion, ...respuestas, recommendedManagement: texto(f.manejo), observation: texto(f.observacionEvaluacion) };
}

/** Convierte y valida. Con algún error, `form` es null: no se envía nada. */
export function aSpecimenForm(f: FormularioPlanta): { form: SpecimenForm | null; errores: Errores } {
  const errores: Errores = {};
  const lat = numero(f.lat);
  const lon = numero(f.lon);
  const cantidad = numero(f.cantidad);
  if (!texto(f.especie)) errores.especie = 'Elige la especie';
  if (lat === null || Number.isNaN(lat) || lat < -90 || lat > 90) errores.lat = 'Marca el punto en el mapa o escribe la latitud';
  if (lon === null || Number.isNaN(lon) || lon < -180 || lon > 180) errores.lon = 'Escribe la longitud';
  if (cantidad !== null && (!Number.isInteger(cantidad) || cantidad < 1)) errores.cantidad = 'Un entero de 1 o más';
  const measurement = medicion(f, errores);
  const assessment = evaluacion(f, errores);
  if (Object.keys(errores).length > 0) return { form: null, errores };
  return {
    form: {
      scientificName: f.especie.trim(), lat: lat as number, lon: lon as number, quantity: cantidad ?? 1,
      measurement, assessment, notes: texto(f.observaciones),
    },
    errores,
  };
}
