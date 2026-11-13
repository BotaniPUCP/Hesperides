import { infoFor, type InfoCard } from './infoCard';
import { LAYER_TOGGLES, PERSPECTIVES_TOGGLE } from './layerList';
import type { MapCardContent } from './MapInfoCard';
import { INITIAL_OPTIONS, type MapScreenSnapshot } from './mapScreenMemory';
import type { ViewOptions } from './MapToolbar';
import type { SceneData } from './sceneData';
import type { Target } from './target';
import type { Viewer } from './viewer/createViewer';

export const APPLY_OPTION: Record<keyof ViewOptions, (v: Viewer, on: boolean) => void> = {
  night: (v, on) => v.setNight(on),
  shadows: (v, on) => v.setShadows(on),
  labels: (v, on) => v.setLabels(on),
  grayBuildings: (v, on) => v.setGrayBuildings(on),
  realColors: (v, on) => v.setRealColors(on),
};

type ViewerState = Pick<MapScreenSnapshot, 'mode' | 'hidden' | 'visible' | 'options'>;

/** Un visor nuevo nace con todo encendido y sin pintar: solo se le ordena lo que difiere de eso. */
export function applyToViewer(viewer: Viewer, { mode, hidden, visible, options }: ViewerState): void {
  LAYER_TOGGLES.filter((t) => t.id !== PERSPECTIVES_TOGGLE && !visible[t.id])
    .forEach((t) => viewer.setLayerVisible(t.id as Target['layer'], false));
  if (mode !== 'base' || hidden.size > 0) viewer.setPaint(mode, hidden);
  (Object.keys(APPLY_OPTION) as (keyof ViewOptions)[])
    .filter((key) => options[key] !== INITIAL_OPTIONS[key])
    .forEach((key) => APPLY_OPTION[key](viewer, options[key]));
}

/**
 * La ficha del elemento conservado, con los datos de ahora: pudo medirse o
 * borrarse mientras la persona estaba en otra pantalla. La posición en la capa
 * no es estable, así que un título distinto significa que ya es otro elemento.
 */
export function keptCard(
  data: SceneData,
  target: Target,
  saved: MapCardContent | null,
  linkFor?: (target: Target) => InfoCard['link'] | null,
): MapCardContent | null {
  const layer = (data as unknown as Record<string, readonly unknown[] | undefined>)[target.layer];
  if (!layer?.[target.index]) return null;
  const fresh = infoFor(data, target);
  const savedCard = saved?.kind === 'element' ? saved.card : null;
  if (savedCard && savedCard.title !== fresh.title) return null;
  return { kind: 'element', card: { ...fresh, link: fresh.link ?? linkFor?.(target) ?? savedCard?.link } };
}
