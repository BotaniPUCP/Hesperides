# SPEC-200 — Incidencias: captura, aprobación y atención

## Objetivo y alcance

Permitir informar desde el navegador del celular con un solo texto, aprobar el
registro en coordinación y seguir su atención hasta la resolución. Prueba de
concepto sin IA; React Native queda para después de validar este recorrido.

## Comportamiento aprobado

- `SUPERVISOR` representa al capataz; `COORDINADOR` revisa y aprueba.
- Solo la descripción es obligatoria al enviar. Un texto breve es válido.
  Fotografías, referencia textual y coordenadas son opcionales. No se exige
  título, categoría, urgencia, catastro ni disponibilidad de un mapa.
- El servidor toma autor, canal (`WEB`) y hora de recepción. Esta última no
  representa necesariamente la hora del suceso. Conserva la descripción original.
- El mismo registro pasa por `PENDING_APPROVAL` → `OPEN` → `IN_PROGRESS` →
  `RESOLVED`. Solo desde `OPEN` se inicia la atención; registrar un trabajo
  ejecutado también la inicia. Aprobar no equivale a empezar el trabajo.
- Coordinación revisa texto, referencia, categoría, urgencia y cuadrilla. La
  aprobación admite categoría/urgencia/ubicación desconocidas. La asignación puede
  completarse después. Si el remitente dirige una única cuadrilla activa, se
  propone automáticamente; si no, queda sin asignar.
- El capataz consulta sus envíos y las incidencias de las cuadrillas que dirige
  actualmente; solo atiende/resuelve las asignadas a esas cuadrillas. Coordinación
  consulta y atiende todas. El resto de roles no accede a esta prueba de concepto.
- Una incidencia admite varias intervenciones. Coordinación puede planificar
  (`ASSIGNED`) y ambos perfiles pueden registrar trabajo realizado (`COMPLETED`)
  en su alcance. El tipo de actividad es opcional y se toma del catálogo existente.
- Resolver exige aprobación, al menos una intervención ejecutada y ninguna
  intervención pendiente. La ejecución parcial no cierra automáticamente el caso.
- Los datos estructurados y el historial no sustituyen al mensaje original.
  Las modificaciones de revisión/asignación usan versión para evitar sobrescribir
  cambios concurrentes. Las transiciones se serializan por incidencia.
- El tablero solo cuenta estas incidencias y sus intervenciones. Los cuatro
  contadores de incidencias son excluyentes; «intervenciones realizadas» cuenta
  filas `COMPLETED`, nunca incidencias ni actividades simplemente planificadas.

## Decisiones mínimas

Backend Spring existente, PostgreSQL, web Next y cliente HTTP central. Nuevas
tablas `incidents`, `interventions`, `incident_status_history`, `incident_photos`.
La migración es `V022__create_incident_workflow.sql`, posterior al baseline y a
V002–V021 de develop; no se modifican esas migraciones publicadas. La versión V010
de la rama anterior solo se usó con datos de demostración desechables.
Estados/categorías/urgencia son catálogos. Latitud/longitud opcionales como números
con límites y presencia conjunta; no se incorpora el catastro para guardar un punto.
Fotos JPEG/PNG/WebP, hasta 5 MiB cada una y 6 por incidencia, en el `FileStorage`
compartido bajo claves `incidents/{uuid}`: directorio `STORAGE_LOCAL_DIR` o bucket
privado S3. Se conservan los bytes originales, sin conversión JPEG. Las claves UUID
de los archivos siempre llevan el prefijo `incidents/` y se leen únicamente desde
ese almacenamiento. En Compose local residen en `/data/storage/incidents/`.
No se requiere otra migración ni se modifica V022.
Lectura autenticada y autorizada por incidencia, con `Cache-Control: no-store`;
no se reutiliza el helper de entrega pública de fotos del catastro.
La API devuelve el contenido de cada foto en base64 dentro del sobre habitual.

La captura se guarda antes de subir fotos. Cada foto se puede reintentar sin
duplicarla; el usuario ve los fallos y puede continuar con el texto ya recibido.
No se promete sincronización sin conexión: un envío fallido conserva el formulario.

