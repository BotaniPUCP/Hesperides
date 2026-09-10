'use client';

import { useEffect, useState } from 'react';

/**
 * Devuelve el valor con retraso: mientras siga cambiando, no se propaga.
 *
 * Existe para que teclear "María" no dispare cinco consultas al backend, una
 * por letra, de las que solo la última importa. El estado del campo sigue
 * siendo inmediato —quien escribe ve sus letras al instante—; lo que se retrasa
 * es únicamente la consulta.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    // Cada cambio cancela el temporizador anterior: eso es lo que hace que
    // solo sobreviva la última pulsación de una ráfaga.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
