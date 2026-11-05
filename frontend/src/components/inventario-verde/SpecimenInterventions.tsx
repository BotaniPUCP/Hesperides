'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCatalog } from '@/hooks/useCatalog';
import { Button, LoadingSkeleton, StatusBadge } from '@/components/ui';
import { interventionsApi, interventionError, type InterventionOptions, type InterventionPage } from '@/lib/interventions-api';

export interface SpecimenInterventionsProps {
  code: string;
}

/** The public specimen remains accessible without requesting private work history. */
export function SpecimenInterventions({ code }: SpecimenInterventionsProps) {
  const { user, isLoading } = useAuth();
  if (isLoading || !user || !['ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO'].includes(user.role.code)) return null;
  // A session, role or specimen change must never display the previous reader's page.
  return (
    <AuthorizedHistory
      key={`${user.id}:${user.role.code}:${code}`}
      code={code}
    />
  );
}

function AuthorizedHistory({ code }: SpecimenInterventionsProps) {
  const statuses = useCatalog('INTERVENTION_STATUS');
  const [options, setOptions] = useState<InterventionOptions | null>(null);
  const [page, setPage] = useState(0);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<InterventionPage | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (typeof interventionsApi.options === 'function') {
      interventionsApi
        .options()
        .then((o) => {
          if (active) setOptions(o);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    interventionsApi
      .list(page, '', '', '', code)
      .then((data) => {
        if (active) {
          setResult(data);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(interventionError(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [code, page, revision]);

  const navigate = (value: number) => {
    setLoading(true);
    setPage(value);
  };

  const formatProgress = (work: InterventionPage['content'][number]) => {
    if (work.statusCode === 'PLANNED') {
      return work.locationCount > 1
        ? `Planificada · ${work.locationCount} sectores programados`
        : 'Pendiente de ejecución en campo';
    }
    if (work.statusCode === 'COMPLETED') {
      return work.locationCount > 1
        ? `Ejecutada · ${work.completedLocationCount} de ${work.locationCount} sectores atendidos (Pendiente de validación)`
        : 'Trabajo ejecutado · Pendiente de validación técnica';
    }
    if (work.statusCode === 'VALIDATED') {
      return work.locationCount > 1
        ? `Completada y validada en ${work.validatedLocationCount} de ${work.locationCount} sectores`
        : 'Trabajo completado y validado';
    }
    return `${work.completedLocationCount}/${work.locationCount} terminadas · ${work.validatedLocationCount} aprobadas`;
  };

  const getActivityTitle = (work: InterventionPage['content'][number]) => {
    const classItem = options?.catalogs.find((c) => c.typeCode === 'INTERVENTION_CLASS' && c.id === work.classItemId);
    const typeItem = work.typeItemId
      ? options?.catalogs.find((c) => c.typeCode === 'INTERVENTION_TYPE' && c.id === work.typeItemId)
      : null;
    if (classItem && typeItem) return `${classItem.label} · ${typeItem.label}`;
    if (classItem) return classItem.label;
    if (typeItem) return typeItem.label;
    return 'Labor agronómica';
  };


  const totalCount = result?.page.totalElements ?? 0;

  return (
    <div className="rounded-3xl border border-neutral-200/90 bg-neutral-0 p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-neutral-100 gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <span className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600 shrink-0 mt-0.5 sm:mt-0">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"
              />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider">
              Intervenciones del ejemplar
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Actividades vinculadas expresamente a <span className="font-mono font-medium text-neutral-700">{code}</span>, según los permisos de tu cuenta.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
          {!loading && !error && totalCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 whitespace-nowrap">
              {totalCount} {totalCount === 1 ? 'registro' : 'registros'}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton variant="card" />
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-action-danger/20 bg-action-danger/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-action-danger"
        >
          <p>{error}</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoading(true);
              setRevision((value) => value + 1);
            }}
          >
            Reintentar historial
          </Button>
        </div>
      ) : (
        result && (
          <>
            {result.content.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-neutral-200/90 bg-neutral-50/50 p-5 text-center flex flex-col items-center justify-center">
                <p className="text-xs text-neutral-500">
                  No hay intervenciones vinculadas a este ejemplar disponibles para tu cuenta.
                </p>
              </div>
            ) : (
              <>
                <ul aria-label="Historial de intervenciones" className="space-y-3">
                  {result.content.map((work) => (
                    <li
                      key={work.id}
                      className="group rounded-2xl border border-neutral-200/80 bg-neutral-50/50 p-4 text-sm transition-all hover:bg-neutral-50/90 hover:border-neutral-300 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Link
                            className="font-mono font-bold text-brand-700 hover:text-brand-800 hover:underline text-sm shrink-0"
                            href={`/intervenciones/${work.id}`}
                          >
                            {work.code}
                          </Link>
                          <span className="text-neutral-300 font-light select-none">·</span>
                          <span className="font-semibold text-neutral-900 text-sm truncate">
                            {getActivityTitle(work)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <StatusBadge
                            code={work.statusCode}
                            label={
                              statuses.items.find((status) => status.code === work.statusCode)?.label ??
                              work.statusCode
                            }
                          />
                          <Link
                            href={`/intervenciones/${work.id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-500 group-hover:text-brand-700 transition-colors"
                          >
                            <span>Detalle</span>
                            <svg className="w-3.5 h-3.5 text-neutral-400 group-hover:text-brand-700 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </Link>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-neutral-600 pt-2 border-t border-neutral-200/60">
                        <p>
                          <span className="font-medium text-neutral-500">Programada:</span>{' '}
                          <span className="font-mono text-neutral-800">{work.scheduledDate}</span>
                        </p>
                        <p>
                          <span className="font-medium text-neutral-500">Progreso:</span>{' '}
                          <span className="text-neutral-800 font-medium">{formatProgress(work)}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
                <nav
                  aria-label="Páginas del historial de intervenciones"
                  className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-600"
                >
                  <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => navigate(page - 1)}>
                    Anterior
                  </Button>
                  <span className="font-medium">
                    Página {page + 1} de {result.page.totalPages}
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page + 1 >= result.page.totalPages}
                    onClick={() => navigate(page + 1)}
                  >
                    Siguiente
                  </Button>
                </nav>
              </>
            )}
          </>
        )
      )}
    </div>
  );
}

