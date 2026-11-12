import type { BuildingLook } from '../types';
import arteAntiguoC17 from './arte-antiguo-c17.json';
import bibliotecaCentral from './biblioteca-central.json';
import eeggll from './eeggll.json';
import facultadDerecho from './facultad-derecho.json';
import fotocopiadoZ from './fotocopiado-z.json';
import pabellonV from './pabellon-v.json';
import pabellonZ from './pabellon-z.json';
import polideportivo from './polideportivo.json';
import tinkuy from './tinkuy.json';

/**
 * Las fichas de los edificios fotografiados (SPEC-109), una por archivo. El JSON
 * llega sin tipos estrictos: `validateLooks` lo revisa al cargar y detiene el
 * visor con un mensaje claro si una ficha está mal escrita.
 */
const files: unknown[] = [
  arteAntiguoC17, bibliotecaCentral, eeggll, facultadDerecho, fotocopiadoZ, pabellonV, pabellonZ, polideportivo, tinkuy,
];

export const BUILDING_LOOKS = files as BuildingLook[];
