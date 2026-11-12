import { act, render, screen } from '@testing-library/react';
import { InterventionCampusMap } from '../InterventionCampusMap';
import type { Map3DView } from '@/components/map3d/Map3DView';
import type { CampusOptions } from '@/lib/interventions-api';
import { sampleLayers } from '@/components/map3d/__fixtures__/mapLayers';
import { addCampusSpecimen, campusScene, toggleCampus, campusLocation } from '../campusSelection';
let props:React.ComponentProps<typeof Map3DView>;
jest.mock('@/components/map3d/Map3DView',()=>({Map3DView:(p:typeof props)=>{props=p;return null;}}));
jest.mock('@/hooks/useMapLayers',()=>({useMapLayers:()=>({data:sampleLayers,isLoading:false,errorMessage:null})}));
const options:CampusOptions={selectionRevision:'r',zones:sampleLayers.layers.sections.features.slice(0,2).map((z,i)=>({id:i+1,code:z.properties.code,name:'Área',geometry:z.geometry,geometryValid:true,areaM2:100,point:{latitude:-12.07,longitude:-77.08},polygonCount:1})),specimens:[{id:91,code:'EV-91',name:'Palmera',point:{latitude:-12.07,longitude:-77.08},typeCode:'PALM',scientificName:'Palma',heightM:5,crownRadiusM:2,quantity:1}]};
it('permite áreas de distintas zonas y ejemplares independientes en el mismo mapa',()=>{
  const toggle=jest.fn();
  render(<InterventionCampusMap options={options} selected={[]} disabled={false} onToggle={toggle} onAddSpecimen={jest.fn()} focus={null}/>);
  act(()=>props.onSelect({layer:'greenAreas',index:0}));act(()=>props.onSelect({layer:'greenAreas',index:1}));act(()=>props.onSelect({layer:'vegetation',index:0}));
  expect(toggle.mock.calls).toEqual([[{kind:'area',id:1}],[{kind:'area',id:2}],[{kind:'specimen',id:91}]]);
});
it('activa los árboles y resalta los ejemplares seleccionados sin añadir los demás',()=>{
  const selected=toggleCampus([], {kind:'specimen',id:91},options);
  render(<InterventionCampusMap options={options} selected={selected} disabled={false} onToggle={jest.fn()} onAddSpecimen={jest.fn()} focus={null}/>);
  const viewer={setMarkedSections:jest.fn(),setMarkedVegetation:jest.fn(),setLayerVisible:jest.fn()};
  act(()=>props.onReady(viewer as never));
  expect(viewer.setLayerVisible).toHaveBeenCalledWith('vegetation',true);
  expect(viewer.setMarkedVegetation).toHaveBeenCalledWith(['EV-91']);
  expect(viewer.setMarkedSections).toHaveBeenCalledWith([]);
  expect(campusLocation(selected[0])).toMatchObject({elementIds:[91],location:null,unitItemId:null,requestedQuantity:null});
});
it('usa las posiciones vigentes del inventario y conserva el contexto del mapa',()=>{
  const before=JSON.stringify(sampleLayers);const scene=campusScene(sampleLayers,options);
  expect(scene.vegetation).toHaveLength(1);expect(scene.vegetation[0].props.code).toBe('EV-91');
  expect(scene.vegetation[0].p).toEqual([0,0]);expect(JSON.stringify(sampleLayers)).toBe(before);
});

it('muestra la mano y Arrastra al activar el barrido y los retira al terminar',()=>{
  const add=jest.fn();const toggle=jest.fn();
  render(<InterventionCampusMap options={options} selected={[]} disabled={false} onToggle={toggle} onAddSpecimen={add} focus={null}/>);
  expect(screen.getByText(/Mantén pulsado un ejemplar 2 segundos/)).toBeInTheDocument();
  expect(props.specimenSweep?.enabled()).toBe(true);
  act(()=>props.specimenSweep?.onState({clientX:100,clientY:100}));
  expect(screen.getByRole('status')).toHaveTextContent('Arrastra');
  act(()=>props.specimenSweep?.onSelect({layer:'vegetation',index:0}));
  expect(add).toHaveBeenCalledWith(91);expect(toggle).not.toHaveBeenCalled();
  act(()=>props.specimenSweep?.onSelect({layer:'greenAreas',index:0}));expect(add).toHaveBeenCalledTimes(1);
  act(()=>props.specimenSweep?.onState(null));expect(screen.queryByText('Arrastra')).not.toBeInTheDocument();
});
it('pasar varias veces por un ejemplar solo lo agrega una vez y nunca lo desmarca',()=>{
  const first=addCampusSpecimen([],91,options);
  const repeated=addCampusSpecimen(first,91,options);
  expect(repeated).toBe(first);expect(repeated).toHaveLength(1);
  expect(addCampusSpecimen(first,9999,options)).toBe(first);
});

it('oculta Arrastra a los 3 segundos sin detener el barrido ni reiniciar el plazo al mover',()=>{
  jest.useFakeTimers();
  try {
    const add=jest.fn();
    const view=render(<InterventionCampusMap options={options} selected={[]} disabled={false} onToggle={jest.fn()} onAddSpecimen={add} focus={null}/>);
    act(()=>props.specimenSweep?.onState({clientX:100,clientY:100}));
    act(()=>jest.advanceTimersByTime(2000));
    act(()=>props.specimenSweep?.onState({clientX:110,clientY:110}));
    expect(screen.getByText('Arrastra')).toBeInTheDocument();
    act(()=>jest.advanceTimersByTime(1000));
    expect(screen.queryByText('Arrastra')).not.toBeInTheDocument();
    act(()=>props.specimenSweep?.onState({clientX:120,clientY:120}));
    act(()=>props.specimenSweep?.onSelect({layer:'vegetation',index:0}));
    expect(add).toHaveBeenCalledWith(91);
    expect(screen.queryByText('Arrastra')).not.toBeInTheDocument();
    act(()=>props.specimenSweep?.onState(null));
    act(()=>props.specimenSweep?.onState({clientX:100,clientY:100}));
    expect(screen.getByText('Arrastra')).toBeInTheDocument();
    act(()=>props.specimenSweep?.onState(null));
    expect(jest.getTimerCount()).toBe(0);
    act(()=>props.specimenSweep?.onState({clientX:100,clientY:100}));
    view.unmount();expect(jest.getTimerCount()).toBe(0);
  } finally {jest.useRealTimers();}
});
