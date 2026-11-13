import type { DirectionReport, MonthlyReport, ReportOptions, ReportSection, WeeklyReport } from '@shared/types';
import { apiClient } from './api';
import type { MonthlyFilters, WeeklyParams } from './reportNavigation';

const path = '/reports';

/** Only the values that are set travel; an empty one lets the backend apply its defaults. */
function query(values: Record<string, string | number | null>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== '') params.set(key, String(value));
  }
  const text = params.toString();
  return text ? `?${text}` : '';
}

export const reportsApi = {
  options: () => apiClient.get<ReportOptions>(`${path}/options`),
  sections: (sectorId: number) =>
    apiClient.get<ReportSection[]>(`${path}/options/sections?${new URLSearchParams({ sectorId: String(sectorId) })}`),
  weekly: (params: WeeklyParams) => apiClient.get<WeeklyReport>(`${path}/weekly${query({ ...params })}`),
  monthly: (filters: MonthlyFilters) => apiClient.get<MonthlyReport>(`${path}/monthly${query({ ...filters })}`),
  direction: (month: string | null) => apiClient.get<DirectionReport>(`${path}/direction${query({ month })}`),
};
