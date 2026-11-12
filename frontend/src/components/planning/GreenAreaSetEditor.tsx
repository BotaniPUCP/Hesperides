'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { GreenAreaSetDetail, GreenAreaSetElement } from '@shared/types';
import type { IrrigationZone } from '@shared/types/irrigation';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Badge, Button, Card, Input } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { mensajeDeApiError } from '@/lib/api-errors';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { removeSetQuestion, SETS_PATH } from './GreenAreaSetsScreen';
import { SelectedGardensSummary, type SectorContents } from './SelectedGardensSummary';
import { SetMap } from './SetMap';
import { SetMapPicker } from './SetMapPicker';
import { contentsLabel } from './planningTexts';

export interface SetOptions {
  sectors: IrrigationZone[];
  sectionsBySector: Record<number, IrrigationZone[]>;
  specimens: GreenAreaSetElement[];
}

/** Formulario de un conjunto: dónde (jardines y ejemplares) y su nombre. Qué se planifica en él se asigna en Planificación. */
export function GreenAreaSetEditor({ options, existing }: { options: SetOptions; existing: GreenAreaSetDetail | null }) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [zoneIds, setZoneIds] = useState<number[]>(existing?.zones.map((z) => z.id) ?? []);
  const [elementIds, setElementIds] = useState<number[]>(existing?.elements.map((e) => e.id) ?? []);
  // Un conjunto nuevo empieza por el mapa: es lo que lo define.
  const [picking, setPicking] = useState(existing == null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ask, dialog } = useConfirmDialog();
  const [warnings, setWarnings] = useState<string[]>([]);
  const saved = warnings.length > 0;
  // «Ver en el mapa» desde la lista llega con #mapa.
  const [mapOpen, setMapOpen] = useState(() => typeof window !== 'undefined' && window.location.hash === '#mapa');

  const names = useMemo(() => {
    const byId = new Map<number, string>();
    Object.values(options.sectionsBySector).flat().forEach((s) => byId.set(s.id, s.name));
    existing?.zones.forEach((z) => byId.set(z.id, z.displayName));
    return byId;
  }, [options, existing]);

  const codes = useMemo(() => {
    const byId = new Map<number, string>();
    Object.values(options.sectionsBySector).flat().forEach((s) => byId.set(s.id, s.code));
    existing?.zones.forEach((z) => byId.set(z.id, z.code));
    return byId;
  }, [options, existing]);

  const specimenById = useMemo(() => {
    const byId = new Map<number, GreenAreaSetElement>();
    options.specimens.forEach((e) => byId.set(e.id, e));
    existing?.elements.forEach((e) => byId.set(e.id, e));
    return byId;
  }, [options, existing]);

  /** Lo elegido por tipo: los jardines, y los ejemplares de cada tipo (Palmera, Árbol…). */
  const byType = useMemo(() => {
    const groups = new Map<string, SectorContents>();
    const of = (type: string) => {
      if (!groups.has(type)) groups.set(type, { gardens: [], specimens: [] });
      return groups.get(type)!;
    };
    zoneIds.forEach((id) => of('Jardines').gardens.push(names.get(id) ?? `Sección ${id}`));
    elementIds.forEach((id) => {
      const e = specimenById.get(id);
      of(e?.typeLabel ?? 'Sin tipo').specimens.push(e ? `${e.code} · ${e.displayName}` : `Ejemplar ${id}`);
    });
    return [...groups];
  }, [zoneIds, elementIds, names, specimenById]);

  const zoneCodes = useMemo(() => zoneIds.map((id) => codes.get(id)).filter((c): c is string => Boolean(c)), [zoneIds, codes]);
  const specimenCodes = useMemo(() => elementIds.map((id) => specimenById.get(id)?.code).filter((c): c is string => Boolean(c)),
    [elementIds, specimenById]);

  const contents = zoneIds.length + elementIds.length;

  const save = async () => {
    if (!name.trim() || (zoneIds.length === 0 && elementIds.length === 0)) {
      setError('Ponle un nombre y elige al menos un jardín o un ejemplar.');
      return;
    }
    const body = { name: name.trim(), description: description.trim() || null, zoneIds, elementIds,
      ...(existing ? { version: existing.version } : {}) };
    setSaving(true);
    setError(null);
    try {
      const saved = existing ? await greenAreaSetsApi.update(existing.id, body) : await greenAreaSetsApi.create(body);
      if (saved.warnings.length > 0) setWarnings(saved.warnings);
      else router.push(SETS_PATH);
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing || !(await ask(removeSetQuestion(existing.name)))) return;
    try {
      await greenAreaSetsApi.remove(existing.id);
      router.push(SETS_PATH);
    } catch (e) {
      setError(mensajeDeApiError(e));
    }
  };

  return (
    <section className="space-y-6">
      {/* El nombre se pide en el formulario: el título dice qué se hace, no repite el nombre. */}
      <PageHeader title={existing ? 'Editar conjunto de áreas verdes' : 'Nuevo conjunto de áreas verdes'}
        description={existing ? 'Lo que guardes vale para todas sus planificaciones.' : 'Elige sus jardines y ejemplares en el mapa y ponle un nombre.'} />
      {/* El mapa se elige dentro de la misma pantalla, con el menú a la vista; lo escrito abajo se conserva. */}
      {picking ? (
        <SetMapPicker sectors={options.sectors} sectionsBySector={options.sectionsBySector} specimens={options.specimens}
          selectedZoneIds={zoneIds} selectedSpecimenIds={elementIds} onCancel={() => setPicking(false)}
          onConfirm={(ids, specimenIds) => { setZoneIds(ids); setElementIds(specimenIds); setPicking(false); }} />
      ) : <>
      <section aria-label="Jardines y ejemplares">
        <Card title="Jardines y ejemplares" actions={<Badge color={contents > 0 ? 'brand' : 'warning'}
          label={contents === 0 ? 'Nada elegido' : contentsLabel(zoneIds.length, elementIds.length)} />}>
          <div className="space-y-3">
            {/* Dos acciones distintas: cambiar lo elegido (abre el selector) y solo mirarlo en el mapa. */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setPicking(true)} leadingIcon={<PencilIcon />}>
                {contents === 0 ? 'Elegir jardines y ejemplares' : 'Cambiar jardines y ejemplares'}</Button>
              {contents > 0 && (
                <span className="ml-auto">
                  <Button variant="ghost" onClick={() => setMapOpen((v) => !v)} leadingIcon={<EyeIcon off={mapOpen} />}>
                    {mapOpen ? 'Ocultar mapa' : 'Ver en el mapa'}</Button>
                </span>
              )}
            </div>
            {mapOpen && contents > 0 && <div id="mapa" className="h-[60vh]"><SetMap zoneCodes={zoneCodes} specimenCodes={specimenCodes} className="h-full" /></div>}
            <SelectedGardensSummary groups={byType} />
          </div>
        </Card>
      </section>
      <section aria-label="Datos del conjunto">
        <Card title="Datos del conjunto">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <Input id="set-name" label="Nombre" value={name} onChange={setName} maxLength={120} required
                placeholder="Ej. Jardines de la biblioteca" />
              <Input id="set-description" label="Descripción (opcional)" value={description} onChange={setDescription}
                maxLength={2000} placeholder="Ej. Los tres jardines frente a la biblioteca central" />
            </div>
            {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
            {warnings.length > 0 && (
              <div role="status" className="space-y-2 rounded-md bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
                <p className="font-semibold">Se guardó el conjunto, con estos avisos:</p>
                <ul className="list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
                <Link href={SETS_PATH} className="underline">Volver a conjuntos</Link>
              </div>
            )}
            {/* Como en el resto del sistema: eliminar a la izquierda; cancelar y guardar a la derecha. */}
            {!saved && (
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {existing && <Button variant="danger" onClick={remove}>Eliminar conjunto</Button>}
                <span className="flex-1" />
                <Button variant="secondary" onClick={() => router.push(SETS_PATH)} disabled={saving}>Cancelar</Button>
                <Button onClick={save} loading={saving}>Guardar conjunto</Button>
              </div>
            )}
          </div>
        </Card>
      </section>
      </>}
      {dialog}
    </section>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M4 20h4l10.5-10.5a2.5 2.5 0 00-3.536-3.536L4.5 16.5 4 20z" />
    </svg>
  );
}

/** El ojo, tachado cuando el mapa está a la vista (lo que hace el botón es ocultarlo). */
function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      {off && <path strokeLinecap="round" strokeLinejoin="round" d="M4 4l16 16" />}
    </svg>
  );
}
