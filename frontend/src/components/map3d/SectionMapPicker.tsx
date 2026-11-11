'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GreenAreaSetElement } from '@shared/types';
import type { IrrigationZone } from '@shared/types/irrigation';
import { Button, LoadingSkeleton } from '@/components/ui';
import { Map3DView } from './Map3DView';
import { MapAttribution } from './MapAttribution';
import { toSceneData, type SceneData } from './sceneData';
import type { Target } from './target';
import type { Viewer } from './viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';
import { useRectangleSelection } from './useRectangleSelection';

const ALL = 'ALL';
const FIELD = 'h-10 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 text-neutral-900';

/** Lo que cambia entre quien usa el selector: Riego, Conjuntos de áreas verdes. */
export interface SectionPickerTexts {
  title: string;
  description: string;
  listTitle: string;
  confirmAllPrompt: (missing: number) => string;
}

export interface SectionMapPickerProps {
  sectors: IrrigationZone[];
  sectionsBySector: Record<number, IrrigationZone[]>;
  scope: string;
  selectedIds: number[];
  onCancel: () => void;
  /** Sin {@code specimens} el selector solo elige secciones (Riego); con ellos, también ejemplares. */
  onConfirm: (ids: number[], specimenIds?: number[]) => void;
  texts: SectionPickerTexts;
  specimens?: { options: GreenAreaSetElement[]; selectedIds: number[] };
}

/** Qué agrega un clic o un rectángulo sobre el mapa. */
type PickMode = 'GARDENS' | 'SPECIMENS' | 'BOTH';
const PICK_MODES: { value: PickMode; label: string }[] = [
  { value: 'GARDENS', label: 'Jardines' }, { value: 'SPECIMENS', label: 'Ejemplares' }, { value: 'BOTH', label: 'Ambos' },
];

