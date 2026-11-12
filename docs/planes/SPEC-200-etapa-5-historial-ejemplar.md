# SPEC-200 — Etapa 5, T08: historial de intervenciones por ejemplar

Fecha: 29 oct 2026. T08 implementado y probado automáticamente; pendiente de comprobación
visual. La etapa 5 no se declara completa: T09 y T10 conservan sus dependencias operativas.

## Estado de las seis etapas

1. Especificación: base del flujo implementado definida; políticas provisionales identificadas.
2. Base de datos: V022 implementada y probada en bases aisladas.
3. Backend: planificación, ejecución, evidencia, corrección y aprobación implementadas.
4. Web principal: usuario confirmó pruebas manuales satisfactorias. Se registra su confirmación,
   sin atribuir esas pruebas al agente ni extenderlas automáticamente a la nueva función T08.
5. Integraciones: T08 implementado en esta entrega; frecuencias T09 e incidencias T10 pendientes.
6. Android, recursos, terceros y publicación: entregas posteriores sujetas a coordinación.

## Cambios

- Planning acepta `elementCodes` opcionales por ubicación, además de los IDs existentes.
  Resuelve códigos, valida referencias activas y conserva una asociación por ejemplar/ubicación.
  Códigos inválidos no dejan una intervención o edición parcial.
- El formulario añade ejemplares por códigos separados por comas, sin exigir IDs internos.
  Al editar conserva los IDs ya asociados; muestra `linkedElementCodes` como información.
  Ubicación con ejemplares expresos puede registrarse sin inventar punto o jardín.
- `GET /api/v1/interventions?greenElementCode=...` filtra asociaciones explícitas, antes de
  paginar y dentro del alcance actual de la cuenta. El mismo ejemplar en varios lugares de
  una actividad produce una sola fila y un solo conteo de actividad.
- El filtro se combina con zona/lugar/estado en la misma ubicación, como `greenElementId`.
  No infiere trabajos por cercanía, especie ni pertenencia al mismo jardín.
- La ficha del ejemplar agrega historial privado paginado y enlaces a detalle/listado filtrado.
  Sin sesión no se solicita ni presenta ese historial; la ficha pública sigue disponible.
- Sesión, rol o ejemplar nuevos descartan resultados anteriores. Errores del historial no
  impiden leer la ficha y permiten reintentar; una página vacía no afirma que no existan
  trabajos ajenos, solo que no hay vinculados disponibles para esa cuenta.
- El listado general conserva el código al cambiar estado/fechas/página. Los contadores
  mostrados se identifican como ubicaciones de la actividad, no cantidades del ejemplar.

Se mantienen contratos públicos del inventario y autorizaciones de SPEC-001. No se crea otra
migración, no se cambian geometrías y no se implementan indicadores ni incidencias.

## Verificación

- Backend: JDK 26, Maven Wrapper `clean test`, solo bases Testcontainers/PostGIS aisladas.
  **667 pruebas aprobadas, 0 fallos, 0 errores, 0 omitidas; salida 0.** Incluye 62 de
  intervenciones: tres nuevas de asociación por código, atomicidad/validación y consulta
  por código con roles, múltiples ubicaciones, paginación y bajas de asociaciones.
- Frontend: **83 suites / 571 pruebas aprobadas**, salida 0. Se agregan seis pruebas de
  historial, privacidad, cambio de lector/ejemplar, recuperación y filtros, más una del
  cliente API; se amplía la prueba de planificación para los códigos.
- `npm.cmd run lint` y `npm.cmd run build` correctos, salida 0; build comprueba TypeScript.
- `git diff --check` correcto.

Logs en `%TEMP%`: `hesperides-t08-backend-tests.log`, `hesperides-t08-frontend-tests.log`,
`hesperides-t08-frontend-lint.log` y `hesperides-t08-frontend-build.log`.
Se conservan los avisos conocidos de Hikari/Surefire al cerrar contenedores y los de act en
pruebas existentes; no alteraron la aprobación de las suites.

## Comprobación visual pendiente

Se prepararon instancias separadas en 18088/13100 y PostGIS desechable en 55440, sin volúmenes
de trabajo. La herramienta Computer Use se detuvo al no poder determinar con suficiente
certeza la URL actual de Chrome para aplicar su política. No hubo acciones posteriores sobre
el navegador ni se afirma haber probado esta ampliación visualmente. Se cerraron las dos
instancias y ese contenedor; no se conectaron a la base de trabajo.

Recorrido manual para T08 en el entorno aislado habitual:

1. Copiar dos códigos reales desde fichas de ejemplares del inventario.
2. Crear o editar una actividad aún no iniciada: asociar el primer código en dos ubicaciones
   y el segundo en una de ellas usando el campo de ejemplares. Guardar y asignar cuadrilla.
3. Abrir la ficha de cada ejemplar con sesión: la actividad aparece una vez. Abrir su detalle
   y el listado filtrado; comprobar que el filtro de ejemplar se conserva al cambiar estado.
4. Comprobar el alcance con capataz/operario; cerrar sesión y verificar que la ficha pública
   sigue accesible sin mostrar historial privado.
5. Intentar asociar un código inexistente: debe rechazarse sin dejar cambios parciales.

## Dependencias que siguen abiertas

T09 necesita unidad de cobertura y fecha de cómputo de mantenimiento; aprobación final ya
está confirmada, pero no convierte cada jardín en una cobertura completa del campus.
T10 necesita coordinación con el módulo de incidencias y existencia de sus tablas/servicios.
Relevo, revocación de aprobación y asignación multisectorial mantienen sus límites anteriores.
No se migró la base de trabajo, no se hizo commit ni se publicó/desplegó esta entrega.
