# Actividades: revisión de acuerdos y corrección de brechas

Fecha: 18 nov 2026.

Esta revisión corrige decisiones de compatibilidad que no estaban autorizadas. No se
posponen los errores encontrados a la etapa 6 ni se considera que una prueba aprobada
sustituya el cumplimiento del requisito.

## Decisión confirmada durante la revisión

El usuario confirmó que las actividades anteriores abiertas **continúan con el nuevo
avance global**, conservando el historial. El primer porcentaje global lo registra el
capataz; no se deduce de cantidades, superficies ni número de objetivos.

## Revisión contra los acuerdos

| Acuerdo | Implementación revisada |
|---|---|
| Nombre Actividades y título por actividad | Navegación, formulario, listado, detalle y etiquetas en incidencias/ficha del ejemplar |
| Solo cinco estados visibles | Planificada, En ejecución, Ejecutada, Terminada y Cancelada; no se ofrecen Asignada, Observada o Validada |
| Filtrar con esos estados | Filtro de servidor `activityStatusCode` antes de paginar; enlaces antiguos se traducen a los estados vigentes |
| Responsable opcional, sin cuadrilla | Creación global; primer avance guardado asume responsabilidad si estaba vacía |
| Solo el responsable registra avances | Autorización de servidor; reasignación exclusiva del coordinador |
| Inicio al guardar, no al abrir | Abrir/cerrar el editor o subir fotos no inicia ni reclama el trabajo |
| Porcentaje manual acumulado | 0–100, descripción general e instantánea atómica de todos los objetivos |
| Mapa y lista del avance | Solo objetivos de la actividad, casillas sincronizadas y estados sin avance/parcial/terminado |
| Acceso del capataz al mapa | Ruta autorizada por actividad; no depende de la consulta de planificación reservada al coordinador |
| Descripción del objetivo parcial | Campo requerido al marcar Avance parcial, persistido con la instantánea global |
| Coherencia del 100 % | Requiere todos los objetivos terminados, validado en web y servidor |
| Ejecutada y Terminada | El 100 % deja Ejecutada; aprobación del coordinador deja Terminada; sin Enviar a revisión |
| Correcciones antes de aprobar | Puede bajar el porcentaje, vuelve a En ejecución y conserva cada entrada anterior |
| Sin cantidades, intentos ni observaciones operativas | No se renderizan sus campos ni los comandos antiguos en el nuevo detalle ni en el archivo cerrado |
| Cancelación en ejecución | Solo coordinador, motivo opcional, conserva avances e historial |
| Fotos e historial | Lectura privada, autor/fecha originales y recuperación de pendientes; sin intentos nuevos |
| Actividades anteriores abiertas | V073 las incorpora al modelo global sin porcentajes o entradas de avance ficticias |
| Actividades anteriores cerradas | Permanecen cerradas y consultables; sin comandos operativos retirados |
| Conservación de datos anteriores | Copia inmutable de cabecera/objetivos; eventos y fotos originales no se borran |
| Ausencia del mapa | Lista de selección en creación y lista de objetivos en avances; WebGL no es requisito para registrar |

## Continuidad de datos anteriores

V073 es una migración nueva, posterior a V072. No se reescriben migraciones publicadas.
El estado operativo se traduce sin crear porcentajes. Las fechas de ejecución conocidas
se conservan; los datos ausentes permanecen ausentes. Una actividad anteriormente
ejecutada requiere su primer avance global explícito antes de la aprobación nueva.

Los objetivos originales se mantienen. Si un objetivo anterior agrupaba elementos,
su marca sigue correspondiendo a ese objetivo completo y se explica en la lista; no se
inventan objetivos, superficies ni porcentajes individuales. El mapa refleja todas sus
partes y ejemplares conocidos. Las planificaciones antiguas sin selección de campus
continúan en ejecución con sus objetivos originales; su formulario retirado de lugares
y cantidades no vuelve a exponerse.

Las fotos conservan archivo, autor y fecha. Las evidencias de intentos históricos quedan
consultables; para acreditar finalización solo se reutilizan las del objetivo/intento
vigente anterior o las recibidas en el flujo nuevo. No se crean intentos nuevos.

