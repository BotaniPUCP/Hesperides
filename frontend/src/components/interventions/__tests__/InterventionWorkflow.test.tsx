import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { InterventionDetail } from '../InterventionDetail';
import { InterventionForm } from '../InterventionForm';
import { activitiesApi, interventionsApi } from '@/lib/interventions-api';
import { ApiError } from '@/lib/api';
import { todayLocal, todayLima } from '@/lib/local-date';
import type { ActivityDetail, InterventionDetail as Detail, InterventionOptions } from '@/lib/interventions-api';
import { incidentsApi } from '@/lib/incidents-api';
import { approvedDetail } from '@/components/incidents/__fixtures__/incidents';

const push = jest.fn();
const toast = jest.fn();
let role = 'COORDINADOR';
jest.mock('next/navigation', () => ({useRouter:()=>({push,replace:push})}));
jest.mock('@/hooks/useAuth', () => ({useAuth:()=>({user:{id:3,role:{code:role}}})}));
jest.mock('@/hooks/useCatalog', () => ({useCatalog:()=>({items:[{code:'UNSPECIFIED',label:'Sin especificar'}],isLoading:false,errorMessage:null})}));
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return {...actual,useToast:()=>({showToast:toast})};
});
jest.mock('@/lib/interventions-api', () => {const interventionsApi={detail:jest.fn(),options:jest.fn(),command:jest.fn(),create:jest.fn(),update:jest.fn(),photo:jest.fn(),announce:jest.fn(),upload:jest.fn(),zoneOptions:jest.fn(),previewZones:jest.fn(),campusOptions:jest.fn(),campusPreview:jest.fn()};return {...jest.requireActual('@/lib/interventions-api'),interventionsApi,activitiesApi:{options:()=>interventionsApi.options().then((o:InterventionOptions)=>({...o,supervisors:[],statuses:[]})),create:jest.fn(),update:jest.fn(),detail:jest.fn(),mapOptions:jest.fn(async()=>campusOptions)}};});
jest.mock('@/lib/inventario-verde-api', () => ({inventarioVerdeApi:{specimen:jest.fn()}}));
jest.mock('@/lib/incidents-api', () => ({incidentsApi:{detail:jest.fn(),search:jest.fn(async()=>[])}}));
jest.mock('../InterventionCampusMap',()=>({InterventionCampusMap:({options,selected,onToggle}:{options:typeof campusOptions;selected:Detail['locations'];onToggle:(t:{kind:'area'|'specimen';id:number})=>void})=><div role="group" aria-label="Mapa del campus">{options.zones.map((z,i)=><button type="button" key={z.id} aria-pressed={selected.some(l=>l.zoneId===z.id)} onClick={()=>onToggle({kind:'area',id:z.id})}>{`Area ${i+1}`}</button>)}{options.specimens.map(s=><button type="button" key={s.id} onClick={()=>onToggle({kind:'specimen',id:s.id})}>Elegir ejemplar</button>)}</div>}));
const campusOptions={selectionRevision:'revision',zones:Array.from({length:7},(_,i)=>({id:101+i,code:`AV-${101+i}`,name:`Area ${i+1}`,geometryValid:true,geometry:{type:'Polygon',coordinates:[]},areaM2:100,point:{latitude:-12,longitude:-77},polygonCount:1})),specimens:[{id:91,code:'EV-91',name:'Palmera',point:{latitude:-12,longitude:-77},typeCode:'PALM',scientificName:'Palma',heightM:5,crownRadiusM:2,quantity:1}]};
async function selectZones(count=1) {
  const map=await screen.findByRole('group',{name:'Mapa del campus'});
  for(let i=0;i<count;i++)fireEvent.click(within(map).getAllByRole('button',{name:/^Area /})[i]);
  await waitFor(()=>expect(screen.getByRole('button',{name:/Crear actividad|Guardar y volver/})).toBeEnabled());
}
const options:InterventionOptions={teams:[],places:[{id:15,name:'Jardín de prueba'}],zones:[],catalogs:[
  {id:1,code:'CLASS',label:'Jardinería',typeCode:'INTERVENTION_CLASS',parentItemId:null},
  {id:2,code:'UNIT',label:'Unidad',typeCode:'MEASUREMENT_UNIT',parentItemId:null},
  {id:3,code:'COMPLETED',label:'Ejecutada',typeCode:'INTERVENTION_STATUS',parentItemId:null},
  {id:4,code:'FINDING',label:'Hallazgo',typeCode:'INTERVENTION_ORIGIN',parentItemId:null},
  {id:5,code:'SUPERVISION',label:'Supervisión',typeCode:'INCIDENT_SOURCE',parentItemId:null},
]};
const detail = ():Detail => ({id:10,code:'INT-000010',version:5,classItemId:1,typeItemId:null,scheduledDate:'2026-10-23',statusCode:'COMPLETED',planningStatusCode:'ASSIGNED',teamId:2,assignedToUserId:4,startedAt:'2026-10-22T10:00:00Z',completedAt:'2026-10-22T11:00:00Z',validatedAt:null,locationCount:2,completedLocationCount:2,validatedLocationCount:0,pendingEvidenceCount:0,approvedForCounting:false,description:'Actividad en dos jardines',originItemId:1,reportedByItemId:2,externalCode:null,requestedAt:null,responsibleSupervisorUserId:3,quantityTotals:[],history:[],evidences:[],locations:[
  {id:21,clientReference:'a',zoneId:null,placeId:15,location:null,description:'Jardín A',locationDescription:'Jardín A',elementIds:[],unitItemId:2,requestedQuantity:2,progressQuantity:2,executedQuantity:2,statusCode:'COMPLETED',executionNotes:'Trabajo terminado',attemptNumber:1,allowedActions:['validate','observe']},
  {id:22,clientReference:'b',zoneId:null,placeId:15,location:null,description:'Jardín B',locationDescription:'Jardín B',elementIds:[],unitItemId:2,requestedQuantity:2,statusCode:'COMPLETED',attemptNumber:1,allowedActions:['validate','observe']},
]});
const activityDetail=():ActivityDetail=>({...detail(),activityTitle:'Jardineria',percentage:null,executedAt:null,finishedAt:null,cancelledAt:null,cancellationReason:null,allowedActions:['planning'],executionBlockedUntil:null,campusSelectionRevision:'revision',plannedSurfaceM2:100,sourceIncidents:[],targets:[],history:[],evidences:[]});
beforeEach(()=>{jest.clearAllMocks();role='COORDINADOR';jest.mocked(activitiesApi.detail).mockResolvedValue({...activityDetail(),statusCode:'PLANNED'});jest.mocked(interventionsApi.campusOptions).mockResolvedValue(campusOptions);jest.mocked(interventionsApi.campusPreview).mockImplementation(async(_,zones,specimens)=>({surfaceM2:zones.length?175:0,areaCount:zones.length,specimenCount:specimens.length}));jest.mocked(interventionsApi.options).mockResolvedValue(options);jest.mocked(interventionsApi.detail).mockResolvedValue(detail());jest.mocked(incidentsApi.detail).mockResolvedValue(approvedDetail);});
afterEach(()=>jest.restoreAllMocks());

