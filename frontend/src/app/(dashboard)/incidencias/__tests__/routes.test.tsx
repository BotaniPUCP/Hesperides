import IncidentPage from '../[id]/page';
import NewIncidentPage from '../nueva/page';
import { IncidentDetailScreen } from '@/components/incidents/IncidentDetailScreen';
import { IncidentCaptureScreen } from '@/components/incidents/IncidentCaptureScreen';

jest.mock('next/navigation', () => ({ notFound: () => { throw new Error('Not found'); } }));

it('resolves async route parameters and opens the requested incident', async () => {
  const page = await IncidentPage({ params: Promise.resolve({ id: '7' }) });
  expect(page.type).toBe(IncidentDetailScreen);
  expect(page.props.id).toBe(7);
});

it.each(['0', '-1', '1.2', 'invalid', '9007199254740992'])('rejects an invalid incident id: %s', async (id) => {
  await expect(IncidentPage({ params: Promise.resolve({ id }) })).rejects.toThrow('Not found');
});

it('exposes capture as a separate page', () => {
  expect(NewIncidentPage().type).toBe(IncidentCaptureScreen);
});
