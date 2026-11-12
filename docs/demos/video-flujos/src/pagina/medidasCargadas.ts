import { createContext, useContext } from 'react';
import type { Medida } from './medidas';

export type Medidas = Record<string, Record<string, Medida>>;
export type BuscarMedida = (captura: string, elemento: string) => Medida;

/**
 * Medidas que llegan como datos, no por import: así un video no depende de las capturas
 * generadas del otro. `comando` es lo que hay que ejecutar si falta una.
 */
export function crearMedida(datos: Medidas, comando: string): BuscarMedida {
  return (captura, elemento) => {
    const encontrada = datos[captura]?.[elemento];
    if (!encontrada) throw new Error(`Falta ${elemento} en la captura ${captura}: ejecuta ${comando}`);
    return encontrada;
  };
}

export const MedidasContexto = createContext<BuscarMedida | null>(null);

export function useMedida(): BuscarMedida {
  const medida = useContext(MedidasContexto);
  if (!medida) throw new Error('useMedida necesita un MedidasContexto alrededor');
  return medida;
}