it('crea sin cuadrilla y permite elegir responsable opcional sin iniciar trabajo',async()=>{
  jest.spyOn(activitiesApi,'options').mockResolvedValue({catalogs:options.catalogs,statuses:[],supervisors:[{id:45,name:'Capataz de prueba'}]});
  jest.mocked(activitiesApi.create).mockResolvedValue(activityDetail());
  render(<InterventionForm/>);
  const responsible=await screen.findByLabelText('Capataz responsable (opcional)');
  await waitFor(()=>expect(responsible).toBeEnabled());
  expect(responsible).toHaveValue('');
  expect(screen.queryByLabelText(/Cuadrilla/)).not.toBeInTheDocument();
  fireEvent.change(responsible,{target:{value:'45'}});
  await selectZones();
  fireEvent.click(screen.getByRole('button',{name:'Crear actividad'}));
  await waitFor(()=>expect(activitiesApi.create).toHaveBeenCalledWith(expect.objectContaining({responsibleSupervisorUserId:45,planning:expect.objectContaining({classItemId:1})}),expect.any(String)));
  expect(interventionsApi.create).not.toHaveBeenCalled();
});

it('edita una planificación global con su versión y responsable mediante la API global',async()=>{
  jest.spyOn(activitiesApi,'options').mockResolvedValue({catalogs:options.catalogs,statuses:[],supervisors:[{id:45,name:'Capataz de prueba'}]});
  jest.mocked(activitiesApi.update).mockResolvedValue(activityDetail());
  const initial={...detail(),activityWorkflow:true,statusCode:'PLANNED',planningStatusCode:'PLANNED',startedAt:null,campusSelectionRevision:'revision',responsibleSupervisorUserId:null,
    locations:[{...detail().locations[0],zoneId:101,placeId:null,elementIds:[],zoneSelectionRevision:'revision'}]};
  render(<InterventionForm initial={initial}/>);
  await waitFor(()=>expect(screen.getByLabelText('Capataz responsable (opcional)')).toBeEnabled());
  fireEvent.change(screen.getByLabelText('Capataz responsable (opcional)'),{target:{value:'45'}});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar cambios'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));
  await waitFor(()=>expect(activitiesApi.update).toHaveBeenCalledWith(10,expect.objectContaining({responsibleSupervisorUserId:45,planning:expect.objectContaining({version:5})})));
  expect(interventionsApi.update).not.toHaveBeenCalled();
});

