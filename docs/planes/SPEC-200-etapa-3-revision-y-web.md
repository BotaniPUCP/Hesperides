# SPEC-200 — Revisión del trabajo y primera interfaz web

Fecha: 22 oct 2026. Etapa 3: flujo propio implementado y probado. Etapa 4: interfaz
implementada, pendiente de comprobación en navegador real. No se declara entrega desplegada.

**Actualización registrada el 29 oct 2026:** el usuario confirmó posteriormente que realizó
las pruebas propuestas en navegador y que todo funcionó correctamente. Esa confirmación
cierra la comprobación manual de la entrega descrita aquí; la limitación técnica del agente
que se registra más abajo se conserva como hecho histórico. No equivale a prueba manual de
ampliaciones posteriores, como T08. No confirma migración de la base de trabajo ni despliegue.

## Reglas incorporadas

Fuente: confirmaciones del usuario después de consultar a su grupo, seguidas de la autorización
para realizar los cambios. No se atribuyen esas respuestas a las entrevistas anteriores.

- El trabajo cuenta después de la aprobación final del coordinador.
- Las fotos son obligatorias.
- El capataz es responsable del trabajo de su sector.
- Varios jardines siguen siendo una actividad con ejecución independiente por ubicación.
- Primera entrega: web a Roobert; no se deduce su cuenta o rol a partir de su nombre.

Detalles provisionales aceptados para avanzar, separados de las confirmaciones: una foto
recibida por ubicación e intento al completar; cero fotos pendientes de esa ubicación al
aprobar, incluidos intentos previos; coordinador observa y capataz reabre/corrige. No se exige
una pareja antes/después y se admite el momento UNSPECIFIED desde su catálogo.

`InterventionReviewPolicy` concentra el mínimo de evidencia y las opciones
`INTERVENTIONS_REQUIRE_PHOTO_ON_COMPLETION` / `INTERVENTIONS_BLOCK_PENDING_ON_APPROVAL`,
ambas true por defecto. Aplazar la exigencia hasta aprobación no permite aprobar sin foto.
Cambiar esos detalles no requiere una migración ni modificar fotos históricas.

## Backend

Se reutiliza V022 sin editarla ni añadir otra migración. Nuevas acciones locales:

| Ruta bajo `/api/v1/interventions/{id}/locations/{locationId}` | Permiso y efecto |
|---|---|
| POST `/complete` | Ejecutor o capataz responsable vigente; IN_PROGRESS → COMPLETED, reporte obligatorio, cantidad si hay unidad y evidencia del intento actual |
| POST `/validate` | Solo COORDINADOR; COMPLETED → VALIDATED, sin autoaprobación y con control de fotos |
| POST `/observe` | Solo COORDINADOR; COMPLETED → OBSERVED con motivo |
| POST `/reopen` | Capataz responsable vigente; OBSERVED → IN_PROGRESS con nuevo intento |

El capataz vigente de la cuadrilla también puede guardar avances y anunciar sus propias fotos
sin sustituir al ejecutor original. La subida sigue reservada al autor del anuncio con permisos
vigentes. Asignar exige que la cuadrilla tenga un capataz activo con rol SUPERVISOR.

Cada cambio bloquea cabecera y ubicación, verifica versión común y persiste estado/evento
atómicamente. La reapertura guarda snapshot anterior de fechas, cantidades, notas, rechazo
y autoría antes de limpiar los resultados actuales; fotos anteriores mantienen su intento.
No hay transferencia ni reapertura de una ubicación ya aprobada. Un cambio posterior de rol
no permite que un autor de ejecución/reportes/fotos apruebe su propio trabajo.

`approvedForCounting` es una proyección: verdadero solo con todas las ubicaciones activas
VALIDATED. No hay otra columna de estado general ni una actividad nueva por cada jardín.
El campo no es un porcentaje de cobertura, un evento externo ni el proveedor de frecuencias.
Completar/aprobar tampoco cierra incidencias.

Options agrega referencias ID/code de catálogos y listas ID/nombre de lugares/zonas, sin cambiar
los contratos existentes de esos módulos. OPERARIO obtiene referencias y ninguna cuadrilla;
los demás mantienen su alcance de lectura. Detalle agrega responsable vigente, acciones locales
y permiso de subida para presentar controles; el servicio siempre vuelve a comprobarlos.

## Web

Rutas: `/intervenciones`, `/intervenciones/nueva`, `/intervenciones/[id]` y
`/intervenciones/[id]/editar`, enlazadas desde la navegación existente.

- Listado paginado con estados, fechas y contadores de ubicaciones, sin multiplicar actividades.
- Planificación de varios lugares/secciones o puntos, clase/tipo y cantidades por unidad.
  Editar conserva referencias estables y datos de origen; reprogramar requiere motivo.
