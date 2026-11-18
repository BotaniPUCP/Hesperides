import { useState } from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IncidentDetail } from '@shared/types';
import { IncidentDetailPanel } from '../IncidentDetailPanel';
import { incidentOptions, pendingDetail, approvedDetail } from '../__fixtures__/incidents';
import { incidentsApi } from '@/lib/incidents-api';
import { ApiError } from '@/lib/api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/lib/incidents-api', () => ({
  incidentsApi: {
    review: jest.fn(), activate: jest.fn(), retryPrefill: jest.fn(), close: jest.fn(), link: jest.fn(),
    unlink: jest.fn(), replace: jest.fn(), candidates: jest.fn(), comment: jest.fn(), photo: jest.fn(),
  },
  newClientReference: () => '7ac93225-2e12-4a51-a700-222222222222',
}));
const api = incidentsApi as jest.Mocked<typeof incidentsApi>;

function Panel({ initial = pendingDetail, coordinator = true }: { initial?: IncidentDetail; coordinator?: boolean }) {
  const [detail, setDetail] = useState(initial);
  return <IncidentDetailPanel detail={detail} options={incidentOptions} optionsLoading={false} coordinator={coordinator}
    onChange={setDetail} onReload={jest.fn()} createInterventionHref="/intervenciones/nueva?fromIncident=7" />;
}

const readyToActivate: IncidentDetail = {
  ...approvedDetail,
  incident: { ...approvedDetail.incident, active: false, activatedAt: null, activatedBy: null },
  activationGaps: [], capabilities: { ...approvedDetail.capabilities, canActivate: true, canLink: false },
};

beforeEach(() => {
  jest.resetAllMocks();
  api.candidates.mockResolvedValue([]);
});

it('shows the original report and what is still missing before activating', () => {
  render(<Panel />);
  expect(screen.getByRole('heading', { name: 'INC-2026-0007' })).toBeInTheDocument();
  expect(screen.getByText('Rama rajada sobre el Pontódromo', { selector: 'blockquote' })).toBeInTheDocument();
  expect(screen.getByText(/Falta para activar: tipo, sección o GPS/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Activar incidencia' })).toBeDisabled();
});

it('activates with the version that the screen saw', async () => {
  api.activate.mockResolvedValue(approvedDetail);
  render(<Panel initial={readyToActivate} />);
  await userEvent.click(screen.getByRole('button', { name: 'Activar incidencia' }));
  await waitFor(() => expect(api.activate).toHaveBeenCalledWith(7, 2));
  expect(await screen.findByRole('status')).toHaveTextContent('Incidencia activada');
});

it('marks each field as suggested by the AI or edited by a person', () => {
  render(<Panel initial={approvedDetail} />);
  expect(within(screen.getByTestId('field-title')).getByText('Sugerido por IA')).toBeInTheDocument();
  expect(within(screen.getByTestId('field-typeCode')).getByText('Editado')).toBeInTheDocument();
  expect(screen.getByText(/La IA sugiere urgencia Alta/)).toHaveTextContent('Pasa mucha gente');
  expect(screen.getByText(/Verifica la altura del árbol/)).toBeInTheDocument();
});

it('explains the closure blockers and keeps the close button disabled', () => {
  render(<Panel initial={approvedDetail} />);
  expect(screen.getByText(/Vincula al menos una intervención/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Cerrar incidencia' })).toBeDisabled();
});

it('closes with the applied solution once all linked work is validated', async () => {
  const closable = { ...approvedDetail, closureBlockers: [], capabilities: { ...approvedDetail.capabilities, canClose: true },
    linkedInterventions: [{ linkId: 5, id: 11, code: 'INT-000011', description: 'Poda', statusCode: 'VALIDATED', locationCount: 1, validatedLocationCount: 1 }] };
  api.close.mockResolvedValue(closable);
  render(<Panel initial={closable} />);
  await userEvent.type(screen.getByLabelText(/Solución aplicada/), 'Se podó la rama');
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar incidencia' }));
  await waitFor(() => expect(api.close).toHaveBeenCalledWith(7, 2, 'Se podó la rama'));
});

it('offers to replace a cancelled intervention and asks for a reason', async () => {
  const cancelled = { ...approvedDetail, closureBlockers: ['CANCELLED_WORK' as const],
    linkedInterventions: [{ linkId: 5, id: 11, code: 'INT-000011', description: 'Poda', statusCode: 'CANCELLED', locationCount: 1, validatedLocationCount: 0 }] };
  api.candidates.mockResolvedValue([{ id: 12, code: 'INT-000012', description: 'Poda del tercero', statusCode: 'PLANNED', searchKey: 'int-000012 poda del tercero' }]);
  api.replace.mockResolvedValue(approvedDetail);
  render(<Panel initial={cancelled} />);
  expect(screen.getByText(/Una intervención vinculada está cancelada/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Reemplazar INT-000011' }));
  await userEvent.type(screen.getByLabelText('Buscar intervención por código o descripción'), 'INT-000012');
  await userEvent.click(await screen.findByRole('radio', { name: /INT-000012/ }));
  await userEvent.type(screen.getByLabelText('Motivo'), 'Pasa al tercero');
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar reemplazo' }));
  await waitFor(() => expect(api.replace).toHaveBeenCalledWith(7, 5, 2, 12, 'Pasa al tercero'));
});

it('links an existing intervention found by its code', async () => {
  api.candidates.mockResolvedValue([{ id: 12, code: 'INT-000012', description: 'Poda', statusCode: 'PLANNED', searchKey: 'int-000012 poda' }]);
  api.link.mockResolvedValue(approvedDetail);
  render(<Panel initial={approvedDetail} />);
  await userEvent.type(screen.getByLabelText('Buscar intervención por código o descripción'), 'INT');
  await userEvent.click(await screen.findByRole('radio', { name: /INT-000012/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Vincular intervención' }));
  await waitFor(() => expect(api.link).toHaveBeenCalledWith(7, 2, 12));
});

it('the foreman sees the case and comments, but cannot review, activate, link or close', () => {
  render(<Panel coordinator={false} />);
  expect(screen.queryByRole('button', { name: 'Activar incidencia' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Guardar cambios' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cerrar incidencia' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Enviar comentario' })).toBeInTheDocument();
});

it('shows the server error in Spanish and keeps the form', async () => {
  api.activate.mockRejectedValue(new ApiError(409, 'Incident changed; reload before editing'));
  render(<Panel initial={readyToActivate} />);
  await userEvent.click(screen.getByRole('button', { name: 'Activar incidencia' }));
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Activar incidencia' })).toBeInTheDocument();
});
