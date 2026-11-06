import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentDashboard, IncidentExportButton } from '../IncidentDashboard';
import { incidentsApi } from '@/lib/incidents-api';
import { ApiError } from '@/lib/api';

jest.mock('@/lib/incidents-api', () => ({ incidentsApi: { export: jest.fn() } }));

it('labels closure statistics as closed-only business days, not SLA compliance', () => {
  render(<IncidentDashboard matrix={{ pendingActions: 2, closedWithDuration: 3, averageClosureBusinessDays: 2,
    severities: [{ label: 'Alta', count: 1 }], impacts: [], services: [], responsiblePeople: [] }} />);
  expect(screen.getByText('Solo casos cerrados (3). No es un indicador de SLA.')).toBeInTheDocument();
  expect(screen.getByText('Alta')).toBeInTheDocument();
});

it('reports export errors without hiding the dashboard', async () => {
  jest.mocked(incidentsApi.export).mockRejectedValue(new ApiError(500, 'Unavailable'));
  render(<IncidentExportButton />);
  await userEvent.click(screen.getByRole('button', { name: 'Exportar matriz OSG' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor');
});
