# SPEC-113 — Globos del mapa

| Campo | Valor |
|-------|-------|
| HU relacionada | REQ 2.1 Mapa interactivo · REQ 2.4 Filtros en mapa · REQ 3.4 Zona intervenida en mapa · REQ 5.1/5.3 Incidencias · REQ 7.1/7.2 Riego · REQ 1.12 Eventos (préstamos) |
| Autor | Jean Piero David Morán |
| Plataforma | Web (el WebView de Android hereda el visor) |
| Sprint | — |
| Dependencias | SPEC-102 (visor), SPEC-107 (reservas), SPEC-200 (intervenciones), SPEC-201 (incidencias), SPEC-203 (planificación por conjuntos: maneja el riego) |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-102 §5 (visor, etiquetas, ficha) · SPEC-107 §2.1 (estado de
> una reserva) · SPEC-201 (estados de incidencia) · SPEC-200 §2.7 (estado por ubicación) ·
> SPEC-203 §5.4, §5.5 y §5.5.1 (última vez de un jardín y su estado).

> Mientras la feature no esté implementada, este spec es la fuente de verdad y el detalle se
> escribe literal. Al cerrarla, el detalle se sustituye por un puntero al código.

---

## 1. Objetivo

Mostrar sobre el mapa 3D, con globos al estilo Waze, **lo que está pasando** y **lo que pide
atención** en las áreas verdes, para que jefatura y capataces vean el estado del campus de un
vistazo sin entrar a cada módulo.

## 2. Contexto

Hoy cada módulo tiene su lista (incidencias, intervenciones, planificación, reservas) y el mapa
solo muestra inventario permanente (vegetación, tachos, bebederos, lugares). Nadie ve en un solo
lugar qué ocurre ahora ni dónde.

### 2.1 Vocabulario

| Término | Qué es |
|---|---|
| **Globo** | Un marcador con forma de globo de Waze que representa **algo que ocurre o que pide una acción** en un sitio. Lo permanente es una **capa**, no un globo. |
| **Tipo de globo** | Qué representa (§5.1). Cada tipo tiene un dibujo y un color propios. |
| **Globo de atención** | Uno que existe porque algo está mal o falta: incidencia abierta, sección por regar. Se va cuando alguien actúa. |
| **Globo de actividad** | Uno informativo: intervención en curso, riego, reserva en curso. Se va solo cuando la actividad termina. |
| **Ancla** | El punto donde se clava el globo: un **ejemplar** o una **sección** (su punto interior), o el punto registrado de una incidencia. |
| **Minigrupo** | Parte de un conjunto de jardines cuyos miembros están cerca entre sí (§5.3). Un conjunto disperso se muestra como varios minigrupos, un globo por cada uno. |
| **Globo de grupo** | El globo con un número que junta varios globos al alejar el mapa (§5.4). |

### 2.2 Backend

- Paquete: `pe.edu.pucp.hesperides.modules.balloons`
- Abstracción: `BalloonSource` (una por tipo de origen). Cada módulo dueño de los datos
  implementa la suya **en su propio paquete** (`incidents`, `interventions`, `planning`,
  `reservations`); `balloons` solo conoce la interfaz (D-01).
- Servicio: `BalloonService` — pide a cada fuente sus globos vigentes, los parte en minigrupos y
  los ordena.
- Engine puro `engine/balloons/`: partición en minigrupos (§5.3) y orden (§5.5). Sin Spring ni JPA.
- Controller: `BalloonController` → `GET /api/v1/map/balloons`
- Sin tablas nuevas: todo se calcula al vuelo desde los módulos dueños (D-02).

### 2.3 Frontend web

- Pantalla: `/mapa` (SPEC-102). No hay ruta nueva.
- Dibujos: `frontend/public/map/balloons/*.svg`, generados por `scripts/mapa/globos.mjs` (D-06).
- Componentes nuevos:
  - `components/map3d/viewer/balloons.ts` — coloca los globos como elementos HTML sobre la escena,
    igual que `labels.ts`, y decide qué se ve según la distancia de la cámara (§5.4).
  - `components/map3d/balloons/balloonClusters.ts` — agrupación pura (sin three.js), testeable.
  - `components/map3d/balloons/BalloonCard.tsx` — la ficha corta (§7.2).
  - `components/map3d/balloons/useBalloons.ts` — carga y refresco (§5.6).
