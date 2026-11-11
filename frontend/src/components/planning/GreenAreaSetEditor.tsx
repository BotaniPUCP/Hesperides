'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { GreenAreaSetDetail, GreenAreaSetElement } from '@shared/types';
import type { IrrigationZone } from '@shared/types/irrigation';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Badge, Button, Card, Input } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import type { ActivityOption } from '@/components/maintenance/activityGroups';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { FROM_FREQUENCY, SETS_PATH } from './GreenAreaSetsScreen';
import { ActivityChipsPicker } from './ActivityChipsPicker';
import { SelectedGardensSummary, type SectorContents } from './SelectedGardensSummary';
import { SetMapPicker } from './SetMapPicker';
import { contentsLabel } from './planningTexts';

export interface SetOptions {
  activities: ActivityOption[];
  sectors: IrrigationZone[];
  sectionsBySector: Record<number, IrrigationZone[]>;
  specimens: GreenAreaSetElement[];
}

/** Formulario de un conjunto: nombre, actividades que se planifican en él y jardines del mapa. */
export function GreenAreaSetEditor({ options, existing }: { options: SetOptions; existing: GreenAreaSetDetail | null }) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [zoneIds, setZoneIds] = useState<number[]>(existing?.zones.map((z) => z.id) ?? []);
  const [elementIds, setElementIds] = useState<number[]>(existing?.elements.map((e) => e.id) ?? []);
  const [activityIds, setActivityIds] = useState<Set<number>>(new Set(existing?.activities.map((a) => a.id)));
  // Un conjunto nuevo empieza por el mapa: es lo que lo define.
  const [picking, setPicking] = useState(existing == null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [savedName, setSavedName] = useState<string | null>(null);
  const saved = warnings.length > 0 || savedName != null;

  const names = useMemo(() => {
    const byId = new Map<number, string>();
    Object.values(options.sectionsBySector).flat().forEach((s) => byId.set(s.id, s.name));
    existing?.zones.forEach((z) => byId.set(z.id, z.displayName));
    return byId;
  }, [options, existing]);

  const sectorOf = useMemo(() => {
    const byId = new Map<number, string>();
    options.sectors.forEach((sector) => (options.sectionsBySector[sector.id] ?? []).forEach((s) => byId.set(s.id, sector.name)));
    return byId;
  }, [options]);

  const specimenById = useMemo(() => {
    const byId = new Map<number, GreenAreaSetElement>();
    options.specimens.forEach((e) => byId.set(e.id, e));
    existing?.elements.forEach((e) => byId.set(e.id, e));
    return byId;
  }, [options, existing]);

  /** Lo elegido, por sector, para ver de un vistazo qué cubre el conjunto. */
  const bySector = useMemo(() => {
    const groups = new Map<string, SectorContents>();
    const of = (sector: string) => {
      if (!groups.has(sector)) groups.set(sector, { gardens: [], specimens: [] });
      return groups.get(sector)!;
    };
    zoneIds.forEach((id) => of(sectorOf.get(id) ?? 'Sin sector').gardens.push(names.get(id) ?? `Sección ${id}`));
    elementIds.forEach((id) => {
      const e = specimenById.get(id);
      of(e?.sectorName ?? 'Fuera de toda sección').specimens.push(e ? `${e.code} · ${e.displayName}` : `Ejemplar ${id}`);
    });
    return [...groups];
  }, [zoneIds, elementIds, sectorOf, names, specimenById]);

  const contents = zoneIds.length + elementIds.length;

  const toggleActivity = (id: number) => setActivityIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    if (!name.trim() || (zoneIds.length === 0 && elementIds.length === 0) || activityIds.size === 0) {
      setError('Ponle un nombre, elige al menos un jardín o un ejemplar, y una actividad.');
      return;
    }
    const body = { name: name.trim(), description: description.trim() || null, zoneIds, elementIds, activityTypeItemIds: [...activityIds],
      ...(existing ? { version: existing.version } : {}) };
    setSaving(true);
    setError(null);
    try {
      const saved = existing ? await greenAreaSetsApi.update(existing.id, body) : await greenAreaSetsApi.create(body);
      const fromFrequency = new URLSearchParams(window.location.search).get('desde') === FROM_FREQUENCY;
      if (saved.warnings.length > 0) setWarnings(saved.warnings);
      if (fromFrequency) setSavedName(saved.name);
      else if (saved.warnings.length === 0) router.push(SETS_PATH);
    } catch (e) {
      setError(mensajeDeApiError(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!existing || !window.confirm(`¿Dar de baja «${existing.name}»? Dejará de aparecer en la planificación.`)) return;
    try {
      await greenAreaSetsApi.remove(existing.id);
      router.push(SETS_PATH);
    } catch (e) {
      setError(mensajeDeApiError(e));
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader title={existing ? existing.name : 'Nuevo conjunto'} />
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
            <Button variant="secondary" onClick={() => setPicking(true)}>{contents === 0 ? 'Elegir en el mapa' : 'Cambiar en el mapa'}</Button>
            <SelectedGardensSummary bySector={bySector} />
          </div>
        </Card>
      </section>
      <section aria-label="Datos del conjunto">
        <Card title="Datos del conjunto">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <Input id="set-name" label="Nombre" value={name} onChange={setName} maxLength={120} required />
            <Input id="set-description" label="Descripción (opcional)" value={description} onChange={setDescription}
              maxLength={2000} placeholder="Jardines frente a la biblioteca" />
          </div>
        </Card>
      </section>
      <section aria-label="Actividades que se planifican aquí">
        <Card title="Actividades que se planifican aquí" actions={<Badge color={activityIds.size > 0 ? 'brand' : 'warning'}
          label={activityIds.size === 0 ? 'Ninguna elegida' : activityIds.size === 1 ? '1 elegida' : `${activityIds.size} elegidas`} />}>
          <p className="mb-3 text-sm text-neutral-500">Solo estas aparecen en la planificación preventiva del conjunto.</p>
          <ActivityChipsPicker activities={options.activities} selected={activityIds} onToggle={toggleActivity} />
        </Card>
      </section>
      {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
      {warnings.length > 0 && (
        <div role="status" className="space-y-2 rounded-md bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
          <p className="font-semibold">Se guardó el conjunto, con estos avisos:</p>
          <ul className="list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          {!savedName && <Link href={SETS_PATH} className="underline">Volver a conjuntos</Link>}
        </div>
      )}
      {savedName && (
        <div role="status" className="space-y-1 rounded-md bg-brand-50 p-3 text-sm text-brand-800">
          <p>Se guardó <strong>{savedName}</strong>.</p>
          <p>Vuelve a la pestaña de la frecuencia para elegirlo.</p>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-3">
        {existing && !saved ? <Button variant="danger" onClick={remove}>Dar de baja</Button> : <span />}
        {!saved && <Button onClick={save} loading={saving}>Guardar conjunto</Button>}
      </div>
      </>}
    </section>
  );
}
