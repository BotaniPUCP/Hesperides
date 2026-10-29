import { cn } from '@/lib/cn';

/** El marco de una tarjeta de perspectiva; resaltado si es la que se ve en el mapa. */
export const cardClass = (focused: boolean) =>
  cn(
    'rounded-lg border p-3 transition-colors',
    focused ? 'border-warning-600 bg-alert-warning-bg/60' : 'border-neutral-200 bg-neutral-0',
  );
