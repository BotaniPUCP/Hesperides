'use client';

import React from 'react';
import type { MaintenanceFrequency } from '@shared/types';
import { SEASONS, monthName } from './seasons';

/**
 * Los parámetros de una frecuencia, en la forma que corresponda a su modelo.
 *
 * Las estaciones se listan una por una. El resumen de texto que antes ocupaba
 * esta celda se leía bien pero no permitía saber qué rango regía en qué mes, ni
 * que el motor lo evaluara.
 */
export function FrequencyParameters({ frequency: f }: { frequency: MaintenanceFrequency }) {
  switch (f.frequencyRuleType.code) {
    case 'INTERVAL_DAYS':
      return f.seasons.length > 0 ? (
        <div className="text-xs space-y-0.5">
          {f.seasons.map((s) => (
            <span key={s.season} className="block">
              <span className="text-neutral-500">{SEASONS[s.season]?.label ?? s.season}: </span>
              <span className="font-medium text-neutral-900">
                {s.minDaysInterval}–{s.maxDaysInterval}d
              </span>
              {s.targetDaysInterval ? (
                <span className="text-neutral-400"> (teór. {s.targetDaysInterval}d)</span>
              ) : null}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-xs">
          <span className="font-medium text-neutral-900">
            {f.minDaysInterval} a {f.maxDaysInterval} días
          </span>
          {f.targetDaysInterval && (
            <span className="text-neutral-500 block">Teórico: cada {f.targetDaysInterval}d</span>
          )}
        </div>
      );

    case 'SEASONAL_PERIOD':
      return (
        <span className="text-xs font-medium text-neutral-900">
          Mín. {f.annualTargetCount} por año
        </span>
      );

    case 'ANNUAL_WINDOW':
      return (
        <div className="text-xs">
          <span className="font-medium text-neutral-900">Mín. {f.annualTargetCount} por año</span>
          {f.seasonStartMonth && f.seasonEndMonth && (
            <span className="text-neutral-500 block">
              Ventana: {monthName(f.seasonStartMonth)}–{monthName(f.seasonEndMonth)}
            </span>
          )}
        </div>
      );

    case 'COVERAGE_CYCLE':
      return (
        <div className="text-xs">
          <span className="font-medium text-neutral-900">
            100% en {f.coverageTargetDays} días
          </span>
          <span className="text-neutral-500 block">Ciclo rotativo continuo</span>
        </div>
      );

    case 'ON_DEMAND':
      return <span className="text-xs text-neutral-500">A demanda / riesgo</span>;

    default:
      return null;
  }
}

export function scopeLabel(scope: MaintenanceFrequency['scope']): string {
  switch (scope) {
    case 'CAMPUS_WIDE':
      return 'Todo el campus';
    case 'BY_SECTOR':
      return 'Por sector';
    default:
      return 'Por zona';
  }
}
