'use client';

import React, { useEffect, useMemo, useState } from 'react';
import type {
  CreateMaintenanceFrequencyRequest,
  FrequencyRuleTypeCode,
  MaintenanceFrequency,
  MaintenanceRegime,
  MaintenanceScope,
  UpdateMaintenanceFrequencyRequest,
} from '@shared/types';
import { Button, Input, Modal } from '@/components/ui';

interface ActivityOption {
  id: number;
  code: string;
  label: string;
  parentCode?: string | null;
}

interface RuleTypeOption {
  id: number;
  code: string;
  label: string;
}

type SeasonKey = 'VERANO' | 'OTONO' | 'INVIERNO' | 'PRIMAVERA';

interface SeasonRow {
  id: string;
  seasonKey: SeasonKey;
  minDays: string;
  maxDays: string;
  targetDays: string;
}

const SEASON_LABELS: Record<SeasonKey, { label: string; desc: string }> = {
  VERANO: { label: 'Verano', desc: 'Mayor radiación / crecimiento acelerado' },
  OTONO: { label: 'Otoño', desc: 'Transición / crecimiento moderado' },
  INVIERNO: { label: 'Invierno', desc: 'Menor radiación / crecimiento lento' },
  PRIMAVERA: { label: 'Primavera', desc: 'Rebrote y floración activa' },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  frequencyToEdit?: MaintenanceFrequency | null;
  activities: ActivityOption[];
  ruleTypes: RuleTypeOption[];
  onSubmit: (payload: CreateMaintenanceFrequencyRequest | UpdateMaintenanceFrequencyRequest) => Promise<void>;
}

