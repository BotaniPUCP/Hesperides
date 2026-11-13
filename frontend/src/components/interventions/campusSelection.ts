import type { MapLayersResponse } from '@shared/types';
import type { CampusOptions, InterventionLocation } from '@/lib/interventions-api';
import { createClientUuid } from '@/lib/client-uuid';
import { selectionScene } from './zoneSelection';

export type CampusTarget={kind:'area'|'specimen';id:number};
export const targetOf=(l:InterventionLocation):CampusTarget=>l.zoneId!==null?{kind:'area',id:l.zoneId}:{kind:'specimen',id:l.elementIds[0]};
export function addCampusSpecimen(rows:InterventionLocation[],id:number,options:CampusOptions):InterventionLocation[] {
  if(rows.some(l=>l.zoneId===null&&l.elementIds.includes(id)))return rows;
  return toggleCampus(rows,{kind:'specimen',id},options);
}
export function toggleCampus(rows:InterventionLocation[],target:CampusTarget,options:CampusOptions):InterventionLocation[] {
  const known=target.kind==='area'?options.zones.some(z=>z.id===target.id):options.specimens.some(s=>s.id===target.id);
  if(!known)return rows;
  const existing=rows.find(l=>{const t=targetOf(l);return t.kind===target.kind&&t.id===target.id;});
  if(existing)return rows.filter(l=>l!==existing);
  return [...rows,{clientReference:createClientUuid(),zoneId:target.kind==='area'?target.id:null,
    placeId:null,location:null,description:null,elementIds:target.kind==='specimen'?[target.id]:[],
    unitItemId:null,requestedQuantity:null,...(target.kind==='area'?{zoneSelectionRevision:options.selectionRevision}:{})}];
}
export function campusLocation(l:InterventionLocation):InterventionLocation {
  return {id:l.id,clientReference:l.clientReference,zoneId:l.zoneId,placeId:null,location:null,
    description:l.description,unitItemId:null,requestedQuantity:null,elementIds:l.zoneId===null?l.elementIds:[],
    elementCodes:[],...(l.zoneId!==null?{zoneSelectionRevision:l.zoneSelectionRevision}:{})};
}
export function campusReady(rows:InterventionLocation[],options:CampusOptions):boolean {
  return rows.length>0&&rows.every(l=>l.zoneId!==null
    ?l.zoneSelectionRevision===options.selectionRevision&&options.zones.some(z=>z.id===l.zoneId)
    :l.elementIds.length===1&&options.specimens.some(s=>s.id===l.elementIds[0]));
}
export function targetAvailable(l:InterventionLocation,options:CampusOptions):boolean {
  return l.zoneId!==null?options.zones.some(z=>z.id===l.zoneId)
    :l.elementIds.length===1&&options.specimens.some(s=>s.id===l.elementIds[0]);
}
export function targetName(l:InterventionLocation,options:CampusOptions,index:number):string {
  if(l.zoneId!==null) {
    const name=options.zones.find(z=>z.id===l.zoneId)?.name;
    return name&&!/^[A-Z]\s*\d+$/i.test(name)&&!/^AV-/.test(name)?name:`Área verde ${index+1}`;
  }
  return options.specimens.find(s=>s.id===l.elementIds[0])?.name??'Ejemplar no disponible';
}
export function campusScene(layers:MapLayersResponse,options:CampusOptions) {
  // Replace cached vegetation with live eligible specimens, preserving their real positions.
  const vegetation={type:'FeatureCollection' as const,features:options.specimens.map(s=>({type:'Feature' as const,
    geometry:{type:'Point',coordinates:[s.point.longitude,s.point.latitude]},properties:{code:s.code,
      commonName:s.name,scientificName:s.scientificName,speciesSlug:'',typeCode:s.typeCode,typeLabel:s.typeCode,
      quantity:s.quantity,heightM:s.heightM,crownRadiusM:s.crownRadiusM}}))};
  return selectionScene({...layers,layers:{...layers.layers,vegetation}},{zones:options.zones});
}

/**
 * Lo que llega prellenado (por ejemplo, un conjunto desde Planificación) pasa a la
 * selección del mapa: cada jardín un área y cada ejemplar su propia fila. Lo que ya
 * no está en el inventario no entra; se cuenta para avisarlo.
 */
export function campusRowsFromPrefill(locations:InterventionLocation[],options:CampusOptions):{rows:InterventionLocation[];missing:number} {
  const specimenIdByCode=new Map(options.specimens.map(s=>[s.code,s.id]));
  const targets:CampusTarget[]=[];
  let missing=0;
  const add=(target:CampusTarget|null)=>{ if(target)targets.push(target); else missing++; };
  for(const l of locations) {
    if(l.zoneId!==null) add(options.zones.some(z=>z.id===l.zoneId)?{kind:'area',id:l.zoneId}:null);
    for(const code of l.elementCodes??[]) { const id=specimenIdByCode.get(code); add(id===undefined?null:{kind:'specimen',id}); }
  }
  const rows=targets.reduce<InterventionLocation[]>((acc,t)=>t.kind==='specimen'?addCampusSpecimen(acc,t.id,options)
    :acc.some(l=>l.zoneId===t.id)?acc:toggleCampus(acc,t,options),[]);
  return {rows,missing};
}
