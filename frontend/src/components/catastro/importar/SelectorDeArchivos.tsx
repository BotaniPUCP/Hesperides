'use client';

import { CampoArchivo } from '@/components/forms/CampoArchivo';
import { Button, Card } from '@/components/ui';
import { LIMITES } from '@/lib/upload-limits';
import { ESTANDARES } from '../estandares';
import type { Importacion } from './useImportacion';

/** El CSV y, si las fotos no son enlaces de Drive, el ZIP que las trae. */
export function SelectorDeArchivos({
  imp,
  ocultarSelectorDeTipo = false,
}: {
  imp: Importacion;
  ocultarSelectorDeTipo?: boolean;
}) {
  return (
    <Card title="1. Sube el archivo">
      {!ocultarSelectorDeTipo && (
        <fieldset className="mb-4">
          <legend className="mb-2 text-sm font-medium text-neutral-700">Qué vas a cargar</legend>
          <div className="flex flex-wrap gap-4 text-sm">
            {ESTANDARES.map((e) => (
              <label key={e.kind} className="flex items-center gap-1 text-neutral-900">
                <input type="radio" name="estandar" checked={imp.kind === e.kind} disabled={imp.fase === 'revisando'}
                  onChange={() => imp.setKind(e.kind)} />
                {e.titulo}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoArchivo
          id="archivo-csv"
          etiqueta={`Archivo CSV de ${imp.estandar.plural}`}
          ayuda="Separado por punto y coma, en UTF-8."
          acepta=".csv,text/csv"
          limite={LIMITES.subida}
          disabled={imp.fase === 'revisando'}
          archivo={imp.csv}
          onElegir={imp.setCsv}
        />
        <CampoArchivo
          id="archivo-zip"
          etiqueta="Fotos en ZIP (opcional)"
          ayuda={`Solo si la columna foto nombra archivos en vez de enlaces de Drive. Cada foto hasta ${LIMITES.foto.etiqueta}; descomprimido, hasta ${LIMITES.zipDescomprimido.etiqueta}.`}
          acepta=".zip,application/zip"
          limite={LIMITES.subida}
          disabled={imp.fase === 'revisando'}
          archivo={imp.zip}
          onElegir={imp.setZip}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={imp.revisar} disabled={!imp.csv} loading={imp.fase === 'revisando'}>
          Revisar archivo
        </Button>
        {(imp.csv !== null || imp.zip !== null) && (
          <Button variant="ghost" onClick={imp.reiniciar} disabled={imp.fase === 'revisando'}>
            Subir otro archivo
          </Button>
        )}
      </div>

      {imp.error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-action-danger/30 bg-action-danger/5 p-3.5 text-sm text-action-danger flex items-start gap-2.5"
        >
          <svg className="w-5 h-5 text-action-danger shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="space-y-0.5">
            <p className="font-semibold text-action-danger">{imp.error}</p>
            <p className="text-xs text-neutral-600">Corrige el archivo seleccionado y vuelve a hacer clic en Revisar archivo.</p>
          </div>
        </div>
      )}
    </Card>
  );
}
