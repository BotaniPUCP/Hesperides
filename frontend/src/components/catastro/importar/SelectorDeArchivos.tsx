'use client';

import { Button, Card } from '@/components/ui';
import { ESTANDARES } from '../estandares';
import type { Importacion } from './useImportacion';

interface CampoArchivoProps {
  id: string;
  etiqueta: string;
  ayuda: string;
  acepta: string;
  archivo: File | null;
  onElegir: (archivo: File | null) => void;
}

function CampoArchivo({ id, etiqueta, ayuda, acepta, archivo, onElegir }: CampoArchivoProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-neutral-700">
        {etiqueta}
      </label>
      <input
        id={id}
        type="file"
        accept={acepta}
        aria-describedby={`${id}-ayuda`}
        onChange={(e) => onElegir(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:text-brand-700"
      />
      <p id={`${id}-ayuda`} className="text-xs text-neutral-500">
        {archivo ? `${archivo.name} · ${(archivo.size / 1024).toFixed(0)} KB` : ayuda}
      </p>
    </div>
  );
}

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
          archivo={imp.csv}
          onElegir={imp.setCsv}
        />
        <CampoArchivo
          id="archivo-zip"
          etiqueta="Fotos en ZIP (opcional)"
          ayuda="Solo si la columna foto nombra archivos en vez de enlaces de Drive."
          acepta=".zip,application/zip"
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