- Reutilizados: la ficha de `MapInfoCard` (mismo marco), `LayerToggles` (interruptor «Globos»).

### 2.4 Móvil

Fuera de alcance como pantalla propia: el WebView de Android muestra `/mapa` y hereda los globos.
Se verifica que se puedan tocar con el dedo (§7.1).

### 2.5 Restricciones técnicas

- DEBE usar: los SVG de `public/map/balloons/` tal cual; elementos HTML sobre el canvas (como
  `labels.ts`), no sprites de three.js — así el globo es accesible y nítido a cualquier zoom.
- NO debe usar: librerías de clustering (supercluster y similares): con decenas o pocos cientos
  de globos, una agrupación propia de pocas líneas basta y se adapta a la cámara 3D.
- NO debe guardar los globos en IndexedDB como las capas (SPEC-102 §5.1): son del presente y una
  copia vieja engaña.
- Catálogos aplicables: `INCIDENT_STATUS`, `URGENCY_LEVEL`, estado de ubicación de intervención
  (SPEC-200). El **tipo de globo no es catálogo** (D-04).

### 2.6 Decisiones propias de este spec

| # | Decisión | Por qué | Descartado |
|---|---|---|---|
| D-01 | Un solo endpoint que junta fuentes; cada módulo aporta la suya detrás de `BalloonSource` | El estado ya lo calcula el servidor (p. ej. «Atrasado» en SPEC-203); sumar una fuente no toca las otras | Que el navegador junte las listas de cada módulo: duplica reglas de estado y son 4 llamadas |
| D-02 | Sin tablas: los globos se calculan en cada consulta | Son una vista del presente; guardarlos obliga a sincronizarlos con cada cambio de estado | Tabla `map_balloons` actualizada por eventos |
| D-03 | La agrupación por zoom la hace el navegador; los minigrupos de un conjunto, el servidor | La primera depende de la cámara; los segundos, de la geometría de los jardines, que vive en PostGIS | Agrupar también por zoom en el servidor: solo conviene con miles de globos |
| D-04 | El tipo de globo es una constante de código, no un catálogo | Cada tipo exige su dibujo y su fuente en código; un tipo nuevo desde el catálogo no tendría ni una ni otra | Catálogo `BALLOON_KIND` (INV-2 aplica a datos de dominio editables, no a esto) |
| D-05 | Todos los roles con sesión ven todos los globos; la ficha corta solo lleva datos de lectura y el enlace al módulo, que vuelve a comprobar permisos | Decisión del usuario (15 nov 2026): los capataces ven los de todos | Filtrar por sector del capataz |
| D-06 | Los SVG salen de un generador en el repo | Forma, cola y tinta comunes en un solo lugar | SVG editados a mano uno por uno |
| D-07 | Globos y mapa de calor (REQ 6.9, aún no construido) no se muestran a la vez | El mapa de calor resume la historia; los globos, el presente. Juntos se tapan | Superponerlos |
| D-08 | El riego sale de la **planificación** (SPEC-203) y de las intervenciones de clase `RIEGO` (SPEC-200). El módulo de turnos de riego (`modules/irrigation`, `/riego`) **se elimina** | Decisión del usuario (15 nov 2026): planificación ya maneja el riego; dos registros del mismo trabajo se contradicen | Turnos de riego como fuente |
| D-09 | «Sección por regar» usa el estado por jardín de SPEC-203 §5.5.1 con la regla de frecuencia de riego vigente; **solo para jardines con al menos un riego registrado** | Decisión del usuario (15 nov 2026): sin eso, el mapa se llena de globos de jardines que nunca tuvieron registro | Avisar también de los jardines sin registro previo |
| D-11 | El atraso de «Sección por regar» se mide sobre los jardines que el globo cubre: el regado hace más tiempo contra el máximo de la regla (`rhythm.maxDays`). Sin máximo, manda el estado de la fila | Planificación juzga el conjunto por su jardín más desatendido, que puede ser uno nunca regado; el globo, que no lo muestra, quedaría «por vencer» con un jardín 5 días tarde | Usar siempre el estado de la fila |
| D-12 | El tipo de globo es un `enum` de Java (`engine/balloons/BalloonKind`), como `ReservationState` | Es código, no dato administrable (D-04); el enum lleva su rango de urgencia y si pide atención | Constantes sueltas |
| D-10 | Solo salen las incidencias **aprobadas** (registro oficial). Una aprobada sin urgencia lleva el globo de **aro blanco** | Decisión del usuario (15 nov 2026). La aprobación no exige urgencia (SPEC-201) | Mostrar las pendientes de aprobación |

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/map/balloons` | Cualquier rol con sesión | Los globos vigentes ahora, ya partidos en minigrupos |

Respuesta (`data`):

```json
{
  "generatedAt": "2026-11-15T10:42:00-05:00",
  "balloons": [
    {
      "id": "INCIDENT:42",
      "kind": "INCIDENT",
      "variant": "HIGH",
      "attention": true,
      "latitude": -12.0689,
      "longitude": -77.0794,
      "sectorId": 3,
      "memberCount": 1,
      "card": {
        "title": "Rama caída sobre la vereda",
        "status": "En atención",
        "lines": [
          { "label": "Urgencia", "value": "Alta" },
          { "label": "Abierta hace", "value": "3 días" }
        ],
        "progress": null,
        "photoUrl": null,
        "href": "/incidencias/42"
      }
    }
  ]
}
```

- `kind`: `INCIDENT` · `INTERVENTION` · `IRRIGATION` · `IRRIGATION_DUE` · `RESERVATION` ·
  `BLOCKING_EVENT` (fuente: SPEC-114) · `MACHINERY_CUT` (fuente: SPEC-115).
- `variant`: en `INCIDENT`, la urgencia (`HIGH`, `MEDIUM`, `LOW`, `NONE` sin urgencia); en `IRRIGATION_DUE`,
  `OVERDUE` o `DUE`; `null` en los demás.
- `id`: `<KIND>:<id de origen>`, y `#<n>` cuando un conjunto se parte en minigrupos
  (`IRRIGATION_DUE:7#2`). Es estable entre consultas mientras el origen no cambie: el navegador
  lo usa para no redibujar lo que no cambió y para mantener abierta la ficha.
