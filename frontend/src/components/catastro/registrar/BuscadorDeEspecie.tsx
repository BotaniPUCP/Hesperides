'use client';

import { useMemo, useState } from 'react';
import type { Species } from '@shared/types';
import { Input } from '@/components/ui';
import { usePreloadedList } from '@/hooks/usePreloadedList';
import { speciesList } from '@/lib/preload/inventoryLists';
import { filterByText } from '@/lib/search/searchText';

const SUGERENCIAS = 8;
/** Con una sola letra casi todo el catálogo coincide (SPEC-119 D-08). */
const MINIMO_LETRAS = 2;

export interface BuscadorDeEspecieProps {
  valor: string;
  onElegir: (nombreCientifico: string, especie?: Species) => void;
  error?: string;
}

/**
 * Busca en el catálogo por nombre científico, común o alternativo. Solo ofrece especies activas:
 * una en retiro no recibe ejemplares nuevos. El catálogo se carga al abrir el formulario y se
 * filtra en el navegador mientras se escribe (SPEC-119).
 */
export function BuscadorDeEspecie({ valor, onElegir, error }: BuscadorDeEspecieProps) {
  const [texto, setTexto] = useState(valor);
  const catalogo = usePreloadedList(speciesList);
  const activas = useMemo(() => catalogo.items.filter((s) => s.isActive), [catalogo.items]);

  const elegida = valor !== '' && texto === valor;
  const consultable = texto.trim().length >= MINIMO_LETRAS && !elegida;
  const opciones = useMemo(() => (consultable ? filterByText(activas, texto).slice(0, SUGERENCIAS) : []),
    [activas, consultable, texto]);
  const cargando = consultable && !catalogo.loaded && catalogo.errorMessage === null;
  const fallo = consultable && !catalogo.loaded && catalogo.errorMessage !== null;
  const sinResultados = consultable && catalogo.loaded && opciones.length === 0;

  function elegir(s: Species) {
    setTexto(s.scientificName);
    onElegir(s.scientificName, s);
  }

  return (
    <div className="relative">
      <Input
        id="especie"
        label="Especie"
        value={texto}
        onChange={(t) => {
          setTexto(t);
          if (valor) onElegir('', undefined);
        }}
        placeholder="Nombre científico o común (ej. Ceiba speciosa)"
        required
        errorMessage={error}
        helperText={elegida ? 'Especie activa seleccionada del catálogo' : 'Escribe al menos dos letras y elige de la lista de especies activas'}
      />

      {cargando && (
        <p role="status" className="mt-1 text-sm text-neutral-500" aria-live="polite">
          Cargando especies…
        </p>
      )}

      {opciones.length > 0 && (
        <ul
          aria-label="Especies encontradas"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-neutral-200 bg-neutral-0 shadow-lg"
        >
          {opciones.map((s) => (
            <li key={s.slug}>
              <button
                type="button"
                onClick={() => elegir(s)}
                className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center justify-between"
              >
                <div>
                  <span className="italic font-medium text-neutral-900">{s.scientificName}</span>
                  {s.commonName && <span className="ml-2 text-sm text-neutral-500">({s.commonName})</span>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                  {s.vegetationTypeName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {sinResultados && (
        <div
          role="region"
          aria-label="Sin resultados de especie"
          className="absolute z-20 mt-1 w-full rounded-md border border-neutral-200 bg-neutral-0 p-3 shadow-lg text-sm"
        >
          <p className="text-neutral-600">
            No se encontró ninguna especie con «<strong className="text-neutral-900">{texto.trim()}</strong>». Verifica el nombre o regístrala desde el Catálogo botánico.
          </p>
        </div>
      )}

      {fallo && (
        <div role="alert" className="absolute z-20 mt-1 w-full rounded-md border border-alert-danger-border bg-alert-danger-bg p-3 text-sm text-alert-danger-fg shadow-lg">
          <p>No se pudo cargar la lista de especies.</p>
          <button
            type="button"
            onClick={catalogo.reload}
            className="mt-1 font-semibold underline underline-offset-2"
          >
            Reintentar búsqueda
          </button>
        </div>
      )}
    </div>
  );
}
