'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import type { Importacion } from './useImportacion';

/**
 * Cada planta nueva que cae cerca de otra de su especie puede ser la misma.
 * Nadie decide por defecto: ni se ingresa ni se pierde sin que alguien lo diga.
 */
export function DecisionesDeDuplicados({ imp }: { imp: Importacion }) {
  const duplicados = imp.vista?.duplicates ?? [];

  return (
    <section aria-labelledby="posibles-duplicados" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="posibles-duplicados" className="font-semibold text-neutral-900">
          Posibles duplicados ({duplicados.length})
        </h3>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => imp.decidirTodos(true)}>
            Ingresar todos
          </Button>
          <Button size="sm" variant="secondary" onClick={() => imp.decidirTodos(false)}>
            Omitir todos
          </Button>
        </div>
      </div>
      <ul className="divide-y divide-neutral-100 text-sm">
        {duplicados.map((d) => {
          const nombre = `duplicado-${d.line}`;
          const decision = imp.decisiones[d.line];
          return (
            <li key={d.line} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                Línea {d.line}: <span className={d.speciesSlug ? 'italic' : undefined}>{d.label}</span> a {d.distanceM} m de{' '}
                {d.speciesSlug ? (
                  <Link className="text-brand-700 underline" href={`/inventario-verde/especies/${d.speciesSlug}/ejemplares/${d.duplicateOf}`} target="_blank">
                    {d.duplicateOf}
                  </Link>
                ) : (
                  <strong>{d.duplicateOf}</strong>
                )}
              </span>
              <fieldset className="flex gap-4">
                <legend className="sr-only">Decisión para la línea {d.line}</legend>
                <label className="flex items-center gap-1">
                  <input type="radio" name={nombre} checked={decision === true} onChange={() => imp.decidir(d.line, true)} />
                  Ingresar
                </label>
                <label className="flex items-center gap-1">
                  <input type="radio" name={nombre} checked={decision === false} onChange={() => imp.decidir(d.line, false)} />
                  Omitir
                </label>
              </fieldset>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
