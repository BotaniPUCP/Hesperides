'use client';

import { useState } from 'react';

/** Cuánto se muestra el «copiado» antes de volver al texto del botón. */
const AVISO_MS = 2000;

export interface ErrorDeCarga {
  line: number;
  column: string;
  mensaje: string;
}

/** Una línea por error, con su línea y columna: se pega en un correo o junto al archivo para corregirlo. */
export function textoDeErrores(errores: readonly ErrorDeCarga[]): string {
  return errores.map((e) => `Línea ${e.line}, columna ${e.column}: ${e.mensaje}`).join('\n');
}

/** Copia los errores de una vista previa de carga, igual en el catastro y en el Directorio. */
export function CopiarErrores({ errores }: { errores: readonly ErrorDeCarga[] }) {
  const [copiado, setCopiado] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(textoDeErrores(errores));
        setCopiado(true);
        setTimeout(() => setCopiado(false), AVISO_MS);
      }}
      className="text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 bg-neutral-0 px-2.5 py-1 rounded-md shadow-2xs transition-colors"
    >
      {copiado ? '✓ Errores copiados' : 'Copiar lista de errores'}
    </button>
  );
}
