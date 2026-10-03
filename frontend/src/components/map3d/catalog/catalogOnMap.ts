import type { MapCatalog, MapPerspective, MapPlace } from '@shared/types';
import type { InfoCard } from '../infoCard';
import { normalize, type SearchEntry } from '../searchIndex';

/**
 * El catálogo de lugares dentro del mapa principal: qué encuentra el buscador,
 * qué muestra la ficha de una perspectiva y a qué ficha del catálogo lleva un
 * edificio. Sin React ni visor: solo datos.
 */

/** Entre las de los lugares del catálogo y las de las referencias antiguas, ganan las del catálogo. */
const CATALOG_PRIORITY = 3;

export const placeHref = (code: string) => `/lugares/${code}`;

export function catalogEntries(catalog: MapCatalog): SearchEntry[] {
  const places = catalog.places.map((p, i): SearchEntry => ({
    title: p.name,
    subtitle: p.parentName ? `Lugar · ${p.parentName}` : 'Lugar del catálogo',
    terms: p.code,
    key: normalize(`${p.name} ${p.parentName ?? ''} ${p.code}`),
    target: { layer: 'catalogPlace', index: i },
    priority: CATALOG_PRIORITY,
  }));
  const perspectives = catalog.perspectives.map((v, i): SearchEntry => ({
    title: v.displayName,
    subtitle: 'Perspectiva',
    terms: v.place.name,
    key: normalize(`${v.displayName} ${v.place.name}`),
    target: { layer: 'catalogPerspective', index: i },
    priority: CATALOG_PRIORITY,
  }));
  return [...places, ...perspectives];
}

/** El lugar del catálogo hecho sobre ese edificio, si lo hay. */
export function placeOfBuilding(catalog: MapCatalog | null, buildingId: number): MapPlace | null {
  return catalog?.places.find((p) => p.buildingId === buildingId) ?? null;
}

export function catalogLink(place: MapPlace): NonNullable<InfoCard['link']> {
  return { href: placeHref(place.code), label: 'Ver en el catálogo' };
}

export function placeCard(place: MapPlace): InfoCard {
  return { kind: 'Lugar del catálogo', title: place.name, rows: place.parentName ? [['Dentro de', place.parentName]] : [], link: catalogLink(place) };
}

/** Los conos de la capa «Perspectivas». */
export const conesOf = (catalog: MapCatalog | null) =>
  (catalog?.perspectives ?? []).map((v: MapPerspective) => ({ id: v.id, lat: v.lat, lon: v.lon, headingDeg: v.headingDeg }));
