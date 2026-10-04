import type { Metadata } from 'next';
import '../styles/globals.css';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Hesperides',
};

/**
 * suppressHydrationWarning cubre solo <html>: el script de arranque le pone
 * la clase del tema antes de que React hidrate, y esa diferencia es esperada.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
