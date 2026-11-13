/**
 * Arma el escenario de demostración de una sesión y guarda sus capturas con medidas.
 * Uso: npm run capturas:planificacion -- --sesion a|b
 * Requiere la sesión levantada con `bash scripts/sesion.sh arriba a|b` sobre una base recién
 * creada: el escenario registra datos y corre fechas al pasado (README).
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Locator, Page } from 'playwright-core';
import { cabenReservasDeHoy, horaLimaHoy, HORAS_RESERVAS_DE_HOY, mediodiaLimaHace } from './escenario/fechas';
import { abrirNavegador, BASE, crearApi, crearSesionDeCapturas, mapaDe, nuevaPagina, punto, union, type Api, type Capturar } from './navegador';

const COORDINADOR = 'coordinador@demo.invalid';
const CAPATAZ = 'capataz@demo.invalid';
const RAMAS: Record<string, string> = { a: 'feature/conjuntos-con-ejemplares', b: 'feature/spec-107-reservas-jardines' };

type Item = { id: number; code: string; label: string; parentItemId: number | null; typeCode: string };
type Opciones = {
  catalogs: Item[];
  zones: { id: number; name: string }[];
  teams: { id: number; name: string; assignees: { id: number }[] }[];
};
type Frecuencia = { id: number; activityType: { id: number }; scope: string; current: boolean; minDaysInterval: number | null; maxDaysInterval: number | null };
type Intervencion = { id: number; version: number; locations: { id: number }[] };

const unico = <T>(lista: T[], que: string): T => {
  if (lista.length !== 1) throw new Error(`Se esperaba un solo ${que} y hay ${lista.length}`);
  return lista[0];
};

/** Lo que el escenario necesita de los catálogos, buscado por nombre y no por id. */
function catalogo(opciones: Opciones) {
  const item = (tipo: string, etiqueta: string) =>
    unico(opciones.catalogs.filter((c) => c.typeCode === tipo && c.label === etiqueta), `${tipo} «${etiqueta}»`).id;
  const zona = (nombre: string) => unico(opciones.zones.filter((z) => z.name === nombre), `jardín «${nombre}»`).id;
  const cuadrilla = unico(opciones.teams.filter((t) => t.name === 'Cuadrilla de demostración'), 'cuadrilla de demostración');
  return { item, zona, cuadrilla: cuadrilla.id, capataz: cuadrilla.assignees[0].id };
}

const hoyEnLima = () => mediodiaLimaHace(0, new Date()).slice(0, 10);

/** Una foto mínima de 1 × 1 px: completar una ubicación exige al menos una foto recibida. */
const FOTO = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

async function completarUbicacion(capataz: Api, intervencionId: number, ubicacionId: number): Promise<Intervencion> {
  let intervencion = await capataz<Intervencion>('GET', `/interventions/${intervencionId}`);
  intervencion = await capataz<Intervencion>('POST', `/interventions/${intervencionId}/locations/${ubicacionId}/start`, { version: intervencion.version });
  const evidencia = await capataz<{ id: number }>('POST', `/interventions/${intervencionId}/evidences`, {
    version: intervencion.version, interventionLocationId: ubicacionId, clientReference: randomUUID(),
    momentCode: 'AFTER', capturedAt: new Date().toISOString(),
  });
  await capataz.subir(`/interventions/${intervencionId}/evidences/${evidencia.id}/file`, 'demostracion.png', FOTO, 'image/png');
  intervencion = await capataz<Intervencion>('GET', `/interventions/${intervencionId}`);
  return capataz<Intervencion>('POST', `/interventions/${intervencionId}/locations/${ubicacionId}/complete`, {
    version: intervencion.version, executionNotes: 'Ejecución de demostración', measurementOutcomes: [],
  });
}

async function registrarEjecutada(coordinador: Api, capataz: Api, datos: {
  clase: number; tipo: number; origen: number; cuadrilla: number; asignado: number; zonas: number[]; descripcion: string;
}): Promise<number> {
  let intervencion = await coordinador<Intervencion>('POST', '/interventions', {
    classItemId: datos.clase,
    typeItemId: datos.tipo,
    scheduledDate: hoyEnLima(),
    description: datos.descripcion,
    originItemId: datos.origen,
    locations: datos.zonas.map((zoneId) => ({ clientReference: randomUUID(), zoneId })),
  });
  intervencion = await coordinador<Intervencion>('POST', `/interventions/${intervencion.id}/assign`, {
    version: intervencion.version, teamId: datos.cuadrilla, assignedToUserId: datos.asignado,
  });
  for (const { id } of intervencion.locations) await completarUbicacion(capataz, intervencion.id, id);
  return intervencion.id;
}

