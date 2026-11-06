import { render, screen } from '@testing-library/react';
import { ExecutionTime, elapsedTime } from '../ExecutionTime';
import type { InterventionSummary } from '@/lib/interventions-api';

const work:InterventionSummary={id:10,code:'INT-000010',version:1,classItemId:1,typeItemId:null,
  scheduledDate:'2026-11-05',planningStatusCode:'ASSIGNED',statusCode:'VALIDATED',teamId:1,
  assignedToUserId:2,startedAt:'2026-11-05T10:00:00Z',completedAt:'2026-11-05T16:00:00Z',
  validatedAt:'2026-11-07T16:00:00Z',locationCount:1,completedLocationCount:1,
  validatedLocationCount:1,pendingEvidenceCount:0,approvedForCounting:true,elapsedSeconds:21600};

it('shows execution duration separately from approval waiting',()=>{
  expect(elapsedTime(183845)).toBe('2 d 3 h 4 min 5 s');
  render(<ExecutionTime work={work}/>);
  expect(screen.getByText('Tiempo transcurrido: 6 h 0 min 0 s')).toBeInTheDocument();
});

it('shows ongoing execution without inventing a completion time',()=>{
  render(<ExecutionTime work={{...work,completedAt:null,elapsedSeconds:null}}/>);
  expect(screen.getByText('Tiempo transcurrido: En curso')).toBeInTheDocument();
});
