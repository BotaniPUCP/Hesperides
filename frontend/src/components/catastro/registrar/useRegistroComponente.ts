'use client';

import { useState } from 'react';
import type { DuplicateMatch, FeatureForm } from '@shared/types';
import { ApiError } from '@/lib/api';
import { catastroApi } from '@/lib/catastro-api';
import { mensajeDeErrorCatastro } from '../mensajes';
import { aFeatureForm, componenteVacio, type ErroresComponente, type FormularioComponente } from './formularioComponente';

/** El registro de un tacho o bebedero: mismo ciclo que el de una planta, incluido el 409 de duplicado. */
export function useRegistroComponente(kind: FeatureForm['kind']) {
  const [valores, setValores] = useState<FormularioComponente>(componenteVacio(kind));
  const [foto, setFoto] = useState<File | null>(null);
  const [errores, setErrores] = useState<ErroresComponente>({});
  const [enviando, setEnviando] = useState(false);
  const [duplicado, setDuplicado] = useState<DuplicateMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registrado, setRegistrado] = useState<string | null>(null);

  function cambiar<K extends keyof FormularioComponente>(campo: K, valor: FormularioComponente[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function enviar(confirmarDuplicado = false) {
    const { form, errores: encontrados } = aFeatureForm(valores);
    setErrores(encontrados);
    if (!form) return;
    setEnviando(true);
    setError(null);
    try {
      setRegistrado(await catastroApi.registerFeature(form, foto, confirmarDuplicado));
      setDuplicado(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.data) setDuplicado(e.data as DuplicateMatch);
      else setError(mensajeDeErrorCatastro(e));
    } finally {
      setEnviando(false);
    }
  }

  function registrarOtro() {
    setValores(componenteVacio(kind));
    setFoto(null);
    setRegistrado(null);
    setErrores({});
  }

  return {
    valores, foto, errores, enviando, duplicado, error, registrado,
    cambiar, setFoto, enviar, registrarOtro, descartarDuplicado: () => setDuplicado(null),
  };
}

export type RegistroComponente = ReturnType<typeof useRegistroComponente>;
