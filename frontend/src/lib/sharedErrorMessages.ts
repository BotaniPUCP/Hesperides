import type { MessagePattern } from './placeErrorMessages';

/** Errores en inglés de usuarios, fotos e importaciones que no tienen traductor propio. */
export const SHARED_MESSAGES: Record<string, string> = {
  'The inbox is not configured: set STORAGE_INBOX_DIR':
    'La carpeta de fotos del servidor no está configurada. Avisa al administrador del sistema.',
  'The file is not a supported image': 'El archivo no es una imagen admitida. Usa una foto JPEG, PNG o WebP.',
  'The file is not a readable image': 'No se pudo leer la imagen. Prueba con otra foto JPEG, PNG o WebP.',
};

export const SHARED_PATTERNS: readonly MessagePattern[] = [
  [/^Role '.+' does not exist or is not active$/, () => 'El rol elegido ya no está disponible. Actualiza la pantalla y elige otro.'],
  [/^The photo is larger than (.+)$/, ([, limit]) => `La foto pesa más de ${limit}. Elige una más liviana.`],
  [/^The inbox has photos but no (.+)$/, ([, file]) => `La carpeta de fotos tiene imágenes, pero falta el archivo ${file}.`],
  [/^(\S+) has errors: /, ([, file]) => `El archivo ${file} tiene errores. Corrígelos y vuelve a intentarlo.`],
  [/^Unknown component type: .+$/, () => 'El tipo de componente elegido no es válido. Actualiza la pantalla.'],
];
