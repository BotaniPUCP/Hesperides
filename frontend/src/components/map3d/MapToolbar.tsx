'use client';

export interface ViewOptions {
  night: boolean;
  shadows: boolean;
  labels: boolean;
  grayBuildings: boolean;
}

export interface MapToolbarProps {
  options: ViewOptions;
  compass: number;
  onOption: (key: keyof ViewOptions, value: boolean) => void;
  onFit: () => void;
  onTop: () => void;
  onNorth: () => void;
  onSpin: () => void;
}

const OPTION_LABELS: Record<keyof ViewOptions, string> = {
  night: 'Noche',
  shadows: 'Sombras',
  labels: 'Nombres',
  grayBuildings: 'Edificios grises',
};

const button = 'rounded-md bg-white/95 px-2 py-1 text-xs text-neutral-700 shadow hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600';

/** Controles de cámara y de apariencia. La brújula apunta al norte y, al pulsarla, orienta la vista. */
export function MapToolbar({ options, compass, onOption, onFit, onTop, onNorth, onSpin }: MapToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" className={button} onClick={onNorth} aria-label="Orientar al norte" title="Orientar al norte">
        <span className="inline-block" style={{ transform: `rotate(${-compass}deg)` }}>
          ⬆
        </span>
      </button>
      <button type="button" className={button} onClick={onFit}>
        Encuadrar
      </button>
      <button type="button" className={button} onClick={onTop}>
        Vista superior
      </button>
      <button type="button" className={button} onClick={onSpin}>
        Girar
      </button>
      {(Object.keys(OPTION_LABELS) as (keyof ViewOptions)[]).map((key) => (
        <button key={key} type="button" aria-pressed={options[key]} className={`${button} ${options[key] ? 'ring-1 ring-brand-600' : ''}`} onClick={() => onOption(key, !options[key])}>
          {OPTION_LABELS[key]}
        </button>
      ))}
    </div>
  );
}
