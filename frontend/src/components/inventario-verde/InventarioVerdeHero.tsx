'use client';

export interface InventarioVerdeHeroProps {
  title?: string;
  totalSpecimens?: number;
}

/** Total de ejemplares leñosos estimados en el campus PUCP según el dominio (C-02 y REQ 2.12) */
export const ESTIMATED_CAMPUS_SPECIMENS = 3500;

/**
 * Cabecera institucional limpia para el catálogo de especies y catastro de ejemplares.
 * Muestra el título y el indicador de avance censal sin botones de registro al vuelo
 * ni pestañas duplicadas (la navegación modular se gestiona a través del menú lateral).
 */
export function InventarioVerdeHero({
  title = 'Inventario de Especies',
  totalSpecimens,
}: InventarioVerdeHeroProps) {
  const percentage =
    totalSpecimens !== undefined && ESTIMATED_CAMPUS_SPECIMENS > 0
      ? Math.min(100, Math.round((totalSpecimens / ESTIMATED_CAMPUS_SPECIMENS) * 100))
      : null;

  return (
    <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 whitespace-nowrap">
        {title}
      </h1>

      {totalSpecimens !== undefined && (
        <div
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-brand-50/80 border border-brand-200/70 shadow-2xs shrink-0 self-start md:self-auto"
          title={`Avance progresivo: ${totalSpecimens.toLocaleString('es-PE')} de ~${ESTIMATED_CAMPUS_SPECIMENS.toLocaleString('es-PE')} ejemplares estimados en el campus PUCP (C-02)`}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-neutral-600 font-medium">
              Catastro censado:
            </span>
            <span className="text-sm font-bold text-neutral-900 font-mono">
              {totalSpecimens.toLocaleString('es-PE')}
            </span>
            <span className="text-xs text-neutral-400 font-medium">
              / ~{ESTIMATED_CAMPUS_SPECIMENS.toLocaleString('es-PE')}
            </span>
          </div>

          {percentage !== null && (
            <div className="flex items-center gap-2 pl-2.5 border-l border-brand-200/80">
              <div className="w-14 sm:w-16 h-2 rounded-full bg-brand-200/60 overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-600 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-xs font-bold text-brand-900 font-mono">
                {percentage}%
              </span>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
