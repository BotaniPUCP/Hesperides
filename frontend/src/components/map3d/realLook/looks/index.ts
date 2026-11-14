import type { BuildingLook } from '../types';
import arquitectura from './arquitectura.json';
import arteAntiguoC17 from './arte-antiguo-c17.json';
import arteNuevo from './arte-nuevo.json';
import artesEscenicas from './artes-escenicas.json';
import auditorioDerecho from './auditorio-derecho.json';
import aulasMovilesB from './aulas-moviles-b.json';
import bibliotecaCentral from './biblioteca-central.json';
import cienciasSociales from './ciencias-sociales.json';
import cigaPulso from './ciga-pulso.json';
import cise from './cise.json';
import civil from './civil.json';
import comedorCentral from './comedor-central.json';
import complejoSociales from './complejo-sociales.json';
import comunicaciones from './comunicaciones.json';
import desconocido07 from './desconocido-07.json';
import dintilhac from './dintilhac.json';
import dptoSociales from './dpto-sociales.json';
import educacion2 from './educacion-2.json';
import eeggcc from './eeggcc.json';
import eeggll from './eeggll.json';
import etnomusicologia from './etnomusicologia.json';
import faci from './faci.json';
import facultadDerecho from './facultad-derecho.json';
import fisica from './fisica.json';
import gestion from './gestion.json';
import gimnasio from './gimnasio.json';
import industrial from './industrial.json';
import labHidraulica from './lab-hidraulica.json';
import letrasCh from './letras-ch.json';
import maestranza from './maestranza.json';
import mcgregor from './mcgregor.json';
import mecanica from './mecanica.json';
import minas from './minas.json';
import pabellonH from './pabellon-h.json';
import pabellonI from './pabellon-i.json';
import pabellonR from './pabellon-r.json';
import pabellonV from './pabellon-v.json';
import pabellonZ from './pabellon-z.json';
import polideportivo from './polideportivo.json';
import psicologia from './psicologia.json';
import quimica from './quimica.json';
import teologia from './teologia.json';
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
  auditorioDerecho,
  aulasMovilesB,
  bibliotecaCentral,
  cienciasSociales,
  cigaPulso,
  cise,
  civil,
  comedorCentral,
  complejoSociales,
  comunicaciones,
  desconocido07,
  dintilhac,
  dptoSociales,
  educacion2,
  eeggcc,
  eeggll,
  etnomusicologia,
  faci,
  facultadDerecho,
  fisica,
  gestion,
  gimnasio,
  industrial,
  labHidraulica,
  letrasCh,
  maestranza,
  mcgregor,
  mecanica,
  minas,
  pabellonH,
  pabellonI,
  pabellonR,
  pabellonV,
  pabellonZ,
  polideportivo,
  psicologia,
  quimica,
  teologia,
  tinkuy,
];

export const BUILDING_LOOKS = files as BuildingLook[];
