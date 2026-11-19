import { OrganizationDetailScreen } from '@/components/directorio/OrganizationDetailScreen';

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata = {
  title: 'Organización · Directorio · Hesperides',
};

export default async function OrganizationPage({ params }: PageProps) {
  const { code } = await params;
  return <OrganizationDetailScreen code={code} />;
}
