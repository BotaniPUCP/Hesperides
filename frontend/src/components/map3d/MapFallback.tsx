'use client';

import type { SceneData } from './sceneData';
import type { Target } from './target';

export interface MapFallbackProps {
  data: SceneData;
  onPick: (target: Target) => void;
}

const NO_SECTOR = 'Sin sector';

/**
 * Sin WebGL no hay maqueta, pero la información sigue siendo útil: las áreas
 * verdes agrupadas por sector, con la misma ficha que abriría el clic en 3D
 * (SPEC-102 §5.2).
 */
export function MapFallback({ data, onPick }: MapFallbackProps) {
  const groups = new Map<string, { name: string; index: number }[]>();
  data.greenAreas.forEach((s, index) => {
    const sector = s.props.parentCode ? (data.sectorNameByCode[s.props.parentCode] ?? s.props.parentCode) : NO_SECTOR;
    groups.set(sector, [...(groups.get(sector) ?? []), { name: s.props.name, index }]);
  });

  return (
    <div className="h-full overflow-y-auto p-4 pt-20">
      <p role="status" className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-900">
        Este navegador no puede mostrar la maqueta 3D. Puedes consultar las áreas verdes en esta lista o usar el buscador.
      </p>
      {[...groups.entries()].map(([sector, sections]) => (
        <details key={sector} className="mb-2 rounded-md border border-neutral-200 bg-white">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            {sector} <span className="text-neutral-500">({sections.length})</span>
          </summary>
          <ul className="border-t border-neutral-100">
            {sections.map((s) => (
              <li key={s.index}>
                <button type="button" onClick={() => onPick({ layer: 'greenAreas', index: s.index })} className="w-full px-3 py-1.5 text-left text-sm hover:bg-neutral-50">
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
