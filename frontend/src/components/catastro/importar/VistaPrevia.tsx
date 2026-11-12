'use client';

import { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { RegistroEspecieModal } from '@/components/inventario-verde';
import { SelectorDeEspecieParaImportacion } from './SelectorDeEspecieParaImportacion';
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
  const [especieModalOpen, setEspecieModalOpen] = useState(false);
  const [especieParaRegistrar, setEspecieParaRegistrar] = useState('');
  const [especieSourceKey, setEspecieSourceKey] = useState('');
  const [copiedIssues, setCopiedIssues] = useState(false);
  const [mostrarTodasAsociaciones, setMostrarTodasAsociaciones] = useState(false);
  const [buscarAsociacion, setBuscarAsociacion] = useState('');

  const vista = imp.vista;
  if (!vista) return null;
  const especiesOmitidas = vista.unknownSpecies.reduce((n, s) => n + s.rows, 0);
  const especiesInactivasOmitidas = vista.skippedInactiveSpecies?.length ?? 0;
  const asociaciones = vista.speciesBindings ?? [];
  const consultaAsociacion = buscarAsociacion.trim().toLowerCase();
  const asociacionesFiltradas = consultaAsociacion
    ? asociaciones.filter((binding) =>
      `${binding.sourceName} ${binding.scientificName}`.toLowerCase().includes(consultaAsociacion))
    : asociaciones;
  const asociacionesVisibles = !mostrarTodasAsociaciones
    ? asociacionesFiltradas.slice(0, 5)
    : asociacionesFiltradas;
  const reviewLocked = imp.reanalizando || imp.summaryLoading || imp.confirmationOpen || imp.fase === 'confirmando';

  return (
    <>
      <Card title="2. Revisa lo que se cargará">
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Cifra valor={vista.totalRows} etiqueta="filas en el archivo" />
            {imp.kind !== 'species-photos' && <Cifra valor={vista.toCreate} etiqueta={imp.estandar.textos.nuevos} />}
            <Cifra valor={vista.toUpdate} etiqueta={imp.estandar.textos.aCorregir} />
            {imp.estandar.porEspecie && <Cifra valor={especiesOmitidas} etiqueta="filas omitidas por especie" />}
            {imp.kind === 'species' && especiesInactivasOmitidas > 0 && (
              <Cifra valor={especiesInactivasOmitidas} etiqueta="filas inactivas protegidas" />
            )}
          </div>

          {imp.kind === 'species' && especiesInactivasOmitidas > 0 && (
            <section role="status" aria-label="Especies inactivas omitidas" className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-sm font-semibold text-neutral-800">
                Las especies inactivas no se editarán ni reactivarán. Estas filas se omitirán:
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
                <button
                  type="button"
                  onClick={() => {
                    const text = vista.issues
                      .map((i) => `Línea ${i.line}, columna ${i.column}: ${traducirMensajeCatastro(i.message)}`)
                      .join('\n');
                    navigator.clipboard.writeText(text);
                    setCopiedIssues(true);
                    setTimeout(() => setCopiedIssues(false), 2000);
                  }}
                  className="text-xs font-medium text-neutral-600 hover:text-neutral-900 border border-neutral-200 bg-neutral-0 px-2.5 py-1 rounded-md shadow-2xs transition-colors"
                >
                  {copiedIssues ? '✓ Errores copiados' : 'Copiar lista de errores'}
                </button>
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

          {imp.kind === 'specimens' && (vista.speciesBindings?.length ?? 0) > 0 && (
            <section aria-labelledby="asociaciones-especies" className="space-y-2">
              <h3 id="asociaciones-especies" className="font-semibold text-neutral-900">
                Especies que se asociarán a los ejemplares
              </h3>
              {asociaciones.length > 5 && (
                <div className="flex flex-wrap items-end gap-3">
                  <label className="min-w-56 flex-1 space-y-1 text-sm font-medium text-neutral-700">
                    <span>Buscar asociación</span>
                    <input
                      type="search"
                      value={buscarAsociacion}
                      onChange={(event) => setBuscarAsociacion(event.target.value)}
                      aria-label="Buscar asociación por nombre de origen o especie"
                      autoComplete="off"
                      className="min-h-10 w-full rounded-lg border border-neutral-300 bg-neutral-0 px-3 text-sm text-neutral-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                    />
                  </label>
                  {(asociacionesFiltradas.length > 5 || mostrarTodasAsociaciones) && (
                    <button
                      type="button"
                      aria-expanded={mostrarTodasAsociaciones}
                      aria-controls="lista-asociaciones-especies"
                      onClick={() => setMostrarTodasAsociaciones((visible) => !visible)}
                      className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-neutral-200 bg-neutral-0 px-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
                    >
                      {mostrarTodasAsociaciones ? 'Mostrar menos' : `Ver todas (${asociacionesFiltradas.length})`}
                    </button>
                  )}
                </div>
              )}
              {asociacionesVisibles.length === 0 ? (
                <p role="status" className="text-sm text-neutral-600">No hay asociaciones que coincidan con la búsqueda.</p>
              ) : (
              <ul id="lista-asociaciones-especies" aria-label="Asociaciones de especies" className="space-y-2">
                {asociacionesVisibles.map((binding) => (
                  <li key={binding.sourceKey} className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-0 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0">
                        <span className="italic">{binding.sourceName}</span>
                        <span className="mx-2 text-neutral-400">→</span>
                        <span className="font-semibold text-neutral-900">{binding.scientificName}</span>
                        <span className="ml-2 text-xs text-neutral-500">({binding.rows} {binding.rows === 1 ? 'fila' : 'filas'})</span>
                      </span>
                      <span className="text-xs text-neutral-500">
                        {binding.resolution === 'ALTERNATIVE_NAME'
                          ? 'Nombre alternativo único'
                          : binding.resolution === 'USER_SELECTED'
                            ? 'Selección del usuario'
                            : 'Coincidencia científica'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <SelectorDeEspecieParaImportacion
                        sourceName={binding.sourceName}
                        buttonLabel="Cambiar especie"
                        disabled={reviewLocked}
                        onSelect={(species) => void imp.vincularEspecie(binding.sourceKey, species.slug)}
                      />
                      <Button size="sm" variant="ghost" disabled={reviewLocked}
                        onClick={() => void imp.vincularEspecie(binding.sourceKey, null)}>
                        Quitar asociación
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              )}
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
            <section
              aria-labelledby="especies-desconocidas"
              className="rounded-2xl border border-neutral-200/90 bg-neutral-50/60 p-4 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-neutral-200/60">
                <div>
                  <h3 id="especies-desconocidas" className="font-bold text-sm text-neutral-900 flex items-center gap-2">
                    <span>{imp.kind === 'specimens' ? 'Especies pendientes de asociación' : 'Especies no registradas en el catálogo'}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-200 text-neutral-700">
                      {vista.unknownSpecies.length}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    {imp.kind === 'specimens'
                      ? 'Asocia cada grupo a una especie existente o registra una nueva. La selección solo afecta este lote; no crea alias ni modifica una especie existente.'
                      : 'Estas filas no se cargarán porque la especie no está en el catálogo.'}
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
                          {s.reason === 'AMBIGUOUS' && <span>Coincidencias ambiguas: selecciona una especie</span>}
                          {s.reason === 'USER_UNRESOLVED' && <span>Asociación pendiente de seleccionar</span>}
                        </div>
                      </div>
                    </div>
                    {imp.kind === 'specimens' && (
                      <div className="mt-4">
                        <SelectorDeEspecieParaImportacion
                          sourceName={s.name}
                          buttonLabel="Seleccionar especie existente"
                          disabled={reviewLocked}
                          toolbarAction={(
                            <Button size="sm" variant="secondary" disabled={reviewLocked} onClick={() => {
                              setEspecieParaRegistrar(s.name);
                              setEspecieSourceKey(s.sourceKey ?? s.name);
                              setEspecieModalOpen(true);
                            }}>
                              + Registrar nueva especie
                            </Button>
                          )}
                          onSelect={(species) => void imp.vincularEspecie(s.sourceKey ?? s.name, species.slug)}
                        />
                      </div>
                    )}
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

      <RegistroEspecieModal
        isOpen={especieModalOpen}
        onClose={() => setEspecieModalOpen(false)}
        initialScientificName={especieParaRegistrar}
        onCreated={async (created) => {
          setEspecieModalOpen(false);
          await imp.vincularEspecie(especieSourceKey, created.slug);
        }}
      />
      {imp.kind === 'specimens' && imp.confirmationSummary && (
        <ConfirmarImportacionModal
          summary={imp.confirmationSummary}
          isOpen={imp.confirmationOpen}
          isWorking={imp.fase === 'confirmando'}
          error={imp.error}
          onBack={imp.volverARevision}
          onConfirm={() => void imp.confirmarResumen()}
        />
      )}
    </>
  );
}
