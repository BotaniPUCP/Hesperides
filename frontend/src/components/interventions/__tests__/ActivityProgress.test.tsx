import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { ActivityTargets } from '../ActivityTargets';
import { ActivityProgressForm } from '../ActivityProgressForm';
import { ActivityExecutionDetail } from '../ActivityExecutionDetail';
import { ActivityPhotos } from '../ActivityPhotos';
import { plannedMapOptions, progressProblem } from '../activityProgress';
import { activitiesApi, type ActivityDetail, type CampusOptions } from '@/lib/interventions-api';
import { ApiError } from '@/lib/api';

let role='SUPERVISOR';
jest.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:3,fullName:'Capataz Prueba',role:{code:role}}})}));
jest.mock('@/hooks/useCatalog',()=>({useCatalog:()=>({items:[{id:1,code:'UNSPECIFIED',label:'Sin especificar'}]})}));
jest.mock('@/components/forms/unsaved/useUnsavedChangesGuard',()=>({useUnsavedChangesGuard:()=>({confirm:(fn:()=>void)=>fn(),dialog:null})}));
jest.mock('../InterventionIncidentLinks',()=>({InterventionIncidentLinks:()=>null}));
jest.mock('next/dynamic',()=>({__esModule:true,default:()=>jest.requireMock('../InterventionCampusMap').InterventionCampusMap}));
jest.mock('../InterventionCampusMap',()=>({InterventionCampusMap:({options,onToggle,disabled,progressStates}:{options:CampusOptions;onToggle:(t:{kind:'area'|'specimen';id:number})=>void;disabled:boolean;progressStates:Record<string,string>})=><div aria-label="Mapa de avance">{options.zones.map(z=><button type="button" disabled={disabled} key={z.id} onClick={()=>onToggle({kind:'area',id:z.id})}>{z.name}: {progressStates[`area:${z.id}`]}</button>)}{options.specimens.map(s=><button type="button" disabled={disabled} key={s.id} onClick={()=>onToggle({kind:'specimen',id:s.id})}>{s.name}: {progressStates[`specimen:${s.id}`]}</button>)}</div>}));
jest.mock('@/lib/interventions-api',()=>({...jest.requireActual('@/lib/interventions-api'),activitiesApi:{options:jest.fn(),detail:jest.fn(),mapOptions:jest.fn(),progress:jest.fn(),announce:jest.fn(),upload:jest.fn(),photo:jest.fn(),cancel:jest.fn(),approve:jest.fn(),responsible:jest.fn()},interventionsApi:{campusOptions:jest.fn()}}));
const geometry={type:'Polygon',coordinates:[[[-77,-12],[-77.001,-12],[-77,-12.001],[-77,-12]]]};
const campus:CampusOptions={selectionRevision:'r',zones:[1,2].map(id=>({id,code:`AV-${id}`,name:`Jardín ${id}`,geometry,geometryValid:true,areaM2:100,point:{latitude:-12,longitude:-77},polygonCount:1})),specimens:[{id:10,code:'EV-10',name:'Palmera',point:{latitude:-12,longitude:-77},typeCode:'PALM',scientificName:'Palma',heightM:5,crownRadiusM:2,quantity:1}]};
const work=():ActivityDetail=>({id:7,code:'INT-7',activityTitle:'Mantenimiento',version:2,classItemId:1,typeItemId:null,scheduledDate:'2026-11-18',description:'Trabajo',statusCode:'PLANNED',percentage:null,responsibleSupervisorUserId:null,campusSelectionRevision:'r',plannedSurfaceM2:100,startedAt:null,executedAt:null,finishedAt:null,cancelledAt:null,cancellationReason:null,allowedActions:['progress'],executionBlockedUntil:null,sourceIncidents:[],evidences:[],history:[],targets:[
  {id:20,clientReference:'garden',zoneId:1,placeId:null,location:null,description:'Jardín 1',elementIds:[],statusCode:'NOT_STARTED',partialDescription:null,zoneBoundary:geometry},
  {id:21,clientReference:'palm',zoneId:null,placeId:null,location:null,description:'Palmera',elementIds:[10],statusCode:'NOT_STARTED',partialDescription:null},
]});
beforeEach(()=>{jest.clearAllMocks();role='SUPERVISOR';jest.mocked(activitiesApi.mapOptions).mockResolvedValue(campus);jest.mocked(activitiesApi.detail).mockResolvedValue(work());jest.mocked(activitiesApi.options).mockResolvedValue({catalogs:[],supervisors:[{id:3,name:'Capataz Prueba'}],statuses:[]});});

