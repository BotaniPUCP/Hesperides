// Genera los globos del mapa (SPEC-113) en un solo lugar, para que forma y colores no diverjan.
// Uso: node scripts/mapa/globos.mjs frontend/public/map/balloons
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2];
if (!OUT) throw new Error('Falta la carpeta de salida: node scripts/mapa/globos.mjs <carpeta>');
const INK = '#1F2A33';

// Globo: círculo de radio 28 en (32,30) con cola corta hacia (32,64), tangente al círculo, como en Waze.
const shell = (color, outline = INK) => `
  <ellipse cx="32" cy="65" rx="8" ry="2.2" fill="#000" opacity=".18"/>
  <path d="M16.1 53.1A28 28 0 1 1 47.9 53.1L32 64Z" fill="${color}" stroke="${outline}" stroke-width="2.4" stroke-linejoin="round"/>
  <circle cx="32" cy="30" r="21.5" fill="#fff" stroke="${INK}" stroke-width="1.5"/>`;

const svg = (title, color, icon) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 68 70" width="68" height="70" role="img" aria-label="${title}">
  <title>${title}</title>${shell(color)}
  <g transform="translate(16 14)" stroke-linejoin="round" stroke-linecap="round">${icon}
  </g>
</svg>
`;

const warning = `
    <path d="M16 3L30.5 28H1.5Z" fill="#FFC928" stroke="${INK}" stroke-width="2"/>
    <path d="M16 11v8" stroke="${INK}" stroke-width="3"/>
    <circle cx="16" cy="23.5" r="1.8" fill="${INK}"/>
    <path d="M24 9c4-3 7-2 7-2s0 4-4 6c-2 1-3 0-3-4Z" fill="#43A047" stroke="${INK}" stroke-width="1.2"/>`;

const foreman = `
    <circle cx="16" cy="19" r="9.5" fill="#F4C7A1" stroke="${INK}" stroke-width="1.6"/>
    <circle cx="12.6" cy="19" r="1.3" fill="${INK}"/>
    <circle cx="19.4" cy="19" r="1.3" fill="${INK}"/>
    <path d="M12 23.2q4 3 8 0" fill="none" stroke="${INK}" stroke-width="1.5"/>
    <path d="M6 14A10 10 0 0 1 26 14Z" fill="#FFC928" stroke="${INK}" stroke-width="1.6"/>
    <rect x="3.5" y="13" width="25" height="3.4" rx="1.7" fill="#FFB300" stroke="${INK}" stroke-width="1.6"/>
    <path d="M16 4.5v5" stroke="${INK}" stroke-width="1.4"/>
    <path d="M26 30l3-6M29 30l-3-6" stroke="${INK}" stroke-width="1.8"/>
    <circle cx="25" cy="31" r="1.6" fill="#E53935" stroke="${INK}" stroke-width="1"/>
    <circle cx="30" cy="31" r="1.6" fill="#E53935" stroke="${INK}" stroke-width="1"/>`;

const sprinkler = `
    <path d="M4 12q4-7 12-8M28 12q-4-7-12-8" fill="none" stroke="#29B6F6" stroke-width="2" stroke-dasharray="2.5 2.5"/>
    <path d="M6 6.5c1 2 0 3-1 3s-2-1-1-3l1-2Z M27 6.5c1 2 0 3-1 3s-2-1-1-3l1-2Z" fill="#29B6F6"/>
    <path d="M16 6c3 4 4 6 4 8a4 4 0 0 1-8 0c0-2 1-4 4-8Z" fill="#29B6F6" stroke="${INK}" stroke-width="1.4"/>
    <rect x="13.5" y="18" width="5" height="7" rx="1" fill="#90A4AE" stroke="${INK}" stroke-width="1.5"/>
    <path d="M2 30q3-4 6 0q3-4 6 0q2-3 4 0q3-4 6 0q3-4 6 0" fill="#66BB6A" stroke="${INK}" stroke-width="1.4"/>
    <rect x="10" y="25" width="12" height="4" rx="1" fill="#607D8B" stroke="${INK}" stroke-width="1.5"/>`;

const dropClock = `
    <path d="M13 2c6 8 9 13 9 17a9 9 0 0 1-18 0c0-4 3-9 9-17Z" fill="#29B6F6" stroke="${INK}" stroke-width="1.6"/>
    <path d="M8.5 19a4.5 4.5 0 0 0 3 4" fill="none" stroke="#fff" stroke-width="1.8"/>
    <circle cx="23.5" cy="23.5" r="7.2" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
    <path d="M23.5 19v4.8l3 1.8" fill="none" stroke="#F57C00" stroke-width="2"/>`;

const blockedCalendar = `
    <rect x="2" y="5" width="22" height="21" rx="2.5" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
    <path d="M2 7.5a2.5 2.5 0 0 1 2.5-2.5h17a2.5 2.5 0 0 1 2.5 2.5V11H2Z" fill="#AB47BC" stroke="${INK}" stroke-width="1.6"/>
    <path d="M7.5 2.5v5M18.5 2.5v5" stroke="${INK}" stroke-width="2"/>
    <path d="M6 15h3M11.5 15h3M17 15h3M6 20h3M11.5 20h3" stroke="#B0BEC5" stroke-width="2"/>
    <circle cx="23" cy="23" r="7.5" fill="#fff" stroke="#E53935" stroke-width="2.6"/>
    <path d="M17.8 28.2l10.4-10.4" stroke="#E53935" stroke-width="2.6"/>`;

const tent = `
    <path d="M2 30q3-4 6 0q3-4 6 0q2-3 4 0q3-4 6 0q3-4 6 0" fill="#66BB6A" stroke="${INK}" stroke-width="1.4"/>
    <path d="M7 15v13M25 15v13" stroke="${INK}" stroke-width="2"/>
    <path d="M16 3L3 13h26Z" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
    <path d="M16 3L9.5 13h4.3Z M16 3l2.2 10h4.3Z" fill="#26C6DA"/>
    <path d="M16 3L3 13h26Z" fill="none" stroke="${INK}" stroke-width="1.6"/>
    <path d="M3 13q2.2 3 4.3 0q2.2 3 4.4 0q2.1 3 4.3 0q2.2 3 4.3 0q2.2 3 4.4 0q2.1 3 4.3 0" fill="#26C6DA" stroke="${INK}" stroke-width="1.4"/>
    <circle cx="13" cy="21" r="1.8" fill="#FFC928" stroke="${INK}" stroke-width="1"/>
    <circle cx="19" cy="21" r="1.8" fill="#EF5350" stroke="${INK}" stroke-width="1"/>`;

const mower = `
    <path d="M6 22L1.5 6" stroke="${INK}" stroke-width="2"/>
    <path d="M0 6.5h4.5" stroke="${INK}" stroke-width="2.6"/>
    <path d="M5 16h14l4 6H4Z" fill="#E53935" stroke="${INK}" stroke-width="1.6"/>
    <rect x="9" y="11.5" width="7" height="4.5" rx="1" fill="#546E7A" stroke="${INK}" stroke-width="1.4"/>
    <circle cx="8" cy="25" r="3.4" fill="#37474F" stroke="${INK}" stroke-width="1.4"/>
    <circle cx="19.5" cy="25" r="3.4" fill="#37474F" stroke="${INK}" stroke-width="1.4"/>
    <rect x="21.5" y="1.5" width="10" height="10" rx="1.6" fill="#fff" stroke="${INK}" stroke-width="1.4"/>
    <path d="M21.5 3.1a1.6 1.6 0 0 1 1.6-1.6h6.8a1.6 1.6 0 0 1 1.6 1.6V5h-10Z" fill="#78909C" stroke="${INK}" stroke-width="1.4"/>
    <path d="M23.8 8.2h1.6M26.6 8.2h1.6" stroke="#B0BEC5" stroke-width="1.6"/><rect x="28.7" y="7" width="2.2" height="2.6" rx=".5" fill="#E53935"/>`;

const group = (color) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-2 -2 68 70" width="68" height="70" role="img" aria-label="Grupo de globos">
  <title>Grupo de globos</title>${shell(color, '#fff')}
  <circle cx="32" cy="30" r="17" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="4 3"/>
</svg>
`;

