import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
// Única fuente de estilos: tokens.css → components.css (rc-*) → layout.css (prototipo) → motion.css.
import '@red-clinica/design-system';
import { Proveedores } from './proveedores';

export const metadata: Metadata = {
  title: 'Red Clínica',
  description: 'Historial clínico compartido por cuatro instituciones médicas.',
  icons: { icon: '/favicon.svg' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-GT">
      <head>
        {/* Fuentes del design system (Manrope + Public Sans), las mismas que importa components.css. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap"
        />
      </head>
      <body>
        <Proveedores>{children}</Proveedores>
      </body>
    </html>
  );
}
