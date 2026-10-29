'use client';

import { useState } from 'react';
import type { DuplicateMatch } from '@shared/types';
import { ApiError } from '@/lib/api';
import { catastroApi } from '@/lib/catastro-api';
import { mensajeDeErrorCatastro } from '../mensajes';
import { aSpecimenForm, type Errores, FORMULARIO_VACIO, type FormularioPlanta } from './formularioPlanta';

/**
 * El registro de una planta (SPEC-103 §5.1). Si cae cerca de otra de su
 * especie, el backend responde 409: se pregunta y, si es otra planta, se
 * reenvía confirmando.
 */
export function useRegistroPlanta() {
  const [valores, setValores] = useState<FormularioPlanta>(FORMULARIO_VACIO);
  // Desde dónde se cuenta un cambio: vacío, o lo que deja «Registrar otra».
  const [base, setBase] = useState<FormularioPlanta>(FORMULARIO_VACIO);
  const [foto, setFoto] = useState<File | null>(null);
  const [errores, setErrores] = useState<Errores>({});
  const [enviando, setEnviando] = useState(false);
  const [duplicado, setDuplicado] = useState<DuplicateMatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [registrado, setRegistrado] = useState<string | null>(null);

  function cambiar<K extends keyof FormularioPlanta>(campo: K, valor: FormularioPlanta[K]) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function enviar(confirmarDuplicado = false) {
    const { form, errores: encontrados } = aSpecimenForm(valores);
    setErrores(encontrados);
    if (!form) return;
    setEnviando(true);
    setError(null);
    try {
      setRegistrado(await catastroApi.register(form, foto, confirmarDuplicado));
      setDuplicado(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 409 && e.data) setDuplicado(e.data as DuplicateMatch);
      else setError(mensajeDeErrorCatastro(e));
    } finally {
      setEnviando(false);
    }
  }

  /** Otra planta de la misma especie: conserva el punto, que suele ser el mismo sector. */
  function registrarOtra() {
    const siguiente = { ...FORMULARIO_VACIO, especie: valores.especie, lat: valores.lat, lon: valores.lon };
    setValores(siguiente);
    setBase(siguiente);
    setFoto(null);
    setRegistrado(null);
    setErrores({});
  }

  const sinGuardar = registrado === null && (foto !== null || JSON.stringify(valores) !== JSON.stringify(base));

  return {
    valores, foto, errores, enviando, duplicado, error, registrado, sinGuardar,
    cambiar, setFoto, enviar, registrarOtra, descartarDuplicado: () => setDuplicado(null),
  };
}

export type RegistroPlanta = ReturnType<typeof useRegistroPlanta>;
