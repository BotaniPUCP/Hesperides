'use client';

import { useEffect, useState } from 'react';
import { todayInLima } from '@/lib/reservation-format';

/** Cada cuánto se mueve la línea de la hora actual. */
const TICK_MS = 60_000;
const LIMA_CLOCK = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
});

export interface LimaNow {
  today: string;
  /** Minutos desde la medianoche de Lima. */
  minute: number;
}

function read(): LimaNow {
  const [hours, minutes] = LIMA_CLOCK.format(new Date()).split(':').map(Number);
  return { today: todayInLima(), minute: hours * 60 + minutes };
}

/** El día y la hora de Lima, no los del navegador; se actualiza cada minuto. */
export function useLimaNow(): LimaNow {
  const [now, setNow] = useState(read);
  useEffect(() => {
    const id = setInterval(() => setNow(read()), TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}