const BALLOONS = {
  'incidencia-alta': svg('Incidencia abierta, urgencia alta', '#E53935', warning),
  'incidencia-media': svg('Incidencia abierta, urgencia media', '#FB8C00', warning),
  'incidencia-baja': svg('Incidencia abierta, urgencia baja', '#FDD835', warning),
  'incidencia-sin-urgencia': svg('Incidencia abierta, sin urgencia', '#FFFFFF', warning),
  'intervencion-en-curso': svg('Intervención en curso', '#2E9E4F', foreman),
  'riego-en-curso': svg('Riego en curso o de hoy', '#1E88E5', sprinkler),
  'seccion-por-regar': svg('Sección por regar', '#F57C00', dropClock),
  'evento-bloqueante': svg('Evento bloqueante', '#8E24AA', blockedCalendar),
  'reserva-en-curso': svg('Reserva en curso', '#00ACC1', tent),
  'corte-maquinaria-pendiente': svg('Corte con maquinaria pendiente', '#546E7A', mower),
  grupo: group('#263238'),
};

mkdirSync(OUT, { recursive: true });
for (const [name, content] of Object.entries(BALLOONS)) writeFileSync(join(OUT, `${name}.svg`), content);
console.log(Object.keys(BALLOONS).length, 'globos en', OUT);
