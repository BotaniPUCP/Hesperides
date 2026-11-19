'use client';

import { Card } from '@/components/ui';
import { PageHeader } from '@/components/layouts/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { DescargasDelEstandar } from '@/components/catastro/DescargasDelEstandar';
import { ESTANDAR_ESPECIES } from '@/components/catastro/estandares';
import { puedeCargarCsv } from '@/components/catastro/permisos';

const REGLAS_COMUNES = [
  'UTF-8, con separador punto y coma (;). Un archivo separado por comas se rechaza.',
  'Decimales con punto (7.5). Se tolera la coma y la vista previa lo avisa.',
  'La primera fila es la cabecera, con los nombres exactos de las columnas. Las opcionales se pueden omitir.',
  'Sí/no se escribe si o no; vacío es «no evaluado».',
  'Si la especie no existe en el catálogo, la fila la crea. Si ya existe por nombre científico, la actualiza sin borrar celdas vacías.',
];

/** Documentación y estándares de carga para especies botánicas. */
export function EstandarEspeciesScreen() {
  const { user } = useAuth();
  const puedeExportar = puedeCargarCsv(user?.role.code);
  const e = ESTANDAR_ESPECIES;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estándar de especies"
        description="El formato del archivo CSV de especies botánicas para altas y actualizaciones masivas en el catálogo."
      >
        <DescargasDelEstandar estandar={e} puedeExportar={puedeExportar} />
      </PageHeader>

      <Card title="Reglas del estándar">
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {REGLAS_COMUNES.map((regla) => (
            <li key={regla}>{regla}</li>
          ))}
        </ul>
      </Card>

      <section aria-labelledby="estandar-species-doc" className="surface-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="estandar-species-doc" className="text-xl font-semibold text-neutral-900">
            Columnas del archivo <code className="text-base font-normal text-neutral-500">{e.archivo}</code>
          </h2>
          <span className="text-xs text-neutral-500">Separador punto y coma (;) · codificación UTF-8</span>
        </div>
        {e.grupos.map((grupo) => (
          <Card key={grupo.titulo} title={grupo.titulo}>
            {grupo.nota && <p className="mb-3 text-sm text-neutral-700">{grupo.nota}</p>}
            <dl className="divide-y divide-neutral-100 text-sm">
              {grupo.columnas.map((c) => (
                <div key={c.nombre} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr]">
                  <dt className="font-mono text-neutral-900">
                    {c.nombre}
                    {c.obligatoria && (
                      <span className="ml-2 font-sans text-xs font-semibold text-brand-700">obligatoria</span>
                    )}
                  </dt>
                  <dd className="text-neutral-700">{c.descripcion}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
        {e.informativas.length > 0 && (
          <p className="text-sm text-neutral-700">
            Informativas (se exportan y se ignoran al cargar):{' '}
            <span className="font-mono">{e.informativas.join(', ')}</span>.
          </p>
        )}
      </section>
    </div>
  );
}
