import { PlanningFormScreen } from '@/components/planning/PlanningFormScreen';

export const metadata = { title: 'Planificación · Hesperides' };

export default async function PlanificacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PlanningFormScreen key={id} assignmentId={Number(id)} />;
}
