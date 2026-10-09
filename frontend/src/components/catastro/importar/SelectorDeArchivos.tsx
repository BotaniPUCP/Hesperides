'use client';

import { CampoArchivo } from '@/components/forms/CampoArchivo';
import { Button, Card } from '@/components/ui';
import { LIMITES } from '@/lib/upload-limits';
import { ESTANDARES } from '../estandares';
import type { Importacion } from './useImportacion';

/** El CSV y, si las fotos no son enlaces de Drive, el ZIP que las trae. */
export function SelectorDeArchivos({ imp }: { imp: Importacion }) {
  return (
    <Card title="1. Sube el archivo">
      <fieldset className="mb-4">
        <legend className="mb-2 text-sm font-medium text-neutral-700">Qué vas a cargar</legend>
        <div className="flex flex-wrap gap-4 text-sm">
          {ESTANDARES.map((e) => (
            <label key={e.kind} className="flex items-center gap-1 text-neutral-900">
              <input type="radio" name="estandar" checked={imp.kind === e.kind} onChange={() => imp.setKind(e.kind)} />
              {e.titulo}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <CampoArchivo
          id="archivo-csv"
          etiqueta={`Archivo CSV de ${imp.estandar.plural}`}
          ayuda="Separado por punto y coma, en UTF-8."
          acepta=".csv,text/csv"
          limite={LIMITES.subida}
          archivo={imp.csv}
          onElegir={imp.setCsv}
        />
        <CampoArchivo
          id="archivo-zip"
          etiqueta="Fotos en ZIP (opcional)"
          ayuda={`Solo si la columna foto nombra archivos en vez de enlaces de Drive. Cada foto hasta ${LIMITES.foto.etiqueta}; descomprimido, hasta ${LIMITES.zipDescomprimido.etiqueta}.`}
          acepta=".zip,application/zip"
          limite={LIMITES.subida}
          archivo={imp.zip}
          onElegir={imp.setZip}
        />
      </div>
      <div className="mt-4">
        <Button onClick={imp.revisar} disabled={!imp.csv} loading={imp.fase === 'revisando'}>
          Revisar archivo
        </Button>
        <span className="ml-3 text-sm text-neutral-500">Revisar no guarda nada.</span>
      </div>
    </Card>
  );
}
