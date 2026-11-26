'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { infoFor } from '../infoCard';
import { initialVisibility, LAYER_TOGGLES, OVERLAY_TOGGLES, type ToggleId } from '../layerList';
import { LayerToggles } from '../LayerToggles';
import { Map3DView } from '../Map3DView';
import { MapAttribution } from '../MapAttribution';
import { MapSearch } from '../MapSearch';
import { MapToolbar, type ViewOptions } from '../MapToolbar';
import { INITIAL_OPTIONS } from '../mapScreenMemory';
import { ModeLegend } from '../ModeLegend';
import type { ModeId } from '../modes';
import { APPLY_OPTION, applyToViewer } from '../restoreMapScreen';
import { buildSearchIndex, isCatalogTarget } from '../searchIndex';
import type { LayerId, Target } from '../target';
import type { DemoPlant, DemoPlantKind, Viewer } from '../viewer/viewerTypes';
import { DemoHelp, DemoPlantControls } from './DemoMapControls';
import { loadDemoScene } from './loadDemoScene';

const MAX_PLANTS = 20;
const MAP_BUTTON = 'min-h-10 rounded-lg bg-neutral-0/95 px-3 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-100 focus-visible:ring-2 focus-visible:ring-brand-600';
const NOOP = () => undefined;
const PUBLIC_LAYERS = LAYER_TOGGLES.filter(({ id }) => !OVERLAY_TOGGLES.has(id) && id !== 'supervision' && id !== 'sidewalks');

type DemoScene = Awaited<ReturnType<typeof loadDemoScene>>;

export function DemoMapScreen() {
  const [result, setResult] = useState<DemoScene | 'failed'>();
  useEffect(() => {
    const controller = new AbortController();
    void loadDemoScene(controller.signal).then(
      (scene) => { if (!controller.signal.aborted) setResult(scene); },
      () => { if (!controller.signal.aborted) setResult('failed'); },
    );
    return () => controller.abort();
  }, []);

  if (result && result !== 'failed') {
    return <DemoCampus {...result} />;
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

function DemoCampus({ data, model, attributionRequired }: DemoScene) {
  const root = useRef<HTMLElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [compass, setCompass] = useState(0);
  const theme = useTheme();
  const [options, setOptions] = useState<ViewOptions>(() => ({ ...INITIAL_OPTIONS, night: theme.resolved === 'dark' }));
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [capture, setCapture] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [selection, setSelection] = useState<Target | null>(null);
  const [visible, setVisible] = useState(initialVisibility);
  const [mode, setMode] = useState<ModeId>('base');
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [plants, setPlants] = useState<DemoPlant[]>([]);
  const [plantKind, setPlantKind] = useState<DemoPlantKind | null>(null);
  const [plantMessage, setPlantMessage] = useState('');

  const index = useMemo(() => buildSearchIndex(data), [data]);
  const selectedLabel = selection ? infoFor(data, selection).title : null;

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

  function toggleLayer(id: ToggleId, on: boolean) {
    setVisible((current) => ({ ...current, [id]: on }));
    viewer?.setLayerVisible(id as LayerId, on);
    if (!on && (id === 'greenAreas' || id === 'xerophytic')) setPlantKind(null);
  }

  function changeMode(nextMode: ModeId) {
    const nextHidden = new Set<string>();
    setMode(nextMode);
    setHidden(nextHidden);
    viewer?.setPaint(nextMode, nextHidden);
  }

  function toggleCategory(key: string) {
    const nextHidden = new Set(hidden);
    if (!nextHidden.delete(key)) nextHidden.add(key);
    setHidden(nextHidden);
    viewer?.setPaint(mode, nextHidden);
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
          model={model}
          bare={capture}
          onReady={(map) => {
            applyToViewer(map, { mode, hidden, visible, options });
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
              if (!visible[target.layer]) toggleLayer(target.layer, true);
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
                    «Colores reales» muestra los acabados de los edificios, igual que en el mapa de Hesperides.
                  </DemoHelp>
                </div>
                <details className="pointer-events-auto relative">
                  <summary className={`${MAP_BUTTON} cursor-pointer list-none`}>Capas</summary>
                  <div className="absolute right-0 mt-1 max-h-[55dvh] w-56 space-y-3 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-0 p-3 shadow-lg sm:left-0 sm:right-auto">
                    <ModeLegend mode={mode} hidden={hidden} onModeChange={changeMode} onToggleCategory={toggleCategory} />
                    <LayerToggles layers={PUBLIC_LAYERS} visible={visible} onToggle={toggleLayer} />
                    <div className="flex items-center gap-2 border-t border-neutral-200 pt-1 text-sm">
                      <DemoHelp topic="Qué muestran las capas" position="above">
                        Activa u oculta capas y cambia cómo se colorean los jardines.
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
              toggleLayer('greenAreas', true);
              toggleLayer('xerophytic', true);
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
