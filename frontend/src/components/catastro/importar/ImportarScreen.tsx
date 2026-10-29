'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { DescargasDelEstandar } from '../DescargasDelEstandar';
import { puedeCargarCsv } from '../permisos';
import { ResultadoImportacion } from './ResultadoImportacion';
import { SelectorDeArchivos } from './SelectorDeArchivos';
import { useImportacion } from './useImportacion';
import { VistaPrevia } from './VistaPrevia';

/** Carga de ejemplares por CSV (SPEC-103 §5.2). Solo ADMIN y COORDINADOR (D-03). */
export function ImportarScreen() {
  const { user } = useAuth();
  const imp = useImportacion();

  if (!puedeCargarCsv(user?.role.code)) {
    return (
      <EmptyState
        title="La carga por CSV es de administración y coordinación"
        description="Para registrar uno a la vez usa Catastro → Registrar."
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">Importar al catastro</h1>
        <p className="text-neutral-700">
          Sube un CSV en su <Link href={`/catastro/estandares#estandar-${imp.kind}`} className="text-brand-700 underline">estándar</Link>.
          Las filas sin código crean; las que traen código corrigen lo registrado.
        </p>
        <DescargasDelEstandar estandar={imp.estandar} puedeExportar />
      </header>

      {imp.fase === 'hecho' ? (
        <ResultadoImportacion imp={imp} />
      ) : imp.vista && imp.fase !== 'revisando' ? (
        <VistaPrevia imp={imp} />
      ) : (
        <>
          <SelectorDeArchivos key={imp.kind} imp={imp} />
          {imp.error && <p role="alert" className="text-sm text-action-danger">{imp.error}</p>}
        </>
      )}
      {imp.avisoSinGuardar}
    </div>
  );
}
