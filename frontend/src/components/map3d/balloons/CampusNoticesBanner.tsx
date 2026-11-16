'use client';

import { useState } from 'react';
import type { CampusNotice } from '@shared/types';
import { todayInLima } from '@/lib/reservation-format';

/** Se guarda el día en que se cerró: al día siguiente la franja vuelve a salir. */
const CLOSED_KEY = 'hesperides.mapa.franjaCerrada';

function closedToday(): boolean {
  try {
    return localStorage.getItem(CLOSED_KEY) === todayInLima();
  } catch {
    return false;
  }
}

/**
 * La franja de arriba del mapa con los eventos de todo el campus de hoy (SPEC-114 §5.5, D-06):
 * un examen de admisión o un feriado no tienen dónde clavarse como globo.
 */
export function CampusNoticesBanner({ notices }: { notices: readonly CampusNotice[] }) {
  const [closed, setClosed] = useState(closedToday);
  if (closed || notices.length === 0) return null;

  function close() {
    setClosed(true);
    try {
      localStorage.setItem(CLOSED_KEY, todayInLima());
    } catch {
      // Sin almacenamiento (modo privado): se cierra solo hasta salir del mapa.
    }
  }

  return (
    <div role="status" className="flex items-start gap-2 rounded-md bg-[#F3E5F5]/95 px-3 py-1.5 text-xs text-[#4A148C] shadow">
      <ul className="flex-1 space-y-0.5">
        {notices.map((n) => <li key={n.text}>{n.text}</li>)}
      </ul>
      <button type="button" aria-label="Cerrar avisos del campus" onClick={close} className="rounded px-1 hover:bg-white/50">✕</button>
    </div>
  );
}
