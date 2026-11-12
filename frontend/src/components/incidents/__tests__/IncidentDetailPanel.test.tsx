import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { IncidentDetail } from '@shared/types';
import { IncidentDetailPanel } from '../IncidentDetailPanel';
import { incidentOptions, pendingDetail, approvedDetail } from '../__fixtures__/incidents';
import { incidentsApi } from '@/lib/incidents-api';
import { ApiError } from '@/lib/api';
import { interventionsApi, type InterventionDetail as WorkDetail } from '@/lib/interventions-api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/lib/interventions-api', () => ({ interventionsApi: { detail: jest.fn() } }));

jest.mock('@/lib/incidents-api', () => ({
  incidentsApi: { review: jest.fn(), approve: jest.fn(), linkIntervention: jest.fn(), interventionOptions: jest.fn(), requestCorrection: jest.fn(), resubmit: jest.fn(), observeResolution: jest.fn(), resolve: jest.fn(), comment: jest.fn() },
  newClientReference: () => '7ac93225-2e12-4a51-a700-222222222222',
}));
const api = incidentsApi as jest.Mocked<typeof incidentsApi>;

function Panel({ initial = pendingDetail, coordinator = true, options = true, selected = null }: { initial?: IncidentDetail; coordinator?: boolean; options?: boolean; selected?: number | null }) {
  const [detail, setDetail] = useState(initial);
  return <IncidentDetailPanel detail={detail} options={options ? incidentOptions : null} optionsLoading={false}
    coordinator={coordinator} onChange={setDetail} onReload={jest.fn()} selectedInterventionId={selected} createInterventionHref="/intervenciones/nueva?fromIncident=7" />;
}

beforeEach(() => {
  jest.resetAllMocks();
  api.interventionOptions.mockResolvedValue({ content: [], page: { number:0,size:20,totalPages:0,totalElements:0 } });
});

it('saves the reviewed version before approving and renders the returned status', async () => {
  api.review.mockResolvedValue({ ...pendingDetail, incident: { ...pendingDetail.incident, version: 1 } });
  api.approve.mockResolvedValue(approvedDetail);
  render(<Panel />);
  expect(screen.getByLabelText('Cuadrilla responsable')).toHaveClass('h-12', 'bg-neutral-0');
  await userEvent.click(screen.getByRole('button', { name: 'Registrar incidencia oficialmente' }));
  await waitFor(() => expect(api.approve).toHaveBeenCalledWith(7, 1));
  expect(await screen.findByRole('status')).toHaveTextContent('Registro oficial confirmado');
  expect(screen.queryByRole('button', { name: 'Registrar incidencia oficialmente' })).not.toBeInTheDocument();
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

it('preselects created real work and retries the same explicit link rather than creating another task', async () => {
  jest.mocked(interventionsApi.detail).mockResolvedValue({ id:11,code:'INT-000011',description:'Retirar rama',version:0,statusCode:'PLANNED',locationCount:1,validatedLocationCount:0 } as WorkDetail);
  api.linkIntervention.mockRejectedValueOnce(new ApiError(0, 'Sin conexión. Verifique su red.')).mockResolvedValueOnce(approvedDetail);
  render(<Panel initial={approvedDetail} selected={11} />);
  await waitFor(() => expect(screen.getByLabelText('Intervención existente')).toHaveValue('11'));
  await userEvent.click(screen.getByRole('button', { name: 'Vincular intervención' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  expect(screen.getByLabelText('Intervención existente')).toHaveValue('11');
  await userEvent.click(screen.getByRole('button', { name: 'Vincular intervención' }));
  await waitFor(() => expect(api.linkIntervention).toHaveBeenCalledTimes(2));
  expect(api.linkIntervention.mock.calls[1]).toEqual(api.linkIntervention.mock.calls[0]);
  expect(screen.getByRole('link', { name:'Registrar nueva intervención' })).toHaveAttribute('href','/intervenciones/nueva?fromIncident=7');
});

it('keeps historical work visible but read-only when review options are unavailable', () => {
  const detail = { ...approvedDetail, interventions: [{
    id: 10, description: 'Retirar rama', type: null, status: { id: 6, code: 'ASSIGNED', label: 'Pendiente' },
    recordedBy: pendingDetail.incident.reportedBy, completedBy: null, completedAt: null, createdAt: pendingDetail.incident.createdAt, purpose: null, replacementInterventionId: null,
  }] };
  render(<Panel initial={detail} coordinator={false} options={false} />);
  expect(screen.getByText(/Trabajos del registro anterior/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Marcar realizada' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Validar resolución y cerrar incidencia' })).not.toBeInTheDocument();
});

it('saves matrix severity and multiple impacts without assigning urgency', async () => {
  api.review.mockResolvedValue(pendingDetail);
  render(<Panel />);
  await userEvent.selectOptions(screen.getByLabelText('Servicio'), 'AV-01');
  await userEvent.selectOptions(screen.getByLabelText('Severidad'), 'HIGH');
  await userEvent.click(screen.getByLabelText('Seguridad'));
  await userEvent.click(screen.getByLabelText('Ambiental'));
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(api.review).toHaveBeenCalledWith(7, expect.objectContaining({
    urgencyCode: null, matrix: expect.objectContaining({ serviceCode: 'AV-01', severityCode: 'HIGH', impactCodes: ['SAFETY', 'ENVIRONMENT'] }),
  })));
});

it('does not enable closure when declared prevention has no completed preventive action', () => {
  const detail: IncidentDetail = { ...approvedDetail, incident: { ...approvedDetail.incident,
    matrix: { ...approvedDetail.incident.matrix, preventiveAction: 'Inspeccionar árboles vecinos' } },
    interventions: [{ id: 10, description: 'Rama retirada', type: null, purpose: { id: 34, code: 'MITIGATION', label: 'Mitigación' },
      status: { id: 6, code: 'COMPLETED', label: 'Realizada' }, recordedBy: pendingDetail.incident.reportedBy,
      completedBy: pendingDetail.incident.reportedBy, completedAt: pendingDetail.incident.createdAt, createdAt: pendingDetail.incident.createdAt, replacementInterventionId:null }],
  };
  render(<Panel initial={detail} />);
  expect(screen.getByRole('button', { name: 'Validar resolución y cerrar incidencia' })).toBeDisabled();
});

it('retries a comment with the same reference without completing work', async () => {
  api.comment.mockRejectedValueOnce(new ApiError(0, 'Sin conexión. Verifique su red.')).mockResolvedValueOnce(approvedDetail);
  render(<Panel initial={approvedDetail} coordinator={false} />);
  await userEvent.type(screen.getByLabelText(/Comentario o actualización/), 'Coordinamos la inspección');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar comentario' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  expect(screen.getByLabelText(/Comentario o actualización/)).toHaveValue('Coordinamos la inspección');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar comentario' }));
  await waitFor(() => expect(api.comment).toHaveBeenCalledTimes(2));
  expect(api.comment.mock.calls[1]).toEqual(api.comment.mock.calls[0]);
  expect(api.resolve).not.toHaveBeenCalled();
});

