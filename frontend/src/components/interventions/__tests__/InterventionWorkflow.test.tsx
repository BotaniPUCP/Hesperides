import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { InterventionDetail } from '../InterventionDetail';
import { InterventionForm } from '../InterventionForm';
import { interventionsApi } from '@/lib/interventions-api';
import { ApiError } from '@/lib/api';
import type { InterventionDetail as Detail, InterventionOptions } from '@/lib/interventions-api';

const push = jest.fn();
const toast = jest.fn();
let role = 'COORDINADOR';
jest.mock('next/navigation', () => ({useRouter:()=>({push})}));
jest.mock('@/hooks/useAuth', () => ({useAuth:()=>({user:{id:3,role:{code:role}}})}));
jest.mock('@/hooks/useCatalog', () => ({useCatalog:()=>({items:[{code:'UNSPECIFIED',label:'Sin especificar'}],isLoading:false,errorMessage:null})}));
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return {...actual,useToast:()=>({showToast:toast})};
});
jest.mock('@/lib/interventions-api', () => ({...jest.requireActual('@/lib/interventions-api'),interventionsApi:{detail:jest.fn(),options:jest.fn(),command:jest.fn(),create:jest.fn(),photo:jest.fn(),announce:jest.fn(),upload:jest.fn()}}));
const options:InterventionOptions={teams:[],places:[{id:15,name:'Jardín de prueba'}],zones:[],catalogs:[
  {id:1,code:'CLASS',label:'Jardinería',typeCode:'INTERVENTION_CLASS',parentItemId:null},
  {id:2,code:'UNIT',label:'Unidad',typeCode:'MEASUREMENT_UNIT',parentItemId:null},
  {id:3,code:'COMPLETED',label:'Ejecutada',typeCode:'INTERVENTION_STATUS',parentItemId:null},
]};
const detail = ():Detail => ({id:10,code:'INT-000010',version:5,classItemId:1,typeItemId:null,scheduledDate:'2026-10-23',statusCode:'COMPLETED',planningStatusCode:'ASSIGNED',teamId:2,assignedToUserId:4,startedAt:'2026-10-22T10:00:00Z',completedAt:'2026-10-22T11:00:00Z',validatedAt:null,locationCount:2,completedLocationCount:2,validatedLocationCount:0,pendingEvidenceCount:0,approvedForCounting:false,description:'Actividad en dos jardines',originItemId:1,reportedByItemId:2,externalCode:null,requestedAt:null,responsibleSupervisorUserId:3,quantityTotals:[],history:[],evidences:[],locations:[
  {id:21,clientReference:'a',zoneId:null,placeId:15,location:null,description:'Jardín A',locationDescription:'Jardín A',elementIds:[],unitItemId:2,requestedQuantity:2,progressQuantity:2,executedQuantity:2,statusCode:'COMPLETED',executionNotes:'Trabajo terminado',attemptNumber:1,allowedActions:['validate','observe']},
  {id:22,clientReference:'b',zoneId:null,placeId:15,location:null,description:'Jardín B',locationDescription:'Jardín B',elementIds:[],unitItemId:2,requestedQuantity:2,statusCode:'COMPLETED',attemptNumber:1,allowedActions:['validate','observe']},
]});
beforeEach(()=>{jest.clearAllMocks();role='COORDINADOR';jest.mocked(interventionsApi.options).mockResolvedValue(options);jest.mocked(interventionsApi.detail).mockResolvedValue(detail());});

