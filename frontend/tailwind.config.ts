import type { Config } from 'tailwindcss';

/**
 * Los tokens salen de SPEC-C01 §3.1 y son la única fuente de color del
 * proyecto: ninguna feature escribe un hex suelto en una clase arbitraria.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf4',
          100: '#dcfce7',
          600: '#16a34a',
          700: '#15803d',
          900: '#14532d',
        },
        neutral: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          500: '#64748b',
          700: '#334155',
          900: '#0f172a',
        },
        action: {
          danger: '#dc2626',
          'danger-hover': '#b91c1c',
        },
        info: { 600: '#0284c7' },
        warning: { 600: '#f59e0b' },
        success: { 600: '#16a34a' },
        // Pares fondo/texto de los estados de flujo y de urgencia. Fijos:
        // ninguna feature decide de qué color se pinta "crítico".
        status: {
          'reported-bg': '#f1f5f9',
          'reported-fg': '#334155',
          'in-review-bg': '#fef3c7',
          'in-review-fg': '#92400e',
          'in-progress-bg': '#e0f2fe',
          'in-progress-fg': '#075985',
          'resolved-bg': '#dcfce7',
          'resolved-fg': '#166534',
        },
        urgency: {
          'low-bg': '#f1f5f9',
          'low-fg': '#334155',
          'medium-bg': '#fef3c7',
          'medium-fg': '#92400e',
          'high-bg': '#ffedd5',
          'high-fg': '#9a3412',
          'critical-bg': '#fee2e2',
          'critical-fg': '#991b1b',
        },
      },
    },
  },
  plugins: [],
};

export default config;
