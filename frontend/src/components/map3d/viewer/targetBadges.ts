import * as THREE from 'three';

export interface TargetBadge {key:string;lat:number;lon:number;text:string;height?:number;}
export interface TargetMarks {
  sections:{code:string;color:string}[];specimens:{code:string;color:string}[];badges:TargetBadge[];
}

/** Optional, editor-owned labels. The normal campus map never creates any. */
export function createTargetBadges(root:HTMLElement,toPlane:(lat:number,lon:number)=>{x:number;y:number},ground:number) {
  const host=document.createElement('div');host.setAttribute('aria-hidden','true');root.appendChild(host);
  let rows:{el:HTMLSpanElement;point:THREE.Vector3}[]=[];
  return {
    set(badges:readonly TargetBadge[]) {
      host.replaceChildren();
      rows=badges.map(b=>{
        const el=document.createElement('span');el.textContent=b.text;
        Object.assign(el.style,{position:'absolute',padding:'1px 5px',border:'1px solid #334155',borderRadius:'8px',background:'#fff',color:'#0f172a',font:'bold 12px sans-serif',pointerEvents:'none',transform:'translate(-50%,-100%)'});
        host.appendChild(el);const p=toPlane(b.lat,b.lon);
        return {el,point:new THREE.Vector3(p.x,ground+(b.height??3),-p.y)};
      });
    },
    update(camera:THREE.Camera,w:number,h:number,visible:boolean) {
      for(const row of rows) {
        const p=row.point.clone().project(camera);const on=visible&&p.z>=-1&&p.z<=1&&Math.abs(p.x)<=1&&Math.abs(p.y)<=1;
        row.el.style.display=on?'':'none';
        if(on){row.el.style.left=`${(p.x+1)*w/2}px`;row.el.style.top=`${(1-p.y)*h/2}px`;}
      }
    },
    dispose(){host.remove();rows=[];},
  };
}
