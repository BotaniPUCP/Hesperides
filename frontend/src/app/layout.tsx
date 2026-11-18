import type { Metadata, Viewport } from 'next';
import '../styles/globals.css';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import { THEME_BOOT_SCRIPT } from '@/lib/theme';
import { BRAND_GREEN } from './manifest';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Hesperides',
  applicationName: 'Hesperides',
  appleWebApp: { capable: true, title: 'Hesperides', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: BRAND_GREEN,
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
        <ServiceWorkerRegistration />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
