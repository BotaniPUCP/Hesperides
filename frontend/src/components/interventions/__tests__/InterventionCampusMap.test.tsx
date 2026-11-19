import { act, fireEvent, render, screen } from '@testing-library/react';
import { InterventionCampusMap } from '../InterventionCampusMap';
import type { Map3DView } from '@/components/map3d/Map3DView';
import { CTRL_LAYER_LABEL } from '@/components/map3d/useCtrlRectangle';
import type { CampusOptions } from '@/lib/interventions-api';
import { sampleLayers } from '@/components/map3d/__fixtures__/mapLayers';
import { installPointerEvent } from '@/test-utils/pointerEvent';
import { addCampusSpecimen, campusScene, toggleCampus, campusLocation } from '../campusSelection';
let props:React.ComponentProps<typeof Map3DView>;
jest.mock('@/components/map3d/Map3DView',()=>({Map3DView:(p:typeof props)=>{props=p;return null;}}));
jest.mock('@/hooks/useMapLayers',()=>({useMapLayers:()=>({data:sampleLayers,isLoading:false,errorMessage:null})}));
const options:CampusOptions={selectionRevision:'r',zones:sampleLayers.layers.sections.features.slice(0,2).map((z,i)=>({id:i+1,code:z.properties.code,name:'Área',geometry:z.geometry,geometryValid:true,areaM2:100,point:{latitude:-12.07,longitude:-77.08},polygonCount:1})),specimens:[{id:91,code:'EV-91',name:'Palmera',point:{latitude:-12.07,longitude:-77.08},typeCode:'PALM',scientificName:'Palma',heightM:5,crownRadiusM:2,quantity:1}]};
const handlers=()=>({onToggle:jest.fn(),onAdd:jest.fn(),onRemove:jest.fn()});
function renderMap(h=handlers(),selected=[] as ReturnType<typeof toggleCampus>) {
  const view=render(<InterventionCampusMap options={options} selected={selected} disabled={false} focus={null} {...h}/>);
  return {h,view};
}
beforeAll(()=>{installPointerEvent();Element.prototype.setPointerCapture=jest.fn();});

it('permite áreas de distintas zonas y ejemplares independientes en el mismo mapa',()=>{
  const {h}=renderMap();
  act(()=>props.onSelect({layer:'greenAreas',index:0}));act(()=>props.onSelect({layer:'greenAreas',index:1}));act(()=>props.onSelect({layer:'vegetation',index:0}));
  expect(h.onToggle.mock.calls).toEqual([[{kind:'area',id:1}],[{kind:'area',id:2}],[{kind:'specimen',id:91}]]);
});
it('activa los árboles y resalta los ejemplares seleccionados sin añadir los demás',()=>{
  const selected=toggleCampus([], {kind:'specimen',id:91},options);
  renderMap(handlers(),selected);
  const viewer={setMarkedSections:jest.fn(),setMarkedSpecimens:jest.fn(),setLayerVisible:jest.fn()};
  act(()=>props.onReady(viewer as never));
  expect(viewer.setLayerVisible).toHaveBeenCalledWith('vegetation',true);
  expect(viewer.setMarkedSpecimens).toHaveBeenCalledWith(['EV-91']);
  expect(viewer.setMarkedSections).toHaveBeenCalledWith([]);
  expect(campusLocation(selected[0])).toMatchObject({elementIds:[91],location:null,unitItemId:null,requestedQuantity:null});
});
it('usa las posiciones vigentes del inventario y conserva el contexto del mapa',()=>{
  const before=JSON.stringify(sampleLayers);const scene=campusScene(sampleLayers,options);
  expect(scene.vegetation).toHaveLength(1);expect(scene.vegetation[0].props.code).toBe('EV-91');
  expect(scene.vegetation[0].p).toEqual([0,0]);expect(JSON.stringify(sampleLayers)).toBe(before);
});

