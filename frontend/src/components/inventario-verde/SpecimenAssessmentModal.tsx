'use client';

import { useState } from 'react';
import type { Assessment, AssessmentForm } from '@shared/types';
import { Button, Input, Modal } from '@/components/ui';
import { catastroApi } from '@/lib/catastro-api';
import { todayLocal } from '@/lib/local-date';
import { ConfirmSaveModal } from './ConfirmSaveModal';
import { mensajeDeApiError } from '@/lib/api-errors';

export interface SpecimenAssessmentModalProps {
  specimenCode: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedAssessments: Assessment[]) => void;
}

type SiNo = '' | 'si' | 'no';

interface PreguntaDef {
  key: keyof Omit<AssessmentForm, 'date' | 'recommendedManagement' | 'observation'>;
  label: string;
  category: 'fitosanitario' | 'estructural';
}

const PREGUNTAS: PreguntaDef[] = [
  { key: 'hasDisease', label: 'Enfermedades visibles', category: 'fitosanitario' },
  { key: 'hasPests', label: 'Presencia de plagas / insectos', category: 'fitosanitario' },
  { key: 'hasMechanicalDamage', label: 'Daños mecánicos o heridas', category: 'fitosanitario' },
  { key: 'isLeaning', label: 'Inclinación anormal o riesgosa', category: 'estructural' },
  { key: 'hasDeadBranches', label: 'Ramas secas o quebradizas', category: 'estructural' },
  { key: 'hasCavitiesOrRot', label: 'Cavidades o pudrición en tronco/ramas', category: 'estructural' },
  { key: 'hasExposedRoots', label: 'Raíces expuestas o estrangulantes', category: 'estructural' },
  { key: 'interferesWithInfrastructure', label: 'Interfiere con veredas, cables o infraestructura', category: 'estructural' },
];

const SUGERENCIAS_MANEJO = [
  'Sin intervención',
  'Poda sanitaria',
  'Poda de despeje',
  'Poda de formación',
  'Poda de ramas secas',
  'Tratamiento fitosanitario',
  'Evaluación de estabilidad',
  'Riego de recuperación',
];

