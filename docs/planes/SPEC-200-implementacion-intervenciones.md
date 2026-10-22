# Plan de implementación de SPEC-200 — Intervenciones

Fecha: 22 oct 2026.

> **Actualización vigente:** el usuario confirmó aprobación final por coordinador, fotos
> obligatorias, capataz responsable por sector, una actividad multiubicación y primera web a
> Roobert. Reemplaza el estado de espera P-01/P-02/P-03/P-05 descrito históricamente abajo
> solo en esos puntos. Los detalles provisionales aceptados y los límites pendientes están
> en SPEC-200 §2.8. T05 revisión y T07 web se implementan en esta entrega; cobertura de
> frecuencias, relevo y asignación entre distintos sectores siguen fuera del alcance habilitado.
> Ver informe `SPEC-200-etapa-3-revision-y-web.md` para verificación final.

Resultado de esta revisión: backend 664 pruebas aprobadas, incluidas 59 de intervenciones;
frontend 82 suites/564 pruebas aprobadas, lint/build correctos. T07 permanece en verificación
por ausencia de navegador habilitado; no se declara completa la etapa 4 ni se migra la base de trabajo.

Fecha de la referencia histórica: 22 oct 2026. Estado: etapa 2 probada, T04, inicio/avance local de T05 y núcleo T06 implementados; el usuario decidió dejar
indicadores y obligatoriedad de fotos pendientes del cliente; posteriormente confirmó un
trabajo con varias ubicaciones y ejecución independiente por ubicación.
Fuente: [SPEC-200](../../specs/features/SPEC-200-intervenciones.md).
Este plan no es una aprobación del cliente ni significa que las tareas ya estén implementadas.

## 1. Alcance y punto de partida

El responsable de este trabajo implementa intervenciones. Incidencias no está implementado
en esta copia del repositorio y no se desarrollará como requisito previo. Su responsable
coordinará el contrato de SPEC-200 §3.6; no se crean sus tablas ni rutas en estas tareas.

Cambios existentes al preparar este plan: documentación de SPEC-200 y ajustes relacionados
en specs. Se conservan; no se descartan ni se incluyen automáticamente en un commit.
Al preparar el plan estaban V001–V021. La etapa 2 añadió V022, sin cambiar sus archivos;
el próximo número se verifica antes de otra migración, sin reservas.

Las seis etapas originales se mantienen. Cada tarea indica sus dependencias y qué resultado
permite revisarla; no se ejecutan todas simultáneamente ni se declara terminada una etapa
porque exista un archivo de diseño.

## 2. Registro de decisiones

### Base técnica del plan

- Crear, asignar, ejecutar y validar son permisos distintos, conforme a SPEC-001.
- Proponer PLANNED permite crear sin asignar; no concede asignación a ADMIN.
- Conservar autor real de ejecución, cuadrilla, cambios e intentos; no inferirlos del JWT histórico.
- Ubicación fuera de una sección es válida; no modificar geometrías ni inventar zonas.
- Evidencia anunciada y archivo recibido son estados distintos; reintentos no duplican fotos.
- Incidencias conserva su FK al trabajo y sus estados; completar/validar una intervención no
  resuelve automáticamente el problema reportado.
- Mantener interfaces de autenticación, respuestas API, catálogos, almacenamiento y frecuencias.

### Resultado de la consulta al usuario

El 22 oct 2026 el usuario eligió **dejar las tres políticas pendientes de confirmar con el
cliente**. Las opciones presentadas se conservan para preparar esa consulta; no están aprobadas.
Posteriormente confirmó P-04: varias ubicaciones del mismo trabajo, con avance, cantidad
ejecutada y estado propios. Ese cambio se registra en SPEC-200 §2.7. P-01/P-02 permanecen
pendientes; no aplicar valores por defecto para suplir sus respuestas.

| Tema | Propuesta presentada | Efecto sobre implementación | Estado |
|------|----------------------|-----------------------------|--------|
| P-01: momento de contar mantenimiento | Contar después de validar | Filtra las ejecuciones que alimentan indicadores | Pendiente del cliente por decisión del usuario |
| P-02: fotografía | Completar con subida pendiente; validar con al menos una foto recibida, sin cuota por momento | Define precondiciones de completar/validar y pruebas | Pendiente del cliente por decisión del usuario |
| P-04: varias ubicaciones | Un trabajo con varias ubicaciones y ejecución independiente en cada una | DDL/contratos normalizados a intervention_locations; estado, cantidades, autores y evidencia locales | Confirmado por el usuario; normalización documental completada |