it('el nombre localiza en el mapa sin marcar avance; solo el checkbox cambia la fila',async()=>{
  const w=work(),change=jest.fn();
  const scroll=jest.fn();Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:scroll});
  render(<ActivityTargets activity={w} targets={w.targets.map(t=>({locationId:t.id,statusCode:t.statusCode,partialDescription:null}))} onChange={change}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Jardín 1: ver en mapa'}));
  expect(change).not.toHaveBeenCalled();expect(scroll).toHaveBeenCalled();
  expect(screen.getByRole('checkbox',{name:'Jardín 1'})).not.toBeChecked();
  fireEvent.click(screen.getByRole('checkbox',{name:'Jardín 1'}));
  expect(change).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({locationId:20,statusCode:'COMPLETED'})]));
});

it('identifica los campos obligatorios y muestra los errores junto a cada campo',async()=>{
  render(<ActivityProgressForm initial={work()} onSaved={jest.fn()} onClose={jest.fn()}/>);
  expect(screen.getByText(/Los campos marcados con/)).toBeInTheDocument();
  const percentage=screen.getByLabelText('Porcentaje acumulado (%)'),description=screen.getByLabelText('Descripción del avance');
  expect(percentage).toBeRequired();expect(description).toBeRequired();
  fireEvent.click(await screen.findByRole('checkbox',{name:'Jardín 1'}));
  fireEvent.click(screen.getAllByRole('button',{name:'Avance parcial'})[0]);
  const partial=screen.getByLabelText('Descripción parcial de Jardín 1');expect(partial).toBeRequired();
  fireEvent.change(percentage,{target:{value:''}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar avance'}));
  expect(percentage).toHaveAttribute('aria-invalid','true');expect(description).toHaveAttribute('aria-invalid','true');
  expect(partial).toHaveAttribute('aria-invalid','true');expect(partial).toHaveAccessibleDescription('Describe el avance parcial de este objetivo.');
  expect(activitiesApi.progress).not.toHaveBeenCalled();
});

it('al registrar avance contrae los detalles y mantiene título, estado y porcentaje visibles',async()=>{
  render(<ActivityExecutionDetail id={7}/>);
  fireEvent.click(await screen.findByRole('button',{name:'Subir avance'}));
  const details=screen.getByText('Detalles de la actividad').closest('details');
  expect(details).not.toHaveAttribute('open');expect(within(details!).getByText('Trabajo')).toBeInTheDocument();
  expect(screen.getByRole('heading',{name:'Mantenimiento'})).toBeVisible();
  expect(screen.getByText('Planificada')).toBeVisible();
  expect(screen.getByText(/Avance acumulado: Sin avances registrados/)).toBeVisible();
});

it('sincroniza mapa y lista y conserva la descripción parcial; no incluye jardines ajenos',async()=>{
  const w=work();
  function Harness(){const [targets,setTargets]=useState(w.targets.map(t=>({locationId:t.id,statusCode:t.statusCode,partialDescription:t.partialDescription})));return <ActivityTargets activity={w} targets={targets} onChange={setTargets}/>;}
  render(<Harness/>);
  const map=await screen.findByLabelText('Mapa de avance');
  expect(within(map).queryByText(/Jardín 2/)).not.toBeInTheDocument();
  fireEvent.click(within(map).getByRole('button',{name:'Jardín 1: NOT_STARTED'}));
  expect(screen.getByRole('checkbox',{name:'Jardín 1'})).toBeChecked();
  fireEvent.click(screen.getAllByRole('button',{name:'Avance parcial'})[0]);
  fireEvent.change(screen.getByLabelText('Descripción parcial de Jardín 1'),{target:{value:'Se limpió la mitad'}});
  expect(within(map).getByRole('button',{name:'Jardín 1: PARTIAL'})).toBeInTheDocument();
  fireEvent.click(screen.getByRole('checkbox',{name:'Jardín 1'}));
  expect(within(map).getByRole('button',{name:'Jardín 1: NOT_STARTED'})).toBeInTheDocument();
  expect(screen.queryByLabelText('Descripción parcial de Jardín 1')).not.toBeInTheDocument();
});

it('mantiene los polígonos planificados y los objetivos retirados en la lista',async()=>{
  const w=work();const restricted=plannedMapOptions(w,{...campus,zones:[],specimens:[]});
  expect(restricted.zones[0].geometry).toEqual(geometry);
  jest.mocked(activitiesApi.mapOptions).mockRejectedValue(new Error('Sin red'));
  render(<ActivityTargets activity={w} targets={w.targets.map(t=>({locationId:t.id,statusCode:t.statusCode,partialDescription:null}))} onChange={jest.fn()}/>);
  expect(await screen.findByText(/Puedes usar la lista/)).toBeInTheDocument();
  expect(screen.getByRole('checkbox',{name:'Palmera'})).toBeEnabled();
});
it('conserva un objetivo anterior agrupado y refleja todas sus partes sin crear objetivos nuevos',async()=>{
  const w={...work(),targets:[{...work().targets[0],elementIds:[10,11]}]};
  jest.mocked(activitiesApi.mapOptions).mockResolvedValue({...campus,specimens:[...campus.specimens,{...campus.specimens[0],id:11,code:'EV-11',name:'Ficus'}]});
  function Harness(){const [targets,setTargets]=useState(w.targets.map(t=>({locationId:t.id,statusCode:t.statusCode,partialDescription:t.partialDescription})));return <ActivityTargets activity={w} targets={targets} onChange={setTargets}/>;}
  render(<Harness/>);const map=await screen.findByLabelText('Mapa de avance');
  fireEvent.click(within(map).getByRole('button',{name:'Ficus: NOT_STARTED'}));
  expect(screen.getAllByRole('checkbox')).toHaveLength(1);expect(screen.getByRole('checkbox')).toBeChecked();
  expect(within(map).getByRole('button',{name:'Jardín 1: COMPLETED'})).toBeInTheDocument();
  expect(within(map).getByRole('button',{name:'Palmera: COMPLETED'})).toBeInTheDocument();
});

it('valida porcentaje manual y coherencia sin calcularlo por número de objetivos',()=>{
  const partial=[{locationId:20,statusCode:'PARTIAL' as const,partialDescription:'Mitad'}];
  expect(progressProblem(34.5,'Trabajo',partial)).toBeNull();
  expect(progressProblem(100,'Trabajo',partial)).toMatch(/100/);
  expect(progressProblem(101,'Trabajo',partial)).toMatch(/entre 0 y 100/);
  expect(progressProblem(1.111,'Trabajo',partial)).toMatch(/decimales/);
  expect(progressProblem(0,'Trabajo',[{...partial[0],statusCode:'NOT_STARTED',partialDescription:null}])).toBeNull();
  expect(progressProblem(70,'Trabajo',[{...partial[0],partialDescription:'  '}])).toMatch(/parcial/);
  expect(progressProblem(99,'Trabajo',[{...partial[0],statusCode:'COMPLETED',partialDescription:null}])).toMatch(/100/);
});

it('abrir y cerrar el formulario no inicia trabajo ni asigna responsable',async()=>{
  const close=jest.fn();render(<ActivityProgressForm initial={work()} onSaved={jest.fn()} onClose={close}/>);
  await screen.findByLabelText('Mapa de avance');
  fireEvent.click(screen.getByRole('button',{name:'Cerrar sin guardar'}));
  expect(close).toHaveBeenCalled();expect(activitiesApi.progress).not.toHaveBeenCalled();expect(activitiesApi.responsible).not.toHaveBeenCalled();
});

it('libera la URL privada de la foto al cerrar su vista',async()=>{
  const create=jest.fn(()=> 'blob:private-photo');const revoke=jest.fn();
  const originalCreate=URL.createObjectURL;const originalRevoke=URL.revokeObjectURL;
  URL.createObjectURL=create;URL.revokeObjectURL=revoke;
  try {
    jest.mocked(activitiesApi.photo).mockResolvedValue(new Blob(['photo'],{type:'image/png'}));
    const w={...work(),evidences:[{id:44,clientReference:'p',progressEntryId:1,locationId:20,caption:'Limpieza',uploadedByUserId:3,uploadedAt:'2026-11-18T12:00:00Z',fileUrl:'/private'}]};
    render(<ActivityPhotos work={w} onRefresh={jest.fn()}/>);
    fireEvent.click(screen.getByRole('button',{name:'Ver foto'}));
    expect(await screen.findByRole('img',{name:'Limpieza'})).toHaveAttribute('src','blob:private-photo');
    expect(activitiesApi.photo).toHaveBeenCalledWith(7,44);
    fireEvent.click(screen.getByRole('button',{name:'Cerrar'}));
    await waitFor(()=>expect(revoke).toHaveBeenCalledWith('blob:private-photo'));
  }finally{URL.createObjectURL=originalCreate;URL.revokeObjectURL=originalRevoke;}
});

it('guarda una instantánea global con porcentaje acumulado y descripción parcial',async()=>{
  const saved=jest.fn();jest.mocked(activitiesApi.progress).mockResolvedValue({...work(),statusCode:'IN_PROGRESS',percentage:30});
  render(<ActivityProgressForm initial={work()} onSaved={saved} onClose={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Porcentaje acumulado (%)'),{target:{value:'30'}});
  fireEvent.change(screen.getByLabelText('Descripción del avance'),{target:{value:'Limpieza parcial'}});
  fireEvent.click(screen.getByRole('checkbox',{name:'Jardín 1'}));fireEvent.click(screen.getAllByRole('button',{name:'Avance parcial'})[0]);
  fireEvent.change(screen.getByLabelText('Descripción parcial de Jardín 1'),{target:{value:'Falta el borde'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar avance'}));
  await waitFor(()=>expect(saved).toHaveBeenCalled());
  expect(activitiesApi.progress).toHaveBeenCalledWith(7,expect.objectContaining({version:2,percentage:30,description:'Limpieza parcial',evidenceIds:[],targets:[{locationId:20,statusCode:'PARTIAL',partialDescription:'Falta el borde'},{locationId:21,statusCode:'NOT_STARTED',partialDescription:null}]}));
});

it('conserva exactamente el envío cuando se pierde la respuesta',async()=>{
  jest.mocked(activitiesApi.progress).mockRejectedValueOnce(new ApiError(0,'Sin red')).mockResolvedValueOnce({...work(),percentage:20});
  render(<ActivityProgressForm initial={work()} onSaved={jest.fn()} onClose={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Porcentaje acumulado (%)'),{target:{value:'20'}});fireEvent.change(screen.getByLabelText('Descripción del avance'),{target:{value:'Avance'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar avance'}));
  const retry=await screen.findByRole('button',{name:'Reintentar el mismo avance'});
  expect(screen.getByLabelText('Porcentaje acumulado (%)')).toBeDisabled();fireEvent.click(retry);
  await waitFor(()=>expect(activitiesApi.progress).toHaveBeenCalledTimes(2));
  expect(jest.mocked(activitiesApi.progress).mock.calls[0]).toEqual(jest.mocked(activitiesApi.progress).mock.calls[1]);
});

it('una versión en conflicto conserva el borrador y exige cargar la versión actual',async()=>{
  jest.mocked(activitiesApi.progress).mockRejectedValueOnce(new ApiError(409,'Activity has changed; reload before retrying'));
  jest.mocked(activitiesApi.detail).mockResolvedValue({...work(),version:9});
  render(<ActivityProgressForm initial={work()} onSaved={jest.fn()} onClose={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Porcentaje acumulado (%)'),{target:{value:'25'}});fireEvent.change(screen.getByLabelText('Descripción del avance'),{target:{value:'Mi borrador'}});
  fireEvent.click(screen.getByRole('button',{name:'Guardar avance'}));
  fireEvent.click(await screen.findByRole('button',{name:'Cargar versión actual y conservar mi borrador'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar avance'})).toBeEnabled());
  expect(screen.getByLabelText('Descripción del avance')).toHaveValue('Mi borrador');
  fireEvent.click(screen.getByRole('button',{name:'Guardar avance'}));
  await waitFor(()=>expect(activitiesApi.progress).toHaveBeenCalledTimes(2));
  expect(jest.mocked(activitiesApi.progress).mock.calls[1][1]).toMatchObject({version:9,percentage:25});
  expect(jest.mocked(activitiesApi.progress).mock.calls[1][1].clientReference).not.toBe(jest.mocked(activitiesApi.progress).mock.calls[0][1].clientReference);
});

it('permite corregir desde 100 antes de la aprobación, sin reabrir intentos',async()=>{
  const w={...work(),statusCode:'EXECUTED',percentage:100,targets:work().targets.map(t=>({...t,statusCode:'COMPLETED' as const}))};
  jest.mocked(activitiesApi.progress).mockResolvedValue({...w,statusCode:'IN_PROGRESS',percentage:80});
  render(<ActivityProgressForm initial={w} onSaved={jest.fn()} onClose={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Porcentaje acumulado (%)'),{target:{value:'80'}});fireEvent.change(screen.getByLabelText('Descripción del avance'),{target:{value:'Corrección'}});
  fireEvent.click(screen.getByRole('checkbox',{name:'Palmera'}));fireEvent.click(screen.getByRole('button',{name:'Guardar avance'}));
  await waitFor(()=>expect(activitiesApi.progress).toHaveBeenCalledWith(7,expect.objectContaining({percentage:80})));
  expect(screen.queryByText(/Intento|Subsanar|Enviar a revisión/)).not.toBeInTheDocument();
});

it('sube fotos con el mismo anuncio y archivo al reintentar y refresca la versión',async()=>{
  const evidence={id:44,clientReference:'photo',progressEntryId:null,locationId:20,caption:'Foto',uploadedByUserId:3,uploadedAt:null,fileUrl:null};
  jest.mocked(activitiesApi.announce).mockResolvedValue(evidence);jest.mocked(activitiesApi.upload).mockRejectedValueOnce(new ApiError(0,'Sin red')).mockResolvedValueOnce({...evidence,uploadedAt:'2026-11-18T12:00:00Z'});
  const refresh=jest.fn(async()=>undefined);render(<ActivityPhotos work={work()} editable onRefresh={refresh}/>);
  fireEvent.click(screen.getByRole('button',{name:'Agregar foto'}));
  const file=new File(['image'],'trabajo.png',{type:'image/png'});
  fireEvent.change(screen.getByLabelText(/Foto JPEG/),{target:{files:[file]}});fireEvent.change(screen.getByLabelText('Objetivo de la foto'),{target:{value:'20'}});
  fireEvent.click(screen.getByRole('button',{name:'Subir foto'}));
  await screen.findByRole('button',{name:'Reintentar subida de foto'});
  fireEvent.click(within(screen.getByRole('dialog',{name:'Agregar foto al avance'})).getAllByRole('button',{name:'Cerrar'})[0]);
  fireEvent.click(screen.getByRole('button',{name:'Continuar subida de foto'}));
  expect(screen.getByText('Archivo por confirmar: trabajo.png')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Reintentar subida de foto'}));
  await waitFor(()=>expect(refresh).toHaveBeenCalled());
  expect(activitiesApi.announce).toHaveBeenCalledTimes(1);expect(activitiesApi.upload).toHaveBeenNthCalledWith(1,7,44,file);expect(activitiesApi.upload).toHaveBeenNthCalledWith(2,7,44,file);
  expect(activitiesApi.progress).not.toHaveBeenCalled();
});

it('incluye las fotos recibidas del autor y la versión posterior a la subida sin perder el borrador',async()=>{
  const evidence={id:44,clientReference:'p',progressEntryId:null,locationId:20,caption:'Foto',uploadedByUserId:3,uploadedAt:'2026-11-18T12:00:00Z',fileUrl:'/private'};
  jest.mocked(activitiesApi.announce).mockResolvedValue({...evidence,uploadedAt:null});jest.mocked(activitiesApi.upload).mockResolvedValue(evidence);
  jest.mocked(activitiesApi.detail).mockResolvedValue({...work(),version:8,evidences:[evidence]});
  jest.mocked(activitiesApi.progress).mockResolvedValue({...work(),percentage:20});
  render(<ActivityProgressForm initial={work()} onSaved={jest.fn()} onClose={jest.fn()}/>);
  fireEvent.change(screen.getByLabelText('Porcentaje acumulado (%)'),{target:{value:'20'}});fireEvent.change(screen.getByLabelText('Descripción del avance'),{target:{value:'Mi avance con foto'}});
  fireEvent.click(screen.getByRole('button',{name:'Agregar foto'}));
  fireEvent.change(screen.getByLabelText(/Foto JPEG/),{target:{files:[new File(['image'],'foto.png',{type:'image/png'})]}});
  fireEvent.click(screen.getByRole('button',{name:'Subir foto'}));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Guardar avance'})).toBeEnabled());
  fireEvent.click(screen.getByRole('button',{name:'Guardar avance'}));
  await waitFor(()=>expect(activitiesApi.progress).toHaveBeenCalledWith(7,expect.objectContaining({version:8,percentage:20,description:'Mi avance con foto',evidenceIds:[44]})));
});

it('muestra cinco fotos recibidas y permite desplegar las demás sin incluir anuncios pendientes',()=>{
  const evidences=Array.from({length:7},(_,i)=>({id:i+1,clientReference:`photo-${i}`,progressEntryId:1,locationId:20,caption:`Foto ${i+1}`,uploadedByUserId:3,uploadedAt:i===6?null:'2026-11-18T12:00:00Z',fileUrl:i===6?null:'/private'}));
  render(<ActivityPhotos work={{...work(),evidences}} onRefresh={jest.fn()}/>);
  expect(screen.getByRole('heading',{name:'Foto de la actividad'})).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:'Ver foto'})).toHaveLength(5);
  fireEvent.click(screen.getByRole('button',{name:'Mostrar más'}));
  expect(screen.getAllByRole('button',{name:'Ver foto'})).toHaveLength(6);
  fireEvent.click(screen.getByRole('button',{name:'Mostrar menos'}));
  expect(screen.getAllByRole('button',{name:'Ver foto'})).toHaveLength(5);
});

it('abre la carga en un modal con campos obligatorios y libera el archivo al cancelar',()=>{
  const onPending=jest.fn();render(<ActivityPhotos work={work()} editable onRefresh={jest.fn()} onPending={onPending}/>);
  expect(screen.queryByLabelText('Objetivo de la foto')).not.toBeInTheDocument();
  expect(screen.getByText('Aún no hay fotos recibidas.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Agregar foto'}));
  const modal=screen.getByRole('dialog',{name:'Agregar foto al avance'});
  expect(within(modal).getByLabelText('Momento')).toBeRequired();
  expect(within(modal).getByLabelText('Descripción de la foto')).not.toBeRequired();
  expect(within(modal).getByLabelText('Descripción de la foto').closest('label')).toHaveClass('sm:col-span-2');
  const file=within(modal).getByLabelText(/Foto JPEG/);expect(file).toBeRequired();expect(file).toHaveClass('file:cursor-pointer','hover:file:bg-neutral-100');
  fireEvent.change(file,{target:{files:[new File(['image'],'foto.png',{type:'image/png'})]}});
  expect(onPending).toHaveBeenLastCalledWith(true);
  fireEvent.click(within(modal).getAllByRole('button',{name:'Cerrar'})[0]);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(onPending).toHaveBeenLastCalledWith(false);
  expect(activitiesApi.announce).not.toHaveBeenCalled();
});

it('el coordinador aprueba o cancela con la versión vigente y motivo opcional',async()=>{
  role='COORDINADOR';jest.mocked(activitiesApi.detail).mockResolvedValue({...work(),statusCode:'EXECUTED',percentage:100,allowedActions:['approve','cancel','responsible']});
  jest.mocked(activitiesApi.cancel).mockResolvedValue({...work(),statusCode:'CANCELLED',allowedActions:[]});
  render(<ActivityExecutionDetail id={7}/>);
  expect(await screen.findByRole('button',{name:'Aprobar actividad'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Subir avance'})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Cancelar actividad'}));fireEvent.click(screen.getByRole('button',{name:'Confirmar'}));
  await waitFor(()=>expect(activitiesApi.cancel).toHaveBeenCalledWith(7,2,''));
  await waitFor(()=>expect(screen.queryByRole('button',{name:'Aprobar actividad'})).not.toBeInTheDocument());
});

it('muestra el historial global sin controles de edición en una actividad terminada',async()=>{
  jest.mocked(activitiesApi.detail).mockResolvedValue({...work(),statusCode:'FINISHED',percentage:100,allowedActions:[],history:[{id:1,actorUserId:3,actorName:'Ana',percentage:70,description:'Trabajo guardado',occurredAt:'2026-11-18T12:00:00Z',targets:[]}]});
  render(<ActivityExecutionDetail id={7}/>);
  expect(await screen.findByText(/70 % · Ana/)).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Subir avance'})).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});
it('continúa una actividad anterior sin inventar porcentaje y muestra el historial conservado',async()=>{
  jest.mocked(activitiesApi.detail).mockResolvedValue({...work(),statusCode:'IN_PROGRESS',legacyBaselinePending:true,previousHistory:[{id:9,actionCode:'PROGRESS_SAVED',actorUserId:3,actorName:'Ana',occurredAt:'2026-11-01T12:00:00Z',reason:null,interventionLocationId:20,progress:{quantity:5,unitItemId:1,notes:'Reporte original'}}]});
  render(<ActivityExecutionDetail id={7}/>);
  expect(await screen.findByText(/Porcentaje global pendiente de registrar/)).toBeInTheDocument();
  expect(screen.getByText('Reporte original')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Subir avance'})).toBeEnabled();
  expect(screen.queryByText(/Cantidad solicitada|Cantidad ejecutada|Intento/)).not.toBeInTheDocument();
});
