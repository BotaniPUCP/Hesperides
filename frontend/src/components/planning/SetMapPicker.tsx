'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GreenAreaSetElement } from '@shared/types';
import type { IrrigationZone } from '@shared/types/irrigation';
import { Button, LoadingSkeleton } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import { MapAttribution } from '@/components/map3d/MapAttribution';
import { toSceneData, type SceneData } from '@/components/map3d/sceneData';
import type { Target } from '@/components/map3d/target';
import { useRectangleSelection } from '@/components/map3d/useRectangleSelection';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { useMapLayers } from '@/hooks/useMapLayers';
import { contentsLabel } from './planningTexts';

/** Qué agrega un clic o un rectángulo sobre el mapa. */
export type PickMode = 'GARDENS' | 'SPECIMENS' | 'BOTH';
const PICK_MODES: { value: PickMode; label: string }[] = [
  { value: 'GARDENS', label: 'Jardines' }, { value: 'SPECIMENS', label: 'Ejemplares' }, { value: 'BOTH', label: 'Ambos' },
];
const OUTSIDE = 'fuera';
const MAP_BUTTON = 'pointer-events-auto rounded-md bg-neutral-0 px-3 py-2 text-xs font-semibold text-neutral-900 shadow';

interface SectorGroup {
  key: string;
  name: string;
  sections: IrrigationZone[];
  specimens: GreenAreaSetElement[];
}

export interface SetMapPickerProps {
  sectors: IrrigationZone[];
  sectionsBySector: Record<number, IrrigationZone[]>;
  specimens: GreenAreaSetElement[];
  selectedZoneIds: number[];
  selectedSpecimenIds: number[];
  onCancel: () => void;
  onConfirm: (zoneIds: number[], specimenIds: number[]) => void;
}

const matches = (text: string, term: string) =>
  text.toLocaleLowerCase('es').includes(term.trim().toLocaleLowerCase('es'));