it('las actividades globales no muestran los comandos antiguos por ubicación',async()=>{
  jest.spyOn(activitiesApi,'options').mockResolvedValue({catalogs:options.catalogs,supervisors:[],statuses:[{id:1,code:'PLANNED',label:'Planificada'}]});
  jest.mocked(interventionsApi.detail).mockResolvedValue({...detail(),activityWorkflow:true,statusCode:'PLANNED',startedAt:null,planningStatusCode:'PLANNED',progressPercentage:null});
  render(<InterventionDetail id={10}/>);
  expect(await screen.findByText(/Sin avances registrados/)).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Editar planificación'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Asignar'})).not.toBeInTheDocument();
  expect(screen.queryByText('Intento')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Subsanar observación'})).not.toBeInTheDocument();
});
it('conserva un registro cerrado anterior como consulta sin comandos, cantidades ni contador de intentos',async()=>{
  jest.mocked(interventionsApi.detail).mockResolvedValue({...detail(),statusCode:'VALIDATED',history:[{id:2,actionCode:'PROGRESS_SAVED',actorUserId:3,actorName:'Ana',occurredAt:'2026-10-23T12:00:00Z',interventionLocationId:21,reason:null,attemptNumber:4,progress:{quantity:2,unitItemId:2,notes:'Reporte que se conserva'}}]});
  render(<InterventionDetail id={10}/>);
  expect(await screen.findByText('Reporte que se conserva')).toBeInTheDocument();
  expect(screen.getByText('Terminada')).toBeInTheDocument();
  expect(screen.queryByText(/Cantidad solicitada|Cantidad ejecutada|Intento|Cuadrilla/)).not.toBeInTheDocument();
  for(const name of ['Asignar','Registrar avance','Enviar a revisión','Subsanar observación','Observar','Aprobar'])expect(screen.queryByRole('button',{name})).not.toBeInTheDocument();
  expect(interventionsApi.command).not.toHaveBeenCalled();
});

