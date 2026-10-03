'use client';

import { useState } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePlaces } from '@/hooks/usePlaces';

const MAX_RESULTS = 6;

export interface OtherPlacePickerProps {
  /** El lugar elegido por búsqueda, si lo hay. */
  chosenName: string | null;
  onChoose: (code: string, name: string) => void;
}

/** Cuando ninguna sugerencia acierta: buscar el lugar en el catálogo por nombre o alias. */
export function OtherPlacePicker({ chosenName, onChoose }: OtherPlacePickerProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const search = useDebouncedValue(text, 300).trim();
  const { places } = usePlaces({ search }, open && search !== '');
  const results = open && search ? places.slice(0, MAX_RESULTS) : [];

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="self-start text-sm text-brand-700 hover:underline">
        {chosenName ? `Otro lugar: ${chosenName} (cambiar)` : 'Otro lugar…'}
      </button>
    );
  }
  return (
    <div className="flex max-w-md flex-col gap-1">
      <input
        type="search"
        aria-label="Buscar otro lugar"
        value={text}
        autoFocus
        onChange={(e) => setText(e.target.value)}
        placeholder="Nombre o alias del lugar"
        className="h-9 rounded-md border border-neutral-200 px-2 text-sm"
      />
      {results.map((p) => (
        <button
          key={p.code}
          type="button"
          onClick={() => {
            onChoose(p.code, p.name);
            setOpen(false);
          }}
          className="rounded px-2 py-1 text-left text-sm hover:bg-brand-50"
        >
          {p.name}
          {p.parent && <span className="text-neutral-500">{` · ${p.parent.name}`}</span>}
        </button>
      ))}
    </div>
  );
}
