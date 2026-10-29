# SPEC-200 — Registro y ejecución de intervenciones

| Campo | Valor |
|-------|-------|
| HU relacionada | Pendiente de vincular en GitHub Projects |
| Autor | Propuesta elaborada con Codex para revisión del equipo |
| Estado | En progreso: V022, planificación/asignación, ejecución, evidencia y revisión por ubicación implementadas; web incremental en verificación |
| Fecha | 22 oct 2026 |
| Revisión | Ejecución multiubicación normalizada en contratos y esquema; evidencias de actas 004, 009 y 010 |
| Plataforma | Web; contrato de evidencias preparado para un futuro cliente Android |
| Sprint | S2, sujeto a planificación del equipo |
| Dependencias | SPEC-001, SPEC-002 §4.6, SPEC-003, SPEC-004, SPEC-005, SPEC-101, SPEC-102, SPEC-C01, SPEC-C02, SPEC-C03 |

> Lectura obligatoria: [REGLAS.md](../REGLAS.md). Este documento propone la primera entrega
> de intervenciones. Sus decisiones nuevas se identifican como propuestas, no como requisitos
> confirmados por el cliente. No autoriza cambios en código ni en bases existentes.
>
> El DDL implementado se referencia desde §4. El backend implementa las rutas de consulta,
> opciones, creación, edición, asignación, cancelación, inicio/avance y anuncio/subida/lectura
> de evidencia por ubicación de §3.1. Las rutas locales de finalización, observación, reapertura y aprobación están implementadas.
> La integración con incidencias y el proveedor real de frecuencias siguen pendientes. Las referencias
> antiguas a «SPEC-2XX de intervenciones» corresponden ahora a este documento.

## 1. Objetivo

Registrar, asignar y dar seguimiento a trabajos del personal propio, conservando avances,
recursos, evidencia e historial por elemento y el vínculo con las incidencias que atiendan,
sin alterar los datos ni los contratos de los módulos existentes.

## 2. Contexto

### 2.1 Backend

Paquete nuevo: `pe.edu.pucp.hesperides.modules.interventions`, con entidades, repositorios,
DTO, `InterventionsService` / `InterventionsServiceImpl` y `InterventionsController`.
V022 define las seis tablas del núcleo y sus catálogos; se prueba exclusivamente en bases
temporales. Las entregas T04–T06 incorporan entidades JPA y API; la interfaz web T07 se verifica en esta revisión.
Se reutilizan usuarios, `teams` / `team_members`, taxonomía clase → tipo, zonas, ejemplares
y almacenamiento de fotos existentes. No se ha migrado la base de trabajo.

**Estado verificado de incidencias en esta copia del repositorio (22 oct 2026):** no hay
paquete de backend, entidades/controladores, migración que cree `incidents`, rutas de pantalla
ni entrada de navegación de incidencias. La comprobación original se hizo con V001–V021; la nueva V022 tampoco crea incidencias. La llamada
a `/incidents` en `frontend/src/lib/__tests__/api-refresh.test.ts` usa `fetch` simulado y prueba
refresh de sesión, no una API real de incidencias. El DDL de SPEC-002 §4.8 es diseño pendiente,
no prueba de implementación. Esta comprobación no describe otras ramas ni bases desplegadas.

Reutilizar `shared/storage/FileStorage` y los validadores de fotos compatibles; las nuevas
claves se guardan bajo un prefijo propio `interventions/`. No reutilizar filas de fotos de
especies, lugares o ejemplares para representar evidencia de trabajo.

La integración con frecuencias implementa
`modules/maintenance/service/ExecutionHistoryProvider`, sustituyendo su fallback vacío.
`LocationDescriptionService` aporta la descripción por posición cuando se registre un punto;
no se modifican las geometrías de zonas, lugares ni ejemplares desde este módulo.

### 2.2 Frontend web

Rutas nuevas bajo `frontend/src/app/(dashboard)/intervenciones/`:
`/intervenciones`, `/intervenciones/nueva` y `/intervenciones/[id]`.
Componentes propios en `frontend/src/components/interventions/`: listado, formulario,
detalle, acciones de ejecución, evidencias e historial.
Cliente tipado `frontend/src/lib/interventions-api.ts`, a través de `lib/api.ts`.
Reutilizar `useCatalog`, autenticación, `Button`, `Input`, `Select`, `Modal`,
`DataTableCards`, `StatusBadge`, `EmptyState`, `LoadingSkeleton` y toasts existentes.
Añadir un grupo en `lib/navigation.ts` conforme a la matriz de permisos, sin rehacer AppShell.

### 2.3 Móvil y límites de la primera entrega

La web será adaptable a pantallas pequeñas, pero no sustituye la garantía Android de guardar
fotos siempre en el teléfono. La app, su cola local, almacenamiento sin red e indicador de
pendientes necesitan una entrega móvil propia. El servidor sí admite anuncio y subida posterior.

El usuario operativo prioritario es el capataz/jefe de grupo (E1, acuerdo 3; E2, acuerdo 10).
La propuesta técnica lo corresponde con SUPERVISOR, sujeto a validar el mapeo de personas a
roles; no exige que todos los operarios tengan cuenta ni crea un rol nuevo. Mantiene la matriz
de SPEC-001. Registrar avances y evidencia de su cuadrilla debe ser posible para ese usuario.

El usuario confirmó con su grupo que la primera entrega es una web para Roobert (§2.8). Es incremental. Android, consumo de
recursos y trazabilidad de tercerizados son necesidades expresadas en entrevistas; separarlas
en entregas técnicas no equivale a haber aprobado su exclusión del MVP. La prioridad web queda confirmada; esto no elimina Android, recursos ni terceros del alcance global.

La implementación de incidencias y contratos se realiza en sus propios módulos; su contrato
con intervenciones queda definido desde ahora en §3.6. No se crean tablas ficticias ni se consulta
`incidents` antes de que exista. La integración solo se habilita cuando estén implementados
ambos módulos y su operación transaccional conjunta; sin ella, el registro rutinario sí funciona.

Generación/adjunto de ficha técnica, importación del Excel y adaptador de publicación externa
son entregas adicionales. La falta de integración externa se muestra como «No configurada»,
nunca como publicación exitosa. La agenda no generará trabajo automáticamente desde frecuencias.

### 2.4 Restricciones técnicas

Usar las dependencias actuales, sin introducir otra biblioteca de formularios, mapas, seguridad
o almacenamiento. No cambiar Docker, el login, los endpoints existentes ni el esquema de frecuencias.
La nueva API comprueba pertenencia y vigencia de cada FK; un ID existente de otro catálogo es inválido.
Los valores inactivos siguen resolviendo en el historial, pero no se ofrecen para nuevas selecciones.

### 2.5 Decisiones y conciliación de specs

| ID | Decisión propuesta y motivo |
|----|----------------------------|
| D-01 | La matriz de SPEC-001 Anexo A gobierna los permisos (INV-5). El operario ejecuta trabajos asignados; no crea la planificación. Esto precisa el relato de SPEC-005 §5.1, que lo mostraba abriendo el registro. |
| D-02 | Añadir estado de sistema `PLANNED` («Planificada»): ADMIN puede crear/editar, pero no asignar. Crear no obliga a concederle indirectamente permiso de asignación. No se ofrece `DRAFT` paralelo. |
| D-03 | Conservar asignación y `team_id` en la intervención, y ejecutor/validador reales por ubicación. El asignado y quien ejecutó pueden ser distintos si ejecuta el supervisor. No atribuir un autor global a lugares ejecutados por personas distintas ni inferirlo de membresía actual. |
| D-04 | Clase obligatoria y tipo nulable únicamente si esa clase no tiene tipos activos. Si los tiene, exigir uno de sus hijos activos. Los tipos provisionales existentes no se reemplazan ni se presentan como confirmados. |
| D-05 | Confirmado por el usuario para este desarrollo: una intervención puede tener varias ubicaciones, cada una con avance, cantidad ejecutada y estado propios. Usar unidades de ejecución por ubicación según §2.7, sin dividir el trabajo en intervenciones independientes. P-04 queda resuelta con procedencia de esta conversación, no de las actas. No añadir `zone_id` a `green_elements`. |
| D-06 | Confirmación posterior del usuario: el trabajo cuenta únicamente después de la aprobación final del COORDINADOR. `approvedForCounting` es verdadero solo cuando todas las ubicaciones activas están VALIDATED: una actividad, no una por jardín. Conservar `completed_at` local como fecha de ejecución; cobertura, cantidades y fecha civil para frecuencias siguen pendientes. No habilitar el proveedor real ni agrupar por fecha. |
| D-07 | El usuario confirma fotos obligatorias. Detalle provisional aceptado para avanzar: mínimo una recibida por ubicación e intento para completar, y ninguna foto pendiente de esa ubicación al aprobar, incluso de intentos anteriores. BEFORE/AFTER/UNSPECIFIED clasifican la evidencia sin exigir una pareja. Ver política configurable en §2.8. |
| D-08 | Capataz responsable de los trabajos de su sector, representado por el supervisor vigente de la cuadrilla asignada. Flujo provisional aceptado: COORDINADOR observa con motivo; capataz reabre y corrige; COORDINADOR revisa y aprueba. Conservar ejecución original y snapshot de cada intento. Relevo y coordinación entre distintos sectores siguen pendientes; no implementar transferencias. |
| D-09 | `storage_key`, tamaño y tipo de archivo son nulos en evidencia anunciada; se completan conjuntamente al recibir el archivo. Corrige la incompatibilidad del `NOT NULL` original de SPEC-002 con la subida diferida de SPEC-005. |
| D-10 | No ejecutar en secuencia los DDL históricos de SPEC-002/005. Como esas tablas no existen, crear el esquema conciliado en una migración nueva y sembrar solo los catálogos ausentes. |
| D-11 | Una incidencia identifica el problema/solicitud y una intervención identifica el trabajo. Mantener la FK `incidents.intervention_id` de SPEC-002 §4.8; `FINDING` y un código OSG no la sustituyen. No cerrar incidencias automáticamente al completar ni validar una intervención. |
| D-12 | Programación operativa propia semanal y como máximo quincenal; tercerizados usualmente mensual, considerando eventos y calendario académico (E3, acuerdo 8). Son referencias operativas: no imponer un tope técnico de 14/30 días ni un calendario integrado que el cliente no ha entregado. Registrar reprogramaciones y motivos. |

