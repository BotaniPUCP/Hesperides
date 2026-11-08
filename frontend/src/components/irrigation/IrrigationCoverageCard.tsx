'use client';

import { useEffect, useMemo, useState } from 'react';
import type { IrrigationCoverage } from '@shared/types/irrigation';
import { Button, Card, LoadingSkeleton } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { irrigationApi } from '@/lib/irrigation-api';
import { IrrigationCoverageMap } from './IrrigationCoverageMap';

const AMBER = '#d97706';
const RED = '#dc2626';
const amount = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 });

function sectionColor(days: number | null, limit: number | null): string | null {
  if (days == null || limit == null || days < limit) return null;
  return days === limit ? AMBER : RED;
}

export function IrrigationCoverageCard({ refreshToken }: { refreshToken: number }) {
  const [data, setData] = useState<IrrigationCoverage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    let live = true;
    irrigationApi.coverage().then((coverage) => {
      if (!live) return;
      setData(coverage);
      setError(null);
    }).catch((failure: unknown) => {
      if (!live) return;
      setData(null);
      setError(mensajeDeApiError(failure));
    });
    return () => { live = false; };
  }, [refreshToken, retry]);

  const colors = useMemo(() => {
    const result = new Map<string, string>();
    for (const section of data?.sections ?? []) {
      const color = sectionColor(section.daysWithoutIrrigation, data?.maxDaysWithoutIrrigation ?? null);
      if (color) result.set(section.code, color);
    }
    return result;
  }, [data]);
  const missingArea = data?.sections.filter((section) => section.areaM2 == null || section.areaM2 <= 0).length ?? 0;

  return <Card title="Cobertura hídrica mensual">
    <div className="space-y-4">
      <p className="text-sm text-neutral-600">
        Regla provisional. Una sección activa de área verde cuenta si tiene un turno registrado en su sector durante el mes.
        El porcentaje usa las superficies conocidas del catálogo.
      </p>
      {error && <div role="alert" className="space-y-2 text-sm text-alert-danger-fg">
        <p>{error}</p>
        <Button type="button" variant="secondary" onClick={() => { setError(null); setRetry((value) => value + 1); }}>Reintentar</Button>
      </div>}
      {!data && !error && <LoadingSkeleton />}
      {data && <>
        <div className="space-y-1">
          <p className="text-sm text-neutral-600">Del {data.monthStart} al {data.asOf}.</p>
          {data.coveragePercent == null
            ? <p className="font-semibold">Sin cobertura calculable. Faltan turnos del mes sobre secciones con superficie conocida.</p>
            : <p className="text-xl font-bold">{amount.format(data.coveragePercent)} % de superficie medida con riego registrado</p>}
          <p className="text-sm text-neutral-600">{amount.format(data.irrigatedAreaM2)} de {amount.format(data.measuredAreaM2)} m².</p>
          {missingArea > 0 && <p className="text-sm text-neutral-600">Secciones fuera del cálculo por falta de superficie positiva: {missingArea}.</p>}
        </div>
        {data.maxDaysWithoutIrrigation == null
          ? <p className="text-sm text-neutral-600">El semáforo se activa al configurar el intervalo máximo sin riego en Administración → Parámetros.</p>
          : <div className="space-y-2">
              <p className="flex flex-wrap gap-3 text-sm text-neutral-700">
                <span><span aria-hidden="true" style={{ color: AMBER }}>●</span> Ámbar: {data.maxDaysWithoutIrrigation} días.</span>
                <span><span aria-hidden="true" style={{ color: RED }}>●</span> Rojo: más de {data.maxDaysWithoutIrrigation} días.</span>
              </p>
              <Button type="button" variant="secondary" aria-expanded={showMap} onClick={() => setShowMap((visible) => !visible)}>
                {showMap ? 'Ocultar mapa de cobertura' : 'Ver mapa de cobertura'}
              </Button>
              {showMap && <IrrigationCoverageMap colors={colors} />}
            </div>}
        {data.sections.length === 0
          ? <p className="text-sm text-neutral-500">No hay secciones de área verde activas en el catálogo.</p>
          : <ul aria-label="Secciones por antigüedad del último riego" className="max-h-72 space-y-2 overflow-y-auto">
              {data.sections.map((section) => {
                const color = colors.get(section.code);
                return <li key={section.id} className="rounded-md border border-neutral-200 p-3 text-sm">
                  <p className="font-semibold">{section.name} · {section.sectorName}</p>
                  <p className="text-neutral-600">{section.lastIrrigatedOn == null ? 'Sin historial de riego'
                    : `Último riego: ${section.lastIrrigatedOn} · Días desde el último riego: ${section.daysWithoutIrrigation}`}</p>
                  {color && <p className={color === RED ? 'text-alert-danger-fg' : 'text-alert-warning-fg'}>
                    {color === RED ? 'Superó el intervalo máximo' : 'Llegó al intervalo máximo'}
                  </p>}
                </li>;
              })}
            </ul>}
      </>}
    </div>
  </Card>;
}