function psql(contenedor: string, archivo: string, variables: Record<string, string | number>) {
  const argumentos = ['exec', '-i', contenedor, 'psql', '-U', 'hesperides', '-d', 'hesperides', '-q', '-v', 'ON_ERROR_STOP=1'];
  for (const [nombre, valor] of Object.entries(variables)) argumentos.push('-v', `${nombre}=${valor}`);
  const resultado = spawnSync('docker', argumentos, { input: readFileSync(archivo, 'utf-8'), encoding: 'utf-8' });
  if (resultado.status !== 0) throw new Error(`${archivo} falló en ${contenedor}: ${resultado.stderr.trim()}`);
}

/** Jardines del ejemplo de la sesión A: secciones grandes del entorno del CAPU, a 6 m o menos entre sí. */
const JARDINES_P = ['Jardín CAPU', 'Jardín Tesorería', 'Jardín DAES', 'F 2', 'F 3', 'Jardín Frutas (bordes)'];
const COMPARTIDO = 'Jardín Frutas (bordes)';
const JARDINES_S = [COMPARTIDO, 'Jardín Facu Sociales', 'E 6'];
export const CONJUNTO_P = 'Jardines del CAPU';
export const CONJUNTO_S = 'Jardines de Frutas y Sociales';

const ESTACIONES_CANTEO = [
  { season: 'VERANO', startMonth: 12, endMonth: 3, minDaysInterval: 15, maxDaysInterval: 20 },
  { season: 'OTONO', startMonth: 4, endMonth: 6, minDaysInterval: 20, maxDaysInterval: 25 },
  { season: 'INVIERNO', startMonth: 7, endMonth: 9, minDaysInterval: 25, maxDaysInterval: 30 },
  { season: 'PRIMAVERA', startMonth: 10, endMonth: 11, minDaysInterval: 20, maxDaysInterval: 25 },
];

