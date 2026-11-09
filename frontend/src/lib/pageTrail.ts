import type { BreadcrumbItem } from '@/components/ui/Breadcrumb';
import { DIRECT_LINKS, HOME_ITEM, NAVIGATION, activeHref } from './navigation';

/**
 * La ruta del breadcrumb de cualquier pantalla, derivada del menú: una pantalla
 * nueva la tiene en cuanto entra a navigation.ts, sin escribir nada más.
 */
export interface PageTrailOptions {
  withHome: boolean;
  /** Nombre real de un segmento de la URL: el slug o el id pasan a ser lo que se lee. */
  labels?: Readonly<Record<string, string>>;
  /** Lo que va entre la pantalla del menú y la ficha, como el lugar padre. */
  parents?: readonly BreadcrumbItem[];
}

const ROUTE_LABELS: Readonly<Record<string, string>> = {
  '/incidencias/nueva': 'Informar',
  '/intervenciones/nueva': 'Nueva intervención',
  '/lugares/nuevo': 'Nuevo lugar',
};
const SEGMENT_LABELS: Readonly<Record<string, string>> = { editar: 'Editar' };
/** Forman parte de la URL, pero no hay una pantalla a la que volver. */
const SEGMENTS_WITHOUT_PAGE = new Set(['especies', 'ejemplares']);

const MENU_ITEMS = [
  ...DIRECT_LINKS.map((item) => ({ item, groupLabel: null as string | null })),
  ...NAVIGATION.flatMap((group) => group.items.map((item) => ({ item, groupLabel: group.label as string | null }))),
];

function menuCrumbs(href: string | null, isCurrentPage: boolean): BreadcrumbItem[] {
  const entry = MENU_ITEMS.find(({ item }) => item.href === href);
  if (!entry) return [];
  const crumbs: BreadcrumbItem[] = [];
  if (entry.groupLabel && entry.groupLabel !== entry.item.label) crumbs.push({ label: entry.groupLabel });
  crumbs.push(isCurrentPage ? { label: entry.item.label } : { label: entry.item.label, href: entry.item.href });
  return crumbs;
}

function segmentCrumbs(pathname: string, base: string, options: PageTrailOptions): BreadcrumbItem[] {
  const segments = pathname.slice(base.length).split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [];
  let path = base;
  for (const segment of segments) {
    path = `${path}/${segment}`;
    if (SEGMENTS_WITHOUT_PAGE.has(segment)) continue;
    crumbs.push({ label: options.labels?.[segment] ?? ROUTE_LABELS[path] ?? SEGMENT_LABELS[segment] ?? segment, href: path });
  }
  return crumbs;
}

function withoutLastLink(trail: BreadcrumbItem[]): BreadcrumbItem[] {
  const last = trail.at(-1);
  return last ? [...trail.slice(0, -1), { label: last.label }] : trail;
}

export function buildPageTrail(pathname: string, options: PageTrailOptions): BreadcrumbItem[] {
  if (pathname === HOME_ITEM.href) return [{ label: HOME_ITEM.label }];
  const home = options.withHome ? [{ label: HOME_ITEM.label, href: HOME_ITEM.href }] : [];
  const base = activeHref(pathname, MENU_ITEMS.map(({ item }) => item.href));
  return withoutLastLink([
    ...home,
    ...menuCrumbs(base, base === pathname),
    ...(options.parents ?? []),
    ...segmentCrumbs(pathname, base ?? '', options),
  ]);
}
