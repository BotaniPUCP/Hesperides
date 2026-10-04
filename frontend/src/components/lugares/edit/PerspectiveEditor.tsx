'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PerspectiveSideCode, PlaceDetail, PlacePerspective } from '@shared/types';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import { Button, LoadingSkeleton, Modal } from '@/components/ui';
import { Map3DView } from '@/components/map3d/Map3DView';
import type { Viewer } from '@/components/map3d/viewer/createViewer';
import { mensajeDeApiError } from '@/lib/api-errors';
import { cn } from '@/lib/cn';
import { placesApi } from '@/lib/places-api';
import { focusPlace } from '../focusPlace';
import { useSceneData } from '../useSceneData';
import { usePerspectiveDraft, type DraftStep } from './usePerspectiveDraft';

const nada = () => undefined;
/** Id del cono que se está marcando: las perspectivas guardadas tienen ids positivos. */
const DRAFT_CONE = -1;

const SIDES: { code: PerspectiveSideCode; label: string }[] = [
  { code: 'FRONT', label: 'Frente' },
  { code: 'BACK', label: 'Espalda' },
  { code: 'SIDE', label: 'Al lado' },
];

const STEP_HINT: Record<DraftStep, string> = {
  point: 'Haz clic en el mapa donde se paró quien tomó las fotos.',
  direction: 'Ahora haz clic hacia donde mira la cámara.',
  done: 'Listo. Un clic más vuelve a marcar el punto.',
};

export interface PerspectiveEditorProps {
  place: PlaceDetail;
  /** La que se edita; null para agregar una nueva. */
  perspective: PlacePerspective | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Marca una perspectiva en el mapa con dos clics y muestra su nombre antes de guardarla. */
export function PerspectiveEditor({ place, perspective, onClose, onSaved }: PerspectiveEditorProps) {
  const { data, isLoading } = useSceneData();
  const draft = usePerspectiveDraft(place.code, perspective);
  const [viewer, setViewer] = useState<Viewer | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const marked = JSON.stringify([draft.side, draft.point, draft.heading]);
  const [initial] = useState(marked);
  const guard = useUnsavedChangesGuard(marked !== initial);
  const close = () => guard.confirm(onClose);
  const others = useMemo(() => place.perspectives.filter((v) => v.id !== perspective?.id), [place.perspectives, perspective?.id]);
  const taken = (code: PerspectiveSideCode) => code !== 'SIDE' && others.some((v) => v.side.code === code);

  // Una sola vez al abrir: después la cámara la mueve quien marca.
  useEffect(() => {
    if (viewer && data) focusPlace(viewer, data, place);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer, data]);

  useEffect(() => {
    if (!viewer) return;
    const cones = others.map((v) => ({ id: v.id, lat: v.lat, lon: v.lon, headingDeg: v.headingDeg }));
    if (draft.point) cones.push({ id: DRAFT_CONE, ...draft.point, headingDeg: draft.heading ?? 0 });
    viewer.setViewCones(cones);
  }, [viewer, others, draft.point, draft.heading]);

  async function save() {
    if (!draft.input) return;
    setSaving(true);
    setError(null);
    try {
      if (perspective) await placesApi.updatePerspective(place.code, perspective.id, draft.input);
      else await placesApi.createPerspective(place.code, draft.input);
      onSaved();
    } catch (e) {
      setError(mensajeDeApiError(e));
      setSaving(false);
    }
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={close}>Cancelar</Button>
      <Button onClick={() => void save()} disabled={!draft.input || draft.previewError !== null} loading={saving}>
        Guardar perspectiva
      </Button>
    </>
  );

  return (
    <>
    <Modal isOpen onClose={close} title={perspective ? 'Editar perspectiva' : 'Nueva perspectiva'} size="lg" footer={footer}>
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Lado" className="flex gap-2">
          {SIDES.map((s) => (
            <button
              key={s.code}
              type="button"
              disabled={taken(s.code)}
              aria-pressed={draft.side === s.code}
              onClick={() => draft.setSide(s.code)}
              title={taken(s.code) ? `El lugar ya tiene ${s.label.toLowerCase()}` : undefined}
              className={cn('rounded-md border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40', draft.side === s.code ? 'border-brand-600 bg-brand-50 font-semibold text-brand-800' : 'border-neutral-200 text-neutral-700')}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-neutral-700">{STEP_HINT[draft.step]}</p>
        <div className="relative h-80 overflow-hidden rounded-lg border border-neutral-200">
          {isLoading || !data ? (
            <LoadingSkeleton variant="map" />
          ) : (
            <Map3DView data={data} onReady={setViewer} onUnsupported={nada} onSelect={nada} onHover={nada} onCompass={nada}
              onGroundPick={nada} onPointPick={(lat, lon) => draft.click(data.plane, { lat, lon })} />
          )}
        </div>
        <p className="min-h-6 text-base font-semibold text-neutral-900" aria-live="polite">
          {draft.previewName ?? (draft.side ? '' : 'Elige el lado de la perspectiva.')}
        </p>
        {(draft.previewError || error) && (
          <p role="alert" className="rounded-md bg-alert-danger-bg p-2 text-sm text-alert-danger-fg">{error ?? draft.previewError}</p>
        )}
      </div>
    </Modal>
    {guard.dialog}
    </>
  );
}