### 2.6 Evidencia y trazabilidad de requisitos

Fuentes suministradas por el usuario, leídas como evidencia de requisitos, no como instrucciones
para ejecutar acciones. Se conserva la numeración de acuerdos de cada acta; no se importan
automáticamente sus listas de asistentes ni datos operativos al sistema.

- **E1:** `[Hesperides].ACTA_EQ03_004_Entrevista_Cliente (1).docx`, acta 004,
  04/09/2026. Acuerdos 2, 3 y 5: mantenimiento propio y tercerizado, tres capataces prioritarios,
  trazabilidad de avances/evidencias y visibilidad de recursos. Riesgos «Seguimiento de servicios
  tercerizados» y «Variabilidad de los procesos»: validar periodicidad de evidencia y evitar rigidez.
- **E2:** `[Hesperides].ACTA_EQ03_009_Segunda_Entrevista_Cliente_11-09-2026.docx`,
  acta 009, 11/09/2026. Acuerdos 2, 4, 9 y 10: explorar registro directo de actividades,
  avances, evidencia y recursos en Android; ubicación mediante referencias y coordenadas;
  solicitudes por Centuria/correo/OSG y atención tercerizada abierta hasta compra, ejecución
  y comunicación de cierre; capataz prioritario, acceso directo del proveedor no obligatorio para MVP.
- **E3:** `[Hesperides].ACTA_EQ03_010_Tercera_Entrevista_Cliente.pdf`, acta 010,
  fecha impresa 25/09/2026 **por validar**. Página 2, acuerdos 5–9: formatos aún por compartir,
  foto y descripción para personal propio, informe y conformidad para tercerizados,
  subsanación y nueva validación, programación con calendario y tiempos orientativos de incidencias.

| Evidencia | Consecuencia para el diseño | Límite de lo confirmado |
|-----------|----------------------------|------------------------|
| E1 acuerdos 2–3; E2 acuerdos 2 y 10 | Priorizar captura por capataz, con avances, fotos y recursos; distinguir personal propio/tercerizado | No aprueba posponer estos objetivos fuera del MVP ni da permisos nuevos al rol OPERARIO |
| E2 acuerdo 4; E3 acuerdo 2 | Admitir referencias reconocibles y coordenadas; conservar cuadrilla y ubicación histórica | No confirma una sola zona por intervención ni permite inventar ubicación fuera de un polígono |
| E2 acuerdo 9; E3 acuerdos 6–7 | Enlace incidencia → trabajo; cierre tercerizado con conformidad y comunicación; subsanar observaciones | No define responsables exactos de cierre ni obliga a cerrar la incidencia al completar el trabajo |
| E3 acuerdo 6 | Capturar foto y descripción, diferenciando recibido/pendiente | No fija cantidad mínima ni una foto obligatoria en cada momento; BEFORE/AFTER sigue como clasificación de SPEC-005 |
| E3 acuerdos 8–9 | Programación reprogramable por calendario; distinguir atención simple y tercerizada | Mismo día/48 horas o varias semanas son referencias, no SLA ni vencimientos automáticos aprobados |
| E1 riesgo «Variabilidad» | Evitar bloqueos por supuestos no validados; reconocer correcciones y cambios de programación | No elimina controles de permisos, integridad ni trazabilidad |

Las actas no cierran P-10 (tipos confirmados), campos del checklist ni P-14 (fuentes y escritura
del mapa externo). Tampoco confirman por sí mismas todos los detalles de cola offline que ya
exigen SPEC-002/005; esos requisitos se conservan sin atribuirlos a estos resúmenes de entrevistas.

### 2.7 Revisión confirmada: ejecución independiente por ubicación

El usuario precisó que una intervención en tres ubicaciones sigue siendo **una intervención**,
y que cada ubicación tiene **avance, cantidad ejecutada y estado independientes**. Esto
reemplaza el supuesto anterior de cantidades/ejecución globales y el límite de una ubicación.

Los contratos de §3 y el DDL de §4 ya están normalizados a esta decisión. No conservan
una ejecución, ubicación o cantidad global editables que compitan con las entidades hijas.

| Nivel | Información y responsabilidad |
|-------|--------------------------------|
| Intervención | Identidad del trabajo, clase/tipo, origen, planificación y asignación conforme a los permisos existentes; resumen de sus ubicaciones |
| Ubicación de intervención | ID estable, referencias a sección/lugar/punto/ejemplares, unidad, cantidad pedida, avance, cantidad ejecutada, estado, notas, fechas y autores de ejecución/revisión |
| Evidencia | Pertenece al trabajo y señala la ubicación concreta que documenta; GPS de captura y elemento específico son metadatos adicionales |

La propuesta técnica es `intervention_locations` como entidad hija. Cada elemento afectado
se asocia a la unidad de ejecución correspondiente, manteniendo el historial consultable por
intervención sin duplicarla si el elemento aparece en varias unidades. Las fotos incorporan
`intervention_location_id`; el servidor comprueba que ese ID pertenece al trabajo solicitado
y que el elemento opcional corresponde a esa ubicación. No atribuir una foto del jardín A a B
por estar ambas dentro de la misma intervención. Esta asociación refleja la aclaración del
usuario de que las fotos documentan lugares específicos; no impone una cuota ni un momento.

Iniciar, guardar avance, completar, observar y validar deben identificar la ubicación afectada.
Completar A no completa B/C. La autoría y la prohibición de validar ejecución propia se evalúan
en esa unidad; el historial conserva el lugar de cada acción. No se presume que las ubicaciones
necesiten asignaciones distintas: eso no fue solicitado y se conserva la asignación del trabajo.

Propuesta de resumen para interfaz: mostrar estados de cada ubicación y contadores de
completadas/total, sin declarar completada toda la intervención mientras queden ubicaciones
pendientes. La regla del estado agregado está definida en §5.2; no
permite cambiar estados locales por editar el resumen. Las cantidades solo se suman entre
unidades compatibles, y un conteo de ubicaciones terminadas no equivale automáticamente a
porcentaje de cantidad ejecutada ni a cobertura de mantenimiento. P-01 sigue abierta.

La futura integración con incidencias sigue enlazando el trabajo completo mediante
`incidents.intervention_id`; no se transforma cada ubicación en una incidencia ni se cierra
la solicitud al completar una de ellas. El DTO anidado de creación desde incidencias debe
adoptar la colección de ubicaciones de la revisión, sin mantener la forma singular histórica.

La normalización documental comprende DTO, endpoints locales, DDL, eventos, estados
agregados, contrato con incidencias y criterios de aceptación. El ejemplo de A completada,
B en progreso y C asignada está definido en §5.2. No se requiere otra respuesta sobre
cardinalidad; P-01/P-02/P-03 conservan las dependencias operativas correspondientes.

### 2.8 Confirmaciones del grupo y reglas provisionales de esta entrega

Procedencia: respuestas del usuario tras consultar a sus compañeros, 22 oct 2026. No se
atribuyen estas confirmaciones a las actas E1–E3. La instrucción posterior «realiza los
cambios» autoriza implementar la propuesta incremental; sus detalles provisionales no se
presentan como nuevos acuerdos directos del cliente.

| Tema | Confirmado por el usuario | Aplicación en esta entrega |
|------|--------------------------|---------------------------|
| Indicadores | Cuenta después de la aprobación final del coordinador | `approvedForCounting` derivado de todas las ubicaciones VALIDATED. Una intervención sigue siendo una actividad. No mide cobertura ni alimenta todavía el proveedor de frecuencias. |
| Fotos | Son obligatorias | Regla provisional: una foto recibida por ubicación e intento para completar; aprobar requiere una recibida del intento vigente y cero pendientes de esa ubicación, incluidos intentos anteriores. Sin pareja antes/después. |
| Responsable | Capataz asignado al sector | Supervisor vigente de la cuadrilla asignada puede reportar, aportar fotos y completar sin reemplazar al ejecutor original; actor real de cada acción queda en eventos. |
| Ubicaciones | Varios jardines son una actividad | Se conserva cabecera única y ejecución local independiente. |
| Entrega | Primera entrega web a Roobert | Prioridad T07; Android, recursos y terceros mantienen su planificación posterior. |

Detalles provisionales aceptados para avanzar: coordinador observa una ubicación COMPLETED
con motivo; capataz responsable reabre OBSERVED e incrementa intento. El snapshot anterior
conserva cantidades, notas, fechas, rechazo y autoría; las fotos siguen en su intento original.
La reapertura limpia resultados del intento activo sin transferir el ejecutor ni eliminar historia.
El capataz y el ejecutor original vigente pueden reportar el intento; solo el capataz reabre.
No se permite reabrir/observar VALIDATED mientras no se acuerde revocación de aprobación.