P-01 también debe resolver unidad de cobertura/conteo: elegir estado de aceptación no permite
suponer que cada fila equivale a una cobertura completa del campus. Tampoco confirma quién
comunica el cierre de una incidencia, responsabilidad a coordinar con su módulo.

P-02 debe precisar si la existencia de otras fotos pendientes impide validar aunque haya una
recibida. No interpretar la opción propuesta como autorización para descartar esas pendientes.

P-03 (subsanación y relevo) conserva la propuesta de observar con motivo, corregir y volver
a validar sin borrar intentos. Su aplicación operativa y quién autoriza un relevo siguen por
confirmar; no implementar una transferencia que reescriba la autoría.

P-05 (priorización del MVP) permanece como coordinación de equipo. Desarrollar primero web
no elimina Android, recursos ni terceros del alcance global. No impide preparar el núcleo
de intervenciones, pero sí impide llamar a esa primera entrega «MVP completo aprobado».

## 3. Tareas por etapa

### Etapa 1 — Especificación y decisiones

**T01. Incorporar las respuestas operativas a SPEC-200.**

- Registrar elección, procedencia y asuntos aún abiertos, sin atribuirlos a las entrevistas.
- Ajustar conjuntamente decisiones, contratos JSON, DDL documental, flujos y criterios de aceptación.
- Aplicar la confirmación multiubicación de SPEC-200 §2.7: normalizar contratos y DDL a
  intervention_locations con avance/cantidad/estado propios, evidencia localizada y resumen
  derivado del trabajo; no volver a solicitar la cardinalidad ya confirmada.
- Especificar filtros sin duplicar intervenciones, autoría por lugar, cantidades por unidad y
  estado agregado sin completar el trabajo cuando solo terminó una ubicación. Cobertura de
  indicadores continúa pendiente en P-01, separada de esta normalización técnica.
- Revisar subsanación/relevo con una propuesta concreta, manteniendo los permisos de SPEC-001.
- Diferenciar lo que bloquea creación/esquema de lo que solo bloquea una integración posterior.

Salida: contratos y esquema multiubicación normalizados en SPEC-200 §§3–5, con lista de
decisiones confirmadas/pendientes. Estado: normalización documental completada. P-01/P-02/P-03
y coordinación P-05 siguen delimitando las funciones que requieren confirmación; no bloquean
definir la persistencia de trabajo/ubicaciones ya acordada.

La cabecera guarda planificación/asignación y una versión común; cada ubicación guarda
estado operativo, cantidades, intentos y autoría. El estado general y las fechas globales
son proyecciones de §5.2, no columnas duplicadas editables. FKs compuestas comprueban la
pertenencia de ubicaciones para fotos/eventos/elementos. Evidencia mínima/indicadores no
se activan por la definición de estas relaciones.

### Etapa 2 — Base de datos

**T02. Registrar el estado inicial y preparar pruebas de actualización.**

- Revisar `git status`, archivos de migración, versiones de herramientas y configuración de test.
- Registrar resultados del backend y frontend antes de cambios funcionales; conservar fallos
  preexistentes con su comando y contexto, sin presentarlos como resultados correctos.
- Preparar una base de pruebas aislada con esquema existente y registros representativos.
  Las pruebas no utilizan credenciales de producción ni ejecutan una limpieza de la base de uso.

Salida: referencia inicial reproducible. No exige todavía resolver cuotas de fotos ni indicadores.

Primera inspección del 22 oct 2026 (histórico, antes de preparar las dependencias):

| Comprobación | Resultado observado |
|--------------|--------------------|
| Java | Oracle Java 26 disponible; no se ha comprobado equivalencia completa con Temurin 26.0.2 de los specs |
| Maven | `mvn` no está en PATH; existe `backend/mvnw.cmd` con distribución 3.9.9. No se ejecutó todavía la suite backend |
| Node / npm | Node 22.19.0; npm 10.9.3 mediante `npm.cmd`. El script npm.ps1 está restringido por la política de PowerShell; no se modificó esa política |
| Dependencias frontend | Existe node_modules, pero no está disponible la guía `next/dist/docs` y `npm.cmd test -- --runInBand` termina porque no se encuentra `jest` |
| Docker | La consulta de versión del servidor no pudo acceder al daemon en este entorno; hubo además advertencia de acceso a configuración. No demuestra que el backend falle |
| Estado de código | Sin modificaciones funcionales de este trabajo; solo documentación |