export function SpecimenAssessmentModal({
  specimenCode,
  isOpen,
  onClose,
  onSuccess,
}: SpecimenAssessmentModalProps) {
  const hoy = todayLocal();

  const [date, setDate] = useState(hoy);
  const [respuestas, setRespuestas] = useState<Record<string, SiNo>>({});
  const [recommendedManagement, setRecommendedManagement] = useState('');
  const [observation, setObservation] = useState('');

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleRespuestaChange = (key: string, val: SiNo) => {
    setRespuestas((prev) => ({ ...prev, [key]: val }));
  };

  const toBooleanOrNull = (v?: SiNo): boolean | null => {
    if (v === 'si') return true;
    if (v === 'no') return false;
    return null;
  };

  function handleRequestSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!date) {
      setErrorMessage('La fecha de evaluación es obligatoria.');
      return;
    }

    if (date > hoy) {
      setErrorMessage('La fecha de evaluación no puede ser futura.');
      return;
    }

    // Validación superada: abrir diálogo modal de confirmación
    setShowConfirm(true);
  }

  async function executeSubmit() {
    setSaving(true);
    setErrorMessage(null);

    const payload: AssessmentForm = {
      date,
      hasDisease: toBooleanOrNull(respuestas.hasDisease),
      hasPests: toBooleanOrNull(respuestas.hasPests),
      hasMechanicalDamage: toBooleanOrNull(respuestas.hasMechanicalDamage),
      isLeaning: toBooleanOrNull(respuestas.isLeaning),
      hasDeadBranches: toBooleanOrNull(respuestas.hasDeadBranches),
      hasCavitiesOrRot: toBooleanOrNull(respuestas.hasCavitiesOrRot),
      hasExposedRoots: toBooleanOrNull(respuestas.hasExposedRoots),
      interferesWithInfrastructure: toBooleanOrNull(respuestas.interferesWithInfrastructure),
      recommendedManagement: recommendedManagement.trim() || null,
      observation: observation.trim() || null,
    };

    try {
      const updatedList = await catastroApi.assess(specimenCode, payload);
      setShowConfirm(false);
      // Reset form
      setRespuestas({});
      setRecommendedManagement('');
      setObservation('');
      setDate(hoy);
      onSuccess(updatedList);
      onClose();
    } catch (err: unknown) {
      setShowConfirm(false);
      const msg = mensajeDeApiError(err);
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  }

  const fitosanitarias = PREGUNTAS.filter((p) => p.category === 'fitosanitario');
  const estructurales = PREGUNTAS.filter((p) => p.category === 'estructural');
  const incidenciasDetectadas = PREGUNTAS.filter((p) => respuestas[p.key] === 'si');

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Registrar evaluación fitosanitaria e inspección"
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-3">
            {errorMessage ? (
              <p className="text-xs text-action-danger font-medium">{errorMessage}</p>
            ) : (
              <span className="text-xs text-neutral-500">
                Esta evaluación quedará registrada como la vigente para este ejemplar.
              </span>
            )}
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={onClose} disabled={saving} type="button">
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={() => handleRequestSubmit()}
                disabled={saving}
                loading={saving}
                type="button"
              >
                Guardar evaluación
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleRequestSubmit} className="space-y-5 py-1">
          {/* Contexto del ejemplar y fecha */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200/80">
            <div>
              <span className="text-xs text-neutral-500 font-medium">Ejemplar en evaluación</span>
              <p className="text-sm font-bold font-mono text-neutral-900">{specimenCode}</p>
            </div>

            <div className="w-full sm:w-auto">
              <label htmlFor="eval-date" className="block text-xs font-semibold text-neutral-700 mb-1">
                Fecha de la inspección *
              </label>
              <input
                id="eval-date"
                type="date"
                max={hoy}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-44 rounded-xl border border-neutral-200 px-3 py-1.5 text-sm bg-neutral-0 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-forest-600"
              />
            </div>
          </div>

          {/* Sección 1: Fitosanitario */}
          <div className="space-y-2.5">
            <div className="pb-1 border-b border-neutral-200/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-forest-700">
                1. Estado Fitosanitario
              </h3>
            </div>
            <div className="divide-y divide-neutral-100">
              {fitosanitarias.map((p) => (
                <fieldset
                  key={p.key}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <legend className="float-left text-xs font-medium text-neutral-800">{p.label}</legend>
                  <div className="flex gap-4 text-xs font-medium">
                    <label className="flex items-center gap-1.5 text-neutral-600 cursor-pointer">
                      <input
                        type="radio"
                        name={`eval-${p.key}`}
                        checked={!respuestas[p.key]}
                        onChange={() => handleRespuestaChange(p.key, '')}
                        className="text-forest-600 focus:ring-forest-500"
                      />
                      Sin evaluar
                    </label>
                    <label className="flex items-center gap-1.5 text-emerald-700 cursor-pointer">
                      <input
                        type="radio"
                        name={`eval-${p.key}`}
                        checked={respuestas[p.key] === 'no'}
                        onChange={() => handleRespuestaChange(p.key, 'no')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      No
                    </label>
                    <label className="flex items-center gap-1.5 text-amber-700 cursor-pointer">
                      <input
                        type="radio"
                        name={`eval-${p.key}`}
                        checked={respuestas[p.key] === 'si'}
                        onChange={() => handleRespuestaChange(p.key, 'si')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      Sí (detectado)
                    </label>
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          {/* Sección 2: Estructural y Riesgo */}
          <div className="space-y-2.5">
            <div className="pb-1 border-b border-neutral-200/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-forest-700">
                2. Estado Estructural y Entorno
              </h3>
            </div>
            <div className="divide-y divide-neutral-100">
              {estructurales.map((p) => (
                <fieldset
                  key={p.key}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <legend className="float-left text-xs font-medium text-neutral-800">{p.label}</legend>
                  <div className="flex gap-4 text-xs font-medium">
                    <label className="flex items-center gap-1.5 text-neutral-600 cursor-pointer">
                      <input
                        type="radio"
                        name={`eval-${p.key}`}
                        checked={!respuestas[p.key]}
                        onChange={() => handleRespuestaChange(p.key, '')}
                        className="text-forest-600 focus:ring-forest-500"
                      />
                      Sin evaluar
                    </label>
                    <label className="flex items-center gap-1.5 text-emerald-700 cursor-pointer">
                      <input
                        type="radio"
                        name={`eval-${p.key}`}
                        checked={respuestas[p.key] === 'no'}
                        onChange={() => handleRespuestaChange(p.key, 'no')}
                        className="text-emerald-600 focus:ring-emerald-500"
                      />
                      No
                    </label>
                    <label className="flex items-center gap-1.5 text-amber-700 cursor-pointer">
                      <input
                        type="radio"
                        name={`eval-${p.key}`}
                        checked={respuestas[p.key] === 'si'}
                        onChange={() => handleRespuestaChange(p.key, 'si')}
                        className="text-amber-600 focus:ring-amber-500"
                      />
                      Sí (detectado)
                    </label>
                  </div>
                </fieldset>
              ))}
            </div>
          </div>

          {/* Sección 3: Manejo Agronómico y Observación */}
          <div className="space-y-3 pt-1">
            <div className="pb-1 border-b border-neutral-200/80">
              <h3 className="text-xs font-bold uppercase tracking-wider text-forest-700">
                3. Recomendación y Observaciones
              </h3>
            </div>

            <div className="space-y-1">
              <Input
                id="eval-recommended-mgmt"
                label="Manejo agronómico recomendado"
                value={recommendedManagement}
                maxLength={200}
                onChange={setRecommendedManagement}
                list="sugerencias-manejo-modal"
                placeholder="Ej. Poda sanitaria, Tratamiento fitosanitario..."
              />
              <datalist id="sugerencias-manejo-modal">
                {SUGERENCIAS_MANEJO.map((opcion) => (
                  <option key={opcion} value={opcion} />
                ))}
              </datalist>
            </div>

            <div className="space-y-1">
              <label htmlFor="eval-observation" className="block text-xs font-medium text-neutral-700">
                Observaciones de campo (opcional)
              </label>
              <textarea
                id="eval-observation"
                rows={2}
                maxLength={2000}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Detalles sobre afecciones específicas, severidad o ubicación de daños..."
                className="w-full rounded-xl border border-neutral-200/90 p-3 text-sm bg-neutral-0 text-neutral-900 focus:outline-hidden focus:ring-2 focus:ring-forest-600"
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* Pop-up modal de confirmación antes de asentar la evaluación */}
      <ConfirmSaveModal
        isOpen={showConfirm}
        title="Confirmar evaluación fitosanitaria"
        specimenCode={specimenCode}
        subtitle="Evaluación técnica e inspección sanitaria"
        confirmLabel="Confirmar y registrar"
        cancelLabel="Revisar evaluación"
        isWorking={saving}
        onConfirm={() => void executeSubmit()}
        onCancel={() => setShowConfirm(false)}
      >
        <p className="leading-relaxed text-neutral-700">
          ¿Confirmas registrar esta evaluación para el ejemplar{' '}
          <strong className="text-neutral-900 font-semibold">{specimenCode}</strong>? Quedará
          registrada como la evaluación técnica vigente con fecha{' '}
          <span className="font-semibold text-neutral-900">{date}</span>.
        </p>

        {/* Resumen del diagnóstico usando tokens temáticos nativos */}
        <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2 text-[11px]">
          <div>
            <span className="text-neutral-600 font-medium font-sans">Estado del diagnóstico:</span>
            {incidenciasDetectadas.length > 0 ? (
              <div className="mt-1">
                <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-400">
                  <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{incidenciasDetectadas.length} {incidenciasDetectadas.length === 1 ? 'anomalía reportada' : 'anomalías reportadas'}:</span>
                </span>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-neutral-700 font-sans pl-1">
                  {incidenciasDetectadas.map((item) => (
                    <li key={item.key} className="truncate">{item.label}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-1 text-brand-700 font-medium flex items-center gap-1 font-sans">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>Sin anomalías fitosanitarias ni estructurales reportadas.</span>
              </p>
            )}
          </div>

          {recommendedManagement && (
            <div className="pt-2 border-t border-neutral-200">
              <span className="text-neutral-600 font-sans">Manejo sugerido:</span>{' '}
              <span className="font-semibold text-neutral-900 font-sans">
                {recommendedManagement}
              </span>
            </div>
          )}
        </div>
      </ConfirmSaveModal>
    </>
  );
}
