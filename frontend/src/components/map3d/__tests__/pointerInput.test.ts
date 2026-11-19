import { bindPointer, type PointerHandlers } from '../viewer/pointerInput';

function pointer(target:EventTarget,type:string,patch:Record<string,unknown>={}) {
  const event=new MouseEvent(type,{bubbles:true,cancelable:true,clientX:20,clientY:30,button:0,buttons:type==='pointerup'?0:1,...patch});
  Object.defineProperties(event,{pointerId:{value:patch.pointerId??1},pointerType:{value:patch.pointerType??'mouse'}});
  target.dispatchEvent(event);return event;
}
function setup(eligible=true) {
  const dom=document.createElement('div');document.body.appendChild(dom);
  const sweep={enabled:jest.fn(()=>true),canStart:jest.fn(()=>eligible),onStart:jest.fn(),onMove:jest.fn(),onEnd:jest.fn()};
  const handlers:PointerHandlers={onPress:jest.fn(),onClick:jest.fn(),onHover:jest.fn(),sweep};
  const camera=jest.fn();const dispose=bindPointer(dom,handlers);dom.addEventListener('pointermove',camera);
  return {dom,sweep,handlers,camera,dispose};
}
beforeEach(()=>jest.useFakeTimers());
afterEach(()=>{jest.clearAllTimers();jest.useRealTimers();document.body.replaceChildren();});

it('activa el barrido exactamente tras 2 segundos y consume el arrastre antes de la cámara',()=>{
  const s=setup();pointer(s.dom,'pointerdown');jest.advanceTimersByTime(1999);
  expect(s.sweep.onStart).not.toHaveBeenCalled();jest.advanceTimersByTime(1);
  expect(s.sweep.onStart).toHaveBeenCalledWith(20,30);
  const move=pointer(s.dom,'pointermove',{clientX:100,clientY:110});
  expect(s.sweep.onMove).toHaveBeenCalledWith(100,110);expect(move.defaultPrevented).toBe(true);
  expect(s.camera).not.toHaveBeenCalled();pointer(s.dom,'pointerup',{clientX:100,clientY:110});
  expect(s.sweep.onEnd).toHaveBeenCalledTimes(1);expect(s.handlers.onClick).not.toHaveBeenCalled();s.dispose();
});
it('conserva el clic simple y no activa un barrido después de soltar',()=>{
  const s=setup();pointer(s.dom,'pointerdown');jest.advanceTimersByTime(1500);pointer(s.dom,'pointerup');jest.advanceTimersByTime(3000);
  expect(s.handlers.onClick).toHaveBeenCalledWith(20,30);expect(s.sweep.onStart).not.toHaveBeenCalled();s.dispose();
});
it('cancelar la espera al mover permite girar el mapa y nunca selecciona por ese arrastre',()=>{
  const s=setup();pointer(s.dom,'pointerdown');pointer(s.dom,'pointermove',{clientX:60});jest.advanceTimersByTime(3000);
  pointer(s.dom,'pointerup');expect(s.sweep.onStart).not.toHaveBeenCalled();expect(s.handlers.onClick).not.toHaveBeenCalled();expect(s.camera).toHaveBeenCalled();s.dispose();
});
it('solo se arma sobre un ejemplar elegible y con clic izquierdo de ratón',()=>{
  const s=setup(false);pointer(s.dom,'pointerdown');jest.advanceTimersByTime(2000);pointer(s.dom,'pointerup');
  expect(s.sweep.onStart).not.toHaveBeenCalled();s.sweep.canStart.mockReturnValue(true);
  pointer(s.dom,'pointerdown',{button:2,buttons:2});jest.advanceTimersByTime(2000);
  pointer(s.dom,'pointerdown',{pointerType:'touch'});jest.advanceTimersByTime(2000);
  expect(s.sweep.onStart).not.toHaveBeenCalled();s.dispose();
});
it.each(['pointercancel','lostpointercapture','outside','blur','escape'])('termina el modo por %s sin producir un clic',reason=>{
  const s=setup();pointer(s.dom,'pointerdown');jest.advanceTimersByTime(2000);
  if(reason==='outside')pointer(window,'pointerup');
  else if(reason==='blur')window.dispatchEvent(new Event('blur'));
  else if(reason==='escape')window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
  else pointer(s.dom,reason);
  pointer(s.dom,'pointerup');expect(s.sweep.onEnd).toHaveBeenCalledTimes(1);expect(s.handlers.onClick).not.toHaveBeenCalled();s.dispose();
});
it('el estado deshabilitado impide activar y detiene un barrido activo',()=>{
  const s=setup();pointer(s.dom,'pointerdown');s.sweep.enabled.mockReturnValue(false);jest.advanceTimersByTime(2000);
  expect(s.sweep.onStart).not.toHaveBeenCalled();pointer(s.dom,'pointerup');
  s.sweep.enabled.mockReturnValue(true);pointer(s.dom,'pointerdown');jest.advanceTimersByTime(2000);
  s.sweep.enabled.mockReturnValue(false);pointer(s.dom,'pointermove');expect(s.sweep.onEnd).toHaveBeenCalledTimes(1);s.dispose();
});
it('limpia los temporizadores al desmontar y devuelve el control si se desmonta durante el barrido',()=>{
  const pending=setup();pointer(pending.dom,'pointerdown');pending.dispose();jest.advanceTimersByTime(3000);expect(pending.sweep.onStart).not.toHaveBeenCalled();
  const active=setup();pointer(active.dom,'pointerdown');jest.advanceTimersByTime(2000);active.dispose();
  expect(active.sweep.onEnd).toHaveBeenCalledTimes(1);pointer(window,'pointerup');expect(active.sweep.onEnd).toHaveBeenCalledTimes(1);
});
it('los mapas que no solicitan barrido mantienen sus clics y hover',()=>{
  const dom=document.createElement('div');const handlers={onPress:jest.fn(),onClick:jest.fn(),onHover:jest.fn()};const dispose=bindPointer(dom,handlers);
  pointer(dom,'pointerdown');jest.advanceTimersByTime(2500);pointer(dom,'pointerup');pointer(dom,'pointermove',{buttons:0});
  expect(handlers.onClick).toHaveBeenCalledTimes(1);expect(handlers.onHover).toHaveBeenCalledWith(20,30);dispose();
});
