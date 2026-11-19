# Actividades: etapa 3 — servicios y avance global

Fecha: 18 nov 2026.

Contrato: [reglas confirmadas](SPEC-200-actividades-etapa-1.md) y
[modelo V072](SPEC-200-actividades-etapa-2.md). Esta entrega implementa el backend;
las pantallas actuales todavía usan el contrato anterior. No se convierten actividades
históricas ni se aplica V072 a una base persistente durante esta entrega.

## API del nuevo flujo

Todas las operaciones usan `/api/v1/activities` y el sobre habitual `{ok,message,data}`.
Los códigos de rol son los existentes: SUPERVISOR representa al capataz.

| Método y ruta relativa | Función y permiso |
|---|---|
| GET `/` | Listado paginado por estado; coordinación/administración ven todas, cada capataz ve las propias y las planificadas sin responsable |
| GET `/options` | Catálogos y estados; los responsables disponibles se entregan solo a coordinación/administración |
| GET `/{id}` | Planificación, objetivos, porcentaje, autoría, historial, evidencias, incidencias vinculadas y acciones permitidas, según alcance |
| POST `/` | Crear Planificada, responsable opcional, sin cuadrilla; ADMIN/COORDINADOR; cabecera UUID `Idempotency-Key` obligatoria |
| PUT `/{id}/planning` | Editar antes del primer avance; ADMIN/COORDINADOR; cambiar responsable requiere COORDINADOR |
| PUT `/{id}/responsible` | Reasignar; solo COORDINADOR; después del inicio no puede dejarse vacío |
| POST `/{id}/progress` | Guardar avance global; solo capataz responsable, o primer capataz si todavía está libre |
| POST `/{id}/approve` | Ejecutada → Terminada; solo COORDINADOR |
| POST `/{id}/cancel` | Cancelar incluso durante ejecución; solo COORDINADOR; motivo opcional |
| POST `/{id}/evidences` | Anunciar una foto del avance, opcionalmente asociada a un objetivo; capataz autorizado |
| PUT `/{id}/evidences/{evidenceId}/file` | Recibir archivo multipart `file`; autor de la foto y capataz autorizado |
| GET `/{id}/evidences/{evidenceId}/file` | Archivo privado, con autorización sobre la actividad y sin caché |

La creación/edición recibe `{planning: <Planning existente>, responsibleSupervisorUserId}`.
Se exige `campusSelectionRevision`: se reutiliza la validación espacial del mapa único,
clase/tipo, fecha programada, maquinaria y los vínculos con incidencias ya implementados.
No se crea un segundo servicio de relación con incidencias.

Avance global, ejemplo del cuerpo:

```json
{
  "version": 2,
  "clientReference": "f4349fc4-dba2-4a5b-ab9b-d320ef5911c5",
  "percentage": 40,
  "description": "Se completó el jardín y se inició la poda del ejemplar.",
  "targets": [
    {"locationId": 101, "statusCode": "COMPLETED"},
    {"locationId": 102, "statusCode": "PARTIAL", "partialDescription": "Faltan las ramas superiores."}
  ],
  "evidenceIds": []
}
```

Los IDs del ejemplo deben sustituirse por objetivos reales de la actividad. Cada avance
incluye exactamente todos los objetivos activos, sin repetidos ni objetivos ajenos.
NOT_STARTED significa sin avance; COMPLETED, terminado; PARTIAL exige descripción propia.
La descripción parcial no se admite en los otros dos estados.

## Guardado y estados

- El primer avance válido guardado fija inicio y responsable, cuando estaba vacío.
  Abrir el formulario o anunciar/subir fotos no inicia ni asigna trabajo.
- El porcentaje acumulado manual admite dos decimales y valores entre 0 y 100.
  Menos de 100 deja IN_PROGRESS; 100 exige todos los objetivos COMPLETED y deja EXECUTED.
  Si todos están COMPLETED, debe declararse 100.
- Antes de aprobar se permite corregir hacia arriba o abajo, también desde 100.
  Bajar de 100 borra el fin vigente y vuelve a IN_PROGRESS, conservando la instantánea
  anterior con su fecha y autor. Nunca se modifica el avance anterior.
- Aprobar cambia a FINISHED, registra coordinador y fecha, y bloquea avances posteriores.
  Se conserva la prohibición anterior de aprobar ejecución reportada por uno mismo.
- Cancelar registra coordinador, fecha y motivo opcional, preserva porcentaje/historial
  y bloquea nuevos avances. No se cancela FINISHED ni se reabre CANCELLED.
- Se mantiene la restricción de ejecución anterior a la fecha planificada.

Cada comando bloquea primero `interventions` y después `activity_executions`, siguiendo
el orden utilizado por el cierre de incidencias. Se valida `version` antes de modificar.
La cabecera global, instantánea completa, responsable, proyección compatible y evento
se guardan en una transacción. Si falla una parte, se revierte toda la operación.

