# SPEC-200 · R2 · Asociaciones directas de lugares y zonas

**Histórico:** el cambio posterior de SPEC-200 §2.12 elimina las restricciones por lugar
y vecindad en las planificaciones nuevas. No hace falta completar estas asociaciones
para usar el mapa único del campus. Se conservan como antecedentes y compatibilidad.

Actualización: 11 nov 2026. Base comprobada mediante fetch:
`feature/lugar-varios-edificios`, commit `fc2c1a3`, coincidente con
`modulo-intervenciones` (sin commits exclusivos).

## Regla vigente y alcance

El usuario sustituyó la expansión de dos niveles por **zonas directamente asociadas
al lugar**. Las capturas de Biblioteca Central confirman qué entiende por entorno
inmediato: puede haber una vereda o solo una pequeña parte de la zona junto al edificio.
Se selecciona el polígono completo. No se deduce una distancia en metros, un porcentaje
de contacto ni una regla automática universal a partir de este caso.

`ZoneNeighborhood` recibe el inventario disponible, una revisión vigente y las asociaciones
directas por lugar. Devuelve únicamente esas zonas, ordenadas por ID; seleccionar una no
habilita ninguna otra. Una zona compartida por dos lugares no importa las asociaciones
del otro lugar. Rechaza selecciones vacías, duplicadas, desconocidas o no asociadas.

No hay mapa de relaciones zona–zona ni caminos de nivel 2. Una fila ausente del motor,
o `null` en el archivo de revisión, significa **pendiente**; `[]` significa **revisada,
sin zonas asociadas**. Un lugar pendiente produce error y no se habilita por proximidad.

El motor sigue aislado: **no está conectado al formulario ni a una API de producción**.
R3 añade persistencia/servicios, documentados en el [informe R3](SPEC-200-R3-asociaciones-y-planificacion.md);
R4 implementará el mapa selector. No se modificó el código
de Lugares o del Mapa general. En esta actualización solo se consultó la base local.

## Caso real confirmado: Biblioteca Central

El usuario creó `LUG-0001`, Biblioteca Central PUCP, con su edificio como contorno.
Confirmó mediante capturas estas cinco zonas y ninguna expansión hacia sus vecinas:

| Código único | Código del mapa | ID local de la exportación |
|---|---|---|
| AV-0174 | C 43 | 179 |
| AV-0377 | C 44 | 382 |
| AV-0378 | C 42 | 383 |
| AV-0380 | C 41 | 385 |
| AV-0381 | C 42 | 386 |

Los códigos AV identifican zonas de manera única; «C 42» se repite. Los ejemplares EV
no forman parte de esta selección. Los IDs son evidencia de la base local, no constantes
para sembrar otras bases: R3 debe resolver y validar las asociaciones contra su inventario.

Se exportaron el lugar y las 531 zonas elegibles por tipo desde PostgreSQL en una transacción
de solo lectura. El contorno del lugar y los cinco polígonos resultaron válidos; cada zona
confirmada tiene un solo componente. La revisión real produjo un lugar listo y cero lugares
pendientes en esa exportación. Esto acredita el único lugar registrado actualmente, no
la totalidad de lugares futuros del campus.

Evidencia reproducible: [resultado del caso real](SPEC-200-R2-biblioteca-central.json).
La fixture Java `src/test/resources/neighborhood/biblioteca-central.properties` conserva
la revisión y los 531 IDs exportados para probar aceptación de las cinco zonas y rechazo
individual de las otras 526. Es una fixture de pruebas, no configuración de producción.

Verificación de esta revisión: **33 pruebas Java aprobadas** (10 de asociaciones directas
y 23 existentes de jerarquía/proximidad), **12 pruebas Python aprobadas**, exportador SQL
ejecutado correctamente y validación CLI del caso real con salida 0. Se compiló desde
limpio. No se ejecutó el recorrido del formulario nuevo, que todavía no está implementado.

## Fuente, revisión y mantenimiento

`scripts/intervenciones/exportar_vecindad.sql` utiliza `place_outlines` de V034: contorno
completo del lugar y alternativa del padre directo para interiores, como el mapa existente.
Un edificio del GeoJSON no se convierte automáticamente en un lugar registrado.

