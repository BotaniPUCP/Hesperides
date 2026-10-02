import { ApiError } from '@/lib/api';
import { mensajeDeApiError } from '@/lib/api-errors';

/**
 * Los mensajes del registro del catastro, en español. El backend los da en
 * inglés técnico (SPEC-000) y varios llevan datos (un valor, una línea), por
 * eso son reglas con patrón y no un diccionario plano como el de api-errors.
 */
type Regla = [RegExp, (m: RegExpMatchArray) => string];

const REGLAS: Regla[] = [
  [/^«(.*)» is not a number$/, (m) => `«${m[1]}» no es un número`],
  [/^«(.*)» is not a whole number$/, (m) => `«${m[1]}» no es un número entero`],
  [/^«(.*)» is not a date YYYY-MM-DD$/, (m) => `«${m[1]}» no es una fecha AAAA-MM-DD`],
  [/^«(.*)» must be si or no$/, (m) => `«${m[1]}» debe ser «si» o «no»`],
  [/^must be 1 or more$/, () => 'Debe ser 1 o más'],
  [/^Required value is empty$/, () => 'Es obligatorio y está vacío'],
  [/^Unknown column/, () => 'Columna desconocida: revisa que esté escrita igual que en el estándar'],
  [/^Required column is missing$/, () => 'Falta esta columna obligatoria'],
  [/^A measurement needs its date$/, () => 'Una medición necesita su fecha'],
  [/^An assessment needs its date$/, () => 'Una evaluación necesita su fecha'],
  [/^Code does not exist/, () => 'Ese código no existe. Déjalo vacío para registrar un ejemplar nuevo'],
  [/^The point is outside the campus$/, () => 'El punto cae fuera del campus: revisa la latitud y la longitud (¿están invertidas?)'],
  [/^Photo links must be public Google Drive links$/, () => 'La foto debe ser un enlace público de Google Drive'],
  [/^The file «(.*)» is not in the uploaded ZIP$/, (m) => `El archivo «${m[1]}» no está en el ZIP de fotos`],
  [/^Photo not saved: (.*)$/, (m) => `La foto no se guardó: ${traducirCausaDeFoto(m[1])}`],
  [/^The row at line (\d+) has more cells than the header$/, (m) => `La fila ${m[1]} tiene más celdas que la cabecera`],
  [/^The separator must be a semicolon/, () => 'El separador debe ser punto y coma (;), no coma'],
  [/^The file is empty$/, () => 'El archivo está vacío'],
  [/^The photos file is not a valid ZIP$/, () => 'El archivo de fotos no es un ZIP válido'],
  [/^The ZIP is larger than 300 MB/, () => 'El ZIP de fotos supera los 300 MB descomprimido'],
  [/^«(.*)» in the ZIP is larger than 15 MB$/, (m) => `«${m[1]}» del ZIP pesa más de 15 MB`],
  [/^The file has errors/, () => 'El archivo tiene errores: corrígelos y vuelve a subirlo'],
  [/^The preview expired/, () => 'La vista previa venció (dura una hora): vuelve a subir el archivo'],
  [/^This import was already confirmed or expired$/, () => 'Esta carga ya se confirmó o venció'],
  [/^Only who uploaded the file can confirm it$/, () => 'Solo quien subió el archivo puede confirmarlo'],
  [/^Decide on the possible duplicates at lines \[?([^\]]*)\]?$/, (m) => `Falta decidir los posibles duplicados de las líneas ${m[1]}`],
  [/^Unknown species: (.+?)\. /, (m) => `«${m[1]}» no está en el catálogo de especies. Pide a un administrador que la agregue`],
  [/^Possible duplicate of (.+)$/, (m) => `Podría ser el ejemplar ${m[1]}, que ya está registrado`],
  [/^The file is not a (supported|readable) image$/, () => 'El archivo no es una imagen válida (JPG o PNG)'],
  [/^Specimen not found: (.+)$/, (m) => `No existe el ejemplar ${m[1]}`],
  [/^There is no CSV standard for/, () => 'No hay un estándar CSV para ese tipo'],
];

const CAUSAS_DE_FOTO: Regla[] = [
  [/larger than 15 MB/, () => 'pesa más de 15 MB'],
  [/not an image/, () => 'el enlace no devuelve una imagen (¿está compartida públicamente?)'],
  [/^HTTP (\d+)/, (m) => `Drive respondió con error ${m[1]}`],
  [/network error|interrupted/, () => 'falló la conexión con Drive'],
  [/redirect/, () => 'el enlace redirige fuera de Google Drive'],
  [/not a (supported|readable) image/, () => 'el archivo no es una imagen válida'],
];

function aplicar(reglas: Regla[], mensaje: string): string | null {
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
    return traducirMensajeCatastro(error.message);
  }
  return mensajeDeApiError(error);
}
