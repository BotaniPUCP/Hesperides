import type { Metadata } from 'next';
import Script from 'next/script';
import '../styles/globals.css';
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
        <Script id="theme-boot" src="/theme-boot.js" strategy="beforeInteractive" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