El inventario exporta secciones activas `GREEN_AREA` y `XEROPHYTIC`, excluyendo subsecciones
y jardines de reserva superpuestos para evitar duplicación de zonas. Los casos nuevos
deben contrastarse con el mapa antes de confirmar su asociación.

La herramienta `vecindad.py` prepara revisiones **schemaVersion 2** con
`selectionRule: DIRECT_ASSOCIATIONS`, `placeZones`, autor y fecha con zona horaria.
Rechaza revisiones antiguas de dos niveles o que todavía contengan `zoneNeighbors`.
La huella SHA-256 del inventario invalida la revisión si cambian sus datos; no acredita
por sí sola que una asociación geográfica sea correcta. R3 deberá verificar además
vigencia, permisos y geometrías antes de exponer resultados o guardar selecciones.

Las fuentes GeoJSON contienen 521 áreas verdes, 10 zonas xerofíticas y 417 edificios.
Hay 29 registros de zona con varios polígonos (28 AV y 1 XE), detallados en el
[inventario de fuentes](SPEC-200-R2-inventario-fuentes.json). No se dividen automáticamente:
su significado como zona completa requiere confirmación antes de permitirlos. Ninguno
de los cinco registros confirmados de Biblioteca Central presenta ese problema.

## Repetir el procedimiento con otros lugares

1. Exportar la base vigente con `psql`, en solo lectura.
2. Preparar un borrador y localizar el lugar registrado y sus zonas por códigos.
3. Confirmar las asociaciones directas mirando el mapa. Completar `placeZones`, revisor
   y fecha; dejar `null` donde falte revisión. No inferir vecinos indirectos.
4. Si una zona tiene varios componentes, revisar su significado completo antes de
   incluir su ID en `multipartAcknowledged`.
5. Validar y probar que solo las zonas confirmadas sean admitidas. No activar el lugar
   mientras sus datos sean insuficientes o inválidos.

Desde la raíz del proyecto, con la conexión de `psql` configurada:

```powershell
psql -X -q -A -t -v ON_ERROR_STOP=1 -f scripts/intervenciones/exportar_vecindad.sql -o "$env:TEMP\hesperides-vecindad-snapshot.json"
python -B scripts/intervenciones/vecindad.py prepare --snapshot "$env:TEMP\hesperides-vecindad-snapshot.json" --output "$env:TEMP\hesperides-vecindad-review.json"
# Completar las asociaciones confirmadas y los datos del revisor en review.json.
python -B scripts/intervenciones/vecindad.py validate --snapshot "$env:TEMP\hesperides-vecindad-snapshot.json" --review "$env:TEMP\hesperides-vecindad-review.json" --output "$env:TEMP\hesperides-vecindad-result.json"
```

Código de salida: 0 si todos los lugares exportados están listos; 2 si quedan pendientes
o no hay lugares; 1 si la entrada es inválida. El resultado distingue elegibilidad de
datos pendientes y no activa nada en producción.

Los archivos de la comprobación local de Biblioteca están en
`.superpowers/r2-direct-associations/` (ignorados por Git). Las revisiones originales de
dos niveles se sustituyen por un borrador nuevo; no se convierten silenciosamente.

## Historial operativo y límites

El 10 nov Docker estaba detenido y se probaron grafos sintéticos de dos niveles. Esos
resultados históricos no acreditan la regla nueva. El 11 nov, con autorización del usuario,
se respaldó la base en `.superpowers/backups/2026-11-11-pre-backend-update/` y se actualizó
el backend de V026 a V034. El archivo de respaldo es legible con `pg_restore --list`;
no se realizó una restauración de prueba. El seed existente añadió 12 intervenciones
y 14 ubicaciones de demostración. Ese trabajo operativo precede a esta revisión de R2.

La primera consulta encontró 0 lugares y 411 referencias pendientes en 271 grupos de
nombre. El usuario registró después Biblioteca Central por la interfaz. El enlace de
referencias no es requisito para probar su asociación con zonas.

R2 tiene un primer caso real confirmado y comprobable para continuar con R3. No se
declara el nuevo formulario implementado ni revisados otros lugares del campus; los
casos de varios edificios y su recorrido en el selector siguen pendientes.
