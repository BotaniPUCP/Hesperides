# Diseño — Video de planificación y reservas para el cliente

| Campo | Valor |
|-------|-------|
| Fecha | 2026-11-12 |
| Alcance | Segundo video de Hespo, de 3:30 a 4:30, sobre Frecuencias, Planificación (con Conjuntos) y Reservas de jardines |
| Audiencia | Cliente (PUCP) |
| Ubicación | `docs/demos/video-flujos/`, como segundo video del mismo proyecto |
| Base | [Diseño del primer video](2026-11-04-video-flujos-design.md): este documento solo dice lo que cambia o se agrega |
| Fuera de alcance | Ver sección 11 |

## 1. Objetivo

Que el cliente entienda en unos 4 minutos cómo se planifica el mantenimiento preventivo del
campus en Hesperides y cómo se evita trabajar en un jardín prestado: qué es una frecuencia, cómo
la planificación junta conjunto, actividad y frecuencia para decir qué toca, y cómo las reservas
de jardines avisan en los dos sentidos.

Lo presenta Hespo sobre las pantallas reales de la web, como en el primer video.

## 2. Criterios de éxito

Se mantienen CE-02 a CE-09 del primer video, aplicados a este. Cambian o se agregan:

| # | Criterio | Cómo se comprueba |
|---|----------|-------------------|
| CE-01 | El MP4 dura entre 3:30 y 4:30, en 1920×1080 a 30 fps, con video H.264 y audio AAC | `npx remotion ffprobe` sobre `out/hespo-planificacion.mp4` |
| CE-10 | El primer video se sigue generando igual: sus pruebas pasan y su duración no cambia | `npm run prueba` y `ffprobe` sobre `out/hespo-flujos.mp4` regenerado |
| CE-11 | Cada captura registra la rama y el commit de la que salió | `public/capturas/planificacion/origen.json` |
| CE-12 | Las capturas no muestran personas reales: organizaciones, contactos y teléfonos son de demostración | Revisión de cada captura (sección 4.2) |

## 3. Enfoque

Se reutiliza todo el primer video: Remotion, Hespo, la voz, los subtítulos, los tiempos y el
resaltado sobre capturas reales. El video nuevo es una segunda composición del mismo proyecto,
con su propio guion, sus escenas y sus capturas (sección 8).

Antes de empezar, el proyecto del primer video, su diseño y su plan se versionan en la rama
`docs/video-flujos`, creada desde `develop`. Hasta el 12 de noviembre solo existían en una copia
local.

## 4. Guion

Vive en `guion-planificacion.json`. Son 39 frases y 537 palabras. A 149 palabras por minuto, la
velocidad medida en el primer video (413 palabras en 166,7 s de voz), son unos 3:36 de voz. Con
pausas y transiciones, el total estimado es de 3:49, y entre 3:34 y 4:03 si la voz va de 160 a
140 palabras por minuto. Las duraciones por escena son estimaciones a 149 palabras por minuto.

En las columnas «Hespo» y «En pantalla», la pantalla es siempre la captura real (sección 4.1),
salvo en Inicio y Cierre.

### Inicio (unos 19 s)

| Id | Frase | Hespo | En pantalla |
|----|-------|-------|-------------|
| i1 | ¡Hola de nuevo! Soy Hespo. | Entra caminando desde la izquierda y saluda | Fondo verde y suelo arena |
| i2 | La vez pasada vimos las plantas y las incidencias del campus. | Se detiene al centro | Título «Hesperides» |
| i3 | Hoy les muestro cómo se planifica su mantenimiento, y cómo no chocar con los jardines prestados. | Gesto de presentar | El título sube |
| i4 | Son tres partes: las frecuencias, la planificación y las reservas. | Señala cada tarjeta | Tres tarjetas, una por parte |
| i5 | ¡Vamos! | Sale caminando por la derecha | Las tarjetas se desvanecen |

Donde aparece «Hesperides» (r2), `textoVoz` dice «Hespérides», como en el primer video.

### Frecuencias (unos 38 s)

