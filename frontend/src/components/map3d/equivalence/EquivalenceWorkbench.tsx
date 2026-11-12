'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMapLayers } from '@/hooks/useMapLayers';
import { toSceneData, type SceneData } from '../sceneData';
import { MapAttribution } from '../MapAttribution';
import { ComparisonPane } from './ComparisonPane';
import codes from './codes.json';
import { downloadPortable } from './portableExport';
import { relationCodes, relationTitle, conflicts, parseRelations, toggleId, type Manifest, type Relation, type RelationFile } from './relations';

export function EquivalenceWorkbench() {
  const { data, errorMessage, stale } = useMapLayers(); const { user } = useAuth();
  const [manifest, setManifest] = useState<Manifest | null>(null), [error, setError] = useState('');
  useEffect(() => { const controller = new AbortController(); fetch('/models/equivalence/manifest.json', { signal: controller.signal }).then((r) => { if (!r.ok) throw new Error(); return r.json(); }).then(setManifest).catch(() => { if (!controller.signal.aborted) setError('No se pudo cargar el inventario SKP.'); }); return () => controller.abort(); }, []);
  const scene = useMemo(() => { if (!data) return null; try { return toSceneData(data); } catch { return null; } }, [data]);
  if (error || errorMessage && !data) return <p role="alert">{error || errorMessage}</p>;
  if (!manifest || !data || !user) return <p role="status">Cargando inventarios…</p>;
  if (!scene) return <p role="alert">El mapa está incompleto. Recarga la página.</p>;
  return <Workbench key={`${user.email}-${manifest.sourceHash}`} scene={scene} manifest={manifest} mapVersion={data.version} owner={user.email} attribution={data.attributionRequired} stale={stale} />;
}

