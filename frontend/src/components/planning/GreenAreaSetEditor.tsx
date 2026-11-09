'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import type { GreenAreaSetDetail } from '@shared/types';
import type { IrrigationZone } from '@shared/types/irrigation';
import { SectionMapPicker } from '@/components/map3d/SectionMapPicker';
import { Button, Card, Input, Textarea } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { greenAreaSetsApi } from '@/lib/green-area-sets-api';
import { SETS_PATH } from './GreenAreaSetsScreen';
import { gardensLabel } from './planningTexts';

export interface SetOptions {
  activities: { id: number; label: string }[];
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
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const names = useMemo(() => {
    const byId = new Map<number, string>();
    Object.values(options.sectionsBySector).flat().forEach((s) => byId.set(s.id, s.name));
    existing?.zones.forEach((z) => byId.set(z.id, z.displayName));
    return byId;
  }, [options, existing]);

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
      <div>
        <Link href={SETS_PATH} className="text-sm text-brand-600 underline">Volver a conjuntos</Link>
        <h1 className="mt-2 text-2xl font-bold">{existing ? existing.name : 'Nuevo conjunto'}</h1>
      </div>
      <Card>
        <div className="space-y-4">
          <Input id="set-name" label="Nombre" value={name} onChange={setName} maxLength={120} required />
          <Textarea id="set-description" label="Descripción (opcional)" value={description} onChange={setDescription} maxLength={2000} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-neutral-900">Actividades que se planifican en este conjunto</legend>
            <div className="grid gap-1 sm:grid-cols-2">
              {options.activities.map((a) => (
                <label key={a.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={activityIds.has(a.id)} onChange={() => toggleActivity(a.id)} /> {a.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => setPicking(true)}>Elegir jardines en el mapa</Button>
              <span className="text-sm text-neutral-700">
                {zoneIds.length === 1 ? '1 jardín elegido' : `${gardensLabel(zoneIds.length)} elegidos`}
              </span>
            </div>
            {zoneIds.length > 0 && (
              <p className="text-sm text-neutral-500">{zoneIds.map((id) => names.get(id) ?? `Sección ${id}`).join(' · ')}</p>
            )}
          </div>
        </div>
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
        <Button onClick={save} loading={saving}>Guardar conjunto</Button>
      </div>
      {picking && (
        <SectionMapPicker sectors={options.sectors} sectionsBySector={options.sectionsBySector} scope="ALL"
          selectedIds={zoneIds} texts={PICKER_TEXTS} onCancel={() => setPicking(false)}
          onConfirm={(ids) => { setZoneIds(ids); setPicking(false); }} />
      )}
    </section>
  );
}
