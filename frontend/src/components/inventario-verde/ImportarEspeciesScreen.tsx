'use client';

import Link from 'next/link';
import { EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/layouts/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { DescargasDelEstandar } from '@/components/catastro/DescargasDelEstandar';
import { puedeCargarCsv } from '@/components/catastro/permisos';
import { ResultadoImportacion } from '@/components/catastro/importar/ResultadoImportacion';
import { SelectorDeArchivos } from '@/components/catastro/importar/SelectorDeArchivos';
import { useImportacion } from '@/components/catastro/importar/useImportacion';
import { VistaPrevia } from '@/components/catastro/importar/VistaPrevia';

/** Carga y actualización masiva de especies botánicas por CSV (SPEC-103 §6.6, SPEC-105 §5.1). */
export function ImportarEspeciesScreen() {
  const { user } = useAuth();
  const imp = useImportacion('species');

  if (!puedeCargarCsv(user?.role.code)) {
    return (
      <EmptyState
        title="La carga masiva de especies es de administración y coordinación"
        description="Para registrar una especie a la vez usa Catálogo botánico → Registrar especie."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar especies"
        description={
          <>
            Sube un archivo CSV con el{' '}
            <Link href="/inventario-verde/estandares" className="text-brand-700 underline font-medium">
              estándar de especies
            </Link>
            . Las especies nuevas se crean y las activas existentes se actualizan sin borrar celdas vacías; las inactivas se omiten y no se editan ni reactivan.
          </>
        }
      >
        <DescargasDelEstandar estandar={imp.estandar} puedeExportar />
      </PageHeader>

      {imp.fase === 'hecho' ? (
        <ResultadoImportacion imp={imp} />
      ) : imp.vista && imp.fase !== 'revisando' ? (
        <VistaPrevia imp={imp} />
      ) : (
        <>
          <SelectorDeArchivos imp={imp} ocultarSelectorDeTipo />
          {imp.error && (
            <p role="alert" className="text-sm text-action-danger">
              {imp.error}
            </p>
          )}
        </>
      )}
      {imp.avisoSinGuardar}
    </div>
  );
}
