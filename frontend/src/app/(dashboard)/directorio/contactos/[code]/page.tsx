import { ContactDetailScreen } from '@/components/directorio/ContactDetailScreen';

interface PageProps {
  params: Promise<{ code: string }>;
}

export const metadata = {
  title: 'Contacto · Directorio · Hesperides',
};

export default async function ContactPage({ params }: PageProps) {
  const { code } = await params;
  return <ContactDetailScreen code={code} />;
}
