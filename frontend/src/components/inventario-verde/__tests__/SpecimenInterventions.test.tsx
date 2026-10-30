import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SpecimenInterventions } from '../SpecimenInterventions';
import { InterventionsList } from '@/components/interventions/InterventionsList';
import { interventionsApi, type InterventionPage, type InterventionSummary } from '@/lib/interventions-api';
import { ApiError } from '@/lib/api';

let reader:{id:number;role:{code:string}} | null;
jest.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:reader,isLoading:false})}));
jest.mock('@/hooks/useCatalog',()=>({useCatalog:()=>({items:[{code:'COMPLETED',label:'Ejecutada'}],isLoading:false,errorMessage:null})}));
jest.mock('@/lib/interventions-api',()=>({...jest.requireActual('@/lib/interventions-api'),interventionsApi:{list:jest.fn()}}));
function page(code='INT-000001',number=0):InterventionPage {
  const work:InterventionSummary={id:1,code,version:2,classItemId:1,typeItemId:null,scheduledDate:'2026-10-29',planningStatusCode:'ASSIGNED',statusCode:'COMPLETED',teamId:1,assignedToUserId:2,startedAt:null,completedAt:null,validatedAt:null,locationCount:3,completedLocationCount:3,validatedLocationCount:0,pendingEvidenceCount:0,approvedForCounting:false};
  return {content:[work],page:{number,size:20,totalElements:21,totalPages:2}};
}
beforeEach(()=>{jest.clearAllMocks();reader={id:1,role:{code:'SUPERVISOR'}};jest.mocked(interventionsApi.list).mockResolvedValue(page());});

it('la ficha pública no solicita ni muestra trabajos privados sin sesión',()=>{
  reader=null;render(<SpecimenInterventions code="EV-000001"/>);
  expect(interventionsApi.list).not.toHaveBeenCalled();expect(screen.queryByText('Intervenciones del ejemplar')).not.toBeInTheDocument();
});
it('muestra cada actividad y conserva el ejemplar al paginar o abrir el listado',async()=>{
  render(<SpecimenInterventions code="EV-000001"/>);
  const link=await screen.findByRole('link',{name:'INT-000001'});expect(link).toHaveAttribute('href','/intervenciones/1');
  expect(screen.getByRole('link',{name:'Abrir listado filtrado por este ejemplar'})).toHaveAttribute('href','/intervenciones?greenElementCode=EV-000001');
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
  fireEvent.click(screen.getByRole('button',{name:'Siguiente'}));
  await waitFor(()=>expect(interventionsApi.list).toHaveBeenLastCalledWith(1,'','','','EV-000001'));
});
it('distingue ausencia de trabajos autorizados de un fallo recuperable',async()=>{
  jest.mocked(interventionsApi.list).mockRejectedValueOnce(new ApiError(503,'Unavailable'));
  render(<SpecimenInterventions code="EV-000001"/>);
  await screen.findByRole('alert');expect(screen.queryByText(/No hay intervenciones vinculadas/)).not.toBeInTheDocument();
  jest.mocked(interventionsApi.list).mockResolvedValue({content:[],page:{number:0,size:20,totalElements:0,totalPages:0}});
  fireEvent.click(screen.getByRole('button',{name:'Reintentar historial'}));
  expect(await screen.findByText('No hay intervenciones vinculadas a este ejemplar disponibles para tu cuenta.')).toBeInTheDocument();
});
it('descarta respuestas tardías del ejemplar anterior',async()=>{
  let resolveFirst!:(value:InterventionPage)=>void;
  jest.mocked(interventionsApi.list).mockImplementationOnce(()=>new Promise(resolve=>{resolveFirst=resolve;})).mockResolvedValueOnce(page('INT-NUEVA'));
  const view=render(<SpecimenInterventions code="EV-000001"/>);
  view.rerender(<SpecimenInterventions code="EV-000002"/>);
  await screen.findByRole('link',{name:'INT-NUEVA'});
  await act(async()=>resolveFirst(page('INT-ANTERIOR')));
  expect(screen.queryByRole('link',{name:'INT-ANTERIOR'})).not.toBeInTheDocument();
});
it('limpia el historial al cambiar de lector y al cerrar sesión',async()=>{
  const view=render(<SpecimenInterventions code="EV-000001"/>);await screen.findByRole('link',{name:'INT-000001'});
  jest.mocked(interventionsApi.list).mockResolvedValue({content:[],page:{number:0,size:20,totalElements:0,totalPages:0}});
  reader={id:2,role:{code:'OPERARIO'}};view.rerender(<SpecimenInterventions code="EV-000001"/>);
  expect(screen.queryByRole('link',{name:'INT-000001'})).not.toBeInTheDocument();
  await screen.findByText(/No hay intervenciones vinculadas/);
  reader=null;view.rerender(<SpecimenInterventions code="EV-000001"/>);
  expect(screen.queryByText('Intervenciones del ejemplar')).not.toBeInTheDocument();
});
it('el listado conserva el ejemplar al filtrar por estado',async()=>{
  render(<InterventionsList greenElementCode="EV-000001"/>);await screen.findByRole('link',{name:'INT-000001'});
  fireEvent.change(screen.getByLabelText('Estado'),{target:{value:'COMPLETED'}});
  await waitFor(()=>expect(interventionsApi.list).toHaveBeenLastCalledWith(0,'COMPLETED','','','EV-000001'));
});
