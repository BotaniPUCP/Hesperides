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

it('habilita los tipos de la primera clase al abrir el formulario y registra esa selección',async()=>{
  jest.mocked(interventionsApi.options).mockResolvedValue({...options,catalogs:[...options.catalogs,
    {id:4,code:'PREPARATION',label:'Preparación del terreno',typeCode:'INTERVENTION_TYPE',parentItemId:1},
  ]});
  jest.mocked(interventionsApi.create).mockResolvedValue(detail());
  render(<InterventionForm/>);
  const type=screen.getByLabelText(/Tipo/);
  await waitFor(()=>expect(type).toBeEnabled());
  expect(screen.getByLabelText(/Clase/)).toHaveValue('1');
  expect(within(type).getByRole('option',{name:'Preparación del terreno'})).toBeInTheDocument();
  fireEvent.change(type,{target:{value:'4'}});
  fireEvent.change(screen.getByLabelText('Fecha programada'),{target:{value:'2026-11-05'}});
  fireEvent.click(screen.getByRole('button',{name:'Agregar ubicación'}));
  fireEvent.change(screen.getByLabelText('Lugar'),{target:{value:'15'}});
  fireEvent.click(screen.getByRole('button',{name:'Crear intervención'}));
  await waitFor(()=>expect(interventionsApi.create).toHaveBeenCalledWith(expect.objectContaining({classItemId:1,typeItemId:4}),expect.any(String)));
});

