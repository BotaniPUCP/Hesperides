import type { ActivityDetail, ActivityProgress, ActivityTargetStatus, CampusOptions, InterventionLocation } from '@/lib/interventions-api';
import type { CampusTarget } from './campusSelection';

export type ProgressTarget=ActivityProgress['targets'][number];
export const TARGET_STATES:Record<ActivityTargetStatus,{label:string;symbol:string;color:string}>={
  NOT_STARTED:{label:'Sin avance',symbol:'○',color:'#64748b'},
  PARTIAL:{label:'Avance parcial',symbol:'◐',color:'#d97706'},
  COMPLETED:{label:'Terminado',symbol:'✓',color:'#16a34a'},
};
export const progressKey=(t:CampusTarget)=>`${t.kind}:${t.id}`;
export const plannedKey=(t:ActivityDetail['targets'][number])=>progressKey(t.zoneId!==null?{kind:'area',id:t.zoneId}:{kind:'specimen',id:t.elementIds[0]});
export const plannedKeys=(t:ActivityDetail['targets'][number])=>[
  ...(t.zoneId===null?[]:[progressKey({kind:'area',id:t.zoneId})]),...t.elementIds.map(id=>progressKey({kind:'specimen',id})),
];
export const mapLocation=(t:ActivityDetail['targets'][number]):InterventionLocation=>({...t,unitItemId:null,requestedQuantity:null});
export const mapLocations=(t:ActivityDetail['targets'][number]):InterventionLocation[]=>[
  ...(t.zoneId===null?[]:[{...mapLocation(t),elementIds:[]}]),
  ...t.elementIds.map(id=>({...mapLocation(t),zoneId:null,elementIds:[id]})),
];
export function percentageProblem(percentage:number):string|null {
  if(!Number.isFinite(percentage)||percentage<0||percentage>100||Math.abs(percentage*100-Math.round(percentage*100))>0.000001)return 'Indica un porcentaje entre 0 y 100, con hasta dos decimales.';
  return null;
}
export function progressProblem(percentage:number,description:string,targets:ProgressTarget[]):string|null {
  const invalidPercentage=percentageProblem(percentage);
  if(invalidPercentage)return invalidPercentage;
  if(!description.trim())return 'Describe el avance realizado.';
  if(!targets.length)return 'La actividad no tiene objetivos registrados.';
  if(targets.some(t=>t.statusCode==='PARTIAL'&&!t.partialDescription?.trim()))return 'Describe el avance de cada objetivo parcial.';
  if((percentage===100)!==targets.every(t=>t.statusCode==='COMPLETED'))return 'El 100 % corresponde a todos los jardines y ejemplares terminados. Revisa las marcas o el porcentaje.';
  return null;
}
/** Preserve planned polygon snapshots; a retired specimen remains editable in the list. */
export function plannedMapOptions(activity:ActivityDetail,live:CampusOptions):CampusOptions {
  return {...live,zones:activity.targets.flatMap(t=>{
    if(t.zoneId===null)return [];
    const z=live.zones.find(z=>z.id===t.zoneId);
    const geometry=t.zoneBoundary??z?.geometry;
    if(!geometry)return [];
    const polygons=geometry.type==='Polygon'?geometry.coordinates as number[][][]:(geometry.coordinates as number[][][][])[0];
    const first=polygons?.[0]?.[0];
    const point=t.location??z?.point??(first?{latitude:first[1],longitude:first[0]}:null);
    if(!point)return [];
    return [{id:t.zoneId,code:z?.code??`activity-area-${t.zoneId}`,name:z?.name??t.locationDescription??'Jardín planificado',geometryValid:true,geometry,point,areaM2:z?.areaM2??0,polygonCount:geometry.type==='MultiPolygon'?(geometry.coordinates as unknown[]).length:1}];
  }),specimens:live.specimens.filter(s=>activity.targets.some(t=>t.elementIds.includes(s.id)))};
}
export function progressTargetName(t:ActivityDetail['targets'][number],live:CampusOptions|null,index:number) {
  const item=t.zoneId!==null?live?.zones.find(z=>z.id===t.zoneId):live?.specimens.find(s=>t.elementIds.includes(s.id));
  const name=item?.name;
  return name&&!/^(?:AV-|EV-|[A-Z]\s*\d+$)/i.test(name)?name:t.description||t.locationDescription||`${t.zoneId!==null?'Jardín':'Ejemplar'} ${index+1}`;
}