| Id | Frase | Hespo | En pantalla |
|----|-------|-------|-------------|
| f1 | Empecemos por las frecuencias. | Entra caminando | Lista de frecuencias |
| f2 | Una frecuencia dice cada cuánto se hace una actividad, como el deshierbo de los jardines: cada 30 a 35 días. | Salta a la fila de Deshierbo y la señala | Se resalta «Cada 30 a 35 días» |
| f3 | Se puede definir de varias formas: cada cierto número de días, distinto según la estación, unas veces al año o dentro de una temporada. | Señala la columna Frecuencia | Se resaltan las filas con «Según la estación» (Canteo), «Mín. 2 veces al año» y «1 vez entre mar y may» |
| f4 | Al abrirla, se elige si rige en todo el campus o solo en algunas áreas, y si la hace personal propio o un servicio tercerizado. | Pulsa la fila | Se abre la frecuencia; se resaltan «Se aplica a» y la modalidad de ejecución |
| f5 | Si se cambia, rige desde hoy, y los reportes de meses anteriores mantienen la frecuencia de su momento. | Señala el aviso junto a los botones | Aviso «El cambio rige desde hoy…» |

### Planificación (unos 82 s)

| Id | Frase | Hespo | En pantalla |
|----|-------|-------|-------------|
| p1 | Ahora, la planificación. | Entra caminando | Lista de conjuntos |
| p2 | Primero se arman los conjuntos: grupos de jardines que se atienden juntos. | Señala una tarjeta de conjunto | Se resalta «6 jardines» |
| p3 | Se eligen en el mapa: con un clic se agrega un jardín, y arrastrando con la tecla Control se eligen varios a la vez. | Pulsa un jardín y luego arrastra | Selector sobre el mapa: un jardín se ilumina; un rectángulo agrega varios y la lista crece |
| p4 | Luego, una planificación une el conjunto con su actividad y su frecuencia. | Camina por el formulario | Nueva planificación: conjunto, actividad y la frecuencia propuesta |
| p5 | Con eso, el sistema junta lo que antes se calculaba a mano: cuándo fue la última vez, cada cuánto toca y cuánto falta. | Señala cada dato | Tarjeta con «Última vez», «Suele realizarse» y su estado |
| p6 | Apenas coordinación entra al sistema, el inicio le muestra los conjuntos atrasados y los que vencen en los próximos siete días. | Gesto de presentar | Inicio con los bloques «1 conjunto atrasado» y «1 conjunto vence en los próximos 7 días» |
| p7 | Desde ahí, pasa a la planificación. | Pulsa «Ir a Planificación» | Lista de planificaciones |
| p8 | Las tarjetas se ordenan por urgencia, primero lo atrasado, y se pueden filtrar por conjunto, actividad o estado. | Salta a la primera tarjeta y señala los filtros | Se resaltan «Atrasada» y los filtros |
| p9 | Al elegir una, el mapa ilumina sus jardines. | Pulsa la tarjeta | El mapa ilumina los jardines pendientes |
| p10 | Si una parte del conjunto ya se atendió, por ejemplo desde otro conjunto, la tarjeta lo dice y propone solo lo que falta. | Señala la barra de avance | Se resaltan «Al día: 1 de 6 jardines» y «Planificar los 5 pendientes» |
| p11 | Con un botón, el registro de la intervención llega lleno: la actividad, la fecha y los jardines. | Pulsa «Planificar los 5 pendientes» | Formulario prellenado con cinco ubicaciones |
| p12 | Se revisa, se ajusta si hace falta, y quien decide es coordinación. | Asiente | Se resalta el botón de guardar |
| p13 | Al guardar, la tarjeta pasa a programada, y cuando el capataz empieza, muestra cuántos jardines faltan. | Pulsa guardar; vuelve a la lista | «Programada (para el …)» y luego «En curso (faltan 3 jardines)» |

