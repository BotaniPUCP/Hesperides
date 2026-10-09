'use client';

import { useEffect, useState } from 'react';
import type { Assessment } from '@shared/types';
import { Card } from '@/components/ui';
import { catastroApi } from '@/lib/catastro-api';

const HALLAZGOS: [keyof Assessment, string][] = [
  ['hasDisease', 'enfermedades'],
  ['hasPests', 'plagas'],
  ['hasMechanicalDamage', 'daños mecánicos'],
  ['isLeaning', 'inclinación riesgosa'],
  ['hasDeadBranches', 'ramas secas'],
  ['hasCavitiesOrRot', 'cavidades o pudrición'],
  ['hasExposedRoots', 'raíces expuestas'],
  ['interferesWithInfrastructure', 'interfiere con infraestructura'],
];

/** «Sí» y «no» se dicen; lo que no se evaluó se calla para no confundirlo con «no». */
function resumen(a: Assessment): string {
  const si = HALLAZGOS.filter(([k]) => a[k] === true).map(([, t]) => t);
  const evaluadas = HALLAZGOS.filter(([k]) => a[k] !== null).length;
  if (evaluadas === 0) return 'Sin preguntas evaluadas';
  return si.length === 0 ? 'Sin problemas en lo evaluado' : `Con ${si.join(', ')}`;
}

const fecha = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('es-PE', { dateStyle: 'medium' });

/** El historial de evaluaciones (SPEC-103 D-06): la primera es la vigente. */
export function SpecimenAssessments({ code }: { code: string }) {
  const [historial, setHistorial] = useState<Assessment[] | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;
    catastroApi
      .assessments(code)
      .then((h) => vigente && setHistorial(h))
      .catch(() => vigente && setFallo(true));
    return () => {
      vigente = false;
    };
  }, [code]);

  // La ficha vale sin el historial: si no carga, simplemente no se muestra.
  if (fallo || historial === null) return null;

  return (
    <Card title="Evaluaciones" className="mt-6">
      {historial.length === 0 ? (
        <p className="text-sm text-neutral-500">Esta planta todavía no tiene evaluaciones.</p>
      ) : (
        <ol aria-label="Historial de evaluaciones" className="space-y-3">
          {historial.map((a, i) => (
            <li key={a.id} className="rounded-lg border border-neutral-200 p-3 text-sm">
              <p className="font-semibold text-neutral-900">
                {fecha(a.date)}
                {i === 0 && <span className="ml-2 text-xs font-semibold text-brand-700">vigente</span>}
                {a.assessedBy && <span className="ml-2 font-normal text-neutral-500">· {a.assessedBy}</span>}
              </p>
              <p className="text-neutral-700">{resumen(a)}</p>
              {a.recommendedManagement && <p className="text-neutral-700">Manejo recomendado: {a.recommendedManagement}</p>}
              {a.observation && <p className="text-neutral-500">{a.observation}</p>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
