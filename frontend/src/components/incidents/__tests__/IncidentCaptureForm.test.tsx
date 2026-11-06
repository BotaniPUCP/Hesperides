import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { IncidentCaptureForm } from '../IncidentCaptureForm';
import { incidentsApi } from '@/lib/incidents-api';
import { ApiError } from '@/lib/api';
import { incidentOptions,pendingDetail } from '../__fixtures__/incidents';
import reference from '@shared/fixtures/osg-incidents.json';

jest.mock('@/lib/incidents-api', () => ({
  incidentsApi: { create: jest.fn(), upload: jest.fn(), availableInterventions:jest.fn(),linkIntervention:jest.fn(),detail:jest.fn() },
  newClientReference: jest.fn(() => '7ac93225-2e12-4a51-a700-222222222222'),
}));
const create = jest.mocked(incidentsApi.create);
const upload = jest.mocked(incidentsApi.upload);

beforeEach(() => {
  jest.clearAllMocks();
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
  create.mockResolvedValue(pendingDetail);
  jest.mocked(incidentsApi.availableInterventions).mockResolvedValue({content:[],page:{number:0,size:20,totalElements:0,totalPages:0}});
});

it('sends a short sentence without title, photo, location or classification', async () => {
  const done = jest.fn();
  render(<IncidentCaptureForm sender="Óscar" onDone={done} onCancel={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/¿Qué pasó?/), 'Rama caída en puerta principal');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(create).toHaveBeenCalledWith({ description: 'Rama caída en puerta principal', locationReference: null, latitude: null, longitude: null }, expect.any(String));
  expect(upload).not.toHaveBeenCalled();
  expect(done).toHaveBeenCalledWith(7);
});

it('retains the text and idempotency key after an uncertain network failure', async () => {
  create.mockRejectedValueOnce(new ApiError(0, 'Sin conexión. Verifique su red.'));
  render(<IncidentCaptureForm sender="Óscar" onDone={jest.fn()} onCancel={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/¿Qué pasó?/), 'Rama');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sin conexión');
  expect(screen.getByLabelText(/¿Qué pasó?/)).toHaveValue('Rama');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
});

it('does not recreate the incident when a photo fails and is retried', async () => {
  const done = jest.fn();
  upload.mockRejectedValueOnce(new ApiError(500, 'Storage unavailable')).mockResolvedValueOnce({ id: 1 } as never);
  render(<IncidentCaptureForm sender="Óscar" onDone={done} onCancel={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/¿Qué pasó?/), 'Rama');
  fireEvent.change(screen.getByLabelText('Añadir fotos'), { target: { files: [new File(['image'], 'photo.png', { type: 'image/png' })] } });
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(await screen.findByText(/Tu texto ya fue recibido/)).toBeInTheDocument();
  expect(done).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Reintentar pendientes' })).toBeEnabled());
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar pendientes' }));
  expect(create).toHaveBeenCalledTimes(1);
  expect(upload.mock.calls[1]).toEqual(upload.mock.calls[0]);
  expect(done).toHaveBeenCalledWith(7);
});

it('only rejects empty text and never requests geolocation automatically', async () => {
  const locate = jest.fn();
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: locate } });
  render(<IncidentCaptureForm sender="Óscar" onDone={jest.fn()} onCancel={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/¿Qué pasó?/), '   ');
  await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(create).not.toHaveBeenCalled();
  expect(locate).not.toHaveBeenCalled();
  expect(screen.getByRole('alert')).toHaveTextContent('Escribe brevemente');
  expect(screen.getByLabelText(/¿Qué pasó?/)).toHaveAttribute('aria-invalid', 'true');
});