**Ajuste al recorrido aprobado (12 nov 2026).** El recorrido en chat mostraba el aviso «Sección X
ya tuvo Corte de césped hace 3 días» con «Quitar de esta intervención». En la rama actual, la
tarjeta ya descuenta lo atendido hace poco y propone solo los pendientes (SPEC-203 §5.5.1), así
que ese aviso no aparece en el flujo normal. El guion cuenta lo que la web hace hoy (p10 y p11).

### Reservas (unos 74 s)

| Id | Frase | Hespo | En pantalla |
|----|-------|-------|-------------|
| r1 | Y ahora, las reservas de jardines. | Entra caminando | Agenda de reservas |
| r2 | La universidad presta algunos jardines para actividades, y Hesperides registra quién usa cada uno, qué día y de qué hora a qué hora. | Señala una fila | Se resaltan el horario, el jardín y «Pedido de» |
| r3 | La agenda los muestra por día, con el estado de cada reserva: próxima, en curso o terminada. | Señala los encabezados y las etiquetas | Se resaltan «Hoy», «Mañana» y las tres etiquetas |
| r4 | Se puede filtrar por jardín o por organización, y cada tarjeta lleva a su ficha. | Señala los filtros | Se resaltan «Jardín» y «Organización» |
| r5 | Para registrar una, coordinación elige el jardín, el horario y la organización que lo pide, con la persona que hizo el pedido. | Pulsa «Nueva reserva» y camina por el formulario | El formulario se llena campo por campo |
| r6 | El responsable es a quien se llama si pasa algo en el jardín: al principio es quien lo pidió, y se puede cambiar. | Señala el campo | Se resalta «Responsable», ya lleno |
| r7 | Si ese día hay trabajo programado en el jardín o cerca de él, el sistema avisa antes de guardar. | Mira sorprendido el aviso | Aviso «A 6 m, … tiene trabajo por hacer de …» |
| r8 | Al guardar, se abre la ficha de la reserva, con el jardín iluminado en el mapa. | Pulsa guardar | Ficha con «Reserva RES-… registrada» y el mapa 3D |
| r9 | Y funciona también al revés: al programar un trabajo, el sistema avisa si ese día hay una reserva en el jardín o a diez metros o menos. | Camina al formulario de intervención | Aviso «A 6 m, Jardín … está reservado de 10:00 a 14:00 (…)» |
| r10 | Ningún aviso impide guardar: solo ayudan a decidir. | Levanta el pulgar | Se resalta el botón de guardar |

### Cierre (unos 15 s)

| Id | Frase | Hespo | En pantalla |
|----|-------|-------|-------------|
| c1 | Así se planifica el cuidado del campus. | Entra al centro | Fondo limpio |
| c2 | La frecuencia dice cada cuánto. | Señala a la izquierda | Tarjeta «Frecuencia: cada cuánto» |
| c3 | El conjunto, dónde. | Señala al centro izquierda | Tarjeta «Conjunto: dónde» |
| c4 | La planificación, qué toca. | Señala al centro derecha | Tarjeta «Planificación: qué toca» |
| c5 | Y la reserva, cuándo no molestar. | Señala a la derecha | Tarjeta «Reserva: cuándo no molestar» |
| c6 | ¡Gracias por acompañarme! Nos vemos en el campus. | Saluda y sale caminando | Título «Hesperides» |

### 4.1 Interacción con la página

Igual que en el primer video (§4.1 de su diseño): el fondo es la pantalla real, Hespo salta al
borde de un elemento real y lo pulsa, y la captura cambia al estado siguiente. Las capturas salen
de dos sesiones, porque las migraciones de las dos ramas chocan (después de la V038 que comparten,
Reservas usa V039–V044 y Conjuntos V039–V041) y no caben en una sola base:

| Sesión | Rama | Escenas | Pantallas |
|--------|------|---------|-----------|
| A | `feature/conjuntos-con-ejemplares` | Frecuencias y Planificación | `/intervenciones/frecuencias`, `/intervenciones/frecuencias/{id}`, `/intervenciones/conjuntos`, `/intervenciones/conjuntos/nuevo`, `/intervenciones/planificacion/nueva`, `/` (inicio), `/intervenciones/planificacion`, `/intervenciones/nueva?conjunto=&actividad=&pendientes=1` |
| B | `feature/spec-107-reservas-jardines` | Reservas | `/reservas`, `/reservas/nueva`, `/reservas/{codigo}?creada=1`, `/intervenciones/nueva` |