La navegación web usa `/incidencias`, `/incidencias/nueva` y `/incidencias/{id}`
dentro del dashboard, con guard de roles común y breadcrumbs. Búsqueda, estado y
página viajan en la URL para conservarlos al volver o recargar. Consultas mediante
hooks sobre `useRequest`, independientes para lista, opciones y resumen; un fallo
de opciones o resumen no oculta los registros. La presentación reutiliza los tokens
claro/oscuro y los controles compartidos de SPEC-C01 (`Input`/`Select` grandes,
`Textarea`, `Card`, badges y skeletons). No introduce otra paleta ni dependencias.

Compose base conserva `pgdata` y `storage`; dev añade recarga de frontend/shared/services,
no almacenamiento desechable automático. La demostración usa esos mismos archivos:
`up -d --build db backend` y Bun local para el frontend. Al terminar, `down --volumes`
descarta explícitamente toda la BD y las fotos locales de ese proyecto; `stop`
no las elimina. El siguiente arranque con dev vuelve a cargar esquema y fixtures.
No se usa otro override ni `tmpfs`; las fotos de prueba deben usar almacenamiento local.

Prellenado determinista conservador: datos de sesión, cuadrilla inequívoca y
patrones explícitos como «rama caída», «fuga de agua», «hojarasca». No se infiere
urgencia ni coordenadas. Categorías provisionales, marcadas en la UI; se omite
la sugerencia en mensajes con negación. Sin motor de reglas ni servicio externo.

## Datos de demostración

El perfil `dev` añade `classpath:db/dev-migration` a las ubicaciones Flyway. La
migración repetible `R__seed_demo_incidents.sql` es la única fuente de los fixtures:
se ejecuta después de las migraciones versionadas, en bases nuevas y cuando cambia
su checksum. No duplica ni restablece registros existentes. La configuración común
sin dev no carga esas cuentas ni casos. El seed no requiere tablas nuevas ni otra
migración versionada adicional a V022; se conserva la numeración del esquema.

Verificación: el arranque con dev deja ocho incidencias y doce intervenciones;
un segundo `migrate()` sin cambios no ejecuta migraciones. Sin dev no aparecen
cuentas demo ni la migración repetible en el historial.

Comprobado el 22 de octubre de 2026 con `mvn -B verify`: **215 pruebas backend**
sin fallos, incluidas la carga automática, su exclusión sin dev y la conservación
de cambios al repetir el SQL.

## Contratos

Todas las rutas bajo `/api/v1/incidents`; sobre `{ok,message,data}`.
Tipos exactos publicados en `shared/types/incidents.ts` y DTOs Java homólogos.

| Método / ruta | Operación |
|---|---|
| GET `/` | Lista paginada, `search`, `status`, tamaño máximo 50 |
| POST `/` | Texto y ubicación opcional; `Idempotency-Key` UUID obligatorio técnico |
| GET `/options` | Estados, categorías, urgencias, actividades y cuadrillas visibles |
| GET `/summary` | Contadores globales para coordinación |
| GET `/{id}` | Detalle, fotos (metadatos), intervenciones e historial |
| PUT `/{id}` | Revisión/asignación por coordinación, `version` obligatorio |
| POST `/{id}/approve` | Aprobar por coordinación, idempotente |
| POST `/{id}/start` | Iniciar atención en el alcance autorizado |
| POST `/{id}/resolve` | Resolver explícitamente, idempotente |
| POST `/{id}/interventions` | Planificar o registrar ejecución; referencia UUID |
| POST `/{id}/interventions/{workId}/complete` | Completar intervención, idempotente |
| POST `/{id}/photos` | Multipart `file`, `clientReference` UUID |
| GET `/{id}/photos/{photoId}` | Contenido autorizado |

Reusar clave con distinto contenido devuelve 409. La creación devuelve 201,
la repetición 200. Las fotos/intervenciones también conservan referencia y huella.
Un recurso fuera del alcance devuelve 404; un rol sin permiso devuelve 403.

## Escenarios de aceptación

1. Enviar «Rama caída en puerta principal» sin campos adicionales guarda un
   registro pendiente y muestra confirmación, autor y hora del servidor.
