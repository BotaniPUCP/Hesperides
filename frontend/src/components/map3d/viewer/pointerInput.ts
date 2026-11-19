/**
 * Distingue un clic de un arrastre sobre el lienzo: los controles de cámara
 * usan el mismo puntero y un giro no debe seleccionar nada.
 */

/** Un clic que se desplaza más de esto es un arrastre, no una selección. */
const CLICK_TOLERANCE_PX = 6;

export interface PointerHandlers {
  sweep?: {
    enabled:()=>boolean;
    canStart:(clientX:number,clientY:number)=>boolean;
    onStart:(clientX:number,clientY:number)=>void;
    onMove:(clientX:number,clientY:number)=>void;
    onEnd:()=>void;
  };
  onPress: () => void;
  onClick: (clientX: number, clientY: number) => void;
  /** Solo con ratón y sin botones pulsados: en táctil no hay «pasar por encima». */
  onHover: (clientX: number, clientY: number) => void;
}

export function bindPointer(dom: HTMLElement, handlers: PointerHandlers): () => void {
  let press:{id:number;x:number;y:number;active:boolean;moved:boolean}|null=null;
  let timer:ReturnType<typeof setTimeout>|null=null;
  const clearTimer=()=>{if(timer!==null)clearTimeout(timer);timer=null;};
  const finish=()=>{
    clearTimer();const active=press?.active;press=null;
    if(active)handlers.sweep?.onEnd();
  };
  const onDown = (e: PointerEvent) => {
    finish();
    handlers.onPress();
    if(e.button!==0)return;
    const current={id:e.pointerId,x:e.clientX,y:e.clientY,active:false,moved:false};press=current;
    const sweep=handlers.sweep;
    if(e.pointerType!=='mouse'||!sweep?.enabled()||!sweep.canStart(e.clientX,e.clientY))return;
    timer=setTimeout(()=>{
      timer=null;
      if(press!==current||current.moved||!sweep.enabled()||!sweep.canStart(current.x,current.y))return;
      current.active=true;
      sweep.onStart(current.x,current.y);
    },2000);
  };
  const onUp = (e: PointerEvent) => {
    if(!press||press.id!==e.pointerId||e.button!==0)return;
    const current=press;finish();
    if(!current.active&&!current.moved&&Math.hypot(e.clientX-current.x,e.clientY-current.y)<=CLICK_TOLERANCE_PX)
      handlers.onClick(e.clientX,e.clientY);
  };
  const onMove = (e: PointerEvent) => {
    if(press&&e.pointerId===press.id) {
      if(!(e.buttons&1)){finish();return;}
      if(press.active) {
        if(!handlers.sweep?.enabled()){finish();return;}
        e.preventDefault();e.stopImmediatePropagation();
        handlers.sweep.onMove(e.clientX,e.clientY);return;
      }
      if(Math.hypot(e.clientX-press.x,e.clientY-press.y)>CLICK_TOLERANCE_PX){press.moved=true;clearTimer();}
    }
    if (e.pointerType === 'mouse' && !e.buttons) handlers.onHover(e.clientX, e.clientY);
  };
  const cancel=(e:PointerEvent)=>{if(press?.id===e.pointerId)finish();};
  const leave=()=>{if(!press?.active)finish();};
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')finish();};
  const hidden=()=>{if(document.hidden)finish();};
  // Capture consumes active brush moves before OrbitControls can rotate the camera.
  dom.addEventListener('pointerdown', onDown,true);
  dom.addEventListener('pointerup', onUp,true);
  dom.addEventListener('pointermove', onMove,true);
  dom.addEventListener('pointercancel',cancel);
  dom.addEventListener('lostpointercapture',cancel);
  dom.addEventListener('pointerleave',leave);
  window.addEventListener('pointerup',onUp);
  window.addEventListener('blur',finish);
  window.addEventListener('keydown',escape);
  document.addEventListener('visibilitychange',hidden);
  return () => {
    finish();
    dom.removeEventListener('pointerdown', onDown,true);
    dom.removeEventListener('pointerup', onUp,true);
    dom.removeEventListener('pointermove', onMove,true);
    dom.removeEventListener('pointercancel',cancel);
    dom.removeEventListener('lostpointercapture',cancel);
    dom.removeEventListener('pointerleave',leave);
    window.removeEventListener('pointerup',onUp);
    window.removeEventListener('blur',finish);
    window.removeEventListener('keydown',escape);
    document.removeEventListener('visibilitychange',hidden);
  };
}
