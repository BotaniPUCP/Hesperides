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
 * Busca en el catálogo por nombre científico o común. Solo se registra una
 * especie que ya existe (SPEC-103 D-06): elegirla de la lista evita errores
 * de tipeo que el backend rechazaría.
 */
export function BuscadorDeEspecie({ valor, onElegir, error }: BuscadorDeEspecieProps) {
  const [texto, setTexto] = useState(valor);
  const [opciones, setOpciones] = useState<Species[]>([]);
  const buscado = useDebouncedValue(texto, ESPERA_MS);
  const elegida = valor !== '' && texto === valor;
  const mostrar = !elegida && texto.trim().length >= 2 && opciones.length > 0;

  useEffect(() => {
    let vigente = true;
    if (buscado.trim().length < 2 || buscado === valor) return;
    inventarioVerdeApi
      .species({ search: buscado, page: 0, size: SUGERENCIAS })
      .then((p) => vigente && setOpciones(p.content))
      .catch(() => vigente && setOpciones([]));
    return () => {
      vigente = false;
    };
  }, [buscado, valor]);

  function elegir(s: Species) {
    setTexto(s.scientificName);
    setOpciones([]);
    onElegir(s.scientificName);
  }

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
        placeholder="Nombre científico o común"
        required
        errorMessage={error}
        helperText={elegida ? 'Especie elegida del catálogo' : 'Escribe al menos dos letras y elige de la lista'}
      />
      {mostrar && (
        <ul aria-label="Especies encontradas" className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-neutral-200 bg-neutral-0 shadow">
          {opciones.map((s) => (
            <li key={s.slug}>
              <button type="button" onClick={() => elegir(s)} className="w-full px-3 py-2 text-left hover:bg-neutral-50">
                <span className="italic text-neutral-900">{s.scientificName}</span>
                <span className="ml-2 text-sm text-neutral-500">{s.commonName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