El UUID del avance tiene unicidad permanente y hash del cuerpo. Repetir la misma solicitud
autorizada devuelve el estado vigente sin duplicar historia; cambiar contenido, actividad
o autor con ese UUID produce conflicto. Los bloqueos de referencia y de fila cubren
reintentos y la carrera de dos capataces intentando asumir la misma actividad.

## Fotos

Se utiliza el almacenamiento privado y validador existentes: JPEG, PNG o WebP, máximo
25 MB. La API no revela claves de almacenamiento. La referencia de foto es idempotente,
el archivo recibido es inmutable y su lectura requiere acceso actual a la actividad.
Si falla la transacción de una carga nueva, se intenta retirar el archivo sin confirmar.

Las fotos se anuncian y reciben primero; un avance las incorpora mediante `evidenceIds`.
Solo se vinculan fotos recibidas, del mismo autor, sin avance previo y de esa actividad.
Los borradores no vinculados no forman parte de un avance guardado ni cambian su estado.
Anunciar o recibir una foto incrementa la versión de la actividad: antes de guardar el
avance, el cliente debe volver a consultar el detalle para utilizar su versión vigente.
No se crean intentos nuevos. Por defecto, guardar 100 % requiere al menos una foto
recibida por objetivo; se respeta `interventions.review.require-photo-on-completion`.
La aprobación siempre exige cobertura fotográfica por objetivo, como el flujo anterior;
el bloqueo por fotos vinculadas pendientes respeta `block-pending-on-approval`.

## Compatibilidad

Las actividades sin `activity_executions` continúan con el contrato anterior, sus
cuadrillas, cantidades, intentos y evidencias. No se inventan porcentajes históricos.
El nuevo listado contiene solo el contrato global; las etapas web deben distinguir
registros históricos usando `activityWorkflow` en las consultas anteriores.

Las lecturas anteriores proyectan EXECUTED como COMPLETED y FINISHED como VALIDATED.
Inicio, ejecución y aprobación proceden de la cabecera global. Las ubicaciones conservan
una proyección de estado/fechas para consultas existentes de incidencias e indicadores,
sin inventar cantidades ni escribir avances por ubicación o nuevos intentos.
El evento global usa los códigos de estado compatibles del catálogo anterior.

La actividad Ejecutada no basta para resolver una incidencia: el contrato existente
exige trabajo VALIDATED, equivalente a Terminada después de aprobar el coordinador.
La resolución y su descripción permanecen en incidencias. No hay cierre automático.
Se adapta el alcance de consulta del vínculo al responsable global, sin exigir cuadrilla.

Los comandos antiguos de mutación rechazan actividades globales con conflicto: deben
utilizar esta API para evitar avances por ubicación, observaciones, intentos o revisión
por capataz que contradigan el contrato nuevo. Las lecturas anteriores siguen disponibles.

## Verificación y siguientes pasos

La verificación utiliza PostgreSQL/PostGIS efímero con Testcontainers y HTTP MockMvc.
Se aprobaron **138 pruebas distintas**, sin fallos ni omisiones:

- 15 de `ActivitiesIntegrationTest`: guardado inicial y responsabilidad sin cuadrilla,
  coherencia de porcentaje/objetivos, permisos, fechas, corrección desde 100, aprobación,
  cancelación durante ejecución, fotos privadas, reintentos, versiones, reasignación,
  concurrencia, edición y rollback completo ante un fallo posterior al guardado.
  Incluyen lectura del trabajo aceptado por su responsable y proyección para incidencias.
- 90 de `InterventionsIntegrationTest`: regresión del contrato anterior.
- 10 de `IncidentLinksAndClosureIntegrationTest`: vínculos y cierre independientes.
- 16 de `InterventionZoneSelectionsIntegrationTest`: selección espacial anterior.
- 7 de `ActivityProgressModelMigrationTest`: modelo V072 y restricciones históricas.

La suite principal cerró con 137 pruebas aprobadas. Tras los últimos ajustes de alcance
y política fotográfica, se repitieron las 90 de intervenciones y las 10 de incidencias
junto a las 15 del flujo nuevo: 115 aprobadas, BUILD SUCCESS. El total de 138 no suma
dos veces las pruebas repetidas. Compilación Java 26 y `git diff --check` correctos.
No se levantó/reconstruyó el backend habitual ni se migró una base persistente.

Siguen etapa 4 (nombre visible, planificación/listado sin cuadrilla y responsable opcional)
y etapa 5 (Subir avance con mapa/lista sincronizados, porcentaje y descripción). No se
presenta todavía una verificación visual del flujo nuevo ni se adapta la demo desplegada.