async function escenarioA() {
  const coordinador = await crearApi(COORDINADOR);
  const capataz = await crearApi(CAPATAZ);
  const opciones = await coordinador<Opciones>('GET', '/interventions/options');
  const { item, zona, cuadrilla, capataz: asignado } = catalogo(opciones);
  const actividad = (etiqueta: string) => item('INTERVENTION_TYPE', etiqueta);

  const conjuntos = await coordinador<{ id: number; name: string }[]>('GET', '/green-area-sets');
  if (conjuntos.some((c) => c.name === CONJUNTO_P)) {
    throw new Error('La base ya tiene el escenario A: baja y vuelve a levantar la sesión (bash scripts/sesion.sh abajo a)');
  }
  // El seed de reportes (SPEC-202) trae un conjunto y su planificación: en la base desechable se quitan
  // para que el inicio y la lista muestren solo el ejemplo.
  for (const { id } of await coordinador<{ id: number }[]>('GET', '/maintenance/planning/assignments')) {
    await coordinador('DELETE', `/maintenance/planning/assignments/${id}`);
  }
  for (const { id } of conjuntos) await coordinador('DELETE', `/green-area-sets/${id}`);

  // Frecuencias de todo el campus con personal propio: el ejemplo y una de cada forma para f3. La tabla
  // va en orden alfabético: las cuatro actividades quedan juntas arriba.
  const frecuencias = await coordinador<Frecuencia[]>('GET', '/maintenance/frequencies');
  const vigente = (actividadId: number) =>
    frecuencias.find((f) => f.current && f.scope === 'CAMPUS_WIDE' && f.activityType.id === actividadId);
  const comun = { regime: 'IN_HOUSE', scope: 'CAMPUS_WIDE', notes: null };
  const deshierbo = actividad('Deshierbo');
  const existente = vigente(deshierbo);
  const reglaDeshierbo = { ...comun, activityTypeItemId: deshierbo, frequencyRuleTypeCode: 'INTERVAL_DAYS', minDaysInterval: 30, maxDaysInterval: 35 };
  const frecuencia = existente
    ? (existente.minDaysInterval === 30 && existente.maxDaysInterval === 35
      ? existente
      : await coordinador<Frecuencia>('PUT', `/maintenance/frequencies/${existente.id}`, reglaDeshierbo))
    : await coordinador<Frecuencia>('POST', '/maintenance/frequencies', reglaDeshierbo);
  const otras = [
    { activityTypeItemId: actividad('Canteo'), frequencyRuleTypeCode: 'INTERVAL_DAYS', seasons: ESTACIONES_CANTEO },
    { activityTypeItemId: actividad('Aplicación estacional'), frequencyRuleTypeCode: 'SEASONAL_PERIOD', annualTargetCount: 2 },
    { activityTypeItemId: actividad('Fertilización'), frequencyRuleTypeCode: 'ANNUAL_WINDOW', annualTargetCount: 1, seasonStartMonth: 3, seasonEndMonth: 5 },
  ];
  for (const regla of otras) {
    if (!vigente(regla.activityTypeItemId)) await coordinador('POST', '/maintenance/frequencies', { ...comun, ...regla });
  }

  // Los dos conjuntos y sus planificaciones de Deshierbo.
  for (const [nombre, jardines] of [[CONJUNTO_P, JARDINES_P], [CONJUNTO_S, JARDINES_S]] as const) {
    const conjunto = await coordinador<{ id: number }>('POST', '/green-area-sets', {
      name: nombre, description: null, zoneIds: jardines.map(zona), elementIds: [],
    });
    await coordinador('POST', '/maintenance/planning/assignments', { setId: conjunto.id, frequencyId: frecuencia.id });
  }

  // Historial: lo que el capataz ya hizo, registrado hoy y corrido al pasado por SQL.
  const ejecutar = (zonas: string[], descripcion: string) => registrarEjecutada(coordinador, capataz, {
    clase: item('INTERVENTION_CLASS', 'Mantenimiento de jardines'),
    tipo: deshierbo,
    origen: item('INTERVENTION_ORIGIN', 'Mantenimiento'),
    cuadrilla,
    asignado,
    zonas: zonas.map(zona),
    descripcion,
  });
  const x39 = await ejecutar(JARDINES_P, 'Deshierbo de demostración del entorno del CAPU');
  const x28 = await ejecutar(JARDINES_S.filter((j) => j !== COMPARTIDO), 'Deshierbo de demostración de Frutas y Sociales');
  const x3 = await ejecutar([COMPARTIDO], 'Deshierbo de demostración de Jardín Frutas (bordes)');

  const ahora = new Date();
  psql('hespo-video-a-db', 'scripts/escenario/sesion-a.sql', {
    frecuencia: frecuencia.id,
    hace60: mediodiaLimaHace(60, ahora),
    hace39: mediodiaLimaHace(39, ahora),
    hace28: mediodiaLimaHace(28, ahora),
    hace3: mediodiaLimaHace(3, ahora),
    x39, x28, x3,
  });
  console.log(`Escenario A listo: frecuencia ${frecuencia.id}, intervenciones ${x39}, ${x28}, ${x3}`);
}

/** Organizaciones y contactos de demostración: nunca personas reales (spec §4.2). */
const ORGANIZACION = 'Organización de demostración';
const INVITADA = 'Organización invitada de demostración';
const CONTACTOS = [
  { nombre: 'Ana Ejemplo', movil: '900 000 001', organizacion: ORGANIZACION },
  { nombre: 'Bruno Ejemplo', movil: '900 000 002', organizacion: INVITADA },
];
export const JARDIN_RESERVADO = 'Jardín Rosales';
/** Otros jardines prestables para las reservas que ya están en la agenda. */
const JARDINES_AGENDA = { terminada: 'Jardín Comedor Central', enCurso: 'Jardín Física', proxima: 'Jardín Frutas' };
const MOTIVO = 'Actividad de demostración';

type Codigo = { code: string };
type Pagina<T> = { items: T[] };

/** La sección que recibe el trabajo cercano al jardín reservado, elegida en la base (sesion-b.sql). */
function seccionCercana(jardin: number): { id: number; nombre: string; metros: number } {
  const resultado = spawnSync('docker', ['exec', '-i', 'hespo-video-b-db', 'psql', '-U', 'hesperides', '-d', 'hesperides', '-At', '-v', `jardin=${jardin}`], {
    input: readFileSync('scripts/escenario/sesion-b.sql', 'utf-8'),
    encoding: 'utf-8',
  });
  if (resultado.status !== 0) throw new Error(`sesion-b.sql falló: ${resultado.stderr.trim()}`);
  const fila = resultado.stdout.trim();
  if (!fila) throw new Error(`No hay ninguna sección a entre 3 y 9 m de ${JARDIN_RESERVADO}`);
  const [id, nombre, metros] = fila.split(';');
  return { id: Number(id), nombre, metros: Number(metros) };
}

