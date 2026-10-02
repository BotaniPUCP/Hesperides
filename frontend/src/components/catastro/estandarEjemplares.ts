/**
 * El estándar de ejemplares (SPEC-103 §6.2) para mostrarlo en pantalla. Es el
 * resumen de docs/estandares/ejemplares.md; las columnas deben coincidir con
 * SpecimenCsvSchema del backend.
 */
export interface ColumnaEstandar {
  nombre: string;
  obligatoria: boolean;
  descripcion: string;
}

export interface GrupoDeColumnas {
  titulo: string;
  nota?: string;
  columnas: ColumnaEstandar[];
}

const opcional = (nombre: string, descripcion: string): ColumnaEstandar => ({ nombre, obligatoria: false, descripcion });
const siNo = (nombre: string, descripcion: string) => opcional(nombre, `si / no — ${descripcion}`);

export const ESTANDAR_EJEMPLARES: GrupoDeColumnas[] = [
  {
    titulo: 'Identificación y ubicación',
    columnas: [
      opcional('codigo', 'Vacía: planta nueva. Con un código EV-…: corrige ese ejemplar'),
      { nombre: 'nombre_cientifico', obligatoria: true, descripcion: 'Como en el catálogo de especies, o un nombre alternativo' },
      { nombre: 'latitud', obligatoria: true, descripcion: 'Grados decimales: -12.069520' },
      { nombre: 'longitud', obligatoria: true, descripcion: 'Grados decimales: -77.080110' },
      opcional('cantidad', 'Entero de 1 o más (1 si se deja vacía). Más de 1 es una agrupación'),
    ],
  },
  {
    titulo: 'Dato de origen',
    nota: 'Lo que identificaba a la planta en la fuente. Ayuda a rastrearla; no se valida.',
    columnas: [
      opcional('referencia_catastro', 'Código en la hoja del catastro: p01, SA-45'),
      opcional('placa_antigua', 'Número de una placa física anterior'),
      opcional('ubicacion_catastro', 'El lugar como lo escribió la fuente'),
    ],
  },
  {
    titulo: 'Medición',
    nota: 'Si hay alguna medida, la fecha es obligatoria. Una fecha anterior a la registrada no la reemplaza.',
    columnas: [
      opcional('fecha_medicion', 'AAAA-MM-DD'),
      opcional('altura_m', 'Metros, mayor que 0'),
      opcional('altura_fuste_m', 'Metros hasta la primera rama'),
      opcional('dap_cm', 'Diámetro a 1.30 m, en centímetros'),
      opcional('radio_copa_m', 'Metros, mayor que 0'),
      siNo('zunchado', 'tiene zuncho'),
    ],
  },
  {
    titulo: 'Evaluación',
    nota: 'Si hay alguna columna, la fecha es obligatoria. Cada carga añade una evaluación al historial. Vacío es «no se evaluó».',
    columnas: [
      opcional('fecha_evaluacion', 'AAAA-MM-DD'),
      siNo('enfermedades', 'síntomas de enfermedad'),
      siNo('plagas', 'presencia de plagas'),
      siNo('danos_mecanicos', 'cortes, golpes, anillado'),
      siNo('inclinacion', 'inclinación riesgosa'),
      siNo('ramas_secas', 'ramas secas'),
      siNo('cavidades', 'cavidades o pudrición'),
      siNo('raices_expuestas', 'raíces expuestas'),
      siNo('interferencia', 'con cables, veredas o edificios'),
      opcional('manejo_recomendado', 'Texto, hasta 200 caracteres'),
      opcional('observacion_evaluacion', 'Texto libre'),
    ],
  },
  {
    titulo: 'Foto y notas',
    columnas: [
      opcional('foto', 'Enlace público de Google Drive, o el nombre de un archivo del ZIP. Hasta 15 MB'),
      opcional('observaciones', 'Texto libre sobre la planta'),
    ],
  },
];

/** Salen en la exportación para leer el archivo; al cargar se ignoran. */
export const COLUMNAS_INFORMATIVAS = [
  'nombre_comun',
  'nombres_alternativos',
  'familia',
  'tipo_vegetacion',
  'tipo_elemento',
  'origen_medidas',
];
