import type { BuildingLook } from '../types';
import bibliotecaCentral from './biblioteca-central.json';
import facultadDerecho from './facultad-derecho.json';
import mcgregor from './mcgregor.json';
import pabellonZ from './pabellon-z.json';
import quimica from './quimica.json';

/**
 * Las fichas de apariencia de los edificios (SPEC-112). ARCHIVO GENERADO por
 * frontend/scripts/real-look-index.mjs desde los JSON de esta carpeta: no se edita a mano.
 * `validateLooks` las revisa al cargar y detiene el visor si una está mal escrita.
 */
const files: unknown[] = [
  bibliotecaCentral,
  facultadDerecho,
  mcgregor,
  pabellonZ,
  quimica,
];

export const BUILDING_LOOKS = files as BuildingLook[];
