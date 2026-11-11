'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { GreenAreaSetDetail } from '@shared/types';
import type { IrrigationZone } from '@shared/types/irrigation';
import { SectionMapPicker } from '@/components/map3d/SectionMapPicker';
import { PageHeader } from '@/components/layouts/PageHeader';
import { Button, Card, Input } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import type { ActivityOption } from '@/components/maintenance/activityGroups';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { SETS_PATH } from './GreenAreaSetsScreen';
import { ActivityChipsPicker } from './ActivityChipsPicker';
import { gardensLabel } from './planningTexts';

export interface SetOptions {
  activities: ActivityOption[];
  sectors: IrrigationZone[];
  sectionsBySector: Record<number, IrrigationZone[]>;
}

const PICKER_TEXTS = {
  title: 'Elegir jardines del conjunto · Mapa 3D',
  description: 'Haz clic en los jardines o dibuja un rectángulo. Confirmar solo selecciona; el conjunto se guarda después.',
  listTitle: 'Jardines del conjunto',
  confirmAllPrompt: (missing: number) => `¿Agregar ${missing} jardines más al conjunto?`,
};

/** Formulario de un conjunto: nombre, actividades que se planifican en él y jardines del mapa. */
export function GreenAreaSetEditor({ options, existing }: { options: SetOptions; existing: GreenAreaSetDetail | null }) {
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [zoneIds, setZoneIds] = useState<number[]>(existing?.zones.map((z) => z.id) ?? []);
  const [activityIds, setActivityIds] = useState<Set<number>>(new Set(existing?.activities.map((a) => a.id)));
  // Un conjunto nuevo empieza por el mapa: es lo que lo define.
  const [picking, setPicking] = useState(existing == null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const saved = warnings.length > 0;

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

  /** Los jardines elegidos, por sector, para ver de un vistazo qué cubre el conjunto. */
  const bySector = useMemo(() => {
    const groups = new Map<string, string[]>();
    zoneIds.forEach((id) => {
      const sector = sectorOf.get(id) ?? 'Sin sector';
      groups.set(sector, [...(groups.get(sector) ?? []), names.get(id) ?? `Sección ${id}`]);
    });
    return [...groups];
  }, [zoneIds, sectorOf, names]);

  const toggleActivity = (id: number) => setActivityIds((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const save = async () => {
    if (!name.trim() || zoneIds.length === 0 || activityIds.size === 0) {
      setError('Ponle un nombre, elige al menos un jardín y una actividad.');
      return;
    }
    const body = { name: name.trim(), description: description.trim() || null, zoneIds, activityTypeItemIds: [...activityIds],
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
      <Card>
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-neutral-900">Jardines del conjunto</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setPicking(true)}>Elegir jardines en el mapa</Button>
            <span className="text-sm text-neutral-700">
              {zoneIds.length === 1 ? '1 jardín elegido' : `${gardensLabel(zoneIds.length)} elegidos`}
            </span>
          </div>
          {bySector.length > 0 && (
            <ul className="space-y-1 text-sm">
              {bySector.map(([sector, gardens]) => (
                <li key={sector}>
                  <span className="font-medium text-neutral-900">{sector} ({gardens.length}):</span>{' '}
                  <span className="text-neutral-600">{gardens.join(' · ')}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
      <Card>
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <Input id="set-name" label="Nombre" value={name} onChange={setName} maxLength={120} required />
          <Input id="set-description" label="Descripción (opcional)" value={description} onChange={setDescription}
            maxLength={2000} placeholder="Jardines frente a la biblioteca" />
        </div>
      </Card>
      <Card>
        <section aria-labelledby="set-activities" className="space-y-3">
          <h2 id="set-activities" className="text-sm font-semibold text-neutral-900">Actividades que se planifican aquí</h2>
          <ActivityChipsPicker activities={options.activities} selected={activityIds} onToggle={toggleActivity} />
        </section>
      </Card>
      {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
      {warnings.length > 0 && (
        <div role="status" className="space-y-2 rounded-md bg-alert-warning-bg p-3 text-sm text-alert-warning-fg">
          <p className="font-semibold">Se guardó el conjunto, con estos avisos:</p>
          <ul className="list-disc pl-5">{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          <Link href={SETS_PATH} className="underline">Volver a conjuntos</Link>
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-3">
        {existing ? <Button variant="ghost" onClick={remove}>Dar de baja</Button> : <span />}
        {!saved && <Button onClick={save} loading={saving}>Guardar conjunto</Button>}
      </div>
      {picking && (
        <SectionMapPicker sectors={options.sectors} sectionsBySector={options.sectionsBySector} scope="ALL"
          selectedIds={zoneIds} texts={PICKER_TEXTS} onCancel={() => setPicking(false)}
          onConfirm={(ids) => { setZoneIds(ids); setPicking(false); }} />
      )}
    </section>
  );
}
