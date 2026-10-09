'use client';

import type { SiNo } from './formularioPlanta';

const OPCIONES: [SiNo, string][] = [
  ['si', 'Sí'],
  ['no', 'No'],
  ['', 'Sin evaluar'],
];

export interface PreguntaSiNoProps {
  id: string;
  pregunta: string;
  valor: SiNo;
  onCambiar: (valor: SiNo) => void;
}

/** Tres respuestas y no dos: «sin evaluar» no es «no» (SPEC-103 §4.2). */
export function PreguntaSiNo({ id, pregunta, valor, onCambiar }: PreguntaSiNoProps) {
  return (
    <fieldset className="flex flex-wrap items-center justify-between gap-2 py-1">
      <legend className="float-left text-sm text-neutral-900">{pregunta}</legend>
      <div className="flex gap-3 text-sm">
        {OPCIONES.map(([opcion, etiqueta]) => (
          <label key={opcion || 'vacio'} className="flex items-center gap-1 text-neutral-700">
            <input type="radio" name={id} checked={valor === opcion} onChange={() => onCambiar(opcion)} />
            {etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
