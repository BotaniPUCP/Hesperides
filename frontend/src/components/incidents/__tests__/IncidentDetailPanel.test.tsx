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

it('saves in the separate editor before approving the returned version', async () => {
  api.review.mockResolvedValue({ ...pendingDetail, incident: { ...pendingDetail.incident, version: 1 } });
  api.approve.mockResolvedValue(approvedDetail);
  render(<Panel />);
  expect(screen.queryByLabelText(/^Descripción/)).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
  await userEvent.click(screen.getByText(/Responsables y gestión/));
  expect(screen.getByLabelText('Cuadrilla responsable')).toHaveClass('h-12', 'bg-neutral-0');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(screen.queryByLabelText(/^Descripción/)).not.toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: 'Registrar incidencia oficialmente' }));
  await waitFor(() => expect(api.approve).toHaveBeenCalledWith(7, 1));
  expect(await screen.findByRole('status')).toHaveTextContent('Registro oficial confirmado');
  expect(screen.queryByRole('button', { name: 'Registrar incidencia oficialmente' })).not.toBeInTheDocument();
  expect(screen.getByText('Pendiente de atención')).toBeInTheDocument();
});

it('keeps the review open and explains a stale-version conflict', async () => {
  api.review.mockRejectedValue(new ApiError(409, 'Incident changed; reload before editing'));
  render(<Panel />);
  await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
  const description = screen.getByLabelText(/Descripción/);
  await userEvent.clear(description);
  await userEvent.type(description, 'Descripción revisada');
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La incidencia cambió');
  expect(description).toHaveValue('Descripción revisada');
});

it('opens the original only on demand and asks before discarding an edit', async () => {
  render(<Panel />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Ver reporte original' }));
  expect(screen.getByRole('dialog', { name: 'Reporte original' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Cerrar/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
  await userEvent.type(screen.getByLabelText(/^Descripción/), ' corregida');
  expect(screen.getByRole('button', { name: 'Actividad' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByLabelText(/^Descripción/)).toHaveValue('Rama caída en puerta principal corregida');
  expect(api.review).not.toHaveBeenCalled();
});

it('preselects created real work and retries the same explicit link rather than creating another task', async () => {
  jest.mocked(interventionsApi.detail).mockResolvedValue({ id:11,code:'INT-000011',description:'Retirar rama',version:0,statusCode:'PLANNED',locationCount:1,validatedLocationCount:0 } as WorkDetail);
  api.linkIntervention.mockRejectedValueOnce(new ApiError(0, 'Sin conexión. Verifique su red.')).mockResolvedValueOnce(approvedDetail);
  render(<Panel initial={approvedDetail} selected={11} />);
  expect(await screen.findByText(/Por relacionar: INT-000011/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Vincular intervención' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  expect(screen.getByText(/Por relacionar: INT-000011/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Vincular intervención' }));
  await waitFor(() => expect(api.linkIntervention).toHaveBeenCalledTimes(2));
  expect(api.linkIntervention.mock.calls[1]).toEqual(api.linkIntervention.mock.calls[0]);
  expect(screen.getByRole('link', { name:'Nueva intervención ↗' })).toHaveAttribute('href','/intervenciones/nueva?fromIncident=7');
});

it('keeps real work visible without offering creation to a foreman when options fail', async () => {
  const detail = { ...approvedDetail,canCreateIntervention:false, linkedInterventions: [{
    id:10,linkId:1,code:'INT-000010',description:'Retirar rama',statusCode:'ASSIGNED',version:0,purpose:null,locationCount:1,validatedLocationCount:0,
  }] };
  render(<Panel initial={detail} coordinator={false} options={false} />);
  await userEvent.click(screen.getByRole('button', { name: /Intervenciones \(/ }));
  expect(screen.getByRole('link',{name:'INT-000010 · Retirar rama'})).toHaveAttribute('href','/intervenciones/10');
  expect(screen.queryByRole('link',{name:'Nueva intervención ↗'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Marcar realizada' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Validar resolución y cerrar incidencia' })).not.toBeInTheDocument();
});

it('saves matrix severity and multiple impacts without assigning urgency', async () => {
  api.review.mockResolvedValue(pendingDetail);
  render(<Panel />);
  await userEvent.click(screen.getByRole('button', { name: 'Editar' }));
  await userEvent.selectOptions(screen.getByLabelText('Servicio'), 'AV-01');
  await userEvent.selectOptions(screen.getByLabelText('Severidad'), 'HIGH');
  await userEvent.click(screen.getByLabelText('Seguridad'));
  await userEvent.click(screen.getByLabelText('Ambiental'));
  await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(api.review).toHaveBeenCalledWith(7, expect.objectContaining({
    urgencyCode: null, matrix: expect.objectContaining({ serviceCode: 'AV-01', severityCode: 'HIGH', impactCodes: ['SAFETY', 'ENVIRONMENT'] }),
  })));
});

it('does not enable closure for finalized but unvalidated real work', async () => {
  const detail: IncidentDetail = { ...approvedDetail, incident: { ...approvedDetail.incident,
    matrix: { ...approvedDetail.incident.matrix, preventiveAction: 'Inspeccionar árboles vecinos' } },
    linkedInterventions: [{ id:10,linkId:1,code:'INT-000010',description:'Rama retirada',statusCode:'COMPLETED',version:1,
      purpose:{id:34,code:'MITIGATION',label:'Mitigación'},locationCount:1,validatedLocationCount:0 }],
  };
  render(<Panel initial={detail} />);
  await userEvent.click(screen.getByRole('button', { name: /Intervenciones \(/ }));
  expect(screen.getByRole('button', { name: 'Validar resolución y cerrar incidencia' })).toBeDisabled();
});

it('retries a comment with the same reference without completing work', async () => {
  api.comment.mockRejectedValueOnce(new ApiError(0, 'Sin conexión. Verifique su red.')).mockResolvedValueOnce(approvedDetail);
  render(<Panel initial={approvedDetail} coordinator={false} />);
  await userEvent.click(screen.getByRole('button', { name: 'Actividad' }));
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
  await userEvent.click(screen.getByText('Solicitar corrección al remitente'));
  await userEvent.type(screen.getByLabelText(/Qué debe corregirse/),'Precisar el lugar');
  await userEvent.click(screen.getByRole('button',{name:'Devolver para corrección'}));
  await waitFor(() => expect(api.requestCorrection).toHaveBeenCalledWith(7,0,'Precisar el lugar'));
  expect(screen.queryByRole('button',{name:'Registrar incidencia oficialmente'})).not.toBeInTheDocument();
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
  await userEvent.click(screen.getByRole('button', { name: /Intervenciones \(/ }));
  await userEvent.type(screen.getByLabelText(/Cómo se resolvió la incidencia/),'Se retiró la rama y se revisó el acceso');
  await userEvent.click(screen.getByRole('button',{name:'Validar resolución y cerrar incidencia'}));
  await waitFor(() => expect(api.resolve).toHaveBeenCalledWith(7,2,'Se retiró la rama y se revisó el acceso'));
  await userEvent.click(screen.getByRole('button', { name: 'Datos del caso' }));
  expect(screen.getByText(/Cómo se resolvió: Se retiró la rama/)).toBeInTheDocument();
});
