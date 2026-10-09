'use client';

import { createContext, useContext } from 'react';
import type { PlaceDetail } from '@shared/types';

/**
 * Lo que la ficha de un lugar le dice al mapa persistente: qué lugar mostrar
 * (y cómo recargarlo tras guardar su vista) y qué perspectiva resaltar. El mapa
 * vive en el layout de /lugares, no en la ficha: así no se reconstruye al pasar
 * de un lugar a otro, solo vuela.
 */
export interface PlaceMapApi {
  show: (place: PlaceDetail, reload: () => void) => void;
  focusPerspective: (id: number | null) => void;
}

/** Fuera del layout (una prueba, otra pantalla) la ficha funciona igual, sin mapa. */
const WITHOUT_MAP: PlaceMapApi = { show: () => undefined, focusPerspective: () => undefined };

export const PlaceMapContext = createContext<PlaceMapApi>(WITHOUT_MAP);

export function usePlaceMap(): PlaceMapApi {
  return useContext(PlaceMapContext);
}