async function escenarioB() {
  const ahora = new Date();
  if (!cabenReservasDeHoy(ahora)) {
    throw new Error('La sesión B necesita correr entre las 04:00 y las 21:59 de Lima: arma reservas en curso y terminadas de hoy');
  }
  const coordinador = await crearApi(COORDINADOR);
  const organizaciones = await coordinador<Pagina<{ name: string }>>('GET', '/directory/organizations');
  if (organizaciones.items.some((o) => o.name === ORGANIZACION)) {
    throw new Error('La base ya tiene el escenario B: baja y vuelve a levantar la sesión (bash scripts/sesion.sh abajo b)');
  }

  const codigoDe: Record<string, string> = {};
  for (const nombre of [ORGANIZACION, INVITADA]) {
    codigoDe[nombre] = (await coordinador<Codigo>('POST', '/directory/organizations', { name: nombre, typeCode: 'PUCP_UNIT', aliases: [] })).code;
  }
  for (const contacto of CONTACTOS) {
    codigoDe[contacto.nombre] = (await coordinador<Codigo>('POST', '/directory/contacts', {
      fullName: contacto.nombre, organizationCodes: [codigoDe[contacto.organizacion]], roles: {}, mobile: contacto.movil,
    })).code;
  }

  const jardines = await coordinador<{ id: number; name: string }[]>('GET', '/reservations/gardens');
  const jardin = (nombre: string) => unico(jardines.filter((j) => j.name === nombre), `jardín prestable «${nombre}»`).id;
  const seccion = seccionCercana(jardin(JARDIN_RESERVADO));

  // Trabajo programado para mañana a unos metros del jardín: los avisos de r7 y r9.
  const opciones = await coordinador<Opciones>('GET', '/interventions/options');
  const { item } = catalogo(opciones);
  const manana = mediodiaLimaHace(-1, ahora).slice(0, 10);
  await coordinador('POST', '/interventions', {
    classItemId: item('INTERVENTION_CLASS', 'Mantenimiento de jardines'),
    typeItemId: item('INTERVENTION_TYPE', 'Deshierbo'),
    scheduledDate: manana,
    description: 'Deshierbo de demostración',
    originItemId: item('INTERVENTION_ORIGIN', 'Mantenimiento'),
    locations: [{ clientReference: randomUUID(), zoneId: seccion.id }],
  });

  // La agenda: una terminada y una en curso de hoy, y una de mañana, en otros jardines.
  const reservar = (nombre: string, desde: string, hasta: string) => coordinador('POST', '/reservations', {
    placeId: jardin(nombre), requestedByCode: codigoDe[ORGANIZACION], requesterCode: codigoDe['Ana Ejemplo'],
    responsibleCode: codigoDe['Ana Ejemplo'],
    startsAt: desde, endsAt: hasta, purpose: MOTIVO,
  });
  const { enCurso, terminada } = HORAS_RESERVAS_DE_HOY;
  await reservar(JARDINES_AGENDA.terminada, horaLimaHoy(terminada.desde, ahora), horaLimaHoy(terminada.hasta, ahora));
  await reservar(JARDINES_AGENDA.enCurso, horaLimaHoy(enCurso.desde, ahora), horaLimaHoy(enCurso.hasta, ahora));
  await reservar(JARDINES_AGENDA.proxima, `${manana}T08:00:00-05:00`, `${manana}T09:30:00-05:00`);
  console.log(`Escenario B listo: trabajo cercano en ${seccion.nombre}, a ${seccion.metros} m de ${JARDIN_RESERVADO}`);
}

const ALTO_VENTANA = 627;

/** Baja la página lo justo para que `elemento` quede entero a la vista. */
async function bajarHasta(page: Page, elemento: Locator, margen = 24) {
  const caja = await elemento.boundingBox();
  if (!caja) throw new Error('No se encontró el elemento hasta el que bajar');
  const sobra = caja.y + caja.height - (ALTO_VENTANA - margen);
  if (sobra > 0) await page.evaluate((dy) => window.scrollBy(0, dy), sobra);
  await page.waitForTimeout(400);
}

/** La tarjeta que contiene un texto: el ancestro más cercano que también contiene `boton`. */
const tarjetaCon = (page: Page, texto: string, boton: string) =>
  page
    .getByText(texto, { exact: true })
    .locator(`xpath=ancestor::*[.//button[normalize-space()="${boton}"] or .//a[normalize-space()="${boton}"]][1]`);