it('habilita los tipos de la primera clase al abrir el formulario y registra esa selección',async()=>{
  jest.mocked(interventionsApi.options).mockResolvedValue({...options,catalogs:[...options.catalogs,
    {id:4,code:'PREPARATION',label:'Preparación del terreno',typeCode:'INTERVENTION_TYPE',parentItemId:1},
  ]});
  jest.mocked(activitiesApi.create).mockResolvedValue(activityDetail());
  render(<InterventionForm/>);
  const type=screen.getByLabelText(/Tipo/);
  await waitFor(()=>expect(type).toBeEnabled());
  expect(screen.getByLabelText(/Clase/)).toHaveValue('1');
  expect(within(type).getByRole('option',{name:'Preparación del terreno'})).toBeInTheDocument();
  fireEvent.change(type,{target:{value:'4'}});
  fireEvent.change(screen.getByLabelText('Fecha programada'),{target:{value:todayLima()}});

  await selectZones();
  fireEvent.click(screen.getByRole('button',{name:'Crear actividad'}));
  await waitFor(()=>expect(activitiesApi.create).toHaveBeenCalledWith(expect.objectContaining({planning:expect.objectContaining({classItemId:1,typeItemId:4})}),expect.any(String)));
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
    jest.mocked(activitiesApi.create).mockResolvedValue(activityDetail());
    render(<InterventionForm/>);
    await screen.findByRole('group',{name:'Mapa del campus'});


    fireEvent.change(screen.getByLabelText(/Clase/),{target:{value:'1'}});
    fireEvent.change(screen.getByLabelText('Fecha programada'),{target:{value:todayLima()}});
    await selectZones(2);
    fireEvent.click(screen.getByRole('button',{name:'Crear actividad'}));
    await waitFor(()=>expect(activitiesApi.create).toHaveBeenCalledTimes(1));
    const [body,key]=jest.mocked(activitiesApi.create).mock.calls[0];
    const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(key).toMatch(uuid);
    expect(body.planning.locations[0].clientReference).toMatch(uuid);
    expect(body.planning.locations[1].clientReference).toMatch(uuid);
    expect(body.planning.locations[0].clientReference).not.toBe(body.planning.locations[1].clientReference);
  } finally {
    if(original)Object.defineProperty(global.crypto,'randomUUID',original);
    else Reflect.deleteProperty(global.crypto,'randomUUID');
  }
});

