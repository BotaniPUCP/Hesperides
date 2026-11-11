import { ReservationDetailScreen } from '@/components/reservas/ReservationDetailScreen';

interface PageProps {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ editar?: string }>;
}

export const metadata = {
  title: 'Reserva · Hesperides',
};

export default async function ReservationPage({ params, searchParams }: PageProps) {
  const { codigo } = await params;
  const { editar } = await searchParams;
  return <ReservationDetailScreen code={codigo} startEditing={editar === '1'} />;
}
