import { act, render, screen } from '@testing-library/react';
import { InterventionZoneMap } from '../InterventionZoneMap';
import type { InterventionZoneOptions } from '@/lib/interventions-api';
import type { Map3DView } from '@/components/map3d/Map3DView';
import { sampleLayers } from '@/components/map3d/__fixtures__/mapLayers';
import { selectionScene } from '../zoneSelection';

import { placesApi } from '@/lib/places-api';
jest.mock('@/lib/places-api',()=>({placesApi:{map:jest.fn()}}));
beforeEach(()=>{jest.mocked(placesApi.map).mockResolvedValue({places:[{code:'LUG-Z',name:'Pabellon Z',parentName:null,buildingIds:[1],lat:null,lon:null}],perspectives:[]});});
const places=[{id:1,code:'LUG-1',name:'Biblioteca'},{id:2,code:'LUG-Z',name:'Pabellon Z'}];
let props:React.ComponentProps<typeof Map3DView>;
jest.mock('@/components/map3d/Map3DView',()=>({Map3DView:(p:typeof props)=>{props=p;return <div data-testid="viewer"/>;}}));
jest.mock('@/hooks/useMapLayers',()=>({useMapLayers:()=>({data:sampleLayers,isLoading:false,errorMessage:null,stale:false})}));
const options:InterventionZoneOptions={place:{id:1,code:'LUG-1',name:'Biblioteca',geometryValid:true,geometry:null},datasetRevision:'d',reviewVersion:1,reviewed:true,current:true,selectionRevision:'r',candidates:[],reviewedAt:null,reviewedByUserId:1,zones:[{id:10,code:'AV-0001',name:'Jardín',geometryValid:true,geometry:sampleLayers.layers.sections.features[0].geometry,areaM2:25,point:{latitude:-12,longitude:-77},polygonCount:1}]};

it('solo permite seleccionar códigos autorizados y nunca árboles o edificios',()=>{
  const toggle=jest.fn();
  render(<InterventionZoneMap places={places} onPlace={jest.fn()} options={options} selectedIds={[]} disabledIds={new Set()} onToggle={toggle}/>);
  act(()=>props.onSelect({layer:'greenAreas',index:0}));
  expect(toggle).toHaveBeenCalledWith(10);
  toggle.mockClear();
  act(()=>props.onSelect({layer:'greenAreas',index:1}));
  expect(toggle).not.toHaveBeenCalled();
  expect(screen.getByText(/no está asociada/)).toBeInTheDocument();
  act(()=>props.onSelect({layer:'vegetation',index:0}));
  expect(toggle).not.toHaveBeenCalled();
  expect(screen.getByText(/solo referencia/)).toBeInTheDocument();
});
it('bloquea en el mapa una zona seleccionada en otra tarjeta y avisa si WebGL no funciona',()=>{
  const toggle=jest.fn();
  render(<InterventionZoneMap places={places} onPlace={jest.fn()} options={options} selectedIds={[]} disabledIds={new Set([10])} onToggle={toggle}/>);
  act(()=>props.onSelect({layer:'greenAreas',index:0}));
  expect(toggle).not.toHaveBeenCalled();
  expect(screen.getByText(/otro lugar/)).toBeInTheDocument();
  act(()=>props.onUnsupported());
  expect(screen.getByText(/navegador con WebGL/)).toBeInTheDocument();
});
it('usa la geometría vigente del servidor sin modificar el mapa compartido',()=>{
  const before=JSON.stringify(sampleLayers);
  const changed={...options,zones:[{...options.zones[0],geometry:{type:'Polygon',coordinates:[[[-77,-12],[-77.001,-12],[-77.001,-12.001],[-77,-12]]]},areaM2:400}]};
  const scene=selectionScene(sampleLayers,changed);
  expect(scene.greenAreas[0].props.areaM2).toBe(400);
  expect(scene.greenAreas[0].g[0][0]).toHaveLength(6);
  expect(JSON.stringify(sampleLayers)).toBe(before);
});

it('selecciona el lugar registrado al pulsar cualquiera de sus edificios',async()=>{
  const choose=jest.fn();
  await act(async()=>{render(<InterventionZoneMap places={places} onPlace={choose} options={options} selectedIds={[]} disabledIds={new Set()} onToggle={jest.fn()}/>);});
  act(()=>props.onSelect({layer:'campusBuildings',index:0}));
  expect(choose).toHaveBeenCalledWith(2);
});

it('explica un edificio no registrado sin cambiar el lugar elegido',async()=>{
  jest.mocked(placesApi.map).mockResolvedValue({places:[],perspectives:[]});
  const choose=jest.fn();
  await act(async()=>{render(<InterventionZoneMap places={places} onPlace={choose} options={options} selectedIds={[]} disabledIds={new Set()} onToggle={jest.fn()}/>);});
  act(()=>props.onSelect({layer:'campusBuildings',index:0}));
  expect(choose).not.toHaveBeenCalled();
  expect(screen.getByText(/todavía no está registrado como lugar/)).toBeInTheDocument();
});
