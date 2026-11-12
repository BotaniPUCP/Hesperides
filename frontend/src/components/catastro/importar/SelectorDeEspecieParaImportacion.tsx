'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { SpeciesImportOption } from '@shared/types';
import { Button, Input } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { catastroApi } from '@/lib/catastro-api';

export interface SelectorDeEspecieParaImportacionProps {
  sourceName: string;
  buttonLabel?: string;
  disabled?: boolean;
  toolbarAction?: ReactNode;
  onSelect: (species: SpeciesImportOption) => void;
}

/** Search and link a catalog species without editing its global record. */
export function SelectorDeEspecieParaImportacion({
  sourceName,
  buttonLabel = 'Seleccionar especie existente',
  disabled = false,
  toolbarAction,
  onSelect,
}: SelectorDeEspecieParaImportacionProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState({ text: '', revision: 0 });
  const [response, setResponse] = useState<{
    revision: number;
    options: SpeciesImportOption[];
    error: boolean;
  } | null>(null);
  const [retry, setRetry] = useState(0);
  const requestId = useRef(0);
  const inputId = useId();
  const listId = `${inputId}-results`;
  const debouncedQuery = useDebouncedValue(query, 250);
  const term = debouncedQuery.text.trim();
  const currentTerm = query.text.trim();
  const debouncing = currentTerm.length > 0 && query.revision !== debouncedQuery.revision;
  const hasResponse = response?.revision === debouncedQuery.revision;
  const loading = open && currentTerm.length > 0 && (debouncing || !hasResponse);
  const showResponse = open && currentTerm.length > 0 && !debouncing && hasResponse;

  useEffect(() => {
    if (!open || !term) return;

    const currentRequest = ++requestId.current;
    let active = true;
    catastroApi.speciesImportOptions(term)
      .then((result) => {
        if (active && currentRequest === requestId.current) {
          setResponse({ revision: debouncedQuery.revision, options: result, error: false });
        }
      })
      .catch(() => {
        if (active && currentRequest === requestId.current) {
          setResponse({ revision: debouncedQuery.revision, options: [], error: true });
        }
      });
    return () => {
      active = false;
    };
  }, [open, debouncedQuery.revision, retry, term]);

  function changeQuery(text: string) {
    requestId.current++;
    setResponse(null);
    setQuery((previous) => ({ text, revision: previous.revision + 1 }));
  }

  function clearQuery() {
    changeQuery('');
  }

  function retrySearch() {
    requestId.current++;
    setResponse(null);
    setRetry((count) => count + 1);
  }

  function openSearch() {
    requestId.current++;
    setResponse(null);
    setOpen(true);
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {open ? (
          <Button size="sm" variant="ghost" disabled={disabled} onClick={() => setOpen(false)}>
            Cerrar búsqueda
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled={disabled} onClick={openSearch}>
            {buttonLabel}
          </Button>
        )}
        {toolbarAction}
      </div>

      {open && (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Input
                id={`species-import-search-${inputId}`}
                label={`Buscar especie para «${sourceName}»`}
                type="search"
                role="combobox"
                value={query.text}
                onChange={changeQuery}
                placeholder="Nombre científico o alternativo"
                disabled={disabled}
                autoComplete="off"
                aria-controls={listId}
                aria-expanded={open}
                aria-autocomplete="list"
              />
            </div>
            {query.text.length > 0 && (
              <Button size="sm" variant="ghost" disabled={disabled} onClick={clearQuery}>
                Limpiar
              </Button>
            )}
          </div>

          {loading && (
            <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-neutral-600">
              <svg className="h-4 w-4 animate-spin text-brand-700" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Buscando en el catálogo…
            </p>
          )}

          {showResponse && response?.error && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-action-danger/30 bg-action-danger/5 px-3 py-2">
              <p className="text-sm text-action-danger">No se pudo completar la búsqueda. Revisa tu conexión e inténtalo de nuevo.</p>
              <Button size="sm" variant="secondary" disabled={disabled} onClick={retrySearch}>
                Reintentar
              </Button>
            </div>
          )}

          {showResponse && !response?.error && response?.options.length === 0 && (
            <p role="status" aria-live="polite" className="rounded-lg bg-neutral-0 px-3 py-2 text-sm text-neutral-600">
              Sin coincidencias para «{term}».
            </p>
          )}

          {showResponse && !response?.error && response && response.options.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label={`Resultados para ${sourceName}`}
              className="max-h-64 space-y-1 overflow-y-auto"
            >
              {response.options.map((species) => (
                <li key={species.slug} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    disabled={disabled}
                    onClick={() => {
                      onSelect(species);
                      setOpen(false);
                    }}
                    className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium italic text-neutral-900">{species.scientificName}</span>
                      {species.commonName && <span className="block truncate text-xs text-neutral-600">{species.commonName}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!query.text.trim() && (
            <p className="text-xs text-neutral-500">Escribe una letra para buscar por nombre científico o alternativo.</p>
          )}
        </div>
      )}
    </div>
  );
}