`InterventionReviewPolicy` aísla los detalles de fotos. Las variables
`INTERVENTIONS_REQUIRE_PHOTO_ON_COMPLETION` y `INTERVENTIONS_BLOCK_PENDING_ON_APPROVAL`
son true por defecto; cambiar la primera aplaza la exigencia hasta aprobar, nunca permite
aprobar sin foto. Una modificación posterior no requiere cambiar V022 ni reatribuir fotos.
El mínimo por ubicación/intento permanece explícito en esa política, sin dispersarlo por UI.

La actividad obtiene aprobación final al quedar todas sus ubicaciones VALIDATED por
COORDINADOR; el resumen deriva `validatedAt` del último acto local. La validación parcial
no habilita el conteo de actividad. No se concede aprobación a SUPERVISOR ni ADMIN.
Se impide autoaprobación también cuando un autor de reportes/fotos cambia de rol.
Terminar/aprobar no cierra incidencias ni publica información externamente.

Límites que requieren coordinación: cobertura para frecuencias; autoridad de relevo;
actividad que cruce sectores. El modelo actual tiene una cuadrilla por actividad; no puede
atribuir distintos capataces por ubicación. No inventar la correspondencia sector/cuadrilla
ni dividir una actividad automáticamente: ese caso requiere contrato y migración posteriores.
La primera web permite registrar varias ubicaciones con esa asignación común y muestra el
capataz responsable disponible; no se declara resuelta la asignación multisectorial.

## 3. Contratos de API

Los contratos siguientes sustituyen íntegramente el borrador singular: las operaciones de
ejecución y revisión requieren `locationId`. La planificación y la asignación siguen siendo
comunes al trabajo; no se ha solicitado asignación distinta por lugar.

### 3.1 Rutas, permisos y tipos comunes

Prefijo: `/api/v1`. C = COORDINADOR; S = SUPERVISOR; O = OPERARIO.
Lectura: ADMIN/C sobre todos los trabajos; S en las cuadrillas que supervisa actualmente;
O solo en trabajos asignados a su usuario. El servicio comprueba membresía/cuentas activas
en cada petición y aplica alcance antes de filtrar, calcular resúmenes y paginar.
ID fuera de alcance → 404; acción prohibida sobre recurso visible → 403.
Un `locationId` que pertenece a otro trabajo → 404 aunque el usuario vea ambos.

| Endpoint | Autorización | Resultado |
|----------|--------------|-----------|
| `GET /interventions` | Lectura | `Page<InterventionSummary>`, según SPEC-C03 |
| `GET /interventions/{id}` | Lectura | Detalle con todas las ubicaciones activas autorizadas, fotos e historial |
| `GET /interventions/options` | Lectura | Catálogos/referencias espaciales; cuadrillas solo ADMIN/C/S y según alcance; no crea maestros |
| `POST /interventions` | ADMIN/C | Crea cabecera y ubicaciones en PLANNED; 201 y Location; Idempotency-Key obligatorio |
| `PUT /interventions/{id}` | ADMIN/C | Edita planificación y ubicaciones antes de cualquier ejecución; 200 |
| `POST /interventions/{id}/assign` | C / S en su cuadrilla | Asigna/reasigna el trabajo antes de iniciarse cualquier ubicación; 200 |
| `POST /interventions/{id}/cancel` | ADMIN/C | Cancela todo el trabajo antes de cualquier inicio, con motivo; 200 |
| `POST /interventions/{id}/locations/{locationId}/start` | S en su cuadrilla / O asignado | Inicia esa ubicación; solo inicio desde ASSIGNED; corrección por ruta /reopen; 200 |
| `PUT /interventions/{id}/locations/{locationId}/execution` | Ejecutor o capataz responsable vigente | Guarda avance local en IN_PROGRESS; 200 |
| `POST /interventions/{id}/locations/{locationId}/complete` | Ejecutor o capataz responsable vigente | Completa con reporte, cantidad cuando hay unidad y foto recibida del intento vigente; 200 |
| `POST /interventions/{id}/locations/{locationId}/validate` | Solo C, sin autoaprobación | Valida ubicación COMPLETED con evidencia y sin pendientes; 200 |
| `POST /interventions/{id}/locations/{locationId}/observe` | Solo C | Observa ubicación COMPLETED con motivo; 200 |
| `POST /interventions/{id}/locations/{locationId}/reopen` | S responsable vigente | OBSERVED → IN_PROGRESS con nuevo intento; body `{version}`; 200 |
| `POST /interventions/{id}/evidences` | Ejecutor o capataz responsable vigente | Anuncia foto de la ubicación indicada; 201; Idempotency-Key obligatorio |
| `PUT /interventions/{id}/evidences/{evidenceId}/file` | Autor con acceso vigente | Recibe archivo pendiente de una ubicación IN_PROGRESS/COMPLETED; no se habilita subida nueva en VALIDATED/OBSERVED; 200 |
| `GET /interventions/{id}/evidences/{evidenceId}/file` | Lectura | Foto recibida autorizada; pendiente → 409 |

La ejecución y carga de evidencia requieren además rol SUPERVISOR/OPERARIO vigente;
ser el autor anterior no mantiene esos permisos si su cuenta/rol ya no lo permite.
No cambiar permisos globales del proyecto para exponer estas rutas.

No se implementan `/interventions/{id}/start`, `/execution`, `/complete`, `/validate`
ni `/observe` globales: no deben sobrescribir la ejecución de todos los lugares.
Las acciones devuelven el detalle actualizado, salvo anuncio/subida, que devuelven evidencia
y versión de la intervención. Las reglas confirmadas y provisionales vigentes están en §2.8.
Options agrega `catalogs` con id/code/label/typeCode/parentItemId y `places`/`zones` con id/name
para resolver los IDs del contrato propio sin alterar la API compartida de catálogos basada en codes.
OPERARIO recibe esas referencias y `teams: []`; los demás conservan alcance de cuadrillas.
Detalle incluye `responsibleSupervisorUserId`, `allowedActions` por ubicación y `canUpload` por foto;
son ayudas de presentación: el servicio vuelve a comprobar permisos y estado en cada operación.

Listado: filtros `statusCode` (resumen calculado), `locationStatusCode`, `classItemId`,
`typeItemId`, `zoneId`, `placeId`, `greenElementId`, `teamId`, `assignedToUserId`,
`dateFrom`, `dateTo`. `incidentId` solo cuando esté habilitada §3.6.
Los filtros de zona/lugar/elemento/estado local deben cumplirse en una misma ubicación
si se combinan. Usar EXISTS o consulta equivalente: una coincidencia en tres ubicaciones
no produce tres filas de intervención. Orden por defecto `scheduledDate,desc` y `id,desc`
como desempate; los campos permitidos para ordenar son `scheduledDate`, `code`, `createdAt`
e `id`. No paginar primero y recalcular estado después.

En options, C ve cuadrillas activas; S solo las de su `supervisor_user_id`.
Candidatos: supervisor o miembros activos de esa cuadrilla, cuenta activa y rol de ejecución.
S no mueve trabajo de otra cuadrilla a la suya. ADMIN puede planificar pero no asignar.
Options devuelve:
~~~json
{"teams":[{"id":4,"name":"Cuadrilla existente","assignees":[{"id":20,"fullName":"Persona existente"}]}]}
~~~

Los JSON de esta sección son cuerpos de petición o `data`; se aplica el sobre común.
IDs ilustrativos, no semillas. Instantes ISO-8601 UTC; fechas civiles YYYY-MM-DD.
Cantidades decimales no negativas con hasta tres decimales; no se convierten unidades implícitamente.

### 3.2 Creación y edición de planificación

~~~json
{
  "classItemId":12,
  "typeItemId":30,
  "scheduledDate":"2026-10-23",
  "description":"Poda de formación en tres jardines",
  "originItemId":60,
  "reportedByItemId":61,
  "externalCode":null,
  "requestedAt":null,
  "locations":[
    {"clientReference":"11111111-1111-4111-8111-111111111111","zoneId":50,"placeId":null,"location":null,"elementIds":[100],"description":"Jardín A","unitItemId":70,"requestedQuantity":2},
    {"clientReference":"22222222-2222-4222-8222-222222222222","zoneId":51,"placeId":null,"location":null,"elementIds":[101],"description":"Jardín B","unitItemId":70,"requestedQuantity":3},
    {"clientReference":"33333333-3333-4333-8333-333333333333","zoneId":52,"placeId":null,"location":null,"elementIds":[],"description":"Jardín C","unitItemId":70,"requestedQuantity":1}
  ]
}
~~~

Obligatorios: clase, fecha y `locations` con al menos una entrada. Clase/tipo según D-04.
Cada ubicación requiere `clientReference` UUID estable, y al menos una referencia espacial
válida entre zona, lugar, punto o elementos. `elementIds` por defecto []; IDs repetidos dentro
de una misma entrada → 400. Un elemento puede estar asociado a varias unidades de ese trabajo;
el historial se deduplica por intervención y no se deduce conteo de mantenimiento de ello.

`zoneId`/`placeId` son IDs maestros existentes; no texto libre. Punto:
`{"latitude":-12.069,"longitude":-77.079}`, con rangos geográficos válidos.
El servidor valida todos los hijos y congela una descripción legible a partir de sus
referencias, sin inventar sección para un punto/ejemplar fuera de polígonos.
Las referencias de un lugar son ayudas de ubicación, no trasladan el ejemplar ni sustituyen
la ubicación real del catastro. La membresía de elementos y cantidad mínima de ubicaciones
se verifican dentro de la transacción; no basta validar FKs por separado.

