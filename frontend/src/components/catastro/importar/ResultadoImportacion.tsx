'use client';

import { Button, Card } from '@/components/ui';
import { traducirMensajeCatastro } from '../mensajes';
import type { Importacion } from './useImportacion';

/** Qué entró. Las fotos que no se pudieron traer no impidieron guardar su fila. */
export function ResultadoImportacion({ imp }: { imp: Importacion }) {
  const r = imp.resultado;
  if (!r) return null;

  return (
    <Card title="Carga confirmada">
      <div className="space-y-4 text-sm text-neutral-700">
        <ul className="space-y-1">
          <li>
            <strong>{r.created}</strong> ejemplares nuevos
            {r.createdCodes.length > 0 && (
              <span className="text-neutral-500">
                {' '}
                ({r.createdCodes[0]}
                {r.createdCodes.length > 1 && ` a ${r.createdCodes[r.createdCodes.length - 1]}`})
              </span>
            )}
          </li>
          <li>
            <strong>{r.updated}</strong> ejemplares corregidos
          </li>
          {r.omittedDuplicates > 0 && (
            <li>
              <strong>{r.omittedDuplicates}</strong> posibles duplicados omitidos
            </li>
          )}
        </ul>

        {r.unknownSpecies.length > 0 && (
          <p>
            No se cargaron las filas de especies que no están en el catálogo:{' '}
            {r.unknownSpecies.map((s) => `${s.name} (${s.rows})`).join(', ')}. Pide que se agreguen y vuelve a cargar
            solo esas filas.
          </p>
        )}

        {r.photoWarnings.length > 0 && (
          <section aria-labelledby="fotos-no-guardadas">
            <h3 id="fotos-no-guardadas" className="font-semibold text-urgency-medium-fg">
              Fotos que no se guardaron (el ejemplar sí)
            </h3>
            <ul className="list-disc pl-5">
              {r.photoWarnings.map((w) => (
                <li key={w.line}>
                  Línea {w.line}: {traducirMensajeCatastro(w.message)}
                </li>
              ))}
            </ul>
          </section>
        )}

        <Button onClick={imp.reiniciar}>Cargar otro archivo</Button>
      </div>
    </Card>
  );
}
