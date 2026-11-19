'use client';

import { useState } from 'react';
import type { HeightClass, IncidentDetail, IncidentOptions, IncidentReview } from '@shared/types';
import { Button, Card, Input, Select, Textarea } from '@/components/ui';
import { useOrganizationList } from '@/hooks/useDirectory';
import { HEIGHT_CLASSES } from '@/lib/incidentLabels';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { LocationFields, locationPayload } from './LocationFields';
import { MarkedField } from './IncidentFieldMark';

type Option = { id: number; code: string; label: string };
const byId = (items: { id: number; name: string }[]): Option[] => items.map((i) => ({ id: i.id, code: String(i.id), label: i.name }));

/** Coordinación revisa lo prellenado y puede modificar todo; lo original queda aparte (SPEC-201 §3.6). */
export function IncidentReviewForm({ detail, options, busy, onSave }: {
  detail: IncidentDetail; options: IncidentOptions; busy: boolean; onSave: (review: IncidentReview) => Promise<boolean>;
}) {
  const i = detail.incident;
  const suggestion = detail.prefill.suggestion;
  const [title, setTitle] = useState(i.title ?? '');
  const [description, setDescription] = useState(i.description);
  const [urgency, setUrgency] = useState<string | null>(i.urgency?.code ?? null);
  const [type, setType] = useState<string | null>(i.type?.code ?? null);
  const [zone, setZone] = useState<string | null>(i.zone ? String(i.zone.id) : null);
  const [location, setLocation] = useState({ reference: i.locationReference ?? '', latitude: i.latitude?.toString() ?? '', longitude: i.longitude?.toString() ?? '' });
  const [team, setTeam] = useState<string | null>(i.team ? String(i.team.id) : null);
  const [height, setHeight] = useState<string | null>(i.heightClass);
  const [thirdParty, setThirdParty] = useState(i.thirdParty);
  const [provider, setProvider] = useState<string | null>(i.provider?.code ?? null);
  const [days, setDays] = useState(i.agreedDays?.toString() ?? '');
  const [requester, setRequester] = useState(i.requestedBy.name ?? '');
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);
  const companies = useOrganizationList(thirdParty);
  const classLabel = (code: string | null) => options.classes.find((c) => c.code === code)?.label;
  const typeOptions: Option[] = options.types.map((t) => ({ id: t.id, code: t.code, label: [classLabel(t.classCode), t.label].filter(Boolean).join(' · ') }));
  const heightOptions: Option[] = options.heightClasses.map((h, n) => ({ id: n, code: h, label: HEIGHT_CLASSES[h] }));
  const providerOptions: Option[] = companies.items.filter((o) => o.type.code === 'EXTERNAL_COMPANY').map((o, n) => ({ id: n, code: o.code, label: o.name }));

  const save = async () => {
    if (!description.trim()) { setError('La descripción no puede quedar vacía.'); return; }
    let place;
    try { place = locationPayload(location); } catch (ex) { setError((ex as Error).message); return; }
    setError('');
    const review: IncidentReview = {
      version: i.version, title: title.trim() || null, description: description.trim(), urgencyCode: urgency, typeCode: type,
      zoneId: zone ? Number(zone) : null, ...place, teamId: team ? Number(team) : null, thirdParty,
      providerOrganizationCode: thirdParty ? provider : null, agreedDays: thirdParty && days ? Number(days) : null,
      heightClass: height as HeightClass | null, requestedByOrganizationCode: i.requestedBy.organizationCode,
      requestedByName: requester.trim() || null, requesterContactCode: i.requestedBy.contactCode,
      requestedForOrganizationCode: i.requestedFor?.code ?? null, sourceCode: i.source?.code ?? null, externalCode: i.externalCode,
    };
    if (await onSave(review)) setDirty(false);
  };

  return <Card title="Revisión de coordinación">
    {guard.dialog}
    <form className="space-y-4" onChange={() => setDirty(true)} onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <MarkedField field="title" incident={i} suggestion={suggestion}>
        <Input id="review-title" label="Título" size="lg" value={title} maxLength={120} disabled={busy} onChange={setTitle} />
      </MarkedField>
      <Textarea id="review-description" label="Descripción" value={description} rows={4} maxLength={10000} disabled={busy} required
        helperText="Puedes redactarla en términos técnicos; el texto original queda guardado aparte." onChange={setDescription} />
      <Select id="review-urgency" label="Urgencia" size="lg" options={options.urgencies} value={urgency} disabled={busy} clearable
        placeholder="Sin evaluar" onChange={(v) => { setUrgency(v?.code ?? null); setDirty(true); }} />
      <MarkedField field="typeCode" incident={i} suggestion={suggestion}>
        <Select id="review-type" label="Tipo de incidencia" size="lg" options={typeOptions} value={type} disabled={busy} clearable searchable
          placeholder="Sin clasificar" onChange={(v) => { setType(v?.code ?? null); setDirty(true); }} />
      </MarkedField>
      <MarkedField field="zoneId" incident={i} suggestion={suggestion}>
        <Select id="review-zone" label="Sección" size="lg" options={byId(options.sections)} value={zone} disabled={busy} clearable searchable
          placeholder="Sin ubicar" onChange={(v) => { setZone(v?.code ?? null); setDirty(true); }} />
      </MarkedField>
      <MarkedField field="reference" incident={i} suggestion={suggestion}>
        <LocationFields value={location} onChange={(v) => { setLocation(v); setDirty(true); }} disabled={busy} />
      </MarkedField>
      <Select id="review-team" label="Cuadrilla responsable" size="lg" options={byId(options.teams)} value={team} disabled={busy} clearable
        placeholder="Sin asignar" onChange={(v) => { setTeam(v?.code ?? null); setDirty(true); }} />
      <MarkedField field="heightClass" incident={i} suggestion={suggestion}>
        <Select id="review-height" label="Clase de altura" size="lg" options={heightOptions} value={height} disabled={busy} clearable
          placeholder="Sin indicar" onChange={(v) => { setHeight(v?.code ?? null); setDirty(true); }} />
      </MarkedField>
      <label className="flex min-h-12 items-center gap-3 text-sm font-medium text-neutral-900">
        <input type="checkbox" checked={thirdParty} disabled={busy} onChange={(e) => setThirdParty(e.target.checked)} />
        La atiende un tercero (informativo)
      </label>
      {thirdParty && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select id="review-provider" label="Empresa del Directorio" size="lg" options={providerOptions} value={provider} disabled={busy}
          loading={!companies.loaded} clearable searchable placeholder="Elige la empresa" onChange={(v) => { setProvider(v?.code ?? null); setDirty(true); }} />
        <Input id="review-days" label="Días pactados" type="number" size="lg" value={days} disabled={busy} onChange={setDays} />
      </div>}
      <Input id="review-requester" label="Pedido de" size="lg" value={requester} maxLength={200} disabled={busy} onChange={setRequester}
        helperText="Si la pidió otra unidad, escribe su nombre; coordinación la puede vincular al Directorio." />
      {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
      <Button type="submit" size="lg" variant="secondary" disabled={busy}>Guardar cambios</Button>
    </form>
  </Card>;
}