Cada sesión corre en un `git worktree` aparte y en su propio proyecto Docker desechable, que se
borra al terminar, como en el primer video. La copia de trabajo y los contenedores y volúmenes
`hesperides-*` no se tocan. Se entra con `coordinador@demo.invalid` y, para el avance de p13, con
`capataz@demo.invalid`.

### 4.2 Escenario de datos

El perfil `dev` trae el catálogo, las cuentas de demostración y unas incidencias. No trae
conjuntos, planificaciones, reservas, organizaciones ni contactos. Cada sesión arma su escenario
así:

- **Lo que la web crea, se crea por la web** (o por su API, con la misma cuenta): frecuencias,
  conjuntos, planificaciones, organizaciones, contactos, reservas e intervenciones programadas.
- **Lo que la web no puede fechar en el pasado se inserta por SQL**, solo en la base desechable:
  la vigencia de la frecuencia (para que f5 muestre las dos frases del aviso) y las ubicaciones
  de intervención completadas hace 39 días y hace 3 días. Las fechas se calculan desde el día de
  la captura, así que la tarjeta dice siempre los mismos días.
- **Organizaciones y contactos son de demostración**: «Organización de demostración» y
  «Organización invitada de demostración», con contactos «Ana Ejemplo» y «Bruno Ejemplo» y
  teléfonos 900 000 001 y 900 000 002. Los jardines y las secciones son los del campus.

| Sesión | Escenario |
|--------|-----------|
| A | Frecuencia «Deshierbo» (actividad del catálogo del cliente; no existe «Corte de césped»), cada 30 a 35 días, en todo el campus y con personal propio, vigente desde hace dos meses; otras tres de ejemplo para f3 (Canteo según la estación, Aplicación estacional y Fertilización), que en la tabla alfabética quedan junto a Deshierbo. Conjunto principal de 6 jardines contiguos, deshierbados hace 39 días salvo uno, que otro conjunto atendió hace 3 días. Otro conjunto que vence en los próximos 7 días, para el segundo bloque del inicio. |
| B | En otros jardines prestables, una reserva de mañana (Próxima), una en curso y una terminada hoy (la captura debe hacerse de día). La de mañana de 10:00 a 14:00 en el jardín del video se registra durante la captura (r5–r8). Una intervención programada para mañana en una sección a menos de 10 m de ese jardín, para los avisos de r7 y r9. |

Los nombres de los conjuntos y las secciones exactas se eligen en el plan, midiendo distancias
en la base. Cada captura se revisa antes de usarla.

## 5. Reglas de contenido

Rige la sección 5 del primer video. Este video agrega:

### 5.1 Respaldo de cada afirmación

Rama A: `feature/conjuntos-con-ejemplares`. Rama B: `feature/spec-107-reservas-jardines`.

