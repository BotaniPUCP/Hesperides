'use client';

import { useState, type RefObject } from 'react';
import { RecordViewButton } from './recording/RecordViewButton';
import type { Viewer } from './viewer/viewerTypes';
import { clockOf, SUNSET_HOUR, SUNSET_HOURS } from './viewer/sunsetHours';

export interface ViewOptions {
  night: boolean;
  shadows: boolean;
  labels: boolean;
  grayBuildings: boolean;
  realColors: boolean;
  /** Hora dorada: cielo, bruma, ciudad alrededor y posprocesado. */
  sunset: boolean;
}

export interface MapToolbarProps {
  options: ViewOptions;
  compass: number;
  onOption: (key: keyof ViewOptions, value: boolean) => void;
  viewer: RefObject<Pick<Viewer, 'fit' | 'top' | 'north' | 'toggleSpin' | 'livePerspective' | 'setSunsetHour' | 'snapshot'> | null>;
}

const OPTION_LABELS: Record<keyof ViewOptions, string> = {
  night: 'Noche',
  sunset: 'Atardecer',
  shadows: 'Sombras',
  labels: 'Nombres',
  grayBuildings: 'Edificios grises',
  realColors: 'Colores reales',
};

/** Descarga la captura del visor como PNG, con fecha y hora en el nombre. */
async function downloadSnapshot(viewer: MapToolbarProps['viewer']) {
  const blob = await viewer.current?.snapshot(2);
  if (!blob) return;
  const d = new Date();
  const two = (n: number) => String(n).padStart(2, '0');
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `campus-pucp-${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}-${two(d.getHours())}${two(d.getMinutes())}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const button = 'rounded-md bg-neutral-0/95 px-2 py-1 text-xs text-neutral-700 shadow hover:bg-neutral-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600';

/** Controles de cámara y de apariencia. La brújula apunta al norte y, al pulsarla, orienta la vista. */
export function MapToolbar({ options, compass, onOption, viewer }: MapToolbarProps) {
  const onNorth = () => viewer.current?.north();
  const [sunsetHour, setSunsetHour] = useState<number>(SUNSET_HOUR);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" className={button} onClick={onNorth} aria-label="Orientar al norte" title="Orientar al norte">
        <span className="inline-block" style={{ transform: `rotate(${-compass}deg)` }}>
          ⬆
        </span>
      </button>
      <button type="button" className={button} onClick={() => viewer.current?.fit()}>
        Encuadrar
      </button>
      <button type="button" className={button} onClick={() => viewer.current?.top()}>
        Vista superior
      </button>
      <button type="button" className={button} onClick={() => viewer.current?.toggleSpin()}>
        Girar
      </button>
      {(Object.keys(OPTION_LABELS) as (keyof ViewOptions)[]).map((key) => (
        <button key={key} type="button" aria-pressed={options[key]} className={`${button} ${options[key] ? 'ring-1 ring-brand-600' : ''}`} onClick={() => onOption(key, !options[key])}>
          {OPTION_LABELS[key]}
        </button>
      ))}
      {options.sunset && !options.night && (
        <label className={`${button} flex items-center gap-1.5`}>
          <span>Hora {clockOf(sunsetHour)}</span>
          <input
            type="range"
            min={SUNSET_HOURS[0]}
            max={SUNSET_HOURS[1]}
            step={0.02}
            value={sunsetHour}
            aria-label="Hora del atardecer"
            className="w-24 accent-brand-600"
            onChange={(e) => {
              const h = Number(e.target.value);
              setSunsetHour(h);
              viewer.current?.setSunsetHour(h);
            }}
          />
        </label>
      )}
      <button type="button" className={button} onClick={() => void downloadSnapshot(viewer)} title="Descarga lo que se ve como imagen PNG">
        Foto
      </button>
      <RecordViewButton viewer={viewer} className={button} />
    </div>
  );
}
