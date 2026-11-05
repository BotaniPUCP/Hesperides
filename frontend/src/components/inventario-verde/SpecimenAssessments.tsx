'use client';

import { useEffect, useState } from 'react';
import type { Assessment } from '@shared/types';
import { Badge, Button } from '@/components/ui';
import { catastroApi } from '@/lib/catastro-api';
import { useAuth } from '@/hooks/useAuth';
import { puedeRegistrar } from '@/components/catastro/permisos';
import { SpecimenAssessmentModal } from './SpecimenAssessmentModal';

export interface SpecimenAssessmentsProps {
  code: string;
}

const HALLAZGOS: [keyof Assessment, string][] = [
  ['hasDisease', 'enfermedades'],
  ['hasPests', 'plagas'],
  ['hasMechanicalDamage', 'daños mecánicos'],
  ['isLeaning', 'inclinación riesgosa'],
  ['hasDeadBranches', 'ramas secas'],
  ['hasCavitiesOrRot', 'cavidades o pudrición'],
  ['hasExposedRoots', 'raíces expuestas'],
  ['interferesWithInfrastructure', 'interfiere con infraestructura'],
];

/** «Sí» y «no» se dicen; lo que no se evaluó se calla para no confundirlo con «no». */
function resumen(a: Assessment): string {
  const si = HALLAZGOS.filter(([k]) => a[k] === true).map(([, t]) => t);
  const evaluadas = HALLAZGOS.filter(([k]) => a[k] !== null).length;
  if (evaluadas === 0) return 'Sin preguntas evaluadas';
  return si.length === 0 ? 'Sin problemas en lo evaluado' : `Con ${si.join(', ')}`;
}

const fecha = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', { dateStyle: 'medium' });

/** El historial de evaluaciones (SPEC-103 D-06): la primera es la vigente. */
export function SpecimenAssessments({ code }: SpecimenAssessmentsProps) {
  const { user } = useAuth();
  const canAssess = puedeRegistrar(user?.role.code);
  const [historial, setHistorial] = useState<Assessment[] | null>(null);
  const [fallo, setFallo] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let vigente = true;
    catastroApi
      .assessments(code)
      .then((h) => {
        if (vigente) {
          setHistorial(h);
        }
      })
      .catch(() => {
        if (vigente) {
          setFallo(true);
        }
      });
    return () => {
      vigente = false;
    };
  }, [code]);

  // La ficha vale sin el historial: si no carga, simplemente no se muestra.
  if (fallo || historial === null) return null;

  return (
    <div className="rounded-3xl border border-neutral-200/90 bg-neutral-0 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-neutral-100 gap-3">
        <div className="flex items-start sm:items-center gap-2.5 min-w-0">
          <span className="p-1.5 rounded-lg bg-neutral-100 text-neutral-600 shrink-0 mt-0.5 sm:mt-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-bold text-neutral-800 uppercase tracking-wider">
              Evaluaciones Fitosanitarias e Inspecciones
            </h2>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Historial cronológico de salud vegetal y manejo agronómico
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {historial.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 whitespace-nowrap">
              {historial.length} {historial.length === 1 ? 'registro' : 'registros'}
            </span>
          )}
          {canAssess && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setModalOpen(true)}
              leadingIcon={
                <svg className="w-3.5 h-3.5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Nueva evaluación
            </Button>
          )}
        </div>
      </div>

      {historial.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-200/90 bg-neutral-50/50 p-6 text-center flex flex-col items-center justify-center gap-3">
          <p className="text-xs text-neutral-500 max-w-md leading-relaxed">
            No se registran evaluaciones fitosanitarias previas para este ejemplar. Puedes registrar la primera inspección técnica de campo.
          </p>
          {canAssess && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setModalOpen(true)}
              leadingIcon={
                <svg className="w-3.5 h-3.5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              }
            >
              Registrar primera evaluación
            </Button>
          )}
        </div>
      ) : (
        <ol aria-label="Historial de evaluaciones" className="space-y-3">
          {historial.map((a, i) => {
            const isLatest = i === 0;
            const activos = HALLAZGOS.filter(([k]) => a[k] === true).map(([, t]) => t);
            const tieneProblemas = activos.length > 0;
            const borderAndBg = isLatest
              ? 'bg-neutral-50/70 border-neutral-200/80 hover:border-neutral-300'
              : 'bg-neutral-50/40 border-neutral-200/60 opacity-85 hover:opacity-100 hover:border-neutral-300';

            return (
              <li
                key={a.id}
                className={`rounded-2xl border p-4 text-sm transition-all ${borderAndBg}`}
              >
                {/* Cabecera de la evaluación */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 font-mono text-sm">
                      {fecha(a.date)}
                    </span>
                    {isLatest ? (
                      <Badge label="vigente" color="brand" />
                    ) : (
                      <Badge label="histórico" color="neutral" />
                    )}
                    {a.assessedBy && (
                      <span className="text-xs text-neutral-500 font-medium">
                        · {a.assessedBy}
                      </span>
                    )}
                  </div>

                  <Badge
                    label={tieneProblemas ? 'Hallazgos detectados' : 'En buen estado'}
                    color={tieneProblemas ? 'warning' : 'success'}
                    icon={
                      tieneProblemas ? (
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )
                    }
                  />
                </div>

                {/* Contenido de hallazgos */}
                <div className="mt-1">
                  {tieneProblemas ? (
                    <div>
                      <span className="sr-only">{resumen(a)}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {activos.map((h) => (
                          <span
                            key={h}
                            className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700 border border-neutral-200/60"
                          >
                            {h.charAt(0).toUpperCase() + h.slice(1)}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-neutral-700 text-xs font-medium">
                      {resumen(a)}
                    </p>
                  )}

                  {/* Bloque de manejo agronómico recomendado */}
                  {a.recommendedManagement && (
                    <div className="mt-3 p-3 rounded-xl bg-neutral-50/70 border border-neutral-200/90 text-xs text-neutral-800 flex items-start gap-2.5">
                      <span className="p-1.5 rounded-lg bg-neutral-100 border border-neutral-200/80 text-neutral-600 shrink-0" aria-hidden="true">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <span className="font-bold text-neutral-900">
                          Manejo recomendado:{' '}
                        </span>
                        <span className="text-neutral-700 leading-relaxed">
                          {a.recommendedManagement}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Observaciones adicionales */}
                  {a.observation && (
                    <p className="mt-2 text-xs text-neutral-600 italic pl-3 border-l-2 border-neutral-300">
                      «{a.observation}»
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {canAssess && (
        <SpecimenAssessmentModal
          specimenCode={code}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSuccess={(nuevas) => {
            setHistorial(nuevas);
                      }}
        />
      )}
    </div>
  );
}