Origen/reportante omitidos se resuelven por códigos MAINTENANCE/NONE, no IDs hardcodeados.
FINDING requiere reportante distinto de NONE, sin obligar a un correlativo OSG aún inexistente.
`externalCode` opcional, máximo 40, nunca autogenerado ni usado como FK. `requestedAt`
opcional, no posterior a scheduledDate. Descripción general/local opcional, máximo 4000.
Cantidad pedida y unidad son locales: si hay cualquier cantidad en una ubicación, requiere
unidad en esa ubicación. La unidad puede diferir entre lugares; no existe cantidad única
editable en la cabecera. No imponer límite máximo de ubicaciones no acordado en este spec.

PUT recibe los campos completos de creación más `version` de cabecera. Cada ubicación existente
incluye `id` y conserva su clientReference; una nueva incluye `id:null`. Omitir una ubicación
existente significa retirarla con baja lógica, únicamente antes de cualquier inicio y dejando
al menos una activa. No aceptar un ID de otro trabajo ni reutilizar referencias dadas de baja.
Los ID de las ubicaciones conservadas no cambian al reordenarlas. Una edición fallida no
actualiza parcialmente cabecera, lugares ni asociaciones.

Si cambia fecha, PUT incluye `rescheduleReason` (1–2000 caracteres): registrar fecha anterior,
nueva y motivo. No editar planificación, unidad, elementos o conjunto de ubicaciones después
de que se inició alguna ubicación. Un relevo posterior depende de P-03 y no se obtiene por PUT.

### 3.3 Asignación, ejecución local y evidencia

Asignación global:
~~~json
{"version":0,"teamId":4,"assignedToUserId":20}
~~~

Inicio/validación local: `{"version":1}`. Observación local/cancelación global:
`{"version":1,"reason":"Motivo obligatorio"}`, motivo de 1–2000 caracteres.
Las versiones de todos estos cuerpos pertenecen a la cabecera, no a un estado global editable.

Guardar avance en una ubicación:
~~~json
{"version":2,"progressQuantity":1,"executionNotes":"Se atendió un ejemplar"}
~~~

Completar esa ubicación:
~~~json
{"version":3,"executedQuantity":2,"executionNotes":"Se completó la poda del jardín A"}
~~~

Notas de hasta 4000 caracteres, opcionales en avance y obligatorias al completar como reporte
de lo realizado (E3 acuerdo 6). Completar exige cantidad ejecutada si esa ubicación tiene unidad
configurada; si se envía cantidad sin unidad → 422. Puede superar o quedar bajo la pedida:
conservar cantidades reales, sin truncar ni convertir finalización de la salida en cumplimiento 100 %.
El avance no escribe executed_quantity; al completar se conserva el último avance y se fija
la cantidad final. El ejecutor autorizado puede iniciar A y luego B, manteniendo avances distintos.
Servidor fija inicio/fin, autor real y número de intento local. El cliente no atribuye otra persona.

Entrega de inicio/avance: `start` acepta únicamente ASSIGNED sin inicio ni intento anterior;
registra intento 1, fecha UTC con precisión de microsegundos y el usuario autenticado como
ejecutor. No reabre OBSERVED. Guardar avance exige IN_PROGRESS y autor real o capataz responsable,
además de rol y alcance vigentes: el operario conserva su asignación y pertenencia activa a
la cuadrilla; el supervisor sigue supervisándola. La lectura del historial no mantiene por sí
sola permiso de ejecución tras salir de una cuadrilla o cambiar de rol.
PUT de avance sustituye `progressQuantity` y `executionNotes`; omitidos/nulos quedan nulos.
Se admite cantidad cero, corrección de un avance previo y cantidades sobre la pedida, sin
convertirlas en finalización ni imponer un progreso porcentual. Cantidad sin unidad local → 422.
Cada guardado conserva valores anteriores/nuevos en PROGRESS_SAVED y no altera inicio,
intento, ejecutor, cantidad final ni revisión. El bloqueo sigue el orden cabecera → ubicación.

Anuncio de evidencia:
~~~json
{"version":4,"interventionLocationId":11,"clientReference":"de305d54-75b4-431b-adb2-eb6b9e546014","momentCode":"BEFORE","greenElementId":100,"capturedAt":"2026-10-23T14:00:00Z","capturedLocation":{"latitude":-12.069,"longitude":-77.079},"caption":"Jardín A antes de ejecutar"}
~~~

`interventionLocationId` es obligatorio y debe pertenecer al trabajo. El elemento, si se indica,
debe estar asociado a esa unidad; no basta que exista en otra ubicación de la intervención.
El número de intento se toma del intento activo de esa ubicación, no lo elige el cliente.
BEFORE/AFTER/UNSPECIFIED en captura nueva según §2.8; no se exige una pareja de momentos.
GPS/hora son opcionales, declarados por dispositivo y no certifican presencia; GPS de captura
no sustituye la FK al lugar del trabajo. Caption máximo 255. Respuesta de anuncio/subida:

~~~json
{"id":8,"interventionVersion":5,"interventionLocationId":11,"attemptNumber":1,"clientReference":"de305d54-75b4-431b-adb2-eb6b9e546014","momentCode":"BEFORE","greenElementId":100,"uploadedAt":null,"fileUrl":null,"caption":"Jardín A antes de ejecutar"}
~~~

Archivo: multipart `file`, JPEG/PNG/WebP, contenido validado, 25 MB máximo por foto conforme
límites compartidos. No aceptar SVG ni confiar solo en extensión/MIME. Al recibirse,
uploadedAt pasa a instante y fileUrl a la ruta de lectura autorizada. No reemplazar bytes de
una foto recibida. La política vigente de §2.8 exige una recibida por ubicación/intento al
completar y ninguna pendiente de esa ubicación al aprobar, incluidos intentos anteriores.

Entrega T06 del núcleo: el anuncio nuevo requiere ejecutor o capataz responsable en IN_PROGRESS;
congela ubicación, intento, autor y metadatos. Su referencia UUID es permanente, aun tras
vencer la ventana de 24 horas del submit. Los reintentos autorizados se reconocen antes
de comprobar una versión obsoleta; no crean otra foto, intento o evento. Otra ubicación,
trabajo, autor o metadatos con esa referencia → 409. Elemento opcional solo si está asociado
a esa ubicación. La captura declarada se guarda con precisión de microsegundos.

La subida nueva exige autor y acceso de ejecución vigentes, con ubicación IN_PROGRESS o
COMPLETED; no habilita cargas pendientes en VALIDATED/OBSERVED. No cambia el intento de
fotos anteriores. Bytes idénticos de una recepción ya
exitosa devuelven la misma foto antes de evaluar el estado; bytes distintos → 409. El cambio
de rol/membresía sigue revocando permisos de escritura aunque el usuario haya sido autor.

Se conservan bytes originales, con SHA-256, MIME detectado por decodificación y tamaño real;
no se comprimen ni se confía en nombre/extensión/MIME del formulario. Se reutilizan FileStorage
y PhotoUploads, incorporando un decodificador local WebP en el backend. Una transacción fallida
intenta retirar únicamente el objeto nuevo; nunca borra el de un reintento exitoso. Un resultado
de commit incierto conserva el objeto para reconciliación, evitando borrar una foto aceptada.
Los eventos de anuncio/recepción y la versión se persisten juntos; los pendientes solo se
reducen al recibir el archivo. No hay cuota por momento ni bloqueo de inicio/avance por fotos.

GET del archivo exige los mismos permisos de lectura del trabajo y comprueba pertenencia;
pendiente → 409, fuera de alcance → 404, sin autenticación → 401. Devuelve bytes con MIME
validado, no-store/private y nosniff, sin enlaces públicos/prefirmados. Como las otras rutas
binarias del proyecto, la respuesta exitosa es archivo; las respuestas de metadatos y errores
usan ApiResponse. El frontend deberá descargar con autorización, sin asumir un `<img>` público.
Formato de petición incompatible → 415 con el sobre común, incluso antes de elegir controller.

### 3.4 Lecturas, resúmenes y trazabilidad

InterventionSummary tiene estas propiedades, presentes aunque sean nulas:
~~~json
{"id":1,"code":"INT-000001","version":8,"classItemId":12,"typeItemId":30,"planningStatusCode":"ASSIGNED","statusCode":"IN_PROGRESS","teamId":4,"assignedToUserId":20,"scheduledDate":"2026-10-23","startedAt":"2026-10-23T14:00:00Z","completedAt":null,"validatedAt":null,"locationCount":3,"completedLocationCount":1,"validatedLocationCount":0,"pendingEvidenceCount":1}
~~~

El detalle añade los campos de planificación de §3.2, createdAt/updatedAt, `locations`,
`evidences`, `history`, `quantityTotals`, `incidentIntegrationAvailable` y `sourceIncidents`.
Las locations se devuelven con todas las propiedades de creación más ID y los siguientes
campos operativos, presentes en cada ubicación:
~~~json
{"id":11,"clientReference":"11111111-1111-4111-8111-111111111111","zoneId":50,"placeId":null,"location":null,"elementIds":[100],"description":"Jardín A","locationDescription":"Sección correspondiente al jardín A","unitItemId":70,"requestedQuantity":2,"statusCode":"COMPLETED","attemptNumber":1,"progressQuantity":1,"executedQuantity":2,"executionNotes":"Se completó la poda del jardín A","startedAt":"2026-10-23T14:00:00Z","completedAt":"2026-10-23T15:00:00Z","executedByUserId":20,"validatedAt":null,"validatedByUserId":null,"rejectionReason":null,"pendingEvidenceCount":0}
~~~

