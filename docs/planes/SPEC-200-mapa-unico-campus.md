# SPEC-200 · Mapa único de áreas verdes y ejemplares

Fecha: 11 nov 2026. Cambio de alcance confirmado directamente por el usuario con su líder.
Reemplaza el flujo nuevo de tarjetas por lugar y restricciones de vecindad de R1–R4.

## Comportamiento

Una actividad selecciona objetivos desde un único mapa: áreas verdes completas activas
de cualquier parte del campus y ejemplares individuales activos. Los árboles están visibles
y las selecciones se resaltan en celeste. Edificios son referencias; no se cambian lugares
ni se exige que existan en el catálogo de Lugares. No se requiere revisar asociaciones.

Área y ejemplar son selecciones independientes, también si el ejemplar está dentro de un
área elegida. No se incluyen árboles automáticamente ni se expande una selección a vecinos.
Cada objetivo mantiene su ubicación para ejecución, avances, evidencia y revisión.

La lista muestra solo lo seleccionado: las cinco áreas más recientes por defecto,
«Mostrar más» para todas las áreas y ejemplares y «Mostrar menos» para volver. Si se
eligieron únicamente ejemplares, el resumen muestra los cinco más recientes. Ofrece
«Ver en mapa» y «Retirar». Se usan
nombres legibles, con numeración de área cuando el nombre del inventario es solo una clave.
No se presenta un catálogo completo de códigos debajo del mapa.

Se mantienen contador de áreas, contador de ejemplares y superficie calculada por el
servidor. El total en m² es la unión de áreas, no la suma de polígonos superpuestos.
Los ejemplares no agregan m². Una intervención solo sobre ejemplares es válida y muestra
0 m². El primer refinamiento para seleccionar varios árboles se describe a continuación.

### Refinamiento: selección de ejemplares por barrido

Se conserva el clic simple. Mantener el clic izquierdo durante **2 segundos** sobre un
ejemplar activa el barrido: aparece una mano cerrada y **«Arrastra»** encima del cursor.
Recorrer los ejemplares los agrega; pasar de nuevo por uno no lo quita ni lo duplica.
El gesto no dibuja un rectángulo ni agrega jardines. Al soltar termina y vuelve la cámara.
Un movimiento antes del umbral cancela la espera y deja arrastrar el mapa normalmente.
Se limpian temporizadores y estado al cancelar, perder captura/foco, pulsar Escape o
desmontar el visor. El barrido es opcional del formulario; Mapa y Lugares no lo habilitan.

La indicación breve junto al mapa explica el gesto sin interrumpir. El contador usa
«jardín/jardines» y el bloque de superficie aparece arriba de la lista. Los cálculos de
superficie se agrupan tras 180 ms sin cambios para no enviar una consulta por cada
ejemplar recorrido; guardar espera siempre el resultado de la selección vigente.

Este ajuste modifica únicamente frontend, documentación y pruebas: no requiere migración
ni cambios de backend, datos, permisos o relaciones con incidencias. **200 pruebas** del
formulario y Mapa aprobadas, incluidos 12 casos de manejo del puntero. Falta comprobar
manualmente la sensación del barrido sobre el visor 3D con ratón real.
ESLint y la compilación de producción con TypeScript finalizaron correctamente.

## Contratos y conservación

- `GET /api/v1/interventions/campus-selection`: revisión y catálogo actual de áreas y ejemplares.
- `POST /api/v1/interventions/campus-selection/preview`: revisión, `zoneIds`, `specimenIds`;
  devuelve superficie y contadores. Permiso ADMIN/COORDINADOR, igual que planificación.
- Crear/editar: `campusSelectionRevision`, una ubicación por área o ejemplar. El backend
  rechaza duplicados, inventario desactualizado, objetivos retirados y cantidades/coordenadas
  manuales; deriva coordenadas y m² desde sus fuentes reales.
- V036 agrega revisión opcional a la actividad y permite geometría de área sin lugar.
  No reescribe migraciones anteriores ni convierte registros existentes.
- Los registros previos abren el editor compatible. Los nuevos conservan ID/UUID al editar
  y cuerpo/clave al reintentar un registro incierto; no pueden degradarse al contrato anterior.
- Los endpoints anteriores se conservan para compatibilidad. No se modifican maestros de
  Lugares, Mapa o Catastro ni la relación con incidencias.

## Comprobaciones