/** Seleccion multiple por IDs autorizados, con mapa + lista siempre sincronizados. */
export function SectionMapPicker({ sectors, sectionsBySector, scope, selectedIds, onCancel, onConfirm, texts, specimens }: SectionMapPickerProps) {
  const { data: layers, isLoading, errorMessage, stale } = useMapLayers();
  const [chosenScope, setChosenScope] = useState(scope);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(selectedIds));
  const [term, setTerm] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  const [areaMode, setAreaMode] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<PickMode>('GARDENS');
  const [listTab, setListTab] = useState<'GARDENS' | 'SPECIMENS'>('GARDENS');
  const [selectedSpecimens, setSelectedSpecimens] = useState<Set<number>>(() => new Set(specimens?.selectedIds ?? []));
  const viewer = useRef<Viewer | null>(null);
  const mapRegion = useRef<HTMLDivElement>(null);
  const firstButton = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  const scene = useMemo(() => {
    if (!layers) return null;
    try { return toSceneData(layers); } catch { return null; }
  }, [layers]);

  const scopedSectors = useMemo(() => sectors.filter((s) => chosenScope === ALL || chosenScope === String(s.id)), [sectors, chosenScope]);
  const allSections = useMemo(() => sectors.flatMap((s) => sectionsBySector[s.id] ?? []), [sectors, sectionsBySector]);
  const scopeSections = useMemo(() => scopedSectors.flatMap((s) => sectionsBySector[s.id] ?? []), [scopedSectors, sectionsBySector]);
  const sectionsByCode = useMemo(() => new Map(scopeSections.map((s) => [s.code, s])), [scopeSections]);
  const permittedCodes = useMemo(() => scopeSections.map((s) => s.code), [scopeSections]);
  const markedCodes = useMemo(() => allSections.filter((s) => selected.has(s.id)).map((s) => s.code), [allSections, selected]);
  const shown = useMemo(() => scopeSections.filter((s) =>
    (!onlySelected || selected.has(s.id)) &&
    `${s.name} ${s.code}`.toLocaleLowerCase('es').includes(term.trim().toLocaleLowerCase('es')),
  ), [scopeSections, selected, onlySelected, term]);

  const allSpecimens = useMemo(() => specimens?.options ?? [], [specimens]);
  const scopeSpecimens = useMemo(() => allSpecimens.filter((e) => chosenScope === ALL || String(e.sectorId) === chosenScope),
    [allSpecimens, chosenScope]);
  const specimensByCode = useMemo(() => new Map(scopeSpecimens.map((e) => [e.code, e.id])), [scopeSpecimens]);
  const markedSpecimenCodes = useMemo(() => allSpecimens.filter((e) => selectedSpecimens.has(e.id)).map((e) => e.code),
    [allSpecimens, selectedSpecimens]);
  const shownSpecimens = useMemo(() => scopeSpecimens.filter((e) =>
    (!onlySelected || selectedSpecimens.has(e.id)) &&
    `${e.displayName} ${e.code} ${e.sectionName ?? ''}`.toLocaleLowerCase('es').includes(term.trim().toLocaleLowerCase('es')),
  ), [scopeSpecimens, selectedSpecimens, onlySelected, term]);
  const pickGardens = mode !== 'SPECIMENS';
  const pickSpecimens = specimens !== undefined && mode !== 'GARDENS';
  // En «Ambos» la lista se elige con sus pestañas; en los otros modos sigue al modo.
  const tab = mode === 'BOTH' ? listTab : mode === 'SPECIMENS' ? 'SPECIMENS' : 'GARDENS';

  useEffect(() => { viewer.current?.setMarkedSections(markedCodes); }, [markedCodes]);
  useEffect(() => { viewer.current?.setMarkedSpecimens(markedSpecimenCodes); }, [markedSpecimenCodes]);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => {
    firstButton.current?.focus();
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelRef.current(); };
    document.addEventListener('keydown', handleEscape);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEscape); document.body.style.overflow = oldOverflow; };
  }, []);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setNotice(null);
  }, []);

  const toggleSpecimen = useCallback((id: number) => {
    setSelectedSpecimens((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setNotice(null);
  }, []);

  const onMapPick = (target: Target | null, data: SceneData) => {
    viewer.current?.select(null, false);
    if (!target) return;
    if (target.layer === 'vegetation' && specimens) {
      if (!pickSpecimens) { setNotice('Para agregar ejemplares, elige «Ejemplares» o «Ambos».'); return; }
      const id = specimensByCode.get(data.vegetation[target.index]?.props.code);
      if (id === undefined) { setNotice('Ese ejemplar está fuera del sector elegido.'); return; }
      toggleSpecimen(id);
      return;
    }
    if (!pickGardens) { setNotice('Para agregar jardines, elige «Jardines» o «Ambos».'); return; }
    if (target.layer !== 'greenAreas' && target.layer !== 'xerophytic' && target.layer !== 'reserve') {
      setNotice('Haz clic en un área verde, no en un edificio u otro elemento.');
      return;
    }
    const code = data[target.layer][target.index]?.props.code;
    const section = code ? sectionsByCode.get(code) : null;
    if (!section) { setNotice('Sección fuera de tus sectores autorizados o del ámbito seleccionado.'); return; }
    toggle(section.id);
  };

  const allInScope = () => {
    const missing = scopeSections.filter((s) => !selected.has(s.id));
    if (missing.length === 0) return;
    if (!window.confirm(texts.confirmAllPrompt(missing.length))) return;
    setSelected((prev) => new Set([...prev, ...scopeSections.map((s) => s.id)]));
  };

  const clearScope = () => {
    const scoped = new Set(scopeSections.map((s) => s.id));
    setSelected((prev) => new Set([...prev].filter((id) => !scoped.has(id))));
    const scopedSpecimens = new Set(scopeSpecimens.map((e) => e.id));
    setSelectedSpecimens((prev) => new Set([...prev].filter((id) => !scopedSpecimens.has(id))));
  };

  const addIds = (ids: number[]) => setSelected((prev) => new Set([...prev, ...ids]));
  const addSpecimens = (ids: number[]) => setSelectedSpecimens((prev) => new Set([...prev, ...ids]));
  const { drag, beginDrag, moveDrag, endDrag, cancelDrag } = useRectangleSelection({
    mapRegion, viewer, permittedCodes: pickGardens ? permittedCodes : [], sectionsByCode, onAdd: addIds, onNotice: setNotice,
    specimens: pickSpecimens ? { eligible: scopeSpecimens.map((e) => e.code), byCode: specimensByCode, onAdd: addSpecimens } : undefined,
  });
  const confirm = () => {
    const ids = allSections.filter((s) => selected.has(s.id)).map((s) => s.id);
    if (specimens) onConfirm(ids, allSpecimens.filter((e) => selectedSpecimens.has(e.id)).map((e) => e.id));
    else onConfirm(ids);
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="section-picker-title" className="fixed inset-0 z-[100] flex flex-col bg-neutral-0 text-neutral-900">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div><h2 id="section-picker-title" className="text-lg font-bold">{texts.title}</h2>
          <p className="text-xs text-neutral-500">{texts.description}</p></div>
        <button ref={firstButton} type="button" onClick={onCancel}
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Cancelar y volver ✕</button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div ref={mapRegion} className="relative min-h-[250px] flex-[2] overflow-hidden bg-neutral-100 md:min-h-0">
          {isLoading ? <div className="p-6"><LoadingSkeleton /></div>
            : scene && layers && !unsupported ? <Map3DView
              data={scene}
              onReady={(v) => { viewer.current = v; v.setMarkedSections(markedCodes); v.setMarkedSpecimens(markedSpecimenCodes); v.setLayerVisible('supervision', false); }}
              onUnsupported={() => setUnsupported(true)}
              onSelect={(target) => { if (!areaMode) onMapPick(target, scene); }}
              onGroundPick={() => undefined} onHover={() => undefined} onCompass={() => undefined}/>
              : <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <p className="font-semibold">Mapa 3D no disponible</p>
                <p className="mt-2 max-w-sm text-sm text-neutral-500">{errorMessage ?? 'El navegador no admite WebGL. Puedes realizar toda la selección usando la lista lateral.'}</p>
              </div>}
          {scene && !unsupported && !isLoading && <div className="pointer-events-none absolute left-3 top-3 z-30 flex flex-wrap gap-2">
            <button className="pointer-events-auto rounded-md bg-neutral-0 px-3 py-2 text-xs font-semibold shadow" type="button" onClick={() => { viewer.current?.top(); setAreaMode(true); }}>Vista superior</button>
            <button className="pointer-events-auto rounded-md bg-neutral-0 px-3 py-2 text-xs font-semibold shadow" type="button" onClick={() => viewer.current?.fit()}>Ver campus</button>
            <button className={`pointer-events-auto rounded-md px-3 py-2 text-xs font-semibold shadow ${areaMode ? 'bg-brand-600 text-white' : 'bg-neutral-0 text-neutral-900'}`}
              type="button" onClick={() => { viewer.current?.top(); setAreaMode((v) => !v); }}> {areaMode ? '✓ Área activa · salir' : '▭ Selección rectangular'} </button>
          </div>}
          {areaMode && scene && !unsupported && <div className="absolute inset-0 z-20 cursor-crosshair touch-none"
            aria-label="Dibuja un rectángulo sobre el mapa para seleccionar secciones"
            onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag}>
              {drag && <div className="pointer-events-none absolute border-2 border-brand-700 bg-brand-200/30"
                style={{ left: Math.min(drag.startX, drag.endX) - drag.originX,
                  top: Math.min(drag.startY, drag.endY) - drag.originY,
                  width: Math.abs(drag.endX - drag.startX), height: Math.abs(drag.endY - drag.startY) }}/>}
            </div>}
          {stale && <div className="absolute bottom-10 left-3 z-30 max-w-xs rounded-md bg-alert-warning-bg p-2 text-xs text-alert-warning-fg">Mapa almacenado sin conexión; verifica la selección.</div>}
          {layers && <div className="pointer-events-none absolute bottom-2 left-3 z-30"><MapAttribution required={layers.attributionRequired}/></div>}
        </div>
        <aside className="flex min-h-0 flex-1 flex-col border-t border-neutral-200 md:max-w-[400px] md:border-l md:border-t-0">
          <div className="shrink-0 space-y-3 border-b border-neutral-200 p-4">
            <div className="flex items-center justify-between gap-2"><strong className="text-sm">{texts.listTitle}</strong>
              <span aria-live="polite" className="rounded-md bg-brand-50 px-2 py-1 text-sm font-semibold text-brand-700">
                {specimens ? `${selected.size} jardines · ${selectedSpecimens.size} ejemplares` : `${selected.size} seleccionadas`}</span></div>
            {specimens && (
              <div role="radiogroup" aria-label="Qué seleccionar en el mapa" className="grid grid-cols-3 gap-1 rounded-md bg-neutral-100 p-1">
                {PICK_MODES.map((m) => (
                  <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => setMode(m.value)}
                    className={`rounded px-2 py-1.5 text-sm font-medium ${mode === m.value ? 'bg-neutral-0 text-neutral-900 shadow-xs' : 'text-neutral-600 hover:text-neutral-900'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            )}
            <label className="block space-y-1 text-sm text-neutral-700"><span>Sector</span>
              <select className={FIELD} value={chosenScope} onChange={(e) => setChosenScope(e.target.value)}>
                <option value={ALL}>Todos mis sectores ({allSections.length})</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name} ({sectionsBySector[s.id]?.length ?? 0})</option>)}
              </select></label>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" size="sm" variant="secondary" onClick={allInScope}>Marcar todas</Button>
              <Button type="button" size="sm" variant="secondary" onClick={clearScope}>Limpiar ámbito</Button>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500">
              {scopedSectors.map((s) => <span key={s.id}>{s.name}: {(sectionsBySector[s.id] ?? []).filter((z) => selected.has(z.id)).length}
                {specimens && ` · ${allSpecimens.filter((e) => e.sectorId === s.id && selectedSpecimens.has(e.id)).length} ej.`}</span>)}
            </div>
            <label htmlFor="section-picker-search" className="sr-only">Buscar sección</label>
            <input id="section-picker-search" type="search" className={FIELD} value={term} onChange={(e) => setTerm(e.target.value)}
              placeholder={tab === 'SPECIMENS' ? 'Buscar ejemplar, especie o código' : 'Buscar sección o código'} />
            {mode === 'BOTH' && (
              <div role="tablist" aria-label="Lista" className="flex border-b border-neutral-200">
                {(['GARDENS', 'SPECIMENS'] as const).map((t) => (
                  <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setListTab(t)}
                    className={`border-b-2 px-3 py-1.5 text-sm font-semibold ${tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-neutral-600'}`}>
                    {t === 'GARDENS' ? `Jardines (${selected.size})` : `Ejemplares (${selectedSpecimens.size})`}
                  </button>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm text-neutral-700"><input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)}/> Ver solo seleccionadas</label>
            {notice && <p role="status" className="rounded-md bg-alert-warning-bg px-3 py-2 text-xs text-alert-warning-fg">{notice}</p>}
          </div>
          {tab === 'SPECIMENS' ? (
            <div className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Ejemplares disponibles">
              {shownSpecimens.length === 0 ? <p className="p-3 text-sm text-neutral-500">No hay ejemplares que coincidan.</p>
                : shownSpecimens.map((e) => <label key={e.id} className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm hover:bg-neutral-50">
                  <input type="checkbox" className="mt-1 accent-cyan-600" checked={selectedSpecimens.has(e.id)} onChange={() => toggleSpecimen(e.id)}/>
                  <span><span className="block font-medium text-neutral-900">{e.displayName}</span>
                    <span className="text-xs text-neutral-500">{e.code}{e.sectionName ? ` · ${e.sectionName}` : ' · fuera de toda sección'}</span></span>
                </label>)}
            </div>
          ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-3" aria-label="Secciones autorizadas">
            {shown.length === 0 ? <p className="p-3 text-sm text-neutral-500">No hay secciones que coincidan.</p>
              : shown.map((s) => <label key={s.id} className="flex cursor-pointer items-start gap-2 rounded-md p-2 text-sm hover:bg-neutral-50">
                <input type="checkbox" className="mt-1 accent-cyan-600" checked={selected.has(s.id)} onChange={() => toggle(s.id)}/>
                <span><span className="block font-medium text-neutral-900">{s.name}</span><span className="text-xs text-neutral-500">{s.code}</span></span>
              </label>)}
          </div>
          )}
          <footer className="shrink-0 border-t border-neutral-200 p-4">
            <Button type="button" fullWidth onClick={confirm}>
              {specimens ? `Confirmar ${selected.size} jardines y ${selectedSpecimens.size} ejemplares`
                : `Confirmar selección de ${selected.size} secciones`}
            </Button>
          </footer>
        </aside>
      </div>
    </div>
  );
}
