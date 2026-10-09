'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { PlaceDetail, PlacePerspective, PlacePhoto } from '@shared/types';
import { useToast } from '@/components/ui';
import { ConfirmActionModal } from '@/components/users/ConfirmActionModal';
import { mensajeDeApiError } from '@/lib/api-errors';
import { placesApi } from '@/lib/places-api';

interface Pending {
  title: string;
  body: ReactNode;
  confirmLabel: string;
  run: () => Promise<void>;
}

/** Las bajas de la ficha, cada una con su confirmación. Tras borrar, recarga la ficha (o vuelve al catálogo). */
export function usePlaceActions(place: PlaceDetail | null, reload: () => void) {
  const router = useRouter();
  const { showToast } = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  const [working, setWorking] = useState(false);

  async function confirm() {
    if (!pending) return;
    setWorking(true);
    try {
      await pending.run();
      setPending(null);
    } catch (e) {
      showToast({ variant: 'error', title: 'No se pudo eliminar', description: mensajeDeApiError(e) });
    } finally {
      setWorking(false);
    }
  }

  const code = place?.code ?? '';
  return {
    deletePlace: () =>
      setPending({
        title: 'Eliminar lugar',
        body: <>Se eliminará <strong>{place?.name}</strong> con sus perspectivas y fotos.</>,
        confirmLabel: 'Eliminar lugar',
        run: async () => {
          await placesApi.remove(code);
          router.push('/lugares');
        },
      }),
    deletePerspective: (v: PlacePerspective) =>
      setPending({
        title: 'Eliminar perspectiva',
        body: <>Se eliminará <strong>{v.displayName}</strong> con sus {v.photos.length} fotos.</>,
        confirmLabel: 'Eliminar perspectiva',
        run: async () => {
          await placesApi.removePerspective(code, v.id);
          reload();
        },
      }),
    deletePhoto: (photo: PlacePhoto) =>
      setPending({
        title: 'Eliminar foto',
        body: 'La foto deja de mostrarse en la ficha.',
        confirmLabel: 'Eliminar foto',
        run: async () => {
          await placesApi.removePhoto(code, photo.id);
          reload();
        },
      }),
    dialog: (
      <ConfirmActionModal
        isOpen={pending !== null}
        title={pending?.title ?? ''}
        confirmLabel={pending?.confirmLabel ?? ''}
        onConfirm={() => void confirm()}
        onCancel={() => setPending(null)}
        isWorking={working}
        destructive
      >
        {pending?.body}
      </ConfirmActionModal>
    ),
  };
}