| Afirmación | Rama | Respaldo |
|------------|------|----------|
| Una frecuencia dice cada cuánto; «Cada 30 a 35 días» | A | `frequencySummary.ts` |
| Formas: días, según la estación, veces al año, entre meses | A | `frequencySummary.ts` (`INTERVAL_DAYS`, `SEASONAL_PERIOD`, `ANNUAL_WINDOW`) |
| Rige en todo el campus o en algunas áreas; personal propio o tercerizado | A | `FrequencyScopeFields.tsx`, `FrequenciesTable.tsx` |
| Un cambio rige desde hoy y no altera reportes anteriores | A | `FrequencyForm.tsx:161`, `FrequencyVersioning.java`, SPEC-203 D-17 |
| Conjuntos elegidos en el mapa, con clic y con Control y arrastre | A | `SetMapPicker.tsx:92` y `:204`, SPEC-203 §5.2 |
| Una planificación une conjunto, actividad y frecuencia | A | `PlanningFormScreen.tsx`, SPEC-203 §5.3.1 |
| Última vez, cada cuánto y cuánto falta | A | `planningTexts.ts`, `PlanningEvaluator.java` |
| El inicio muestra atrasados y lo que vence en 7 días | A | `PlanningAlerts.tsx`, `app/(dashboard)/page.tsx`, `NEAR_DUE_DAYS` |
| Orden por urgencia, primero lo atrasado | A | `PlanningOrder.java` |
| Filtros por conjunto, actividad y estado | A | `PlanningFilters.tsx`, SPEC-203 §5.3.2 |
| El mapa ilumina los jardines | A | `PlanningMap.tsx` |
| Si una parte ya se atendió, propone solo lo que falta | A | `PlanningCard.tsx:27`, `:74` y `:111`, SPEC-203 §5.5.1 |
| El registro de la intervención llega lleno | A | `PlannedInterventionForm.tsx`, SPEC-203 §5.6 |
| Programada y luego en curso con lo que falta | A | `planningTexts.ts` (`STATE_LABELS`, `stateDetail`) |
| La universidad presta algunos jardines | B | SPEC-107 §2.0, V035 (19 jardines prestables) |
| Una reserva es un día, de una hora a otra | B | SPEC-107 §2.1 y D-01b |
| Agenda por día con Próxima, En curso y Terminada | B | `reservation-format.ts:54` y `:72`, `ReservationsScreen.tsx` |
| Filtros por jardín y organización; la tarjeta lleva a la ficha | B | `ReservationsScreen.tsx:89` y `:92`, `ReservationCard.tsx:66` |
| Jardín, horario, organización y solicitante | B | `ReservationForm.tsx`, SPEC-107 §5.1 |
| El responsable empieza siendo el solicitante y se puede cambiar | B | SPEC-107 §5.1 y D-02c, `ResponsibleChangeForm.tsx` |
| Aviso de trabajo cercano antes de guardar | B | `ReservationWarnings.tsx`, `ReservationsServiceImpl.java`, SPEC-107 D-07 |
| La ficha muestra el jardín en el mapa | B | `ReservationDetailScreen.tsx`, SPEC-107 §5.1 |
| Al programar trabajo, aviso de reserva a 10 m o menos | B | `ReservationNearbyNotice.tsx`, V039 (`RESERVATION_NEARBY_METERS` = 10) |
| Ningún aviso impide guardar | B | SPEC-107 D-07 |

### 5.2 Lo que el video no debe afirmar

Además de lo prohibido en el primer video:

- Que el sistema envía avisos, correos o notificaciones: los avisos se ven en pantalla.
- Que un aviso impide guardar.
- Que el sistema programa el trabajo por su cuenta: sugiere y decide coordinación.
- Que las reservas se repiten o se importan del calendario de la OSG.
- Nada sobre eventos bloqueantes, la recuperación del jardín después del préstamo ni reservas en
  el mapa del campus.
- Que el capataz o el operario planifican: Planificación es de ADMIN y COORDINADOR.

### 5.3 Lenguaje

Rige §5.3 del primer video. Además, el guion no usa «ronda», «ritmo», «alcance» ni «scope»
(SPEC-203 §2.1), ni códigos de estado como `OVERDUE`. Se dice «conjunto», «cada 30 a 35 días»,
«atrasada», «programada» y «en curso». Los códigos `RES-…` e `INT-…` se ven en pantalla y no se
pronuncian.

## 6. Hespo

Sin cambios. Usa solo las poses existentes: `quieto`, `saluda`, `senala`, `presenta`, `pulgar`,
`sorpresa`, `asiente` y `salta`.

## 7. Estilo visual

Sin cambios respecto del primer video. El Cierre usa cuatro tarjetas en lugar de tres; siguen
con texto de al menos 32 px.

## 8. Arquitectura

