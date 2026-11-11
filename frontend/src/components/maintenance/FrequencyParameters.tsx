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
        <div className="space-y-0.5 text-sm">
          {f.seasons.map((s) => (
            <span key={s.season} className="block">
              <span className="text-neutral-500">{SEASONS[s.season]?.label ?? s.season}: </span>
              <span className="font-medium text-neutral-900">
                {s.minDaysInterval}–{s.maxDaysInterval}d
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className="text-sm">
          <span className="font-medium text-neutral-900">
            {f.minDaysInterval} a {f.maxDaysInterval} días
          </span>
        </div>
      );

    case 'SEASONAL_PERIOD':
      return (
        <span className="text-sm font-medium text-neutral-900">
          Mín. {f.annualTargetCount} por año
        </span>
      );

    case 'ANNUAL_WINDOW':
      return (
        <div className="text-sm">
          <span className="font-medium text-neutral-900">Mín. {f.annualTargetCount} por año</span>
          {f.seasonStartMonth && f.seasonEndMonth && (
            <span className="block text-xs text-neutral-500">
              Ventana: {monthName(f.seasonStartMonth)}–{monthName(f.seasonEndMonth)}
            </span>
          )}
        </div>
      );

    case 'COVERAGE_CYCLE':
      return (
        <div className="text-sm">
          <span className="font-medium text-neutral-900">
            100% en {f.coverageTargetDays} días
          </span>
          <span className="block text-xs text-neutral-500">Ciclo rotativo continuo</span>
        </div>
      );

    case 'ON_DEMAND':
      return <span className="text-sm text-neutral-700">Cuando se necesite</span>;

    default:
      return null;
  }
}

export function scopeLabel(scope: MaintenanceFrequency['scope']): string {
  switch (scope) {
    case 'CAMPUS_WIDE':
      return 'Todo el campus';
    default:
      return 'Un conjunto';
  }
}