it('conserva clase y tipo al editar y limpia el tipo si se cambia la clase',async()=>{
  jest.mocked(interventionsApi.options).mockResolvedValue({...options,catalogs:[...options.catalogs,
    {id:4,code:'PREPARATION',label:'Preparación del terreno',typeCode:'INTERVENTION_TYPE',parentItemId:1},
    {id:5,code:'PRUNING',label:'Poda',typeCode:'INTERVENTION_CLASS',parentItemId:null},
    {id:6,code:'FORMATIVE',label:'Poda de formación',typeCode:'INTERVENTION_TYPE',parentItemId:5},
  ]});
  render(<InterventionForm initial={{...detail(),classItemId:5,typeItemId:6}}/>);
  await waitFor(()=>expect(screen.getByLabelText(/Tipo/)).toBeEnabled());
  expect(screen.getByLabelText(/Clase/)).toHaveValue('5');
  expect(screen.getByLabelText(/Tipo/)).toHaveValue('6');
  fireEvent.change(screen.getByLabelText(/Clase/),{target:{value:'1'}});
  expect(screen.getByLabelText(/Tipo/)).toHaveValue('');
  expect(within(screen.getByLabelText(/Tipo/)).getByRole('option',{name:'Preparación del terreno'})).toBeInTheDocument();
  expect(screen.queryByRole('option',{name:'Poda de formación'})).not.toBeInTheDocument();
});

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
  fireEvent.click(await screen.findByRole('button',{name:'Subsanar observación'}));
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
it('mantiene visible la observación al iniciar una subsanación y actualizar la información',async()=>{
  role='SUPERVISOR';const observed=detail();
  observed.locations[0].statusCode='OBSERVED';observed.locations[0].allowedActions=['reopen'];
  observed.locations[0].rejectionReason='Falta podar la esquina norte';observed.locations[1].allowedActions=[];
  observed.history=[{id:30,actionCode:'OBSERVED',interventionLocationId:21,actorUserId:3,actorName:'Coordinador de prueba',attemptNumber:1,occurredAt:'2026-10-23T15:00:00Z',reason:'Falta podar la esquina norte'}];
  const reopened={...observed,version:6,locations:observed.locations.map((location,index)=>index===0?{...location,statusCode:'IN_PROGRESS',attemptNumber:2,rejectionReason:null,allowedActions:['execution']}:location)};
  jest.mocked(interventionsApi.detail).mockResolvedValue(observed);jest.mocked(interventionsApi.command).mockResolvedValue(reopened);
  render(<InterventionDetail id={10}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Subsanar observación'}));
  const modal=screen.getByRole('dialog');expect(within(modal).getByText('Falta podar la esquina norte')).toBeInTheDocument();
  fireEvent.click(within(modal).getByRole('button',{name:'Confirmar'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  const location=screen.getAllByRole('article')[0];
  expect(within(location).getByText('Falta podar la esquina norte')).toBeInTheDocument();
  expect(within(location).getByText(/intento 1/)).toBeInTheDocument();
  jest.mocked(interventionsApi.detail).mockResolvedValue(reopened);
  fireEvent.click(screen.getByRole('button',{name:'Actualizar información'}));
  await screen.findByRole('status');
  expect(within(location).getByText('Falta podar la esquina norte')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Registrar avance'}));
  expect(within(screen.getByRole('dialog')).getByText('Falta podar la esquina norte')).toBeInTheDocument();
});
it('muestra cantidades y notas de todos los avances por ubicación e intento, incluido cero',async()=>{
  const d=detail();
  d.history=[
    {id:1,actionCode:'PROGRESS_SAVED',interventionLocationId:21,actorUserId:4,actorName:'Operario de prueba',attemptNumber:1,occurredAt:'2026-10-22T15:00:00Z',reason:null,progress:{quantity:1,previousQuantity:null,notes:'Primera pasada',unitItemId:2}},
    {id:2,actionCode:'PROGRESS_SAVED',interventionLocationId:21,actorUserId:4,actorName:'Operario de prueba',attemptNumber:1,occurredAt:'2026-10-22T16:00:00Z',reason:null,progress:{quantity:0,previousQuantity:1,notes:'Cantidad corregida',unitItemId:2}},
    {id:3,actionCode:'PROGRESS_SAVED',interventionLocationId:22,actorUserId:4,attemptNumber:1,occurredAt:'2026-10-22T17:00:00Z',reason:null,progress:{quantity:9,notes:'Avance de otro jardín',unitItemId:2}},
    {id:4,actionCode:'PROGRESS_SAVED',interventionLocationId:21,actorUserId:3,actorName:'Capataz de prueba',attemptNumber:2,occurredAt:'2026-10-23T15:00:00Z',reason:null,progress:{quantity:2,notes:'Subsanación realizada',unitItemId:2}},
  ];
  jest.mocked(interventionsApi.detail).mockResolvedValue(d);render(<InterventionDetail id={10}/>);await screen.findByText('INT-000010');
  const location=within(screen.getAllByRole('article')[0]);const reports=within(location.getByRole('list',{name:'Avances registrados'}));
  expect(reports.getAllByRole('listitem')).toHaveLength(3);
  for(const text of ['Primera pasada','Cantidad corregida','Subsanación realizada'])expect(reports.getByText(text)).toBeInTheDocument();
  expect(reports.getByText(/Avance acumulado: 0/)).toBeInTheDocument();
  expect(reports.getByText(/intento 2.*Capataz de prueba/)).toBeInTheDocument();
  expect(reports.queryByText('Avance de otro jardín')).not.toBeInTheDocument();
});
it('conserva el reporte tras conflicto y permite recargar la versión antes del reintento',async()=>{
  role='SUPERVISOR';const d=detail();d.locations[0].allowedActions=['complete'];d.locations[0].statusCode='IN_PROGRESS';d.locations[1].allowedActions=[];
  jest.mocked(interventionsApi.detail).mockResolvedValue(d);jest.mocked(interventionsApi.command).mockRejectedValueOnce(new ApiError(409,'Intervention has changed; reload before retrying'));
  render(<InterventionDetail id={10}/>);fireEvent.click(await screen.findByRole('button',{name:'Enviar a revisión'}));
  fireEvent.change(screen.getByLabelText('Reporte de ejecución'),{target:{value:'Reporte que se conserva'}});
  fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));await screen.findByText(/El trabajo cambió/);
  jest.mocked(interventionsApi.detail).mockResolvedValue({...d,version:6});fireEvent.click(screen.getByRole('button',{name:'Actualizar información y conservar borrador'}));
  await screen.findByText(/Información actualizada/);expect(screen.getByLabelText('Reporte de ejecución')).toHaveValue('Reporte que se conserva');
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  jest.mocked(interventionsApi.command).mockResolvedValue({...d,version:7});fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));
  await waitFor(()=>expect(interventionsApi.command).toHaveBeenLastCalledWith(10,21,'complete',{version:6,executedQuantity:2,executionNotes:'Reporte que se conserva'}));
});
it('no permite crear un trabajo al capataz',()=>{
  role='SUPERVISOR';render(<InterventionForm/>);expect(screen.getByText(/No tienes permiso para planificar/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Crear intervención'})).not.toBeInTheDocument();
});
it('explica cuándo podrá ejecutarse una actividad futura y no ofrece acciones de ejecución',async()=>{
  role='SUPERVISOR';const d=detail();d.executionBlockedUntil='2026-12-01';
  d.locations=d.locations.map(location=>({...location,statusCode:'ASSIGNED',allowedActions:[]}));
  jest.mocked(interventionsApi.detail).mockResolvedValue(d);render(<InterventionDetail id={10}/>);
  expect(await screen.findByText(/El trabajo podrá ejecutarse desde el 2026-12-01/)).toBeInTheDocument();
  for(const name of ['Iniciar trabajo','Registrar avance','Enviar a revisión','Subsanar observación'])expect(screen.queryByRole('button',{name})).not.toBeInTheDocument();
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
