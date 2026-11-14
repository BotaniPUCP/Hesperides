import type { BuildingLook } from '../types';
import arquitectura from './arquitectura.json';
import arteAntiguoC17 from './arte-antiguo-c17.json';
import arteNuevo from './arte-nuevo.json';
import artesEscenicas from './artes-escenicas.json';
import bibliotecaCentral from './biblioteca-central.json';
import civil from './civil.json';
import dintilhac from './dintilhac.json';
import dptoSociales from './dpto-sociales.json';
import eeggcc from './eeggcc.json';
import eeggll from './eeggll.json';
import faci from './faci.json';
import facultadDerecho from './facultad-derecho.json';
import fisica from './fisica.json';
import labHidraulica from './lab-hidraulica.json';
import maestranza from './maestranza.json';
import mcgregor from './mcgregor.json';
import mecanica from './mecanica.json';
import minas from './minas.json';
import pabellonV from './pabellon-v.json';
import pabellonZ from './pabellon-z.json';
import polideportivo from './polideportivo.json';
import quimica from './quimica.json';
import tinkuy from './tinkuy.json';

/**
 * Las fichas de apariencia de los edificios (SPEC-112). ARCHIVO GENERADO por
 * frontend/scripts/real-look-index.mjs desde los JSON de esta carpeta: no se edita a mano.
 * `validateLooks` las revisa al cargar y detiene el visor si una está mal escrita.
 */
const files: unknown[] = [
  arquitectura,
  arteAntiguoC17,
  arteNuevo,
  artesEscenicas,
  bibliotecaCentral,
  civil,
  dintilhac,
  dptoSociales,
  eeggcc,
  eeggll,
  faci,
  facultadDerecho,
  fisica,
  labHidraulica,
  maestranza,
  mcgregor,
  mecanica,
  minas,
  pabellonV,
  pabellonZ,
  polideportivo,
  quimica,
  tinkuy,
];

export const BUILDING_LOOKS = files as BuildingLook[];
