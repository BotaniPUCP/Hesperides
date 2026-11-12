# SPEC-200 · R4: selector web por lugar y zonas completas

**Histórico:** el usuario reemplazó este flujo por un mapa único de áreas y ejemplares,
sin lugares ni vecindad. Ver [contrato vigente](SPEC-200-mapa-unico-campus.md).

Fecha: 11 nov 2026. Cambios locales en `modulo-intervenciones`, sobre el mismo commit
`fc2c1a3` de `origin/feature/lugar-varios-edificios` comprobado al iniciar el trabajo.
Sin commit, push ni merge en esta etapa.

## Implementación

- Registro nuevo: agregar lugar registrado, seleccionar zonas completas en el mapa 3D y
  consultar superficie del servidor. Se eliminan los campos manuales
  de ejemplares, coordenadas, unidad y cantidad solicitada. Unidad fija m² en el backend.
- La selección depende de las asociaciones revisadas de R3, nunca de radios estimados ni
  de vecindades de nivel 2. Las zonas lejanas y árboles no se pueden agregar como áreas.
  Pulsar un edificio registrado cambia el lugar de la tarjeta y limpia su selección previa.
- Corrección solicitada tras la prueba del usuario: se retira la lista inferior de códigos
  y casillas. Se muestra únicamente el contador de áreas seleccionadas junto al mapa.
  Marcar y desmarcar se realiza en el mapa; sin WebGL se informa que el mapa no está
  disponible, sin ofrecer una lista de códigos. El contador anuncia los cambios.
- La correspondencia edificio–lugar usa el catálogo de Lugares y sus edificios asociados,
  no coincidencias de nombres. Edificios sin lugar registrado muestran un aviso claro;
  si hay ambigüedad se solicita elegir desde el desplegable. No se crean lugares al pulsar.
- Cada tarjeta conserva sus zonas. Cambiar su lugar las limpia; zonas repetidas entre
  tarjetas se bloquean. Las respuestas tardías de zonas/superficie se descartan por clave.
- La superficie es la unión calculada por el servidor; no se suma el área del edificio.
  El contexto cacheado del mapa se complementa con los polígonos vigentes de la API.
- Un solo visor activo; al pasar a otro se desmonta y libera el anterior. Los métodos
  opcionales de contorno/atenuado del visor compartido no cambian sus valores por defecto
  ni las pantallas de Mapa o Lugares.
- Los registros antiguos abren el formulario compatible. Los registros por zonas conservan
  ID y UUID al editar; no se reenvían las cantidades derivadas como entradas manuales.
- La creación desde incidencias mantiene clasificación, retorno con filtros y confirmación
  del vínculo existente. Se conserva la clave/cuerpo en reintentos inciertos.

## Base local y prueba real por API

Se detuvo el backend, se respaldó con `pg_dump -Fc` y se verificó con `pg_restore --list`.
Respaldo ignorado por Git: `.superpowers/backups/2026-11-11-pre-r4/database.dump`.
Se reconstruyó únicamente el backend; Flyway confirmó V035 correctamente.
Antes de las pruebas se conservaron los conteos: 1 lugar, 538 zonas, 15 intervenciones,
19 ubicaciones. No se recreó la base ni se cambiaron los maestros de Lugares o Mapa.

Se guardaron mediante el servicio las asociaciones directas confirmadas para LUG-0001:
AV-0174, AV-0377, AV-0378, AV-0380 y AV-0381. La consulta previa devolvió **1712,49 m²**;
las superficies se derivan de los polígonos actuales, no de los números redondeados en
capturas. Los demás lugares no reciben asociaciones automáticas.

Prueba local **INT-000017**: creación con cinco zonas, repetición con la misma clave sin
duplicar la actividad, edición conservando IDs y verificación de coordenadas/cantidades
derivadas. Se canceló al terminar con motivo explícito de prueba; no debe ejecutarse.

## Verificación y pendientes

Las pruebas cubren registro, edición compatible, superficie de servidor, duplicados,
revisión pendiente/cambiada, respuestas tardías, reintentos y origen desde incidencias.
Las pruebas del mapa comprueban selección autorizada, rechazo de árboles/zonas ajenas,
aviso sin WebGL y uso de geometría vigente sin mutar las capas compartidas.

Resultados:

- Compilación de producción y TypeScript correctos en imagen aislada con Next 16.4.3.
  El primer intento mezcló dependencias antiguas del host (Next 16.3.4) por el contexto
  Docker; se repitió con copia limpia de fuentes y dependencias del lockfile, sin cambiar
  los archivos de despliegue ni sustituir el contenedor frontend en uso.
- ESLint de los componentes y librerías modificados, sin errores; `git diff --check` correcto.
- Suite completa en Docker: 148 suites y 1190 pruebas aprobadas; cuatro fallos en una
  suite de Catastro debidos a plantillas CSV de `docs/estandares/plantillas` ausentes en
  el contenedor. Se copiaron esas plantillas al entorno de pruebas y se repitió esa suite
  junto con todas las de Intervenciones: **9 suites, 87 pruebas aprobadas**, incluidos
  los nuevos casos del mapa, las respuestas tardías y la edición con revisión cambiada.
- La ejecución completa inicial en Windows encontró dependencias locales incompletas
  (`@tailwindcss/postcss` ausente); se usó el contenedor con dependencias completas.
  No se modificó el lockfile para acomodar ese entorno.

La inspección visual está pendiente: Computer Use detuvo el acceso porque no pudo
determinar con confianza la URL actual de Chrome. No se declara verificado el aspecto,
el encuadre real, la interacción gráfica ni los modos claro/oscuro y móvil.

Recorrido pendiente: `Intervenciones → Nueva intervención → Agregar lugar → Biblioteca
Central PUCP`. Comprobar contorno, las cinco zonas, marcar/desmarcar desde el mapa,
contador y total, retirada/cambio de lugar, guardado y reapertura antes de asignar o ejecutar.
También revisar Mapa general y Lugares para confirmar que mantienen su presentación.

R5 (títulos/listado/estados/filtro) y R6 (revisión final) siguen pendientes. No se amplía
Android, recursos ni el contrato de incidencias en esta etapa.

El usuario comprobó que el mapa funciona y remitió capturas. Queda revisar visualmente
la corrección del contador y del cambio de edificio. En la base local solo está registrado
Biblioteca Central PUCP: Pabellón Z necesita su registro y la revisión de sus áreas para
probar allí una planificación completa. Esta corrección no modifica datos del catálogo.

Verificación de las dos correcciones: **8 suites y 81 pruebas de Intervenciones aprobadas**,
ESLint correcto. API local comprobada: los lugares de las opciones exponen su código
estable y corresponden con los edificios de `/places/map`; no se comparan nombres.
Se reconstruyó el backend por ese campo adicional; no hay migraciones nuevas ni cambios
de datos. La comprobación de tipos del servidor de desarrollo encuentra un error generado
en `.next/dev/types` de la página nueva; se verifica además la compilación de producción
con contexto limpio para no mezclar tipos de desarrollo ni dependencias antiguas.
La compilación de producción y su comprobación TypeScript finalizaron correctamente.
