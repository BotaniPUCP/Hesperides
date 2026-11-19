import { createEquivalenceViewer, type EquivalenceViewer } from './equivalenceViewer';
import { relationCodes, relationTitle, conflicts, parseRelations, toggleId, type Relation } from './relations';
import type { PortablePayload } from './portableExport';
import codes from './codes.json';

const payload = JSON.parse(document.getElementById('payload')!.textContent!) as PortablePayload;
const style = document.createElement('style');
style.textContent = `*{box-sizing:border-box}body{margin:0;background:#f2f5f3;color:#172b22;font:16px system-ui}main{max-width:1200px;margin:auto;padding:12px}h1{font-size:22px}h2{font-size:18px}button,select,input{font:inherit;padding:10px;border:1px solid #a6b7ae;border-radius:7px;background:white;color:#172b22}button{min-height:44px;cursor:pointer}button:disabled{opacity:.45}button.active,#save{background:#176b46;color:white}label{display:block;margin:10px 0}input[type=search],select,input[type=text]{width:100%}.row{display:flex;gap:8px;flex-wrap:wrap}.panel{background:white;border:1px solid #bcc8c1;border-radius:9px;padding:10px;margin:10px 0}.canvas{height:52vh;min-height:280px;position:relative;overflow:hidden}.canvas canvas{position:absolute;inset:0;width:100%;height:100%}.hidden{display:none!important}.small{font-size:13px}#message{white-space:pre-wrap;font-weight:600}#results{max-height:190px;overflow:auto}#saved .row{padding:10px;border-bottom:1px solid #ccc;align-items:center}#saved span{flex:1}#search{margin-top:10px}@media(min-width:950px){.maps{display:grid;grid-template-columns:1fr 1fr;gap:12px}.map.hidden{display:block!important}.canvas{height:52vh}}`;
document.head.append(style);
document.getElementById('app')!.innerHTML = `<main><h1>Equivalencias · versión portátil</h1><p class="small">Sin conexión. Toca para seleccionar; arrastra con un dedo para desplazar; usa dos dedos para acercar y girar. Con ratón: Ctrl + arrastrar botón izquierdo selecciona por rectángulo. Naranja: selección. Verde: relacionado.</p><div class="row"><button id="export">Exportar JSON</button><label>Importar JSON <input id="import" type="file" accept=".json,application/json"></label></div><p id="storage" class="small"></p><div class="row"><button id="tab-map" class="active">Mapa actual</button><button id="tab-skp">SKP</button></div><p id="counts"></p><div class="maps"><section id="map-panel" class="panel map"><h2>Mapa actual</h2><div class="row"><button id="map-fit">Campus</button><button id="map-top">Superior</button><button id="map-focus">Acercar selección</button></div><label><input id="map-hide-linked" type="checkbox"> Ocultar relacionados</label><div id="map-canvas" class="canvas"></div></section><section id="skp-panel" class="panel map hidden"><h2>SKP</h2><div class="row"><button id="skp-fit">Campus</button><button id="skp-top">Superior</button><button id="skp-focus">Acercar selección</button></div><label><input id="small" type="checkbox"> Mostrar detalles menores de 1 m</label><label><input id="skp-hide-linked" type="checkbox"> Ocultar relacionados</label><div id="skp-canvas" class="canvas"></div></section></div><p class="small">Edificios © colaboradores de OpenStreetMap</p><section class="panel"><label>Buscar estructuras en el mapa activo<input id="search" type="search" placeholder="Nombre o identificador"></label><div id="results"></div></section><section class="panel"><label>Buscar código<input id="code-search" type="search" placeholder="G, biblioteca, C01…"></label><label>Códigos pendientes (opcionales con nombre)<select id="code" multiple size="6"></select></label><label>Nombre personalizado<input id="name" type="text" maxlength="300" placeholder="Nombre actual del edificio o conjunto"></label><label>Nota opcional<input id="note" type="text" maxlength="2000"></label><label id="shared-label" class="hidden"><input id="shared" type="checkbox"> Compartir estructuras ya relacionadas intencionalmente</label><p id="hint"></p><div class="row"><button id="save">Relacionar</button><button id="clear">Limpiar / cancelar</button><button id="undo">Deshacer</button></div><p id="message" role="status"></p></section><section class="panel"><h2 id="saved-count"></h2><div id="saved"></div></section><p>Exporta el JSON antes de cerrar. En la PC, importar reemplaza el borrador: guarda un respaldo y evita trabajar simultáneamente en ambos dispositivos.</p></main>`;
const el = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const input = (id: string) => el<HTMLInputElement>(id);
const mapIds = new Set(payload.scene.campusBuildings.map((b) => String(b.props.id)));
const skpIds = new Set(payload.manifest.parts.map((p) => p.id));
const validCodes = new Set(codes.map((c) => c.code));
const validate = (value: unknown) => parseRelations(value, payload.manifest.sourceHash, validCodes, mapIds, skpIds);
const file = (relations: Relation[]) => ({ version: 2, sourceHash: payload.manifest.sourceHash, mapVersion: payload.mapVersion, relations });
let relations = validate(file(payload.relations)).relations;
const storageKey = `hesperides-portable:${payload.packageId}`;
let storageBlocked = false;
try {
  const saved = localStorage.getItem(storageKey);
  if (saved) relations = validate(JSON.parse(saved)).relations;
} catch { storageBlocked = true; el('storage').textContent = 'No se pudo recuperar el guardado local. Se conserva intacto. Se usa la copia incluida en este HTML; importa tu último JSON si tienes avances posteriores.'; }
let mapSelection: string[] = [], skpSelection: string[] = [], editing: string | null = null;
let history: Relation[][] = [], active = 'map', exported = true;
const viewers: Partial<Record<string, EquivalenceViewer>> = {};
const items = {
  map: payload.scene.campusBuildings.map((b) => ({ id: String(b.props.id), label: b.props.name || 'Sin nombre' })),
  skp: payload.manifest.parts.map((p) => ({ id: p.id, label: `${p.category === 'caseta' ? 'Caseta' : 'Edificio'} ${p.id}` })),
};
function persist() {
  exported = false;
  if (storageBlocked) return;
  try { localStorage.setItem(storageKey, JSON.stringify(file(relations))); el('storage').textContent = 'Avances guardados en este navegador. Exporta JSON como respaldo.'; }
  catch { el('storage').textContent = 'Este navegador no permite guardar aquí. Exporta JSON para conservar los avances antes de cerrar.'; }
}
function replace(next: Relation[]) { history = [...history.slice(-19), relations]; relations = next; persist(); }
function clear() { mapSelection = []; skpSelection = []; editing = null; input('note').value = ''; input('name').value = ''; input('shared').checked = false; el<HTMLSelectElement>('code').value = ''; render(); }
function toggle(side: string, id: string) { if (side === 'map') mapSelection = toggleId(mapSelection, id); else skpSelection = toggleId(skpSelection, id); input('shared').checked = false; render(); }
function render() {
  const select = el<HTMLSelectElement>('code'), previous = Array.from(select.selectedOptions, (o) => o.value);
  const assigned = new Set(relations.filter((r) => r.id !== editing).flatMap(relationCodes));
  const query = input('code-search').value.toLocaleLowerCase();
  select.replaceChildren();
  codes.filter((c) => !assigned.has(c.code) && (previous.includes(c.code) || `${c.code} ${c.label}`.toLocaleLowerCase().includes(query))).forEach((c) => select.add(new Option(`${c.code} — ${c.label}`, c.code)));
  Array.from(select.options).forEach((o) => { o.selected = previous.includes(o.value); });
  const collisions = conflicts(relations, mapSelection, skpSelection, editing);
  el('shared-label').classList.toggle('hidden', !collisions.length);
  const hint = !mapSelection.length && !skpSelection.length ? 'Selecciona al menos una estructura en cualquiera de los mapas.' : !select.value && !input('name').value.trim() ? 'Escribe un nombre personalizado o elige un código de la lista.' : collisions.length && !input('shared').checked ? `Estas estructuras ya pertenecen a ${collisions.map(relationTitle).join(', ')}. Confirma si deben compartirse.` : '';
  el('hint').textContent = hint || 'Listo para relacionar.';
  el<HTMLButtonElement>('save').disabled = !!hint;
  el('save').textContent = editing ? 'Guardar cambios' : 'Relacionar';
  el<HTMLButtonElement>('undo').disabled = !history.length;
  el('counts').textContent = `${mapSelection.length} seleccionadas del mapa ↔ ${skpSelection.length} del SKP`;
  for (const side of ['map', 'skp']) viewers[side]?.update({ selected: side === 'map' ? mapSelection : skpSelection, linked: relations.flatMap((r) => side === 'map' ? r.mapIds : r.skpIds), buildings: true, casetas: true, small: input('small').checked, hideLinked: input(`${side}-hide-linked`).checked });
  const selected = active === 'map' ? mapSelection : skpSelection;
  const search = input('search').value.toLocaleLowerCase();
  el('results').replaceChildren();
  items[active as 'map' | 'skp'].map((item) => ({ ...item, label: relations.filter((r) => r.name && (active === 'map' ? r.mapIds : r.skpIds).includes(item.id)).map((r) => r.name).join(' / ') || item.label })).filter((item) => search ? `${item.id} ${item.label}`.toLocaleLowerCase().includes(search) : selected.includes(item.id)).forEach((item) => {
    const label = document.createElement('label'), check = document.createElement('input'); check.type = 'checkbox'; check.checked = selected.includes(item.id); check.onchange = () => toggle(active, item.id); label.append(check, document.createTextNode(` ${item.label} · ${item.id}`)); el('results').append(label);
  });
  el('saved-count').textContent = `${relations.length} relaciones · ${new Set(relations.flatMap(relationCodes)).size} / ${codes.length} códigos`;
  el('saved').replaceChildren();
  relations.forEach((r) => {
    const row = document.createElement('div'); row.className = 'row'; const text = document.createElement('span'); text.textContent = `${r.name ? r.name + ' — ' : ''}${relationCodes(r).map((value) => `${value} — ${codes.find((c) => c.code === value)?.label}`).join(' / ')} (${r.mapIds.length} ↔ ${r.skpIds.length})`;
    const edit = document.createElement('button'); edit.textContent = 'Editar'; edit.onclick = () => { editing = r.id; mapSelection = [...r.mapIds]; skpSelection = [...r.skpIds]; input('note').value = r.note; input('name').value = r.name ?? ''; input('code-search').value = ''; input('shared').checked = false; render(); Array.from(select.options).forEach((o) => { o.selected = relationCodes(r).includes(o.value); }); render(); el('hint').scrollIntoView({ block: 'center' }); };
    const remove = document.createElement('button'); remove.textContent = 'Quitar'; remove.onclick = () => { if (confirm(`¿Quitar la relación ${relationTitle(r)}? Puedes deshacerlo.`)) { replace(relations.filter((v) => v.id !== r.id)); clear(); } }; row.append(text, edit, remove); el('saved').append(row);
  });
}
el('save').onclick = () => {
  if (el<HTMLButtonElement>('save').disabled) return;
  const selectedCodes = Array.from(el<HTMLSelectElement>('code').selectedOptions, (o) => o.value);
  const code = selectedCodes[0] ?? '';
  const title = input('name').value.trim() || selectedCodes.join(', ');
  const relation: Relation = { id: editing ?? `portable-${Date.now()}-${Math.random().toString(36).slice(2)}`, code, codes: selectedCodes, mapIds: [...mapSelection], skpIds: [...skpSelection], note: input('note').value, name: input('name').value.trim(), updatedAt: new Date().toISOString() };
  replace(editing ? relations.map((r) => r.id === editing ? relation : r) : [...relations, relation]); clear(); el('message').textContent = `Relación ${title} guardada.`;
};
el('clear').onclick = clear;
el('undo').onclick = () => { if (history.length) { relations = history.pop()!; persist(); clear(); } };
for (const id of ['code-search', 'search', 'name']) input(id).oninput = render;
for (const id of ['code', 'shared', 'small', 'map-hide-linked', 'skp-hide-linked']) el(id).onchange = render;
el('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(file(relations), null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `equivalencias-${new Date().toISOString().slice(0, 10)}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 60_000); exported = true; el('message').textContent = `Exportadas ${relations.length} relaciones. Comprueba que el JSON esté en Descargas.`;
};
input('import').onchange = async () => {
  const chosen = input('import').files?.[0]; input('import').value = ''; if (!chosen) return;
  try {
    if (chosen.size > 15_000_000) throw new Error('Archivo demasiado grande.');
    const incoming = validate(JSON.parse(await chosen.text()));
    if (confirm(`Importar ${incoming.relations.length} relaciones reemplazará las ${relations.length} actuales.${incoming.mapVersion !== payload.mapVersion ? ' La versión del mapa es distinta.' : ''} ¿Continuar?`)) { storageBlocked = false; replace(incoming.relations); clear(); }
  } catch (error) { el('message').textContent = error instanceof Error ? error.message : 'No se pudo importar.'; }
};
const bytes = Uint8Array.from(atob(payload.glb), (c) => c.charCodeAt(0));
const modelUrl = URL.createObjectURL(new Blob([bytes], { type: 'model/gltf-binary' }));
function ensureViewer(side: string) {
  if (viewers[side]) return;
  try {
    viewers[side] = createEquivalenceViewer(el(`${side}-canvas`), side === 'map' ? payload.scene : modelUrl, (id) => toggle(side, id), render, () => { el('message').textContent = 'No se pudo cargar el mapa 3D. Puedes seleccionar estructuras por nombre o identificador.'; });
    render();
  } catch { el('message').textContent = 'WebGL no está disponible. Usa la búsqueda para seleccionar estructuras.'; }
}
for (const side of ['map', 'skp']) {
  el(`tab-${side}`).onclick = () => { active = side; for (const other of ['map', 'skp']) { el(`${other}-panel`).classList.toggle('hidden', other !== side); el(`tab-${other}`).classList.toggle('active', other === side); } input('search').value = ''; ensureViewer(side); render(); };
  el(`${side}-fit`).onclick = () => viewers[side]?.fit(); el(`${side}-top`).onclick = () => viewers[side]?.top(); el(`${side}-focus`).onclick = () => viewers[side]?.focus(side === 'map' ? mapSelection : skpSelection);
}
window.addEventListener('beforeunload', (event) => { if (!exported) { event.preventDefault(); event.returnValue = ''; } });
render(); ensureViewer('map');
if (window.innerWidth >= 950) ensureViewer('skp');
if (!storageBlocked) el('storage').textContent = 'Copia portátil independiente. Exporta JSON al terminar; el almacenamiento local depende del navegador.';
