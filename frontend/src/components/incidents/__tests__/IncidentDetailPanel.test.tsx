import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IncidentDetail } from '@shared/types';
import { IncidentDetailPanel } from '../IncidentDetailPanel';
import { incidentOptions, pendingDetail, approvedDetail } from '../__fixtures__/incidents';
import { incidentsApi } from '@/lib/incidents-api';
import { ApiError } from '@/lib/api';

jest.mock('@/lib/incidents-api', () => ({
  incidentsApi: { review: jest.fn(), approve: jest.fn(), addIntervention: jest.fn(), completeIntervention: jest.fn(), resolve: jest.fn() },
  newClientReference: () => '7ac93225-2e12-4a51-a700-222222222222',
}));
const api = incidentsApi as jest.Mocked<typeof incidentsApi>;

function Panel({ initial = pendingDetail, coordinator = true, options = true }: { initial?: IncidentDetail; coordinator?: boolean; options?: boolean }) {
  const [detail, setDetail] = useState(initial);
  return <IncidentDetailPanel detail={detail} options={options ? incidentOptions : null} optionsLoading={false}
    coordinator={coordinator} onChange={setDetail} onReload={jest.fn()} />;
}

beforeEach(() => jest.resetAllMocks());

it('saves the reviewed version before approving and renders the returned status', async () => {
  api.review.mockResolvedValue({ ...pendingDetail, incident: { ...pendingDetail.incident, version: 1 } });
  api.approve.mockResolvedValue(approvedDetail);
  render(<Panel />);
  expect(screen.getByLabelText('Cuadrilla responsable')).toHaveClass('h-12', 'bg-neutral-0');
  await userEvent.click(screen.getByRole('button', { name: 'Aprobar registro' }));
  await waitFor(() => expect(api.approve).toHaveBeenCalledWith(7, 1));
  expect(await screen.findByRole('status')).toHaveTextContent('Registro aprobado');
  expect(screen.queryByRole('button', { name: 'Aprobar registro' })).not.toBeInTheDocument();
  expect(screen.getByText('Pendiente de atención')).toBeInTheDocument();
});

it('keeps the review open and explains a stale-version conflict', async () => {
  api.review.mockRejectedValue(new ApiError(409, 'Incident changed; reload before editing'));
  render(<Panel />);
  const description = screen.getByLabelText(/Descripción/);
  await userEvent.clear(description);
  await userEvent.type(description, 'Descripción revisada');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La incidencia cambió');
  expect(description).toHaveValue('Descripción revisada');
});

it('retries an uncertain intervention with the same reference and text', async () => {
  api.addIntervention.mockRejectedValueOnce(new ApiError(0, 'Sin conexión. Verifique su red.')).mockResolvedValueOnce(approvedDetail);
  render(<Panel initial={approvedDetail} coordinator={false} />);
  await userEvent.type(screen.getByLabelText(/¿Qué trabajo/), 'Retirar rama');
  await userEvent.click(screen.getByRole('button', { name: 'Registrar trabajo realizado' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  expect(screen.getByLabelText(/¿Qué trabajo/)).toHaveValue('Retirar rama');
  await userEvent.click(screen.getByRole('button', { name: 'Registrar trabajo realizado' }));
  await waitFor(() => expect(api.addIntervention).toHaveBeenCalledTimes(2));
  expect(api.addIntervention.mock.calls[1]).toEqual(api.addIntervention.mock.calls[0]);
});

it('keeps pending work visible and operable when review options are unavailable', async () => {
  const detail = { ...approvedDetail, interventions: [{
    id: 10, description: 'Retirar rama', type: null, status: { id: 6, code: 'ASSIGNED', label: 'Pendiente' },
    recordedBy: pendingDetail.incident.reportedBy, completedBy: null, completedAt: null, createdAt: pendingDetail.incident.createdAt,
  }] };
  api.completeIntervention.mockResolvedValue(approvedDetail);
  render(<Panel initial={detail} coordinator={false} options={false} />);
  expect(screen.getByRole('button', { name: 'Resolver incidencia' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Marcar realizada' }));
  await waitFor(() => expect(api.completeIntervention).toHaveBeenCalledWith(7, 10));
});
