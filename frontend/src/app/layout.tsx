import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Hesperides',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
