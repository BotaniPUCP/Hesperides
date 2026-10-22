'use client';

export interface InventarioVerdeStatsProps {
  totalSpecies: number;
  totalSpecimens: number;
  totalTypes: number;
}

/**
 * Indicadores KPI institucionales y armoniosos para el inventario verde.
 * Siguen la jerarquía visual de Carbon y Adobe Spectrum: números claros,
 * etiquetas en mayúsculas muted y sutil detalle botánico.
 */
export function InventarioVerdeStats({
  totalSpecies,
  totalSpecimens,
  totalTypes,
}: InventarioVerdeStatsProps) {
  const kpis = [
    {
      label: 'Especies Registradas',
      val: totalSpecies,
      sub: 'Especies identificadas',
      icon: (
        <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V11M12 11c0-4 4-7 8-7-1 4-4 7-8 7zm0 0c0-3-3-5.5-6-5.5.75 3 3 5.5 6 5.5zm0 4c2.5 0 5-1.5 6-3.5-2.5 0-5 1-6 3.5zm0 0c-2.5 0-5 1-6 3.5 2.5 0 5-1 6-3.5z" />
        </svg>
      ),
    },
    {
      label: 'Ejemplares Censados',
      val: totalSpecimens,
      sub: 'Ejemplares registrados',
      icon: (
        <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M7 16v-4m5 4V8m5 8v-6" />
        </svg>
      ),
    },
    {
      label: 'Tipos de Vegetación',
      val: totalTypes,
      sub: 'Categorías botánicas activas',
      icon: (
        <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 21c.5-4.5 2.5-8 7-9m0 0c5-1 8-5 8-9-4.5.5-8 2.5-9 7m1 2c-3.5 1-6 4-7 9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-2xl border border-neutral-200/90 bg-neutral-0 px-5 py-4 shadow-2xs flex items-center justify-between"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 truncate">
              {kpi.label}
            </p>
            <p className="text-2xl sm:text-3xl font-extrabold text-neutral-900 font-mono tracking-tight leading-tight mt-1">
              {kpi.val}
            </p>
            <p className="text-[11px] text-neutral-400 font-medium mt-0.5 truncate">
              {kpi.sub}
            </p>
          </div>

          <div
            className="text-brand-600 flex-shrink-0 ml-3 p-2.5 rounded-xl bg-brand-50 border border-brand-100"
            aria-hidden="true"
          >
            {kpi.icon}
          </div>
        </div>
      ))}
    </div>
  );
}