export function FrequencyFormModal({
  isOpen,
  onClose,
  frequencyToEdit,
  activities,
  ruleTypes,
  onSubmit,
}: Props) {
  const [activityTypeItemId, setActivityTypeItemId] = useState<number>(0);
  const [regime, setRegime] = useState<MaintenanceRegime>('OUTSOURCED');
  const [ruleTypeCode, setRuleTypeCode] = useState<FrequencyRuleTypeCode>('INTERVAL_DAYS');
  const [scope, setScope] = useState<MaintenanceScope>('CAMPUS_WIDE');

  // Estados para Intervalo por Días con soporte multi-estación
  const [hasSeasonalVariation, setHasSeasonalVariation] = useState<boolean>(true);
  const [seasons, setSeasons] = useState<SeasonRow[]>([
    { id: '1', seasonKey: 'VERANO', minDays: '30', maxDays: '35', targetDays: '21' },
  ]);
  const [flatMinDays, setFlatMinDays] = useState<string>('30');
  const [flatMaxDays, setFlatMaxDays] = useState<string>('30');
  const [flatTargetDays, setFlatTargetDays] = useState<string>('21');

  // Estados para Estacional / Cuota
  const [seasonalPreset, setSeasonalPreset] = useState<string>('4_PER_SEASON');
  const [annualCount, setAnnualCount] = useState<string>('4');
  const [seasonalSeasonDesc, setSeasonalSeasonDesc] = useState<string>('1 por estación (Verano, Otoño, Invierno, Primavera)');
  const [allowsExtraPlagueRounds, setAllowsExtraPlagueRounds] = useState<boolean>(true);

  // Estados para Ventana Anual
  const [annualWindowPreset, setAnnualWindowPreset] = useState<string>('DEC_JAN');

  // Estados para Ciclo de Cobertura
  const [coverageDays, setCoverageDays] = useState<string>('15');
  const [coverageShift, setCoverageShift] = useState<string>('6:30 a 11:30 (Mañana - disponible para estudiantes)');

  // Campos comunes
  const [estimatedDuration, setEstimatedDuration] = useState<string>('3');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groupedActivities = useMemo(() => {
    const groups: Record<string, ActivityOption[]> = {};
    for (const act of activities) {
      const groupName = act.parentCode || 'Otras actividades';
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(act);
    }
    return groups;
  }, [activities]);

  useEffect(() => {
    if (frequencyToEdit) {
      setActivityTypeItemId(frequencyToEdit.activityType.id);
      setRegime(frequencyToEdit.regime);
      setRuleTypeCode(frequencyToEdit.frequencyRuleType.code);
      setScope(frequencyToEdit.scope);

      if (frequencyToEdit.frequencyRuleType.code === 'INTERVAL_DAYS') {
        const min = frequencyToEdit.minDaysInterval ?? 30;
        const max = frequencyToEdit.maxDaysInterval ?? 45;
        const target = frequencyToEdit.targetDaysInterval ? String(frequencyToEdit.targetDaysInterval) : '21';
        if (min !== max) {
          setHasSeasonalVariation(true);
          setSeasons([
            { id: '1', seasonKey: 'VERANO', minDays: String(min), maxDays: String(min), targetDays: target },
            { id: '2', seasonKey: 'INVIERNO', minDays: String(max), maxDays: String(max), targetDays: target },
          ]);
        } else {
          setHasSeasonalVariation(false);
          setFlatMinDays(String(min));
          setFlatMaxDays(String(max));
          setFlatTargetDays(target);
        }
      }

      const ac = frequencyToEdit.annualTargetCount ? String(frequencyToEdit.annualTargetCount) : '4';
      setAnnualCount(ac);
      if (ac === '4') {
        setSeasonalPreset('4_PER_SEASON');
        setSeasonalSeasonDesc('1 por estación (Verano, Otoño, Invierno, Primavera)');
      } else if (ac === '2') {
        setSeasonalPreset('2_PER_YEAR');
        setSeasonalSeasonDesc('Semestral (2 aplicaciones al año)');
      } else {
        setSeasonalPreset('CUSTOM');
        setSeasonalSeasonDesc('Cuota personalizada');
      }
      setCoverageDays(frequencyToEdit.coverageTargetDays ? String(frequencyToEdit.coverageTargetDays) : '15');
      setEstimatedDuration(frequencyToEdit.estimatedDurationDays ? String(frequencyToEdit.estimatedDurationDays) : '3');
      setNotes(frequencyToEdit.notes || '');
    } else {
      setActivityTypeItemId(activities.length > 0 ? activities[0].id : 0);
      setRegime('OUTSOURCED');
      setRuleTypeCode('INTERVAL_DAYS');
      setScope('CAMPUS_WIDE');
      setHasSeasonalVariation(true);
      setSeasons([
        { id: '1', seasonKey: 'VERANO', minDays: '30', maxDays: '35', targetDays: '21' },
      ]);
      setFlatMinDays('30');
      setFlatMaxDays('30');
      setFlatTargetDays('21');
      setAnnualCount('4');
      setSeasonalPreset('4_PER_SEASON');
      setSeasonalSeasonDesc('1 por estación (Verano, Otoño, Invierno, Primavera)');
      setAllowsExtraPlagueRounds(true);
      setAnnualWindowPreset('DEC_JAN');
      setCoverageDays('15');
      setCoverageShift('6:30 a 11:30 (Mañana - disponible para estudiantes)');
      setEstimatedDuration('3');
      setNotes('');
    }
    setError(null);
  }, [frequencyToEdit, isOpen, activities]);

  const handleAddSeason = () => {
    const availableKeys: SeasonKey[] = ['VERANO', 'OTONO', 'INVIERNO', 'PRIMAVERA'];
    const usedKeys = seasons.map((s) => s.seasonKey);
    const nextKey = availableKeys.find((k) => !usedKeys.includes(k)) || 'PRIMAVERA';

    setSeasons([
      ...seasons,
      {
        id: String(Date.now()),
        seasonKey: nextKey,
        minDays: '30',
        maxDays: '40',
        targetDays: '21',
      },
    ]);
  };

  const handleRemoveSeason = (id: string) => {
    if (seasons.length <= 1) {
      setError('Debes configurar al menos una estación o cambiar a intervalo fijo');
      return;
    }
    setSeasons(seasons.filter((s) => s.id !== id));
  };

  const handleUpdateSeason = (id: string, field: keyof SeasonRow, value: string) => {
    setSeasons(
      seasons.map((s) => {
        if (s.id === id) {
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!frequencyToEdit && (!activityTypeItemId || activityTypeItemId === 0)) {
      setError('Debes seleccionar un tipo de actividad');
      return;
    }

    let minDaysVal: number | null = null;
    let maxDaysVal: number | null = null;
    let targetDaysVal: number | null = null;
    let annualCountVal: number | null = null;
    let seasonModifierVal: string | null = null;
    let coverageDaysVal: number | null = null;

    if (ruleTypeCode === 'INTERVAL_DAYS') {
      if (hasSeasonalVariation) {
        if (seasons.length === 0) {
          setError('Debes agregar al menos una estación');
          return;
        }

        const mins: number[] = [];
        const maxs: number[] = [];
        const descs: string[] = [];

        for (const s of seasons) {
          const min = parseInt(s.minDays, 10);
          const max = parseInt(s.maxDays, 10);
          if (isNaN(min) || isNaN(max)) {
            setError(`Indica días válidos para ${SEASON_LABELS[s.seasonKey].label}`);
            return;
          }
          if (min > max) {
            setError(`En ${SEASON_LABELS[s.seasonKey].label}, el mínimo (${min}) no puede ser mayor que el máximo (${max})`);
            return;
          }
          mins.push(min);
          maxs.push(max);

          const targetTxt = s.targetDays ? ` (teór. ${s.targetDays}d)` : '';
          descs.push(`${SEASON_LABELS[s.seasonKey].label}: ${min}-${max}d${targetTxt}`);
        }

        minDaysVal = Math.min(...mins);
        maxDaysVal = Math.max(...maxs);
        targetDaysVal = seasons[0].targetDays ? parseInt(seasons[0].targetDays, 10) : null;
        seasonModifierVal = descs.join(' · ');
      } else {
        const min = parseInt(flatMinDays, 10);
        const max = parseInt(flatMaxDays, 10);
        if (isNaN(min) || isNaN(max)) {
          setError('Indica los días mínimos y máximos');
          return;
        }
        if (min > max) {
          setError('El mínimo no puede ser mayor que el máximo');
          return;
        }
        minDaysVal = min;
        maxDaysVal = max;
        targetDaysVal = flatTargetDays ? parseInt(flatTargetDays, 10) : null;
        seasonModifierVal = 'Uniforme todo el año';
      }
    } else if (ruleTypeCode === 'SEASONAL_PERIOD') {
      const count = parseInt(annualCount, 10);
      if (isNaN(count) || count <= 0) {
        setError('Indica una cuota anual mayor a 0');
        return;
      }
      annualCountVal = count;
      seasonModifierVal = `${seasonalSeasonDesc}${allowsExtraPlagueRounds ? ' (+ Refuerzos según plagas)' : ''}`;
    } else if (ruleTypeCode === 'ANNUAL_WINDOW') {
      annualCountVal = 1;
      if (annualWindowPreset === 'DEC_JAN') {
        seasonModifierVal = 'Diciembre - Enero (Cierre de campus / Receso)';
      } else if (annualWindowPreset === 'JUL_AUG') {
        seasonModifierVal = 'Julio - Agosto (Receso de medio año)';
      } else {
        seasonModifierVal = 'Una vez al año en fecha programada';
      }
    } else if (ruleTypeCode === 'COVERAGE_CYCLE') {
      const cov = parseInt(coverageDays, 10);
      if (isNaN(cov) || cov <= 0) {
        setError('Indica los días para completar la cobertura');
        return;
      }
      coverageDaysVal = cov;
      seasonModifierVal = `Ventana horaria: ${coverageShift}`;
    } else if (ruleTypeCode === 'ON_DEMAND') {
      seasonModifierVal = 'A demanda por riesgo o solicitud externa';
    }

    setLoading(true);
    try {
      const payload: CreateMaintenanceFrequencyRequest = {
        activityTypeItemId: frequencyToEdit ? frequencyToEdit.activityType.id : activityTypeItemId,
        regime,
        frequencyRuleTypeCode: ruleTypeCode,
        scope,
        targetDaysInterval: targetDaysVal,
        minDaysInterval: minDaysVal,
        maxDaysInterval: maxDaysVal,
        annualTargetCount: annualCountVal,
        seasonModifier: seasonModifierVal,
        coverageTargetDays: coverageDaysVal,
        estimatedDurationDays: estimatedDuration ? parseInt(estimatedDuration, 10) : null,
        notes: notes || null,
      };

      if (frequencyToEdit) {
        await onSubmit(payload as UpdateMaintenanceFrequencyRequest);
      } else {
        await onSubmit(payload);
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Error al guardar la frecuencia');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={frequencyToEdit ? 'Editar frecuencia de mantenimiento' : 'Nueva frecuencia de mantenimiento'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700 border border-rose-200">
            {error}
          </div>
        )}

        {!frequencyToEdit ? (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Actividad / Intervención *
            </label>
            <select
              value={activityTypeItemId}
              onChange={(e) => setActivityTypeItemId(Number(e.target.value))}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {activities.length === 0 ? (
                <option value={0}>Cargando actividades...</option>
              ) : (
                <>
                  <option value={0}>-- Selecciona una actividad --</option>
                  {Object.keys(groupedActivities).length > 1 ? (
                    Object.entries(groupedActivities).map(([group, items]) => (
                      <optgroup key={group} label={group}>
                        {items.map((act) => (
                          <option key={act.id} value={act.id}>
                            {act.label}
                          </option>
                        ))}
                      </optgroup>
                    ))
                  ) : (
                    activities.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.label}
                      </option>
                    ))
                  )}
                </>
              )}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Actividad</label>
            <p className="text-sm font-semibold text-neutral-900 bg-neutral-100 p-2 rounded">
              {frequencyToEdit.activityType.label}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Modalidad de ejecución *</label>
            <select
              value={regime}
              onChange={(e) => setRegime(e.target.value as MaintenanceRegime)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="OUTSOURCED">Servicio Tercerizado (Contratista)</option>
              <option value="IN_HOUSE">Personal Propio PUCP (Estable)</option>
            </select>
            <p className="text-xs text-neutral-500 mt-1">
              Define si la labor la ejecuta una empresa contratista o la cuadrilla propia de la PUCP.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Tipo de Comportamiento / Regla *</label>
            <select
              value={ruleTypeCode}
              onChange={(e) => setRuleTypeCode(e.target.value as FrequencyRuleTypeCode)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="INTERVAL_DAYS">Intervalo por días (Ej. Césped cada 30-45d)</option>
              <option value="SEASONAL_PERIOD">Periodicidad estacional (Ej. Fitosanitario 4/año)</option>
              <option value="ANNUAL_WINDOW">Ventana anual (Ej. Poda mayor dic-ene)</option>
              <option value="COVERAGE_CYCLE">Ciclo rotativo de cobertura (Ej. Riego 15d)</option>
              <option value="ON_DEMAND">A demanda (Sin frecuencia fija / por riesgo)</option>
            </select>
          </div>
        </div>

        {/* 1. SECCIÓN GUIADA: INTERVALO POR DÍAS CON MULTI-ESTACIÓN DINÁMICA */}
        {ruleTypeCode === 'INTERVAL_DAYS' && (
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200 pb-2">
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
                Configuración de Intervalos por Estación
              </span>
              <div className="flex items-center space-x-3 text-xs font-medium text-emerald-800">
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="intervalMode"
                    checked={hasSeasonalVariation}
                    onChange={() => setHasSeasonalVariation(true)}
                    className="text-emerald-600 focus:ring-emerald-500 mr-1"
                  />
                  Por estaciones (Verano, Otoño, Invierno, Primavera)
                </label>
                <label className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="intervalMode"
                    checked={!hasSeasonalVariation}
                    onChange={() => setHasSeasonalVariation(false)}
                    className="text-emerald-600 focus:ring-emerald-500 mr-1"
                  />
                  Todo el año uniforme
                </label>
              </div>
            </div>

            {hasSeasonalVariation ? (
              <div className="space-y-3">
                <p className="text-xs text-emerald-700">
                  Define las estaciones que tienen diferente ritmo de crecimiento. Puedes agregar o quitar estaciones:
                </p>

                {seasons.map((row, index) => (
                  <div
                    key={row.id}
                    className="bg-white p-3 rounded-lg border border-emerald-200 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="w-full sm:w-1/3">
                      <label className="block text-xs font-semibold text-neutral-700 mb-1">
                        Estación #{index + 1}
                      </label>
                      <select
                        value={row.seasonKey}
                        onChange={(e) => handleUpdateSeason(row.id, 'seasonKey', e.target.value as SeasonKey)}
                        className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:border-emerald-500 focus:outline-none"
                      >
                        <option value="VERANO">☀️ Verano (Ene - Mar)</option>
                        <option value="OTONO">🍂 Otoño (Abr - Jun)</option>
                        <option value="INVIERNO">❄️ Invierno (Jul - Set)</option>
                        <option value="PRIMAVERA">🌸 Primavera (Oct - Dic)</option>
                      </select>
                      <span className="text-[10px] text-neutral-400 block mt-0.5">
                        {SEASON_LABELS[row.seasonKey].desc}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                          Mín. (días) *
                        </label>
                        <input
                          type="number"
                          value={row.minDays}
                          onChange={(e) => handleUpdateSeason(row.id, 'minDays', e.target.value)}
                          placeholder="Ej. 30"
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                          Máx. (días) *
                        </label>
                        <input
                          type="number"
                          value={row.maxDays}
                          onChange={(e) => handleUpdateSeason(row.id, 'maxDays', e.target.value)}
                          placeholder="Ej. 45"
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-neutral-600 mb-1">
                          Teórico
                        </label>
                        <input
                          type="number"
                          value={row.targetDays}
                          onChange={(e) => handleUpdateSeason(row.id, 'targetDays', e.target.value)}
                          placeholder="Ej. 21"
                          className="w-full rounded border border-neutral-300 px-2 py-1 text-xs focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {seasons.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSeason(row.id)}
                        className="text-xs text-rose-600 hover:text-rose-800 p-1 self-end sm:self-center font-medium"
                        title="Eliminar esta estación"
                      >
                        ✕ Quitar
                      </button>
                    )}
                  </div>
                ))}

                {seasons.length < 4 && (
                  <button
                    type="button"
                    onClick={handleAddSeason}
                    className="inline-flex items-center text-xs font-semibold text-emerald-800 hover:text-emerald-950 bg-emerald-100/80 hover:bg-emerald-200/80 px-3 py-1.5 rounded-md border border-emerald-300 transition-colors"
                  >
                    + Agregar otra estación (Otoño, Primavera...)
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  id="flatMinDays"
                  label="Intervalo Mínimo (días) *"
                  type="number"
                  value={flatMinDays}
                  onChange={setFlatMinDays}
                  placeholder="Ej. 30"
                  required
                />
                <Input
                  id="flatMaxDays"
                  label="Intervalo Máximo (días) *"
                  type="number"
                  value={flatMaxDays}
                  onChange={setFlatMaxDays}
                  placeholder="Ej. 30"
                  required
                />
                <Input
                  id="flatTargetDays"
                  label="Referencia teórica"
                  type="number"
                  value={flatTargetDays}
                  onChange={setFlatTargetDays}
                  placeholder="Ej. 21"
                />
              </div>
            )}
            <p className="text-xs text-emerald-700">
              💡 El intervalo teórico es la frecuencia meta pactada; el mínimo y máximo fijan los límites tolerables antes de considerar la tarea atrasada.
            </p>
          </div>
        )}

        {/* 2. SECCIÓN GUIADA: ESTACIONAL / CUOTA ANUAL */}
        {ruleTypeCode === 'SEASONAL_PERIOD' && (
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200/80 space-y-4">
            <span className="text-xs font-bold text-blue-900 uppercase tracking-wide block">
              Periodicidad Estacional y Cuotas
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Distribución temporal de las atenciones *
                </label>
                <select
                  value={seasonalPreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSeasonalPreset(val);
                    if (val === '4_PER_SEASON') {
                      setAnnualCount('4');
                      setSeasonalSeasonDesc('1 por estación (Verano, Otoño, Invierno, Primavera)');
                    } else if (val === '2_PER_YEAR') {
                      setAnnualCount('2');
                      setSeasonalSeasonDesc('Semestral (2 aplicaciones al año)');
                    } else {
                      setSeasonalSeasonDesc('Cuota personalizada');
                    }
                  }}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="4_PER_SEASON">1 por estación (4 aplicaciones al año: Verano, Otoño, Invierno, Primavera)</option>
                  <option value="2_PER_YEAR">Semestral (2 aplicaciones al año)</option>
                  <option value="CUSTOM">Cuota personalizada</option>
                </select>
              </div>

              {seasonalPreset === 'CUSTOM' ? (
                <Input
                  id="annualCount"
                  label="Mínimo de atenciones al año *"
                  type="number"
                  value={annualCount}
                  onChange={setAnnualCount}
                  placeholder="Ej. 6"
                  required
                />
              ) : (
                <div className="bg-white/80 p-2.5 rounded-md border border-blue-200 text-xs text-blue-900">
                  <span className="font-semibold block text-sm">
                    {seasonalPreset === '4_PER_SEASON' ? '4 atenciones mínimas al año' : '2 atenciones mínimas al año'}
                  </span>
                  <span className="text-neutral-500 text-[11px] block mt-0.5">
                    {seasonalPreset === '4_PER_SEASON'
                      ? 'Calculado automáticamente: 1 atención por cada estación del año.'
                      : 'Calculado automáticamente: 1 atención por cada semestre.'}
                  </span>
                </div>
              )}
            </div>

            <label className="inline-flex items-center text-xs font-medium text-blue-800 cursor-pointer">
              <input
                type="checkbox"
                checked={allowsExtraPlagueRounds}
                onChange={(e) => setAllowsExtraPlagueRounds(e.target.checked)}
                className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 mr-1.5"
              />
              Permite refuerzos adicionales en ejemplares vulnerables o si el clima reactiva plagas
            </label>
          </div>
        )}

        {/* 3. SECCIÓN GUIADA: VENTANA ANUAL ESPECÍFICA */}
        {ruleTypeCode === 'ANNUAL_WINDOW' && (
          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200/80 space-y-4">
            <span className="text-xs font-bold text-amber-900 uppercase tracking-wide block">
              Ventana de Ejecución Anual
            </span>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Época o Meses en que se realiza la intervención:
              </label>
              <select
                value={annualWindowPreset}
                onChange={(e) => setAnnualWindowPreset(e.target.value)}
                className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="DEC_JAN">Diciembre - Enero (Durante cierre del campus / Vacaciones)</option>
                <option value="JUL_AUG">Julio - Agosto (Receso de medio año)</option>
                <option value="ANY">Cualquier mes del año (según programación)</option>
              </select>
            </div>
            <p className="text-xs text-amber-700">
              💡 Para la gran poda anual programada, el cliente atiende entre 200 y 230 árboles de gran envergadura durante el cierre de campus.
            </p>
          </div>
        )}

        {/* 4. SECCIÓN GUIADA: CICLO DE COBERTURA (RIEGO) */}
        {ruleTypeCode === 'COVERAGE_CYCLE' && (
          <div className="bg-cyan-50/60 p-4 rounded-xl border border-cyan-200/80 space-y-4">
            <span className="text-xs font-bold text-cyan-900 uppercase tracking-wide block">
              Ciclo Rotativo de Cobertura
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                id="coverageDays"
                label="Días para cubrir el 100% del campus/sector *"
                type="number"
                value={coverageDays}
                onChange={setCoverageDays}
                placeholder="Ej. 15 ó 16"
                required
              />
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Ventana Horaria de Riego</label>
                <select
                  value={coverageShift}
                  onChange={(e) => setCoverageShift(e.target.value)}
                  className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="6:30 a 11:30 (Mañana - libre al mediodía para estudiantes)">
                    6:30 a 11:30 (Mañana - libre para estudiantes)
                  </option>
                  <option value="Jornada completa">Jornada completa</option>
                  <option value="Nocturno (Automatizado futuro)">Nocturno (Riego automatizado futuro)</option>
                </select>
              </div>
            </div>
            <p className="text-xs text-cyan-700">
              💡 Riego del campus: 3 sectores rotativos con solapamiento los jueves, viernes y sábados para completar las 15.6 ha cada 15-16 días.
            </p>
          </div>
        )}

        {/* 5. SECCIÓN GUIADA: A DEMANDA / SIN PERIODICIDAD FIJA */}
        {ruleTypeCode === 'ON_DEMAND' && (
          <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200 space-y-2">
            <span className="text-xs font-bold text-neutral-800 uppercase tracking-wide block">
              Labor a Demanda / Eventual
            </span>
            <p className="text-xs text-neutral-600">
              Esta labor no tiene una periodicidad fija programada en el calendario. Se programa y ejecuta únicamente cuando la operación lo requiere: por solicitud de emergencia, evaluaciones de riesgo o detección puntual de plagas.
            </p>
          </div>
        )}

        {/* 5. CAMPOS ADICIONALES COMUNES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="estimatedDuration"
            label="Días de duración de la actividad"
            type="number"
            value={estimatedDuration}
            onChange={setEstimatedDuration}
            placeholder="Ej. 3 ó 4 días"
          />

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">Ámbito territorial</label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as MaintenanceScope)}
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="CAMPUS_WIDE">Todo el Campus (15.6 ha)</option>
              <option value="BY_SECTOR">Por Sector de Mantenimiento</option>
              <option value="BY_ZONE">Por Jardín / Lugar específico</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Notas operativas o restricciones
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Ej. Requiere prevencionista de seguridad y grúa / No regar después de las 11:30..."
            className="w-full rounded-md border border-neutral-300 p-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-neutral-200">
          <Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Guardando...' : frequencyToEdit ? 'Actualizar' : 'Guardar frecuencia'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
