import type { BuildingLook, PhotoAtlas } from '../types';
import atlas from './atlas.json';
import adein from './adein.json';
import apoyoRural from './apoyo-rural.json';
import arqueologiaA from './arqueologia-a.json';
import arqueologiaC from './arqueologia-c.json';
import arquitectura from './arquitectura.json';
import arteAntiguoC17 from './arte-antiguo-c17.json';
import arteNuevo from './arte-nuevo.json';
import artesEscenicas from './artes-escenicas.json';
import auditorioDerecho from './auditorio-derecho.json';
import auditorioHumanidades from './auditorio-humanidades.json';
import aulaMovilPsicologia from './aula-movil-psicologia.json';
import aulasMovilesB from './aulas-moviles-b.json';
import bibliotecaCentral from './biblioteca-central.json';
import c18 from './c18.json';
import c21 from './c21.json';
import c24 from './c24.json';
import c30 from './c30.json';
import c31 from './c31.json';
import c32 from './c32.json';
import c45 from './c45.json';
import cienciasSociales from './ciencias-sociales.json';
import cigaPulso from './ciga-pulso.json';
import cise from './cise.json';
import civil from './civil.json';
import comedorArteAntiguo from './comedor-arte-antiguo.json';
import comedorCentral from './comedor-central.json';
import complejoSociales from './complejo-sociales.json';
import comunicaciones from './comunicaciones.json';
import depositoLimpieza from './deposito-limpieza.json';
import depositoRural from './deposito-rural.json';
import desconocido07 from './desconocido-07.json';
import desconocido08 from './desconocido-08.json';
import desconocido12 from './desconocido-12.json';
import desconocido13 from './desconocido-13.json';
import dintilhac from './dintilhac.json';
import dptoSociales from './dpto-sociales.json';
import educacion1 from './educacion-1.json';
import educacion2 from './educacion-2.json';
import educacionR102 from './educacion-r102.json';
import eeggcc from './eeggcc.json';
import eeggll from './eeggll.json';
import etnomusicologia from './etnomusicologia.json';
import faci from './faci.json';
import facultadDerecho from './facultad-derecho.json';
import fisica from './fisica.json';
import fotocopiadoLetras from './fotocopiado-letras.json';
import fotocopiadoZ from './fotocopiado-z.json';
import gelarti from './gelarti.json';
import gestion from './gestion.json';
import gimnasio from './gimnasio.json';
import industrial from './industrial.json';
import invernadero from './invernadero.json';
import invernaderoInteligente from './invernadero-inteligente.json';
import labHidraulica from './lab-hidraulica.json';
import labcert from './labcert.json';
import letrasCh from './letras-ch.json';
import maestranza from './maestranza.json';
import maquinariaPesada from './maquinaria-pesada.json';
import mecanica from './mecanica.json';
import minas from './minas.json';
import pabellonH from './pabellon-h.json';
import pabellonI from './pabellon-i.json';
import pabellonR from './pabellon-r.json';
import pabellonV from './pabellon-v.json';
import pabellonZ from './pabellon-z.json';
import polideportivo from './polideportivo.json';
import prototipoSshh from './prototipo-sshh.json';
import psicologia from './psicologia.json';
import quimica from './quimica.json';
import quioscoDeportes from './quiosco-deportes.json';
import salaCuna from './sala-cuna.json';
import snackSociales from './snack-sociales.json';
import subestacionN11 from './subestacion-n11.json';
import subestacionN2 from './subestacion-n2.json';
import subestacionN8 from './subestacion-n8.json';
import sumaqWasi1 from './sumaq-wasi-1.json';
import sumaqWasi2 from './sumaq-wasi-2.json';
import teologia from './teologia.json';
import tiendecitaVerde from './tiendecita-verde.json';
import tinkuy from './tinkuy.json';

/**
 * Las fichas de los edificios fotografiados (SPEC-109). ARCHIVO GENERADO por
 * scripts/mapa/colores_reales/fichas.py desde fichas.json: no se edita a mano.
 * `validateLooks` las revisa al cargar y detiene el visor si una está mal escrita.
 */
const files: unknown[] = [
  adein,
  apoyoRural,
  arqueologiaA,
  arqueologiaC,
  arquitectura,
  arteAntiguoC17,
  arteNuevo,
  artesEscenicas,
  auditorioDerecho,
  auditorioHumanidades,
  aulaMovilPsicologia,
  aulasMovilesB,
  bibliotecaCentral,
  c18,
  c21,
  c24,
  c30,
  c31,
  c32,
  c45,
  cienciasSociales,
  cigaPulso,
  cise,
  civil,
  comedorArteAntiguo,
  comedorCentral,
  complejoSociales,
  comunicaciones,
  depositoLimpieza,
  depositoRural,
  desconocido07,
  desconocido08,
  desconocido12,
  desconocido13,
  dintilhac,
  dptoSociales,
  educacion1,
  educacion2,
  educacionR102,
  eeggcc,
  eeggll,
  etnomusicologia,
  faci,
  facultadDerecho,
  fisica,
  fotocopiadoLetras,
  fotocopiadoZ,
  gelarti,
  gestion,
  gimnasio,
  industrial,
  invernadero,
  invernaderoInteligente,
  labHidraulica,
  labcert,
  letrasCh,
  maestranza,
  maquinariaPesada,
  mecanica,
  minas,
  pabellonH,
  pabellonI,
  pabellonR,
  pabellonV,
  pabellonZ,
  polideportivo,
  prototipoSshh,
  psicologia,
  quimica,
  quioscoDeportes,
  salaCuna,
  snackSociales,
  subestacionN11,
  subestacionN2,
  subestacionN8,
  sumaqWasi1,
  sumaqWasi2,
  teologia,
  tiendecitaVerde,
  tinkuy,
];

export const BUILDING_LOOKS = files as BuildingLook[];

/** Los tramos de foto enderezados (los genera `scripts/mapa/colores_reales/enderezar.py`). */
export const PHOTO_ATLAS = atlas as unknown as PhotoAtlas;
export const PHOTO_ATLAS_URL = '/models/real-look/atlas.jpg';
