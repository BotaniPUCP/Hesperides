# Actividades: etapa 2 — modelo global y compatibilidad

Fecha: 18 nov 2026. Etapa 2 completada y verificada. Implementación aditiva;
el flujo web todavía no se activa.

## Decisión de compatibilidad

V072 añade tablas nuevas, sin actualizar actividades, ubicaciones, evidencias, intentos,
observaciones ni catálogos anteriores. Una actividad sin fila en `activity_executions`
pertenece al contrato anterior. La etapa 3 deberá reconocer explícitamente ambos modelos;
no puede tratar la ausencia de un porcentaje histórico como cero o como 100 %.

No se convierten cantidades a porcentajes, no se asignan capataces a partir de miembros
operarios de cuadrillas y no se inventan fechas de ejecución. La incorporación de una
actividad antigua al modelo nuevo, si se habilita, requerirá un flujo explícito y un
avance completo informado, conservando la historia previa. No hay conversión automática.

## Estructuras añadidas

| Tabla / entidad | Propósito |
|---|---|
| `activity_executions` / `ActivityExecution` | Una fila por actividad incorporada al nuevo modelo: responsable opcional sin cuadrilla, versión de concurrencia, porcentaje vigente, estado y fechas de inicio, fin de ejecución, aprobación o cancelación |
| `activity_progress_entries` / `ActivityProgressEntry` | Historial inmutable de avances: UUID permanente de solicitud, hash del cuerpo, autor real, fecha, porcentaje acumulado y descripción |
| `activity_progress_targets` / `ActivityProgressTarget` | Instantánea completa por avance de los objetivos incluidos: sin avance, parcial con descripción, o terminado |
| `activity_evidences` / `ActivityEvidence` | Evidencias del modelo global, sin número de intento; vínculo a la actividad y opcionalmente a un avance y/o un objetivo |

La planificación y la identidad siguen en `interventions`; los objetivos y sus contornos
planificados siguen en `intervention_locations` / `intervention_elements`. No se duplican
maestros ni se modifican lugares, zonas, ejemplares, reservas o incidencias.

Los registros de fotos pueden anunciarse antes de asociarlos al avance guardado. Esto
prepara el soporte técnico sin decidir nuevas cuotas u obligatoriedad de fotos: las reglas
de recepción y autorización serán responsabilidad del servicio en la etapa 3. Las fotos
anteriores permanecen en `intervention_evidences` con sus vínculos y metadatos intactos.

## Catálogos aislados

- `ACTIVITY_STATUS`: `PLANNED` (Planificada), `IN_PROGRESS` (En ejecución),
  `EXECUTED` (Ejecutada), `FINISHED` (Terminada), `CANCELLED` (Cancelada).
- `ACTIVITY_TARGET_STATUS`: `NOT_STARTED`, `PARTIAL`, `COMPLETED`.

No se renombran ni desactivan códigos del catálogo anterior `INTERVENTION_STATUS`.
Así se evita reinterpretar revisiones históricas o romper consumidores existentes antes
de adaptar su lógica. No se añaden enums de dominio Java.

## Integridad y auditoría

- Porcentajes numéricos entre 0 y 100, con hasta dos decimales; null en la cabecera significa
  que aún no se guardó avance. No hay valor cero aplicado a trabajos históricos.
- Un responsable no implica cuadrilla. Se preserva la restricción de asignación del modelo
  anterior; la responsabilidad nueva reside en una columna distinta.
- Cada avance debe incluir todos los objetivos activos una sola vez, sin mezclar actividades.
  Una restricción diferida permite insertar cabecera y objetivos en la misma transacción.
- Cien por ciento equivale a todos los objetivos terminados. No se acepta una cabecera
  aislada, 100 % con parciales ni todos terminados con menos del 100 %.
- Solo los objetivos parciales tienen descripción parcial, obligatoria y no vacía.
- Los avances y sus instantáneas rechazan UPDATE, DELETE y baja lógica. Corregir un avance
  significa insertar otro; puede disminuir el porcentaje sin reescribir el anterior.
- El UUID de solicitud es único de forma permanente; la etapa 3 comprobará el hash en
  reintentos y evitará duplicar un registro ante respuestas perdidas.
- Las fechas y el porcentaje deben ser coherentes con el estado de la cabecera. La
  justificación de cancelación admite null y conserva el porcentaje anterior.
- Las evidencias no pueden vincular un avance o un objetivo de otra actividad.

Estas restricciones no sustituyen la autorización ni las transiciones del servicio:
solo el coordinador cancela/aprueba; solo el responsable registra avances; el inicio
respeta fecha planificada. La etapa 3 implementará esas reglas y guardará en una única
transacción la cabecera vigente y la instantánea del avance, bloqueando/versionando la
actividad para evitar dos responsables iniciales o cambios concurrentes incompatibles.

## Alcance de entrega

- Migración nueva: `V072__activity_global_progress_model.sql`.
- Entidades JPA nuevas, todas derivadas de `BaseEntity`.
- Prueba de migración V071→V072 y restricciones en PostGIS temporal.
- Sin cambios en rutas, DTO de los endpoints existentes, permisos, interfaz ni despliegue.
- V072 no se aplica a la base persistente local o desplegada durante esta etapa.

## Verificación realizada

Nueve pruebas aprobadas, sin fallos ni omisiones:

- Siete casos de `ActivityProgressModelMigrationTest`: actualización V071→V072,
  historia intacta, responsable sin cuadrilla, corrección 100→40 sin reescritura,
  rollback de avances incompletos/incoherentes, aislamiento de objetivos/evidencias,
  fechas y cancelación con motivo opcional.
- `InterventionZoneSelectionsMigrationTest`: conserva el contrato y datos anteriores
  durante la actualización al esquema más reciente.
- `InterventionsIntegrationTest#idempotentRetryDoesNotDuplicateAndChangedBodyConflicts`:
  arranque real de Spring/JPA con las cuatro entidades nuevas, creación anterior y
  reintento idempotente compatibles. También se verifica que cambiar el cuerpo con
  la misma clave siga produciendo conflicto.

La compilación Java y `git diff --check` finalizaron correctamente. Las bases utilizadas
son efímeras de Testcontainers; no se reconstruyó ni migró el backend persistente.

La etapa 3 debe implementar servicios, autorización, transiciones y lectura compatibles.
Esta entrega prepara el almacenamiento; no presenta esas operaciones como implementadas.
