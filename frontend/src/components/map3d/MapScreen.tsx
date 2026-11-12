'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { BackButton } from '@/components/ui/BackButton';
import { LoadingSkeleton } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { useMapLayers } from '@/hooks/useMapLayers';
import { usePlanModel } from '@/hooks/usePlanModel';
import { useCatalogLinkFor, useCatalogOnMap, useMapCatalog } from './catalog/useCatalogOnMap';
import { LayerToggles } from './LayerToggles';
import { Map3DView } from './Map3DView';
import { MapAttribution } from './MapAttribution';
import { MapFallback } from './MapFallback';
import { MapFullscreenButton } from './MapFullscreenButton';
import { MapInfoCard } from './MapInfoCard';
import { MapSearch } from './MapSearch';
import { MapToolbar } from './MapToolbar';
import { mapScreenPose } from './mapScreenMemory';
import { ModeLegend } from './ModeLegend';
import { toSceneData } from './sceneData';
import { buildSearchIndex, isCatalogTarget } from './searchIndex';
import { useMapScreenState } from './useMapScreenState';

/** El mapa del campus a pantalla completa: la maqueta 3D con buscador, capas, leyenda y ficha. */
export function MapScreen() {
  const searchParams = useSearchParams();
  const codigoParam = searchParams?.get('codigo') ?? null;

  const { data: response, isLoading, errorMessage, stale } = useMapLayers();
  const scene = useMemo(() => {
    if (!response) return { data: null, broken: false };
    try {
      return { data: toSceneData(response), broken: false };
    } catch {
      return { data: null, broken: true };
    }
  }, [response]);
  const data = scene.data;
  const catalog = useMapCatalog();
  const { user } = useAuth();
  const s = useMapScreenState(data, user?.email ?? '', useCatalogLinkFor(data, catalog));
  // Llega después de las capas: mientras tanto, y si falla, los edificios son prismas. Se descarga
  // solo cuando un visor quedó listo (hay WebGL): sin WebGL se ven las listas y el modelo no sirve.
  const plan = usePlanModel(data?.plane ?? null, s.viewerEpoch > 0);
  const onMap = useCatalogOnMap(data, catalog, s);
  const index = useMemo(() => (data ? [...onMap.entries, ...buildSearchIndex(data)] : []), [data, onMap.entries]);
  const root = useRef<HTMLDivElement>(null);
  const focusedParamRef = useRef<string | null>(null);
  const viewerSettled = s.viewerEpoch > 0 || s.unsupported;

  // Deep-link: ?codigo=EV-XXXXXX elige el ejemplar. Espera al visor, que carga aparte: sin él no hay a quién mover la cámara.
  useEffect(() => {
    if (!codigoParam || !data || !viewerSettled || focusedParamRef.current === codigoParam) return;
    const normalizedParam = codigoParam.trim().toLowerCase();
    const entry = index.find((item) => item.title.toLowerCase() === normalizedParam || item.key.toLowerCase().includes(normalizedParam));
    if (entry) {
      focusedParamRef.current = codigoParam;
      if (isCatalogTarget(entry.target)) {
        onMap.pick(entry.target);
      } else {
        if (!s.visible[entry.target.layer]) s.toggleLayer(entry.target.layer, true);
        s.select(entry.target);
      }
      // Se consume una sola vez: regresar a esta entrada del historial debe mostrar el mapa como se dejó.
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
  }, [codigoParam, data, index, onMap, s, viewerSettled]);

  if (isLoading) return <LoadingSkeleton />;
  if (scene.broken) {
    return (
      <p role="alert" className="m-4 rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
        Los datos del mapa están incompletos. Recarga la página; si el problema sigue, avisa al equipo.
      </p>
    );
  }
  if (!data || !response) {
    return (
      <p role="alert" className="m-4 rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">
        No se pudo cargar el mapa. {errorMessage}
      </p>
    );
  }

  return (
    <div ref={root} className="relative h-full w-full overflow-hidden bg-[#dfe7ee]">
      {s.unsupported ? (
        <MapFallback data={data} onPick={s.select} />
      ) : (
        <Map3DView
          data={data}
          model={plan.model}
          onReady={s.onReady}
          onUnsupported={s.onUnsupported}
          onSelect={s.onSelect}
          onGroundPick={s.onGroundPick}
          onHover={() => undefined}
          onCompass={s.onCompass}
          onViewConePick={onMap.onConePick}
          poseMemory={mapScreenPose}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 p-3">
        <div className="pointer-events-auto w-full max-w-sm space-y-2">
          <div className="flex items-center gap-2">
            <BackButton />
            <div className="min-w-0 flex-1">
              <MapSearch index={index} onPick={(e) => (isCatalogTarget(e.target) ? onMap.pick(e.target) : s.select(e.target))} />
            </div>
          </div>
          {stale && (
            <p role="status" className="rounded-md bg-alert-warning-bg/95 px-3 py-1.5 text-xs text-alert-warning-fg shadow">
              Sin conexión: se muestra la última versión descargada del mapa.
            </p>
          )}
          {plan.failed && !s.unsupported && (
            <p role="status" className="rounded-md bg-alert-warning-bg/95 px-3 py-1.5 text-xs text-alert-warning-fg shadow">
              No se pudo cargar el modelo del plano; los edificios se ven como bloques.
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
            aria-expanded={s.panelOpen}
            onClick={() => s.setPanelOpen((o) => !o)}
            className="ml-auto block rounded-md bg-neutral-0/95 px-3 py-1 text-xs font-medium text-neutral-700 shadow"
          >
            {s.panelOpen ? 'Ocultar capas y leyenda' : 'Capas y leyenda'}
          </button>
          {s.panelOpen && (
            <div className="mt-2 max-h-[60vh] space-y-4 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-0/95 p-3 shadow-lg">
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

      <div className="absolute bottom-3 right-3">
        <MapFullscreenButton target={root} />
      </div>
    </div>
  );
}
