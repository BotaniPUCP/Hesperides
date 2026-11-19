import type { MessagePattern } from './placeErrorMessages';

/**
 * Los errores del ciclo común de cargas por CSV (SPEC-103 D-04), iguales para el
 * catastro y el Directorio: el lote, su vencimiento y la carga en curso.
 */
export const IMPORT_PATTERNS: readonly MessagePattern[] = [
  [/^Another import is in progress/, () => 'Hay otra importación en curso. Inténtalo en unos minutos'],
  [/^The preview expired/, () => 'La vista previa venció (dura una hora): vuelve a subir el archivo'],
  [/^This import was already confirmed or expired$/, () => 'Esta carga ya se confirmó o venció'],
  [/^Only who uploaded the file can confirm it$/, () => 'Solo quien subió el archivo puede confirmarlo'],
  [/^There is no CSV standard for/, () => 'No hay un estándar CSV para ese tipo'],
];
