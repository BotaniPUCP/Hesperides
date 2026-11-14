import type { Region, Side, Zone } from './types';

/**
 * Qué regiones pinta cada cara de una zona (SPEC-112 D-05): las comunes y,
 * encima, las propias de la cara o las de la cara que copia. Funciones puras.
 */

/** Una copia que apunta a una cara sin regiones propias o que da la vuelta. */
export class FaceCopyError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = 'FaceCopyError';
  }
}

/** La fachada opuesta de una barra: el mismo tramo del edificio queda con la u de signo contrario. */
const mirrored = (region: Region): Region => (region.u ? { ...region, u: [-region.u[1], -region.u[0]] } : region);

/** Las regiones propias de la cara, siguiendo las copias; una orientación sin entrada no tiene ninguna. */
export function ownRegions(zone: Zone, side: Side): Region[] {
  const chain: Side[] = [];
  let current = side;
  let mirror = false;
  for (;;) {
    const rule = zone.faces?.[current];
    if (!rule && !chain.length) return [];
    if (!rule) throw new FaceCopyError(`la cara ${chain[chain.length - 1]} copia a ${current}, que no tiene regiones propias`);
    if (Array.isArray(rule)) return mirror ? rule.map(mirrored) : rule;
    if (chain.includes(current)) throw new FaceCopyError(`copia circular entre caras (${[...chain, current].join(' → ')})`);
    chain.push(current);
    mirror = mirror !== !!rule.mirror;
    current = rule.sameAs;
  }
}

/** Lo que se pinta en la cara, en orden: la última región que cubre un punto gana. */
export function faceRegions(zone: Zone, side: Side): Region[] {
  return [...(zone.common ?? []), ...ownRegions(zone, side)];
}
