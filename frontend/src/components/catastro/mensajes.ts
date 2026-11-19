import { ApiError } from '@/lib/api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { IMPORT_PATTERNS } from '@/lib/importErrorMessages';
import type { MessagePattern } from '@/lib/placeErrorMessages';

/**
 * Los mensajes del registro del catastro, en español. El backend los da en
 * inglés técnico (SPEC-000) y varios llevan datos (un valor, una línea), por
 * eso son reglas con patrón y no un diccionario plano como el de api-errors.
 */
type Regla = MessagePattern;

const REGLAS: readonly Regla[] = [
  [/^«(.*)» is not a number$/, (m) => `«${m[1]}» no es un número`],
  [/^«(.*)» is not a whole number$/, (m) => `«${m[1]}» no es un número entero`],
  [/^«(.*)» is not a date YYYY-MM-DD$/, (m) => `«${m[1]}» no es una fecha AAAA-MM-DD`],
  [/^«(.*)» must be si or no$/, (m) => `«${m[1]}» debe ser «si» o «no»`],
  [/^must be 1 or more$/, () => 'Debe ser 1 o más'],
  [/^must be greater than 0$/, () => 'Debe ser mayor que 0'],
  [/^must be at least ([\d.]+)$/, (m) => `Debe ser al menos ${m[1]}`],
  [/^must be 0 or more$/, () => 'Debe ser 0 o más'],
  [/^must be less than (\d+)$/, (m) => `Debe ser menor que ${m[1]}`],
  [/^must be at most (\d+) characters$/, (m) => `No puede superar los ${m[1]} caracteres`],
  [/^Family name cannot contain numbers$/, () => 'La familia no debe contener números'],
  [/^Code «(.*)» is repeated in the file$/, (m) => `El código «${m[1]}» está repetido en el archivo`],
  [/^Species «(.*)» is repeated in the file$/, (m) => `La especie «${m[1]}» está repetida en el archivo`],
  [/^«(.*)» is not a valid value\. Use: (.*)$/, (m) => `«${m[1]}» no es un valor válido. Usa: ${m[2]}`],
  [/^Required value is empty$/, () => 'Es obligatorio y está vacío'],
  [/^Repeated column in the header$/, () => 'Columna repetida en la cabecera'],
  [/^Unknown column/, () => 'Columna desconocida: revisa que esté escrita igual que en el estándar'],
  [/^Required column is missing$/, () => 'Falta esta columna obligatoria'],
  [/^A measurement needs its date$/, () => 'Una medición necesita su fecha'],
  [/^An assessment needs its date$/, () => 'Una evaluación necesita su fecha'],
  [/^Code does not exist/, () => 'Ese código no existe. Déjalo vacío para registrar un ejemplar nuevo'],
  [/^The point is outside the campus$/, () => 'El punto cae fuera del campus: revisa la latitud y la longitud (¿están invertidas?)'],
  [/^Photo links must be public Google Drive links$/, () => 'El enlace de la fotografía debe permitir acceder al archivo desde Google Drive'],
  [/^The file «(.*)» is not in the uploaded ZIP$/, (m) => `No encontramos "${m[1]}" dentro del ZIP de fotografías`],
  [/^Photo not saved: (.*)$/, (m) => `La foto no se guardó: ${traducirCausaDeFoto(m[1])}`],
  [/^The row at line (\d+) has more cells than the header$/, (m) => `La fila ${m[1]} tiene más celdas que la cabecera`],
  [/^The separator must be a semicolon/, () => 'El separador debe ser punto y coma (;), no coma'],
  [/^The file is empty$/, () => 'El archivo está vacío'],
  [/^The photos file is not a valid ZIP$/, () => 'El archivo de fotos no es un ZIP válido'],
  [/^The ZIP is larger than (\d+) MB/, (m) => `El ZIP de fotos supera los ${m[1]} MB descomprimido`],
  [/^«(.*)» in the ZIP is larger than (\d+) MB$/, (m) => `«${m[1]}» del ZIP pesa más de ${m[2]} MB`],
  [/^The photo is larger than (\d+) MB$/, (m) => `La foto pesa más de ${m[1]} MB`],
  [/^Another photo of this species already has order (\d+)$/, (m) => `Otra foto de esta especie ya tiene el orden ${m[1]}`],
  [/^The source must be a web link/, () => 'La fuente debe ser un enlace web (https://…)'],
  [
    /^Species «(.*)» kept its previous photos: (\d+) of (\d+) could not be saved$/,
    (m) => `La especie «${m[1]}» conserva sus fotos anteriores: ${m[2]} de ${m[3]} no se pudieron guardar`,
  ],
  [/^The file has errors/, () => 'El archivo tiene errores: corrígelos y vuelve a subirlo'],
  [/^The preview expired/, () => 'La vista previa venció (dura una hora): vuelve a subir el archivo'],
  [/^The preview changed or expired\. Upload the file again$/, () => 'La vista previa cambió o venció. Crea una vista previa nueva con el archivo seleccionado'],
  [/^This preview is no longer available\. Re-analyze the file$/, () => 'Esta vista previa ya no está disponible. Vuelve a subir el archivo para continuar'],
  [/^A species changed after the preview\. Re-analyze the file$/, () => 'Una especie cambió desde la vista previa. Actualízala antes de confirmar'],
  [/^A specimen changed after the preview\. Re-analyze the file$/, () => 'Un ejemplar cambió desde la vista previa. Actualízala antes de confirmar'],
  [/^Nearby plants changed after the preview\. Re-analyze the file$/, () => 'Cambió el conjunto de plantas cercanas. Actualiza la vista previa antes de confirmar'],
  [/^This preview changed\. Re-analyze the file before confirming$/, () => 'La vista previa cambió. Actualízala antes de confirmar'],
  [/^This import was already confirmed or expired$/, () => 'Esta carga ya se confirmó o venció'],
  [/^Only who uploaded the file can confirm it$/, () => 'Solo quien subió el archivo puede confirmarlo'],
  [/^The file contains a misplaced quote$/, () => 'El archivo tiene una comilla fuera de lugar: revisa las celdas con comillas'],
  [/^The file contains an unclosed quoted cell$/, () => 'El archivo tiene una celda con comillas que no se cierran'],
  [/^Multiple catalog species share a normalized scientific name/, () => 'Varias especies del catálogo tienen el mismo nombre científico: corrige el catálogo antes de importar'],
  [/^This import type cannot be re-analyzed$/, () => 'Este tipo de carga no se puede volver a analizar: sube el archivo de nuevo'],
  [/^This import type does not provide a confirmation summary$/, () => 'Este tipo de carga no tiene resumen de confirmación'],
  [/^A confirmation summary is required before importing specimens$/, () => 'Revisa el resumen de confirmación antes de importar los ejemplares'],
  [/^A species was added after the preview\. Re-analyze the file$/, () => 'Se agregó una especie después de la vista previa. Actualízala antes de confirmar'],
  [/^An inactive species cannot be edited or reactivated$/, () => 'Una especie inactiva no se puede editar ni reactivar'],
  [/^The ZIP contains more than one file named «(.*)»$/, (m) => `El ZIP tiene más de un archivo llamado «${m[1]}»`],
  [/^Conflicting species choices for the same CSV name$/, () => 'Elegiste especies distintas para un mismo nombre del CSV'],
  [/^Decide on the possible duplicates at lines \[?([^\]]*)\]?$/, (m) => `Falta decidir los posibles duplicados de las líneas ${m[1]}`],
  [/^Unknown species: (.+?)\. /, (m) => `«${m[1]}» no está en el catálogo de especies. Pide a un administrador que la agregue`],
  [/^Possible duplicate of (.+)$/, (m) => `Podría ser el ejemplar ${m[1]}, que ya está registrado`],
  [/^The file is not a (supported|readable) image$/, () => 'El archivo no es una imagen válida (JPG o PNG)'],
  [/^Specimen not found: (.+)$/, (m) => `No existe el ejemplar ${m[1]}`],
  [/^Trunk height cannot exceed total height$/, () => 'La altura del fuste no puede superar la altura total'],
  [/^«(.*)» cannot be in the future$/, (m) => `«${m[1]}» no puede ser una fecha futura`],
  [/^A new specimen relationship must use an active species$/, () => 'Los ejemplares solo pueden vincularse a especies activas'],
  [/^The selected species is no longer available\. Re-analyze the file$/, () => 'La especie seleccionada ya no está disponible. Vuelve a analizar el archivo'],
  [/^A species selection no longer matches a name in the file$/, () => 'Una selección de especie ya no coincide con un nombre en el archivo'],
  [/^Could not read the uploaded file$/, () => 'No se pudo leer el archivo subido'],
  [/^Template missing from the build/, () => 'La plantilla del archivo no está disponible en el sistema'],
  [/^The inbox is not configured/, () => 'La carpeta de entrada no está configurada'],
  [/^The inbox has photos but no (.*)$/, (m) => `La carpeta de entrada contiene fotos pero falta ${m[1]}`],
  [/^Not listed in (.*)$/, (m) => `No figura en ${m[1]}`],
  [/^Its species is not in the catalog$/, () => 'Su especie no está en el catálogo'],
  ...IMPORT_PATTERNS,
];