describe('mantener pulsado y arrastrar',()=>{
  it('muestra la mano y Arrastra al activar el barrido y los retira al terminar',()=>{
    const {h}=renderMap();
    expect(screen.getByText(/Mantén pulsado un jardín o un ejemplar 2 segundos/)).toBeInTheDocument();
    expect(props.selectionSweep?.enabled('specimen')).toBe(true);
    expect(props.selectionSweep?.enabled('section')).toBe(true);
    act(()=>props.selectionSweep?.onState({clientX:100,clientY:100}));
    expect(screen.getByRole('status')).toHaveTextContent('Arrastra');
    act(()=>props.selectionSweep?.onState(null));expect(screen.queryByText('Arrastra')).not.toBeInTheDocument();
    expect(h.onToggle).not.toHaveBeenCalled();
  });
  it('agrega el ejemplar o el jardín que toca, sin alternar',()=>{
    const {h}=renderMap();
    act(()=>props.selectionSweep?.onSelect({layer:'vegetation',index:0}));
    act(()=>props.selectionSweep?.onSelect({layer:'greenAreas',index:1}));
    expect(h.onAdd.mock.calls).toEqual([[[{kind:'specimen',id:91}]],[[{kind:'area',id:2}]]]);
    expect(h.onToggle).not.toHaveBeenCalled();
  });
  it('lo que no está en el inventario no se agrega',()=>{
    const {h}=renderMap();
    act(()=>props.selectionSweep?.onSelect({layer:'campusBuildings',index:0}));
    expect(h.onAdd).not.toHaveBeenCalled();
  });
});

describe('Ctrl + clic izquierdo elige varios, Ctrl + clic derecho quita varios',()=>{
  function withViewer(sections:string[],specimens:string[]) {
    const viewer={setMarkedSections:jest.fn(),setMarkedSpecimens:jest.fn(),setLayerVisible:jest.fn(),
      sectionCodesInScreenRect:jest.fn(()=>sections),specimenCodesInScreenRect:jest.fn(()=>specimens)};
    act(()=>props.onReady(viewer as never));
    return viewer;
  }
  function ctrlDrag(button:number) {
    fireEvent.keyDown(window,{key:'Control',ctrlKey:true});
    const layer=screen.getByLabelText(CTRL_LAYER_LABEL);
    fireEvent.pointerDown(layer,{clientX:10,clientY:10,button,pointerId:1});
    fireEvent.pointerUp(layer,{clientX:110,clientY:110,button,pointerId:1});
    fireEvent.keyUp(window,{key:'Control',ctrlKey:false});
  }
  it('el rectángulo con el botón izquierdo agrega los jardines y ejemplares que encierra',()=>{
    const {h}=renderMap();
    const viewer=withViewer([options.zones[0].code],['EV-91']);
    ctrlDrag(0);
    expect(viewer.sectionCodesInScreenRect).toHaveBeenCalledWith(10,10,110,110,options.zones.map(z=>z.code));
    expect(h.onAdd).toHaveBeenCalledWith([{kind:'area',id:1},{kind:'specimen',id:91}]);
    expect(h.onRemove).not.toHaveBeenCalled();
  });
  it('el rectángulo con el botón derecho los quita',()=>{
    const {h}=renderMap();
    withViewer([options.zones[1].code],[]);
    ctrlDrag(2);
    expect(h.onRemove).toHaveBeenCalledWith([{kind:'area',id:2}]);
    expect(h.onAdd).not.toHaveBeenCalled();
  });
  it('si no encierra nada, lo dice',()=>{
    const {h}=renderMap();
    withViewer([],[]);
    ctrlDrag(0);
    expect(h.onAdd).not.toHaveBeenCalled();
    expect(screen.getByText('El rectángulo no encerró jardines ni ejemplares.')).toBeInTheDocument();
  });
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
    const {h,view}=renderMap();
    act(()=>props.selectionSweep?.onState({clientX:100,clientY:100}));
    act(()=>jest.advanceTimersByTime(2000));
    act(()=>props.selectionSweep?.onState({clientX:110,clientY:110}));
    expect(screen.getByText('Arrastra')).toBeInTheDocument();
    act(()=>jest.advanceTimersByTime(1000));
    expect(screen.queryByText('Arrastra')).not.toBeInTheDocument();
    act(()=>props.selectionSweep?.onState({clientX:120,clientY:120}));
    act(()=>props.selectionSweep?.onSelect({layer:'vegetation',index:0}));
    expect(h.onAdd).toHaveBeenCalledWith([{kind:'specimen',id:91}]);
    expect(screen.queryByText('Arrastra')).not.toBeInTheDocument();
    act(()=>props.selectionSweep?.onState(null));
    act(()=>props.selectionSweep?.onState({clientX:100,clientY:100}));
    expect(screen.getByText('Arrastra')).toBeInTheDocument();
    act(()=>props.selectionSweep?.onState(null));
    expect(jest.getTimerCount()).toBe(0);
    act(()=>props.selectionSweep?.onState({clientX:100,clientY:100}));
    view.unmount();expect(jest.getTimerCount()).toBe(0);
  } finally {jest.useRealTimers();}
});
