'use client';

import { useRef, useState } from 'react';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import type { ImportConfirmationSummary, ImportKind, ImportPreview, ImportResult } from '@shared/types';
import { catastroApi } from '@/lib/catastro-api';
import { ApiError } from '@/lib/api';
import { estandar } from '../estandares';
import { mensajeDeErrorCatastro } from '../mensajes';

export type Fase = 'elegir' | 'revisando' | 'vista' | 'confirmando' | 'hecho';
export type RecuperacionImportacion = 'reanalyze' | 'new-preview' | null;

function recuperarCon(e: unknown): RecuperacionImportacion {
  if (!(e instanceof ApiError)) return null;
  const message = e.message.toLowerCase();
  if (message.includes('preview expired') || message.includes('preview changed or expired')) return 'new-preview';
  if (message.includes('changed after the preview') || message.includes('nearby plants changed')
      || message.includes('this preview changed')) return 'reanalyze';
  return null;
}

/**
 * El flujo de una carga por CSV (SPEC-103 §5.2): se sube, se revisa la vista
 * previa, se decide cada posible duplicado y se confirma. Nada se escribe
 * hasta confirmar.
 */
export function useImportacion(initialKind: ImportKind = 'specimens') {
  const [kind, setKindState] = useState<ImportKind>(initialKind);
  const [fase, setFase] = useState<Fase>('elegir');
  const [csv, setCsvState] = useState<File | null>(null);
  const [zip, setZipState] = useState<File | null>(null);
  const [vista, setVista] = useState<ImportPreview | null>(null);
  const [decisiones, setDecisiones] = useState<Record<number, boolean>>({});
  const [speciesBindings, setSpeciesBindings] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reanalizando, setReanalizando] = useState(false);
  const [bindingsPending, setBindingsPending] = useState(false);
  const [recuperacion, setRecuperacion] = useState<RecuperacionImportacion>(null);
  const [confirmationSummary, setConfirmationSummary] = useState<ImportConfirmationSummary | null>(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const summaryRequest = useRef(false);
  const confirmationRequest = useRef(false);
  const planRevision = useRef(0);
  const confirmationRevision = useRef<number | null>(null);
  // Un archivo elegido o una vista previa sin confirmar es trabajo que se pierde al salir.
  const guard = useUnsavedChangesGuard(fase !== 'hecho' && (csv !== null || zip !== null || vista !== null));

  const pendientes = vista ? vista.duplicates.filter((d) => decisiones[d.line] === undefined).length : 0;
  const planConfirmable = vista !== null && vista.canConfirm && pendientes === 0 && fase === 'vista'
    && !reanalizando && !bindingsPending;
  const puedeConfirmar = planConfirmable && !summaryLoading && !confirmationOpen;

  function invalidarResumen() {
    planRevision.current += 1;
    confirmationRevision.current = null;
    setConfirmationSummary(null);
    setConfirmationOpen(false);
  }

  function setCsv(file: File | null) {
    invalidarResumen();
    setCsvState(file);
  }

  function setZip(file: File | null) {
    invalidarResumen();
    setZipState(file);
  }

  async function revisar() {
    if (!csv) return;
    invalidarResumen();
    setFase('revisando');
    setError(null);
    try {
      setVista(await catastroApi.previewImport(kind, csv, zip));
      setDecisiones({});
      setSpeciesBindings({});
      setBindingsPending(false);
      setRecuperacion(null);
      setFase('vista');
    } catch (e) {
      setError(mensajeDeErrorCatastro(e));
      setRecuperacion(null);
      setFase('elegir');
    }
  }

  /**
   * Re-analiza el archivo CSV/ZIP en memoria sin desmontar la pantalla de vista previa.
   * Útil cuando se crea una especie al vuelo o se resuelven dependencias externas.
   */
  async function reanalizar(bindings = speciesBindings) {
    if (!csv || reanalizando) return;
    invalidarResumen();
    setReanalizando(true);
    setError(null);
    try {
      const next = kind === 'specimens' && vista
        ? await catastroApi.reanalyzeImport(vista.batchId, csv, zip, bindings)
        : await catastroApi.previewImport(kind, csv, zip, kind === 'specimens' ? bindings : undefined);
      setVista(next);
      setDecisiones({});
      setSpeciesBindings(bindings);
      setBindingsPending(false);
      setRecuperacion(null);
    } catch (e) {
      setError(mensajeDeErrorCatastro(e));
      setRecuperacion(recuperarCon(e));
    } finally {
      setReanalizando(false);
    }
  }

  /** After expiry, start a fresh server batch from the still-selected files and keep specimen bindings. */
  async function renovarVistaPrevia() {
    if (!csv || reanalizando) return;
    invalidarResumen();
    setReanalizando(true);
    setError(null);
    try {
      const next = await catastroApi.previewImport(kind, csv, zip, kind === 'specimens' ? speciesBindings : undefined);
      setVista(next);
      setDecisiones({});
      setBindingsPending(false);
      setRecuperacion(null);
      setFase('vista');
    } catch (e) {
      setError(mensajeDeErrorCatastro(e));
      setRecuperacion(recuperarCon(e));
    } finally {
      setReanalizando(false);
    }
  }

  async function vincularEspecie(sourceKey: string, speciesSlug: string | null) {
    if (reanalizando) return;
    invalidarResumen();
    const next = { ...speciesBindings, [sourceKey]: speciesSlug ?? '' };
    setSpeciesBindings(next);
    setBindingsPending(true);
    await reanalizar(next);
  }

  async function ejecutarConfirmacion(summaryFingerprint?: string) {
    if (!vista || !planConfirmable || confirmationRequest.current) return;
    confirmationRequest.current = true;
    setFase('confirmando');
    setError(null);
    try {
      const result = summaryFingerprint === undefined
        ? await catastroApi.confirmImport(vista.batchId, decisiones)
        : await catastroApi.confirmImport(vista.batchId, decisiones, summaryFingerprint);
      setResultado(result);
      setFase('hecho');
      confirmationRevision.current = null;
      setConfirmationSummary(null);
      setConfirmationOpen(false);
    } catch (e) {
      setError(mensajeDeErrorCatastro(e));
      const recovery = recuperarCon(e);
      setRecuperacion(recovery);
      setFase('vista');
      if (recovery) invalidarResumen();
    } finally {
      confirmationRequest.current = false;
    }
  }

  async function confirmar() {
    if (!vista || !puedeConfirmar || summaryRequest.current) return;
    // Esta confirmación resumida es para el plan de ejemplares; los otros estándares conservan su flujo actual.
    if (kind !== 'specimens') {
      await ejecutarConfirmacion();
      return;
    }

    const revision = planRevision.current;
    const batchId = vista.batchId;
    const decisions = { ...decisiones };
    if (!vista.planFingerprint) {
      setError('La vista previa no tiene una versión verificable. Actualízala antes de importar.');
      setRecuperacion('reanalyze');
      return;
    }
    summaryRequest.current = true;
    setSummaryLoading(true);
    setError(null);
    setRecuperacion(null);
    try {
      const summary = await catastroApi.confirmationSummary(batchId, decisions, vista.planFingerprint);
      if (revision !== planRevision.current || summary.batchId !== batchId) return;
      confirmationRevision.current = revision;
      setConfirmationSummary(summary);
      setConfirmationOpen(true);
    } catch (e) {
      setError(mensajeDeErrorCatastro(e));
      setRecuperacion(recuperarCon(e));
    } finally {
      summaryRequest.current = false;
      setSummaryLoading(false);
    }
  }

  async function confirmarResumen() {
    if (!confirmationOpen || !confirmationSummary || confirmationRevision.current !== planRevision.current
        || confirmationSummary.batchId !== vista?.batchId || !planConfirmable) {
      invalidarResumen();
      return;
    }
    await ejecutarConfirmacion(confirmationSummary.fingerprint);
  }

  function volverARevision() {
    invalidarResumen();
  }

  function decidir(linea: number, ingresar: boolean) {
    invalidarResumen();
    setDecisiones((actual) => ({ ...actual, [linea]: ingresar }));
  }

  function decidirTodos(ingresar: boolean) {
    invalidarResumen();
    setDecisiones(Object.fromEntries((vista?.duplicates ?? []).map((d) => [d.line, ingresar])));
  }

  /** Cambiar de estándar descarta lo elegido: otro estándar, otro archivo. */
  function setKind(k: ImportKind) {
    guard.confirm(() => {
      limpiar();
      setKindState(k);
    });
  }

  function reiniciar() {
    guard.confirm(limpiar);
  }

  function limpiar() {
    invalidarResumen();
    setFase('elegir');
    setCsv(null);
    setZip(null);
    setVista(null);
    setDecisiones({});
    setSpeciesBindings({});
    setBindingsPending(false);
    setRecuperacion(null);
    setResultado(null);
    setError(null);
  }

  return {
    kind, estandar: estandar(kind), setKind,
    fase, csv, zip, vista, decisiones, resultado, error, pendientes, puedeConfirmar, planConfirmable,
    reanalizando, bindingsPending, speciesBindings, recuperacion, reanalizar, renovarVistaPrevia, vincularEspecie,
    confirmationSummary, confirmationOpen, summaryLoading,
    setCsv, setZip, revisar, confirmar, confirmarResumen, volverARevision,
    decidir, decidirTodos, reiniciar, avisoSinGuardar: guard.dialog,
  };
}

export type Importacion = ReturnType<typeof useImportacion>;