it('no permite crear un trabajo al capataz',()=>{
  role='SUPERVISOR';render(<InterventionForm/>);expect(screen.getByText(/No tienes permiso para planificar/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Crear actividad'})).not.toBeInTheDocument();
});
it('crea una sola actividad con dos ubicaciones y reintenta con la misma clave tras perder conexión',async()=>{
  Object.defineProperty(global.crypto,'randomUUID',{configurable:true,value:jest.fn().mockImplementation(()=>`ref-${Math.random()}`)});
  jest.mocked(activitiesApi.create).mockRejectedValueOnce(new ApiError(0,'Sin conexión')).mockResolvedValueOnce(activityDetail());
  render(<InterventionForm/>);await screen.findByRole('group',{name:'Mapa del campus'});
  fireEvent.change(screen.getByLabelText(/Clase/),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Fecha programada'),{target:{value:todayLima()}});

    await selectZones(2);
  fireEvent.click(screen.getByRole('button',{name:'Crear actividad'}));await screen.findByRole('button',{name:'Reintentar registro'});
  fireEvent.click(screen.getByRole('button',{name:'Reintentar registro'}));await waitFor(()=>expect(push).toHaveBeenCalledWith('/intervenciones/10'));
  const calls=jest.mocked(activitiesApi.create).mock.calls;expect(calls[0]).toEqual(calls[1]);expect(calls[0][0].planning.locations).toHaveLength(2);
  expect(calls[0][0].planning.locations[0]).toMatchObject({elementCodes:[],location:null,unitItemId:null,requestedQuantity:null,zoneSelectionRevision:'revision'});
});

it('crea como hallazgo vinculada a la incidencia de origen y vuelve a ella con sus filtros (SPEC-201 §3.8)',async()=>{
  jest.mocked(activitiesApi.create).mockResolvedValue(activityDetail());
  render(<InterventionForm fromIncident={7} returnFilters={{search:'rama',status:'REPORTED',page:2}}/>);
  await screen.findByRole('group',{name:'Mapa del campus'});
  expect(screen.getByRole('link',{name:'Volver a la incidencia'})).toHaveAttribute('href','/incidencias/7?search=rama&status=REPORTED&page=2');
  expect(await screen.findByText('INC-2026-0007 · Rama en riesgo')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/Clasificación de origen del reporte/),{target:{value:'5'}});
  fireEvent.change(screen.getByLabelText(/Clase/),{target:{value:'1'}});
  fireEvent.change(screen.getByLabelText('Fecha programada'),{target:{value:todayLima()}});

  await selectZones();
  fireEvent.click(screen.getByRole('button',{name:'Guardar y volver a la incidencia'}));
  await waitFor(()=>expect(push).toHaveBeenCalledWith('/incidencias/7?search=rama&status=REPORTED&page=2'));
  expect(jest.mocked(activitiesApi.create).mock.calls[0][0].planning).toMatchObject({originItemId:4,reportedByItemId:5,incidentIds:[7]});
});

it('no habilita creación contextual si la incidencia no está activa',async()=>{
  jest.mocked(incidentsApi.detail).mockResolvedValue({...approvedDetail,incident:{...approvedDetail.incident,active:false,activatedAt:null}});
  render(<InterventionForm fromIncident={7}/>);
  expect(await screen.findByRole('button',{name:'Guardar y volver a la incidencia'})).toBeDisabled();
  expect(activitiesApi.create).not.toHaveBeenCalled();
});

it('una intervención nueva propone hoy como fecha programada',async()=>{
  render(<InterventionForm/>);
  expect(screen.getByLabelText('Fecha programada')).toHaveValue(todayLocal());
  await waitFor(()=>expect(interventionsApi.options).toHaveBeenCalled());
});

it('al editar conserva la fecha programada de la intervención',async()=>{
  render(<InterventionForm initial={detail()}/>);
  expect(screen.getByLabelText('Fecha programada')).toHaveValue('2026-10-23');
  await waitFor(()=>expect(interventionsApi.options).toHaveBeenCalled());
});

it('usa un solo mapa sin lugares y muestra las cinco últimas selecciones',async()=>{
  render(<InterventionForm/>);
  const map=await screen.findByRole('group',{name:'Mapa del campus'});
  expect(screen.queryByLabelText('Lugar')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Agregar lugar'})).not.toBeInTheDocument();
  for(const area of within(map).getAllByRole('button',{name:/^Area /}))fireEvent.click(area);
  const list=screen.getByRole('region',{name:'Selección actual'});
  expect(within(list).getAllByRole('button',{name:'Retirar'})).toHaveLength(5);
  expect(within(list).queryByText('Area 1')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Mostrar más'}));
  expect(within(list).getAllByRole('button',{name:'Retirar'})).toHaveLength(7);
  expect(within(list).getByText('Area 1')).toBeInTheDocument();
  expect(screen.queryByText('AV-101')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Mostrar menos'}));
  expect(within(list).getAllByRole('button',{name:'Retirar'})).toHaveLength(5);
});

it('permite seleccionar solo ejemplares sin añadir áreas ni inventar metros cuadrados',async()=>{
  jest.mocked(activitiesApi.create).mockResolvedValue(activityDetail());
  render(<InterventionForm/>);
  fireEvent.click(await screen.findByRole('button',{name:'Elegir ejemplar'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Crear actividad'})).toBeEnabled());
  expect(screen.getByText('0 jardines y 1 ejemplar seleccionado')).toBeInTheDocument();
  expect(screen.getByText(/Superficie seleccionada: 0 m²/)).toBeInTheDocument();
  expect(screen.getByText('Palmera')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Crear actividad'}));
  await waitFor(()=>expect(activitiesApi.create).toHaveBeenCalledWith(expect.objectContaining({planning:expect.objectContaining({campusSelectionRevision:'revision',locations:[expect.objectContaining({zoneId:null,placeId:null,elementIds:[91],location:null,requestedQuantity:null,unitItemId:null})]})}),expect.any(String)));
});

it('no añade automáticamente ejemplares al seleccionar un área y permite retirarla desde la lista',async()=>{
  render(<InterventionForm/>);await selectZones();
  expect(screen.getByText('1 jardín y 0 ejemplares seleccionados')).toBeInTheDocument();
  const surface=screen.getByText(/Superficie seleccionada:/);
  const list=screen.getByRole('region',{name:'Selección actual'});
  expect(surface.compareDocumentPosition(list)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'Retirar'}));
  expect(screen.getByRole('button',{name:'Crear actividad'})).toBeDisabled();
  expect(screen.queryByRole('region',{name:'Selección actual'})).not.toBeInTheDocument();
});

it('agrupa el cálculo de superficie cuando se seleccionan varios objetivos rápidamente',async()=>{
  render(<InterventionForm/>);
  const map=await screen.findByRole('group',{name:'Mapa del campus'});
  for(const area of within(map).getAllByRole('button',{name:/^Area /}).slice(0,3))fireEvent.click(area);
  await waitFor(()=>expect(interventionsApi.campusPreview).toHaveBeenCalledTimes(1));
  expect(interventionsApi.campusPreview).toHaveBeenLastCalledWith('revision',[101,102,103],[]);
});

it('descarta una superficie tardía después de desmarcar lo seleccionado',async()=>{
  let resolve!:(value:{surfaceM2:number;areaCount:number;specimenCount:number})=>void;
  jest.mocked(interventionsApi.campusPreview).mockReturnValueOnce(new Promise(r=>{resolve=r;}));
  render(<InterventionForm/>);
  const map=await screen.findByRole('group',{name:'Mapa del campus'});
  fireEvent.click(within(map).getAllByRole('button',{name:/^Area /})[0]);
  await waitFor(()=>expect(interventionsApi.campusPreview).toHaveBeenCalled());
  fireEvent.click(within(map).getAllByRole('button',{name:/^Area /})[0]);
  resolve({surfaceM2:999,areaCount:1,specimenCount:0});
  await waitFor(()=>expect(screen.getByRole('button',{name:'Crear actividad'})).toBeDisabled());
  expect(screen.queryByText(/999 m²/)).not.toBeInTheDocument();
});

it('conserva ID y UUID al editar una selección global y pide confirmar el inventario cambiado',async()=>{
  const initial={...detail(),campusSelectionRevision:'old',locations:[{...detail().locations[0],placeId:null,zoneId:101,zoneSelectionRevision:'old',elementIds:[]}]};
  jest.mocked(interventionsApi.update).mockResolvedValue(initial);
  render(<InterventionForm initial={initial}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Confirmar selección actual'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar cambios'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Guardar cambios'}));
  await waitFor(()=>expect(interventionsApi.update).toHaveBeenCalledWith(10,expect.objectContaining({campusSelectionRevision:'revision',locations:[expect.objectContaining({id:21,clientReference:'a',zoneId:101,placeId:null,zoneSelectionRevision:'revision',unitItemId:null,requestedQuantity:null,location:null})]})));
});

it('permite confirmar el inventario actualizado también durante una creación nueva',async()=>{
  render(<InterventionForm/>);await selectZones();
  jest.mocked(interventionsApi.campusOptions).mockResolvedValue({...campusOptions,selectionRevision:'new'});
  fireEvent.click(screen.getByRole('button',{name:'Actualizar mapa'}));
  fireEvent.click(await screen.findByRole('button',{name:'Confirmar selección actual'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Crear actividad'})).toBeEnabled());
  expect(interventionsApi.campusPreview).toHaveBeenLastCalledWith('new',[101],[]);
});

it('mantiene las últimas cinco áreas en el resumen y muestra también los ejemplares al expandir',async()=>{
  render(<InterventionForm/>);
  const map=await screen.findByRole('group',{name:'Mapa del campus'});
  for(const area of within(map).getAllByRole('button',{name:/^Area /}))fireEvent.click(area);
  fireEvent.click(screen.getByRole('button',{name:'Elegir ejemplar'}));
  const list=screen.getByRole('region',{name:'Selección actual'});
  expect(within(list).getAllByRole('button',{name:'Retirar'})).toHaveLength(5);
  expect(within(list).queryByText('Palmera')).not.toBeInTheDocument();
  expect(within(list).getByText('Area 3')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Mostrar más'}));
  expect(within(list).getByText('Palmera')).toBeInTheDocument();
  expect(within(list).getAllByRole('button',{name:'Retirar'})).toHaveLength(8);
});

it('impide registrar fechas pasadas y permite hoy o una fecha futura',async()=>{
  jest.mocked(activitiesApi.create).mockResolvedValue(activityDetail());
  render(<InterventionForm/>);
  await selectZones();
  const input=screen.getByLabelText('Fecha programada');
  expect(input).toHaveAttribute('min',todayLima());
  fireEvent.change(input,{target:{value:'2000-01-01'}});
  fireEvent.submit(input.closest('form')!);
  expect(await screen.findByRole('alert')).toHaveTextContent('La fecha programada debe ser hoy o una fecha futura.');
  expect(activitiesApi.create).not.toHaveBeenCalled();
  fireEvent.change(input,{target:{value:'2099-01-01'}});
  fireEvent.submit(input.closest('form')!);
  await waitFor(()=>expect(activitiesApi.create).toHaveBeenCalledWith(expect.objectContaining({planning:expect.objectContaining({scheduledDate:'2099-01-01'})}),expect.any(String)));
});
