export interface InventarioVerdeHeroProps {
  totalSpecies?: number;
  totalSpecimens?: number;
}

/** Total de ejemplares leñosos estimados en el campus PUCP según el dominio (C-02 y REQ 2.12) */
export const ESTIMATED_CAMPUS_SPECIMENS = 3500;

/**
 * Cabecera limpia y compacta estilo SaaS/Enterprise para el Inventario de Especies.
 * Fondo blanco institucional con badges numéricos integrados que eliminan el desperdicio de espacio vertical.
 */
export function InventarioVerdeHero({
  totalSpecies,
  totalSpecimens,
}: InventarioVerdeHeroProps) {
  const percentage =
    totalSpecimens !== undefined && ESTIMATED_CAMPUS_SPECIMENS > 0
      ? Math.min(100, Math.round((totalSpecimens / ESTIMATED_CAMPUS_SPECIMENS) * 100))
      : null;

  return (
    <header className="mb-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
          Inventario de Especies
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 mt-1">
          Consulta la diversidad vegetal, ejemplares censados y georreferenciación del campus universitario.
        </p>
      </div>

      {(totalSpecies !== undefined || totalSpecimens !== undefined) && (
        <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto shrink-0">
          {totalSpecies !== undefined && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-0 border border-neutral-200/90 shadow-2xs">
              <span className="text-xs text-neutral-500 font-medium">Especies:</span>
              <span className="text-sm font-bold text-neutral-900 font-mono">
                {totalSpecies}
              </span>
            </div>
          )}

          {totalSpecimens !== undefined && (
            <div
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-brand-50/80 border border-brand-200/70 shadow-2xs"
              title={`Avance progresivo: ${totalSpecimens.toLocaleString('es-PE')} de ~${ESTIMATED_CAMPUS_SPECIMENS.toLocaleString('es-PE')} ejemplares estimados en el campus PUCP (C-02)`}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-neutral-600 font-medium">
                  Catastro censado:
                </span>
                <span className="text-sm font-bold text-neutral-900 font-mono">
                  {totalSpecimens}
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
        </div>
      )}
    </header>
  );
}