const CAUSAS_DE_FOTO: readonly Regla[] = [
  [/larger than (\d+) MB/i, (m) => `pesa más de ${m[1]} MB`],
  [/not an image/, () => 'el enlace no devuelve una imagen (¿está compartida públicamente?)'],
  [/^HTTP (\d+)/, (m) => `Drive respondió con error ${m[1]}`],
  [/network error|interrupted/, () => 'falló la conexión con Drive'],
  [/redirect/, () => 'el enlace redirige fuera de Google Drive'],
  [/not a (supported|readable) image/, () => 'el archivo no es una imagen válida'],
];

function aplicar(reglas: readonly Regla[], mensaje: string): string | null {
  for (const [patron, traducir] of reglas) {
    const m = mensaje.match(patron);
    if (m) return traducir(m);
  }
  return null;
}

function traducirCausaDeFoto(causa: string): string {
  return aplicar(CAUSAS_DE_FOTO, causa) ?? causa;
}

/** Traduce un mensaje del backend; uno desconocido se devuelve tal cual, para no ocultar el problema. */
export function traducirMensajeCatastro(mensaje: string): string {
  // El formulario reporta «mensaje (columna)»: se traduce el mensaje y la columna se omite.
  const conColumna = mensaje.match(/^(.*) \(([a-z_]+)\)$/);
  const base = conColumna ? conColumna[1] : mensaje;
  return aplicar(REGLAS, base) ?? mensaje;
}

/** Para mostrar un fallo de la API en las pantallas del catastro. */
export function mensajeDeErrorCatastro(error: unknown): string {
  if (error instanceof ApiError && [400, 404, 409, 422].includes(error.status)) {
    const propio = traducirMensajeCatastro(error.message);
    // Uno que el catastro no conoce lo traduce el diccionario general; tal cual podría llegar en inglés.
    if (propio !== error.message || error.status === 404) return propio;
  }
  return mensajeDeApiError(error);
}
