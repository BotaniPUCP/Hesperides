import type { FeatureForm } from '@shared/types';

/** Lo que se escribe en el formulario de tacho o bebedero, tal cual. */
export interface FormularioComponente {
  kind: FeatureForm['kind'];
  lugar: string;
  lat: string;
  lon: string;
  /** Etiquetas del catálogo WASTE_STREAM. */
  residuos: string[];
  accion: string;
  recomendaciones: string;
  /** Códigos de FOUNTAIN_KIND y FOUNTAIN_STATUS; vacío es «sin dato». */
  tipo: string;
  estado: string;
  sector: string;
  nota: string;
}

export const componenteVacio = (kind: FeatureForm['kind']): FormularioComponente => ({
  kind, lugar: '', lat: '', lon: '', residuos: [], accion: '', recomendaciones: '', tipo: '', estado: '', sector: '', nota: '',
});

export type ErroresComponente = Partial<Record<'lat' | 'lon' | 'residuos', string>>;

const numero = (texto: string) => (texto.trim() === '' ? NaN : Number(texto.trim().replace(',', '.')));
const texto = (v: string) => (v.trim() === '' ? null : v.trim());

/** Convierte y valida. Las listas las valida el backend contra sus catálogos. */
export function aFeatureForm(f: FormularioComponente): { form: FeatureForm | null; errores: ErroresComponente } {
  const errores: ErroresComponente = {};
  const lat = numero(f.lat);
  const lon = numero(f.lon);
  if (Number.isNaN(lat) || lat < -90 || lat > 90) errores.lat = 'Marca el punto en el mapa o escribe la latitud';
  if (Number.isNaN(lon) || lon < -180 || lon > 180) errores.lon = 'Escribe la longitud';
  if (f.kind === 'waste-bins' && f.residuos.length === 0) errores.residuos = 'Marca al menos un tipo de residuo';
  if (Object.keys(errores).length > 0) return { form: null, errores };
  const comun = { kind: f.kind, lat, lon, place: texto(f.lugar), note: texto(f.nota) };
  const form: FeatureForm = f.kind === 'waste-bins'
    ? { ...comun, wasteStreams: f.residuos, action: texto(f.accion), recommendations: texto(f.recomendaciones) }
    : { ...comun, fountainKind: texto(f.tipo), fountainStatus: texto(f.estado), sector: texto(f.sector) };
  return { form, errores };
}
