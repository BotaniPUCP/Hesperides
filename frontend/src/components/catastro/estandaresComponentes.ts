import type { GrupoDeColumnas } from './estandarEjemplares';

/**
 * Los estándares de tachos, bebederos y fotos de especie (SPEC-103 §6.3 a
 * §6.5). Las columnas deben coincidir con FeatureKind y SpeciesPhotoPreview
 * del backend; un test las compara con las plantillas.
 */
const ubicacion: GrupoDeColumnas = {
  titulo: 'Identificación y ubicación',
  columnas: [
    { nombre: 'codigo', obligatoria: false, descripcion: 'Vacía: uno nuevo, el sistema le asigna código. Con un código: corrige ese' },
    { nombre: 'latitud', obligatoria: true, descripcion: 'Grados decimales: -12.069520' },
    { nombre: 'longitud', obligatoria: true, descripcion: 'Grados decimales: -77.080110' },
    { nombre: 'lugar', obligatoria: false, descripcion: 'Dónde está, como lo diría alguien en el campus' },
  ],
};

const foto: GrupoDeColumnas = {
  titulo: 'Foto',
  columnas: [{ nombre: 'foto', obligatoria: false, descripcion: 'Enlace público de Google Drive, o el nombre de un archivo del ZIP' }],
};

export const ESTANDAR_TACHOS: GrupoDeColumnas[] = [
  ubicacion,
  {
    titulo: 'El tacho',
    nota: 'Al corregir, una celda vacía conserva lo registrado.',
    columnas: [
      { nombre: 'residuos', obligatoria: false, descripcion: 'Los que recibe, separados por |: No Aprovechables|Papel y Cartón|Plástico. Deben estar en el catálogo de residuos' },
      { nombre: 'accion', obligatoria: false, descripcion: 'Qué hacer con él: Mantener, Retirar, Reubicar…' },
      { nombre: 'recomendaciones', obligatoria: false, descripcion: 'Texto libre' },
      { nombre: 'nota', obligatoria: false, descripcion: 'Texto libre' },
    ],
  },
  foto,
];

export const ESTANDAR_BEBEDEROS: GrupoDeColumnas[] = [
  ubicacion,
  {
    titulo: 'El bebedero',
    nota: 'Al corregir, una celda vacía conserva lo registrado.',
    columnas: [
      { nombre: 'tipo', obligatoria: false, descripcion: 'Fuente, Llenador de botella o Sin dato' },
      { nombre: 'estado', obligatoria: false, descripcion: 'Operativo, Nuevo, En remodelación, En deterioro o De baja' },
      { nombre: 'sector', obligatoria: false, descripcion: 'El sector del registro de bebederos: CAMPUS, CIA, EEGGCC, EEGGLL, AULARIO' },
      { nombre: 'nota', obligatoria: false, descripcion: 'Texto libre' },
    ],
  },
  foto,
];

export const ESTANDAR_FOTOS_ESPECIES: GrupoDeColumnas[] = [
  {
    titulo: 'Fotos genéricas de cada especie',
    nota:
      'Las fotos de la ficha de la especie, de una a varias. Las filas de una especie reemplazan todas sus fotos; una especie que no aparece conserva las suyas y una que no está en el catálogo se omite.',
    columnas: [
      { nombre: 'nombre_cientifico', obligatoria: true, descripcion: 'Como en el catálogo de especies' },
      { nombre: 'foto', obligatoria: true, descripcion: 'Enlace público de Google Drive, o el nombre de un archivo del ZIP. Hasta 25 MB' },
      { nombre: 'orden', obligatoria: false, descripcion: '1 = foto principal. Sin orden, cuenta el de las filas' },
      { nombre: 'autor', obligatoria: false, descripcion: 'Quien hizo la foto, como pide su licencia' },
      { nombre: 'licencia', obligatoria: false, descripcion: 'Tal cual la da la fuente: CC BY-SA 4.0, CC0…' },
      { nombre: 'fuente', obligatoria: false, descripcion: 'Enlace a la página que acredita la foto (https://…)' },
    ],
  },
];
