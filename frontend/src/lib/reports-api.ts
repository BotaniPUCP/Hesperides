import type { MonthlyReport, ReportOptions, ReportSection } from '@shared/types';
import { apiClient } from './api';
import type { MonthlyFilters } from './reportNavigation';

const path = '/reports';

/** Only the filters that are set travel; an empty filter lets the backend apply its defaults. */
function monthlyQuery(filters: MonthlyFilters): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== null && value !== '') params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const reportsApi = {
  options: () => apiClient.get<ReportOptions>(`${path}/options`),
  sections: (sectorId: number) =>
    apiClient.get<ReportSection[]>(`${path}/options/sections?${new URLSearchParams({ sectorId: String(sectorId) })}`),
  monthly: (filters: MonthlyFilters) => apiClient.get<MonthlyReport>(`${path}/monthly${monthlyQuery(filters)}`),
};
