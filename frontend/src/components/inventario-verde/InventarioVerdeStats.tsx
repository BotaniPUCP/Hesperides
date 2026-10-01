'use client';

export interface InventarioVerdeStatsProps {
  totalSpecies: number;
  totalSpecimens: number;
  totalTypes: number;
}

/**
 * Indicadores KPI compactos y estilizados para el inventario de especies.
 * Incorpora un fondo verde sutil, insignias circulares y marcas de agua botánicas.
 */
export function InventarioVerdeStats({
  totalSpecies,
  totalSpecimens,
  totalTypes,
}: InventarioVerdeStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
      {/* KPI: Especies registradas */}
      <div className="rounded-xl border border-brand-200/70 bg-brand-50/35 hover:bg-brand-50/60 px-4 py-3 sm:py-3.5 shadow-2xs flex items-center justify-between transition-colors group">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-neutral-500 truncate">
            Especies Registradas
          </p>
          <p className="text-xl sm:text-2xl font-semibold text-neutral-800 leading-tight mt-0.5">
            {totalSpecies}
          </p>
        </div>

        {/* Icono temático único a la derecha */}
        <div className="text-brand-600/60 group-hover:text-brand-700 transition-colors flex-shrink-0 ml-3" aria-hidden="true">
          <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V11M12 11c0-4 4-7 8-7-1 4-4 7-8 7zm0 0c0-3-3-5.5-6-5.5.75 3 3 5.5 6 5.5zm0 4c2.5 0 5-1.5 6-3.5-2.5 0-5 1-6 3.5zm0 0c-2.5 0-5 1-6 3.5 2.5 0 5-1 6-3.5z" />
          </svg>
        </div>
      </div>

      {/* KPI: Ejemplares censados */}
      <div className="rounded-xl border border-brand-200/70 bg-brand-50/35 hover:bg-brand-50/60 px-4 py-3 sm:py-3.5 shadow-2xs flex items-center justify-between transition-colors group">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-neutral-500 truncate">
            Ejemplares Censados
          </p>
          <p className="text-xl sm:text-2xl font-semibold text-neutral-800 leading-tight mt-0.5">
            {totalSpecimens}
          </p>
        </div>

        {/* Icono temático único a la derecha */}
        <div className="text-brand-600/60 group-hover:text-brand-700 transition-colors flex-shrink-0 ml-3" aria-hidden="true">
          <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h16M7 16v-4m5 4V8m5 8v-6" />
          </svg>
        </div>
      </div>

      {/* KPI: Tipos de vegetación */}
      <div className="rounded-xl border border-brand-200/70 bg-brand-50/35 hover:bg-brand-50/60 px-4 py-3 sm:py-3.5 shadow-2xs flex items-center justify-between transition-colors group">
        <div className="min-w-0">
          <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-neutral-500 truncate">
            Tipos de Vegetación
          </p>
          <p className="text-xl sm:text-2xl font-semibold text-neutral-800 leading-tight mt-0.5">
            {totalTypes}
          </p>
        </div>

        {/* Icono temático único a la derecha */}
        <div className="text-brand-600/60 group-hover:text-brand-700 transition-colors flex-shrink-0 ml-3" aria-hidden="true">
          <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 21c.5-4.5 2.5-8 7-9m0 0c5-1 8-5 8-9-4.5.5-8 2.5-9 7m1 2c-3.5 1-6 4-7 9" />
          </svg>
        </div>
      </div>
    </div>
  );
}
