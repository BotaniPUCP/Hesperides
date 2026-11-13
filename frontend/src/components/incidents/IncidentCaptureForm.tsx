'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card, Textarea } from '@/components/ui';
import { incidentsApi, newClientReference } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { emptyLocation, LocationFields, locationPayload } from './LocationFields';
import type { IncidentDetail,IncidentOptions } from '@shared/types';
import { emptyIncidentMatrix,IncidentMatrixFields,matrixReview } from './IncidentMatrixFields';
import { IncidentCaptureLinks,type CaptureWorkLink } from './IncidentCaptureLinks';

interface Attachment { file: File; reference: string; uploaded: boolean; error: string | null }

function Preview({ file }: { file: File }) {
  const image = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const next = URL.createObjectURL(file);
    if (image.current) image.current.src = next;
    return () => URL.revokeObjectURL(next);
  }, [file]);
  // Local file previews do not use the Next image optimizer.
  // eslint-disable-next-line @next/next/no-img-element
  return <img ref={image} alt={`Fotografía seleccionada: ${file.name}`} className="h-28 w-full rounded-md object-cover" />;
}

export function IncidentCaptureForm({ sender, onDone, onCancel, options = null, optionsError, onRetryOptions,onCreateIntervention,scopeKey = sender }: {
  sender: string; onDone: (id: number) => void; onCancel: () => void;
  options?: IncidentOptions | null;optionsError?: string | null;onRetryOptions?: () => void;onCreateIntervention?: (id: number) => void;
  scopeKey?: string;
}) {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(emptyLocation);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [descriptionError, setDescriptionError] = useState('');
  const [savedId, setSavedId] = useState<number | null>(null);
  const attempt = useRef<{ json: string; reference: string } | null>(null);
  const sending = useRef(false);
  const saved = useRef<IncidentDetail | null>(null);
  const [extended,setExtended]=useState(false);
  const [matrix,setMatrix]=useState(() => matrixReview(emptyIncidentMatrix));
  const [hasMatrix,setHasMatrix]=useState(false);
  const [links,setLinks]=useState<CaptureWorkLink[]>([]);
  const submit = async (createWork = false) => {
    if (sending.current) return;
    if (!description.trim()) { setDescriptionError('Escribe brevemente qué pasó.'); return; }
    setDescriptionError('');
    let payload;
    try { payload = { description: description.trim(), ...locationPayload(location),...(hasMatrix ? {matrix} : {}) }; }
    catch (ex) { setError((ex as Error).message); return; }
    sending.current = true; setBusy(true); setError('');
    try {
      let id = savedId;
      if (id === null) {
        const json = JSON.stringify(payload);
        if (attempt.current?.json !== json) attempt.current = { json, reference: newClientReference() };
        const detail = await incidentsApi.create(payload, attempt.current.reference);
        saved.current=detail;
        id = detail.incident.id; setSavedId(id);
      }
      let failed = false;
      for (const attachment of attachments.filter((a) => !a.uploaded)) {
        try {
          await incidentsApi.upload(id, attachment.file, attachment.reference);
          setAttachments((all) => all.map((a) => a.reference === attachment.reference ? { ...a, uploaded: true, error: null } : a));
        } catch (ex) {
          failed = true;
          setAttachments((all) => all.map((a) => a.reference === attachment.reference ? { ...a, error: mensajeDeApiError(ex) } : a));
        }
      }
      for (const link of links) {
        if (saved.current?.linkedInterventions.some(w => w.id===link.work.id)) continue;
        try {
          saved.current=await incidentsApi.linkIntervention(id,{version:saved.current!.incident.version,
            interventionId:link.work.id,interventionVersion:link.work.version,purposeCode:link.purposeCode});
        } catch(ex) {
          // Keep the saved report and selections; refresh versions for an explicit retry.
          try { saved.current=await incidentsApi.detail(id); } catch { /* Preserve the original failure and retry data. */ }
          throw ex;
        }
      }
      if (!failed) {if(createWork && onCreateIntervention)onCreateIntervention(id);else onDone(id);}
    } catch (ex) { setError(mensajeDeApiError(ex)); }
    finally { sending.current = false; setBusy(false); }
  };

  const addFiles = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (selected.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024 || !file.size)) {
      setError('Selecciona fotografías JPEG, PNG o WebP de hasta 5 MiB cada una. El texto se puede enviar sin fotos.'); return;
    }
    if (attachments.length + selected.length > 6) { setError('Puedes adjuntar hasta seis fotografías.'); return; }
    setError('');
    setAttachments((all) => [...all, ...selected.map((file) => ({ file, reference: newClientReference(), uploaded: false, error: null }))]);
  };

  return (
    <Card>
      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit(); }}>
        <p className="text-sm text-neutral-700">{sender} · Plataforma web</p>
        <Textarea id="incident-description" label="¿Qué pasó?" rows={4} maxLength={10000} required
          helperText="Una frase basta. Si puedes, indica dónde ocurrió." errorMessage={descriptionError}
          placeholder="Rama caída en puerta principal" value={description} disabled={busy || savedId !== null}
          onChange={(value) => { setDescription(value); setDescriptionError(''); }} />
        <fieldset disabled={busy || savedId !== null} className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <label className="flex min-h-12 cursor-pointer items-center rounded-md border border-neutral-200 bg-neutral-0 px-4 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-within:ring-2 focus-within:ring-brand-600">
              Añadir fotos
              <input className="sr-only" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Añadir fotos"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </label>
            <label className="flex min-h-12 cursor-pointer items-center rounded-md border border-neutral-200 bg-neutral-0 px-4 text-sm font-medium text-neutral-900 hover:bg-neutral-50 focus-within:ring-2 focus-within:ring-brand-600">
              Tomar foto
              <input className="sr-only" type="file" capture="environment" accept="image/jpeg,image/png,image/webp" aria-label="Tomar foto"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </label>
          </div>
          <p className="text-sm text-neutral-700">Hasta seis fotos JPEG, PNG o WebP, de 5 MiB cada una.</p>
          <details>
            <summary className="min-h-12 cursor-pointer rounded-md py-3 text-sm font-medium text-brand-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600">Añadir ubicación (opcional)</summary>
            <LocationFields value={location} onChange={setLocation} disabled={busy || savedId !== null} />
          </details>
        </fieldset>
        <div className="border-t border-neutral-200 pt-3">
          <Button type="button" size="lg" variant="ghost" disabled={busy || savedId!==null} onClick={() => setExtended(v => !v)}>
            {extended ? 'Volver al modo simple' : 'Más precisión · modo ampliado (opcional)'}
          </Button>
          <div className={extended ? 'space-y-4' : 'hidden'}>
            {options ? <IncidentMatrixFields value={matrix} original={emptyIncidentMatrix} options={options.matrix} disabled={busy || savedId!==null}
              onChange={(next) => {setMatrix(next);setHasMatrix(true);}} /> : <p className="text-sm text-neutral-700">{optionsError ?? 'Cargando los campos opcionales…'} Puedes enviar el reporte simple.</p>}
            {optionsError && onRetryOptions && <Button type="button" size="lg" onClick={onRetryOptions}>Reintentar campos OSG</Button>}
          </div>
        </div>
        <IncidentCaptureLinks value={links} onChange={setLinks} disabled={busy || savedId!==null} scopeKey={scopeKey} statuses={options?.workStatuses}
          creationAction={options?.canCreateIntervention && onCreateIntervention ? <Button variant="secondary" size="lg" disabled={busy} onClick={() => void submit(true)}>Guardar reporte y crear intervención</Button> : undefined} />
        {attachments.length > 0 && <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {attachments.map((a) => <li key={a.reference} className="space-y-2 rounded-lg border border-neutral-200 p-3">
            <Preview file={a.file} />
            <p className="break-all text-sm">{a.file.name}</p>
            {a.uploaded && <p className="text-sm text-brand-700">Foto recibida</p>}
            {a.error && <p role="alert" className="text-sm text-action-danger">{a.error}</p>}
            {!a.uploaded && <Button type="button" variant="ghost" size="lg" disabled={busy}
              onClick={() => setAttachments((all) => all.filter((item) => item.reference !== a.reference))}>Quitar foto</Button>}
          </li>)}
        </ul>}
        {savedId !== null && <p role="status" className="rounded-lg border border-alert-success-border bg-alert-success-bg p-3 text-alert-success-fg">
          Tu texto ya fue recibido con el número #{savedId}. Puedes reintentar los pendientes o continuar al detalle para completar fotos y relaciones sin duplicar el reporte.
        </p>}
        {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" loading={busy}>{savedId === null ? 'Enviar' : 'Reintentar pendientes'}</Button>
          {savedId === null ? <Button type="button" size="lg" variant="ghost" disabled={busy} onClick={onCancel}>Volver</Button>
            : <Button type="button" size="lg" variant="secondary" disabled={busy} onClick={() => onDone(savedId)}>Continuar al detalle</Button>}
        </div>
        <p className="text-xs text-neutral-600">El usuario, la fecha de recepción y el canal se registran automáticamente.</p>
      </form>
    </Card>
  );
}
