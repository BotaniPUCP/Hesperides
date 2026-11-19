import type { GeoJsonGeometry, MapLayersResponse, ZoneProperties } from '@shared/types';
import { toSceneData, type Polygon } from '@/components/map3d/sceneData';
import type { LocalPlane } from '@/components/map3d/projection';
import type { InterventionLocation, InterventionZoneOptions } from '@/lib/interventions-api';
import { createClientUuid } from '@/lib/client-uuid';

export interface PlaceDraft {key:string;placeId:number|null;locations:InterventionLocation[];}
export const blankPlace = ():PlaceDraft => ({key:createClientUuid(),placeId:null,locations:[]});
export function initialPlaces(locations:InterventionLocation[]):PlaceDraft[] {
  const grouped=new Map<number,PlaceDraft>();
  for(const l of locations) {
    if(l.placeId===null)continue;
    if(!grouped.has(l.placeId))grouped.set(l.placeId,{key:l.clientReference,placeId:l.placeId,locations:[]});
    grouped.get(l.placeId)!.locations.push(l);
  }
  return [...grouped.values()];
}
export function readySelection(card:PlaceDraft,options:InterventionZoneOptions|undefined):boolean {
  return !!options?.current && !!options.selectionRevision && options.place.id===card.placeId && card.locations.length>0 &&
    card.locations.every(l=>l.zoneSelectionRevision===options.selectionRevision && options.zones.some(z=>z.id===l.zoneId));
}
export function toggleZone(card:PlaceDraft,id:number,options:InterventionZoneOptions):PlaceDraft {
  if(!options.current || !options.selectionRevision || options.place.id!==card.placeId || !options.zones.some(z=>z.id===id))return card;
  const exists=card.locations.some(l=>l.zoneId===id);
  const rows=exists?card.locations.filter(l=>l.zoneId!==id):[...card.locations,{
    clientReference:createClientUuid(),placeId:card.placeId,zoneId:id,location:null,description:null,
    elementIds:[],unitItemId:null,requestedQuantity:null,zoneSelectionRevision:options.selectionRevision,
  }];
  return {...card,locations:rows.map(l=>options.zones.some(z=>z.id===l.zoneId)?{...l,zoneSelectionRevision:options.selectionRevision}:l)};
}
/** Explicit whitelist: never send historic derived quantities back as manual input. */
export function planningLocation(l:InterventionLocation):InterventionLocation {
  return {id:l.id,clientReference:l.clientReference,placeId:l.placeId,zoneId:l.zoneId,description:l.description,
    zoneSelectionRevision:l.zoneSelectionRevision,location:null,unitItemId:null,requestedQuantity:null,elementIds:[],elementCodes:[]};
}
export function projectOutline(geometry:GeoJsonGeometry,plane:LocalPlane):Polygon[] {
  const polygons=geometry.type==='MultiPolygon'?geometry.coordinates as number[][][][]:
    geometry.type==='Polygon'?[geometry.coordinates as number[][][]]:[];
  return polygons.map(p=>p.map(r=>{
    const ring=r.length>1 && r[0][0]===r[r.length-1][0] && r[0][1]===r[r.length-1][1]?r.slice(0,-1):r;
    return ring.flatMap(([lon,lat])=>{const point=plane.toPlane(lat,lon);return [point.x,point.y];});
  }));
}
/** The map is context only. Approved polygons always come from the live selection API. */
export function selectionScene(layers:MapLayersResponse,options:Pick<InterventionZoneOptions,'zones'>) {
  const authorized=new Map(options.zones.map(z=>[z.code,z]));
  const found=new Set<string>();
  const features=layers.layers.sections.features.map(f=>{
    const zone=authorized.get(f.properties.code);
    if(!zone)return f;
    found.add(zone.code);
    return {...f,geometry:zone.geometry,properties:{...f.properties,areaM2:zone.areaM2}};
  });
  for(const z of options.zones)if(!found.has(z.code)) {
    // Generic display for a polygon missing from the cached context; no master is created.
    const properties:ZoneProperties={code:z.code,name:z.name,description:null,parentCode:null,mapCode:null,
      useType:null,reservable:false,reservationOwner:null,areaM2:z.areaM2,landscapeType:'GREEN_AREA',irrigationCurrent:null,irrigationProject:null};
    features.push({type:'Feature',geometry:z.geometry,properties});
  }
  return toSceneData({...layers,layers:{...layers.layers,sections:{...layers.layers.sections,features}}});
}