```
docs/demos/video-flujos/
  guion.json                       Primer video (sin cambios)
  guion-planificacion.json         Este video
  scripts/
    generar_voz.py                 Acepta --guion y --salida; por defecto, el primer video
    capturas.ts                    Primer video (sin cambios)
    capturas-planificacion.ts      --sesion a | b
    escenario/                     SQL del historial fechado, uno por sesión
  public/voz/planificacion/        Audio y manifiesto de este video (ignorados)
  public/capturas/planificacion/   Capturas y medidas de este video (ignoradas)
  src/
    Root.tsx                       Registra VideoFlujos y VideoPlanificacion
    guion.ts                       Carga cualquiera de los dos guiones
    escenas/planificacion/         Inicio, Frecuencias, Planificacion, Reservas y Cierre
    (hespo/, ui/, pagina/, tiempos.ts, tema.ts se comparten)
  out/hespo-planificacion.mp4
```

| Unidad | Responsabilidad | Depende de |
|--------|-----------------|------------|
| `guion-planificacion.json` | Frases, voz y acciones de Hespo de este video | Nada |
| `generar_voz.py --guion` | Un MP3 por frase y su manifiesto, en la carpeta del video | El guion elegido |
| `capturas-planificacion.ts` | Arma el escenario de su sesión, maneja la web y guarda capturas, medidas, rama y commit | La aplicación de esa rama en local |
| `escenario/*.sql` | Fechas pasadas que la web no permite registrar | La base desechable de la sesión |
| `escenas/planificacion/` | Dibuja cada parte a partir de la frase activa | `tiempos.ts`, `hespo/`, `ui/`, `pagina/` |
| `VideoPlanificacion` | Coloca escenas, audio y subtítulos | Todo lo anterior |

**Comandos nuevos:** `npm run capturas:planificacion -- --sesion a|b`,
`npm run render:planificacion` y `npm run estudio` (que muestra las dos composiciones).

**Aislamiento.** Igual que el primer video: no cambia frontend, backend ni CI. Las ramas A y B se
leen desde sus worktrees, sin modificarlas.

## 9. Manejo de errores

Rige §9 del primer video. Además:

| Situación | Comportamiento |
|-----------|----------------|
| Una pantalla cambió y el script no encuentra un elemento | La sesión falla e indica la pantalla y el elemento; no se guarda una captura a medias |
| El SQL del escenario no coincide con el esquema de la rama | La sesión se detiene antes de capturar e indica la tabla |
| La sesión B corre de noche y no caben las reservas en curso y terminada del mismo día | Se detiene y lo indica; no se inventa un estado |
| Faltan capturas de una sesión al renderizar | El render falla e indica la sesión que falta |

## 10. Verificación

Rige §10 del primer video, aplicado a este guion y a este MP4. Además:

- `guion.test.ts` revisa los dos guiones, con los términos de §5.3 y las afirmaciones de §5.2 de
  este documento para el segundo.
- CE-10: las pruebas y el render del primer video no cambian.

**Revisiones del usuario**

1. Una escena de muestra (Planificación) con capturas reales y audio.
2. Borrador completo en menor resolución.
3. Video final en 1080p.

## 11. Fuera de alcance

- Lo que quedó fuera del primer video.
- Registro masivo de reservas, confirmación del solicitante y marca de uso del espacio.
- Edición del responsable y su historial en pantalla.
- Reporte mensual de cumplimiento.
- Cambios en las ramas A y B o en sus pantallas.

## 12. Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Las ramas A y B siguen cambiando y las capturas envejecen | Cada captura guarda su commit; rehacerlas es un comando por sesión. La versión final se graba cuando sus autores congelen esas pantallas |
| Las ramas se integran con otra numeración de migraciones | El escenario usa la API y SQL sobre tablas, no números de migración |
| La pantalla del registro de intervención difiere entre A y B | p11 se captura en A y r9 en B; cada escena muestra su rama |
| Los datos de demostración parecen reales | Nombres y teléfonos claramente de demostración (§4.2) |
| La licencia de Remotion | Como en el primer video: confirmarla antes de distribuir |
