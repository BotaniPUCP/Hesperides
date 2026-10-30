import { fireEvent, render, screen } from '@testing-library/react';
import { LocationCompliancePanel } from '../LocationCompliancePanel';
import { maintenanceApi } from '@/lib/maintenance-api';
import { ApiError } from '@/lib/api';
import type { ComplianceReport } from '@shared/types';

jest.mock('@/lib/maintenance-api',()=>({maintenanceApi:{getCompliance:jest.fn()}}));
beforeEach(()=>jest.clearAllMocks());
const segment={status:'ON_TARGET' as const,evaluatedWithConfigId:1,observedValue:1,expectedValue:2,toleranceLimit:null,lastExecutionDate:'2026-10-19',periodStart:'2026-10-01',periodEnd:'2026-10-29',season:null,prorated:false,outOfSeason:0,explanation:'Trabajo registrado'};
const report:ComplianceReport={activityTypeItemId:1,activityTypeLabel:'Poda',regime:'IN_HOUSE',ruleTypeCode:'INTERVAL_DAYS',from:'2026-10-01',to:'2026-10-29',segments:[],locations:[{targetKind:'ZONE',targetId:7,targetLabel:'Jardín A',segments:[segment],executions:[{
  interventionId:4,interventionCode:'INT-000004',locationId:5,attemptNumber:1,targetKind:'ZONE',targetId:7,targetLabel:'Jardín A',zoneId:7,placeId:null,completedAt:'2026-10-20T03:00:00Z',validatedAt:'2026-10-22T17:00:00Z',approvedAt:'2026-10-22T17:00:00Z',executionDate:'2026-10-19',approvalDate:'2026-10-22',
}]}]};
function fillPeriod(){
  fireEvent.change(screen.getByLabelText('Fecha inicial'),{target:{value:'2026-10-01'}});
  fireEvent.change(screen.getByLabelText('Fecha final'),{target:{value:'2026-10-29'}});
}
it('consulta por solicitud y muestra ejecución y aprobación en la misma ocurrencia',async()=>{
  jest.mocked(maintenanceApi.getCompliance).mockResolvedValue([report]);render(<LocationCompliancePanel/>);
  expect(maintenanceApi.getCompliance).not.toHaveBeenCalled();fillPeriod();
  fireEvent.click(screen.getByRole('button',{name:'Consultar cumplimiento por lugar'}));
  expect(await screen.findByRole('heading',{name:'Jardín A'})).toBeInTheDocument();
  const link=screen.getByRole('link',{name:'INT-000004'});expect(link).toHaveAttribute('href','/intervenciones/4');
  expect(link.closest('li')).toHaveTextContent('Ejecución: 2026-10-19 · Aprobación final: 2026-10-22');
  expect(screen.getAllByRole('listitem')).toHaveLength(1);
});
it('no envía un intervalo invertido',()=>{
  render(<LocationCompliancePanel/>);fillPeriod();fireEvent.change(screen.getByLabelText('Fecha final'),{target:{value:'2026-09-30'}});
  fireEvent.click(screen.getByRole('button',{name:'Consultar cumplimiento por lugar'}));
  expect(screen.getByRole('alert')).toHaveTextContent('Selecciona un periodo válido');expect(maintenanceApi.getCompliance).not.toHaveBeenCalled();
});
it('muestra el error sin confundirlo con ausencia de trabajos',async()=>{
  jest.mocked(maintenanceApi.getCompliance).mockRejectedValue(new ApiError(503,'Unavailable'));
  render(<LocationCompliancePanel/>);fillPeriod();fireEvent.click(screen.getByRole('button',{name:'Consultar cumplimiento por lugar'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Error del servidor');
  expect(screen.queryByText('No hay frecuencias configuradas para evaluar.')).not.toBeInTheDocument();
});