function Workbench({ scene, manifest, mapVersion, owner, attribution, stale }: { scene: SceneData; manifest: Manifest; mapVersion: number; owner: string; attribution: boolean; stale: boolean }) {
  const [relations, setRelations] = useState<Relation[]>([]), [mapSelection, setMapSelection] = useState<string[]>([]), [skpSelection, setSkpSelection] = useState<string[]>([]);
  const [code, setCode] = useState(''), [search, setSearch] = useState(''), [note, setNote] = useState(''), [name, setName] = useState(''), [editing, setEditing] = useState<string | null>(null);
  const [shared, setShared] = useState(false), [hydrated, setHydrated] = useState(false), [blocked, setBlocked] = useState(false), [message, setMessage] = useState(''), [saveStatus, setSaveStatus] = useState('');
  const [history, setHistory] = useState<Relation[][]>([]), [pendingImport, setPendingImport] = useState<RelationFile | null>(null);
  const [packaging, setPackaging] = useState(false);
  const storageKey = `hesperides-equivalences-v1:${owner}:${manifest.sourceHash}`;
  const mapItems = useMemo(() => scene.campusBuildings.map((b) => ({ id: String(b.props.id), label: b.props.name || 'Sin nombre' })), [scene]);
  const skpItems = useMemo(() => manifest.parts.map((p) => ({ id: p.id, label: `${p.category === 'caseta' ? 'Caseta' : 'Edificio'} · pieza ${p.id}${p.small ? ' · detalle' : ''}` })), [manifest]);
  const validCodes = useMemo(() => new Set(codes.map((c) => c.code)), []);
  const mapIds = useMemo(() => new Set(mapItems.map((b) => b.id)), [mapItems]); const skpIds = useMemo(() => new Set(skpItems.map((b) => b.id)), [skpItems]);
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    try { const raw = localStorage.getItem(storageKey); if (raw) { const file = parseRelations(JSON.parse(raw), manifest.sourceHash, validCodes, mapIds, skpIds); setRelations(file.relations); if (file.mapVersion !== mapVersion) setMessage('El mapa cambió desde el último guardado. Revisa las equivalencias antes de continuar.'); } }
    catch { setBlocked(true); setMessage('No se pudo leer el borrador local. Se conserva intacto. Descárgalo para recuperarlo o importa un archivo válido.'); }
    setHydrated(true);
    });
    return () => { active = false; };
  }, [storageKey, manifest.sourceHash, validCodes, mapIds, skpIds, mapVersion]);
  useEffect(() => {
    if (!hydrated || blocked) return;
    let active = true;
    queueMicrotask(() => {
    if (!active) return;
    try { localStorage.setItem(storageKey, JSON.stringify({ version: 2, sourceHash: manifest.sourceHash, mapVersion, relations })); setSaveStatus('Guardado en este navegador'); }
    catch { setSaveStatus('No se pudo guardar. Exporta el JSON para conservar tu trabajo.'); }
    });
    return () => { active = false; };
  }, [relations, hydrated, blocked, storageKey, manifest.sourceHash, mapVersion]);
  const collisions = conflicts(relations, mapSelection, skpSelection, editing);
  const selectedCodes = code.split('|').filter(Boolean);
  const validSelectionCodes = (selectedCodes.length > 0 || !!name.trim()) && selectedCodes.every((c) => validCodes.has(c));
  const assignedCodes = new Set(relations.filter((r) => r.id !== editing).flatMap(relationCodes));
  const availableCodes = codes.filter((c) => !assignedCodes.has(c.code));
  const duplicateCode = relations.some((r) => r.id !== editing && relationCodes(r).some((c) => selectedCodes.includes(c)));
  const canSave = hydrated && !blocked && validSelectionCodes && (mapSelection.length > 0 || skpSelection.length > 0) && !duplicateCode && (!collisions.length || shared);
  const saveHint = !hydrated ? 'Cargando el borrador…' : blocked ? 'Recupera el borrador local antes de guardar.'
    : !mapSelection.length && !skpSelection.length ? 'Selecciona al menos una estructura en cualquiera de los mapas.'
    : !validSelectionCodes ? 'Escribe un nombre personalizado o elige un código de la lista.'
    : duplicateCode ? 'Este código ya está relacionado. Usa Editar / ver en su fila para añadir estructuras.'
    : collisions.length && !shared ? 'Confirma si deseas compartir estas estructuras entre códigos.'
    : `Todo listo para guardar la equivalencia: ${selectedCodes.join(', ') || name.trim()}.`;
  function replace(next: Relation[]) { setHistory((h) => [...h.slice(-19), relations]); setRelations(next); }
  function clear() { setMapSelection([]); setSkpSelection([]); setCode(''); setNote(''); setName(''); setEditing(null); setShared(false); }
  function save() {
    if (!canSave) return;
    const next: Relation = { id: editing ?? crypto.randomUUID(), code: selectedCodes[0] ?? '', codes: selectedCodes, mapIds: [...mapSelection], skpIds: [...skpSelection], note, name: name.trim(), updatedAt: new Date().toISOString() };
    replace(editing ? relations.map((r) => r.id === editing ? next : r) : [...relations, next]); clear(); setMessage(`Relación ${selectedCodes.join(', ') || name.trim()} guardada.`);
  }
  function edit(r: Relation) { setEditing(r.id); setCode(relationCodes(r).join('|')); setNote(r.note); setName(r.name ?? ''); setMapSelection(r.mapIds); setSkpSelection(r.skpIds); setShared(false); setSearch(''); setMessage(`Editando ${relationTitle(r)}. Selecciona o quita piezas y pulsa Guardar cambios.`); }
  function download(text: string, name: string) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function exportFile() { download(JSON.stringify({ version: 2, sourceHash: manifest.sourceHash, mapVersion, exportedAt: new Date().toISOString(), relations, codes, mapSnapshot: scene.campusBuildings.map((b) => ({ id: String(b.props.id), name: b.props.name, polygons: b.g, heightM: b.props.heightM })), skpAsset: '/models/equivalence/campus.glb', skpParts: manifest.parts, skpOrigin: manifest.origin }, null, 2), 'equivalencias-campus.json'); }
  const button = 'rounded-md border border-neutral-300 bg-neutral-0 px-3 py-2 text-sm hover:bg-neutral-100 disabled:opacity-40';
  return <div className="space-y-3 text-neutral-900">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><Link href="/mapa" className="text-sm text-brand-600">← Mapa</Link><Link href="/mapa/unificado" className="ml-4 text-sm text-brand-600">Ver mapa unificado →</Link><h1 className="text-xl font-bold">Levantamiento de equivalencias</h1><p className="text-sm text-neutral-600">Selecciona estructuras de uno o ambos mapas y vincúlalas con códigos de la lista o un nombre personalizado.</p></div><div className="flex flex-wrap gap-2"><button className={button} disabled={!hydrated || blocked} onClick={exportFile}>Exportar JSON</button><button className={button} disabled={!hydrated || blocked || packaging} onClick={async () => { setPackaging(true); try { await downloadPortable(scene, manifest, relations, mapVersion); setMessage(`HTML portátil descargado con ${relations.length} relaciones. Transfiérelo a Android y exporta el JSON al terminar.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'No se pudo preparar el HTML portátil.'); } finally { setPackaging(false); } }}>{packaging ? 'Preparando HTML…' : 'Descargar para Android'}</button><label className={`${button} cursor-pointer`}>Importar JSON<input className="sr-only" type="file" accept=".json,application/json" onChange={async (e) => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { if (file.size > 15_000_000) throw new Error('Archivo demasiado grande.'); setPendingImport(parseRelations(JSON.parse(await file.text()), manifest.sourceHash, validCodes, mapIds, skpIds)); setMessage('Revisa la importación antes de reemplazar el borrador.'); } catch (err) { setMessage(err instanceof Error ? err.message : 'Archivo inválido.'); } }} /></label></div></header>
    <p className="text-xs text-neutral-600">Clic izquierdo breve: añadir o quitar · arrastrar izquierdo: desplazar · derecho: girar · Ctrl + arrastrar botón izquierdo: selección por rectángulo · rueda: acercar. Naranja: selección · verde: relacionado. Cada cámara se maneja por separado.</p>
    {stale && <p role="status" className="text-sm text-amber-700">El mapa usa una copia local; comprueba la conexión antes de cerrar el levantamiento.</p>}
    <div className="grid grid-cols-2 gap-3 overflow-x-auto max-md:min-w-[760px]">
      <ComparisonPane title="Mapa 3D actual · campus" source={scene} items={mapItems.map((item) => ({ ...item, label: relations.filter((r) => r.name && r.mapIds.includes(item.id)).map((r) => r.name).join(' / ') || item.label }))} selected={mapSelection} linked={relations.flatMap((r) => r.mapIds)} onPick={(id) => { setMapSelection((s) => toggleId(s, id)); setShared(false); }} onClear={() => setMapSelection([])} />
      <ComparisonPane title="SKP · edificios y casetas" source="/models/equivalence/campus.glb" items={skpItems.map((item) => ({ ...item, label: relations.filter((r) => r.name && r.skpIds.includes(item.id)).map((r) => r.name).join(' / ') || item.label }))} skp selected={skpSelection} linked={relations.flatMap((r) => r.skpIds)} onPick={(id) => { setSkpSelection((s) => toggleId(s, id)); setShared(false); }} onClear={() => setSkpSelection([])} />
    </div>
    <MapAttribution required={attribution} />
    <p className="text-xs text-neutral-600">El mapa izquierdo conserva la geometría completa del mapa actual con acabado mate, edificios rosas y césped verde: edificios, jardines, caminos, vegetación y mobiliario. Solo los edificios son seleccionables. El SKP conserva su geometría original: sus piezas conectadas no representan necesariamente edificios completos. Los detalles menores de 1 m se pueden mostrar. C06-C07 agrupa el laboratorio de cocinas mejoradas y los talleres de la misma estructura.</p>
    <section className="space-y-3 rounded-lg border border-neutral-300 bg-neutral-0 p-3">
      <h2 className="font-semibold">{editing ? 'Editar equivalencia' : 'Nueva equivalencia'}</h2>
      <label className="block text-sm">Nombre personalizado<input value={name} maxLength={300} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded border border-neutral-300 bg-neutral-0 p-2" placeholder="Nombre actual del edificio o conjunto relacionado" /><span className="text-xs text-neutral-600">Obligatorio si no eliges códigos. Se aplica a las estructuras de esta relación en ambos mapas y sus búsquedas.</span></label>
      <div className="grid gap-3 md:grid-cols-[1fr_2fr_1fr]">
        <label className="text-sm">Buscar código o nombre<input value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1 w-full rounded border border-neutral-300 bg-neutral-0 p-2" placeholder="G, Mac Gregor, C01…" /></label>
        <fieldset className="text-sm"><legend>Códigos de la lista (opcionales con nombre) · {selectedCodes.length} seleccionados</legend><div className="mt-1 max-h-48 overflow-auto rounded border border-neutral-300 bg-neutral-0 p-2">{availableCodes.filter((c) => selectedCodes.includes(c.code) || `${c.code} ${c.label}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map((c) => <label key={c.code} className="flex items-start gap-2 py-1"><input type="checkbox" checked={selectedCodes.includes(c.code)} onChange={() => setCode(toggleId(selectedCodes, c.code).join('|'))} />{c.code} — {c.label}</label>)}</div></fieldset>
        <label className="text-sm">Nota opcional<input value={note} maxLength={2000} onChange={(e) => setNote(e.target.value)} className="mt-1 w-full rounded border border-neutral-300 bg-neutral-0 p-2" /></label>
      </div>
      <p className="text-sm">{mapSelection.length} estructuras del mapa ↔ {skpSelection.length} piezas del SKP{mapSelection.length > 0 && !skpSelection.length ? " · Solo mapa actual" : skpSelection.length > 0 && !mapSelection.length ? " · Solo SKP" : ""}</p>
      {!!collisions.length && <div className="rounded bg-amber-100 p-2 text-sm text-amber-950">Estas estructuras ya aparecen en los códigos {collisions.map(relationTitle).join(', ')}. <label className="block"><input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Compartir estas estructuras entre códigos intencionalmente</label></div>}
      {duplicateCode && <p role="alert" className="text-sm">Este código ya tiene una relación. Usa Editar en la tabla para añadir estructuras.</p>}
      <p id="relation-save-hint" role="status" className="text-sm font-medium">{saveHint}</p>
      <div className="flex flex-wrap items-center gap-2"><button className="rounded-md bg-brand-600 px-5 py-2 font-semibold text-white disabled:opacity-40" disabled={!canSave} aria-describedby="relation-save-hint" onClick={save}>{editing ? 'Guardar cambios' : 'Relacionar'}</button><button className={button} onClick={clear}>{editing ? 'Cancelar edición' : 'Limpiar selección'}</button><button className={button} disabled={!history.length || blocked} onClick={() => { setRelations(history[history.length - 1]); setHistory((h) => h.slice(0, -1)); clear(); setMessage('Último cambio deshecho.'); }}>Deshacer</button><span className="text-xs text-neutral-600" role="status">{saveStatus}</span></div>
      <p role="status" className="text-sm">{message}</p>
      {blocked && <button className={button} onClick={() => { try { download(localStorage.getItem(storageKey) ?? '{}', 'borrador-equivalencias-recuperacion.json'); } catch { setMessage('No se puede acceder al almacenamiento del navegador.'); } }}>Descargar borrador original</button>}
      {pendingImport && <div className="rounded border border-amber-400 p-3 text-sm"><p>El archivo contiene {pendingImport.relations.length} relaciones. Reemplazará las {relations.length} relaciones de este borrador.{pendingImport.mapVersion !== mapVersion && ' La versión del mapa es distinta: revisa las correspondencias.'}</p><button className={button} onClick={() => { replace(pendingImport.relations); setPendingImport(null); setBlocked(false); clear(); setMessage('Relaciones importadas.'); }}>Reemplazar borrador</button> <button className={button} onClick={() => setPendingImport(null)}>Cancelar</button></div>}
    </section>
    <section className="overflow-auto"><h2 className="mb-2 font-semibold">Relaciones guardadas · {relations.length} relaciones · {new Set(relations.flatMap(relationCodes)).size} / {codes.length} códigos</h2><table className="w-full text-left text-sm"><thead><tr className="border-b border-neutral-300"><th className="p-2">Código / nombre</th><th className="p-2">Mapa actual</th><th className="p-2">Piezas SKP</th><th className="p-2">Acciones</th></tr></thead><tbody>{relations.map((r) => <tr key={r.id} className="border-b border-neutral-200"><td className="max-w-md p-2">{r.name && <p className="font-semibold">{r.name}</p>}{relationCodes(r).map((value) => <p key={value}>{value} — {codes.find((c) => c.code === value)?.label}</p>)}{r.note && <p className="text-xs text-neutral-600">{r.note}</p>}</td><td className="p-2">{r.mapIds.length}<details><summary>Identificadores</summary>{r.mapIds.join(', ')}</details></td><td className="p-2">{r.skpIds.length}<details><summary>Identificadores</summary>{r.skpIds.join(', ')}</details></td><td className="p-2"><button className={button} onClick={() => edit(r)}>Editar / ver</button> <button className={button} disabled={blocked} onClick={() => { replace(relations.filter((v) => v.id !== r.id)); if (editing === r.id) clear(); setMessage(`Relación ${relationTitle(r)} quitada. Puedes deshacer.`); }}>Quitar</button></td></tr>)}</tbody></table>{!relations.length && <p className="p-3 text-sm text-neutral-600">Aún no hay equivalencias. Selecciona estructuras en uno o ambos mapas para empezar.</p>}</section>
    <p className="text-xs text-neutral-600">Herramienta temporal. Las relaciones se guardan en este navegador y usuario; exporta el JSON como respaldo o para llevarlas a otro equipo. No modifica el catastro ni el SKP original.</p>
  </div>;
}
