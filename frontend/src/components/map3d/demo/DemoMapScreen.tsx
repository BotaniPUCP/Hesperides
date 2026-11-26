'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MapLayersResponse } from '@shared/types';
import { Map3DView } from '../Map3DView';
import { MapAttribution } from '../MapAttribution';
import { MapSearch } from '../MapSearch';
import { MapToolbar, type ViewOptions } from '../MapToolbar';
import { INITIAL_OPTIONS } from '../mapScreenMemory';
import { APPLY_OPTION } from '../restoreMapScreen';
import { toSceneData, type SceneData } from '../sceneData';
import { buildSearchIndex, isCatalogTarget } from '../searchIndex';
import type { Target } from '../target';
import type { DemoPlant, DemoPlantKind, Viewer } from '../viewer/viewerTypes';
import { DemoHelp, DemoPlantControls } from './DemoMapControls';

const MAX_PLANTS = 20;
const MAP_BUTTON = 'min-h-10 rounded-lg bg-neutral-0/95 px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-brand-600';
const MAP_CHECK = 'flex min-h-10 cursor-pointer items-center gap-2 px-1 text-sm';
const NOOP = () => undefined;
const VIEWER_START = { matchedBuildingLooks: true, frameWholeCampus: true, realColors: true };

type LoadResult = { data: SceneData; attributionRequired: boolean } | 'failed';

export function DemoMapScreen() {
  const [result, setResult] = useState<LoadResult>();
  useEffect(() => {
    let mounted = true;
    import('./campus.json')
      .then(({ default: snapshot }) => {
        if (mounted) setResult({ data: toSceneData(snapshot as MapLayersResponse), attributionRequired: snapshot.attributionRequired });
      })
      .catch(() => {
        if (mounted) setResult('failed');
      });
    return () => { mounted = false; };
  }, []);

  if (result && result !== 'failed') {
    return <DemoCampus data={result.data} attributionRequired={result.attributionRequired} />;
  }
  return (
    <main className="flex min-h-dvh items-center justify-center bg-neutral-50 p-6">
      <div className="surface-card max-w-sm text-center">
        <h1 className="page-title text-xl">Hesperides · Demo del campus</h1>
        <p role={result === 'failed' ? 'alert' : 'status'} className="mt-2 text-sm text-neutral-700">
          {result === 'failed' ? 'No se pudo cargar el mapa. Recarga la página para volver a intentarlo.' : 'Cargando el mapa del campus…'}
        </p>
      </div>
    </main>
  );
}

interface DemoCampusProps {
  data: SceneData;
  attributionRequired: boolean;
}

