'use client';

import { useState } from 'react';
import { Button, useToast } from '@/components/ui';
import { catastroApi } from '@/lib/catastro-api';
import { guardarArchivo } from '@/lib/download';
import { mensajeDeErrorCatastro } from './mensajes';

export interface DescargasDelEstandarProps {
  /** La exportación es de ADMIN y COORDINADOR: el supervisor solo ve la plantilla. */
  puedeExportar: boolean;
}

type Descarga = 'plantilla' | 'exportacion';

/** La plantilla vacía del estándar y, para quien carga, el catastro entero en ese formato. */
export function DescargasDelEstandar({ puedeExportar }: DescargasDelEstandarProps) {
  const [enCurso, setEnCurso] = useState<Descarga | null>(null);
  const { showToast } = useToast();

  async function descargar(tipo: Descarga) {
    setEnCurso(tipo);
    try {
      const blob = tipo === 'plantilla' ? await catastroApi.template('specimens') : await catastroApi.exportSpecimens();
      guardarArchivo(blob, tipo === 'plantilla' ? 'plantilla-ejemplares.csv' : 'ejemplares.csv');
    } catch (error) {
      showToast({ variant: 'error', title: 'No se pudo descargar', description: mensajeDeErrorCatastro(error) });
    } finally {
      setEnCurso(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" loading={enCurso === 'plantilla'} onClick={() => descargar('plantilla')}>
        Descargar plantilla
      </Button>
      {puedeExportar && (
        <Button variant="secondary" loading={enCurso === 'exportacion'} onClick={() => descargar('exportacion')}>
          Exportar ejemplares
        </Button>
      )}
    </div>
  );
}
