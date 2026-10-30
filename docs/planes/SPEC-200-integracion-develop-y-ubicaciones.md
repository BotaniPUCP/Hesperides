# SPEC-200 — Integración de develop y fallo al agregar ubicaciones

Fecha: 29 oct 2026.

## Integración

Se actualizó el remoto y se avanzó `modulo-intervenciones` desde `d696634` hasta
`origin/develop` en `9d5e18b` (31 commits, avance directo). Los cambios locales de T08/T09
y la corrección de ubicaciones se conservaron sin hacer commit ni push.

Antes de actualizar se respaldaron los archivos y se guardó el stash
`1b78fe1f24ff529db25e87fa188eec02dd6238c4`. El stash se conserva como respaldo;
sus cambios ya están restaurados y no debe aplicarse otra vez sobre el árbol actual.

La conciliación se preparó en una copia temporal. Hubo cuatro conflictos:

- `frontend/src/components/inventario-verde/SpecimenInterventions.tsx`.
- `frontend/src/components/inventario-verde/__tests__/SpecimenInterventions.test.tsx`.
- `frontend/src/components/inventario-verde/__tests__/SpecimenDetailScreen.test.tsx`.
- `specs/REGISTRO.md`.

Se conservó el historial conectado y autorizado de T08, junto con la navegación de
catastro y las regresiones de inventario de develop. El registro conserva SPEC-201 y
el avance de SPEC-200. También se eliminó un historial duplicado que producía la mezcla
automática de `SpecimenDetailScreen`, aunque Git no lo marcaba como conflicto.

## Fallo reproducido y corrección

`Agregar ubicación` usaba `crypto.randomUUID()` directamente. Al simular un navegador
sin ese método, la prueba falló con `TypeError` al pulsar el botón. Las mejoras anteriores
de T08/T09 no corregían esta llamada; el develop consultado también la conservaba.

`randomUUID` requiere un contexto seguro; `getRandomValues` puede utilizarse también en
contextos no seguros. Una web abierta mediante HTTP e IP de red es un escenario compatible
con el fallo. Referencias: [randomUUID](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID)
y [getRandomValues](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues).
La URL y el error exacto del compañero siguen sin confirmarse: se reprodujo una causa
concreta compatible con el reporte, no su sesión original.

Se añadió `createClientUuid`: utiliza la API nativa cuando existe y, en su ausencia,
genera UUID v4 mediante `getRandomValues`, conservando aleatoriedad criptográfica.
Se aplica a ubicaciones, claves de registro y anuncios de fotos. El formulario genera
la ubicación fuera del actualizador de estado y muestra un error si el navegador carece
de la capacidad requerida, conservando lo escrito. Un fallo previo a enviar el registro
no se trata como una respuesta incierta del servidor.

La regresión comprueba agregar dos ubicaciones y registrar una actividad sin
`randomUUID`, con referencias válidas y distintas. Las pruebas del generador comprueban
la API nativa, la alternativa segura y el fallo sin sustituirla por valores predecibles.

## Base de datos y límites

No se arrancó la aplicación contra la base de trabajo ni se aplicaron migraciones allí.
Las comprobaciones de backend utilizan las bases desechables de las pruebas.
Develop ya renumeró intervenciones de V022 a V025 e incorporó incidencias en V026.
Una base que usó la antigua V022 de intervenciones necesita revisar su historial antes
de arrancar; no se modifica Flyway automáticamente para ocultar esa diferencia.

La consulta de contenedores encontró `hesperides-db` y `hesperides-pruebas-web`
detenidos. No se iniciaron para consultar su historial, por lo que no se afirma que esas
bases tengan aplicada la antigua V022 ni que sean compatibles con el siguiente arranque.
La comprobación de su historial sigue siendo necesaria antes de usar datos persistentes.

La comprobación automatizada del fallo no sustituye la validación visual pendiente de
T08/T09 ni confirma otros posibles errores al seleccionar un lugar o sección.

## Comprobaciones posteriores a la integración

- La regresión del botón falló antes de la corrección y pasó después. La ejecución
  dirigida de `InterventionWorkflow` y `client-uuid` aprobó 11 pruebas.
- Se instaló el lockfile de develop con `npm ci --no-audit --no-fund`. La primera
  comprobación de frontend detectó que faltaban los paquetes `@dnd-kit` recién añadidos
  por develop; esa ejecución no se considera una validación satisfactoria.
- `npm run build` y `npm run lint` finalizaron con salida 0 tras instalar dependencias.
- La suite completa de frontend aprobó **102 suites y 683 pruebas** (salida 0).
- `docker compose config --quiet` finalizó con salida 0, sin iniciar los servicios.
- La primera ejecución de backend en el entorno restringido no pudo acceder a Docker.
  Se repitió con acceso al motor para utilizar exclusivamente los contenedores de prueba.
- `mvnw.cmd -B clean test`, con JDK 26 y acceso a Docker, terminó con **BUILD SUCCESS**
  y salida 0: **714 pruebas**, sin fallos, errores ni omisiones. Incluye 66 pruebas de
  integración de intervenciones y 7 de integración de incidencias, con ambos módulos
  presentes, además de las pruebas de migraciones y cumplimiento local.
  Al cerrar se repitieron avisos de conexiones de contenedores ya detenidos y de Surefire
  terminando el proceso de pruebas tras 30 segundos; el resultado fue BUILD SUCCESS,
  con 714 pruebas sin errores y salida 0. Los avisos quedan visibles en el log.
- `git diff --check` no encontró errores y no hay archivos con conflictos pendientes.

Los logs están en la carpeta temporal del usuario, con prefijo `hesperides-integrated-`.
La copia verificada de 42 archivos previa al avance de rama está en
`C:\Users\user\AppData\Local\Temp\hesperides-pre-integration-mnvpww5h`.
