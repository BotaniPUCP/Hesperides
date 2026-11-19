'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMapLayers } from '@/hooks/useMapLayers';
import { toSceneData, type SceneData } from '../sceneData';
import { MapAttribution } from '../MapAttribution';
import type { EquivalenceViewer } from './equivalenceViewer';
import type { Manifest, Relation } from './relations';
import { unifiedEntries, alignmentFor, entryMatches, type UnifiedEntry } from './unification';
import snapshot from './final-relations.json';

export function UnifiedWorkbench() {
  const { data, errorMessage } = useMapLayers();
  const [manifest, setManifest] = useState<Manifest | null>(null), [error, setError] = useState('');
  useEffect(() => { const abort = new AbortController(); fetch('/models/equivalence/manifest.json', { signal: abort.signal }).then((r) => { if (!r.ok) throw new Error('No se pudo cargar el inventario.'); return r.json(); }).then((m: Manifest) => { if (m.sourceHash !== snapshot.sourceHash) throw new Error('El SKP cambió respecto a las relaciones finales.'); setManifest(m); }).catch((e) => { if (!abort.signal.aborted) setError(String(e)); }); return () => abort.abort(); }, []);
  const scene = useMemo(() => data ? toSceneData(data) : null, [data]);
  if (error || errorMessage && !data) return <p role="alert">{error || errorMessage}</p>;
  if (!scene || !manifest || !data) return <p>Cargando mapa unificado…</p>;
  return <Review scene={scene} manifest={manifest} mapVersion={data.version} />;
}
function Review({ scene, manifest, mapVersion }: { scene: SceneData; manifest: Manifest; mapVersion: number }) {
  const selectedRef = useRef('');
  const root = useRef<HTMLDivElement>(null), viewer = useRef<EquivalenceViewer | null>(null);
  const [status, setStatus] = useState('Cargando geometría unificada…'), [selected, setSelected] = useState(''), [query, setQuery] = useState('');
  const entries = useMemo(() => {
    const related = unifiedEntries(scene, snapshot.relations as Relation[]), used = new Set(snapshot.relations.flatMap((r) => r.skpIds));
    return [...related, ...manifest.parts.filter((p) => !used.has(p.id)).map((p): UnifiedEntry => ({ id: `unassigned:${p.id}`, name: `Pieza SKP sin relación · ${p.id}`, source: 'SKP', skpIds: [p.id], mapIds: [], codes: [], aliases: [], floors: [] }))];
  }, [scene, manifest]);
  const alignment = useMemo(() => alignmentFor(scene, manifest, snapshot.relations as Relation[]), [scene, manifest]);
  useEffect(() => {
    let active = true;
    import('./unifiedViewer').then(async ({ loadUnifiedMeshes, createUnifiedViewer }) => {
      const result = await loadUnifiedMeshes(scene, manifest, snapshot.relations as Relation[], entries);
      if (!active || !root.current) { result.meshes.forEach((m) => { m.geometry.dispose(); (Array.isArray(m.material) ? m.material : [m.material]).forEach((material) => material.dispose()); }); return; }
      viewer.current = createUnifiedViewer(root.current, scene, result.meshes, setSelected);
      viewer.current.update({ selected: selectedRef.current ? [selectedRef.current] : [], linked: [], buildings: true, casetas: true, small: true });
      setStatus('');
    }).catch((e) => { if (active) setStatus(`No se pudo preparar la vista: ${e instanceof Error ? e.message : String(e)}`); });
    return () => { active = false; viewer.current?.dispose(); viewer.current = null; };
  }, [scene, manifest, entries]);
  useEffect(() => { selectedRef.current = selected; viewer.current?.update({ selected: selected ? [selected] : [], linked: [], buildings: true, casetas: true, small: true }); }, [selected, status]);
  const current = entries.find((e) => e.id === selected);
  const error = alignment.residuals.find((r) => r.id === selected);
  const exportReport = () => {
    const blob = new Blob([JSON.stringify({ sourceHash: snapshot.sourceHash, relationCount: snapshot.relations.length, mapVersion, entries, alignment, exceptions: { substation: 'Geometría izquierda', kiosk: 'C-3446 adaptada a la estructura izquierda 95; altura del mapa 8 m', names: ['Aulas Móviles A', 'Instituto de Ciencias Ómicas y Biotecnología Aplicada'] } }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'revision-mapa-unificado.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const button = 'rounded border border-neutral-300 bg-neutral-0 px-3 py-2 text-sm disabled:opacity-40';
  return <div className="space-y-3 text-neutral-900">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><Link href="/mapa/equivalencias" className="text-sm text-brand-600">← Relaciones originales</Link><h1 className="text-xl font-bold">Mapa unificado · revisión</h1><p className="text-sm">Geometría SKP prioritaria, edificios exclusivos del mapa izquierdo y nombres conciliados.</p></div><button className={button} onClick={exportReport}>Exportar informe JSON</button></header>
    <p className="text-sm">{snapshot.relations.length} relaciones finales · {entries.filter((e) => !e.id.startsWith('unassigned:')).length} conjuntos identificados · {entries.filter((e) => e.source === 'Mapa izquierdo').length} conjuntos con geometría izquierda · caseta adaptada a sus medidas izquierdas · {entries.filter((e) => e.id.startsWith('unassigned:')).length} piezas SKP sin relación conservadas.</p>
    <p className="text-xs text-neutral-600">Alineación rígida: escala 1:1, sin reflejo. Diferencia mediana entre centros: {alignment.median.toFixed(2)} m; percentil 90: {alignment.p90.toFixed(2)} m; máxima: {alignment.max.toFixed(2)} m. Es una conciliación entre modelos, no una verificación topográfica.</p>
    {mapVersion !== snapshot.mapVersion && <p role="alert">El mapa izquierdo tiene una versión distinta al respaldo final. Revisa los identificadores y posiciones.</p>}
    <details className="rounded border border-neutral-300 p-2 text-sm"><summary className="cursor-pointer">Revisar mayores diferencias de posición entre modelos</summary><p className="my-2 text-xs">Las diferencias comparan los centros de los conjuntos relacionados; también pueden reflejar distinta extensión de sus geometrías.</p>{[...alignment.residuals].sort((a, b) => b.metres - a.metres).slice(0, 8).map((r) => <div key={r.id} className="flex items-center justify-between gap-2 py-1"><span>{entries.find((e) => e.id === r.id)?.name}: {r.metres.toFixed(2)} m</span><button className={button} onClick={() => { setSelected(r.id); viewer.current?.focus([r.id]); }}>Ver</button></div>)}</details>
    <div className="flex flex-wrap gap-2"><button className={button} disabled={!!status} onClick={() => viewer.current?.fit()}>Campus</button><button className={button} disabled={!!status} onClick={() => viewer.current?.top()}>Superior</button><button className={button} disabled={!selected || !!status} onClick={() => viewer.current?.focus([selected])}>Acercar selección</button><span className="self-center text-xs">Beige: SKP · rosa: izquierdo · azul: caseta adaptada · naranja: selección</span></div>
    <div className="relative h-[65dvh] min-h-[400px] overflow-hidden rounded border border-neutral-300"><div className="absolute inset-0" ref={root} />{status && <p role="status" className="absolute inset-0 grid place-items-center bg-neutral-100 p-4">{status}</p>}</div>
    <MapAttribution required />
    <p className="text-xs">Clic: ver nombre y procedencia · arrastrar izquierdo: desplazar · derecho: girar · rueda: acercar.</p>
    {current && <section className="rounded border border-neutral-300 p-3"><h2 className="font-semibold">{current.name}</h2><p>Geometría: {current.source}</p>{!!current.aliases.length && <p className="mt-2 text-sm">Otros nombres y referencias: {current.aliases.join(' · ')}</p>}{current.parentId && <p className="text-sm">Caseta separada de Maestranza. Conserva su geometría y posición originales; la relación de origen se mantiene como respaldo.</p>}{!!current.floors.length && <details className="my-2"><summary className="cursor-pointer">Directorio por pisos · edificio administrativo</summary><table className="w-full text-left text-sm"><thead><tr><th>Piso</th><th>Oficinas y servicios</th></tr></thead><tbody>{current.floors.map((f) => <tr key={f.floor}><td className="p-2">{f.floor}</td><td className="p-2">{f.places.join(' · ') || 'Sin información proporcionada'}</td></tr>)}</tbody></table></details>}<p className="text-sm">Códigos: {current.codes.join(', ') || 'Nombre personalizado'} · Izquierda: {current.mapIds.join(', ') || '—'} · SKP: {current.skpIds.join(', ') || '—'}</p>{error && <p className="text-sm">Diferencia de centros después de alinear: {error.metres.toFixed(2)} m.</p>}{current.source === 'Forma SKP / medidas izquierdas' && <p className="text-sm">Forma de C-3446, ubicación y orientación de la caseta 95. Se conserva su largo, ancho y altura de 8 m del mapa izquierdo.</p>}</section>}
    <label className="block text-sm">Buscar edificio<input className="mt-1 w-full rounded border border-neutral-300 bg-neutral-0 p-2" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre, alias, oficina, código o identificador" /></label>
    <div className="max-h-72 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th>Nombre unificado</th><th>Geometría</th><th>Acción</th></tr></thead><tbody>{entries.filter((e) => entryMatches(e, query)).map((e) => <tr key={e.id} className="border-b border-neutral-200"><td className="p-2">{e.name}</td><td className="p-2">{e.source}</td><td><button className={button} onClick={() => { setSelected(e.id); viewer.current?.focus([e.id]); }}>Ver</button></td></tr>)}</tbody></table></div>
    <p className="text-xs text-neutral-600">Vista basada en el respaldo final de 133 relaciones. Los mapas originales y el editor de relaciones se conservan.</p>
  </div>;
}
