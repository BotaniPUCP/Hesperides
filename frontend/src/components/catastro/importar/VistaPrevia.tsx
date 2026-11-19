'use client';

import { Button, Card } from '@/components/ui';
import { CopiarErrores } from '@/components/importar/CopiarErrores';
import { EspeciesDelArchivoSection } from './EspeciesDelArchivoSection';
import { ConfirmarImportacionModal } from './ConfirmarImportacionModal';
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
  const especiesInactivasOmitidas = vista.skippedInactiveSpecies?.length ?? 0;
  const reviewLocked = imp.reanalizando || imp.summaryLoading || imp.confirmationOpen || imp.fase === 'confirmando';

  return (
    <>
      <Card title="2. Revisa lo que se cargará">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cifra valor={vista.totalRows} etiqueta="filas en el archivo" />
            {imp.kind !== 'species-photos' && <Cifra valor={imp.toCreateEfectivo} etiqueta={imp.estandar.textos.nuevos} />}
            <Cifra valor={vista.toUpdate} etiqueta={imp.estandar.textos.aCorregir} />
            {imp.estandar.porEspecie && <Cifra valor={especiesOmitidas} etiqueta="filas omitidas por especie" />}
            {imp.kind === 'species' && especiesInactivasOmitidas > 0 && (
              <Cifra valor={especiesInactivasOmitidas} etiqueta="filas inactivas protegidas" />
            )}
          </div>

          {imp.kind === 'species' && especiesInactivasOmitidas > 0 && (
            <section role="status" aria-label="Especies inactivas omitidas" className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-sm font-semibold text-neutral-800">
                Las especies inactivas no se modificarán. Estas filas se omitirán:
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm text-neutral-700">
                {vista.skippedInactiveSpecies?.map((row) => (
                  <li key={`${row.line}-${row.scientificName}`}>
                    Línea {row.line}: <span className="italic">{row.scientificName}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {imp.kind === 'specimens' && (vista.speciesChanges?.length ?? 0) > 0 && (
            <section aria-labelledby="cambios-especie-ejemplares" className="space-y-2">
              <h3 id="cambios-especie-ejemplares" className="font-semibold text-neutral-900">
                Ejemplares con cambio de especie
              </h3>
              <ul aria-label="Cambios de especie propuestos" className="space-y-1 text-sm">
                {vista.speciesChanges?.map((change) => (
                  <li key={change.code} className="rounded-lg border border-neutral-200 bg-neutral-0 px-3 py-2">
                    <span className="font-mono font-semibold">{change.code}</span>
                    <span className="mx-2 text-neutral-500">·</span>
                    <span className="italic">{change.previousScientificName ?? 'Sin especie asignada'}</span>
                    <span className="mx-2 text-neutral-500" aria-label="cambia a">→</span>
                    <span className="font-semibold italic">{change.nextScientificName}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {vista.decimalComma && (
            <p className="rounded-md bg-urgency-medium-bg px-3 py-2 text-sm text-urgency-medium-fg">
              El archivo usa coma decimal. Se aceptó, pero el estándar es el punto (7.5).
            </p>
          )}

          {vista.totalRows === 0 && vista.issues.length === 0 && (
            <p className="rounded-md bg-urgency-medium-bg px-3 py-2 text-sm text-urgency-medium-fg">
              El archivo solo tiene la cabecera y ninguna fila de datos para cargar.
            </p>
          )}

          {vista.issues.length > 0 && (
            <section aria-labelledby="errores-formato" className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id="errores-formato" className="font-semibold text-urgency-critical-fg">
                  {vista.issues.length === 1 ? '1 error de formato' : `${vista.issues.length} errores de formato`}: corrige el
                  archivo y vuelve a subirlo
                </h3>
                <CopiarErrores
                  errores={vista.issues.map((i) => ({ ...i, mensaje: traducirMensajeCatastro(i.message) }))}
                />
              </div>
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

          {imp.kind === 'specimens' && (
            <EspeciesDelArchivoSection
              bindings={vista.speciesBindings ?? []}
              unknownSpecies={vista.unknownSpecies ?? []}
              disabled={reviewLocked}
              onVincular={imp.vincularEspecie}
            />
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

          {imp.kind !== 'specimens' && vista.unknownSpecies.length > 0 && (
            <section
              aria-labelledby="especies-desconocidas"
              className="rounded-2xl border border-neutral-200/90 bg-neutral-50/60 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-neutral-200/60">
                <div>
                  <h3 id="especies-desconocidas" className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <span>Especies no registradas en el catálogo</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-200 text-neutral-700">
                      {vista.unknownSpecies.length}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Estas filas no se cargarán porque la especie no está en el catálogo.
                  </p>
                </div>
              </div>

              <ul className="space-y-2">
                {vista.unknownSpecies.map((s) => (
                  <li key={s.sourceKey ?? s.name} className="rounded-xl border border-neutral-200 bg-neutral-0 p-4 shadow-xs">
                    <div className="flex min-w-0 items-start gap-3">
                      <span aria-hidden="true" className="mt-0.5 rounded-lg border border-brand-200 bg-brand-50 p-2 text-brand-700">🌱</span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold italic text-neutral-900">{s.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                          <span>{s.rows} {s.rows === 1 ? 'fila' : 'filas'}</span>
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200/80">
                            No registrada en el catálogo
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {vista.duplicates.length > 0 && <DecisionesDeDuplicados imp={imp} />}

          {imp.bindingsPending && (
            <div className="flex flex-wrap items-center gap-3">
              <p role="status" className="text-sm text-neutral-600">
                La vista previa debe actualizarse antes de confirmar esta asociación.
              </p>
              {!imp.recuperacion && (
                <Button size="sm" variant="secondary" onClick={() => void imp.reanalizar()} disabled={reviewLocked}
                  loading={imp.reanalizando}>
                  Re-analizar cambios
                </Button>
              )}
            </div>
          )}

          {imp.recuperacion === 'reanalyze' && (
              <Button size="sm" variant="secondary" onClick={() => void imp.reanalizar()}
              disabled={reviewLocked} loading={imp.reanalizando}>
              Actualizar vista previa
            </Button>
          )}
          {imp.recuperacion === 'new-preview' && (
              <Button size="sm" variant="secondary" onClick={() => void imp.renovarVistaPrevia()}
              disabled={reviewLocked} loading={imp.reanalizando}>
              Crear una vista previa nueva
            </Button>
          )}

          {imp.error && <p role="alert" className="text-sm text-action-danger">{imp.error}</p>}

          {vista.issues.length > 0 && (
            <div
              role="status"
              aria-label="No se puede continuar con la importación"
              className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 flex items-start gap-3"
            >
              <span className="text-base mt-0.5" aria-hidden="true">⚠️</span>
              <div className="space-y-0.5">
                <p className="font-semibold text-neutral-900">No se puede continuar con la importación</p>
                <p className="text-xs text-neutral-600">
                  Corrige los errores indicados en el archivo CSV y vuelve a subirlo. No se importará ningún ejemplar hasta que se solucionen.
                </p>
              </div>
            </div>
          )}

          {vista.issues.length === 0 && imp.sinOperaciones && (
            <div
              role="status"
              aria-label="No hay registros que se puedan importar"
              className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm text-amber-900 flex items-start gap-3"
            >
              <span className="text-base mt-0.5" aria-hidden="true">⚠️</span>
              <div className="space-y-0.5">
                <p className="font-semibold text-neutral-900">
                  {imp.kind === 'specimens'
                    ? 'No hay ejemplares que se puedan importar'
                    : imp.kind === 'species'
                      ? 'No hay especies que se puedan importar'
                      : imp.kind === 'waste-bins'
                        ? 'No hay tachos que se puedan importar'
                        : imp.kind === 'drinking-fountains'
                          ? 'No hay bebederos que se puedan importar'
                          : 'No hay registros que se puedan importar'}
                </p>
                <p className="text-xs text-neutral-600">
                  {imp.kind === 'specimens'
                    ? 'Todas las filas del archivo serán omitidas debido a duplicados descartados o especies sin asociación. Puedes cambiar tus decisiones o subir otro archivo.'
                    : imp.kind === 'species'
                      ? (especiesInactivasOmitidas > 0
                        ? 'Todas las filas del archivo corresponden a especies inactivas que no se pueden modificar. Sube otro archivo con especies nuevas o activas.'
                        : 'El archivo no contiene especies nuevas ni cambios para actualizar. Sube otro archivo.')
                      : 'Todas las filas del archivo serán omitidas debido a duplicados descartados. Puedes cambiar tus decisiones o subir otro archivo.'}
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={imp.confirmar} disabled={!imp.puedeConfirmar} loading={imp.summaryLoading || imp.fase === 'confirmando' || imp.reanalizando}>
              Confirmar carga
            </Button>
            <Button variant="ghost" onClick={imp.reiniciar} disabled={reviewLocked}>
              Subir otro archivo
            </Button>
          </div>
        </div>
      </Card>

      {(imp.kind === 'specimens' || imp.kind === 'species') && imp.confirmationSummary && (
        <ConfirmarImportacionModal
          summary={imp.confirmationSummary}
          isOpen={imp.confirmationOpen}
          isWorking={imp.fase === 'confirmando'}
          error={imp.error}
          onBack={imp.volverARevision}
          onConfirm={() => void imp.confirmarResumen()}
          kind={imp.kind}
        />
      )}
    </>
  );
}
