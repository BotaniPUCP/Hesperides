# SPEC-200 · R3 · Asociaciones y planificación por zonas

**Histórico:** SPEC-200 §2.12 reemplaza el flujo nuevo por un mapa único sin restricciones
de lugar. Los contratos de este informe se conservan para registros anteriores; ver
[el contrato vigente de selección global](SPEC-200-mapa-unico-campus.md).

Fecha: 11 nov 2026. Base remota verificada: `feature/lugar-varios-edificios`,
`fc2c1a3`, coincidente con `modulo-intervenciones` antes de implementar.

## Diseño y límites

R3 añade persistencia y servicios para las asociaciones directas confirmadas en R2.
No amplía a vecinas indirectas, no descubre asociaciones por metros y no modifica
el código de Lugares, el Mapa general ni el vínculo con incidencias.

V035 crea revisiones por lugar y sus zonas. Cada revisión guarda versión, huella del
inventario, actor, fecha y motivo. Reemplazar una revisión retira lógicamente la anterior
y conserva sus enlaces; no se borran registros. Para zonas multipartes se exige y guarda
la confirmación explícita del polígono completo. No se siembran IDs locales ni se asume
que un lugar de otra base sea Biblioteca Central por tener ID 1.

La migración también agrega dos columnas opcionales a las ubicaciones de intervención:
`zone_selection_revision` y `zone_boundary_snapshot`. Los registros antiguos quedan con
ambas a null, con sus unidades, cantidades, coordenadas, ejemplares y ejecución originales.

## Contrato HTTP aditivo

Todas las respuestas mantienen `{ok,message,data}`. Se reutilizan autenticación, cuentas
activas y autorización del servicio de intervenciones.

### Consulta

`GET /api/v1/interventions/places/{placeId}/zones`

Lectura para ADMIN, COORDINADOR, SUPERVISOR y OPERARIO, igual que las opciones espaciales
existentes. Devuelve:

- `place`: ID, código, nombre, geometría GeoJSON completa y validez del contorno.
- `datasetRevision`: huella del inventario vigente, para revisar asociaciones.
- `reviewVersion`: 0 si aún no existe revisión; versión vigente en otro caso.
- `reviewed` y `current`: distinguir revisión ausente de revisión desactualizada.
- `selectionRevision`: token de la revisión actual, para planificar; null si falta revisión
  o está desactualizada. Incluye la identidad de la revisión, no solo geometrías.
- `zones`: exclusivamente las zonas asociadas de una revisión vigente. Cada zona incluye
  ID, código único, nombre, geometría GeoJSON, `areaM2`, punto interior y cantidad de partes.
- `candidates`: inventario de zonas para revisar, solo para ADMIN/COORDINADOR; vacío para
  ejecutores. No significa que todas sean seleccionables.
- `reviewedAt` y `reviewedByUserId`: trazabilidad de la revisión.

Un lugar desconocido produce 404. Si no está revisado o cambió el inventario, `zones`
está vacío y no se inventa una asociación como alternativa. Una revisión explícitamente
vacía también es válida, pero no permite programar ninguna zona.

### Revisión de asociaciones

`PUT /api/v1/interventions/places/{placeId}/zones` · ADMIN/COORDINADOR

```json
{
  "datasetRevision": "huella de 64 caracteres hexadecimales recibida al consultar",
  "version": 0,
  "zoneIds": [179, 382, 383, 385, 386],
  "multipartAcknowledged": [],
  "reason": "Zonas completas confirmadas mediante revisión del mapa"
}
```

Los IDs del ejemplo corresponden únicamente a la base local revisada en R2. El consumidor
debe obtenerlos por códigos del inventario real. La confirmación humana de Biblioteca
Central sigue siendo AV-0174, AV-0377, AV-0378, AV-0380 y AV-0381.

Se rechazan duplicados, zonas inexistentes/inactivas, polígonos inválidos o vacíos,
revisión multipartes omitida y contorno de lugar inválido. Huella o versión anterior
produce 409; no sobrescribe una revisión más reciente. La revisión requiere un motivo.

### Consulta previa de superficie

`POST /api/v1/interventions/zone-selection/preview` · ADMIN/COORDINADOR

Recibe `selections`, una lista no vacía de objetos con `placeId`, `zoneId` y
`zoneSelectionRevision`. Devuelve `surfaceM2` (área de la unión de las zonas seleccionadas,
en m²) y `zones` con sus geometrías y áreas individuales. No crea intervenciones,
ubicaciones ni eventos. Usa las mismas validaciones de elegibilidad y revisión vigente
que el guardado, y permite recalcular al seleccionar/desmarcar en R4.

### Creación y edición de intervenciones

Se conservan `POST /interventions` y `PUT /interventions/{id}`, sus permisos,
`Idempotency-Key`, control de versión y prohibición de editar planificación iniciada.
Cada entrada de `locations` puede optar por la modalidad nueva:

```json
{
  "clientReference": "UUID estable de esta unidad de ejecución",
  "placeId": 1,
  "zoneId": 179,
  "zoneSelectionRevision": "token de 64 caracteres devuelto en selectionRevision",
  "description": "Referencia opcional del trabajo"
}
```

Cada zona genera su propia ubicación persistente; una tarjeta de lugar en R4 enviará
varias entradas si selecciona varias zonas. Los IDs y UUID de cada ubicación conservan
la identidad de avances, fotos, intentos y aprobación. Cambiar orden no crea ubicaciones.

La modalidad nueva no acepta coordenadas, unidad, cantidad solicitada ni asociaciones
de ejemplares proporcionadas por el cliente. El servidor valida la asociación vigente,
calcula el área, usa `MEASUREMENT_UNIT/M2` y obtiene un punto interior del polígono.
Una zona no puede repetirse dentro de la actividad, aunque esté asociada a varios lugares.

