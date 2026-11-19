import * as THREE from 'three';
import { createTargetBadges } from '../viewer/targetBadges';

it('proyecta marcas visibles, escapa el texto y elimina solo sus propios nodos',()=>{
  const root=document.createElement('div');const other=document.createElement('span');other.textContent='Biblioteca';root.appendChild(other);
  const badges=createTargetBadges(root,()=>({x:0,y:0}),0);
  badges.set([{key:'garden',lat:0,lon:0,height:0,text:'◐ <img>'}]);
  const camera=new THREE.PerspectiveCamera(60,1,0.1,100);camera.position.set(0,10,10);camera.lookAt(0,0,0);camera.updateMatrixWorld();
  badges.update(camera,400,400,true);
  const mark=root.querySelector(':scope > div > span') as HTMLElement;
  expect(mark.textContent).toBe('◐ <img>');expect(mark.querySelector('img')).toBeNull();expect(mark.style.display).toBe('');
  expect(parseFloat(mark.style.left)).toBeCloseTo(200);
  badges.update(camera,400,400,false);expect(mark.style.display).toBe('none');
  badges.dispose();expect(root.textContent).toBe('Biblioteca');
});
