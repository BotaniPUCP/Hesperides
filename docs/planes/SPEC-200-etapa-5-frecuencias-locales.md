# SPEC-200 — T09: frecuencias por lugar con ejecución y aprobación

Fecha: 29 oct 2026. Estado: implementación local probada automáticamente; revisión visual
pendiente. No se declara completa toda la etapa 5 ni se modifica la base de trabajo.

## Decisiones vigentes

La respuesta más reciente del usuario reemplaza la espera anterior de P-01:

- Al atender y aprobar tres jardines se actualizan solo los atendidos.
- Se usan ambas fechas: la real y la de aprobación.
- Sigue siendo necesaria la aprobación final del coordinador de todas las ubicaciones activas.

Aplicación: la fecha física mide intervalos/cuotas; la aprobación determina aceptación y queda
visible junto a la ejecución. Son dos hechos de una misma ocurrencia, no dos mantenimientos.
Se conserva además la validación local original. La aprobación final del trabajo se deriva
de la última validación local cuando todas están VALIDATED.

## Implementación

`InterventionExecutionHistoryProvider` sustituye al fallback como único proveedor registrado.
La extensión por defecto de ExecutionHistoryProvider conserva compatibilidad con proveedores
de fechas/lambdas anteriores. La consulta real solo aporta hechos IN_HOUSE y comprueba el
usuario/rol vigente: ADMIN/C ven los autorizados globalmente, S las cuadrillas supervisadas
y O las intervenciones asignadas. No expone historial ajeno por consultar frecuencias.

Cada hecho conserva trabajo, código, ubicación, intento, lugar/sección, completedAt,
validatedAt local, approvedAt final, executionDate y approvalDate. La fecha civil utiliza
`MAINTENANCE_TIME_ZONE` (America/Lima por defecto); los timestamps existentes permanecen UTC.
No se crea ni modifica una tabla ni una migración.

La referencia más precisa disponible identifica el objetivo: PLACE si se registra lugar;
en otro caso ZONE si hay sección explícita. No se agrupan sitios distintos por fecha, equipo
o clase. Sin referencia estable de lugar/sección, el historial conserva el hecho pero el
veredicto es NOT_APPLICABLE; no se inventa una zona a partir de puntos o ejemplares.

Para el mismo trabajo/objetivo, varias unidades locales cuentan una vez en la última fecha
real de esas unidades. Dos trabajos distintos el mismo día siguen siendo dos ocurrencias.
El corte de periodo se aplica después de recoger todas las piezas de ese trabajo/objetivo,
evitando contar una fracción como trabajo terminado antes de su última ejecución local.
Se conservan ejecuciones anteriores al inicio para evaluar continuidad.

La consulta es retrospectiva según aprobaciones guardadas actualmente: si se ejecutó el lunes
y se aprobó el jueves, una consulta posterior puede mostrar el hecho el lunes, con aprobación
del jueves visible. No simula un informe «lo que se sabía el lunes» ni añade una fecha asOf.

## Contrato de cumplimiento y pantalla

`GET /maintenance/frequencies/compliance` conserva ruta, parámetros y campos existentes;
añade `locations`, cada una con objetivo, historial de hechos y segmentos del motor.
El segmento general IN_HOUSE no declara ON_TARGET/OVERDUE de todo el campus a partir de
trabajos locales: indica que se deben consultar los resultados por lugar.

CAMPUS_WIDE aplica el mismo calendario a cada objetivo atendido de forma independiente.
BY_ZONE selecciona la referencia de sección explícita del trabajo. Se filtran versiones
de reglas por régimen, scope y zoneId, evitando evaluar con versiones de otro territorio.
No se cambia el motor puro de frecuencias para ocultar diferencias espaciales.

BY_SECTOR no produce un resultado territorial automático: requiere correspondencia histórica
fiable de secciones/sectores, aún no implementada. Tampoco se deduce un 100% de cobertura de
campus o sector de una sola atención. OUTSOURCED mantiene su ausencia de proveedor propio;
no se reutiliza el trabajo del personal propio como ejecución tercerizada.

La pantalla de frecuencias incorpora consulta explícita por periodo, resultados por lugar,
ambas fechas y enlace al trabajo. No hace consultas nuevas al abrir el catálogo ni modifica
configuraciones. Los resultados representan lo visible para la cuenta, no todo el historial
oculto de otros equipos. T08 y esta ampliación requieren comprobación visual posterior.

## Verificación

Se agregan pruebas de proveedor único, aprobación parcial/final, ambas fechas y cambio de día
UTC/Lima, continuidad, corte de piezas del mismo objetivo, baja lógica, privacidad por equipo,
rol actual, agrupación por actividad/objetivo, dos trabajos el mismo día, alcance BY_ZONE,
límites de BY_SECTOR, compatibilidad del contrato anterior y respuesta HTTP completa.

La primera ejecución detectó dos errores de preparación de los tests: MockMvc limpia el
SecurityContext del hilo después de cada petición y dos llamadas directas al proveedor no
restablecían identidad. Se corrigió el fixture; no se retiró la autorización del proveedor.
El intento posterior sin limpiar encontró siete errores de clases compiladas incompatibles
en target; la recompilación limpia final con JDK 26 resolvió ese problema sin reducir pruebas.

Resultado final:

- Backend: `mvnw.cmd -B clean test`, **675 pruebas aprobadas**, 0 fallos, 0 errores, 0
  omitidas; BUILD SUCCESS y salida 0. Incluye 66 de intervenciones y 4 del lector local.
- Frontend: **84 suites / 574 pruebas aprobadas**, salida 0. Incluye tres pruebas del nuevo
  panel para ambas fechas, intervalo inválido y error de consulta.
- Lint y build frontend correctos, salida 0; build incluye comprobación TypeScript.
- `docker compose config --quiet` correcto con valores ficticios de validación para variables
  obligatorias; no levanta servicios ni usa esas credenciales en una base de datos.
- `git diff --check` correcto. Se conservan avisos conocidos de Hikari/Surefire en cierre de
  contenedores y de act en pruebas existentes; el proceso final termina correctamente.

Logs en `%TEMP%`: `hesperides-t09-final-backend-tests.log` (resultado final),
`hesperides-t09-backend-tests.log`, `hesperides-t09-targeted-tests.log` (intentos previos),
`hesperides-t09-frontend-tests.log`, `hesperides-t09-frontend-lint.log`,
`hesperides-t09-frontend-build.log`. Las bases de integración son desechables.

## Próximos pasos

Revisar visualmente T08 y la consulta local cuando el usuario tenga tiempo; mantenerlo
visible como pendiente en el PR. Coordinar la integración con incidencias usando la revisión
de contrato, particularmente su colisión de V022 y su modelo de Intervention paralelo.
No se han hecho commits, push, merge ni despliegue desde esta entrega.

Preparación adicional para revisión (29 oct 2026): el empaquetado con
`mvnw.cmd -B -DskipTests verify` terminó correctamente y generó JAR ejecutable e informe
JaCoCo de la suite previa. No se ejecutaron pruebas nuevas en ese comando, no se inició
la aplicación y no se usó una base de trabajo. Log: `%TEMP%/hesperides-pre-pr-verify.log`.