**T02: entorno y referencia inicial completados posteriormente el mismo día.** Se ejecutó
npm ci sin cambiar el lockfile, se inició Docker Desktop y se usó Maven Wrapper con JAVA_HOME
del proceso en JDK 26. Resultado final: backend 589 pruebas aprobadas tras recompilación limpia;
frontend 80 suites/555 pruebas aprobadas, lint y build correctos. Los fallos iniciales de
exportación desaparecieron al regenerar clases, sin editar código ni tests.
Comandos, advertencias y límites en la [referencia de pruebas](SPEC-200-referencia-pruebas.md).
Las pruebas de T02 usaron PostGIS temporal como referencia previa. El ensayo de actualización
con V022 y datos representativos se realizó después en T03 y tiene su informe propio;
no se atribuye ese ensayo a las pruebas anteriores al cambio.

**T03. Crear y probar la migración aditiva del núcleo.** Depende de T01 (ubicaciones) y T02.

- Archivo nuevo bajo `backend/src/main/resources/db/migration/`, con el siguiente número libre.
- Crear cabecera interventions, intervention_locations, asociaciones por ubicación,
  evidencia localizada, eventos y submits conforme al DDL normalizado de SPEC-200 §4;
  sembrar solo catálogos necesarios ausentes. No copiar el DDL singular de SPEC-002/005.
- Comprobar FKs compuestas con IDs válidos de dos trabajos distintos y unicidad estable de
  referencias de ubicación/evidencia; validar al menos una ubicación activa en el servicio.
- No editar migraciones previas ni añadir tablas de incidencias/contratos. El mapeo JPA se
  implementa en T04, separado de estos tres pasos de base de datos.
- Usar MigrationNumberingTest/MigrationSmokeTest existentes y ampliar pruebas de actualización
  para comprobar conservación de usuarios, frecuencias, lugares, inventario y metadatos de fotos.

Salida completada: [V022](../../backend/src/main/resources/db/migration/V022__create_interventions.sql)
probada desde vacío y actualizando V021 con datos representativos; 51 comprobaciones de
migración aprobadas y suite completa de backend con 605 pruebas aprobadas. Detalle en el
[informe de etapa 2](SPEC-200-etapa-2-migracion.md). Los archivos V001–V021 conservan su SHA-256.
No se aplicó a la base de trabajo. Los escenarios que requieren servicios siguen pendientes.

### Etapa 3 — Backend

**T04. Consulta, planificación y asignación.** Depende de T03.

- DTO, repositorios, servicio y controller propios en `modules/interventions/`.
- Mapear entidades en `modules/interventions/entity/`, heredando BaseEntity y usando
  catálogos para estados/tipos, conforme al esquema V022 ya probado.
- Implementar listado/detalle/opciones, creación, edición, reprogramación con motivo y asignación.
- Resolver alcance con cuadrillas vigentes. Reutilizar datos existentes, pero verificar la
  diferencia entre pertenecer a una cuadrilla y supervisarla: no copiar UserScopeResolver
  sin revisar su consulta, que obtiene equipos mediante team_members.
- Validar clase/tipo y colección de ubicaciones/elementos; mantener IDs al editar/reordenar.
  Aplicar filtros de lugar mediante EXISTS y estado general calculado antes de paginar, sin
  duplicar trabajos cuando coincidan varias ubicaciones.
- Probar creación ADMIN sin permiso indirecto de asignación, supervisor de otra cuadrilla,
  operario ajeno, cuenta inactiva, reintento y conflicto de versiones.

Salida: trabajo planificable y asignable, con historial persistente y sin dependencia de incidencias.

Implementado en `modules/interventions/`: entidades de las seis tablas V022, repositorios,
servicio y API de consulta, opciones, creación, edición, reprogramación, asignación y
cancelación previa al inicio. Concurrencia serializada por cabecera y versión común;
creación idempotente durante 24 horas; bajas de ubicaciones sin reutilizar referencias.
T04 completado: 23 pruebas específicas y suite completa de backend con 628 pruebas
aprobadas, sin fallos, errores ni omitidas. El [informe de T04](SPEC-200-etapa-3-planificacion.md)
registra verificaciones y límites. La etapa 3 continúa con T05/T06; no se declara completa.

