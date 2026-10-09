'use client';

import { useState } from 'react';
import { search, type SearchEntry } from './searchIndex';

export interface MapSearchProps {
  index: SearchEntry[];
  onPick: (entry: SearchEntry) => void;
}

/** Buscador de edificios, jardines y referencias. Elegir un resultado lleva la cámara hasta él. */
export function MapSearch({ index, onPick }: MapSearchProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const results = search(index, query);

  const pick = (entry: SearchEntry) => {
    onPick(entry);
    setQuery('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1));
    else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
    else if (e.key === 'Enter' && results[active]) pick(results[active]);
    else if (e.key === 'Escape') setQuery('');
    else return;
    e.preventDefault();
  };

  return (
    <div className="relative w-full max-w-sm">
      <input
        type="search"
        role="combobox"
        aria-label="Buscar en el mapa"
        aria-expanded={results.length > 0}
        aria-controls="map-search-results"
        placeholder="Buscar edificio, jardín o lugar…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-neutral-200 bg-neutral-0/95 px-3 py-2 text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-brand-600"
      />
      {results.length > 0 && (
        <ul id="map-search-results" role="listbox" className="absolute mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-neutral-0 shadow-lg">
          {results.map((r, i) => (
            <li
              key={`${r.target.layer}-${r.target.index}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(r)}
              className={`cursor-pointer px-3 py-2 text-sm ${i === active ? 'bg-brand-50' : 'hover:bg-neutral-50'}`}
            >
              <div className="font-medium text-neutral-900">{r.title}</div>
              <div className="text-xs text-neutral-500">{r.subtitle}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
