'use client';

import { useEffect, useRef, useState } from 'react';

const PUBLISH_DELAY_MS = 300;

/**
 * Texto de un buscador cuyo valor oficial está en la URL. El router actualiza la
 * URL dentro de una transición, así que usarla como valor del campo podría perder
 * letras o mover el cursor: se escribe en un borrador y se publica al terminar.
 */
export function useSearchDraft(published: string, publish: (value: string) => void) {
  const [draft, setDraft] = useState(published);
  const [seen, setSeen] = useState(published);
  const [written, setWritten] = useState(published);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Si la URL cambia a algo que no publicamos (el menú lateral), manda la URL.
  if (published !== seen) {
    setSeen(published);
    if (published !== written) {
      setDraft(published);
      setWritten(published);
    }
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  function change(value: string) {
    setDraft(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setWritten(value);
      publish(value);
    }, PUBLISH_DELAY_MS);
  }

  return [draft, change] as const;
}
