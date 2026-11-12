# SPEC-200 — Etapa 3, T05 parcial: inicio y avance por ubicación

Fecha: 22 oct 2026. Continúa T04 conforme a SPEC-200 §§3.1, 3.3, 3.5 y 5.
La continuación posterior de [evidencia por ubicación](SPEC-200-etapa-3-evidencia.md)
se registra en T06; este informe conserva el alcance/resultados de T05 parcial.
Implementa únicamente las dos acciones con precondiciones ya definidas; T05 y la etapa 3
conservan pendientes finalización/revisión y evidencia. No se cambian las políticas P-01/P-02/P-03.

## Comportamiento implementado

| Ruta bajo `/api/v1/interventions` | Cuerpo | Resultado |
|---|---|---|
| `POST /{id}/locations/{locationId}/start` | `{"version":1}` | Esa ubicación pasa ASSIGNED → IN_PROGRESS, intento 1, autor y fecha del servidor |
| `PUT /{id}/locations/{locationId}/execution` | `{"version":2,"progressQuantity":1.125,"executionNotes":"Avance del jardín A"}` | Sustituye avance/notas de esa ubicación en IN_PROGRESS; mantiene cantidad final desconocida |

Ambas devuelven detalle actualizado en el sobre común y HTTP 200. Solo SUPERVISOR/OPERARIO
vigentes pueden ejecutar: supervisor en la cuadrilla que supervisa; operario asignado y
actualmente perteneciente a esa cuadrilla. ADMIN/COORDINADOR no ejecutan. Guardar avance
requiere además ser el ejecutor real de ese intento; una persona no toma la autoría de otra.
Una salida de cuadrilla, cambio de supervisión, rol o desactivación se comprueba de nuevo.

Se bloquean cabecera y después ubicación, verificando pertenencia y baja lógica. Un lugar de
otro trabajo devuelve 404 incluso si ambos son visibles. Todos los comandos comparten la
versión de cabecera y la aumentan una vez; versión antigua → 409. Una transición imposible
devuelve 422, sin incrementar versión ni agregar eventos. No hay inicio o avance globales.

Iniciar A no inicia B/C. El resumen general pasa a IN_PROGRESS, conservando planificación
ASSIGNED y cantidades finales nulas. El inicio de cualquier lugar impide editar planificación,
reasignar o cancelar el trabajo. No se reinicia una ubicación iniciada ni se reabre OBSERVED.
Fechas de inicio/eventos se fijan con precisión de microsegundos para evitar diferencias al
recargar desde PostgreSQL. No se requiere una foto para iniciar o guardar avance.

El avance acepta cantidades no negativas de hasta tres decimales y notas opcionales de hasta
4000 caracteres. Una cantidad exige unidad local. Se admiten cero, corrección del avance y
valores sobre lo pedido, sin truncar ni completar automáticamente. PUT reemplaza ambos
campos: un valor omitido/nulo se guarda como desconocido/nulo. No cambia inicio, intento,
ejecutor, fechas de finalización/revisión ni cantidad ejecutada. No calcula cumplimiento.

STARTED y PROGRESS_SAVED se guardan en la misma transacción que ubicación/versión. Cada
evento incluye lugar, intento, actor y estados locales; el guardado conserva avance/notas
anteriores y nuevos. No se modifican lugares, geometrías ni inventario maestros.

## Verificación

Las pruebas nuevas se agregan a InterventionsIntegrationTest y utilizan un contenedor
PostGIS exclusivo con peticiones HTTP y transacciones reales. Cubren independencia entre
ubicaciones y autores, permisos vigentes, referencias ajenas/retiradas, validación, estados,
inmutabilidad de campos finales, fechas estables, bloqueo de planificación, carreras de
inicio/avance, conflicto de versiones e historial local.

Una prueba instala temporalmente un trigger que rechaza PROGRESS_SAVED en esa base de
pruebas: comprueba rollback de avance, notas y versión y reintento tras retirar el trigger.
El trigger no forma parte de la aplicación ni de ninguna migración.

Comandos desde backend, seleccionando JDK 26 solo para el proceso:

```powershell
.\mvnw.cmd -B clean -Dtest=InterventionsIntegrationTest test
.\mvnw.cmd -B clean test
```

Resultados: **35 pruebas específicas aprobadas** (las 23 de T04 más 12 nuevas) y
**640 pruebas aprobadas en la suite completa**, con 0 fallos, 0 errores y 0 omitidas.
Maven BUILD SUCCESS, salida 0, duración 5 min 6 s. La regresión incluye migraciones,
autenticación/renovación, usuarios, catálogos, frecuencias, mapa, lugares, inventario,
importaciones y almacenamiento/fotos. `git diff --check` sin incidencias.

Como ya se observó en la referencia inicial, Surefire informó que terminó el JVM de pruebas
tras esperar 30 segundos después de System.exit(0). La ejecución final devolvió salida 0
y BUILD SUCCESS; no se modificó infraestructura de pruebas ajena a esta entrega.

## Límites

No se creó ni editó SQL de migración: V022 ya contiene estos campos. No se aplicó a la base
de trabajo ni se ejecutó la aplicación contra ella. No se implementaron completar, validar,
observar, reabrir, relevar, fotos, indicadores, publicación, incidencias ni frontend.
P-02 sigue definiendo las condiciones de finalización/validación y P-03 las correcciones.
P-01 sigue definiendo qué cuenta como mantenimiento y con qué cobertura.
El detalle sigue declarando la integración con incidencias no disponible; no cierra solicitudes.

No se repitió frontend sin cambios en sus archivos. La verificación en navegador real del
flujo web y las pantallas corresponde a T07; las pruebas HTTP no la sustituyen.
