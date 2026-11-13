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

it('keeps the first three personal reports compact and discloses the rest', async () => {
  const recent = Array.from({ length: 5 }, (_, index) => ({ ...pendingDetail.incident, id: index + 1 }));
  jest.mocked(incidentsApi.mine).mockResolvedValue({ total: 5, pendingRegistration: 5, active: 5, resolved: 0, recent });
  const { container } = render(<IncidentMyReports />);
  await screen.findByText('Ver 2 reportes más');
  expect(container.querySelector('section section > ul')?.children).toHaveLength(3);
  expect(screen.getByText('Ver 2 reportes más').closest('details')).not.toHaveAttribute('open');
  expect(screen.getByText('Reportes enviados por ti')).toBeInTheDocument();
});

it('uses a list-only presentation alongside capture instead of repeating four large totals', async () => {
  jest.mocked(incidentsApi.mine).mockResolvedValue({ total: 1, pendingRegistration: 1, active: 1, resolved: 0, recent: [pendingDetail.incident] });
  render(<IncidentMyReports compact />);
  await screen.findByRole('link', { name: /Reporte #7/ });
  expect(screen.queryByText('Reportes enviados por ti')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Mis reportes' })).toBeInTheDocument();
});
