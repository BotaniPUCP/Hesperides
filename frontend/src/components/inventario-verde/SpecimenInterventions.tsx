'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import { Button, Card, LoadingSkeleton, StatusBadge } from '@/components/ui';
import { interventionsApi, interventionError, type InterventionPage } from '@/lib/interventions-api';

/** The public specimen remains accessible without requesting private work history. */
export function SpecimenInterventions({code}:{code:string}) {
  const {user,isLoading} = useAuth();
  if (isLoading || !user || !['ADMIN','COORDINADOR','SUPERVISOR','OPERARIO'].includes(user.role.code)) return null;
  // A session, role or specimen change must never display the previous reader's page.
  return <AuthorizedHistory key={`${user.id}:${user.role.code}:${code}`} code={code} />;
}

function AuthorizedHistory({code}:{code:string}) {
  const statuses = useCatalog('INTERVENTION_STATUS');
  const [page,setPage] = useState(0);
  const [revision,setRevision] = useState(0);
  const [result,setResult] = useState<InterventionPage | null>(null);
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    interventionsApi.list(page,'','','',code).then(data => {
      if (active) {setResult(data);setError('');}
    }).catch(e => {if (active) setError(interventionError(e));})
      .finally(() => {if (active) setLoading(false);});
    return () => {active = false;};
  },[code,page,revision]);
  const navigate = (value:number) => {setLoading(true);setPage(value);};
  return <Card title="Intervenciones del ejemplar" className="mt-6">
    <p className="mb-3 text-sm text-neutral-500">Actividades vinculadas expresamente a {code}, según los permisos de tu cuenta. Cada actividad aparece una vez aunque abarque varias ubicaciones.</p>
    {loading ? <LoadingSkeleton variant="card" /> : error ? <div role="alert">
      <p>{error}</p><Button variant="secondary" onClick={() => {setLoading(true);setRevision(value => value+1);}}>Reintentar historial</Button>
    </div> : result && <>
      {result.content.length === 0 ? <p>No hay intervenciones vinculadas a este ejemplar disponibles para tu cuenta.</p> : <>
        <ul aria-label="Historial de intervenciones" className="space-y-3">{result.content.map(work => <li key={work.id} className="space-y-2 rounded-md border border-neutral-200 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2"><Link className="font-semibold text-brand-600 underline" href={`/intervenciones/${work.id}`}>{work.code}</Link>
            <StatusBadge code={work.statusCode} label={statuses.items.find(status => status.code === work.statusCode)?.label ?? work.statusCode} /></div>
          <p className="text-sm">Fecha programada: {work.scheduledDate}</p>
          <p className="text-sm">Ubicaciones de la actividad: {work.completedLocationCount}/{work.locationCount} terminadas · {work.validatedLocationCount} aprobadas</p>
        </li>)}</ul>
        <nav aria-label="Páginas del historial de intervenciones" className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" disabled={page === 0} onClick={() => navigate(page-1)}>Anterior</Button>
          <span>Página {page+1} de {result.page.totalPages}</span>
          <Button variant="secondary" disabled={page+1 >= result.page.totalPages} onClick={() => navigate(page+1)}>Siguiente</Button>
        </nav>
      </>}
      <Link href={`/intervenciones?${new URLSearchParams({greenElementCode:code})}`} className="mt-4 inline-block py-2 text-brand-600 underline">Abrir listado filtrado por este ejemplar</Link>
    </>}
  </Card>;
}