it('agrega ubicaciones y registra una intervención sin crypto.randomUUID',async()=>{
  const original=Object.getOwnPropertyDescriptor(global.crypto,'randomUUID');
  Object.defineProperty(global.crypto,'randomUUID',{configurable:true,value:undefined});
  try {
    jest.mocked(interventionsApi.create).mockResolvedValue(detail());
    render(<InterventionForm/>);
    await waitFor(()=>expect(screen.getByRole('button',{name:'Agregar ubicación'})).toBeEnabled());
    fireEvent.click(screen.getByRole('button',{name:'Agregar ubicación'}));
    fireEvent.click(screen.getByRole('button',{name:'Agregar ubicación'}));
    expect(screen.getAllByLabelText('Lugar')).toHaveLength(2);
    fireEvent.change(screen.getByLabelText(/Clase/),{target:{value:'1'}});
    fireEvent.change(screen.getByLabelText('Fecha programada'),{target:{value:'2026-10-29'}});
    for(const select of screen.getAllByLabelText('Lugar'))fireEvent.change(select,{target:{value:'15'}});
    fireEvent.click(screen.getByRole('button',{name:'Crear intervención'}));
    await waitFor(()=>expect(interventionsApi.create).toHaveBeenCalledTimes(1));
    const [body,key]=jest.mocked(interventionsApi.create).mock.calls[0];
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(key).toMatch(uuid);
    expect(body.locations[0].clientReference).toMatch(uuid);
    expect(body.locations[1].clientReference).toMatch(uuid);
    expect(body.locations[0].clientReference).not.toBe(body.locations[1].clientReference);
  } finally {
    if(original)Object.defineProperty(global.crypto,'randomUUID',original);
    else Reflect.deleteProperty(global.crypto,'randomUUID');
  }
});

