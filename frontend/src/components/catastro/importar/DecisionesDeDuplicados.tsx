'use client';

import Link from 'next/link';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Importacion } from './useImportacion';

/**
 * Cada planta nueva que cae cerca de otra de su especie puede ser la misma.
 * Nadie decide por defecto: ni se ingresa ni se pierde sin que alguien lo diga (SPEC-103 D-05).
 */
export function DecisionesDeDuplicados({ imp }: { imp: Importacion }) {
  const duplicados = imp.vista?.duplicates ?? [];
  const pendientes = imp.pendientes;
  const disabled = imp.reanalizando || imp.summaryLoading || imp.confirmationOpen || imp.fase === 'confirmando';

  const entidadSingular =
    imp.kind === 'specimens'
      ? 'ejemplar'
      : imp.kind === 'waste-bins'
        ? 'tacho'
        : 'bebedero';

  const tituloEntidad =
    imp.kind === 'specimens'
      ? 'Posibles ejemplares duplicados'
      : imp.kind === 'waste-bins'
        ? 'Posibles tachos duplicados'
        : 'Posibles bebederos duplicados';

  return (
    <section aria-labelledby="posibles-duplicados" className="space-y-3 pt-2">
      {/* Cabecera unificada con botones de decisión rápida */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 id="posibles-duplicados" className="font-semibold text-neutral-900 text-base">
              {tituloEntidad}
            </h3>
            <span
              data-testid="total-duplicados-badge"
              className="inline-flex items-center justify-center rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-semibold text-neutral-700 min-w-5 text-center"
            >
              {duplicados.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            {pendientes > 0 ? (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-200/60">
                {pendientes} {pendientes === 1 ? 'pendiente' : 'pendientes'}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200/60">
                Todos decididos ✓
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-medium hidden sm:inline">Resolver todos:</span>
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => imp.decidirTodos(true)}
          >
            Ingresar todos
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => imp.decidirTodos(false)}
          >
            Omitir todos
          </Button>
        </div>
      </div>

      {/* Lista homogénea de tarjetas */}
      <ul className="space-y-3 text-sm">
        {duplicados.map((d) => {
          const nombre = `duplicado-${d.line}`;
          const decision = imp.decisiones[d.line];
          const esPendiente = decision === undefined;

          return (
            <li
              key={d.line}
              className={cn(
                'rounded-xl border p-4 transition-colors',
                esPendiente
                  ? 'border-amber-200/80 bg-amber-50/20'
                  : 'border-neutral-200 bg-neutral-0',
              )}
            >
              {/* Primera fila: Identificador de fila, nombre botánico y estado (solo si ya se decidió) */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-700 border border-neutral-200">
                      Línea {d.line}
                    </span>
                    <span className={cn('text-base font-semibold text-neutral-900', d.speciesSlug && 'italic')}>
                      {d.label}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    Coincide con {entidadSingular} existente{' '}
                    {d.speciesSlug ? (
                      <Link
                        className="font-mono font-bold text-brand-700 hover:text-brand-900 underline decoration-brand-300 hover:decoration-brand-700"
                        href={`/catastro/ejemplares/${d.duplicateOf}`}
                        target="_blank"
                        title="Ver ficha de ejemplar existente"
                      >
                        {d.duplicateOf}
                      </Link>
                    ) : (
                      <strong className="font-mono text-neutral-800">{d.duplicateOf}</strong>
                    )}{' '}
                    (a {d.distanceM} m de distancia)
                  </p>
                </div>

                {!esPendiente && (
                  <div>
                    {decision ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-medium text-emerald-800 border border-emerald-200/60">
                        Decisión: Ingresar
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-neutral-100 px-3 py-0.5 text-xs font-medium text-neutral-700 border border-neutral-200">
                        Decisión: Omitir
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Segunda fila: Instrucción y decisión por radio buttons */}
              <div className="mt-3 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-neutral-600">
                  ¿Cómo deseas proceder con esta fila?
                </span>

                <fieldset className="flex items-center gap-4 bg-neutral-50 px-3 py-1.5 rounded-lg border border-neutral-200/80">
                  <legend className="sr-only">Decisión para la línea {d.line}</legend>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-neutral-800 hover:text-brand-800 select-none">
                    <input
                      type="radio"
                      name={nombre}
                      disabled={disabled}
                      checked={decision === true}
                      onChange={() => imp.decidir(d.line, true)}
                      className="accent-brand-600 h-4 w-4 cursor-pointer"
                    />
                    <span>Ingresar</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-neutral-800 hover:text-neutral-900 select-none">
                    <input
                      type="radio"
                      name={nombre}
                      disabled={disabled}
                      checked={decision === false}
                      onChange={() => imp.decidir(d.line, false)}
                      className="accent-neutral-700 h-4 w-4 cursor-pointer"
                    />
                    <span>Omitir</span>
                  </label>
                </fieldset>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