**T05. Ejecución, cantidades y revisión.** Depende de T04; las acciones afectadas por P-02/P-03
requieren resolverlas antes de exponerse.

- Registrar inicio, ejecutor real, avance, cantidades pedida/ejecutada y reporte descriptivo
  por ubicación mediante las rutas locales de SPEC-200 §3.1; no acciones de ejecución global.
- Implementar transiciones locales acordadas, validación por persona distinta del ejecutor
  de esa ubicación y observación con motivo. Calcular resumen/fechas según SPEC-200 §5.2.
- Mantener intentos anteriores; la corrección no elimina cantidades, autores ni fechas previas.
- Probar concurrencia, cumplimiento parcial, transición inválida y ausencia de cierre automático
  de incidencias. No inventar un endpoint de relevo con permisos sin definir.

Salida: flujo propio acordado, comprobable por roles y estados.

**T05 parcial implementado:** inicio desde ASSIGNED y guardado de avance en IN_PROGRESS
por ubicación, con ejecutor real, intento 1, permisos vigentes, versión común y eventos locales
STARTED/PROGRESS_SAVED atómicos. Supervisor y operario pueden ejecutar lugares distintos
sin editar la ejecución del otro. No incluye completar, validar, observar, reabrir ni relevar.
El [informe de inicio/avance](SPEC-200-etapa-3-inicio-avance.md) registra pruebas y límites.
Esta entrega reutiliza V022 y no necesita otra migración.
Verificación: 12 pruebas nuevas, 35 específicas aprobadas y suite backend completa de
640 pruebas aprobadas, sin fallos, errores ni omitidas. No se migró la base de trabajo.

**T06. Evidencia y recuperación de subidas.** Depende de T03/T04; política de validación depende de P-02.

- Anuncio con referencia estable y interventionLocationId, intento local, subida idempotente
  y lectura autorizada; no usar fotos de A como evidencia de B ni sustituir la FK por GPS.
- Reutilizar FileStorage y validación compartida; prefijo propio, sin cambios en fotos de especies/lugares.
- Controlar CORS de Idempotency-Key, archivos inválidos, subida fallida y compensación de objeto
  nuevo cuando falle la transacción. No borrar archivos de un reintento previamente exitoso.
- Probar foto pendiente/recibida, duplicados tras reinicio y carrera entre subir/completar/validar.

Salida: evidencia recuperable y visible con la política de negocio confirmada.

**Núcleo T06 implementado:** anuncio, recepción y lectura protegida del archivo por ubicación
e intento; reintentos con referencia permanente y hash de bytes originales. JPEG/PNG/WebP
decodificados localmente, límite compartido de 25 MB y compensación del objeto nuevo ante
rollback. Los enlaces de lectura no son públicos ni usan caché compartida. Se reutiliza V022,
sin otra migración ni aplicación a la base de trabajo. Resultados y límites en el
[informe de evidencia](SPEC-200-etapa-3-evidencia.md). Su relación con finalización/validación
sigue pendiente de P-02; no se exige una pareja de fotos ni se habilitan cargas en VALIDATED.
Verificación de T06: 16 pruebas nuevas, 51 específicas y suite completa de backend con
656 pruebas aprobadas, sin fallos, errores ni omitidas. La etapa 3 sigue parcial por T05.

### Etapa 4 — Interfaz web

**T07. Listado, detalle y captura para capataz.** Depende de contratos estables de T04–T06.

- Leer la guía pertinente de Next.js disponible en sus dependencias antes de escribir código,
  conforme a frontend/AGENTS.md; si no está disponible, resolver ese acceso primero.
- Crear rutas `(dashboard)/intervenciones`, cliente `interventions-api.ts` y componentes propios.
- Reutilizar sesión, catálogos, componentes base, sidebar y manejo de errores existentes.
- Ubicación mediante listas/búsquedas/coordenadas; no exigir mapa para registrar.
- Mostrar estados/avance/cantidades/fotos por lugar y resumen del trabajo, sin sumar unidades
  incompatibles ni convertir cantidades desconocidas en cero. Probar A completada/B en progreso/C asignada.
- Mostrar pendientes de fotos por ubicación, conflictos de versión común y reprogramación.
- Adaptar pruebas de navegación y agregar casos de interacción significativos; verificar flujo
  en navegador real con los cuatro roles, incluida renovación de sesión y preflight.

Salida: flujo web de intervenciones usable y revisable, sin enlaces que prometan incidencias inexistentes.