## Verificación

Las pruebas nuevas comprueban las cinco opciones exactas, normalización de enlaces,
filtros antes de paginar, mapa autorizado del capataz, continuación con porcentaje manual,
conservación de datos y retirada de los comandos antiguos. Las pruebas del flujo local
retirado se sustituyen por las del avance global y consulta histórica; no se usan como
criterios de aceptación de la interfaz nueva.

La verificación usa bases PostGIS temporales. No se aplican migraciones a la base habitual,
no se publican cambios y no se hace commit. La inspección visual sigue pendiente porque
el host de acceso al navegador no está disponible; no se presenta como realizada.

Resultados finales:

- Backend: 131 pruebas aprobadas en siete suites, incluidas 18 de actividades, 90 de
  compatibilidad de intervenciones, 10 de vínculos/cierre de incidencias, migraciones,
  numeración y alcance de acceso. Se realizó compilación limpia con Java 26 para
  eliminar clases de pruebas generadas anteriormente por el editor.
- Frontend: 247 pruebas aprobadas en 25 suites. Después de los últimos ajustes se
  aprobaron de nuevo 43 pruebas de avance, formulario y consulta histórica.
- TypeScript, lint de `src`, `git diff --check` y compilación de producción correctos.
- V073 también verifica fotos de objetivos retirados: se conservan para la historia
  y no se cuentan como evidencia de finalización de los objetivos activos.

## Integración local del 18 de noviembre de 2026

La comprobación posterior encontró el frontend nuevo conectado a una imagen del
backend del 12 de noviembre y una base en V036. El servidor ignoraba
`activityStatusCode` y respondía `Endpoint not found` a `/activities/options`.

Se respaldó la base con `pg_dump -Fc`, se comprobó su lectura con `pg_restore
--list` y se restauró una copia para ensayar la actualización. El respaldo local,
excluido de Git, está en
`docs/datos/privados/respaldos/2026-11-18-actividades/hesperides-antes-v073.dump`.
SHA256: `00533B19AD91D8E4A00DDC8D8B2262DA44C06854F9BB7B24F021317D77A47262`.

Las antiguas V035 y V036 de intervenciones resultaron idénticas al contenido de
V049 y V050 de esta rama. Se alinearon exclusivamente esas dos entradas del
historial, conservando sus checksums y fechas. Se aplicaron las migraciones
pendientes con orden excepcional temporal, primero en la copia restaurada y
después en la base habitual. No se ejecutó `repair` general ni se omitió la
validación. El backend volvió a arrancar con su configuración normal y V073.

Comprobaciones sobre el backend habitual actualizado:

- Planificadas: 3; en ejecución: 3; ejecutadas: 0; terminadas: 13; canceladas: 3.
  Cada filtro devuelve exclusivamente su estado; se conserva la proyección
  histórica `VALIDATED` que la interfaz presenta como Terminada.
- `/activities/options` devuelve catálogos y dos capataces.
- La actividad 21 conserva 36 objetivos y su porcentaje global pendiente; su
  ruta de mapa devuelve cuatro jardines y 32 ejemplares.
- Se conservan las 22 intervenciones originales.
- Las 39 pruebas de API, listado y selector pasaron; TypeScript pasó.

La comprobación visual se realizó en la ventana de Nueva actividad del coordinador:
los catálogos cargan sin el error rojo, el mapa 3D se dibuja y permite seleccionar
un jardín. El contador pasó a un jardín, cero ejemplares y 6.941,35 m². Al pulsar
Actualizar mapa se volvió a montar el visor y se conservó la selección.

El fallo original del visor no se reprodujo en esa ventana tras actualizar y
recargar. No se atribuye a una excepción concreta sin evidencia. Se agregó el
registro de errores de preparación e inicialización para no ocultar su causa,
liberación del visor si falla su callback de inicio, y Reintentar mapa para volver
a montarlo conservando los objetivos del formulario. Una prueba de regresión
comprueba esa conservación. Las 23 pruebas de mapa/API pasaron tras el ajuste.
