'use client';

import { useRef, useState } from 'react';
import type { PhotoInput } from '@shared/types';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { Button, Input, Select } from '@/components/ui';
import { useCatalog } from '@/hooks/useCatalog';
import { mensajeDeApiError } from '@/lib/api-errors';
import { placesApi } from '@/lib/places-api';
import { LIMITES, motivoDeRechazo } from '@/lib/upload-limits';

export interface PhotoUploaderProps {
  placeCode: string;
  /** A qué van las fotos; con `askInteriorView` se elige la vista en el formulario. */
  target: Pick<PhotoInput, 'perspectiveId'>;
  askInteriorView?: boolean;
  label: string;
  onDone: () => void;
}

/** Sube una o varias fotos con su autor y fecha. Las sube de a una: si una falla, las demás quedan. */
export function PhotoUploader({ placeCode, target, askInteriorView = false, label, onDone }: PhotoUploaderProps) {
  const input = useRef<HTMLInputElement>(null);
  const views = useCatalog(askInteriorView ? 'INTERIOR_VIEW' : '');
  const [open, setOpen] = useState(false);
  const [author, setAuthor] = useState('');
  const [takenOn, setTakenOn] = useState('');
  const [view, setView] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Las fotos se suben al elegirlas; lo único que se puede perder es el autor o la fecha escritos.
  const guard = useUnsavedChangesGuard(open && (author.trim() !== '' || takenOn !== ''));
  const close = () => guard.confirm(() => {
    setOpen(false);
    setAuthor('');
    setTakenOn('');
  });

  async function upload(files: File[]) {
    const rejected = files.map((f) => ({ f, why: motivoDeRechazo(f, LIMITES.foto) })).find((r) => r.why);
    if (rejected) {
      setError(`«${rejected.f.name}»: ${rejected.why}`);
      return;
    }
    setBusy(true);
    setError(null);
    const failed: string[] = [];
    for (const file of files) {
      try {
        await placesApi.uploadPhoto(placeCode, file, { ...target, interiorViewCode: view ?? undefined, author: author.trim() || undefined, takenOn: takenOn || undefined });
      } catch (e) {
        failed.push(`${file.name}: ${mensajeDeApiError(e)}`);
      }
    }
    setBusy(false);
    if (failed.length > 0) setError(`No se subieron: ${failed.join(' · ')}`);
    else setOpen(false);
    onDone();
  }

  if (!open) {
    return <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>{label}</Button>;
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-dashed border-neutral-300 p-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <Input id={`autor-${label}`} label="Autor" value={author} onChange={setAuthor} placeholder="Opcional" />
        <label className="flex flex-col gap-1 text-sm font-medium text-neutral-700">
          Fecha de la foto
          <input type="date" value={takenOn} onChange={(e) => setTakenOn(e.target.value)} className="h-10 rounded-md border border-neutral-200 px-2 text-sm" />
        </label>
        {askInteriorView && (
          <Select id={`vista-${label}`} label="Vista" value={view} onChange={(o) => setView(o?.code ?? null)}
            options={views.items.map((v, i) => ({ id: i + 1, code: v.code, label: v.label }))} required />
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={(e) => void upload(Array.from(e.target.files ?? []))} aria-label={`Archivos para ${label}`} />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => input.current?.click()} loading={busy} disabled={askInteriorView && !view}>Elegir fotos…</Button>
        <Button size="sm" variant="secondary" onClick={close}>Cancelar</Button>
      </div>
      {guard.dialog}
      {error && <p role="alert" className="text-xs text-alert-danger-fg">{error}</p>}
    </div>
  );
}
