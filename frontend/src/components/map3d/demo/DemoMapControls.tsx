'use client';

import { useId, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui';
import type { DemoPlantKind } from '../viewer/viewerTypes';

const PLANTS: Record<DemoPlantKind, string> = {
  tree: 'Árbol',
  palm: 'Palmera',
  shrub: 'Arbusto',
};

interface DemoHelpProps {
  topic: string;
  position?: 'below' | 'belowEnd' | 'above';
  children: ReactNode;
}

const HELP_POSITION = {
  below: 'right-0 top-full mt-1 sm:left-0 sm:right-auto',
  belowEnd: 'left-0 top-full mt-1',
  above: 'right-0 bottom-full mb-1',
};

export function DemoHelp({ topic, position = 'below', children }: DemoHelpProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="relative" onKeyDown={(event) => {
      if (event.key === 'Escape' && open) setOpen(false);
    }}>
      <button
        type="button"
        aria-label={topic}
        aria-controls={id}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="grid size-10 place-items-center rounded-full border border-neutral-200 bg-neutral-0 font-semibold text-brand-700 shadow-sm focus-visible:ring-2 focus-visible:ring-brand-600"
      >?</button>
      <p
        id={id}
        hidden={!open}
        className={`absolute z-30 w-44 rounded-lg border border-neutral-200 bg-neutral-0 p-3 text-sm text-neutral-800 shadow-lg ${HELP_POSITION[position]}`}
      >{children}</p>
    </div>
  );
}

interface DemoPlantControlsProps {
  kind: DemoPlantKind | null;
  count: number;
  limit: number;
  message: string;
  onChoose: (kind: DemoPlantKind) => void;
  onCancel: () => void;
  onUndo: () => void;
  onClear: () => void;
}

export function DemoPlantControls({ kind, count, limit, message, onChoose, onCancel, onUndo, onClear }: DemoPlantControlsProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section aria-label="Plantación de prueba" className="relative space-y-2 rounded-xl border border-neutral-200 bg-neutral-0/95 p-2.5 shadow-lg">
      <div className="flex items-center gap-2">
        <Button aria-expanded={open} aria-controls={id} onClick={() => {
          if (open) onCancel();
          setOpen(!open);
        }}>
          {open ? 'Cerrar plantación' : 'Plantar en la demo'}
        </Button>
        <DemoHelp topic="Cómo plantar en la demo" position="above">
          Abre la plantación, elige una planta y toca un área verde. Tus plantas se borran al recargar.
        </DemoHelp>
      </div>
      <div id={id} hidden={!open} className="space-y-2">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tipos de plantas de prueba">
          {(Object.keys(PLANTS) as DemoPlantKind[]).map((option) => (
            <Button key={option} size="sm" type="button" variant={kind === option ? 'primary' : 'secondary'}
              disabled={count >= limit} aria-pressed={kind === option} onClick={() => onChoose(option)}>
              {PLANTS[option]}
            </Button>
          ))}
        </div>
        <p role="status" className="text-sm text-neutral-700">
          {message || (kind ? `${PLANTS[kind]}: toca un punto del área verde para plantar.`
            : count >= limit ? `Límite de ${limit} plantas de prueba.` : 'Elige una planta. Los cambios se borran al recargar.')}
        </p>
        {count > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-sm font-medium text-neutral-800">
              {count} {count === 1 ? 'planta de prueba' : 'plantas de prueba'}
            </span>
            <Button size="sm" variant="ghost" onClick={onUndo}>Deshacer</Button>
            <Button size="sm" variant="ghost" onClick={onClear}>Limpiar</Button>
          </div>
        )}
      </div>
    </section>
  );
}