Pruebas de backend: áreas distantes sin revisiones, ejemplares independientes con punto
derivado, selección mixta, unión de superficies, duplicados, entradas manuales, permisos,
inventario obsoleto, edición y conservación de datos al migrar.

Pruebas web: mapa único, ausencia de lugares, cinco selecciones/expansión, retirada,
árboles visibles y seleccionables, selección independiente, edición, respuestas tardías
y reintento con misma clave. El contexto del mapa se completa con posiciones vigentes.

Pendiente la comprobación visual del flujo nuevo por el usuario; no se reutiliza como
evidencia suficiente la validación visual de Biblioteca Central del flujo anterior.

### Resultados de esta implementación

- Backend: regresión de 119 casos, con 115 correctos y 4 fallos nuevos causados por clases
  que el editor recompiló con una API Java incompatible. Se sustituyó ese acceso y se
  repitió desde compilación limpia: **17 pruebas de selección/migración correctas**, incluidos
  los cuatro casos afectados. Los 84 casos del flujo anterior, sus 16 comprobaciones de
  migraciones y 2 de calendario habían pasado en la regresión general.
- Web: **211 comprobaciones** de Intervenciones, Mapa e Incidencias correctas. Tras cerrar
  el resumen exacto de cinco áreas y la confirmación del inventario actualizado, **84 casos
  finales de Intervenciones** correctos. ESLint sin errores y compilación de producción
  con TypeScript correcta en imagen aislada.
- Respaldo local verificado en
  `.superpowers/backups/2026-11-11-pre-campus-selection/database.dump`. Antes de migrar:
  1 lugar, 538 zonas, 965 elementos, 16 actividades y 24 ubicaciones. V036 se aplicó sin
  modificar esos maestros ni convertir actividades anteriores; no hay scripts de borrado.
- API local: inventario elegible de **531 áreas y 965 ejemplares**. Actividad de prueba
  **INT-000018** con dos áreas distantes y un árbol, sin lugar, superficie de **11163,09 m²**.
  Repetir la clave no duplicó la actividad; editar conservó sus tres IDs. Se canceló al
  terminar para que no quede como trabajo pendiente. No se alteraron árboles ni áreas.
- Backend local actualizado y saludable; el frontend en desarrollo recibe las fuentes
  por montaje. Recargar con Ctrl+F5 para revisar visualmente el nuevo formulario.


### Ajustes de fecha y aviso de arrastre (2026-11-12)

- La creación exige una fecha programada igual o posterior al día actual de Lima. El formulario restringe el calendario y comprueba al enviar; el backend valida las creaciones nuevas. Un reintento idempotente de un registro exitoso conserva su resultado, aunque su fecha ya haya pasado. Las ediciones de planes existentes conservan sus reglas actuales.
- El aviso «✊ Arrastra» se muestra durante 3 segundos desde que se activa el barrido. Mover el cursor no reinicia el plazo y ocultar el aviso no detiene la selección. Soltar, cancelar o desmontar limpia el temporizador; un gesto nuevo vuelve a mostrarlo.

Validación de estos ajustes: 106 pruebas frontend y 104 pruebas backend aprobadas; ESLint correcto. Backend local reconstruido. Comprobación visual del usuario pendiente.


### R5: listado y presentación (2026-11-12)

El título principal de tarjetas, detalle y edición usa clase y tipo de actividad; el código se conserva como referencia secundaria. La API expone `activityTitle` con los nombres del catálogo actual, incluso en registros anteriores, sin migrar datos.

La web inicia con actividades activas. `COMPLETED`, `VALIDATED` y `CANCELLED` son inactivas; `OBSERVED` sigue activa. El filtro opcional `active` del backend actúa antes de paginar y contar, manteniendo permisos y los otros filtros. Omitirlo conserva el comportamiento anterior de la API. La selección se guarda en la URL; cambiar de grupo limpia el estado y reinicia la página. Un enlace antiguo con estado explícito usa todos los grupos para seguir funcionando.

Los estados de intervenciones y sus objetivos llevan íconos además del texto y colores semánticos del tema. Los íconos son decorativos para lectores de pantalla.

Validación R5: 192 pruebas frontend aprobadas tras adaptar las expectativas de título (24 suites, incluidas las de estilos), 102 pruebas backend aprobadas y compilación limpia de producción correcta con TypeScript. ESLint correcto. Backend local reconstruido. Revisión visual manual pendiente.
