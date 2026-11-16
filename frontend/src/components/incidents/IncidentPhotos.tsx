'use client';

import { useState } from 'react';
import type { IncidentPhoto } from '@shared/types';
import { Button, Card, LoadingSkeleton } from '@/components/ui';
import { useRequest } from '@/hooks/useRequest';
import { incidentsApi } from '@/lib/incidents-api';
import { incidentDate } from '@/lib/incidentNavigation';

function Photo({ incidentId, photo }: { incidentId: number; photo: IncidentPhoto }) {
  const [retry, setRetry] = useState(0);
  const request = useRequest(`${incidentId}:${photo.id}:${retry}`, () => incidentsApi.photo(incidentId, photo.id));
  const source = request.data ? `data:${request.data.contentType};base64,${request.data.base64}` : null;
  return <figure className="space-y-2">
    {/* Las fotos privadas llegan autenticadas por el cliente central, no por una URL pública. */}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {source ? <img src={source} alt={`Fotografía ${photo.id} de la incidencia`} className="max-h-96 w-full rounded-md object-contain" />
      : request.loading && <LoadingSkeleton variant="card" />}
    {(request.errorMessage || request.notFound) && <div role="alert" className="space-y-3 rounded-md bg-alert-danger-bg p-3 text-alert-danger-fg">
      <p>{request.errorMessage ?? 'La fotografía no está disponible.'}</p>
      <Button variant="secondary" size="lg" onClick={() => setRetry((v) => v + 1)}>Reintentar foto</Button>
    </div>}
    <figcaption className="text-xs text-neutral-700">Recibida: {incidentDate(photo.createdAt)}</figcaption>
  </figure>;
}

export function IncidentPhotos({ incidentId, photos }: { incidentId: number; photos: IncidentPhoto[] }) {
  if (photos.length === 0) return null;
  return <Card title="Fotografías"><div className="space-y-5">
    {photos.map((photo) => <Photo key={photo.id} incidentId={incidentId} photo={photo} />)}
  </div></Card>;
}