function DemoCampus({ data, attributionRequired }: DemoCampusProps) {
  const root = useRef<HTMLElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [compass, setCompass] = useState(0);
  const [options, setOptions] = useState<ViewOptions>(INITIAL_OPTIONS);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [capture, setCapture] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [selection, setSelection] = useState<Target | null>(null);
  const [gardens, setGardens] = useState(true);
  const [vegetation, setVegetation] = useState(true);
  const [plants, setPlants] = useState<DemoPlant[]>([]);
  const [plantKind, setPlantKind] = useState<DemoPlantKind | null>(null);
  const [plantMessage, setPlantMessage] = useState('');

  const index = useMemo(() => buildSearchIndex({ ...data, vegetation: [] }), [data]);
  const selectedLabel = publicLabel(data, selection);

  useEffect(() => {
    viewer?.setLayerVisible('greenAreas', gardens);
    viewer?.setLayerVisible('xerophytic', gardens);
    viewer?.setLayerVisible('vegetation', vegetation);
  }, [viewer, gardens, vegetation]);

  useEffect(() => {
    viewer?.setDemoPlants?.(plants);
  }, [viewer, plants]);

  useEffect(() => {
    if (!capture) return;
    const node = root.current;
    function exitOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setCapture(false);
    }
    function exitOnFullscreenChange() {
      if (!document.fullscreenElement) setCapture(false);
    }
    window.addEventListener('keydown', exitOnEscape);
    document.addEventListener('fullscreenchange', exitOnFullscreenChange);
    return () => {
      window.removeEventListener('keydown', exitOnEscape);
      document.removeEventListener('fullscreenchange', exitOnFullscreenChange);
      if (node && document.fullscreenElement === node) void document.exitFullscreen().catch(NOOP);
    };
  }, [capture]);

  function changeOption(key: keyof ViewOptions, value: boolean) {
    setOptions((current) => ({ ...current, [key]: value }));
    if (viewer) APPLY_OPTION[key](viewer, value);
  }

  function changeCapture(on: boolean) {
    setCapture(on);
    if (on) void root.current?.requestFullscreen?.().catch(NOOP);
  }

  useEffect(() => {
    viewer?.setCaptureMode(capture);
  }, [viewer, capture]);

  function pick(target: Target | null) {
    if (!plantKind) {
      setSelection(target);
      return;
    }
    if (target?.layer !== 'greenAreas' && target?.layer !== 'xerophytic') {
      setPlantMessage('Elige un punto dentro de un jardín o área verde.');
    }
  }

  function plant(lat: number, lon: number, target?: Target | null) {
    if (!plantKind || (target?.layer !== 'greenAreas' && target?.layer !== 'xerophytic')) return;
    setPlants((current) => current.length < MAX_PLANTS ? [...current, { kind: plantKind, lat, lon }] : current);
    setPlantKind(null);
    setPlantMessage('Planta añadida solo a tu demo.');
    viewer?.select(null, false);
    viewer?.clearPin?.();
  }

  return (
    <main ref={root} className="relative h-dvh min-h-80 overflow-hidden bg-[#dfe7ee]">
      {!unsupported && (
        <Map3DView
          data={data}
          start={VIEWER_START}
          bare={capture}
          onReady={(map) => {
            if (window.matchMedia('(pointer: coarse)').matches) {
              map.setShadows(false);
              setOptions((current) => ({ ...current, shadows: false }));
            }
            map.fit();
            viewerRef.current = map;
            setViewer(map);
          }}
          onUnsupported={() => setUnsupported(true)}
          onSelect={pick}
          onPointPick={plant}
          onGroundPick={NOOP}
          onHover={NOOP}
          onCompass={setCompass}
        />
      )}
      {capture && (
        <button type="button" onClick={() => changeCapture(false)} className={`${MAP_BUTTON} absolute left-1/2 top-3 z-20 -translate-x-1/2`}>
          Salir del modo captura
        </button>
      )}
      <header hidden={capture} className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-4">
        <div className="w-full max-w-xl">
          <div className="pointer-events-auto mb-2 max-w-sm rounded-lg bg-neutral-0/95 px-3 py-2 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Hesperides · Demo pública</p>
            <h1 className="text-xl font-bold text-neutral-900">Explora el campus en 3D</h1>
          </div>
          <div className="pointer-events-auto relative z-20 max-w-sm">
            <MapSearch index={index} onPick={({ target }) => {
              if (isCatalogTarget(target)) return;
              setSelection(target);
              if (target.layer === 'greenAreas' || target.layer === 'xerophytic') setGardens(true);
              viewer?.select(target, true);
            }} />
          </div>
          {viewer && (
            <>
              <div className="relative z-10 mt-2 flex w-fit flex-wrap items-start gap-1.5">
                <button type="button" aria-expanded={toolbarOpen} aria-controls="demo-map-toolbar"
                  className={`${MAP_BUTTON} pointer-events-auto sm:hidden`} onClick={() => setToolbarOpen((open) => !open)}>
                  Controles del mapa
                </button>
                <div className="pointer-events-auto">
                  <DemoHelp topic="Cómo navegar" position="belowEnd">
                    Arrastra para moverte y usa la rueda o pellizca para acercarte. Prueba «Atardecer» y ajusta la hora.
                    «Colores reales» muestra los acabados de los edificios que tienen ficha en la demo.
                  </DemoHelp>
                </div>
                <details className="pointer-events-auto relative">
                  <summary className={`${MAP_BUTTON} cursor-pointer list-none`}>Capas</summary>
                  <div className="absolute right-0 mt-1 w-56 rounded-lg border border-neutral-200 bg-neutral-0 p-2 shadow-lg sm:left-0 sm:right-auto">
                    <label className={MAP_CHECK}>
                      <input type="checkbox" checked={gardens} onChange={(event) => {
                        setGardens(event.target.checked);
                        if (!event.target.checked) setPlantKind(null);
                      }} /> Jardines y áreas verdes
                    </label>
                    <label className={MAP_CHECK}>
                      <input type="checkbox" checked={vegetation} onChange={(event) => setVegetation(event.target.checked)} />
                      Vegetación del campus
                    </label>
                    <div className="flex items-center gap-2 border-t border-neutral-200 pt-1 text-sm">
                      <DemoHelp topic="Qué muestran las capas" position="belowEnd">
                        Los edificios quedan visibles para orientarte. Puedes ocultar los jardines o la vegetación registrada.
                        Tus plantas de prueba llevan la etiqueta «Demo».
                      </DemoHelp>
                      <span>Sobre las capas</span>
                    </div>
                  </div>
                </details>
              </div>
              <div id="demo-map-toolbar" className={`mt-2 w-fit max-w-full ${toolbarOpen ? 'block' : 'hidden'} sm:block`}>
                <MapToolbar options={options} compass={compass} onOption={changeOption} viewer={viewerRef} onCapture={() => changeCapture(true)} roomy />
              </div>
            </>
          )}
          {!viewer && (
            <p role="status" className="mt-2 rounded-lg bg-neutral-0/95 p-3 text-sm text-neutral-800 shadow-sm">
              {unsupported
                ? 'Este navegador no puede mostrar la maqueta 3D. Aún puedes buscar edificios y jardines.'
                : 'Preparando el visor 3D…'}
            </p>
          )}
          {selectedLabel && !plantKind && (
            <p role="status" className="mt-2 w-fit max-w-full rounded-lg bg-neutral-0/95 px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm">{selectedLabel}</p>
          )}
        </div>
      </header>

      {viewer && (
        <div hidden={capture} className="absolute inset-x-3 bottom-10 z-10 max-w-sm sm:left-4">
          <DemoPlantControls
            kind={plantKind}
            count={plants.length}
            limit={MAX_PLANTS}
            message={plantMessage}
            onChoose={(kind) => {
              setGardens(true);
              setPlantKind(kind);
              setPlantMessage('');
              setSelection(null);
              viewer.select(null, false);
            }}
            onCancel={() => { setPlantKind(null); setPlantMessage(''); }}
            onUndo={() => { setPlants((current) => current.slice(0, -1)); setPlantMessage('Se quitó la última planta.'); }}
            onClear={() => { setPlants([]); setPlantMessage('Se quitaron las plantas de prueba.'); }}
          />
        </div>
      )}
      <div className="absolute bottom-2 right-3">
        <MapAttribution required={attributionRequired} />
      </div>
    </main>
  );
}

function publicLabel(data: SceneData, selection: Target | null): string | null {
  if (!selection) return null;
  const { layer, index } = selection;
  switch (layer) {
    case 'campusBuildings': return data.campusBuildings[index]?.props.name ?? 'Edificio del campus';
    case 'greenAreas': return data.greenAreas[index]?.props.name ?? null;
    case 'xerophytic': return data.xerophytic[index]?.props.name ?? null;
    case 'vegetation': return data.vegetation[index]?.props.commonName ?? data.vegetation[index]?.props.scientificName ?? null;
    default: return null;
  }
}
