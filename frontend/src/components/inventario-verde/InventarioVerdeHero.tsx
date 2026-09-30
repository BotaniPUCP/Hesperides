'use client';

import { Input } from '@/components/ui';

export interface InventarioVerdeHeroProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
}

/**
 * Hero compacto e institucional para el Inventario de Especies.
 * Diseñado con altura optimizada para dar prioridad al contenido y al buscador.
 */
export function InventarioVerdeHero({ searchValue, onSearchChange }: InventarioVerdeHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-xl bg-brand-900 py-5 px-5 sm:py-6 sm:px-8 text-neutral-0 shadow-md mb-4">
      {/* Follaje botánico integrado sutilmente a la derecha */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-2/5 sm:w-1/3 overflow-hidden select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=800&q=80"
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-center opacity-30 mix-blend-screen"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-900 via-brand-900/60 to-transparent" />
      </div>

      <div className="relative z-10 max-w-2xl">
        {/* Badge institucional compacto */}
        <div className="inline-flex flex-wrap items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-neutral-900/70 border border-brand-700/70 text-brand-100 text-[11px] font-medium mb-2 backdrop-blur-xs">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
          <span className="font-semibold text-neutral-0">Inventario Botánico Oficial PUCP</span>
          <span className="text-brand-300/60">›</span>
          <span className="text-brand-100">Fotografías provisionales de referencia</span>
        </div>

        {/* Título optimizado */}
        <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-neutral-0 mb-1 leading-snug">
          Inventario de Especies
        </h1>

        {/* Descripción directa y concisa */}
        <p className="text-xs sm:text-[13px] text-brand-50/90 mb-3.5 leading-normal max-w-xl">
          Consulta la diversidad vegetal, ejemplares censados y georreferenciación del campus universitario.
        </p>

        {/* Buscador como elemento principal de acción */}
        <div className="max-w-xl">
          <Input
            id="inventario-global-search"
            label=""
            type="search"
            value={searchValue}
            onChange={onSearchChange}
            placeholder="Buscar por nombre común, científico o familia botánica..."
            leadingIcon={
              <svg
                className="h-4 w-4 text-neutral-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}