2. Reenviar la misma petición con la misma clave devuelve el mismo ID; cambiar
   el contenido con esa clave devuelve 409, incluso con peticiones concurrentes.
3. Capataz no aprueba; coordinación sí. Repetir aprobación no duplica historial.
4. Capataz de otra cuadrilla no puede consultar un caso ajeno ni ejecutar acciones
   sobre él, incluida la lectura/subida de fotografías.
5. Editar con versión antigua devuelve 409 y mantiene los datos vigentes.
6. Resolver con atención pendiente o sin intervención ejecutada devuelve 422.
   Completar una de dos intervenciones no resuelve; completar ambas permite cerrar.
7. Los contadores reflejan las transiciones y cuentan dos trabajos como dos
   intervenciones, manteniendo una única incidencia.
8. Cámara/ubicación se solicitan solo tras una acción explícita. Denegar ubicación
   permite enviar texto. Una foto fallida conserva el envío y permite reintentar.
9. Reiniciar backend conserva fotos en el directorio/volumen configurado.
10. Navegador real: envío, revisión, aprobación, ejecución y resolución; interfaz
    usable a 390 px, sin scroll horizontal ni bloqueo CORS.

## Enmiendas

Este spec sustituye el diseño preliminar de incidencias de SPEC-002 §4.8 y ajusta
SPEC-001 Anexo A para los dos perfiles de esta entrega. La API de lectura de
opciones es local al módulo; no implementa la administración de catálogos completa.

## Tareas

- [x] Migraciones, entidades, DTOs y contratos compartidos.
- [x] Autorización por cuadrilla, transiciones y reintentos idempotentes.
- [x] Captura, listado, revisión, atención y tablero web.
- [x] Fotografías persistentes y ubicación opcional.
- [x] Pruebas de flujo, permisos, concurrencia y errores de adjuntos.
- [x] Verificación backend/frontend y navegador; documentación de demostración.

## Verificación técnica — 17 de octubre de 2026

- `mvn -B verify`, JDK 25 y Podman: **213 pruebas**, sin fallos.
- Bun 1.4.3: lint limpio, **211 pruebas web** y build de Next 16.3.4 correctos.
- Firefox real mediante WebDriver BiDi, viewport 390×844, API y PostgreSQL
  aislados: texto mínimo, foto, permiso de ubicación denegado, aprobación,
  planificación de dos intervenciones, ejecución parcial, resolución, permisos
  entre cuadrillas y contadores comprobados. Sin errores de red/CORS.
- Reinicio del proceso Java: la incidencia y los bytes de la foto permanecen.
- Los logs del navegador revelaron un fallo previo al interpretar el 204 vacío
  de logout como JSON. Cliente corregido y cubierto por prueba de regresión.
- Pendiente: validación del cliente, matriz real y prueba física en Android.

## Verificación del realineamiento — 24 de octubre de 2026

- `mvn -B verify`, JDK 25 y API de Podman: **606 pruebas backend**, sin fallos.
- Bun 1.4.4: **606 pruebas frontend**, lint y build de Next 16.3.4 correctos.
- Firefox real/BiDi, 390×844 y 1440×1000: tema claro/oscuro, tamaños de controles,
  captura, detalle enlazable, recarga y Back con filtros; sin scroll horizontal.
- Foto fallida y reintentada sin recrear la incidencia; bytes originales en el
  almacenamiento compartido y acceso privado. Ubicación denegada no bloquea el envío.
- Aprobación, dos intervenciones planificadas, ejecución parcial y resolución por
  capataz, acceso denegado entre cuadrillas y totales de coordinación comprobados.
- Reinicio del backend: se conservan el estado de la incidencia y los bytes de la
  fotografía, que siguen siendo accesibles por su API privada.
- 47 preflights del navegador sin errores; Compose base/dev validado con
  persistencia y recarga de código, sin montajes duplicados. No se alteraron migraciones.
- Lectura de fotos y limpieza en rollback cubiertas por `IncidentFilesTest`.
  S3 se comprueba mediante la abstracción de almacenamiento, no con un bucket real.