- `sectorId`: el sector de la sección del ancla; `null` si el ancla no cae en ninguna (§5.4).
- `card.lines`: texto ya formateado en español por el servidor; el navegador no interpreta
  estados. Máximo 4 líneas.
- `card.progress`: `{ "done": 2, "total": 4 }` solo cuando hay avance parcial.
- `unavailableKinds`: tipos cuya fuente falló en esta consulta (§3.1); `[]` si ninguna.

### 3.1 Decisiones que el código no explica

- **La ficha viene armada del servidor** (`lines` con texto final): así un tipo nuevo no exige
  tocar el navegador, y las reglas de estado no se duplican (D-01).
- **Sin paginación:** se espera del orden de decenas; el tope duro es `MAX_BALLOONS = 500`. Si se
  supera, se devuelven los 500 primeros según el orden de §5.5 y `message` lo dice.
- **Una fuente que falla no tumba el endpoint:** se registra el error (con la fuente, sin datos
  personales) y se responde con el resto. La respuesta lleva `"unavailableKinds": ["…"]` para que
  la leyenda avise.

## 4. Migración de base de datos

No aplica: no hay tablas nuevas (D-02). Las consultas usan los índices existentes de
`incidents`, `intervention_locations`, las tablas de conjuntos y asignaciones de SPEC-203,
`garden_reservations` y la geometría de `zones`. La eliminación de `irrigation_turns` (D-08) es
un cambio aparte, con su propia migración.

## 5. Comportamiento

### 5.1 Tipos de globo y cuándo existen

