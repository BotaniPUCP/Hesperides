import type { SceneData } from './sceneData';
import type { Target } from './target';

/** Contenido de la ficha de un elemento del mapa. */
export interface InfoCard {
  kind: string;
  title: string;
  rows: [string, string][];
  note?: string;
}

/** Altura que el visor usa cuando OpenStreetMap no registra la del edificio. */
export const DEFAULT_BUILDING_HEIGHT_M = 8;

const m2 = (v: number | null) => (v == null ? null : `${Math.round(v).toLocaleString('es-PE')} m²`);

function card(kind: string, title: string, rows: [string, string | null | undefined][], note?: string): InfoCard {
  return { kind, title, rows: rows.filter((r): r is [string, string] => r[1] != null && r[1] !== ''), note };
}

function zoneCard(data: SceneData, target: Target, kind: string): InfoCard {
  const list = target.layer === 'xerophytic' ? data.xerophytic : target.layer === 'reserve' ? data.reserve : data.greenAreas;
  const p = list[target.index].props;
  const sector = p.parentCode ? (data.sectorNameByCode[p.parentCode] ?? p.parentCode) : null;
  return card(kind, p.name, [
    ['Código', p.code],
    ['Código del mapa', p.mapCode],
    ['Sector', target.layer === 'reserve' ? null : (sector ?? 'Sin sector')],
    ['Uso', p.useType],
    ['Riego actual', p.irrigationCurrent],
    ['Proyecto de riego', p.irrigationProject],
    ['Reservable', p.reservable ? `Sí, presta ${p.reservationOwner ?? '—'}` : null],
    ['Área', m2(p.areaM2)],
  ]);
}

function buildingCard(data: SceneData, target: Target): InfoCard {
  const list = target.layer === 'contextBuildings' ? data.contextBuildings : data.campusBuildings;
  const p = list[target.index].props;
  const estimated = p.heightM == null;
  return card(
    p.campus ? 'Edificio del campus' : 'Edificio del entorno',
    p.name ?? 'Edificio sin nombre',
    [
      ['Categoría', p.category],
      ['Nombre', p.inferredName ? 'Deducido, sin confirmar' : null],
      ['Altura', `${p.heightM ?? DEFAULT_BUILDING_HEIGHT_M} m${estimated ? ' (estimada)' : ''}`],
      ['Pisos', p.levels == null ? null : String(p.levels)],
      ['También se le dice', p.aliases?.join(', ')],
    ],
    estimated ? `OpenStreetMap no registra la altura de este edificio; la maqueta usa ${DEFAULT_BUILDING_HEIGHT_M} m.` : undefined,
  );
}

function featureCard(data: SceneData, target: Target, kind: string): InfoCard {
  const list = { parking: data.parking, sidewalks: data.sidewalks, bins: data.bins, gates: data.gates, fauna: data.fauna }[
    target.layer as 'parking' | 'sidewalks' | 'bins' | 'gates' | 'fauna'
  ];
  const p = list[target.index].props;
  const attrs = p.attributes ?? {};
  const waste = Array.isArray(attrs.residuos) ? (attrs.residuos as string[]).join(', ') : null;
  return card(kind, p.name ?? kind, [
    ['Código', p.code],
    ['Residuos', waste],
    ['Detalle', (attrs.detalle as string) ?? (attrs.nota as string) ?? null],
    ['Acción recomendada', (attrs.accion as string) ?? null],
  ]);
}

export function infoFor(data: SceneData, target: Target): InfoCard {
  switch (target.layer) {
    case 'greenAreas':
      return zoneCard(data, target, 'Área verde');
    case 'xerophytic':
      return zoneCard(data, target, 'Jardín xerofítico');
    case 'reserve':
      return zoneCard(data, target, 'Jardín de reserva');
    case 'campusBuildings':
    case 'contextBuildings':
      return buildingCard(data, target);
    case 'supervision': {
      const p = data.supervision[target.index].props;
      return card('Zona de supervisión', p.name, [['Supervisor', p.supervisor], ['Área', m2(p.areaM2)]]);
    }
    case 'references': {
      const p = data.references[target.index].props;
      return card(p.category, p.name, [['Código', p.code], ['También se le dice', p.aliases?.join(', ')]]);
    }
    case 'parking':
      return featureCard(data, target, 'Estacionamiento');
    case 'sidewalks':
      return featureCard(data, target, 'Vereda en riesgo');
    case 'bins':
      return featureCard(data, target, 'Tacho de residuos');
    case 'gates':
      return featureCard(data, target, 'Puerta de acceso');
    case 'fauna':
      return featureCard(data, target, 'Avistamiento de fauna');
  }
}
