'use client';

import { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { RegistroEspecieModal } from '@/components/inventario-verde';
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
  const [copiedIssues, setCopiedIssues] = useState(false);

  const vista = imp.vista;
  if (!vista) return null;
  const especiesOmitidas = vista.unknownSpecies.reduce((n, s) => n + s.rows, 0);

  return (
    <>
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
                    <span>Especies no registradas en el catálogo</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-neutral-200 text-neutral-700">
                      {vista.unknownSpecies.length}
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-600 mt-0.5">
                    Estas filas no se cargarán a menos que registres la especie. Puedes registrarla ahora mismo para incluirla en esta carga sin volver a subir el archivo.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={imp.reanalizar}
                  loading={imp.reanalizando}
                  leadingIcon={
                    <svg className="w-3.5 h-3.5 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  }
                >
                  Re-analizar
                </Button>
              </div>

              <ul className="space-y-2">
                {vista.unknownSpecies.map((s) => (
                  <li
                    key={s.name}
                    className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-neutral-0 border border-neutral-200/80 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="p-1.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200/60 shrink-0">
                        🌱
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-neutral-900 italic truncate">
                          {s.name}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {s.rows} {s.rows === 1 ? 'fila' : 'filas'}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEspecieParaRegistrar(s.name);
                        setEspecieModalOpen(true);
                      }}
                    >
                      + Registrar especie
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {vista.duplicates.length > 0 && <DecisionesDeDuplicados imp={imp} />}

          {imp.error && <p role="alert" className="text-sm text-action-danger">{imp.error}</p>}

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button onClick={imp.confirmar} disabled={!imp.puedeConfirmar} loading={imp.fase === 'confirmando'}>
              Confirmar carga
            </Button>
            <Button variant="ghost" onClick={imp.reiniciar}>
              Subir otro archivo
            </Button>
          </div>
        </div>
      </Card>

      <RegistroEspecieModal
        isOpen={especieModalOpen}
        onClose={() => setEspecieModalOpen(false)}
        initialScientificName={especieParaRegistrar}
        onCreated={async () => {
          setEspecieModalOpen(false);
          await imp.reanalizar();
        }}
      />
    </>
  );
}