it('returns an initial report with a reason and waits for resubmission', async () => {
  api.requestCorrection.mockResolvedValue({ ...pendingDetail, incident:{ ...pendingDetail.incident, version:1,
    status:{ id:70,code:'CHANGES_REQUESTED',label:'Corrección solicitada' }, correctionReason:'Precisar el lugar' } });
  render(<Panel />);
  await userEvent.type(screen.getByLabelText(/Qué debe corregirse/),'Precisar el lugar');
  await userEvent.click(screen.getByRole('button',{name:'Devolver para corrección'}));
  await waitFor(() => expect(api.requestCorrection).toHaveBeenCalledWith(7,0,'Precisar el lugar'));
  expect(screen.getByRole('button',{name:'Registrar incidencia oficialmente'})).toBeDisabled();
});

it('lets only a returned reporter correct captured data and resubmit the same record', async () => {
  const returned={...pendingDetail,canCorrectReport:true,incident:{...pendingDetail.incident,version:1,
    status:{id:70,code:'CHANGES_REQUESTED',label:'Corrección solicitada'},correctionReason:'Precisar el lugar'}};
  api.resubmit.mockResolvedValue(pendingDetail);
  render(<Panel initial={returned} coordinator={false} />);
  await userEvent.clear(screen.getByLabelText(/Descripción corregida/));
  await userEvent.type(screen.getByLabelText(/Descripción corregida/),'Rama caída junto a Biblioteca');
  await userEvent.click(screen.getByRole('button',{name:'Reenviar para revisión'}));
  await waitFor(() => expect(api.resubmit).toHaveBeenCalledWith(7,1,expect.objectContaining({description:'Rama caída junto a Biblioteca'})));
  expect(api.approve).not.toHaveBeenCalled();
});

it('requires a per-incident resolution summary after the server confirms validated work', async () => {
  const ready={...approvedDetail,canResolve:true};
  api.resolve.mockResolvedValue({...ready,canResolve:false,incident:{...ready.incident,resolvedAt:'2026-11-05T10:00:00Z',resolutionSummary:'Se retiró la rama y se revisó el acceso',status:{id:4,code:'RESOLVED',label:'Resuelta'}}});
  render(<Panel initial={ready} />);
  await userEvent.type(screen.getByLabelText(/Cómo se resolvió la incidencia/),'Se retiró la rama y se revisó el acceso');
  await userEvent.click(screen.getByRole('button',{name:'Validar resolución y cerrar incidencia'}));
  await waitFor(() => expect(api.resolve).toHaveBeenCalledWith(7,2,'Se retiró la rama y se revisó el acceso'));
  expect(screen.getByText(/Cómo se resolvió: Se retiró la rama/)).toBeInTheDocument();
});
