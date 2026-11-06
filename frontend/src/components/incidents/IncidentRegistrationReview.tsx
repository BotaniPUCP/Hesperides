'use client';

import { useState } from 'react';
import type { IncidentCapture, IncidentDetail, IncidentOptions } from '@shared/types';
import { Button, Card, Textarea } from '@/components/ui';
import { LocationFields, locationPayload } from './LocationFields';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { IncidentMatrixFields,matrixReview } from './IncidentMatrixFields';

export function IncidentRegistrationReview({ detail, options, coordinator, busy, onReturn, onResubmit }: {
  detail: IncidentDetail; coordinator: boolean; busy: boolean;
  options: IncidentOptions | null;
  onReturn: (reason: string) => Promise<boolean>; onResubmit: (report: IncidentCapture) => Promise<boolean>;
}) {
  const incident = detail.incident;
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState(incident.description);
  const [matrix,setMatrix] = useState(() => matrixReview(incident.matrix));
  const [location, setLocation] = useState({ reference: incident.locationReference ?? '', latitude: incident.latitude?.toString() ?? '', longitude: incident.longitude?.toString() ?? '' });
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const guard = useUnsavedChangesGuard(dirty);
  if (incident.approvedAt) return null;
  if (detail.canCorrectReport) return <Card title="Corregir y reenviar reporte">
    {guard.dialog}
    <p className="mb-4 whitespace-pre-wrap rounded-md bg-alert-warning-bg p-3 text-alert-warning-fg">{incident.correctionReason}</p>
    <form className="space-y-4" onChange={() => setDirty(true)} onSubmit={async (e) => {
      e.preventDefault();
      if (!description.trim()) { setError('Describe lo ocurrido.'); return; }
      try {
        const report = { description: description.trim(), ...locationPayload(location),matrix };
        setError(''); if (await onResubmit(report)) setDirty(false);
      } catch (ex) { setError((ex as Error).message); }
    }}>
      <Textarea id="corrected-description" label="Descripción corregida" value={description} onChange={setDescription} required disabled={busy} maxLength={10000} />
      <LocationFields value={location} onChange={(next) => { setLocation(next); setDirty(true); }} disabled={busy} />
      {options && <IncidentMatrixFields value={matrix} original={incident.matrix} options={options.matrix} disabled={busy} onChange={(next) => {setMatrix(next);setDirty(true);}} />}
      {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
      <Button type="submit" size="lg" loading={busy}>Reenviar para revisión</Button>
      <p className="text-sm text-neutral-700">Conserva el mismo reporte y fecha de recepción. El texto original y las correcciones quedan en el historial.</p>
    </form>
  </Card>;
  if (incident.status.code === 'CHANGES_REQUESTED') return <Card title="Esperando corrección del reporte">
    <p className="whitespace-pre-wrap">{incident.correctionReason}</p><p className="mt-3 text-sm text-neutral-700">El remitente debe corregir y reenviar antes del registro oficial.</p>
  </Card>;
  if (!coordinator) return null;
  return <Card title="Solicitar corrección del reporte">
    <p className="mb-3 text-sm text-neutral-700">Opcional: también puedes corregir los datos directamente. Devolver no crea otra incidencia.</p>
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); if (!reason.trim()) { setError('Indica qué debe corregir el remitente.'); return; }
      setError(''); if (await onReturn(reason.trim())) setReason('');
    }}>
      <Textarea id="report-correction-reason" label="Qué debe corregirse" value={reason} onChange={setReason} required disabled={busy} maxLength={2000} />
      {error && <p role="alert" className="text-sm text-action-danger">{error}</p>}
      <Button type="submit" variant="secondary" size="lg" loading={busy}>Devolver para corrección</Button>
    </form>
  </Card>;
}
