'use client';

import { useMemo, useState } from 'react';
import { LoadingSkeleton } from '@/components/ui';
import { useMapLayers } from '@/hooks/useMapLayers';
import { LayerToggles } from './LayerToggles';
import { Map3DView } from './Map3DView';
import { MapAttribution } from './MapAttribution';
import { MapFallback } from './MapFallback';
import { MapInfoCard } from './MapInfoCard';
import { MapSearch } from './MapSearch';
import { MapToolbar } from './MapToolbar';
import { ModeLegend } from './ModeLegend';
import { toSceneData } from './sceneData';
import { buildSearchIndex } from './searchIndex';
import { useMapScreenState } from './useMapScreenState';

/** El mapa del campus a pantalla completa: la maqueta 3D con buscador, capas, leyenda y ficha. */
export function MapScreen() {
  const { data: response, isLoading, errorMessage, stale } = useMapLayers();
  const data = useMemo(() => (response ? toSceneData(response) : null), [response]);
  const index = useMemo(() => (data ? buildSearchIndex(data) : []), [data]);
  const s = useMapScreenState(data);
  const [panelOpen, setPanelOpen] = useState(false);

  if (isLoading) return <LoadingSkeleton />;
  if (!data || !response) {
    return (
      <p role="alert" className="m-4 rounded-md bg-red-50 p-3 text-sm text-red-800">
        No se pudo cargar el mapa. {errorMessage}
      </p>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#dfe7ee]">
      {s.unsupported ? (
        <MapFallback data={data} onPick={s.select} />
      ) : (
        <Map3DView
          data={data}
          onReady={s.onReady}
          onUnsupported={s.onUnsupported}
          onSelect={s.onSelect}
          onGroundPick={s.onGroundPick}
          onHover={() => undefined}
          onCompass={s.onCompass}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 p-3">
        <div className="pointer-events-auto w-full max-w-sm space-y-2">
          <MapSearch index={index} onPick={(e) => s.select(e.target)} />
          {stale && (
            <p role="status" className="rounded-md bg-amber-50/95 px-3 py-1.5 text-xs text-amber-900 shadow">
              Sin conexión: se muestra la última versión descargada del mapa.
            </p>
          )}
        </div>
        {!s.unsupported && (
          <div className="pointer-events-auto">
            <MapToolbar
              options={s.options}
              compass={s.compass}
              onOption={s.setOption}
              onFit={() => s.viewer.current?.fit()}
              onTop={() => s.viewer.current?.top()}
              onNorth={() => s.viewer.current?.north()}
              onSpin={() => s.viewer.current?.toggleSpin()}
            />
          </div>
        )}
      </div>

      {!s.unsupported && (
        <aside className="absolute right-3 top-28 z-10 w-56 md:top-16">
          <button
            type="button"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((o) => !o)}
            className="ml-auto block rounded-md bg-white/95 px-3 py-1 text-xs font-medium text-neutral-700 shadow"
          >
            {panelOpen ? 'Ocultar capas y leyenda' : 'Capas y leyenda'}
          </button>
          {panelOpen && (
            <div className="mt-2 max-h-[60vh] space-y-4 overflow-y-auto rounded-lg border border-neutral-200 bg-white/95 p-3 shadow-lg">
              <ModeLegend mode={s.mode} hidden={s.hidden} onModeChange={s.setMode} onToggleCategory={s.toggleCategory} />
              <LayerToggles visible={s.visible} onToggle={s.toggleLayer} />
            </div>
          )}
        </aside>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-2 p-3">
        {s.card && (
          <div className="pointer-events-auto w-full max-w-sm">
            <MapInfoCard content={s.card} onClose={s.closeCard} />
          </div>
        )}
        <div className="pointer-events-auto">
          <MapAttribution required={response.attributionRequired} />
        </div>
      </div>
    </div>
  );
}