it('aprueba únicamente la ubicación elegida y conserva la actividad hasta aprobar todas',async()=>{
  const d=detail();d.version=6;d.locations[0].statusCode='VALIDATED';d.locations[0].allowedActions=[];d.validatedLocationCount=1;
  jest.mocked(interventionsApi.command).mockResolvedValue(d);
  render(<InterventionDetail id={10}/>);
  await screen.findByText('INT-000010');fireEvent.click(screen.getAllByRole('button',{name:'Aprobar'})[0]);
  const modal=await screen.findByRole('dialog');expect(within(modal).getByText(/únicamente esta ubicación/)).toBeInTheDocument();
  fireEvent.click(within(modal).getByRole('button',{name:'Confirmar'}));
  await waitFor(()=>expect(interventionsApi.command).toHaveBeenCalledWith(10,21,'validate',{version:5}));
  expect(await screen.findByText('2/2 ubicaciones terminadas · 1/2 aprobadas')).toBeInTheDocument();
  expect(screen.getByText(/contará cuando el coordinador apruebe todas/)).toBeInTheDocument();
});
it('el capataz puede corregir y no recibe botones de aprobación',async()=>{
  role='SUPERVISOR';const d=detail();d.locations[0].statusCode='OBSERVED';d.locations[0].allowedActions=['reopen'];d.locations[1].allowedActions=[];
  jest.mocked(interventionsApi.detail).mockResolvedValue(d);render(<InterventionDetail id={10}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Corregir observación'}));
  expect(screen.queryByRole('button',{name:'Aprobar'})).not.toBeInTheDocument();
  expect(screen.getByText(/nuevo intento/)).toBeInTheDocument();
});
it('una observación requiere motivo antes de enviarse',async()=>{
  render(<InterventionDetail id={10}/>);fireEvent.click((await screen.findAllByRole('button',{name:'Observar'}))[1]);
  fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));expect(interventionsApi.command).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/Motivo de la observación/),{target:{value:'Falta atender una esquina'}});
  jest.mocked(interventionsApi.command).mockResolvedValue(detail());fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));
  await waitFor(()=>expect(interventionsApi.command).toHaveBeenCalledWith(10,22,'observe',{version:5,reason:'Falta atender una esquina'}));
});
it('conserva el reporte tras conflicto y permite recargar la versión antes del reintento',async()=>{
  role='SUPERVISOR';const d=detail();d.locations[0].allowedActions=['complete'];d.locations[0].statusCode='IN_PROGRESS';d.locations[1].allowedActions=[];
  jest.mocked(interventionsApi.detail).mockResolvedValue(d);jest.mocked(interventionsApi.command).mockRejectedValueOnce(new ApiError(409,'Intervention has changed; reload before retrying'));
  render(<InterventionDetail id={10}/>);fireEvent.click(await screen.findByRole('button',{name:'Reportar terminada'}));
  fireEvent.change(screen.getByLabelText('Reporte de ejecución'),{target:{value:'Reporte que se conserva'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));await screen.findByText(/El trabajo cambió/);
  jest.mocked(interventionsApi.detail).mockResolvedValue({...d,version:6});fireEvent.click(screen.getByRole('button',{name:'Recargar datos y conservar borrador'}));
  await screen.findByText(/Datos recargados/);expect(screen.getByLabelText('Reporte de ejecución')).toHaveValue('Reporte que se conserva');
  jest.mocked(interventionsApi.command).mockResolvedValue({...d,version:7});fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));
  await waitFor(()=>expect(interventionsApi.command).toHaveBeenLastCalledWith(10,21,'complete',{version:6,executedQuantity:2,executionNotes:'Reporte que se conserva'}));
});
it('no permite crear un trabajo al capataz',()=>{
  role='SUPERVISOR';render(<InterventionForm/>);expect(screen.getByText(/No tienes permiso para planificar/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Crear intervención'})).not.toBeInTheDocument();
});
it('recupera una subida fallida sin anunciar otra foto',async()=>{
  Object.defineProperty(global.crypto,'randomUUID',{configurable:true,value:jest.fn().mockImplementation(()=>`photo-${Math.random()}`)});
  role='SUPERVISOR';const d=detail();d.locations[0].allowedActions=['evidence'];d.locations[0].statusCode='IN_PROGRESS';d.locations[1].allowedActions=[];
  jest.mocked(interventionsApi.detail).mockResolvedValue(d);
  jest.mocked(interventionsApi.announce).mockResolvedValue({id:8});
  jest.mocked(interventionsApi.upload).mockRejectedValueOnce(new ApiError(503,'Unavailable')).mockResolvedValueOnce({});
  render(<InterventionDetail id={10}/>);
  const file=new File(['image'],'garden.png',{type:'image/png'});
  fireEvent.change(await screen.findByLabelText(/Foto JPEG/),{target:{files:[file]}});
  fireEvent.click(screen.getByRole('button',{name:'Subir foto'}));
  await screen.findByRole('alert');await waitFor(()=>expect(screen.getByRole('button',{name:'Reintentar subida'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Reintentar subida'}));
  await waitFor(()=>expect(interventionsApi.upload).toHaveBeenCalledTimes(2));
  expect(interventionsApi.announce).toHaveBeenCalledTimes(1);
  expect(jest.mocked(interventionsApi.upload).mock.calls).toEqual([[10,8,file],[10,8,file]]);
});
it('crea una sola actividad con dos ubicaciones y reintenta con la misma clave tras perder conexión',async()=>{
  Object.defineProperty(global.crypto,'randomUUID',{configurable:true,value:jest.fn().mockImplementation(()=>`ref-${Math.random()}`)});
  jest.mocked(interventionsApi.create).mockRejectedValueOnce(new ApiError(0,'Sin conexión')).mockResolvedValueOnce(detail());
  render(<InterventionForm/>);await waitFor(()=>expect(screen.getByRole('button',{name:'Agregar ubicación'})).toBeEnabled());
  fireEvent.change(screen.getByLabelText(/Clase/),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Fecha programada'),{target:{value:'2026-10-23'}});
  fireEvent.click(screen.getByRole('button',{name:'Agregar ubicación'}));fireEvent.click(screen.getByRole('button',{name:'Agregar ubicación'}));
  for(const select of screen.getAllByLabelText('Lugar'))fireEvent.change(select,{target:{value:'15'}});
  fireEvent.change(screen.getAllByLabelText('Agregar ejemplares por código (separados por comas)')[0],{target:{value:'EV-000001, EV-000002'}});
  fireEvent.click(screen.getByRole('button',{name:'Crear intervención'}));await screen.findByRole('button',{name:'Reintentar registro'});
  fireEvent.click(screen.getByRole('button',{name:'Reintentar registro'}));await waitFor(()=>expect(push).toHaveBeenCalledWith('/intervenciones/10'));
  const calls=jest.mocked(interventionsApi.create).mock.calls;expect(calls[0]).toEqual(calls[1]);expect(calls[0][0].locations).toHaveLength(2);
  expect(calls[0][0].locations[0].elementCodes).toEqual(['EV-000001','EV-000002']);
});
