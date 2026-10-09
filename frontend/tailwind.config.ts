import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

/**
 * Los tokens salen de SPEC-C01 §3.1 y son la única fuente de color del
 * proyecto: ninguna feature escribe un hex suelto en una clase arbitraria.
 *
 * Cada token apunta a una variable CSS (src/styles/globals.css) que cambia de
 * valor bajo `.dark`; así una pantalla escrita con tokens pasa a modo oscuro
 * sin tocarla. El formato `rgb(var / <alpha-value>)` conserva modificadores
 * como `bg-neutral-0/95`.
 */
function themed(group: string, shades: readonly string[]): Record<string, string> {
  return Object.fromEntries(shades.map((shade) => [shade, `rgb(var(--color-${group}-${shade}) / <alpha-value>)`]));
}

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: themed('brand', ['50', '100', '200', '300', '400', '600', '700', '800', '900']),
        neutral: themed('neutral', ['0', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900']),
        action: themed('action', ['danger', 'danger-hover']),
        info: themed('info', ['600']),
        warning: themed('warning', ['600']),
        success: themed('success', ['600']),
        // Pares fondo/texto de los estados de flujo y de urgencia. Fijos:
        // ninguna feature decide de qué color se pinta "crítico".
        status: themed('status', [
          'reported-bg', 'reported-fg', 'in-review-bg', 'in-review-fg',
          'in-progress-bg', 'in-progress-fg', 'resolved-bg', 'resolved-fg',
        ]),
        urgency: themed('urgency', [
          'low-bg', 'low-fg', 'medium-bg', 'medium-fg',
          'high-bg', 'high-fg', 'critical-bg', 'critical-fg',
        ]),
        // Avisos en línea (errores de formulario, advertencias, confirmaciones).
        alert: themed('alert', [
          'danger-bg', 'danger-fg',
          'warning-bg', 'warning-fg', 'warning-border',
          'success-bg', 'success-fg', 'success-border',
        ]),
        // Lo que NO se invierte en oscuro: fondos sólidos de marca con texto
        // blanco encima (botones, hero) y el velo oscuro de modales y de las
        // etiquetas sobre fotos. Invertirlos dejaría texto blanco sobre claro.
        forest: colors.green,
        ink: { DEFAULT: '#0f172a', line: '#334155' },
      },
    },
  },
  plugins: [],
};

export default config;
