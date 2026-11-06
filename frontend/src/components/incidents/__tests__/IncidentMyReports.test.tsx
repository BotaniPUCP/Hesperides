import { render,screen } from '@testing-library/react';
import { IncidentMyReports } from '../IncidentMyReports';
import { incidentsApi } from '@/lib/incidents-api';
import { pendingDetail } from '../__fixtures__/incidents';

jest.mock('@/hooks/useAuth',()=>({useAuth:()=>({user:{id:2}})}));
jest.mock('@/lib/incidents-api',()=>({incidentsApi:{mine:jest.fn()}}));
it('shows personal totals and links to recent reports using the personal endpoint',async()=>{
  jest.mocked(incidentsApi.mine).mockResolvedValue({total:1,pendingRegistration:1,active:1,resolved:0,recent:[pendingDetail.incident]});
  render(<IncidentMyReports/>);
  expect(await screen.findByRole('link',{name:/Reporte #7/})).toHaveAttribute('href','/incidencias/7');
  expect(screen.getByText(/Solo los enviados por ti/)).toBeInTheDocument();
  expect(incidentsApi.mine).toHaveBeenCalledTimes(1);
});
