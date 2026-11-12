import type { SceneData } from '../sceneData';
import type { Manifest, Relation } from './relations';

export interface PortablePayload { scene: SceneData; manifest: Manifest; relations: Relation[]; mapVersion: number; packageId: string; glb: string }

export async function downloadPortable(scene: SceneData, manifest: Manifest, relations: Relation[], mapVersion: number) {
  const [runtime, model] = await Promise.all([
    fetch('/models/equivalence/portable.js').then((r) => { if (!r.ok) throw new Error('No se pudo cargar el módulo portátil.'); return r.text(); }),
    fetch('/models/equivalence/campus.glb').then((r) => { if (!r.ok) throw new Error('No se pudo cargar el modelo SKP.'); return r.blob(); }),
  ]);
  const glb = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(model);
  });
  const payload: PortablePayload = { scene, manifest, relations, mapVersion, packageId: crypto.randomUUID(), glb };
  const json = JSON.stringify(payload).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Equivalencias portátiles</title><body><div id="app">Cargando mapas… Si este mensaje no cambia, abre el archivo en un navegador que permita ejecutar HTML local.</div><script id="payload" type="application/json">${json}</script><script>${runtime.replace(/<\/script/gi, '<\\/script')}</script></body></html>`;
  const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'equivalencias-android.html'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