Omitir el campo nuevo conserva el contrato anterior para clientes y registros anteriores;
no vuelve a interpretar sus cantidades. Una ubicación ya creada con la modalidad nueva
no puede degradarse silenciosamente a la modalidad anterior.
Durante esta transición el contrato antiguo todavía permite altas antiguas: las restricciones
espaciales nuevas se aplican al modo `zoneSelectionRevision`. No se declara deshabilitado el
modo anterior ni se fuerza al formulario actual a usar un selector aún no implementado.
Tampoco se convierte una ubicación antigua en la nueva modalidad sobre su mismo ID:
para una transición explícita antes de iniciar, se retira la antigua y se agrega una nueva,
conservando el registro retirado y sus asociaciones para el historial.

## Superficie e historia

El área por zona se calcula mediante PostGIS `ST_Area(boundary::geography)` sobre WGS84,
redondeada a dos decimales y expresada en m². No se usa el área del edificio, la que mande
el navegador ni una cantidad manual. Las zonas inválidas se rechazan, no se corrigen
silenciosamente ni se sustituyen por cero.

Se conservan la geometría GeoJSON, el área y el punto utilizados al planificar. Una edición
posterior del mapa no recalcula ubicaciones existentes ni su historial de avances.
`plannedSurfaceM2` en el detalle utiliza la unión de esas geometrías guardadas y evita contar
dos veces una superficie superpuesta. Es null si no hay ubicaciones de la modalidad nueva.
Los totales de cantidad solicitada M2 usan esa unión más las cantidades M2 antiguas cuando
hay registros mixtos; no se deduce cobertura geográfica para registros antiguos sin contorno.
Avances y cantidades ejecutadas siguen siendo hechos registrados por cada zona, no se
reemplazan por la superficie solicitada.

La huella del servicio se genera sobre el inventario ordenado de lugares y zonas disponibles,
con contornos completos y datos geográficos. Es distinta del formato externo de revisión
R2: se debe consultar la API para obtener el token vigente, no reutilizar una huella de fixture.
Cambios de inventario invalidan las revisiones de manera conservadora, incluidos cambios
descriptivos. Cambiar las asociaciones también cambia el token de selección.

Las revisiones y la derivación al planificar serializan sus operaciones y mantienen las tablas
fuente de geometrías en bloqueo compartido hasta finalizar la transacción. No se devuelve
una respuesta de escritura antes de confirmar revisión, ubicaciones y evento de intervención.

## Compatibilidad revisada

- Ejecución, evidencias y revisión: mismos servicios y estados por ubicación; columnas nuevas
  opcionales. No se cambian los permisos de capataz/coordinador ni las fechas de ejecución.
- Catastro y medidas tras poda: se preservan asociaciones históricas. No se fabrican vínculos
  de ejemplares por encontrarse dentro de una zona. Nuevas ubicaciones por zona no cambian
  medidas de ejemplares sin asociación explícita existente.
- Frecuencias y reportes: se conservan `place_id`, `zone_id`, fechas de ejecución/aprobación
  y el proveedor actual. Las nuevas áreas no se convierten en cobertura global ni modifican
  reglas de frecuencia por sector.
- Incidencias: se reutiliza V029 y los servicios actuales; no se añade otro vínculo o cierre.
- Web: R4 implementará el consumidor y la alternativa accesible. R3 todavía no cambia el
  formulario ni declara completada una prueba visual del selector.

## Verificación

Las pruebas de migración e integración usan PostgreSQL/PostGIS desechable con Testcontainers.
No leen `.env` ni migran la base habitual. Cubren conservación de datos V034→V035,
permisos, datos pendientes, revisiones reemplazadas/desactualizadas, áreas superpuestas,
geometría histórica, idempotencia, valores manuales, duplicados y multipartes.

La suite completa del backend aprobó **923 pruebas**, sin fallos, errores ni omisiones,
antes de añadir la consulta previa final. Incluye el caso real de cinco zonas de Biblioteca,
la actualización V034→V035 y las regresiones de ejecución, evidencias, incidencias,
inventario, frecuencias, reportes, Lugares y Mapa. Al cerrar el proceso de prueba, Surefire
terminó el fork que demoró más de 30 segundos en salir; Maven devolvió `BUILD SUCCESS`.
No se interpreta ese aviso de cierre como una prueba fallida.

Después de añadir la consulta previa pasaron **24 comprobaciones específicas** (12 de
integración R3, 10 del motor y 2 de numeración), sin fallos, errores ni omisiones. Las
12 pruebas Python de revisión R2 también pasaron. `git diff --check` sin incidencias.
No se cambió ninguna interfaz web. La comprobación real del selector/CORS desde navegador
sigue en R4/R6; el preflight de los endpoints se cubre en integración.

**Despliegue:** V035 está preparada y probada en bases desechables. En este trabajo no se
reconstruyó el backend habitual ni se aplicó V035 a su base, ni se cargaron asociaciones
en ella. Al desplegar se deberá respaldar la base vigente, reconstruir el backend y revisar
las asociaciones mediante el servicio; las pruebas no siembran la base del usuario.

**Actualización posterior en R4 (11 nov 2026):** se realizó un respaldo nuevo en
`.superpowers/backups/2026-11-11-pre-r4/database.dump`, se verificó su índice y se
reconstruyó el backend. V035 se aplicó correctamente en la base habitual. Se conservaron
1 lugar, 538 zonas, 15 intervenciones y 19 ubicaciones anteriores; después se creó una
actividad de prueba, cancelada al finalizar. Mediante la API se persistieron únicamente las
cinco asociaciones de Biblioteca Central ya confirmadas por el usuario. Ver el informe R4.
