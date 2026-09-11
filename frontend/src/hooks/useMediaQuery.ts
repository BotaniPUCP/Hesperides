'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Devuelve si la media query coincide, reaccionando a los cambios de tamaño.
 *
 * `matchMedia` es exactamente lo que `useSyncExternalStore` existe para leer:
 * un dato que vive fuera de React y avisa cuando cambia. Suscribirse así, en
 * vez de copiar el valor a un estado dentro de un efecto, evita el render
 * intermedio con el valor equivocado —el salto de tarjetas a tabla que se veía
 * al montar en un móvil— y deja de encadenar un render extra por cada consulta.
 *
 * En el servidor `window` no existe: se devuelve `false`, es decir la variante
 * de escritorio, que es la que no rompe si el hidratado corrige el valor.
 */
function hayMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

export function useMediaQuery(query: string): boolean {
  const suscribir = useCallback(
    (alCambiar: () => void) => {
      if (!hayMatchMedia()) return () => {};

      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', alCambiar);
      return () => mediaQuery.removeEventListener('change', alCambiar);
    },
    [query],
  );

  const leer = useCallback(() => (hayMatchMedia() ? window.matchMedia(query).matches : false), [
    query,
  ]);

  return useSyncExternalStore(suscribir, leer, () => false);
}
