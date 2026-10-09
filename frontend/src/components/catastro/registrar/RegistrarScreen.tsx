'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { puedeRegistrar } from '../permisos';
import { RegistroComponenteForm } from './RegistroComponenteForm';
import { RegistroPlantaForm } from './RegistroPlantaForm';

type QueSeRegistra = 'planta' | 'waste-bins' | 'drinking-fountains';

const OPCIONES: [QueSeRegistra, string][] = [
  ['planta', 'Planta'],
  ['waste-bins', 'Tacho'],
  ['drinking-fountains', 'Bebedero'],
];

/** Registro por formulario (SPEC-103 §5.1): una planta, un tacho o un bebedero. ADMIN, COORDINADOR y SUPERVISOR (D-03). */
export function RegistrarScreen() {
  const { user } = useAuth();
  const [que, setQue] = useState<QueSeRegistra>('planta');

  if (!puedeRegistrar(user?.role.code)) {
    return <EmptyState title="El registro del catastro es de supervisión, coordinación y administración" />;
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-bold text-neutral-900">Registrar en el catastro</h1>
        <p className="text-neutral-700">Uno a la vez. Para muchos, usa la importación por CSV.</p>
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-neutral-700">Qué vas a registrar</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {OPCIONES.map(([valor, etiqueta]) => (
              <label key={valor} className="flex items-center gap-1 text-neutral-900">
                <input type="radio" name="que-se-registra" checked={que === valor} onChange={() => setQue(valor)} />
                {etiqueta}
              </label>
            ))}
          </div>
        </fieldset>
      </header>
      {/* La clave reinicia el formulario al cambiar de tipo: lo escrito para un tacho no vale para un bebedero. */}
      {que === 'planta' ? <RegistroPlantaForm /> : <RegistroComponenteForm key={que} kind={que} />}
    </div>
  );
}
