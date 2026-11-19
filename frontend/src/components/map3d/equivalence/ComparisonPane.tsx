'use client';
import { useEffect, useRef, useState } from 'react';
import type { SceneData } from '../sceneData';
import type { EquivalenceViewer, ViewState } from './equivalenceViewer';
export interface ComparisonPaneProps { title: string; source: SceneData | string; selected: string[]; linked: string[]; items: { id: string; label: string }[]; onPick: (id: string) => void; onClear: () => void; skp?: boolean }
export function ComparisonPane({ title, source, selected, linked, items, onPick, onClear, skp = false }: ComparisonPaneProps) {
  const root = useRef<HTMLDivElement>(null), viewer = useRef<EquivalenceViewer | null>(null);
  const [status, setStatus] = useState('loading'), [query, setQuery] = useState('');
  const [buildings, setBuildings] = useState(true), [casetas, setCasetas] = useState(true), [small, setSmall] = useState(false);
  const [hideLinked, setHideLinked] = useState(false);
  const latest = useRef(onPick); const state = useRef<ViewState>({ selected, linked, buildings, casetas, small, hideLinked });
  useEffect(() => { latest.current = onPick; state.current = { selected, linked, buildings, casetas, small, hideLinked }; viewer.current?.update(state.current); }, [onPick, selected, linked, buildings, casetas, small, hideLinked]);
  useEffect(() => {
    let active = true;
    import('./equivalenceViewer').then(({ createEquivalenceViewer }) => {
      if (!active || !root.current) return;
      viewer.current = createEquivalenceViewer(root.current, source, (id) => latest.current(id), () => { if (active) { viewer.current?.update(state.current); setStatus('ready'); } }, () => { if (active) setStatus('error'); });
      viewer.current.update(state.current);
    }).catch(() => { if (active) setStatus('error'); });
    return () => { active = false; viewer.current?.dispose(); viewer.current = null; };
  }, [source]);
  const button = 'rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-40 hover:bg-neutral-100';
  return <section className="min-w-0 overflow-hidden rounded-lg border border-neutral-300 bg-neutral-0">
    <div className="flex flex-wrap items-center gap-2 p-2"><h2 className="mr-auto font-semibold">{title} <span className="text-xs font-normal">({items.length})</span></h2><span className="text-sm">{selected.length} seleccionadas</span></div>
    <div className="flex flex-wrap gap-2 border-y border-neutral-200 p-2">
      <button className={button} disabled={status !== 'ready'} onClick={() => viewer.current?.fit()}>Campus</button>
      <button className={button} disabled={status !== 'ready'} onClick={() => viewer.current?.top()}>Superior</button>
      <button className={button} disabled={!selected.length || status !== 'ready'} onClick={() => viewer.current?.focus(selected)}>Acercar selección</button>
      <button className={button} disabled={!selected.length} onClick={onClear}>Limpiar</button>
      <label className="text-xs"><input type="checkbox" checked={hideLinked} onChange={(e) => setHideLinked(e.target.checked)} /> Ocultar relacionados</label>
      {skp && <div className="flex flex-wrap items-center gap-2 text-xs">
        <label><input type="checkbox" checked={buildings} onChange={(e) => setBuildings(e.target.checked)} /> Edificios</label>
        <label><input type="checkbox" checked={casetas} onChange={(e) => setCasetas(e.target.checked)} /> Casetas</label>
        <label><input type="checkbox" checked={small} onChange={(e) => setSmall(e.target.checked)} /> Detalles &lt; 1 m</label>
      </div>}
    </div>
    <div className="relative h-[55dvh] min-h-[340px]"><div ref={root} className="absolute inset-0" />
      {status !== 'ready' && <p role={status === 'error' ? 'alert' : 'status'} className="absolute inset-0 grid place-items-center bg-neutral-100 p-4 text-center">{status === 'error' ? 'No se pudo cargar este visor. Recarga la página. Tus relaciones guardadas se conservan.' : 'Cargando mapa 3D…'}</p>}
    </div>
    <div className="space-y-2 p-2">
      <details><summary className="cursor-pointer text-sm">Selección y búsqueda ({selected.length})</summary>
        <input className="my-2 w-full rounded border border-neutral-300 bg-neutral-0 p-2 text-sm" aria-label={`Buscar en ${title}`} placeholder="Buscar nombre o identificador…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="max-h-44 overflow-auto">{items.filter((item) => query ? `${item.label} ${item.id}`.toLowerCase().includes(query.toLowerCase()) : selected.includes(item.id)).map((item) => <div key={item.id} className="flex items-center gap-2 py-1 text-xs"><label className="flex-1"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => onPick(item.id)} /> {item.label} · {item.id}</label><button className={button} onClick={() => viewer.current?.focus([item.id])}>Ver</button></div>)}
        {!query && !selected.length && <p className="text-xs">Haz clic en estructuras del mapa o busca aquí.</p>}</div>
      </details>
    </div>
  </section>;
}
