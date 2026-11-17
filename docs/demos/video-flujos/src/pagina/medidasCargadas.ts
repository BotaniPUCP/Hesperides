import { createContext, useContext } from 'react';
import type { Medida } from './medidas';

export type Medidas = Record<string, Record<string, Medida>>;
export type BuscarMedida = (captura: string, elemento: string) => Medida;

/** El centro de una medida, donde se pulsa. */
export const centro = ({ x, y, ancho, alto }: Medida) => ({ x: x + ancho / 2, y: y + alto / 2 });

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

/** Las medidas de una carpeta de capturas con la carpeta como prefijo («venta/mapa-zonas»), para juntar varias. */
export function conCarpeta(carpeta: string, medidas: Medidas): Medidas {
  return Object.fromEntries(Object.entries(medidas).map(([captura, elementos]) => [`${carpeta}/${captura}`, elementos]));
}

export const MedidasContexto = createContext<BuscarMedida | null>(null);

export function useMedida(): BuscarMedida {
  const medida = useContext(MedidasContexto);
  if (!medida) throw new Error('useMedida necesita un MedidasContexto alrededor');
  return medida;
}
