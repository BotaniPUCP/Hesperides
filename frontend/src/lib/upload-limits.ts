/**
 * Límites de subida (SPEC-104 D-07). Son copia de los del backend
 * (`shared/storage/UploadLimits.java` y `spring.servlet.multipart`): aquí sirven
 * para avisar y rechazar antes de enviar, y el backend valida igual.
 */
const MB = 1024 * 1024;

export interface Limite {
  bytes: number;
  /** Cómo se lee en pantalla: «25 MB». */
  etiqueta: string;
}

export const LIMITES = {
  /** Una foto: del formulario, del ZIP o descargada de Drive. */
  foto: { bytes: 25 * MB, etiqueta: '25 MB' },
  /** Una subida entera: el CSV más su ZIP de fotos. */
  subida: { bytes: 250 * MB, etiqueta: '250 MB' },
  /** El ZIP una vez descomprimido. El navegador no puede medirlo: solo se avisa. */
  zipDescomprimido: { bytes: 500 * MB, etiqueta: '500 MB' },
} satisfies Record<string, Limite>;

const enMb = (bytes: number) => `${Math.round(bytes / MB)} MB`;

/** @returns por qué el archivo no cabe, o null si cabe */
export function motivoDeRechazo(archivo: File, limite: Limite): string | null {
  return archivo.size > limite.bytes
    ? `El archivo pesa ${enMb(archivo.size)}; el máximo es ${limite.etiqueta}.`
    : null;
}
