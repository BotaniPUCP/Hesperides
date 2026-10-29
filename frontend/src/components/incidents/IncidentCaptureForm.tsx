'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, Card, Textarea } from '@/components/ui';
import { incidentsApi, newClientReference } from '@/lib/incidents-api';
import { mensajeDeApiError } from '@/lib/api-errors';
import { emptyLocation, LocationFields, locationPayload } from './LocationFields';

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

export function IncidentCaptureForm({ sender, onDone, onCancel }: {
  sender: string; onDone: (id: number) => void; onCancel: () => void;
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
  const submit = async () => {
    if (sending.current) return;
    if (!description.trim()) { setDescriptionError('Escribe brevemente qué pasó.'); return; }
    setDescriptionError('');
    let payload;
    try { payload = { description: description.trim(), ...locationPayload(location) }; }
    catch (ex) { setError((ex as Error).message); return; }
    sending.current = true; setBusy(true); setError('');
    try {
      let id = savedId;
      if (id === null) {
        const json = JSON.stringify(payload);
        if (attempt.current?.json !== json) attempt.current = { json, reference: newClientReference() };
        const detail = await incidentsApi.create(payload, attempt.current.reference);
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
      if (!failed) onDone(id);
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
        <p className="text-sm text-neutral-700">Envía: {sender} · Canal: web<br />La fecha y hora de recepción se registrarán al enviar.</p>
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
            <summary className="min-h-12 cursor-pointer rounded-md py-3 text-sm font-medium text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600">Añadir ubicación (opcional)</summary>
            <LocationFields value={location} onChange={setLocation} disabled={busy || savedId !== null} />
          </details>
        </fieldset>
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
          Tu texto ya fue recibido con el número #{savedId}. Las fotografías pendientes se pueden reintentar o puedes continuar sin ellas.
        </p>}
        {error && <p role="alert" className="rounded-md bg-alert-danger-bg p-3 text-sm text-alert-danger-fg">{error}</p>}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" loading={busy}>{savedId === null ? 'Enviar' : 'Reintentar fotos pendientes'}</Button>
          {savedId === null ? <Button type="button" size="lg" variant="ghost" disabled={busy} onClick={onCancel}>Volver</Button>
            : <Button type="button" size="lg" variant="secondary" disabled={busy} onClick={() => onDone(savedId)}>Continuar al detalle</Button>}
        </div>
      </form>
    </Card>
  );
}