| Tipo (`kind`) | Dibujo | Color | Atención | Existe mientras… | Ancla | Ficha |
|---|---|---|---|---|---|---|
| Incidencia abierta (`INCIDENT`) *(desde el rediseño de SPEC-201: activada y no cerrada; sin coordenadas, se clava en su zona; la capa «Incidencias» por plazo nace apagada para no duplicarla)* | Alerta con hoja | Rojo / naranja / amarillo según urgencia; **aro blanco** sin urgencia | Sí | Está **aprobada** y no resuelta: `OPEN`, `IN_PROGRESS` o `RESOLUTION_OBSERVED` (D-10) | Su latitud y longitud | Título, estado, urgencia («Sin urgencia»), días abierta |
| Intervención en curso (`INTERVENTION`) | Capataz con casco | Verde | No | Alguna de sus ubicaciones está en ejecución (SPEC-200), **y su clase no es Riego** | Cada ubicación en ejecución (sección o ejemplar), en minigrupos | Actividad, capataz, avance «2 de 4», última foto |
| Riego en curso o de hoy (`IRRIGATION`) | Aspersor | Azul | No | Intervención de clase **Riego** con una ubicación en ejecución, **o** con fecha programada hoy y sin empezar (D-08) | Sus ubicaciones, en minigrupos | Tipo de riego, conjunto si lo hay, capataz, hora de inicio (o «Programado para hoy»), «dentro / fuera de la ventana 6:30–11:30» |
| Sección por regar (`IRRIGATION_DUE`) | Gota con reloj | Naranja | Sí | En un conjunto con una asignación de riego, el jardín **falta** (SPEC-203 §5.5.1: `DUE` u `OVERDUE`), **tiene al menos un riego registrado** (D-09) y no está en un riego abierto | Los jardines que faltan del conjunto, en minigrupos | Conjunto, «6 días tarde» o «vence en 2 días», «Faltan 2 de 4», «Último riego: 2 nov» |
| Reserva en curso (`RESERVATION`) | Toldo | Celeste | No | Estado **En curso** (SPEC-107) | Punto interior del contorno del jardín reservado | Jardín, «Pedido de», horario, uso derivado |
| Evento bloqueante (`BLOCKING_EVENT`) | Calendario prohibido | Morado | No | Un bloqueante de **sector o sección** del calendario del campus ocurre hoy y, con horario, mientras dura (SPEC-114 §5.5). Los de todo el campus van a la franja (`campusNotices`) | Punto interior de su zona | Nombre, horario o «Todo el día», tipo, ámbito |
| Corte con maquinaria (`MACHINERY_CUT`) | Cortacésped | Gris | No | Intervención con maquinaria de corte, programada desde hoy hasta dentro de 7 días, con alguna ubicación sin completar (SPEC-115 §5.4) | Sus ubicaciones, en minigrupos | Actividad, «Programada el sáb 21 nov», capataz |

Los dos últimos tienen dibujo y lugar en la leyenda, pero **ninguna fuente en esta entrega**:
mientras no la tengan, no aparecen ni en la leyenda.

### 5.2 Flujo principal

1. El usuario entra a `/mapa` → el visor carga las capas (SPEC-102) y, en paralelo,
   `GET /map/balloons`.
2. Con la cámara lejos → ve un globo de grupo por sector con su número (§5.4).
3. Acerca la cámara → los grupos se abren en globos individuales.
4. Pulsa un globo → se abre la ficha corta sobre el mapa, con «Ver detalle» que lleva al módulo.
5. Pulsa un globo de grupo → la cámara se acerca hasta encuadrar sus miembros.

### 5.3 Minigrupos de un conjunto

Un tipo cuyo origen abarca varios jardines (una intervención con varias ubicaciones, los jardines
por regar de un conjunto) produce **un globo por conjunto de jardines**. Si
están dispersos, se parte en minigrupos:

- Dos anclas van al mismo minigrupo si están a `MINI_GROUP_LINK_M = 60` m o menos, de forma
  transitiva (enlace simple): A cerca de B y B cerca de C juntan a A, B y C.
- El globo de cada minigrupo se clava en el **centro de sus anclas**, ajustado al ancla más
  cercana a ese centro (así nunca cae en un edificio entre dos jardines).
- `memberCount` es cuántos jardines o ejemplares cubre ese minigrupo; la ficha dice «Faltan 2
  de 4» con el total del conjunto, no del minigrupo.
- El valor de 60 m es una constante con nombre; se ajusta al verificar en el navegador.

### 5.3b Dónde se posa el globo (pedido del usuario, 16 nov 2026)

Un globo **nunca se posa sobre un edificio**: va sobre un jardín (sección activa), un ejemplar o
un grupo de ellos. El servidor decide el punto final (`BalloonPlacer`), ya ordenados por urgencia:

1. Si el punto cae dentro de un jardín, ese es su jardín (el más chico, si hay dos encimados).
2. Si no, y está a `SPECIMEN_METERS = 1,5` m o menos de un ejemplar (o dentro de una agrupación),
   se queda sobre el ejemplar: los árboles de veredas y plazas no tienen jardín.
3. Si no, va al jardín más cercano a `NEAREST_GARDEN_METERS = 100` m o menos; más lejos, se queda
   donde está.
