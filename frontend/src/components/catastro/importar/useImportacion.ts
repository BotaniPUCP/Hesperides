'use client';

import { useState } from 'react';
import { useUnsavedChangesGuard } from '@/components/forms/unsaved/useUnsavedChangesGuard';
import type { ImportKind, ImportPreview, ImportResult } from '@shared/types';
import { catastroApi } from '@/lib/catastro-api';
import { estandar } from '../estandares';
import { mensajeDeErrorCatastro } from '../mensajes';

export type Fase = 'elegir' | 'revisando' | 'vista' | 'confirmando' | 'hecho';

/**
 * El flujo de una carga por CSV (SPEC-103 §5.2): se sube, se revisa la vista
 * previa, se decide cada posible duplicado y se confirma. Nada se escribe
 * hasta confirmar.
 */
export function useImportacion() {
  const [kind, setKindState] = useState<ImportKind>('specimens');
  const [fase, setFase] = useState<Fase>('elegir');
  const [csv, setCsv] = useState<File | null>(null);
  const [zip, setZip] = useState<File | null>(null);
  const [vista, setVista] = useState<ImportPreview | null>(null);
  const [decisiones, setDecisiones] = useState<Record<number, boolean>>({});
  const [resultado, setResultado] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Un archivo elegido o una vista previa sin confirmar es trabajo que se pierde al salir.
  const guard = useUnsavedChangesGuard(fase !== 'hecho' && (csv !== null || zip !== null || vista !== null));

  const pendientes = vista ? vista.duplicates.filter((d) => decisiones[d.line] === undefined).length : 0;
  const puedeConfirmar = vista !== null && vista.canConfirm && pendientes === 0 && fase === 'vista';

  async function revisar() {
    if (!csv) return;
    setFase('revisando');
    setError(null);
    try {
      setVista(await catastroApi.previewImport(kind, csv, zip));
      setDecisiones({});
      setFase('vista');
    } catch (e) {
      setError(mensajeDeErrorCatastro(e));
      setFase('elegir');
    }
  }

  async function confirmar() {
    if (!vista || !puedeConfirmar) return;
    setFase('confirmando');
    setError(null);
    try {
      setResultado(await catastroApi.confirmImport(vista.batchId, decisiones));
      setFase('hecho');
    } catch (e) {
      setError(mensajeDeErrorCatastro(e));
      setFase('vista');
    }
  }

  function decidir(linea: number, ingresar: boolean) {
    setDecisiones((actual) => ({ ...actual, [linea]: ingresar }));
  }

  function decidirTodos(ingresar: boolean) {
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
    setFase('elegir');
    setCsv(null);
    setZip(null);
    setVista(null);
    setDecisiones({});
    setResultado(null);
    setError(null);
  }

  return {
    kind, estandar: estandar(kind), setKind,
    fase, csv, zip, vista, decisiones, resultado, error, pendientes, puedeConfirmar,
    setCsv, setZip, revisar, confirmar, decidir, decidirTodos, reiniciar, avisoSinGuardar: guard.dialog,
  };
}

export type Importacion = ReturnType<typeof useImportacion>;
