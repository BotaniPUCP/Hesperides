import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentWorkSearch } from '../IncidentWorkSearch';
import { incidentsApi } from '@/lib/incidents-api';
import { ApiError } from '@/lib/api';
import type { LinkedIncidentIntervention, Page } from '@shared/types';

jest.mock('@/lib/incidents-api', () => ({ incidentsApi: { interventionOptions: jest.fn(), availableInterventions: jest.fn() } }));
const api = jest.mocked(incidentsApi);
const work: LinkedIncidentIntervention = { id: 11, linkId: null, purpose: null, code: 'INT-11', description: 'Retirar rama', version: 4,
  statusCode: 'ASSIGNED', locationCount: 1, validatedLocationCount: 0 };
const page: Page<LinkedIncidentIntervention> = { content: [work], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } };
beforeEach(() => jest.resetAllMocks());

it('shows authorized results directly and keeps the version of the selected work', async () => {
  api.interventionOptions.mockResolvedValue(page);
  const select = jest.fn();
  render(<IncidentWorkSearch incidentId={7} scopeKey="detail" disabled={false} excludedIds={[]} onSelect={select} />);
  await userEvent.click(await screen.findByRole('button', { name: 'Añadir INT-11' }));
  expect(select).toHaveBeenCalledWith(work);
  expect(api.interventionOptions).toHaveBeenCalledWith(7, '', 0);
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
});

it('searches reactively and exposes an explicit empty state', async () => {
  api.availableInterventions.mockResolvedValue(page);
  render(<IncidentWorkSearch scopeKey="capture" disabled={false} excludedIds={[]} onSelect={jest.fn()} />);
  await screen.findByRole('button', { name: 'Añadir INT-11' });
  api.availableInterventions.mockResolvedValue({ content: [], page: { ...page.page, totalElements: 0, totalPages: 0 } });
  await userEvent.type(screen.getByRole('searchbox'), 'sin coincidencias');
  expect(await screen.findByText(/No hay intervenciones que coincidan/)).toBeInTheDocument();
  expect(api.availableInterventions).toHaveBeenLastCalledWith('sin coincidencias', 0);
});

it('does not let a late response replace newer search results', async () => {
  let resolveOld!: (result: Page<LinkedIncidentIntervention>) => void;
  api.availableInterventions.mockReturnValueOnce(new Promise(resolve => { resolveOld = resolve; }))
    .mockResolvedValue({ content: [], page: { ...page.page, totalElements: 0, totalPages: 0 } });
  render(<IncidentWorkSearch scopeKey="capture" disabled={false} excludedIds={[]} onSelect={jest.fn()} />);
  await userEvent.type(screen.getByRole('searchbox'), 'nuevo');
  await screen.findByText(/No hay intervenciones que coincidan/);
  await act(async () => resolveOld(page));
  expect(screen.queryByRole('button', { name: 'Añadir INT-11' })).not.toBeInTheDocument();
});

it('retries errors and paginates on the server without selecting twice', async () => {
  api.availableInterventions.mockRejectedValueOnce(new ApiError(0, 'Sin conexión. Verifique su red.'))
    .mockResolvedValue({ ...page, page: { ...page.page, totalPages: 2, totalElements: 21 } });
  render(<IncidentWorkSearch scopeKey="capture" disabled={false} excludedIds={[11]} onSelect={jest.fn()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar búsqueda' }));
  expect(await screen.findByRole('button', { name: 'Añadir INT-11' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Siguientes' }));
  await waitFor(() => expect(api.availableInterventions).toHaveBeenLastCalledWith('', 1));
});
