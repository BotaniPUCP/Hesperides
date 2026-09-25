'use client';

import { useEffect, useState } from 'react';
import type { SystemParameter } from '@shared/types';
import { Button, Card, useToast } from '@/components/ui';
import { mensajeDeApiError } from '@/lib/api-errors';
import { systemParametersApi } from '@/lib/system-parameters-api';

/**
 * Pantalla "Parámetros del sistema" (SPEC-003 §5.6). Solo ADMIN (SPEC-001
 * Anexo A): es la configuración global que gobierna cómo se valida y cómo se
 * pinta el resto de la app, así que ni siquiera quien la lee debería ver los
 * valores tal cual los guarda el sistema. El RouteGuard ya filtró (403/redirect
 * si no eres ADMIN); aquí solo se cargan, se editan por valueType y se guardan.
 *
 * Convención del contrato: «value» viaja como string ($«strings») y
 * «valueType» dice cómo hay que pintarlo: BOOLEAN → desplegable Sí/No,
 * INTEGER/DECIMAL → input numérico, STRING → texto.
 */
export function SystemParametersAdminScreen() {
  const [parametros, setParametros] = useState<SystemParameter[] | null>(null);
  const [cargando, setCargando] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [sucia, setSucia] = useState<Record<string, string>>({});
  const { showToast } = useToast();

  const [reloadToken, setReloadToken] = useState(0);

  // Refrescar solo mueve el token: quien pide los datos es el efecto, y el
  // estado se toca en los callbacks de la promesa, nunca en su cuerpo.
  function refrescar() {
    setCargando(true);
    setErrorMessage(null);
    setReloadToken((token) => token + 1);
  }

  const hayCambios = Object.keys(sucia).length > 0;

  useEffect(() => {
    let vigente = true;

    systemParametersApi
      .getAll()
      .then((listado) => {
        if (!vigente) return;
        setParametros(listado);
        setSucia({});
      })
      .catch((error: unknown) => {
        if (vigente) setErrorMessage(mensajeDeApiError(error));
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    return () => {
      vigente = false;
    };
  }, [reloadToken]);

  function cambiarValor(codigo: string, valor: string) {
    setSucia((previas) => ({ ...previas, [codigo]: valor }));
  }

  async function guardar() {
    setGuardando(true);
    try {
      const actualizados = await systemParametersApi.update(sucia);
      setParametros(actualizados);
      setSucia({});
      showToast({ variant: 'success', title: 'Parámetros actualizados', description: 'Se aplican en toda la aplicación.' });
    } catch (error: unknown) {
      showToast({ variant: 'error', title: 'No se guardaron los cambios', description: mensajeDeApiError(error) });
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) {
    return (
      <Card>
        <p className="text-sm text-neutral-500">Cargando parámetros…</p>
      </Card>
    );
  }

  if (errorMessage !== null) {
    return (
      <Card>
        <p role="alert" className="text-sm text-red-700">{errorMessage}</p>
        <div className="mt-3">
          <Button variant="secondary" onClick={refrescar}>Reintentar</Button>
        </div>
      </Card>
    );
  }

  const lista = parametros ?? [];

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold text-neutral-900">Parámetros del sistema</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Configuración global que gobierna cómo se valida y se muestra el resto de la aplicación.
        </p>
      </header>

      <Card>
        <ul className="flex flex-col divide-y divide-neutral-100">
          {lista.map((parametro) => {
            const valorActual = sucia[parametro.code] ?? parametro.value;
            return (
              <li key={parametro.code} className="flex flex-wrap items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-neutral-900">{parametro.label}</span>
                    <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700">{parametro.code}</code>
                  </div>
                  {parametro.description ? (
                    <p className="mt-0.5 text-sm text-neutral-500">{parametro.description}</p>
                  ) : null}
                </div>
                <CampoValor
                  parametro={parametro}
                  valor={valorActual}
                  editable={parametro.isEditable}
                  onChange={parametro.isEditable ? (valor) => cambiarValor(parametro.code, valor) : undefined}
                />
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex justify-end border-t border-neutral-100 pt-4">
          <Button variant="primary" loading={guardando} disabled={!hayCambios} onClick={() => void guardar()}>
            Guardar cambios
          </Button>
        </div>
      </Card>
    </div>
  );
}

interface CampoValorProps {
  parametro: SystemParameter;
  valor: string;
  editable?: boolean;
  onChange?: (valor: string) => void;
}

function CampoValor({ parametro, valor, editable = false, onChange }: CampoValorProps) {
  const etiqueta = `Valor de ${parametro.label}`;
  const inputClass =
    'h-8 w-44 rounded border border-neutral-200 bg-white px-2 text-sm text-neutral-900 ' +
    'disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-500';

  if (parametro.valueType === 'BOOLEAN') {
    return (
      <select
        aria-label={etiqueta}
        value={valor}
        onChange={(evento) => onChange?.(evento.target.value)}
        disabled={!editable}
        className={inputClass}
      >
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
    );
  }

  const esNumerico = parametro.valueType === 'INTEGER' || parametro.valueType === 'DECIMAL';

  return (
    <input
      aria-label={etiqueta}
      type={esNumerico ? 'number' : 'text'}
      value={valor}
      onChange={(evento) => onChange?.(evento.target.value)}
      disabled={!editable}
      className={inputClass}
    />
  );
}
