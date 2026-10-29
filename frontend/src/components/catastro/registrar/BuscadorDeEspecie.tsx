'use client';

import { useEffect, useState } from 'react';
import type { Species } from '@shared/types';
import { Input } from '@/components/ui';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { inventarioVerdeApi } from '@/lib/inventario-verde-api';

const SUGERENCIAS = 8;
const ESPERA_MS = 250;

export interface BuscadorDeEspecieProps {
  valor: string;
  onElegir: (nombreCientifico: string) => void;
  error?: string;
}

/**
 * Busca en el catálogo por nombre científico o común. Permite elegir una
 * especie existente del inventario botánico.
 */
export function BuscadorDeEspecie({ valor, onElegir, error }: BuscadorDeEspecieProps) {
  const [texto, setTexto] = useState(valor);
  // La respuesta guarda el texto que la produjo: así «buscando» y las opciones se
  // derivan en el render y el efecto solo escribe estado al resolver la promesa.
  const [respuesta, setRespuesta] = useState<{ texto: string; opciones: Species[] } | null>(null);

  const buscado = useDebouncedValue(texto, ESPERA_MS);
  const elegida = valor !== '' && texto === valor;
  const consultable = buscado.trim().length >= 2 && buscado !== valor;
  const respondida = respuesta?.texto === buscado;
  const opciones = consultable && respondida ? (respuesta?.opciones ?? []) : [];
  const buscando = consultable && !respondida;

  useEffect(() => {
    if (!consultable) return;
    let vigente = true;
    inventarioVerdeApi
      .species({ search: buscado, page: 0, size: SUGERENCIAS })
      .then((p) => {
        if (vigente) setRespuesta({ texto: buscado, opciones: p.content });
      })
      .catch(() => {
        if (vigente) setRespuesta({ texto: buscado, opciones: [] });
      });

    return () => {
      vigente = false;
    };
  }, [buscado, consultable]);

  function elegir(s: Species) {
    setTexto(s.scientificName);
    onElegir(s.scientificName);
  }

  const mostrarLista = !elegida && texto.trim().length >= 2 && opciones.length > 0;
  const mostrarSinResultados = !elegida && !buscando && texto.trim().length >= 2 && opciones.length === 0;

  return (
    <div className="relative">
      <Input
        id="especie"
        label="Especie"
        value={texto}
        onChange={(t) => {
          setTexto(t);
          if (valor) onElegir('');
        }}
        placeholder="Nombre científico o común (ej. Ceiba speciosa)"
        required
        errorMessage={error}
        helperText={elegida ? 'Especie seleccionada del catálogo' : 'Escribe al menos dos letras y elige de la lista'}
      />

      {mostrarLista && (
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

      {mostrarSinResultados && (
        <div
          role="region"
          aria-label="Sin resultados de especie"
          className="absolute z-20 mt-1 w-full rounded-md border border-neutral-200 bg-neutral-0 p-3 shadow-lg text-sm"
        >
          <p className="text-neutral-600">
            No se encontró ninguna especie con «<strong className="text-neutral-900">{buscado}</strong>». Verifica el nombre o regístrala desde el Catálogo botánico.
          </p>
        </div>
      )}
    </div>
  );
}
