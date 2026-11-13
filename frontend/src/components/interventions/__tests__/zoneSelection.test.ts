import { blankPlace, initialPlaces, planningLocation, projectOutline, readySelection, toggleZone } from '../zoneSelection';
import { LocalPlane } from '@/components/map3d/projection';
import type { InterventionZoneOptions } from '@/lib/interventions-api';

const options:InterventionZoneOptions={place:{id:1,code:'LUG-1',name:'Biblioteca',geometryValid:true,geometry:null},datasetRevision:'d',reviewVersion:1,reviewed:true,current:true,selectionRevision:'r',reviewedAt:null,reviewedByUserId:1,candidates:[],zones:[{id:10,code:'AV-10',name:'Jardín',geometryValid:true,geometry:{type:'Polygon',coordinates:[]},areaM2:535,point:{latitude:-12,longitude:-77},polygonCount:1}]};

it('rechaza zonas fuera de las asociaciones directas y revisiones pendientes',()=>{
  const card={...blankPlace(),placeId:1};
  expect(toggleZone(card,20,options)).toBe(card);
  expect(toggleZone(card,10,{...options,current:false})).toBe(card);
  expect(toggleZone({...card,placeId:2},10,options).locations).toEqual([]);
});
it('crea una ubicación por zona sin aceptar cantidades ni coordenadas manuales',()=>{
  const selected=toggleZone({...blankPlace(),placeId:1},10,options);
  expect(readySelection(selected,options)).toBe(true);
  expect(planningLocation({...selected.locations[0],requestedQuantity:999,unitItemId:3,location:{latitude:0,longitude:0},elementIds:[9]})).toMatchObject({zoneId:10,placeId:1,zoneSelectionRevision:'r',location:null,requestedQuantity:null,unitItemId:null,elementIds:[],elementCodes:[]});
  expect(toggleZone(selected,10,options).locations).toEqual([]);
});
it('conserva los identificadores al agrupar una planificación existente',()=>{
  const selected=toggleZone({...blankPlace(),placeId:1},10,options);
  const old={...selected.locations[0],id:42};
  const grouped=initialPlaces([old]);
  expect(grouped[0].locations[0]).toBe(old);
  expect(planningLocation(grouped[0].locations[0]).id).toBe(42);
  expect(readySelection(grouped[0],{...options,selectionRevision:'new'})).toBe(false);
});
it('proyecta todos los componentes y huecos de un lugar sin repetir el cierre',()=>{
  const result=projectOutline({type:'MultiPolygon',coordinates:[[[[0,0],[1,0],[1,1],[0,0]],[[0.1,0.1],[0.2,0.1],[0.2,0.2],[0.1,0.1]]],[[[2,2],[3,2],[3,3],[2,2]]]]},new LocalPlane(0,0));
  expect(result).toHaveLength(2);expect(result[0]).toHaveLength(2);
  expect(result[0][0]).toHaveLength(6);expect(result[0][1]).toHaveLength(6);
  expect(result[1][0][0]).toBeGreaterThan(result[0][0][2]);
});