Las otras entradas pueden estar IN_PROGRESS/ASSIGNED con sus cantidades y autores propios.
Cabecera no expone executedByUserId, validatedByUserId, requestedQuantity, progressQuantity,
executedQuantity ni executionNotes como valores globales editables. No existe porcentaje
global de avance por cantidad: la UI distingue contadores de lugares y cantidades locales.

quantityTotals es un array por unidad:
`[{"unitItemId":70,"requestedQuantity":6,"progressQuantity":null,"executedQuantity":null}]`.
No mezclar M, M2, M3 y UNIT ni convertirlos. Para cada campo, si alguna ubicación de ese grupo
tiene valor desconocido/nulo, el total es null; no tratarlo como cero. Ubicaciones sin unidad
se muestran individualmente, sin agregación. Estos totales son una ayuda de lectura, no indicadores
de cobertura ni cumplimiento de frecuencias. Regla exacta de estado agregado en §5.2.

history siempre es array. Evento general con interventionLocationId:null; evento local:
~~~json
{"actionCode":"COMPLETED","interventionLocationId":11,"attemptNumber":1,"actorUserId":20,"occurredAt":"2026-10-23T15:00:00Z","fromStatusCode":"IN_PROGRESS","toStatusCode":"COMPLETED","reason":null}
~~~

En eventos generales, fromStatusCode/toStatusCode son estados de planificación; en locales,
estados de esa ubicación. Detalles anteriores/nuevos se conservan en BD, sin binarios, tokens
ni URLs firmadas. Catálogos y referencias inactivos siguen resolviendo en lecturas históricas.

### 3.5 Concurrencia e idempotencia

Toda edición/acción y anuncio exige `version` actual de cabecera; se bloquea el trabajo y
la ubicación afectada en ese orden. La versión aumenta una vez por comando exitoso, aun
cuando solo cambia un hijo. Es deliberadamente común a las ubicaciones: dos ediciones
simultáneas pueden producir 409, pero no una pérdida de progreso. Volver a cargar antes
de repetir un comando nuevo. Transición imposible → 422.

Recepción de archivo no exige versión en el formulario: serializa con validación y actualiza
la versión devuelta; un reintento se reconoce antes de aplicar cambios. No convertir una
subida aceptada en bytes perdidos por una carrera. §2.8 fija los estados locales que permiten
recibir pendientes; el bloqueo técnico no reemplaza esa política.

Creación/anuncio requieren Idempotency-Key UUID estable por submit, conforme SPEC-C03 §9.
Clave ya exitosa con mismo cuerpo → 200 con recurso existente; en curso o contenido
diferente → 409; sin clave → 400. Comprobar autenticación/alcance antes de revelar IDs y
reconocer éxito previo antes de rechazar por versión obsoleta. Añadir la cabecera a CORS al
implementar, sin cambiar autenticación.

Conservar submits 24 horas y referencia de evidencia permanentemente. La referencia local
de una ubicación es estable durante toda la vida del registro; no reutilizarla al dar de baja.
Misma evidencia con otra ubicación/intervención/autor/metadatos → 409. Archivo repetido con
mismos bytes → misma evidencia; bytes diferentes → 409. Hash SHA-256 para identificar bytes.
Un reintento no agrega eventos ni incrementos de versión por segunda vez.

### 3.6 Contrato con incidencias y servicios tercerizados

**Propiedad del vínculo.** SPEC-002 §4.8 conserva `incidents.intervention_id` como FK
nulable al trabajo completo. No añadir FK inversa persistida ni convertir cada ubicación en
una incidencia. Cada incidencia apunta a cero o una intervención; no imponer unicidad inversa
accidentalmente. Varias intervenciones para una incidencia requerirían ampliar ese modelo
en el spec de incidencias. Trabajo rutinario existe sin incidencia; FINDING y externalCode
no sustituyen el ID interno ni prueban que exista una incidencia local.

Rutas futuras, a cargo del módulo de incidencias:
| Endpoint | Permisos conjuntos | Operación |
|----------|--------------------|-----------|
| `POST /api/v1/incidents/{incidentId}/intervention` | ADMIN/C con acceso a incidencia y creación de trabajo | Crear trabajo/ubicaciones y guardar vínculo, o no persistir ninguno |
| `PUT /api/v1/incidents/{incidentId}/intervention` | ADMIN/C con acceso a ambos y edición de planificación | Vincular planificación existente sin duplicar trabajo |

POST requiere Idempotency-Key y recibe la misma planificación multiubicación de §3.2:
~~~json
{"incidentVersion":2,"intervention":{"classItemId":12,"typeItemId":30,"scheduledDate":"2026-10-23","description":null,"reportedByItemId":61,"externalCode":null,"requestedAt":null,"locations":[{"clientReference":"11111111-1111-4111-8111-111111111111","zoneId":null,"placeId":null,"location":null,"elementIds":[],"description":null,"unitItemId":null,"requestedQuantity":null}]}}
~~~

Para una solicitud sin ubicación explícita en su única entrada, el servidor puede completar
esa entrada con ubicación/elemento de la incidencia. Para varias entradas, cada una debe
ubicarse explícitamente: no copiar el mismo punto del reporte a todas para simular lugares.
Si el resultado no ubica el trabajo, 422 y rollback completo. Descripción/referencias externas
omitidas pueden tomar valores del reporte; conservar origen y diferencias en eventos.
Forzar FINDING; un usuario reportante no equivale al catálogo INCIDENT_SOURCE.

PUT recibe `{"incidentVersion":2,"interventionId":1,"interventionVersion":0}`.
Respuesta para creación inicial:
~~~json
{"incidentId":7,"interventionId":1,"incidentVersion":3,"interventionVersion":0}
~~~
POST nuevo → 201 con Location al trabajo; repetición exitosa → 200; PUT → 200.
Al vincular uno existente, incrementar ambas versiones; crear cabecera/ubicaciones/evento
de vínculo es una sola transacción y nace con version:0. El futuro módulo de incidencias
debe definir control de versión antes de habilitar estas rutas.
Vínculo distinto existente o versión vencida → 409; incidencia cerrada o intervención ya
iniciada/cancelada al intentar un vínculo nuevo → 422. Mismo vínculo reenviado → mismos IDs,
sin eventos duplicados. S no obtiene creación indirecta por poder resolver una incidencia.

Crear/vincular guarda eventos en ambos agregados en una transacción local de PostgreSQL.
Las fotos de reporte siguen perteneciendo a incidencia; no se copian como evidencia de ejecución.
Lectura sourceIncidents:
`[{"id":7,"code":"Código existente","statusCode":"Código existente"}]`, solo incidencias autorizadas.
Sin módulo habilitado: `incidentIntegrationAvailable:false`, sourceIncidents:[] y ninguna
consulta toca su tabla. Filtro incidentId no disponible → 422 con explicación.
No confundir módulo ausente con trabajo sin incidencia cuando sí está habilitado.

**Estados independientes.** Iniciar, completar, observar o validar A, todas las ubicaciones
o el trabajo no resuelve la incidencia automáticamente. Cancelar tampoco atiende el problema.
El cierre explícito es de incidencias, conforme SPEC-001, con notas, actor y fecha; responsable
de comunicación y conformidad suficiente se coordina con ese módulo (P-01/P-03).

**Tercerizados y tiempos.** E2 acuerdo 9/E3 acuerdos 6–7 exigen seguimiento hasta compra,
ejecución, conformidad/subsanación y comunicación. No automatizar Logística/Centuria ni
inventar acceso del proveedor. SPEC-002 §4.7 prevé contract_id en la intervención cuando
exista contracts; no duplicar el historial de trabajos ni registrar terceros como IN_HOUSE.
E3 acuerdo 9 aporta referencias (mismo día/hasta 48 h en simples, semanas en tercerizados),
no SLA aprobados ni cierre por plazo. Reprogramación con motivo y coordinación operativa
de eventos/calendario hasta acordar fuentes. Cambiar fecha no crea otra incidencia.

## 4. Migración de base de datos

Implementada en [V025__create_interventions.sql](../../backend/src/main/resources/db/migration/V025__create_interventions.sql),
propietaria SPEC-200, que concilia SPEC-002 §4.6 y SPEC-005. Es aditiva: no modifica las
migraciones V001–V021 ni altera tablas existentes. Solo inserta los catálogos ausentes y
crea el núcleo nuevo. Aplicación comprobada en bases desechables; no aplicada a la base de trabajo.