### Etapa 5 — Integraciones

**T08. Historial por ejemplar.** Depende de T04/T05/T07.

- Consultar mediante asociaciones de trabajo y filtro greenElementId, sin duplicar historial.
- Agregar enlace desde ficha de ejemplar sin alterar los contratos actuales del inventario.
- Probar alcance del lector y trabajo con varios elementos.

**T09. Historial real para frecuencias.** Depende de T05 y P-01 completo (estado y cobertura).

- Implementar ExecutionHistoryProvider con completed_at local, ID de trabajo/ubicación,
  fecha civil y modalidad acordada; decidir cobertura por P-01 antes de traducirlo a fechas.
- Corregir la referencia documental del código a `executed_at` al hacer esta integración.
- Verificar que el fallback ceda al proveedor real y que una sola implementación esté activa.
- Conservar fechas anteriores al intervalo necesarias para evaluar continuidad, y distinguir
  reintento duplicado de dos trabajos diferentes completados el mismo día.
- No contar trabajo propio como tercerizado ni cambiar FrequencyEvaluator para ocultar una
  definición de cobertura no resuelta. Mantener fallback hasta acordar la política.

**T10. Conexión futura con incidencias.** Contrato definido, integración pendiente del otro módulo.

- Entregar al responsable de incidencias el contrato SPEC-200 §3.6 con permisos, cardinalidad,
  creación/vínculo atómico, estados independientes y comportamiento ante cancelación.
- Proveer servicios de intervenciones que permitan el vínculo dentro de una transacción local.
- Probar el límite con dobles de prueba; no crear endpoints de incidencias ni FK inversa aquí.
- Habilitar operaciones reales únicamente cuando existan las tablas/servicios del otro módulo
  y se hayan comprobado en conjunto. Esta tarea no bloquea T03–T08.

Salida de etapa: historial e indicadores acordados; integración ausente declarada explícitamente.

### Etapa 6 — Android y publicación externa

**T11. Planificar entregas móviles y externas con el equipo.** Depende de P-05 y fuentes disponibles.

- Android: persistencia local real, cola de fotos y pendientes; no afirmar que una web adaptable
  garantiza guardado en teléfono sin red.
- Recursos: catálogo y consumo conforme a datos confirmados; el registro de insumos no equivale
  a inventar stock de herramientas. Mantenerlo visible en la planificación del MVP.
- Publicación: adaptador sustituible, reintentos y estado fuera de la transacción de registro;
  no habilitar destino hasta resolver P-14.
- Tercerizados: preservar la trazabilidad común prevista en SPEC-002 y coordinar contratos;
  no implementarlos como trabajo propio para eludir esa dependencia.

Salida: entregas explícitas por responsable, sin declarar concluido el alcance global por completar la web.

## 4. Verificación y entrega

Después de cada cambio funcional, ejecutar los checks afectados; al integrar el flujo, ejecutar
backend (`mvn test`) y frontend (`npm test -- --runInBand`, `npm run lint`, `npm run build`).
La comparación inicial no sustituye los checks finales. Registrar qué se ejecutó y cualquier
limitación del entorno; no afirmar éxito de pruebas que no se ejecutaron.

Antes de usar la migración en una base con datos de trabajo, verificar respaldo/restauración
en un entorno separado. Nunca usar `down -v`, Flyway clean/repair ni reescribir checksums para
resolver errores del módulo. Pruebas de integración operan en bases aisladas.

Entregar cambios revisables por tarea, sin publicar, desplegar, enviar mensajes al equipo ni
mezclar cambios ajenos automáticamente. El checklist final incluye login/refresh, usuarios,
catálogos, frecuencias, mapa, lugares, inventario y fotos existentes.

## 5. Secuencia actualizada

1. Incorporar confirmaciones a SPEC-200 y conciliar permiso exclusivo de COORDINADOR en SPEC-001.
2. Completar T05 revisión y reglas fotográficas de T06 reutilizando V022, con pruebas aisladas.
3. Implementar/verificar T07 web para Roobert: planificación, asignación, avances, fotos, cierre y revisión.
4. Mantener T09 esperando cobertura; no simular incidencias, relevo o asignación multisectorial.

Las propuestas de mínimos de fotos/corrección aceptadas para avanzar permanecen identificadas
como provisionales; modificar la política de fotos no altera el esquema. No aplicar migraciones
a la base de trabajo ni desplegar por haber completado los cambios de código.
