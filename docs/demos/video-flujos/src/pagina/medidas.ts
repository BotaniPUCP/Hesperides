import datos from '../../public/capturas/medidas.json';

export type Medida = { x: number; y: number; ancho: number; alto: number };

const medidas = datos as Record<string, Record<string, Medida>>;

/** Dónde quedó un elemento real en una captura, en píxeles de video. */
export function medida(captura: string, elemento: string): Medida {
  const encontrada = medidas[captura]?.[elemento];
  if (!encontrada) throw new Error(`Falta ${elemento} en la captura ${captura}: ejecuta npm run capturas`);
  return encontrada;
}

export const centro = ({ x, y, ancho, alto }: Medida) => ({ x: x + ancho / 2, y: y + alto / 2 });