La numeración siguiente se consulta en el [registro](../REGISTRO.md#mapa-de-migraciones).
V022 ya no es una reserva. El SQL literal vive en el archivo ejecutable y las pruebas en
[InterventionsMigrationTest](../../backend/src/test/java/pe/edu/pucp/hesperides/migration/InterventionsMigrationTest.java);
no mantener otra copia de ese DDL en este spec.

### 4.1 Catálogos necesarios

La migración agrega únicamente códigos ausentes, comprobados por tipo y código; no reactiva,
renombra ni modifica filas existentes, incluso si están inactivas o dadas de baja.

| Catálogo | Códigos requeridos | De sistema |
|----------|--------------------|------------|
| INTERVENTION_STATUS | PLANNED, ASSIGNED, IN_PROGRESS, COMPLETED, VALIDATED, OBSERVED, CANCELLED | Sí |
| INTERVENTION_ORIGIN | MAINTENANCE, FINDING | Sí |
| INCIDENT_SOURCE | SUPERVISION, UNIT, NONE | No |
| EVIDENCE_MOMENT | BEFORE, AFTER, UNSPECIFIED | Sí; proteger BEFORE/AFTER |
| MEASUREMENT_UNIT | UNIT, M, M2, M3 | No |

La coincidencia de UNIT en INCIDENT_SOURCE y MEASUREMENT_UNIT no es colisión: son catálogos
distintos. Los ítems personalizados conservan etiqueta, flags, metadata e historial de baja.
La taxonomía clase/tipo ya existe y no se vuelve a sembrar. Los permisos y reglas de captura
siguen siendo responsabilidad del servicio; sembrar estados no habilita endpoints ni
define cantidad mínima de fotos, aprobación de correcciones o conteo de indicadores.

### 4.2 Tablas y prueba de actualización

| Tabla nueva | Responsabilidad |
|-------------|-----------------|
| interventions | Identidad, planificación, asignación, versión común y estado recuperable de publicación |
| intervention_locations | Ejecución independiente por lugar: estado, cantidades, fechas, intento y autores |
| intervention_elements | Ejemplares asociados a una ubicación de ese trabajo |
| intervention_evidences | Foto localizada y reintentable, anunciada o recibida |
| intervention_events | Historial general/local con autor y snapshot de cambios/intentos |
| intervention_submissions | Deduplicación de submits exitosos |

Las pruebas cubren migrar desde vacío y actualizar una base que llegó a V021. Esta última
contiene semillas reales del proyecto y registros de prueba adicionales de usuarios/cuadrilla,
configuración de frecuencia, medición de ejemplar, lugar con geometría y metadatos de foto,
además de un ítem personalizado inactivo/dado de baja.

Antes/después se comparan huellas de todas las filas de tablas previas, sus columnas/índices/
constraints y los checksums Flyway anteriores. Solo se admiten filas nuevas en catalog_types
y catalog_items. También se verifica repetir migrate sin duplicación ni cambios de checksum.
Esto prueba conservación en una actualización representativa; no equivale a migrar una copia
de la base de trabajo ni a probar todavía endpoints/entidades de intervenciones.

### 4.3 Invariantes de persistencia y compatibilidad

La cabecera guarda solo estado de planificación PLANNED/ASSIGNED/CANCELLED; el estado
operativo agregado se calcula según §5.2, no se escribe como segunda fuente de verdad.
No hay columnas globales de cantidad, unidad, ejecución, validación o ubicación que compitan
con las locales. Los instantes generales del DTO también son proyecciones, no columnas
duplicadas. El esquema conserva asignación global mientras cada unidad registra su ejecutor real.

Las FK compuestas impiden que foto, evento o asociación de elemento apunten a una ubicación
de otra intervención, incluso si ambos IDs existen. La correspondencia de un elemento opcional
con la ubicación de la foto se comprueba en el servicio; igualmente la pertenencia a catálogo,
actividad de referencias, ubicación espacial válida y mínimo de una unidad activa.
Una FK simple no comprueba permisos ni el número de hijos. Crear, editar hijos, guardar evento
y submit ocurren en una sola transacción; no puede persistir una cabecera activa sin ubicaciones.

La edición retira con baja lógica ubicaciones/relaciones antes de iniciarse el trabajo;
no hace DELETE físico ni usa ON DELETE CASCADE. La unicidad permanente de client_reference
de ubicación y evidencia es una excepción deliberada al índice parcial: el reintento de una
referencia antigua nunca revive un registro dado de baja. El índice único del código del trabajo
sigue siendo parcial, pero la secuencia no se reinicia ni al cancelar; el formato crece después
de 999999 sin truncar códigos. Código interno y external_code son independientes.

La columna version está en cabecera y se usa con bloqueo optimista/serialización descrita
en §3.5. attempt_number local aumenta al iniciar y al reabrir; los eventos
preservan instantánea de cada intento, incluida cantidad, fechas y autores. No es necesario
mover la foto anterior a otro lugar/intento para corregir el trabajo.

Para serializar submits antes de crear el recurso, usar bloqueo transaccional PostgreSQL
por actor/operación/clave con intento no bloqueante: ocupado → 409. Expirar con baja lógica
la fila de submit antes de reutilizar una clave vencida; no expira la referencia de foto.
Subida fallida conserva evidencia pendiente. Si el objeto se guardó y falla la transacción,
compensar solo el objeto nuevo o recuperarlo por clave estable; no borrar bytes de un reintento
ya confirmado. El nuevo prefijo de storage no modifica la retención de fotos existentes.

Timestamps se interpretan UTC como en el proyecto; la conversión a fecha civil de indicadores
queda en su adaptador futuro. Publicación conserva columnas recuperables de SPEC-005, pero
no activa un publicador ni determina qué datos publica. contract_id y la FK de incidencias
se añaden en sus entregas cuando existan sus tablas; no se simula esa dependencia aquí.

V022 amplía el diseño original de SPEC-002 §4.6: ubicación, estado operativo, cantidades, autores y fechas
de ejecución pasan a entidades hijas. V022 crea directamente el modelo conciliado, sin editar migraciones publicadas ni aplicar
los ALTER históricos del diseño singular. El mapeo JPA y los servicios son la etapa posterior.

## 5. Comportamiento

### 5.1 Flujo principal y acciones locales

1. ADMIN/C crea una intervención y una o varias ubicaciones válidas en PLANNED, con clase/tipo
   y fecha comunes, referencias/elementos y cantidades por lugar. Todo se crea atómicamente.
2. C asigna equipo/persona; S puede reasignar dentro de su cuadrilla, antes de cualquier inicio.
   Cabecera y ubicaciones pasan a ASSIGNED en la misma operación.
3. S de la cuadrilla u O asignado inicia A. Esa ubicación pasa a IN_PROGRESS, attemptNumber:1
   y registra ejecutor/hora reales. B/C siguen ASSIGNED; no reciben una fecha ficticia de inicio.
4. El ejecutor o capataz responsable registra avance y anuncia/sube sus fotos de A. Puede iniciarse B y registrarse
   de forma independiente; un avance en A nunca sobrescribe cantidades ni notas de B.
5. Se completa A con cantidad final y reporte descriptivo, con foto recibida del intento vigente y reporte obligatorio (§2.8). A queda
   COMPLETED; B/C conservan sus estados. El resumen general no se marca COMPLETED todavía.
6. Solo C puede aprobar/observar A; se aplica la política de §2.8 y se impide autoaprobación. Eso no valida/observa B ni requiere falsificar un validador único para todo el trabajo.
7. Historial de cada elemento recupera el trabajo y sus ubicaciones correspondientes sin
   duplicar la intervención. Terminar todos los lugares tampoco cierra una incidencia enlazada.
   El proveedor de cumplimiento espera la unidad de cobertura de P-01; el momento de aceptación ya está confirmado.

Transiciones locales propuestas:
| Origen local | Acción | Destino local |
|--------------|--------|---------------|
| PLANNED | Asignación global | ASSIGNED |
| ASSIGNED | Reasignación global | ASSIGNED |
| ASSIGNED | Inicio local | IN_PROGRESS |
| IN_PROGRESS | Completar localmente | COMPLETED |
| COMPLETED | Validar esa ubicación | VALIDATED |
| COMPLETED | Observar esa ubicación con motivo | OBSERVED |
| OBSERVED | Capataz responsable reabre esa ubicación | IN_PROGRESS |
| PLANNED/ASSIGNED | Cancelación global antes de cualquier inicio | CANCELLED |

Las acciones de revisión/subsanación propias aplican las reglas provisionales aceptadas de §2.8;
no atribuir la tabla completa a las actas, que confirman subsanación específicamente en terceros.
No hay cancelación parcial de ubicaciones ni reasignación posterior al inicio en esta entrega.
Si el caso requiere ampliar eso, se diseña con autoría/historial, sin transformar un PUT en relevo.

### 5.2 Estado general e instantes derivados

`planningStatusCode` refleja PLANNED/ASSIGNED/CANCELLED de cabecera. `statusCode` es el
resumen operativo **calculado**, con estas reglas técnicas en orden sobre ubicaciones activas:

1. Cabecera PLANNED o CANCELLED → ese mismo estado, coherente con sus ubicaciones.
2. Con cabecera ASSIGNED, si todas las ubicaciones son VALIDATED → VALIDATED.
3. Si alguna ubicación es OBSERVED → OBSERVED.
4. Si todas son COMPLETED o VALIDATED → COMPLETED.
5. Si alguna está IN_PROGRESS, COMPLETED o VALIDATED → IN_PROGRESS.
6. Si todas están ASSIGNED → ASSIGNED.

Los otros conjuntos son inconsistentes y no se producen por la API. Crear exige al menos
una ubicación; no usar reglas de «todas completadas» sobre una colección vacía.
OBSERVED tiene precedencia para hacer visible trabajo que requiere revisión; la interfaz
siempre conserva los estados locales, sin ocultar lugares pendientes bajo ese resumen.
Estas son decisiones de presentación/consistencia propuestas para la implementación, no
nuevos criterios de aceptación agronómica del cliente ni política de indicadores.

Ejemplo obligatorio de lectura:
| Ubicación | Estado | Cantidad pedida | Ejecutada |
|-----------|--------|-----------------|-----------|
| Jardín A | COMPLETED | 2 UNIT | 2 UNIT |
| Jardín B | IN_PROGRESS | 3 UNIT | Pendiente; avance 1 UNIT |
| Jardín C | ASSIGNED | 1 UNIT | Pendiente |

Resultado: una intervención IN_PROGRESS; locationCount:3; completedLocationCount:1;
validatedLocationCount:0. A validada y B/C asignadas tampoco completan el trabajo global.
completedLocationCount incluye COMPLETED/VALIDATED; no incluye OBSERVED ni CANCELLED.
Todas las fechas/contadores generales excluyen ubicaciones dadas de baja.

startedAt general = mínimo started_at local no nulo. completedAt general = máximo completed_at
solo cuando todas están COMPLETED/VALIDATED; en otros estados es null. validatedAt general =
máximo validated_at solo cuando todas están VALIDATED. Se conservan siempre las fechas locales
y los eventos previos. No atribuir un único ejecutor/validador a esa agregación.

### 5.3 Edición, observación y casos límite

Planificación, fecha, unidades, ubicaciones y elementos solo se editan antes de cualquier inicio.
Cambiar fecha requiere motivo; no crea otra intervención. Cancelación global solo cuando ningún
lugar se ha iniciado; registra motivo y conserva ubicaciones, fotos/eventos históricos.
Reasignar antes del inicio actualiza cabecera y todas las ubicaciones aún ASSIGNED, sin simular
una nueva ejecución. No se completan automáticamente cantidades pedidas.

La reapertura de §2.8 afecta solo a la unidad observada: conserva el intento anterior
en evento con sus fechas/cantidades/autores/fotos, incrementa attempt_number, inicia de nuevo
y limpia completed_at, cantidades, notas y revisión actuales. El avance inicial queda nulo;
el snapshot del evento conserva los datos anteriores, sin hacerlos pasar por nueva ejecución.
Las ubicaciones ya validadas conservan su revisión y no se reabren
por la corrección de otra. No hay reapertura de una ubicación validada en este alcance.

- Sin cuadrillas: planificar sí, asignar no; explicación visible, sin personal ficticio.
- Cambio de membresía: nuevo alcance en la siguiente petición. No transferir autoría de un
  intento iniciado; el relevo sigue pendiente en P-03.
- Sin mapa: seleccionar zonas/lugares/elementos por listas o registrar puntos. Ubicación fuera
  de polígonos válida; no mover elementos del inventario para hacerlos encajar.
- Clase sin tipos activos: tipo nulo permitido conforme D-04; excluir del cumplimiento por tipo
  hasta clasificación válida. Corrección posterior al inicio requiere una entrega auditada aparte.
- Foto de B enviada con locationId de A: rechazar pertenencia inconsistente en backend; la
  ubicación de la foto no se elige por proximidad del GPS ni por la última pestaña que se abrió.
- Reintento de subida: recuperar misma foto, lugar e intento; no reasociarla para cumplir requisitos
  de otro jardín o del nuevo intento.
- Historial por elemento: JOIN/EXISTS entre intervención, ubicaciones y asociaciones, sin filas
  duplicadas de trabajo ni cambios en los contratos actuales de inventario.
- Frecuencias: el fallback sigue hasta P-01. La futura lectura conserva ID de trabajo y ubicación,
  fecha de ejecución local y modalidad. No aplicar DISTINCT por fecha ni asumir que cada
  ubicación equivale a una cobertura completa del campus. Decidir cómo se traduce esa información
  a ExecutionHistoryProvider antes de habilitarlo; fecha civil configurable America/Lima.
- Publicación externa: fuera de la transacción y detrás de adaptador; columnas preparadas no
  prueban integración. Fuente/destino y qué se publica siguen pendientes P-14.

## 6. Criterios de aceptación

| # | Criterio | Verificación |
|---|----------|--------------|
| CA-01 | ADMIN planifica pero no asigna/ejecuta | Crear con tres ubicaciones como ADMIN e intentar ambas acciones; conserva planificación |
| CA-02 | Clase/tipo y referencias locales válidas | Rechazar hijo de otra clase; omitir tipo solo si no hay hijos activos; cada lugar debe ubicarse |
| CA-03 | Alcance por cuadrilla/asignación | Dos cuadrillas; IDs/filtros de trabajo y ubicación no revelan la otra |
| CA-04 | Solo COORDINADOR aprueba y nunca su propio reporte | S/O reporta; S y ADMIN reciben 403 al aprobar; cambio de rol de un autor a coordinador tampoco le permite aprobar su ejecución/reporte anterior |
| CA-05 | Avance/cantidad/estado independientes | Pedir A=2 y B=3; A ejecutada 2, B avance 1, C pendiente; no sobrescribir B/C ni completar el trabajo |
| CA-06 | Foto recibida y pendiente diferenciadas por lugar | Anunciar en A/subir; pendiente cambia solo al recibir archivo. No imponer cuotas BEFORE/AFTER sin P-02 |
| CA-07 | Reintentos no duplican trabajo, lugares o foto | Repetir creación, referencia local y subida; conservar IDs/bytes y un único evento por operación |
| CA-08 | Edición concurrente no pierde progreso | Dos comandos locales con misma versión general; uno tiene conflicto y puede recargar sin sobrescribir al otro |
| CA-09 | Corrección conserva historia local | Capataz reabre A observada y conserva snapshot/fotos del intento anterior; B validada permanece intacta |
| CA-10 | Historial de ejemplar no duplica trabajo | Mismo ejemplar en dos unidades del mismo trabajo; una intervención con desglose de unidades |
| CA-11 | No se activa una política de indicadores no acordada | Fallback hasta P-01; futura integración conserva identidad de ubicaciones y no deduplica por fecha |
| CA-12 | No se necesita mapa/publicador para registrar | Crear/consultar por listas y puntos con mapa no disponible y publicador no configurado |
| CA-13 | Migración futura preserva datos previos | Actualizar copia con V001–V021 y datos; comprobar usuarios, frecuencias, lugares, geometrías e inventario/fotos |
| CA-14 | Cancelación general no borra historia | Antes de iniciar, cancelar: cabecera/unidades CANCELLED, filas/eventos conservados. Después de iniciar → rechazo |
| CA-15 | Ubicación sin sección y varias ubicaciones válidas | Crear un trabajo con jardín, lugar y punto fuera de polígonos; tres ID estables y un código de trabajo |
| CA-16 | Vínculo con incidencia conserva el trabajo completo | Al habilitar integración, repetir creación/vínculo de trabajo con varias ubicaciones; mismos IDs y permisos conjuntos |
| CA-17 | Ejecución local o total no cierra incidencia | Completar A, completar todas y validar todas; incidencia conserva su estado hasta cierre explícito de su módulo |
| CA-18 | Reprogramación registra contexto | Cambiar fecha antes de iniciar con motivo; conservar ambas fechas, sin imponer 48 h como SLA |
| CA-19 | Ausencia de incidencias no rompe el núcleo | Sin tabla incidents, crear/listar rutinarios sin consultarla y detalle con integración no disponible |
| CA-20 | Foto/evento/elemento no cruzan trabajos por FK | Intentar insertar asociación a ubicación de otro trabajo en BD de prueba; falla FK compuesta |
| CA-21 | Resumen general deriva de estados locales | Ejemplo A COMPLETED/B IN_PROGRESS/C ASSIGNED → IN_PROGRESS; todas completadas → COMPLETED; todas validadas → VALIDATED |
| CA-22 | Cantidades agregadas respetan unidad y desconocidos | UNIT y M2 se muestran separados; valores locales nulos no se convierten a cero ni a porcentaje global |
| CA-23 | Edición de lugares conserva identidad y no borra ejecución | Reordenar conserva IDs; retirar con baja solo antes de inicio; retirar el último o alterar después de inicio se rechaza |

## 7. Especificación visual

Listado con filtros de fecha, clase/tipo, estado general/local y cuadrilla; «Nueva intervención»
solo para ADMIN/C. Tabla en escritorio, tarjetas bajo 640 px; adaptación hasta 1024 px.
Resumen visible con lugares completados/total, estado general y avisos de fotos pendientes,
sin convertir ese conteo en porcentaje de cantidad o de mantenimiento del campus.

Formulario agrega varias ubicaciones reconocibles mediante búsqueda/listas/puntos y sus
elementos, unidad y cantidad pedida. Cada tarjeta conserva identidad al reordenarse.
Detalle por ubicación: estado, cantidad pedida/avance/ejecutada, responsable real, revisión,
notas, fotos propias, intento e historial. El botón «Completar jardín A» no afecta B/C.
Confirmación con lugar explícito al observar, completar o validar para evitar atribuciones erróneas.

Las fotos muestran lugar, momento y autor; indicador de pendientes desde el anuncio.
En web no afirmar guardado permanente en teléfono sin implementar persistencia local.
Mostrar enlace/estado de incidencias autorizadas por separado; completar no ofrece cierre
implícito de incidencia. Explicar integración ausente, sin enlace a pantallas inexistentes.

Acciones según rol/alcance/estado local con comprobación adicional en servidor. Estados
de carga, vacío, error, reintento y conflicto con recarga que no borre texto sin avisar.
Controles de campo ≥44 px, motivo de reprogramación y coordinación operativa del calendario.

## 8. Tests y entrega sin regresiones

La [referencia previa](../../docs/planes/SPEC-200-referencia-pruebas.md) registra 589 pruebas
backend/555 frontend aprobadas, lint y build frontend correctos antes de cambios funcionales.
La [etapa 2](../../docs/planes/SPEC-200-etapa-2-migracion.md) valida V022 en bases aisladas con
16 pruebas nuevas y la suite backend completa: 605 pruebas aprobadas. Esa referencia es
anterior a la API. La entrega T04 añade entidades/repositorios y pruebas de planificación,
asignación, alcance, consultas y concurrencia; sus resultados se registran en el
[informe del backend](../../docs/planes/SPEC-200-etapa-3-planificacion.md).
La interfaz y las acciones de finalización/revisión se verifican en la entrega de §2.8; los
resultados y la limitación de navegador real se registran en el informe correspondiente.
La entrega posterior de [inicio/avance local](../../docs/planes/SPEC-200-etapa-3-inicio-avance.md)
añade las pruebas de T05 parcial. Finalización/revisión y fotos siguen sin habilitarse.
Resultado posterior a T05 parcial: 35 pruebas específicas y suite completa de backend
con 640 pruebas aprobadas, sin fallos, errores ni omitidas; únicamente bases temporales.
La entrega posterior de [evidencia localizada](../../docs/planes/SPEC-200-etapa-3-evidencia.md)
registra la verificación de T06 y sus límites frente a las políticas aún abiertas.
Resultado posterior a T06: 51 pruebas específicas y suite completa con 656 pruebas
aprobadas, sin fallos, errores ni omitidas. No se repitió frontend sin cambios en sus archivos.

Entrega de §2.8 y primera web: 59 pruebas específicas de intervenciones y suite backend
completa de **664 aprobadas**, sin fallos, errores ni omitidas, tras compilación limpia en JDK 26.
Frontend: **82 suites / 564 pruebas aprobadas**, lint y build correctos. La revisión visual
de T07 está pendiente porque no hay navegador habilitado; el HTTP 200 de las instancias
aisladas no sustituye INV-10. Ver el [informe de revisión y web](../../docs/planes/SPEC-200-etapa-3-revision-y-web.md).

- Migración futura desde vacío y actualización con datos representativos hasta V021; checksums
  previos, MigrationNumberingTest y MigrationSmokeTest existentes. Comprobar FKs compuestas,
  bajas lógicas y rechazo de cabecera sin una unidad activa en la transacción de servicio.
- Cabecera con tres ubicaciones, edición estable/reordenación, mínimos de referencias espaciales
  y ausencia de cambios en geometrías/elementos maestros. Filtros coincidentes en la misma
  ubicación y paginación de trabajos sin multiplicarlos por número de coincidencias.
- Permisos de creación/asignación separados, cuadrilla vigente y ejecutor/validador locales.
  Mantener dos ejecuciones simultáneas sin atribuir ambas al último actor de cabecera.
- Conjuntos de estados de §5.2 y fechas derivadas: ninguno de los resúmenes completa otras
  ubicaciones. Cantidades por unidad, valores desconocidos y cumplimiento parcial real.
- Concurrencia entre ediciones locales, completar/subir/validar; reintentos tras reinicio,
  referencia antigua, misma clave con otro cuerpo y foto reasignada a otro lugar.
- Rollback conjunto de cabecera/hijos/eventos/submit y compensación de objeto nuevo sin
  borrar fotos previas. Intentos anteriores preservados al reabrir según P-03.
- Incidencias: contrato futuro multiubicación atómico, permisos de ambos agregados, estados
  independientes y núcleo funcional sin tablas del otro módulo.
- Frecuencias: fallback antes de P-01; identidad local, fecha civil, ejecución previa al periodo,
  modalidad y diferencia entre reintento duplicado y dos trabajos/lugares reales el mismo día.
- Regresión de login/refresh, usuarios, catálogos, frecuencias, mapa, lugares, inventario e importación/fotos.
- Navegador real con roles, pantalla pequeña, cambio entre tarjetas de ubicación, conflicto y
  CORS Idempotency-Key. Ajustar pruebas dependientes de P-02/P-03 solo después de resolverlas.

Comandos: Maven Wrapper con JDK 26 y npm test/lint/build del proyecto, según la referencia.
Se ejecutaron las pruebas de migración y regresión backend en la etapa 2. No se repitió frontend
sin cambios en su implementación. Al desarrollar servicios/interfaz, ejecutar checks afectados
y suites finales; no dar por probadas sus reglas con las pruebas del esquema solamente.

Antes de usar una migración en una base de trabajo, comprobar respaldo/restauración en entorno
separado y probar actualización. Volver atrás el código no borra tablas ni revierte migraciones;
corregir la BD con otra migración. No usar down -v, Flyway clean/repair ni editar checksums.
Maven clean de productos de compilación es distinto de borrar una base.

## 9. Dependencias y decisiones por revisar

El historial de dominio se persiste en la misma transacción que cada cambio, con acciones
`CREATED`, `UPDATED`, `ASSIGNED`, `STARTED`, `PROGRESS_SAVED`, `COMPLETED`, `VALIDATED`,
`OBSERVED`, `REOPENED`, `CANCELLED`, `REPROGRAMMED`, `EVIDENCE_ANNOUNCED` y `EVIDENCE_UPLOADED`;
`INCIDENT_LINKED` al habilitar §3.6. La incidencia registra su propio evento, sin copiar toda
la ejecución a su historial.
No sustituye la auditoría global de SPEC-004: hoy `AuditService` solo registra en logs.
Su integración persistente se planifica aparte y no debe duplicar ni perder los eventos propios.

### 9.1 Dependencias técnicas y secuencia de entrega

**Alcance del responsable de este trabajo: implementar intervenciones.** No necesita redactar
el spec completo ni implementar reportes, estados, pantallas, tablas o rutas de incidencias
para avanzar con el núcleo de SPEC-200. §3.6 es una propuesta de contrato compartido a
coordinar con el responsable de incidencias, no una asignación de ese módulo a este trabajo.
Las rutas `/incidents/...` y la FK `incidents.intervention_id` se implementan con su módulo;
este trabajo prepara servicios de intervenciones reutilizables y sus límites de autorización,
sin simular una incidencia real en producción ni crear su tabla como dependencia ficticia.

La migración y la persistencia del núcleo multiubicación están implementadas, junto con
consulta, planificación y asignación (T04). T05 implementa inicio y avance local; su
finalización/revisión aplica §2.8. Las partes dependientes de cobertura/relevo/asignación
multisectorial siguen identificadas. El desarrollo de su
registro, asignación, ejecución e historial no queda bloqueado por la ausencia de incidencias.
La integración conjunta sí requiere acordar el contrato y disponer del otro módulo. Se pueden
probar los límites del contrato con dobles de prueba, dejando deshabilitada la integración real.

Son responsabilidad de implementación: siguiente número libre, concurrencia, claves de archivos,
idempotencia, FK y autoría, adaptación a DTO y pruebas. No se pide al cliente elegir esos detalles.
Revisar con el equipo las propuestas PLANNED, ubicación sin zona y la frontera transaccional
con incidencias; el permiso de crear/asignar sigue perteneciendo a SPEC-001.

Orden propuesto: (1) núcleo, catálogos y pruebas de registro; (2) web para capataz y comprobación
por roles; (3) historial por ejemplar; (4) proveedor real de frecuencias tras P-01;
(5) operación con incidencias cuando existan ambos módulos. Cada entrega declara lo habilitado;
ninguna presenta integraciones pendientes como completadas. El contrato de §3.6 sí forma parte
del diseño inicial, aun antes de crear las tablas de incidencias/contratos.

### 9.2 Estado actual de decisiones operativas

| ID | Resuelto | Pendiente / provisional |
|----|----------|------------------------|
| P-01 | Cuenta después de aprobación final del COORDINADOR, todas las ubicaciones aprobadas | Cobertura de frecuencias y fecha de cómputo; no habilitar proveedor real por asumir equivalencias |
| P-02 | Fotografías obligatorias | Mínimo por ubicación/intento y momento del bloqueo son detalles provisionales de §2.8; sin pareja BEFORE/AFTER |
| P-03 | Capataz responsable del trabajo del sector; coordinador da aprobación final | Corrección propuesta aceptada para desarrollo: capataz subsana y coordinador revisa. Autoridad de relevo y revocación de aprobación siguen pendientes |
| P-04 | Una actividad con varios jardines; ejecución local independiente | Caso que cruza sectores con distintos capataces requiere contrato de asignación posterior; no dividir automáticamente |
| P-05 | Primera entrega web para Roobert | Recursos, Android, terceros y fuentes externas mantienen entregas propias; no declarar todo el MVP completado |

P-10, checklist y P-14 conservan los identificadores de SPEC-002/005 y no se resuelven con
estas respuestas. La fecha impresa de E3 continúa por validar.

### 9.3 Secuencia y estado de implementación

El historial previo dejó P-01/P-02 pendientes y confirmó después P-04. Las respuestas más
recientes y su aplicación están en §2.8, que reemplaza ese estado de espera para las reglas
resueltas. No interpretar las propuestas de implementación como acuerdos de las actas.

T03 (V022) y T04 están implementados. T05 incorpora completar, aprobar, observar y reabrir
por ubicación; T06 incorpora evidencia obligatoria y recuperación de subidas. T07 añade web
incremental para listado/planificación/asignación/ejecución/evidencia/revisión. Las pruebas y
límites de esta entrega se registran en `docs/planes/SPEC-200-etapa-3-revision-y-web.md`.
No se declara terminada la integración de indicadores, incidencias, Android ni publicación.
La base de trabajo no se migra como parte de esta entrega.
