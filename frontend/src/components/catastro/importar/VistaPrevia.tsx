'use client';

import { Button, Card } from '@/components/ui';
import { traducirMensajeCatastro } from '../mensajes';
import { DecisionesDeDuplicados } from './DecisionesDeDuplicados';
import type { Importacion } from './useImportacion';

function Cifra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 px-4 py-3">
      <div className="text-2xl font-bold text-neutral-900">{valor}</div>
      <div className="text-sm text-neutral-500">{etiqueta}</div>
    </div>
  );
}

const fotos = (n: number) => (n === 1 ? '1 foto' : `${n} fotos`);

/** Lo que haría la carga, antes de hacerlo (SPEC-103 §5.2). */
export function VistaPrevia({ imp }: { imp: Importacion }) {
  const vista = imp.vista;
  if (!vista) return null;
  const especiesOmitidas = vista.unknownSpecies.reduce((n, s) => n + s.rows, 0);

  return (
    <Card title="2. Revisa lo que se cargará">
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Cifra valor={vista.totalRows} etiqueta="filas en el archivo" />
          {imp.kind !== 'species-photos' && <Cifra valor={vista.toCreate} etiqueta={imp.estandar.textos.nuevos} />}
          <Cifra valor={vista.toUpdate} etiqueta={imp.estandar.textos.aCorregir} />
          {imp.estandar.porEspecie && <Cifra valor={especiesOmitidas} etiqueta="filas omitidas por especie" />}
        </div>

        {vista.decimalComma && (
          <p className="rounded-md bg-urgency-medium-bg px-3 py-2 text-sm text-urgency-medium-fg">
            El archivo usa coma decimal. Se aceptó, pero el estándar es el punto (7.5).
          </p>
        )}

        {vista.issues.length > 0 && (
          <section aria-labelledby="errores-formato" className="space-y-2">
            <h3 id="errores-formato" className="font-semibold text-urgency-critical-fg">
              {vista.issues.length === 1 ? '1 error de formato' : `${vista.issues.length} errores de formato`}: corrige el
              archivo y vuelve a subirlo
            </h3>
            <table className="w-full text-left text-sm">
              <thead className="text-neutral-500">
                <tr>
                  <th className="py-1 pr-3 font-medium">Línea</th>
                  <th className="py-1 pr-3 font-medium">Columna</th>
                  <th className="py-1 font-medium">Problema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {vista.issues.map((i) => (
                  <tr key={`${i.line}-${i.column}-${i.message}`}>
                    <td className="py-1 pr-3">{i.line}</td>
                    <td className="py-1 pr-3 font-mono">{i.column}</td>
                    <td className="py-1">{traducirMensajeCatastro(i.message)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {vista.photoSets.length > 0 && (
          <section aria-labelledby="conjuntos-de-fotos" className="space-y-1">
            <h3 id="conjuntos-de-fotos" className="font-semibold text-neutral-900">
              Fotos por especie (el archivo reemplaza todas las fotos de cada una)
            </h3>
            <ul className="list-disc pl-5 text-sm text-neutral-700">
              {vista.photoSets.map((s) => (
                <li key={s.species}>
                  <span className="italic">{s.species}</span>: {fotos(s.current)} hoy, {fotos(s.incoming)} después
                </li>
              ))}
            </ul>
          </section>
        )}

        {vista.unknownSpecies.length > 0 && (
          <section aria-labelledby="especies-desconocidas" className="space-y-1">
            <h3 id="especies-desconocidas" className="font-semibold text-neutral-900">
              Especies que no están en el catálogo (sus filas no se cargarán)
            </h3>
            <ul className="list-disc pl-5 text-sm text-neutral-700">
              {vista.unknownSpecies.map((s) => (
                <li key={s.name}>
                  <span className="italic">{s.name}</span>: {s.rows} {s.rows === 1 ? 'fila' : 'filas'}
                </li>
              ))}
            </ul>
          </section>
        )}

        {vista.duplicates.length > 0 && <DecisionesDeDuplicados imp={imp} />}

        {imp.error && <p role="alert" className="text-sm text-action-danger">{imp.error}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={imp.confirmar} disabled={!imp.puedeConfirmar} loading={imp.fase === 'confirmando'}>
            Confirmar carga
          </Button>
          <Button variant="ghost" onClick={imp.reiniciar}>
            Subir otro archivo
          </Button>
          {vista.canConfirm && imp.pendientes > 0 && (
            <span className="text-sm text-neutral-500">
              Falta decidir {imp.pendientes === 1 ? '1 posible duplicado' : `${imp.pendientes} posibles duplicados`}.
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
