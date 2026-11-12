# SPEC-200 — Preparación de T09: integración con frecuencias

Fecha: 29 oct 2026. Estado: revisión técnica y preguntas operativas preparadas; proveedor
real sin implementar ni habilitar. No se modifican resultados de cumplimiento.

**Actualización posterior del mismo día:** el usuario resolvió las preguntas: actualizar solo
los lugares atendidos y usar tanto fecha real como fecha de aprobación. Este documento conserva
la preparación histórica; la implementación local y sus límites se registran en
[T09](SPEC-200-etapa-5-frecuencias-locales.md). La decisión posterior reemplaza la espera anterior.

## Lo confirmado

- Una actividad puede abarcar varias ubicaciones, cada una con ejecución propia.
- El trabajo cuenta después de la aprobación final del coordinador: todas sus ubicaciones
  activas deben estar VALIDATED. Una aprobación parcial no acepta todo el trabajo.
- La fecha física de ejecución está en `intervention_locations.completed_at`; la de
  aprobación local está en `validated_at`. `interventions.executed_at` no existe.
- La cobertura y fecha civil de cómputo para frecuencias no fueron respondidas todavía.

## Hallazgos técnicos

`ExecutionHistoryProvider.executionDates(activityTypeItemId, regime, from, to)` recibe solo
actividad, régimen y periodo; no recibe ubicación, sector ni identidad de ejecución.
`ComplianceReader` usa ese mismo historial de fechas para cada configuración de actividad
y régimen. `FrequencyRule` tampoco transporta alcance espacial. Aunque las configuraciones
persistidas admiten CAMPUS_WIDE/BY_SECTOR/BY_ZONE y zone_id, eso no basta para evaluar
separadamente jardines o sectores con el contrato actual.

Por ello, sustituir únicamente el fallback con una consulta de fechas no demuestra cobertura:
podría mezclar jardines distintos o interpretar una atención parcial como cumplimiento general.
No se instala un proveedor vacío adicional ni una opción que habilite una política arbitraria.
El fallback existente conserva su comportamiento. Se corrigen únicamente sus comentarios
obsoletos y los de la interfaz, sin cambiar firmas, SQL ni respuestas API.

## Respuestas solicitadas al usuario

1. Después de atender y aprobar tres jardines, ¿el cumplimiento se actualiza solo para esos
   jardines/secciones, o se registra cobertura del campus al terminarlo íntegramente?
2. Si termina el lunes y se aprueba el jueves, ¿la frecuencia usa la fecha real del lunes o
   la de aprobación del jueves? En ambos casos sigue siendo imprescindible la aprobación.

La recomendación planteada es conservar el lugar realmente atendido y la fecha física de
ejecución. Se trata de una propuesta, no de una respuesta del cliente ni una decisión aceptada.
Las preguntas se enviaron mediante consulta al usuario; no se sustituye la respuesta por silencio.

**Respuesta del usuario, 29 oct 2026:** en ambas preguntas eligió «Dejar esta definición
pendiente de confirmar con el grupo o cliente». Cobertura y fecha de cómputo quedan pendientes
por decisión explícita; no es una consulta sin responder ni una aprobación provisional de la
recomendación. No se implementa ni habilita el proveedor real de T09 hasta resolverlas.
Se mantiene confirmada la aprobación final del coordinador como requisito de aceptación.

## Secuencia después de resolver las preguntas

1. Actualizar conjuntamente SPEC-101/SPEC-200 con la unidad de evaluación y la fecha elegidas.
2. Si el cumplimiento es local, ampliar el contrato del proveedor/lector y la respuesta de
   cumplimiento para identificar el alcance, manteniendo compatibilidad con consumidores actuales.
   Definir cómo se distribuye una regla CAMPUS_WIDE a las ubicaciones que realmente evalúa.
   Si se exige cobertura global, acordar cómo se identifica y acredita el conjunto completo;
   no deducirlo de una sola intervención con ubicaciones arbitrarias.
3. Consultar hechos aceptados con identidad de trabajo/ubicación, tipo, lugar, ejecutor y
   fechas. No atribuir trabajo IN_HOUSE a OUTSOURCED. No contar borradas, canceladas,
   observadas, completadas sin aprobación final ni subidas de fotos como ejecuciones nuevas.
4. Convertir instantes UTC a fecha civil con zona horaria definida; conservar la última
   ejecución previa al periodo. Dos trabajos distintos el mismo día no son un reintento.
5. Implementar el adaptador y comprobar que sustituye al fallback como único proveedor.
6. Probar alcance, aprobación parcial/final, límites de fecha, continuidad y deduplicación,
   junto con la regresión del motor de frecuencias. No cambiar el motor para ocultar una
   definición operativa ausente.

## T08 visual y límites

Se reintentó acceder a Chrome el 29 oct 2026. Computer Use volvió a detenerse porque no pudo
determinar con suficiente certeza la URL actual del navegador para aplicar su política.
No se realizaron más acciones de navegador ni se intentó eludir esa detención.
El recorrido de T08 sigue en `SPEC-200-etapa-5-historial-ejemplar.md`; las pruebas manuales
anteriores confirmadas por el usuario corresponden al flujo web previo, no a esta ampliación.

Este trabajo solo añade documentación y corrige comentarios. No se ejecutan de nuevo suites
funcionales porque no cambia comportamiento. La última referencia de T08 sigue siendo
667 pruebas backend, 571 frontend, lint y build correctos; no son pruebas de T09.
Sin migraciones, cambios en base de trabajo, commits ni despliegue.
