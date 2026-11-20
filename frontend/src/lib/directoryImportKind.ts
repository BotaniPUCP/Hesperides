import type { DirectoryImportKind } from '@shared/types';

/** La cabecera cabe de sobra en este tramo: no hace falta leer el archivo entero. */
const BYTES_DE_CABECERA = 4096;

/**
 * La columna que distingue cada estándar (`docs/estandares/organizaciones.md` y
 * `contactos.md`): ambos empiezan con «nombre», solo uno lleva cada una de estas.
 */
const COLUMNA_DISTINTIVA: Record<DirectoryImportKind, string> = {
  organizations: 'tipo',
  contacts: 'organizaciones',
};

export const MENSAJE_TIPO_NO_RECONOCIDO =
  'No se reconoce el archivo: su cabecera no es la de organizaciones ni de contactos. Usa una de las plantillas.';

export class TipoNoReconocidoError extends Error {
  constructor() {
    super(MENSAJE_TIPO_NO_RECONOCIDO);
    this.name = 'TipoNoReconocidoError';
  }
}

function leerTexto(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob, 'utf-8');
  });
}

/** Las columnas de la primera línea; la coma se acepta aquí para que el servidor diga qué separador falla. */
function columnasDeCabecera(texto: string): string[] {
  const primeraLinea = texto.replace(/^﻿/, '').split(/\r?\n/)[0];
  return primeraLinea.split(/[;,]/).map((c) => c.trim().toLowerCase());
}

/** Qué estándar sigue el archivo, según su cabecera. Falla si no es exactamente uno. */
export async function detectarTipoDeImportacion(archivo: File): Promise<DirectoryImportKind> {
  const columnas = columnasDeCabecera(await leerTexto(archivo.slice(0, BYTES_DE_CABECERA)));
  const tipos = (Object.keys(COLUMNA_DISTINTIVA) as DirectoryImportKind[])
    .filter((tipo) => columnas.includes(COLUMNA_DISTINTIVA[tipo]));
  if (tipos.length !== 1) throw new TipoNoReconocidoError();
  return tipos[0];
}