/** Dónde se pulsa en el selector de jardines, en vista superior y tras acercar el mapa. */
const CLIC_JARDIN = { x: 675, y: 345 };
const ARRASTRE = { desde: { x: 520, y: 400 }, hasta: { x: 630, y: 470 } };

async function capturasA(page: Page, capturar: Capturar) {
  // Frecuencias: la lista con las cuatro formas a la vista, y la ficha del ejemplo.
  await page.goto(`${BASE}/intervenciones/frecuencias`);
  // La tabla va en orden alfabético: la primera fila con ese texto es la que se ve arriba.
  const fila = (texto: string) => page.locator('tr', { hasText: texto }).first();
  await fila('Cada 30 a 35 días').waitFor();
  await bajarHasta(page, fila('1 vez entre mar y may'));
  await capturar(page, 'frecuencias-lista', {
    filaEjemplo: fila('Cada 30 a 35 días'),
    frecuenciaEjemplo: page.getByText('Cada 30 a 35 días', { exact: true }),
    columnaFrecuencia: page.locator('th', { hasText: /^Frecuencia$/ }),
    filaEstacion: fila('Según la estación'),
    filaVeces: fila('Mín. 2 veces al año'),
    filaTemporada: fila('1 vez entre mar y may'),
  });
  await fila('Cada 30 a 35 días').click();
  await page.getByText('Se aplica a', { exact: true }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await capturar(page, 'frecuencia-ficha', {
    seAplicaA: union(page.getByText('Se aplica a', { exact: true }), page.getByText('Solo algunas áreas', { exact: true })),
    modalidad: union(page.getByText('Modalidad de ejecución', { exact: true }), page.getByText('Servicio tercerizado', { exact: true })),
  });
  const guardarVersion = page.getByRole('button', { name: 'Guardar versión' });
  await guardarVersion.scrollIntoViewIfNeeded();
  await capturar(page, 'frecuencia-ficha-pie', {
    aviso: page.getByText(/El cambio rige desde hoy/),
    botones: union(page.getByRole('button', { name: 'Desactivar frecuencia' }), guardarVersion),
  });

  // Conjuntos: la lista y el selector sobre el mapa (este conjunto no se guarda).
  await page.goto(`${BASE}/intervenciones/conjuntos`);
  const tarjetaConjunto = tarjetaCon(page, CONJUNTO_P, 'Ver en el mapa');
  await tarjetaConjunto.waitFor();
  await capturar(page, 'conjuntos-lista', { tarjeta: tarjetaConjunto, cantidad: tarjetaConjunto.getByText('6 jardines', { exact: true }) });
  await page.getByText('+ Nuevo conjunto').click();
  const lista = page.getByText(/^(Nada elegido todavía|Elegido: .+)$/);
  await page.getByText('Nada elegido todavía').waitFor();
  // El mapa ignora los botones hasta terminar de cargar: sin esta espera queda en perspectiva.
  await page.locator('main canvas').last().waitFor();
  await page.waitForTimeout(5000);
  await page.getByRole('button', { name: 'Vista superior' }).click();
  await page.waitForTimeout(2500);
  await page.mouse.move(600, 330);
  for (let paso = 0; paso < 4; paso++) {
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1500);
  await capturar(page, 'conjunto-selector-0', {
    jardinClic: punto(CLIC_JARDIN.x, CLIC_JARDIN.y),
    inicioArrastre: punto(ARRASTRE.desde.x, ARRASTRE.desde.y),
    finArrastre: punto(ARRASTRE.hasta.x, ARRASTRE.hasta.y),
    lista,
  });
  await page.mouse.click(CLIC_JARDIN.x, CLIC_JARDIN.y);
  await page.getByText('Elegido: 1 jardín', { exact: true }).waitFor({ timeout: 10000 });
  await capturar(page, 'conjunto-selector-1', { lista });
  await page.keyboard.down('Control');
  await page.mouse.move(ARRASTRE.desde.x, ARRASTRE.desde.y);
  await page.mouse.down();
  await page.mouse.move((ARRASTRE.desde.x + ARRASTRE.hasta.x) / 2, (ARRASTRE.desde.y + ARRASTRE.hasta.y) / 2, { steps: 5 });
  await page.mouse.move(ARRASTRE.hasta.x, ARRASTRE.hasta.y, { steps: 5 });
  await capturar(page, 'conjunto-selector-arrastre', { lista });
  await page.mouse.up();
  await page.keyboard.up('Control');
  await page.getByText(/^Elegido: \d+ jardines$/).waitFor({ timeout: 10000 });
  await capturar(page, 'conjunto-selector-2', { lista });

  // Nueva planificación, sin guardar: un conjunto con una actividad que aún no tiene.
  await page.goto(`${BASE}/intervenciones/planificacion/nueva`);
  const selectores = page.locator('main select');
  await selectores.nth(0).selectOption({ label: `${CONJUNTO_P} · 6 jardines` });
  await selectores.nth(1).selectOption({ label: 'Fertilización' });
  const frecuenciaPropuesta = page.locator('label', { hasText: '1 vez entre mar y may' });
  await frecuenciaPropuesta.waitFor();
  await capturar(page, 'planificacion-nueva', { conjunto: selectores.nth(0), actividad: selectores.nth(1), frecuencia: frecuenciaPropuesta });

  // El inicio y la planificación.
  await page.goto(`${BASE}/`);
  const atrasados = page.getByText('1 conjunto atrasado', { exact: true });
  await atrasados.waitFor();
  const irAPlanificacion = page.getByRole('link', { name: 'Ir a Planificación' }).or(page.getByRole('button', { name: 'Ir a Planificación' }));
  await capturar(page, 'inicio', {
    bloqueAtrasados: atrasados.locator('..'),
    bloqueVencen: page.getByText('1 conjunto vence en los próximos 7 días', { exact: true }).locator('..'),
    irAPlanificacion,
  });
  await irAPlanificacion.click();
  // Cada planificación es un elemento de la lista; el nombre del conjunto también sale sobre el mapa.
  const tarjeta = page.locator('li', { hasText: `en ${CONJUNTO_P}` });
  await tarjeta.waitFor();
  await page.waitForTimeout(2500);
  const filtros = page.getByText('Buscar conjunto', { exact: true }).locator('xpath=ancestor::*[count(.//select) >= 2][1]');
  const botonPlanificar = tarjeta.getByText('Planificar los 5 pendientes', { exact: true });
  await capturar(page, 'planificacion-lista', {
    primeraTarjeta: tarjeta,
    estado: tarjeta.getByText('Atrasada', { exact: true }),
    ultimaVez: tarjeta.getByText('Última vez', { exact: true }).locator('..'),
    sueleRealizarse: tarjeta.getByText('Suele realizarse', { exact: true }).locator('..'),
    filtros,
  });
  await tarjeta.getByText(CONJUNTO_P, { exact: true }).click();
  await page.getByText('Ver todo el conjunto').waitFor();
  await page.waitForTimeout(3500);
  await capturar(page, 'planificacion-elegida', {
    primeraTarjeta: tarjeta,
    mapa: mapaDe(page),
    alDia: tarjeta.getByText('Al día: 1 de 6 jardines', { exact: true }).locator('..'),
    botonPlanificar,
  });

  // El registro llega lleno con los 5 pendientes; se guarda tal cual.
  await botonPlanificar.click();
  const propuesta = page.getByText(/Se propone solo lo que falta/);
  await propuesta.waitFor();
  await page.waitForTimeout(2000);
  await capturar(page, 'intervencion-prellenada', {
    aviso: propuesta.locator('..'),
    actividad: page.locator('main select').nth(1),
    fecha: page.locator('main input[type=date]').first(),
  });
  const crear = page.getByRole('button', { name: 'Crear intervención' });
  await crear.scrollIntoViewIfNeeded();
  await capturar(page, 'intervencion-prellenada-pie', { guardar: crear });
  await crear.click();
  await page.waitForURL(/\/intervenciones\/\d+/);
  const intervencionId = Number(new URL(page.url()).pathname.split('/').pop());

  await page.goto(`${BASE}/intervenciones/planificacion`);
  await tarjeta.getByText('Programada', { exact: true }).waitFor();
  await page.waitForTimeout(1500);
  await capturar(page, 'planificacion-programada', {
    estado: tarjeta.getByText('Programada', { exact: true }),
    detalle: tarjeta.getByText(/para el /),
  });

  // El capataz empieza y completa 3 de los 5 jardines: la tarjeta muestra lo que falta.
  const coordinador = await crearApi(COORDINADOR);
  const capataz = await crearApi(CAPATAZ);
  const { cuadrilla, capataz: asignado } = catalogo(await coordinador<Opciones>('GET', '/interventions/options'));
  const creada = await coordinador<Intervencion>('GET', `/interventions/${intervencionId}`);
  await coordinador('POST', `/interventions/${intervencionId}/assign`, { version: creada.version, teamId: cuadrilla, assignedToUserId: asignado });
  for (const { id } of creada.locations.slice(0, 3)) await completarUbicacion(capataz, intervencionId, id);
  await page.reload();
  await tarjeta.getByText('En curso', { exact: true }).waitFor();
  await page.waitForTimeout(1500);
  await capturar(page, 'planificacion-en-curso', {
    estado: tarjeta.getByText('En curso', { exact: true }),
    detalle: tarjeta.getByText(/faltan 3 jardines/),
  });
}

/** Quita el foco del campo activo: un campo de hora enfocado se ve con su número seleccionado. */
async function soltarFoco(page: Page) {
  await page.locator('h1').first().click();
  await page.waitForTimeout(300);
}

const subir = (page: Page) => page.evaluate(() => window.scrollTo(0, 0));
const bajarAlFinal = (page: Page) => page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

/** Elige una sugerencia de un selector del Directorio: escribe y pulsa la que empieza con `nombre`. */
async function elegirDelDirectorio(page: Page, campo: string, escrito: string, nombre: string) {
  await page.locator(campo).click();
  await page.locator(campo).fill(escrito);
  await page.getByRole('button', { name: new RegExp(`^${nombre}`) }).first().click();
  await page.waitForTimeout(800);
}

async function capturasB(page: Page, capturar: Capturar) {
  const coordinador = await crearApi(COORDINADOR);
  const jardines = await coordinador<{ id: number; name: string }[]>('GET', '/reservations/gardens');
  const reservado = unico(jardines.filter((j) => j.name === JARDIN_RESERVADO), `jardín prestable «${JARDIN_RESERVADO}»`).id;
  const seccion = seccionCercana(reservado);
  const manana = mediodiaLimaHace(-1, new Date()).slice(0, 10);

  // La agenda: arriba los filtros y «Nueva reserva»; más abajo los días y los estados.
  await page.goto(`${BASE}/reservas`);
  await page.getByText('Hoy', { exact: true }).waitFor();
  const selectores = page.locator('main select');
  const nuevaReserva = page.getByRole('link', { name: 'Nueva reserva' }).or(page.getByRole('button', { name: 'Nueva reserva' })).first();
  await capturar(page, 'reservas-agenda', {
    filtroJardin: union(page.getByText('Jardín', { exact: true }), selectores.nth(0)),
    filtroOrganizacion: union(page.getByText('Organización', { exact: true }), selectores.nth(1)),
    nuevaReserva,
  });
  const fila = page.locator('main li', { has: page.getByRole('link', { name: JARDINES_AGENDA.enCurso, exact: true }) });
  await bajarHasta(page, page.getByText('Mañana', { exact: true }).locator('xpath=following::li[1]'));
  await capturar(page, 'reservas-agenda-dias', {
    fila,
    horario: fila.locator('p').first(),
    jardin: fila.getByRole('link', { name: JARDINES_AGENDA.enCurso, exact: true }),
    pedidoDe: fila.getByText(`· Pedido de ${ORGANIZACION}`),
    encabezadoHoy: page.getByText('Hoy', { exact: true }),
    encabezadoManana: page.getByText('Mañana', { exact: true }),
    estadoProxima: page.getByText('Próxima', { exact: true }).first(),
    estadoEnCurso: page.getByText('En curso', { exact: true }).first(),
    estadoTerminada: page.getByText('Terminada', { exact: true }).first(),
  });

  // La nueva reserva, campo por campo, en el orden en que los nombra la frase r5.
  await subir(page);
  await nuevaReserva.click();
  const jardin = page.locator('#reservation-garden');
  await jardin.waitFor();
  const campoJardin = () => union(page.locator('label[for="reservation-garden"]'), jardin);
  await capturar(page, 'reserva-nueva-0', { jardin: campoJardin() });
  await jardin.selectOption(String(reservado));
  await soltarFoco(page);
  await capturar(page, 'reserva-nueva-1', { jardin: campoJardin() });

  const horario = () => union(page.locator('label', { hasText: /^Fecha/ }), page.locator('label', { hasText: /^Hora de fin/ }));
  const avisos = page.getByText('Avisos de este horario', { exact: true }).locator('..');
  await page.locator('main input[type=date]').fill(manana);
  await page.locator('main input[type=time]').nth(0).fill('10:00');
  await page.locator('main input[type=time]').nth(1).fill('14:00');
  await soltarFoco(page);
  await page.getByText(/tiene trabajo por hacer/).waitFor();
  await bajarAlFinal(page);
  await capturar(page, 'reserva-nueva-2', { horario: horario(), avisos });

  await subir(page);
  await elegirDelDirectorio(page, '#reservation-requested-by', 'Organización de dem', ORGANIZACION);
  await soltarFoco(page);
  const pedidoDe = () => union(page.getByText('Pedido de', { exact: true }), page.getByText(ORGANIZACION, { exact: true }).first());
  await capturar(page, 'reserva-nueva-3', { pedidoDe: pedidoDe() });
  await elegirDelDirectorio(page, '#reservation-requester', 'Ana', 'Ana Ejemplo');
  await soltarFoco(page);
  await capturar(page, 'reserva-nueva-4', {
    pedidoDe: pedidoDe(),
    solicitante: union(page.getByText('Solicitante', { exact: true }), page.getByText('Ana Ejemplo', { exact: true }).nth(0)),
    responsable: union(page.getByText('Responsable', { exact: true }), page.getByText('Ana Ejemplo', { exact: true }).nth(1)),
  });

  await page.locator('#reservation-purpose').fill(MOTIVO);
  await soltarFoco(page);
  await bajarAlFinal(page);
  const registrar = page.getByRole('button', { name: 'Registrar reserva' });
  await capturar(page, 'reserva-nueva-5', { avisos, guardar: registrar });

  // La ficha: el banner de registro y el jardín en el mapa.
  await registrar.click();
  await page.waitForURL(/\/reservas\/RES-/);
  const banner = page.getByText(/^Reserva RES-\d+ registrada para/);
  await banner.waitFor();
  await page.waitForTimeout(5000);
  await page.evaluate(() => window.scrollTo(0, 180));
  await page.waitForTimeout(800);
  await capturar(page, 'reserva-ficha', { banner, mapa: mapaDe(page) });

  // Al revés: el registro de un trabajo de mañana junto al jardín avisa de la reserva.
  await page.goto(`${BASE}/intervenciones/nueva`);
  const listas = page.locator('main select');
  await listas.nth(0).selectOption({ label: 'Mantenimiento de jardines' });
  await listas.nth(1).selectOption({ label: 'Deshierbo' });
  await page.locator('main input[type=date]').first().fill(manana);
  await page.getByRole('button', { name: 'Agregar ubicación' }).click();
  await page.locator('main select', { has: page.locator('option', { hasText: new RegExp(`^${seccion.nombre}$`) }) }).first().selectOption({ label: seccion.nombre });
  await soltarFoco(page);
  const aviso = page.getByText(new RegExp(`${JARDIN_RESERVADO} está reservado`)).first();
  await aviso.waitFor();
  await subir(page);
  await capturar(page, 'intervencion-aviso-reserva', { aviso });
  const crear = page.getByRole('button', { name: 'Crear intervención' });
  await crear.scrollIntoViewIfNeeded();
  await capturar(page, 'intervencion-aviso-reserva-pie', { guardar: crear });
}

// Programa principal: al final, para que las constantes de arriba ya existan.
const valor = (nombre: string) => {
  const i = process.argv.indexOf(`--${nombre}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const sesion = valor('sesion') ?? '';
if (!RAMAS[sesion]) throw new Error('Uso: npm run capturas:planificacion -- --sesion a|b');
const paso = valor('paso') ?? 'todo';

const commit = execFileSync('git', ['-C', `../../../.worktrees/video-${sesion}`, 'rev-parse', 'HEAD'], { encoding: 'utf-8' }).trim();

if (sesion === 'a' && paso !== 'capturas') await escenarioA();
if (sesion === 'b' && paso !== 'capturas') await escenarioB();

if (paso !== 'escenario') {
  const { capturar, guardar } = crearSesionDeCapturas(sesion);
  const navegador = await abrirNavegador();
  try {
    if (sesion === 'a') await capturasA(await nuevaPagina(navegador, COORDINADOR), capturar);
    if (sesion === 'b') await capturasB(await nuevaPagina(navegador, COORDINADOR), capturar);
  } finally {
    await navegador.close();
  }
  guardar({ rama: RAMAS[sesion], commit, fecha: new Date().toISOString() });
}
