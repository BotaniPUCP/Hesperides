'use client';

import Link from 'next/link';
import { Button, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { Importacion } from './useImportacion';

/**
 * Cada planta nueva que cae cerca de otra de su especie puede ser la misma.
 * Nadie decide por defecto: ni se ingresa ni se pierde sin que alguien lo diga (SPEC-103 D-05).
 */
export function DecisionesDeDuplicados({ imp }: { imp: Importacion }) {
  const duplicados = imp.vista?.duplicates ?? [];
  const pendientes = imp.pendientes;

  return (
    <section aria-labelledby="posibles-duplicados" className="space-y-3 pt-1">
      {/* Banner de Acción Requerida */}
      <div className="rounded-xl border border-alert-warning-border bg-alert-warning-bg/90 p-3.5 text-alert-warning-fg shadow-2xs">
        <div className="flex items-start gap-2.5">
          <span className="text-base select-none mt-0.5" aria-hidden="true">⚠️</span>
          <div className="space-y-1 text-xs">
            <p className="font-bold text-neutral-900 text-sm">
              Acción requerida: Se detectaron {duplicados.length} posibles duplicados
            </p>
            <p className="text-neutral-700 leading-relaxed">
              Estas filas están en la misma ubicación o muy cerca de ejemplares ya registrados.
              Para habilitar el botón <strong>«Confirmar carga»</strong>, debes indicar si deseas <strong>Ingresar</strong> u <strong>Omitir</strong> cada una.
            </p>
          </div>
        </div>
      </div>

      {/* Cabecera de la lista con botones de decisión rápida */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <h3 id="posibles-duplicados" className="font-bold text-sm text-neutral-900">
            Posibles duplicados ({duplicados.length})
          </h3>
          {pendientes > 0 ? (
            <Badge label={`${pendientes} ${pendientes === 1 ? 'pendiente' : 'pendientes'}`} color="warning" />
          ) : (
            <Badge label="Todos decididos ✓" color="success" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500 font-medium hidden sm:inline">Resolver todos:</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => imp.decidirTodos(true)}
          >
            Ingresar todos
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => imp.decidirTodos(false)}
          >
            Omitir todos
          </Button>
        </div>
      </div>

      {/* Lista de filas con tarjetas interactivas */}
      <ul className="space-y-2 text-sm">
        {duplicados.map((d) => {
          const nombre = `duplicado-${d.line}`;
          const decision = imp.decisiones[d.line];
          const esPendiente = decision === undefined;

          return (
            <li
              key={d.line}
              className={cn(
                'flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border transition-colors',
                esPendiente
                  ? 'border-alert-warning-border bg-alert-warning-bg/40'
                  : 'border-neutral-200/90 bg-neutral-0/80 hover:bg-neutral-50/60',
              )}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-800 border border-neutral-200">
                  Línea {d.line}
                </span>

                <span className="text-neutral-800 text-xs sm:text-sm">
                  <span className={d.speciesSlug ? 'italic font-medium' : 'font-medium'}>{d.label}</span>
                  {' '}a{' '}
                  <span className="font-semibold text-neutral-900">{d.distanceM} m</span>
                  {' '}de{' '}
                  {d.speciesSlug ? (
                    <Link
                      className="font-mono font-bold text-brand-700 hover:text-brand-900 underline decoration-brand-300 hover:decoration-brand-700"
                      href={`/inventario-verde/especies/${d.speciesSlug}/ejemplares/${d.duplicateOf}`}
                      target="_blank"
                      title="Ver ficha de ejemplar existente"
                    >
                      {d.duplicateOf}
                    </Link>
                  ) : (
                    <strong className="font-mono">{d.duplicateOf}</strong>
                  )}
                </span>

                {esPendiente ? (
                  <span className="text-[11px] font-semibold text-alert-warning-fg bg-alert-warning-bg px-2 py-0.5 rounded-full border border-alert-warning-border">
                    Pendiente
                  </span>
                ) : decision ? (
                  <span className="text-[11px] font-semibold text-success-600 bg-brand-50 px-2 py-0.5 rounded-full border border-brand-200">
                    Se ingresará
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full border border-neutral-200">
                    Se omitirá
                  </span>
                )}
              </div>

              <fieldset className="flex items-center gap-4 bg-neutral-0/90 px-3 py-1.5 rounded-lg border border-neutral-200/80">
                <legend className="sr-only">Decisión para la línea {d.line}</legend>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-neutral-800 hover:text-brand-800 select-none">
                  <input
                    type="radio"
                    name={nombre}
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
                    checked={decision === false}
                    onChange={() => imp.decidir(d.line, false)}
                    className="accent-neutral-700 h-4 w-4 cursor-pointer"
                  />
                  <span>Omitir</span>
                </label>
              </fieldset>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
