'use client';

import { useEffect, useState } from 'react';

/**
 * Devuelve si la media query coincide, reaccionando a los cambios de tamaño.
 *
 * En el servidor `window` no existe: devuelve `false` y el valor real llega en
 * el primer efecto del cliente. Por eso los componentes que dependen de esto
 * deben renderizar la variante de escritorio primero, que es la que no rompe
 * si el hidratado corrige el valor un instante después.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
