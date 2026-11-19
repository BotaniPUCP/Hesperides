import type { Balloon } from '@shared/types';
import { attentionDot, balloonIcon, balloonLabel, GROUP_ICON } from '../balloons/balloonClusters';

/** Los botones de los globos (SPEC-113 §7.1): uno suelto, o el de un grupo con su número. */

const GROUP_MAX = 99;
/** Tamaño de letra del número del grupo, que crece con el globo. */
const COUNT_FONT_PX = 13;

export interface BalloonPick {
  onPick: (balloon: Balloon) => void;
}

export interface Size {
  w: number;
  h: number;
}

/** Solo toca el estilo si cambió: se llama en cada cuadro mientras la cámara se mueve. */
export function resize(el: HTMLButtonElement, size: Size, scale: number) {
  const width = `${size.w.toFixed(1)}px`;
  if (el.style.width === width) return;
  el.style.width = width;
  el.style.height = `${size.h.toFixed(1)}px`;
  el.style.fontSize = `${(COUNT_FONT_PX * scale).toFixed(1)}px`;
}

export type BalloonButton = HTMLButtonElement & { members: Balloon[] };

const BUTTON_CLASS = 'group pointer-events-auto absolute left-0 top-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600';
const IMAGE_CLASS = 'block h-full w-full drop-shadow transition-transform group-hover:-translate-y-0.5';

function base(label: string): BalloonButton {
  const el = document.createElement('button') as BalloonButton;
  el.type = 'button';
  el.className = BUTTON_CLASS;
  el.setAttribute('aria-label', label);
  el.title = label;
  const img = document.createElement('img');
  img.alt = '';
  img.className = IMAGE_CLASS;
  img.draggable = false;
  el.appendChild(img);
  return el;
}

export function single(b: Balloon, cb: BalloonPick): BalloonButton {
  const el = base(balloonLabel(b));
  el.dataset.balloon = b.id;
  (el.firstChild as HTMLImageElement).src = balloonIcon(b);
  el.addEventListener('click', (e) => { e.stopPropagation(); cb.onPick(el.members[0]); });
  return el;
}

export function group(members: Balloon[], onClick: () => void): BalloonButton {
  const el = base('');
  (el.firstChild as HTMLImageElement).src = GROUP_ICON;
  const count = document.createElement('span');
  count.className = 'pointer-events-none absolute inset-x-0 top-[31%] text-center text-[1em] font-extrabold leading-none text-[#1F2A33]';
  const dot = document.createElement('span');
  dot.className = 'pointer-events-none absolute right-0 top-0 h-[0.9em] w-[0.9em] rounded-full border-2 border-[#1F2A33]';
  el.append(count, dot);
  el.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
  el.members = members;
  return el;
}

export function fillGroup(el: BalloonButton, members: readonly Balloon[]) {
  const n = members.length;
  const text = n > GROUP_MAX ? `${GROUP_MAX}+` : String(n);
  const [, count, dot] = el.children as unknown as [HTMLImageElement, HTMLSpanElement, HTMLSpanElement];
  if (count.textContent !== text) count.textContent = text;
  const color = attentionDot(members);
  dot.style.display = color ? '' : 'none';
  if (color) dot.style.background = color;
  const label = `Grupo de ${n} globos${color ? ', alguno pide atención' : ''}. Acercar`;
  if (el.getAttribute('aria-label') !== label) {
    el.setAttribute('aria-label', label);
    el.title = label;
  }
}