4. Un globo solo dentro de su jardín conserva su punto. Uno que llegó de fuera, o **varios que
   comparten jardín**, se reparten en una **cuadrícula centrada** en el punto del jardín más lejano
   de sus bordes (centro de `ST_MaximumInscribedCircle`), en metros (`GardenGrid`): el más urgente al centro; con un número par la
   cuadrícula se corre media celda (dos quedan a cada lado del centro; tres, en fila). Se prueba la
   mayor separación que quepa entera dentro del polígono, con cada globo a media separación o más
   del borde (un punto apenas dentro se ve sobre la vereda): 12, 8, 5, 3 y 1,5 m. Si ni 1,5 m alcanza,
   los que sobran van al centro.

El punto es fijo en el mapa: el navegador no corre los globos al mover la cámara ni al acercarse.

### 5.4 Agrupación por zoom (estilo Waze)

- **Lejos** (distancia de cámara ≥ `FAR_DISTANCE_M`): un globo de grupo **por sector** con el
  número de globos que contiene, clavado sobre el miembro más cercano al centro de sus miembros
  (`memberNearestCenter`): el promedio puede caer sobre un edificio. Los globos sin sector se
  juntan en un grupo «Otros» en el centro del campus.
- **Media distancia** (entre `BALLOON_GROW_FROM_M` y `FAR_DISTANCE_M`): globos individuales; si dos se
  pisan en pantalla, se juntan en un globo de grupo temporal con su número, clavado donde el más
  urgente, como hace `labels.ts` con las etiquetas.
- **Cerca** (a menos de `BALLOON_GROW_FROM_M = 350` m): cada globo suelto en su punto (§5.3b), sin juntarse.
- El globo de grupo es oscuro con el número; si **alguno de sus miembros pide atención**, lleva un
  punto del color de la atención más urgente que contiene.
- `FAR_DISTANCE_M = 700` m (`viewer/balloons.ts`): la distancia a la que dejan de verse los nombres de
  jardín. Se ajusta al verificar en el navegador.
- Tocar un grupo acerca la cámara hasta encuadrar a sus miembros (`focusPoints`).
- **Sin abanico** (16 nov 2026): el abanico en pantalla sacaba los globos del jardín al mover la
  cámara; lo reemplaza el reparto en el jardín de §5.3b, fijo en el mapa.
- **Tamaño al acercarse** (mismo pedido): hasta 350 m el globo mide 40 × 41 px; más cerca crece con el
  mapa, hasta el doble (`BALLOON_MAX_SCALE = 2`), para no verse cada vez más chico frente a los jardines.

### 5.5 Orden y prioridad

Cuando dos globos compiten por el mismo sitio en pantalla, y en el tope de §3.1, gana en este
orden: incidencia alta → incidencia media → sección por regar atrasada → incidencia baja →
incidencia sin urgencia → sección por regar que vence → riego → intervención → reserva. Los de atención se dibujan encima.

### 5.6 Refresco

- Se vuelve a pedir cada `REFRESH_SECONDS = 60` mientras la pestaña está visible, y al volver a
  ella. No se refresca con la pestaña oculta.
- Si la ficha de un globo está abierta y el globo deja de existir, la ficha muestra «Esto ya
  terminó» y se cierra al pulsar fuera; no desaparece de golpe bajo el dedo.

### 5.7 Casos límite

- **Incidencia sin coordenadas:** no tiene globo (no hay dónde clavarlo).
- **Incidencia sin urgencia:** globo de aro blanco (D-10). Si es la más urgente de un grupo, el
  punto del globo de grupo es blanco.
- **Incidencia pendiente de aprobación o con corrección pedida:** sin globo, aunque tenga
  coordenadas (D-10).
- **Ubicación de intervención con lugar sin sección ni punto:** se ancla al punto interior del
  lugar; si tampoco hay, no tiene globo.
- **Un mismo jardín con riego abierto y por regar:** solo el de riego (la condición de
  `IRRIGATION_DUE` excluye los riegos abiertos).
- **Jardín por regar que nunca tuvo riego registrado:** sin globo (D-09). La fila de
  Planificación sigue diciendo «N jardines sin registro previo»; el mapa no.