it('lets the reporter optionally fill workbook data and preserves it when returning to simple mode',async()=>{
  const rootCauses=reference.rootCauses.map((description,n)=>({id:100+n,code:`AV-${String(n+1).padStart(2,'0')}`,label:`AV-${String(n+1).padStart(2,'0')} — ${description}`,description,parentCode:null}));
  const options={...incidentOptions,canCreateIntervention:false,matrix:{...incidentOptions.matrix,rootCauses}};
  render(<IncidentCaptureForm sender="Capataz" options={options} onDone={jest.fn()} onCancel={jest.fn()} />);
  expect(screen.queryByRole('button',{name:'Guardar reporte y crear intervención'})).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText(/¿Qué pasó?/),'Aspersor girado junto a la vereda');
  await userEvent.click(screen.getByRole('button',{name:'Añadir más detalles · modo ampliado'}));
  expect(screen.getAllByRole('option').filter(o=>o.textContent?.includes('AV-')&&o.textContent?.includes(' — '))).toHaveLength(15);
  await userEvent.selectOptions(screen.getByLabelText('Servicio'),'AV-01');
  await userEvent.selectOptions(screen.getByLabelText('Severidad'),'HIGH');
  await userEvent.selectOptions(screen.getByLabelText('Causa raíz catalogada'),'AV-09');
  await userEvent.type(screen.getByLabelText('Causa raíz detallada'),'Se comprobó el giro incorrecto del cabezal');
  await userEvent.click(screen.getByLabelText('Seguridad'));
  await userEvent.click(screen.getByLabelText('Ambiental'));
  await userEvent.click(screen.getByRole('button',{name:'Volver al modo simple'}));
  await userEvent.click(screen.getByRole('button',{name:'Enviar'}));
  expect(create).toHaveBeenCalledWith(expect.objectContaining({matrix:expect.objectContaining({serviceCode:'AV-01',severityCode:'HIGH',rootCauseCode:'AV-09',
    rootCause:'Se comprobó el giro incorrecto del cabezal',impactCodes:['SAFETY','ENVIRONMENT']})}),expect.any(String));
});

it('saves once and relates multiple existing interventions before registration',async()=>{
  const work=(id:number)=>({id,linkId:null,code:`INT-${id}`,description:`Trabajo ${id}`,statusCode:'ASSIGNED',version:0,purpose:null,locationCount:1,validatedLocationCount:0});
  const first=work(11),second=work(12);
  jest.mocked(incidentsApi.availableInterventions).mockResolvedValue({content:[first,second],page:{number:0,size:20,totalElements:2,totalPages:1}});
  jest.mocked(incidentsApi.linkIntervention).mockResolvedValueOnce({...pendingDetail,incident:{...pendingDetail.incident,version:1},linkedInterventions:[first]})
    .mockResolvedValueOnce({...pendingDetail,incident:{...pendingDetail.incident,version:2},linkedInterventions:[first,second]});
  const done=jest.fn();
  render(<IncidentCaptureForm sender="Capataz" onDone={done} onCancel={jest.fn()} />);
  await userEvent.type(screen.getByLabelText(/¿Qué pasó?/),'Dos trabajos atienden este reporte');
  await userEvent.click(screen.getByText('Relacionar intervenciones existentes (opcional)'));
  await waitFor(()=>expect(screen.getByRole('option',{name:'INT-11 · Trabajo 11'})).toBeInTheDocument());
  await userEvent.selectOptions(screen.getByLabelText('Añadir intervención relacionada'),'11');
  await userEvent.selectOptions(screen.getByLabelText('Añadir intervención relacionada'),'12');
  await userEvent.click(screen.getByRole('button',{name:'Enviar'}));
  await waitFor(()=>expect(done).toHaveBeenCalledWith(7));
  expect(create).toHaveBeenCalledTimes(1);
  expect(incidentsApi.linkIntervention).toHaveBeenNthCalledWith(1,7,{version:0,interventionId:11,interventionVersion:0,purposeCode:'MITIGATION'});
  expect(incidentsApi.linkIntervention).toHaveBeenNthCalledWith(2,7,{version:1,interventionId:12,interventionVersion:0,purposeCode:'MITIGATION'});
});
