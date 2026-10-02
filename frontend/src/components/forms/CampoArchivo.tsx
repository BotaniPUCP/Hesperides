'use client';

import { useState, type ChangeEvent } from 'react';
import { motivoDeRechazo, type Limite } from '@/lib/upload-limits';

export interface CampoArchivoProps {
  id: string;
  etiqueta: string;
  acepta: string;
  /** El máximo que se avisa y se comprueba antes de enviar (SPEC-104 D-08). */
  limite: Limite;
  /** Texto de ayuda además del máximo. */
  ayuda?: string;
  archivo: File | null;
  /** Recibe null si se quita el archivo o si el elegido no cabe. */
  onElegir: (archivo: File | null) => void;
}

/**
 * Selector de archivo que avisa el máximo y rechaza lo que no cabe sin enviarlo:
 * nadie debería esperar a subir 60 MB para enterarse de que sobra.
 */
export function CampoArchivo({ id, etiqueta, acepta, limite, ayuda, archivo, onElegir }: CampoArchivoProps) {
  const [error, setError] = useState<string | null>(null);

  const elegir = (e: ChangeEvent<HTMLInputElement>) => {
    const elegido = e.target.files?.[0] ?? null;
    const motivo = elegido ? motivoDeRechazo(elegido, limite) : null;
    setError(motivo);
    if (motivo) e.target.value = '';
    onElegir(motivo ? null : elegido);
  };

  const detalle = archivo
    ? `${archivo.name} · ${(archivo.size / 1024).toFixed(0)} KB`
    : [ayuda, `Máximo ${limite.etiqueta}.`].filter(Boolean).join(' ');

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {etiqueta}
      </label>
      <input
        id={id}
        type="file"
        accept={acepta}
        aria-describedby={`${id}-ayuda`}
        aria-invalid={error ? true : undefined}
        onChange={elegir}
        className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700"
      />
      <p id={`${id}-ayuda`} className="text-xs text-neutral-500">
        {detalle}
      </p>
      {error && (
        <p role="alert" className="text-xs text-action-danger">
          {error}
        </p>
      )}
    </div>
  );
}