function Meter({ label, chosen, total }: { label: string; chosen: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((chosen / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-neutral-600">{label}</span>
        <span className={chosen > 0 ? 'font-semibold text-brand-700' : 'text-neutral-500'}>{chosen} de {total}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-neutral-100" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/**
 * Elegir lo que forma un conjunto: jardines, ejemplares o ambos, sobre el mapa o
 * en una tarjeta por sector. Es propio de Conjuntos para que el selector de Riego
 * (SectionMapPicker) no cambie.
 */
export function SetMapPicker({ sectors, sectionsBySector, specimens, selectedZoneIds, selectedSpecimenIds,
  onCancel, onConfirm }: SetMapPickerProps) {
  const { data: layers, isLoading, errorMessage, stale } = useMapLayers();
  const [zones, setZones] = useState<Set<number>>(() => new Set(selectedZoneIds));
  const [plants, setPlants] = useState<Set<number>>(() => new Set(selectedSpecimenIds));
  const [mode, setMode] = useState<PickMode>('GARDENS');
  const [term, setTerm] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);
  const [areaMode, setAreaMode] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const viewer = useRef<Viewer | null>(null);
  const mapRegion = useRef<HTMLDivElement>(null);
  const firstButton = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  const scene = useMemo(() => {
    if (!layers) return null;
    try { return toSceneData(layers); } catch { return null; }
  }, [layers]);

  /** Un grupo por sector, en su orden, y al final los ejemplares que no están en ninguna sección. */
  const groups = useMemo<SectorGroup[]>(() => {
    const known = new Set(sectors.map((s) => s.id));
    const out: SectorGroup[] = sectors.map((s) => ({ key: String(s.id), name: s.name, sections: sectionsBySector[s.id] ?? [],
      specimens: specimens.filter((e) => e.sectorId === s.id) }));
    const outside = specimens.filter((e) => e.sectorId == null || !known.has(e.sectorId));
    if (outside.length) out.push({ key: OUTSIDE, name: 'Fuera de toda sección', sections: [], specimens: outside });
    return out;
  }, [sectors, sectionsBySector, specimens]);

  const sectionByCode = useMemo(() => new Map(groups.flatMap((g) => g.sections.map((s) => [s.code, { id: s.id, group: g }] as const))), [groups]);
  const specimenByCode = useMemo(() => new Map(groups.flatMap((g) => g.specimens.map((e) => [e.code, { id: e.id, group: g }] as const))), [groups]);
  const allSections = useMemo(() => groups.flatMap((g) => g.sections), [groups]);
  const markedCodes = useMemo(() => allSections.filter((s) => zones.has(s.id)).map((s) => s.code), [allSections, zones]);
  const markedPlantCodes = useMemo(() => specimens.filter((e) => plants.has(e.id)).map((e) => e.code), [specimens, plants]);

  useEffect(() => { viewer.current?.setMarkedSections(markedCodes); }, [markedCodes]);
  useEffect(() => { viewer.current?.setMarkedSpecimens(markedPlantCodes); }, [markedPlantCodes]);
  useEffect(() => { onCancelRef.current = onCancel; }, [onCancel]);
  useEffect(() => {
    firstButton.current?.focus();
    const handleEscape = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancelRef.current(); };
    document.addEventListener('keydown', handleEscape);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handleEscape); document.body.style.overflow = oldOverflow; };
  }, []);

  /** Avisa, sin impedirlo, cuando se agrega algo de otro sector que el que se está viendo. */
  const warnIfOutside = useCallback((group: SectorGroup, adding: boolean) => {
    const current = groups.find((g) => g.key === focused);
    setNotice(adding && current && current.key !== group.key
      ? `Agregaste algo de ${group.name}, fuera de ${current.name}, que es el sector que estás viendo.` : null);
  }, [groups, focused]);

  const toggleIn = (set: Set<number>, id: number) => { const next = new Set(set); if (next.has(id)) next.delete(id); else next.add(id); return next; };
  const toggleZone = (id: number, group: SectorGroup) => { warnIfOutside(group, !zones.has(id)); setZones((prev) => toggleIn(prev, id)); };
  const togglePlant = (id: number, group: SectorGroup) => { warnIfOutside(group, !plants.has(id)); setPlants((prev) => toggleIn(prev, id)); };

  const onMapPick = (target: Target | null, data: SceneData) => {
    // El visor deja un punto de ubicación tras el clic; al elegir no aplica, y se quita apenas termina.
    queueMicrotask(() => viewer.current?.select(null, false));
    if (!target) return;
    if (target.layer === 'vegetation') {
      if (mode === 'GARDENS') { setNotice('Estás eligiendo jardines. Cambia a «Ejemplares» o «Ambos» para agregar ejemplares.'); return; }
      const hit = specimenByCode.get(data.vegetation[target.index]?.props.code);
      if (!hit) { setNotice('Ese ejemplar no está disponible para conjuntos.'); return; }
      togglePlant(hit.id, hit.group);
      return;
    }
    if (mode === 'SPECIMENS') { setNotice('Estás eligiendo ejemplares. Cambia a «Jardines» o «Ambos» para agregar jardines.'); return; }
    if (target.layer !== 'greenAreas' && target.layer !== 'xerophytic' && target.layer !== 'reserve') {
      setNotice('Haz clic en un área verde, no en un edificio u otro elemento.');
      return;
    }
    const hit = sectionByCode.get(data[target.layer][target.index]?.props.code);
    if (!hit) { setNotice('Esa área no es un jardín disponible.'); return; }
    toggleZone(hit.id, hit.group);
  };

  const pickGardens = mode !== 'SPECIMENS';
  const pickPlants = mode !== 'GARDENS';
  const zoneOfCode = useMemo(() => new Map(allSections.map((s) => [s.code, s])), [allSections]);
  const { drag, beginDrag, moveDrag, endDrag, cancelDrag } = useRectangleSelection({
    mapRegion, viewer, permittedCodes: pickGardens ? allSections.map((s) => s.code) : [], sectionsByCode: zoneOfCode,
    onAdd: (ids) => setZones((prev) => new Set([...prev, ...ids])), onNotice: setNotice,
    specimens: pickPlants ? { eligible: specimens.map((e) => e.code), byCode: new Map(specimens.map((e) => [e.code, e.id])),
      onAdd: (ids) => setPlants((prev) => new Set([...prev, ...ids])) } : undefined,
  });

  // Las tarjetas marcan por tipo; el modo del mapa solo decide qué agregan el clic y el rectángulo.
  const markGardens = (g: SectorGroup) => setZones((prev) => new Set([...prev, ...g.sections.map((s) => s.id)]));
  const markPlants = (g: SectorGroup) => setPlants((prev) => new Set([...prev, ...g.specimens.map((e) => e.id)]));
  const clearGroup = (g: SectorGroup) => {
    const ids = new Set(g.sections.map((s) => s.id));
    const plantIds = new Set(g.specimens.map((e) => e.id));
    setZones((prev) => new Set([...prev].filter((id) => !ids.has(id))));
    setPlants((prev) => new Set([...prev].filter((id) => !plantIds.has(id))));
  };
  const look = (g: SectorGroup) => {
    setFocused(g.key);
    setExpanded((prev) => new Set(prev).add(g.key));
    viewer.current?.focusSections(g.sections.map((s) => s.code), g.specimens.map((e) => e.code));
  };
  const toggleExpanded = (key: string) => setExpanded((prev) => { const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  const searching = term.trim() !== '';

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="set-picker-title" className="fixed inset-0 z-[100] flex flex-col bg-neutral-0 text-neutral-900">
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-4 py-3">
        <div><h2 id="set-picker-title" className="text-lg font-bold">Elegir jardines y ejemplares del conjunto</h2>
          <p className="text-xs text-neutral-500">Haz clic en el mapa o dibuja un rectángulo, o márcalos en las tarjetas de cada sector. Confirmar solo selecciona; el conjunto se guarda después.</p></div>
        <button ref={firstButton} type="button" onClick={onCancel}
          className="rounded-md border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Cancelar y volver</button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <div ref={mapRegion} className="relative min-h-[250px] flex-[2] overflow-hidden bg-neutral-100 md:min-h-0">
          {isLoading ? <div className="p-6"><LoadingSkeleton /></div>
            : scene && layers && !unsupported ? <Map3DView data={scene}
              onReady={(v) => { viewer.current = v; v.setMarkedSections(markedCodes); v.setMarkedSpecimens(markedPlantCodes); v.setLayerVisible('supervision', false); }}
              onUnsupported={() => setUnsupported(true)}
              onSelect={(target) => { if (!areaMode) onMapPick(target, scene); }}
              onGroundPick={() => undefined} onHover={() => undefined} onCompass={() => undefined} />
              : <div className="flex h-full flex-col items-center justify-center p-8 text-center">
                <p className="font-semibold">Mapa 3D no disponible</p>
                <p className="mt-2 max-w-sm text-sm text-neutral-500">{errorMessage ?? 'El navegador no admite WebGL. Puedes elegir todo en las tarjetas de cada sector.'}</p>
              </div>}
          {scene && !unsupported && !isLoading && <div className="pointer-events-none absolute left-3 top-3 z-30 flex flex-col items-start gap-2">
            <div className="flex flex-wrap gap-2">
              <button className={MAP_BUTTON} type="button" onClick={() => { viewer.current?.top(); setAreaMode(true); }}>Vista superior</button>
              <button className={MAP_BUTTON} type="button" onClick={() => viewer.current?.fit()}>Ver campus</button>
              <button type="button" onClick={() => { viewer.current?.top(); setAreaMode((v) => !v); }}
                className={`pointer-events-auto rounded-md px-3 py-2 text-xs font-semibold shadow ${areaMode ? 'bg-brand-600 text-white' : 'bg-neutral-0 text-neutral-900'}`}>
                {areaMode ? 'Rectángulo activo · salir' : 'Selección rectangular'}</button>
            </div>
            {/* Va sobre el mapa porque decide qué agregan el clic y el rectángulo, no qué muestra la lista. */}
            <div className="pointer-events-auto flex items-center gap-2 rounded-md bg-neutral-0 px-2 py-1.5 shadow">
              <span className="text-xs font-medium text-neutral-600">Al elegir en el mapa se agregan:</span>
              <div role="radiogroup" aria-label="Qué se agrega al elegir en el mapa" className="flex gap-1">
                {PICK_MODES.map((m) => (
                  <button key={m.value} type="button" role="radio" aria-checked={mode === m.value} onClick={() => setMode(m.value)}
                    className={`rounded px-2 py-1 text-xs font-semibold ${mode === m.value ? 'bg-brand-600 text-white' : 'text-neutral-700 hover:bg-neutral-100'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>}
          {areaMode && scene && !unsupported && <div className="absolute inset-0 z-20 cursor-crosshair touch-none"
            aria-label="Dibuja un rectángulo sobre el mapa para agregar lo que encierre"
            onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={cancelDrag}>
            {drag && <div className="pointer-events-none absolute border-2 border-brand-700 bg-brand-200/30"
              style={{ left: Math.min(drag.startX, drag.endX) - drag.originX, top: Math.min(drag.startY, drag.endY) - drag.originY,
                width: Math.abs(drag.endX - drag.startX), height: Math.abs(drag.endY - drag.startY) }} />}
          </div>}
          {stale && <div className="absolute bottom-10 left-3 z-30 max-w-xs rounded-md bg-alert-warning-bg p-2 text-xs text-alert-warning-fg">Mapa almacenado sin conexión; verifica la selección.</div>}
          {layers && <div className="pointer-events-none absolute bottom-2 left-3 z-30"><MapAttribution required={layers.attributionRequired} /></div>}
        </div>

        <aside className="flex min-h-0 flex-1 flex-col border-t border-neutral-200 md:max-w-[440px] md:border-l md:border-t-0">
          <div className="shrink-0 space-y-3 border-b border-neutral-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <span aria-live="polite" className="text-sm font-semibold text-neutral-900">
                {zones.size + plants.size === 0 ? 'Nada elegido todavía' : `Elegido: ${contentsLabel(zones.size, plants.size)}`}
              </span>
              <Button type="button" size="sm" variant="ghost" disabled={zones.size + plants.size === 0}
                onClick={() => { setZones(new Set()); setPlants(new Set()); setNotice(null); }}>Quitar todo</Button>
            </div>
            <label htmlFor="set-picker-search" className="sr-only">Buscar jardín o ejemplar</label>
            <input id="set-picker-search" type="search" value={term} onChange={(e) => setTerm(e.target.value)}
              placeholder="Buscar jardín, especie o código" className="h-10 w-full rounded-md border border-neutral-200 bg-neutral-0 px-3 text-neutral-900" />
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input type="checkbox" checked={onlySelected} onChange={(e) => setOnlySelected(e.target.checked)} /> Ver solo lo elegido</label>
            {notice && <p role="status" className="rounded-md bg-alert-warning-bg px-3 py-2 text-xs text-alert-warning-fg">{notice}</p>}
          </div>

          <ul className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3" aria-label="Sectores">
            {groups.map((g) => {
              const gardens = g.sections.filter((s) => (!onlySelected || zones.has(s.id)) && matches(`${s.name} ${s.code}`, term));
              const trees = g.specimens.filter((e) => (!onlySelected || plants.has(e.id)) && matches(`${e.displayName} ${e.code} ${e.sectionName ?? ''}`, term));
              if ((searching || onlySelected) && gardens.length + trees.length === 0) return null;
              const chosenGardens = g.sections.filter((s) => zones.has(s.id)).length;
              const chosenTrees = g.specimens.filter((e) => plants.has(e.id)).length;
              const open = searching || expanded.has(g.key);
              return (
                <li key={g.key} aria-label={g.name}
                  className={`rounded-xl border p-3 ${focused === g.key ? 'border-brand-600 ring-1 ring-brand-600' : chosenGardens + chosenTrees > 0 ? 'border-brand-200' : 'border-neutral-200'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" aria-expanded={open} onClick={() => toggleExpanded(g.key)}
                      className="flex items-center gap-2 text-left text-sm font-semibold text-neutral-900">
                      <span aria-hidden="true" className={`text-neutral-400 transition-transform ${open ? 'rotate-90' : ''}`}>›</span>
                      {g.name}
                    </button>
                    {g.sections.length > 0 && <button type="button" onClick={() => look(g)}
                      className="whitespace-nowrap text-xs font-medium text-brand-700 underline underline-offset-2">Ver en el mapa</button>}
                  </div>
                  <div className="mt-2 space-y-2">
                    {g.sections.length > 0 && <Meter label="Jardines" chosen={chosenGardens} total={g.sections.length} />}
                    {g.specimens.length > 0 && <Meter label="Ejemplares" chosen={chosenTrees} total={g.specimens.length} />}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {g.sections.length > 0 && <Button type="button" size="sm" variant="secondary"
                      disabled={chosenGardens === g.sections.length} onClick={() => markGardens(g)}>Marcar jardines</Button>}
                    {g.specimens.length > 0 && <Button type="button" size="sm" variant="secondary"
                      disabled={chosenTrees === g.specimens.length} onClick={() => markPlants(g)}>Marcar ejemplares</Button>}
                    <Button type="button" size="sm" variant="ghost" disabled={chosenGardens + chosenTrees === 0} onClick={() => clearGroup(g)}>
                      Quitar del sector</Button>
                  </div>
                  {open && (
                    <div className="mt-3 space-y-3 border-t border-neutral-200 pt-3">
                      {gardens.length > 0 && <fieldset className="space-y-1"><legend className="text-xs font-medium text-neutral-500">Jardines</legend>
                        {gardens.map((s) => <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-neutral-50">
                          <input type="checkbox" checked={zones.has(s.id)} onChange={() => toggleZone(s.id, g)} />
                          <span className="font-medium text-neutral-900">{s.name}</span>{s.name !== s.code && <span className="text-xs text-neutral-500">{s.code}</span>}
                        </label>)}</fieldset>}
                      {trees.length > 0 && <fieldset className="space-y-1"><legend className="text-xs font-medium text-neutral-500">Ejemplares</legend>
                        {trees.map((e) => <label key={e.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-0.5 text-sm hover:bg-neutral-50">
                          <input type="checkbox" checked={plants.has(e.id)} onChange={() => togglePlant(e.id, g)} />
                          <span className="font-medium text-neutral-900">{e.displayName}</span>
                          <span className="text-xs text-neutral-500">{e.code}{e.sectionName ? ` · ${e.sectionName}` : ''}</span>
                        </label>)}</fieldset>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <footer className="shrink-0 border-t border-neutral-200 p-4">
            <Button type="button" fullWidth onClick={() => onConfirm(allSections.filter((s) => zones.has(s.id)).map((s) => s.id),
              specimens.filter((e) => plants.has(e.id)).map((e) => e.id))}>
              {zones.size + plants.size === 0 ? 'Confirmar sin elementos' : `Confirmar ${contentsLabel(zones.size, plants.size)}`}
            </Button>
          </footer>
        </aside>
      </div>
    </div>
  );
}