- **Jardín en dos conjuntos con riego:** un globo por conjunto; comparten jardín y se reparten en
  él (§5.3b). A media distancia, si se pisan, la agrupación de pantalla (§5.4) los junta en un grupo de 2.
- **Incidencia con el punto sobre un edificio:** su globo pasa al jardín más cercano (§5.3b); la
  incidencia guarda su punto original.
- **Conjunto sin asignación de riego:** sus jardines nunca generan «Sección por regar».
- **Riego programado para hoy en un domingo con reserva en curso en el mismo jardín:** se ven los
  dos; no es tarea de este spec avisar del choque.
- **Sin WebGL:** la vista de listas de SPEC-102 muestra los globos como una lista agrupada por tipo.
- **El interruptor «Globos» apagado:** no se piden globos ni se refrescan.

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Una incidencia registrada, urgencia alta y con coordenadas, aparece con el globo rojo en su punto | Registrar y aprobar una; abrir `/mapa` y acercarse |
| CA-02 | Al resolverla, su globo desaparece en el siguiente refresco | Resolverla en otra pestaña; esperar ≤ 60 s |
| CA-03 | Una intervención de poda con 4 ubicaciones en dos zonas alejadas muestra 2 globos verdes, y la ficha dice el avance del total | Iniciar 4 ubicaciones, 2 cerca entre sí y 2 a más de 60 m |
| CA-04 | Un riego manual en ejecución muestra el globo azul, no el verde, y desaparece al completarse | Iniciar y luego completar una ubicación de una intervención de clase Riego |
| CA-05 | Un conjunto con riego atrasado en 2 de 4 jardines, todos regados antes, muestra el globo naranja solo sobre los 2 que faltan, con «Faltan 2 de 4» | Datos de demostración de SPEC-203 |
| CA-05b | Un jardín atrasado que nunca tuvo riego no muestra globo | Agregar al conjunto un jardín sin registro |
| CA-05c | Una incidencia aprobada sin urgencia muestra el globo de aro blanco; una pendiente de aprobación no muestra globo | Registrar dos; aprobar una sin urgencia |
| CA-06 | Una reserva en curso muestra el globo celeste sobre su jardín y desaparece al pasar su hora de fin | Crear una reserva que termine en 5 min |
| CA-07 | Con la cámara lejos se ven solo globos de grupo por sector con su número; al acercarse se abren | Alejar y acercar con la rueda |
| CA-08 | Un globo de grupo que contiene una incidencia alta lleva el punto rojo | Igual que CA-07 con la incidencia de CA-01 |
| CA-09 | Un capataz ve los globos de los tres sectores | Iniciar sesión como `SUPERVISOR` |
| CA-10 | Pulsar un globo abre la ficha corta; «Ver detalle» lleva al módulo | Navegador real, en escritorio y en el WebView de Android |
| CA-11 | Si una fuente falla, el resto de globos se ve y la leyenda avisa cuál falta | Apagar la fuente de reservas en un test o forzar un error |
| CA-12 | Apagar «Globos» los quita y deja de pedirlos; encenderlo los trae | Interruptor en el panel de capas; pestaña Red del navegador |
| CA-13 | Dos incidencias en el mismo punto de un jardín se ven como dos globos dentro del jardín, a cada lado de su centro, y no se mueven al girar, desplazar o acercar la cámara | Jardín Tesorería en los datos de demostración |
| CA-14 | Una incidencia con el punto sobre un edificio muestra su globo en el jardín más cercano | Registrar una sobre un pabellón |

## 7. Especificación visual

### 7.1 El globo

- Dibujos de `public/map/balloons/`: `incidencia-alta|media|baja|sin-urgencia`, `intervencion-en-curso`,
  `riego-en-curso`, `seccion-por-regar`, `reserva-en-curso`, `evento-bloqueante`,
  `corte-maquinaria-pendiente`, `grupo`.
- Tamaño en pantalla: 40 × 41 px en escritorio, 48 × 49 px en táctil (≥ 44 px para el dedo). La
  punta de la cola toca el ancla.
- `grupo.svg` no lleva número: el visor escribe encima el número real como texto HTML; «99+» desde 100.
- `aria-label` con el tipo y el título («Incidencia alta: Rama caída sobre la vereda»); navegable
  con Tab; Enter abre la ficha.
- Hover en escritorio: el globo sube 2 px y muestra el título como tooltip.

### 7.2 La ficha corta

