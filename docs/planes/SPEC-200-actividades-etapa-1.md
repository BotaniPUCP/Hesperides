# Actividades: etapa 1 — reglas del nuevo flujo

Fecha: 18 nov 2026.

Estado: etapa 1 cerrada; requisitos y cuatro decisiones confirmados por el usuario.
Esta etapa modifica documentación, no código ni datos.

Esta secuencia de seis etapas corresponde al cambio de Intervenciones a Actividades.
No reabre R1–R6 del rediseño del mapa único ni las etapas históricas del módulo.
Contrato de referencia: [SPEC-200 §2.13](../../specs/features/SPEC-200-intervenciones.md#213-actividades-y-avance-global--18-nov-2026).

## Requisitos confirmados

### Planificación y responsabilidad

- El módulo se llama **Actividades** en la interfaz.
- Se conserva la creación con un mapa para elegir jardines completos y ejemplares.
- Se elimina Cuadrilla del formulario y del nuevo flujo operativo. El capataz no deberá
  depender de pertenecer a una cuadrilla para trabajar con este nuevo contrato.
- El formulario incorpora **Capataz responsable**, opcional.
- Sin responsable preseleccionado, el primer avance válido identifica al capataz responsable.
  Cada avance conserva su autor real, incluso cuando coincida con el responsable.
- Si ya existe responsable, solo ese capataz puede subir avances. El coordinador puede
  reasignar la responsabilidad; otro capataz no la reemplaza por registrar un avance.
- La actividad comienza Planificada. Seleccionar responsable no crea un estado Asignada.
- Se mantiene la restricción ya acordada: no ejecutar antes de la fecha planificada.

### Subir avance

- **Subir avance** es la única acción de registro de avance. No habrá Enviar a revisión.
- El registro corresponde a la actividad completa y contiene porcentaje acumulado global,
  descripción general y el estado de todos sus objetivos.
- El porcentaje lo indica el capataz: pasar de 30 a 50 significa guardar 50 %, no sumar 50.
- Se rechazan valores fuera de 0–100 %. No se calcula el porcentaje contando objetivos
  ni promediando sus superficies; su esfuerzo puede ser muy diferente.
- Cada registro guarda autor, fecha, porcentaje, descripción y detalle de objetivos.
  Los registros previos se conservan; una eventual corrección se añade al historial.
- Se eliminan Cantidad solicitada y Cantidad ejecutada del nuevo formulario operativo.
  La superficie planificada calculada en el mapa sigue siendo información, no un campo manual.

### Diferencia entre mapa de creación y mapa de avance

| Pantalla | Objetivos disponibles | Función |
|---|---|---|
| Crear actividad | Jardines y ejemplares disponibles del campus | Incorporar o retirar objetivos de la planificación |
| Subir avance | Solo los jardines y ejemplares ya incluidos en la actividad | Indicar su avance, sin agregar objetivos nuevos |

En Subir avance, el mapa interactivo aparece sobre una lista existente desde el inicio.
Mapa y lista se mantienen sincronizados:

| Control | Estado del objetivo |
|---|---|
| Checkbox desmarcado | Sin avance |
| Checkbox marcado | Terminado |
| Marcado y opción Avance parcial | Parcial; se muestra un campo para describir lo realizado |

Los tres estados deben distinguirse visualmente también en el mapa, sin depender solo del
color. Las descripciones parciales pertenecen a sus objetivos y se guardan junto al avance
global. Esto no recupera el flujo anterior de comandos, revisiones o intentos por ubicación.

**Coherencia al guardar:** 100 % requiere todos los objetivos terminados. Si todos están
terminados, el porcentaje debe ser 100 %. Un objetivo parcial o sin avance impide registrar
100 %. Se valida en el backend y se explica en la interfaz. Se guarda todo en una única
operación: porcentaje, descripción y estados de objetivos no pueden persistirse por separado.

### Estados y revisión

| Estado visible | Regla |
|---|---|
| Planificada | Todavía no se ha guardado un primer avance válido |
| En ejecución | Trabajo iniciado y porcentaje inferior al 100 % |
| Ejecutada | Avance guardado al 100 %, todos los objetivos terminados; pendiente de aprobación |
| Terminada | El coordinador aprobó la actividad completa |
| Cancelada | Cancelación registrada por el coordinador |

- Ejecutada comparte colores con En ejecución, con un ícono distinto que indique fin de ejecución.
- Terminada reemplaza la denominación anterior Validada/Aprobada. La aprobación final del
  nuevo flujo corresponde al coordinador; no se conserva la aprobación final por capataz.
- Se eliminan Asignada y Observada del nuevo flujo.
- Se eliminan el sistema de intentos, su contador y Subsanar observación.
- Las correcciones se coordinan fuera de la plataforma; no se crean observaciones nuevas
  ni ciclos de intentos. Hasta la aprobación se pueden corregir avances, incluso reducir
  el porcentaje desde 100 %. Si baja de 100 %, vuelve a En ejecución, con estados de
  objetivos coherentes y conservando el registro anterior en el historial.
- Abrir o cancelar el formulario Subir avance no modifica estado, responsable ni fecha
  de inicio. Guardar el primer avance válido inicia ejecución y asume el responsable
  si estaba vacío. Si ese primer avance es 100 %, queda directamente Ejecutada y
  conserva los registros temporales de inicio y fin de ejecución.
- Tras la aprobación final, Terminada no admite nuevos avances o correcciones en este flujo.

### Cancelación

- Puede cancelarse una actividad durante su ejecución aunque no esté completa.
- La justificación es opcional. La cancelación conserva avances e historial anteriores.
- Solo el coordinador cancela; el capataz no tiene ese permiso. No se ha autorizado cancelar actividades ya Terminadas
  ni reabrir actividades Canceladas; esas transiciones no forman parte de este alcance.

### Compatibilidad

- Los registros anteriores de cuadrillas, cantidades, observaciones, intentos y revisiones
  se conservan como historia; no se borran para adaptar la nueva interfaz.
- No se editan migraciones publicadas. La etapa 2 definirá una migración nueva y cómo
  representar los casos históricos sin inventar porcentajes ni alterar fechas/autores.
- El cambio de nombre visible no exige renombrar automáticamente rutas, tablas o códigos
  internos. La compatibilidad de API y los consumidores se revisará en etapas posteriores.
- La resolución de incidencias continúa separada de la aprobación de actividades.
- La política de fotos no se ha eliminado por este cambio. La adaptación de sus vínculos
  al historial global se diseñará conservando evidencias, sin introducir intentos nuevos.

## Decisiones confirmadas por el usuario

Confirmadas expresamente el 18 nov 2026; ya no son recomendaciones pendientes.

| ID | Decisión | Regla confirmada | Estado |
|---|---|---|---|
| D-01 | Quién cancela, incluso durante ejecución | Solo el coordinador; justificación opcional | Confirmada |
| D-02 | Quién sube avances si ya existe responsable | Solo responsable; el coordinador puede reasignar. Sin responsable, lo asume el primer capataz que guarda un avance | Confirmada |
| D-03 | Correcciones y porcentaje decreciente, incluida una actividad Ejecutada | Corregible hasta aprobación, con historial; regresar a En ejecución si baja de 100 % | Confirmada |
| D-04 | Instante de inicio con el nuevo botón Subir avance | Guardar el primer avance válido inicia ejecución; abrir/cancelar el formulario no cambia la actividad | Confirmada |
| D-05 | Actividades anteriores abiertas, aclaración posterior | Continúan con el nuevo avance global y conservan el historial; el capataz registra el porcentaje real sin deducirlo de cantidades | Confirmada |

**D-04 sustituye expresamente la indicación anterior** de iniciar al pulsar Registrar avance:
el usuario eligió iniciar al guardar el primer avance, no al abrir el formulario.

## Hallazgos del código actual

La versión revisada todavía exige cuadrilla para ejecutar, cancela solo antes del inicio,
requiere motivo de cancelación y utiliza avances y revisiones por ubicación. También
permite revisión por capataz y maneja intentos y observaciones. Todo ello deberá adaptarse
al nuevo contrato en las etapas siguientes; los cambios no son meros renombrados.

Las etapas siguientes son: modelo y compatibilidad; backend; planificación/listado;
formulario global Subir avance; verificación y entrega. No se aplican cambios de código
en esta etapa. La siguiente entrega es el modelo de datos y la compatibilidad.
