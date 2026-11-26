import type { Metadata } from 'next';
import { DemoMapScreen } from '@/components/map3d/demo/DemoMapScreen';

export const metadata: Metadata = {
  title: 'Explora el campus en 3D · Hesperides',
  description: 'Recorre el campus PUCP y prueba plantar en el mapa 3D de Hesperides, sin iniciar sesión.',
};

export default function DemoPage() {
  return <DemoMapScreen />;
}