```
┌──────────────────────────────────┐
│ INCIDENCIA · ALTA            ✕   │
│ Rama caída sobre la vereda       │
│ En atención                      │
│ Abierta hace   3 días            │
│ [foto opcional]                  │
│ ▓▓▓▓▓░░░░░  2 de 4   (si avance) │
│                   Ver detalle →  │
└──────────────────────────────────┘
```

Mismo marco que `MapInfoCard` (SPEC-C01). Solo una ficha abierta a la vez; abrir otra cierra la
anterior. En móvil sale abajo, a todo el ancho.

### 7.3 Leyenda

El panel de capas gana el interruptor «Globos» (encendido por defecto) y, debajo, los tipos con
fuente y su dibujo, con un contador. Un tipo sin globos ahora se muestra atenuado con «0».

## 8. Tests

```
Engine · minigrupos
- 4 anclas: 2 a 10 m entre sí y 2 a 200 m de ellas → 2 minigrupos de 2
- cadena A–B 50 m, B–C 50 m, A–C 100 m → 1 minigrupo (transitivo)
- un solo ancla → 1 minigrupo de 1; lista vacía → ningún globo (no un globo vacío)
- el punto del minigrupo es siempre uno de sus anclas
- ids estables: misma entrada → mismos ids `#n`

Engine · orden
- incidencia alta antes que sección por regar atrasada, y esta antes que incidencia baja

Fuentes
- incidencia PENDING_APPROVAL, CHANGES_REQUESTED o RESOLVED → sin globo
- incidencia sin coordenadas → sin globo
- incidencia aprobada sin urgencia → INCIDENT con variant NONE
- intervención de clase Riego en ejecución → IRRIGATION, nunca INTERVENTION
- intervención de Riego programada hoy sin empezar → IRRIGATION; programada mañana → sin globo
- jardín DUE u OVERDUE con riego previo → IRRIGATION_DUE; sin riego previo → sin globo
- jardín por regar con riego abierto → sin IRRIGATION_DUE
- jardín al día (NOT_DUE o DONE_FOR_PERIOD) → sin globo
- reserva Próxima, Terminada o Anulada → sin globo

Servicio
- una fuente que lanza excepción → respuesta ok con el resto y `unavailableKinds`
- más de MAX_BALLOONS → se recorta respetando el orden

Engine · reparto en el jardín (§5.3b)
- un globo → el centro; dos → simétricos al centro, a la separación pedida; tres → en fila centrada
- los candidatos van del centro hacia afuera; misma entrada → mismo orden

Posado (integración)
- dos incidencias en el mismo punto → dos puntos distintos dentro del jardín, centrados en él y a
  3 m o más del borde, el más urgente primero
- una incidencia a 25 m de un jardín, fuera de todo jardín → su globo cae dentro de ese jardín
- una incidencia sobre un ejemplar suelto → su globo se queda en el punto

Frontend · agrupación por zoom
- lejos → un grupo por sector con el conteo correcto; sin sector → «Otros»
- grupo con una incidencia alta → punto rojo
- dos globos que se pisan en pantalla, a media distancia → un grupo de 2
- un grupo se clava sobre el miembro más cercano al centro, no en el promedio
```

## 9. Propio de este spec

- La ficha corta **nunca** lleva teléfonos ni datos del Directorio (la reserva muestra «Pedido
  de» con el nombre de la organización, no el contacto); quien necesite el contacto entra al
  detalle, que aplica sus propios permisos.
- Verificación en navegador real (INV-10) con los tres roles y en el WebView de Android.
- Agregar un tipo de globo = un dibujo en `scripts/mapa/globos.mjs`, un valor de `kind`, una
  `BalloonSource` y una fila en §5.1. Nada más debería cambiar.

## 10. Pendientes fuera de este spec

- **Eliminar el módulo de turnos de riego** (D-08): **hecho el 15 nov 2026** en
  `refactor/elimina-turnos-riego`. Se borraron el backend `modules/irrigation`, la pantalla
  `/riego`, su menú y sus tipos; V063 borra las tablas. El reporte semanal (SPEC-202 D-15) lee
  ahora las intervenciones de clase Riego, y los conjuntos piden sus secciones a
  `GET /green-area-sets/section-options`.
- **Fuentes de `BLOCKING_EVENT` y `MACHINERY_CUT`:** llegaron con SPEC-114 y SPEC-115.