- Asignación antes del inicio y cancelación con motivo, según rol.
- Avances, cantidad final, reporte, evidencia, observación, corrección y aprobación por ubicación.
- Fotos consultadas mediante cliente autenticado y Blob privado; no se ofrecen enlaces públicos.
- Reintento de creación con la misma clave y cuerpo tras perder conexión; reintento de subida
  conserva anuncio/referencia. Un rechazo definitivo de versión permite renovar el intento.
- Conflicto de versión muestra recarga explícita que conserva el borrador del reporte.
- Formularios y tarjetas adaptables sin dependencia de mapa ni promesa de persistencia offline.

Se reutilizan sesión/refresh, componentes UI, catálogos y límites de archivo. El nuevo método
`apiClient.postWithKey` conserva la clave al refrescar sesión; no altera los métodos anteriores.
No se agregan paquetes al frontend. Se leyó AGENTS.md y la documentación instalada de Next
sobre componentes cliente y segmentos dinámicos con params asíncronos.

## Verificación

- Backend: `JAVA_HOME` del proceso en JDK 26; `mvnw.cmd -B clean test`.
  **664 pruebas aprobadas, 0 fallos, 0 errores, 0 omitidas; BUILD SUCCESS y salida 0.**
  Incluye 59 pruebas de integración de intervenciones, 8 nuevas de cierre/revisión.
- Se prueban evidencia por lugar/intento, cantidades, exclusividad del coordinador,
  autoaprobación tras cambio de rol, aprobación parcial, pendientes, snapshots de corrección,
  concurrencia aprobación/observación y rollback de aprobación al fallar el evento.
- Frontend: `npm.cmd test -- --runInBand`: **82 suites y 564 pruebas aprobadas**,
  0 fallos. Incluye 7 pruebas del flujo web, 2 del cliente API y la navegación actualizada.
  `npm.cmd run lint` y `npm.cmd run build` correctos, ambos con salida 0;
  build incluye comprobación TypeScript y las cuatro rutas nuevas.
- `git diff --check` sin errores.

Incidencias durante la verificación: Docker estaba apagado en el primer intento. Después de
iniciarlo, una ejecución sin limpiar encontró clases incompatibles en target (7 errores de
compilación diferida); recompilar desde cero con JDK 26 resolvió el problema sin cambios
adicionales en la lógica. Se comprobó la ruta absoluta de backend/target antes del clean.
Persisten los avisos conocidos de Hikari al cerrar contenedores y del cierre de la JVM de
Surefire después de System.exit(0); el resultado final del proceso es correcto.
Jest conserva avisos de act en pruebas existentes y npm informa de una actualización disponible;
no se actualizaron herramientas ni se modificaron esos tests ajenos para silenciar avisos.

Logs locales en `%TEMP%`:

- `hesperides-interventions-final-workflow-clean-tests.log`
- `hesperides-interventions-web-final-tests.log`
- `hesperides-interventions-web-final-lint.log`
- `hesperides-interventions-web-final-build.log`

Se levantaron instancias aisladas en 8088/3100 y un contenedor PostGIS desechable, sin
volúmenes, en 55439. Backend health y ruta web respondieron HTTP 200. Se cerraron las dos
instancias y ese contenedor al terminar la comprobación. Ninguna se conectó a la base de trabajo.

**Límite de validación web:** el inventario de herramientas no ofrece navegadores; crear
una pestaña integrada o Chrome devuelve «Browser is not available». No se verificaron
visualmente roles, tamaños de pantalla, interacción real con fotos ni CORS/refresh desde un
navegador. HTTP, Jest y MockMvc no sustituyen esa comprobación obligatoria de REGLAS INV-10.
T07 permanece en verificación hasta poder recorrer ese flujo en un navegador habilitado.

## Pendientes y alcance

La responsabilidad se resuelve por el supervisor vigente de la cuadrilla asignada. Esta entrega
conserva una cuadrilla por actividad; no valida automáticamente toda correspondencia territorial
ni incorpora historial temporal de esa relación. Los maestros deben estar configurados por el
equipo. Una actividad que cruce sectores con distintos capataces requiere contrato/migración
posteriores, sin dividirla automáticamente ni atribuir todos los lugares al último actor.

Siguen pendientes cobertura y fecha de cómputo para frecuencias, autorización de relevo,
revocación de aprobación, coordinación multisectorial y las integraciones de incidencias,
recursos, terceros, Android y publicación. La web priorizada no resuelve por sí sola esos módulos.
La base de trabajo continúa sin migrarse; no se desplegó ni publicó nada.
