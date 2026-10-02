'use client';

import { Card } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';
import { DescargasDelEstandar } from './DescargasDelEstandar';
import { COLUMNAS_INFORMATIVAS, ESTANDAR_EJEMPLARES } from './estandarEjemplares';
import { puedeCargarCsv } from './permisos';

const REGLAS_COMUNES = [
  'UTF-8, con separador punto y coma (;). Un archivo separado por comas se rechaza.',
  'Decimales con punto (7.5). Se tolera la coma y la vista previa lo avisa.',
  'La primera fila es la cabecera, con los nombres exactos de las columnas. Las opcionales se pueden omitir.',
  'Fechas AAAA-MM-DD. Sí/no se escribe si o no; vacío es «no se evaluó».',
  'Coordenadas en grados decimales, dentro del campus.',
];

/** Los estándares de carga del catastro (SPEC-103 §6), con su plantilla. */
export function EstandaresScreen() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold text-neutral-900">Estándares de carga</h1>
        <p className="text-neutral-700">
          El formato de los archivos CSV del catastro. Es el mismo que produce la exportación: se exporta, se
          corrige y se vuelve a cargar.
        </p>
        <DescargasDelEstandar puedeExportar={puedeCargarCsv(user?.role.code)} />
      </header>

      <Card title="Reglas comunes">
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          {REGLAS_COMUNES.map((regla) => (
            <li key={regla}>{regla}</li>
          ))}
        </ul>
      </Card>

      <section aria-labelledby="estandar-ejemplares" className="space-y-4">
        <h2 id="estandar-ejemplares" className="text-xl font-semibold text-neutral-900">
          Ejemplares <code className="text-base font-normal text-neutral-500">ejemplares.csv</code>
        </h2>
        {ESTANDAR_EJEMPLARES.map((grupo) => (
          <Card key={grupo.titulo} title={grupo.titulo}>
            {grupo.nota && <p className="mb-3 text-sm text-neutral-700">{grupo.nota}</p>}
            <dl className="divide-y divide-neutral-100 text-sm">
              {grupo.columnas.map((c) => (
                <div key={c.nombre} className="grid gap-1 py-2 sm:grid-cols-[14rem_1fr]">
                  <dt className="font-mono text-neutral-900">
                    {c.nombre}
                    {c.obligatoria && <span className="ml-2 font-sans text-xs font-semibold text-brand-700">obligatoria</span>}
                  </dt>
                  <dd className="text-neutral-700">{c.descripcion}</dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
        <p className="text-sm text-neutral-700">
          Informativas (se exportan y se ignoran al cargar):{' '}
          <span className="font-mono">{COLUMNAS_INFORMATIVAS.join(', ')}</span>.
        </p>
      </section>

      <p className="text-sm text-neutral-500">Tachos, bebederos y fotos de especies tendrán su estándar en la próxima entrega.</p>
    </div>
  );
}
