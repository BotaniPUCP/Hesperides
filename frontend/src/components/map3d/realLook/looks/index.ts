import type { BuildingLook } from '../types';
import pabellonZ from './pabellon-z.json';

/**
 * Las fichas de los edificios fotografiados (SPEC-109), una por archivo. El JSON
 * llega sin tipos estrictos: `validateLooks` lo revisa al cargar y detiene el
 * visor con un mensaje claro si una ficha está mal escrita.
 */
const files: unknown[] = [pabellonZ];

export const BUILDING_LOOKS = files as BuildingLook[];
