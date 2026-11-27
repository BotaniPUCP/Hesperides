# SPEC-201 — Incidencias de áreas verdes (rediseño)

| Campo | Valor |
|-------|-------|
| HU relacionada | REQ 5.1–5.9 (catálogo M5) |
| Autor | Jean Piero David Morán |
| Plataforma | Web (navegador del celular para el capataz) |
| Dependencias | SPEC-001 Anexo A, SPEC-002 §4.8, SPEC-005 §4.3, SPEC-102 (mapa), SPEC-106 (Directorio), SPEC-200 (Intervenciones), SPEC-202 (Reportes) |
| Estado | Borrador, 15 nov 2026. Sustituye la versión de SPEC-201 del 5 nov |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Prioridad de fuentes, en este orden:** (1) la definición de septiembre (SPEC-002 §4.8,
> SPEC-001 Anexo A, SPEC-005 §4.3 y `docs/dominio/catalogo-requisitos.md` M5); (2) de la versión
> de noviembre solo lo enumerado en §2.6; (3) del prototipo `docs/propuestas/incidencias-hesperides.html`
> solo lo enumerado en §2.7. Lo que no aparece en este spec no se hereda de ninguna.

---

## 1. Objetivo

Que el capataz reporte en segundos un problema de un área verde (texto libre y gravedad), que un
agente de IA prellene la clasificación, que coordinación la active y la atienda con intervenciones
reales, y que el mapa avise qué incidencias están por vencer o vencidas.

## 2. Contexto

### 2.1 Por qué se rehace

La versión del 5 nov adoptó la matriz OSG del cliente (23 columnas, causas y CSV), generó un
correlativo `OSG-####` propio y llegó a siete estados. Eso contradice tres decisiones previas:
`fuera-de-alcance.md` (no adoptar ni custodiar la matriz; Hesperides **nunca** genera códigos OSG),
SPEC-005 §4.3 (`external_code` guarda el código OSG real de la universidad) y el catálogo 5.3 (tres
estados). Se conserva su integración con Intervenciones y su robustez técnica, que sí son correctas.

### 2.2 Enfoque elegido

**Ajustar el módulo existente en develop** (opción B), no reescribirlo desde cero ni partir de la rama
`modulo-incidencias`. Al tocar cada archivo se parte hasta cumplir los límites de REGLAS y CLAUDE.md:
`IncidentsServiceImpl` (493 líneas) y `IncidentsController` (137) los exceden hoy.

| Opción | Por qué no / por qué sí |
|---|---|
| A. Módulo nuevo reutilizando piezas | Más limpio, pero el usuario prefirió no rehacer lo que ya funciona |
| **B. Ajustar el módulo actual** | **Elegida.** Conserva lo probado; el costo es limpiar matriz, estados y OSG propio, y partir archivos |
| C. Partir de `modulo-incidencias` | Descartada: más matriz, borra la corrección de permisos del ADMIN (`6e3a0d4`) y versiona datos del cliente |

### 2.3 Metas, no metas y anti-metas

- **Metas:** captura mínima en el celular; prellenado por IA; activación por coordinación; vínculo
  N:M con intervenciones visible en ambos módulos; cierre solo con trabajo validado; plazos con aviso
  en el mapa.
- **No metas (esta versión):** regla de maquinaria de corte (va a Intervenciones, después); riesgo
  por ubicación o tránsito de la sección (no hay cómo verificarlo); matriz OSG y su CSV; días
  hábiles y feriados; integración con Centuria o WhatsApp; app nativa; reapertura de incidencias
  cerradas.
- **Anti-metas (fracaso aunque funcione):** que una caída del agente impida guardar un reporte; que
  el agente reciba los datos personales estructurados (reportante, «Pedido de», contactos); que se cierre una incidencia cuyo trabajo no fue validado; que
  Hesperides emita un código con formato OSG; que la IA decida sin que coordinación lo vea.

### 2.4 Backend

- Paquete `modules.incidents`. Se conservan entidades `Incident`, `IncidentPhoto`,
  `IncidentStatusHistory`, `IncidentUpdate` (comentarios e historial) e `IncidentInterventionLink`.
- Reglas puras en `engine/incidents/`: urgencia final, estado del plazo, si una incidencia se puede
  cerrar y qué la bloquea. Sin Spring, sin JPA, con pruebas unitarias.
- El agente detrás de una interfaz `IncidentPrefillAgent`; implementación vigente `GeminiPrefillAgent` (antes `OllamaPrefillAgent`, ver §3.4).
- `IncidentRoles` (de `6e3a0d4`) sigue siendo la única fuente de «quién gestiona»: ADMIN y COORDINADOR.

### 2.5 Frontend web

- Rutas existentes: `/incidencias`, `/incidencias/nueva`, `/incidencias/{id}`.
- Intervenciones: formulario y detalle ganan «Incidencias relacionadas».
- Mapa: capa nueva de incidencias.
- Se eliminan los componentes de la matriz (`IncidentMatrixFields`, exportación CSV, etc.).

### 2.6 Lo que se hereda de la versión de noviembre (y nada más)

- Vínculos N:M en `incident_intervention_links`; una intervención se ejecuta y valida una vez aunque
  atienda varias incidencias; repetir un vínculo idéntico no duplica nada.
- Cierre exige al menos una intervención vinculada y **todas** `VALIDATED`; nunca cierre automático.
- Reintentos con `Idempotency-Key` (misma clave y contenido → mismo registro; distinto contenido → 409).
- `version` en cada mutación (409 si cambió); bloqueos por incidencia y luego intervenciones en orden.
- Fotos privadas en `FileStorage` bajo `incidents/{uuid}`, JPEG/PNG/WebP, 5 MiB, hasta 6, lectura
  autenticada con `Cache-Control: no-store`; la captura se guarda antes de subir fotos y cada foto se
  reintenta sin duplicarse.
- Historial solo de inserción (estados, revisiones con antes/después, vínculos, comentarios).
- Alcance del capataz por las cuadrillas que dirige hoy (no por el JWT).

### 2.7 Lo que se toma del prototipo HTML (y nada más)

- La captura «cuéntalo con tus palabras» y el agente que prellena.
- Marcas «Sugerido por IA» / «Editado» en la ficha de revisión y el texto original siempre visible.
- Regla de 5 m: árbol de 5 m o más lo atiende un tercero (catálogo 5.2).
- Plazos por urgencia y por tercero (catálogo 5.6).
- Recurrencia: sugerir la solución aplicada de casos cerrados parecidos.
- Origen Centuria u OSG como marca, no integración (catálogo 5.8).
- La lista de clases y tipos como siembra provisional de `INCIDENT_TYPE` (§5.4).

## 3. Comportamiento

### 3.1 Roles (enmienda SPEC-001 Anexo A, fila 5)

| Acción | ADMIN / COORDINADOR | SUPERVISOR (capataz) | OPERARIO |
|---|---|---|---|
| Reportar | Sí; nace **activa** | Sí; nace **no activa** | Sí; nace **no activa** |
| Revisar lo prellenado y activar | Sí | No | No |
| Editar clasificación de una activa | Sí | No | No |
| Relacionar o quitar intervenciones (desde cualquiera de los dos módulos) | Sí | No | No |
| Comentar y subir fotos | Las que ve | Las que ve | Las suyas |
| Ver | Todas | Las suyas y las de las cuadrillas que dirige | Solo las suyas |
| Cerrar | Sí | No | No |

El OPERARIO entra al módulo por primera vez: necesita entrada de menú y guard.

### 3.2 Captura

1. Campos obligatorios: **descripción** (texto libre) y **gravedad** (Alta, Media, Baja; catálogo
   `URGENCY_LEVEL`). Opcionales: referencia textual, sección, GPS («usar mi ubicación», solo tras
   pulsar) y fotos.
2. El servidor pone autor, canal `WEB` y hora de recepción, y genera el código (§3.7).
3. Si quien reporta dirige exactamente una cuadrilla activa, se le asigna; si no, queda sin cuadrilla.
4. Se guarda **antes** de llamar al agente. La respuesta confirma código y hora sin esperar a la IA.
5. «Pedido de» y «Para» (decisión del 7 nov): ver §3.3.

### 3.3 «Pedido de» y «Para»

Igual que en Reservas (V041): «Pedido de» es una organización del Directorio con contacto, y «Para»
una organización opcional distinta. Si la organización no está en el Directorio, se escribe su nombre
a mano y coordinación la resuelve al activar. Para no romper la captura de dos campos, «Pedido de»
viene prellenado con la sección de áreas verdes (hallazgo en campo) y solo se cambia cuando el
reporte llega de otra unidad *(confirmado el 15 nov)*.

### 3.4 Agente de prellenado

- **Cuándo:** en segundo plano, justo después de guardar. Estado del prellenado: pendiente, listo o
  fallido (con reintento manual de coordinación). Un fallo nunca bloquea la captura ni la activación.
- **Qué recibe:** descripción, gravedad, referencia, sección elegida (si hay), nombres de las secciones,
  y el catálogo de tipos. **Nunca** nombre del reportante, «Pedido de», contactos ni fotos.
  La descripción se envía tal cual, sin filtrar, aunque pueda mencionar personas *(decidido el
  15 nov)*: el prellenado es solo una sugerencia que coordinación valida al activar.
- **Qué devuelve (JSON validado):** título (≤ 8 palabras), tipo, sección, referencia, quién atiende
  (propios / tercero), clase de altura (`< 5 m`, `≥ 5 m`, sin clasificar, no aplica), riesgo inminente
  (sí/no y por qué), plan sugerido en pasos, justificación y confianza 0–1.
- **Reglas que se aplican siempre en el engine, venga de donde venga la sugerencia:**
  - Riesgo inminente → urgencia sugerida Alta, mostrada a coordinación como sugerencia con su motivo.
    La gravedad del capataz no se sobrescribe sola.
  - `≥ 5 m` → quién atiende sugerido: tercero.
  - `Sin clasificar` en un árbol → aviso «verificar altura antes de atender».
  - Confianza < 0,7 → aviso de revisión cuidadosa.
- Se guardan por separado la **sugerencia** y los **valores vigentes**, para mostrar «Sugerido por IA»
  o «Editado» por campo.
- **Proveedor:** Google Gemini (API `generateContent`), desde el 26 nov 2026; antes Ollama Cloud.
  Variables `GEMINI_BASE_URL`, `GEMINI_MODEL`, `GEMINI_API_KEY` en `.env` (en `.env.example`, la clave
  vacía). Cada reporte es una sola petición con un único prompt (instrucciones y datos juntos) y la
  respuesta pedida en JSON. Tiempo máximo de espera configurable; si vence, el prellenado queda fallido.
- **Excepción a SPEC-000 §1:** se añade como cuarta excepción a «sin servicios externos», con la misma
  condición que el SMTP: su caída nunca impide una operación de negocio.

### 3.5 Estados (catálogo 5.3)

| Estado | Entra cuando | Notas |
|---|---|---|
| Reportada | Se recibe | Puede estar activa o no activa |
| En proceso | **Automático** al quedar vinculada su primera intervención | Solo una activa puede vincularse |
| Cerrada | Coordinación la cierra | Exige §3.8 |

Si se quitan todos los vínculos de una En proceso, vuelve a Reportada. La activación no es un estado:
es `activated_at` y `activated_by`, para que «Reportada» siga significando «sin trabajo aún».

### 3.6 Activación

Coordinación revisa lo prellenado y **puede modificar todo**, incluidas la descripción y la gravedad;
lo que envió el capataz (texto y gravedad originales) queda guardado aparte y visible en la ficha y el
historial. Al final lo aprueba (activa). Para activar exige:
tipo, urgencia, **sección o GPS** (el mapa la necesita), y si atiende un tercero, la organización
(Directorio, tipo `EXTERNAL_COMPANY`, solo informativa) y el plazo pactado en días (1–90). Un árbol
`≥ 5 m` no puede activarse con «propios». Activar registra autor y hora en el historial.

### 3.7 Código

`INC-AAAA-NNNN`, correlativo por año de recepción, asignado al recibir y nunca reutilizado. No se
parece al formato OSG. El código OSG o de Centuria real, si existe, va en `external_code`, y el origen
en `INCIDENT_SOURCE` (SPEC-005 §4.3).

### 3.8 Vínculos con intervenciones y cierre

- Independientes: ninguna exige a la otra para crearse; vincular es opcional al crear y posible después.
- Se vincula **desde ambos módulos**: en Incidencias, buscando intervenciones; en Intervenciones
  (formulario de creación y detalle), escribiendo el código o el título de la incidencia. Es un único
  vínculo que se ve en las dos vistas.
- Se quita un vínculo con motivo obligatorio, como baja lógica; la intervención no se toca.
- **Cerrar** exige: incidencia activa, al menos un vínculo vigente, **ninguna** intervención vinculada
  distinta de `VALIDATED` (una `CANCELLED` también bloquea), y el texto «solución aplicada»
  (hasta 2000 caracteres). La pantalla dice qué bloquea el cierre.
- Una intervención cancelada se destraba quitando su vínculo; si el trabajo sigue haciendo falta, se
  crea y vincula una nueva. Se ofrece **«Reemplazar»**: quita el vínculo cancelado y vincula otra en un
  solo paso, con un solo motivo.
- Cerrada es final en esta versión: si después se observa una intervención ya validada, la incidencia
  cerrada no cambia.

### 3.9 Plazos (catálogo 5.6)

- Corren desde la **recepción** hasta el **cierre**.
- Propios: según la urgencia vigente, en horas. Parámetros del sistema editables por ADMIN, marcados
  como provisionales: Alta 24 h, Media 48 h, Baja 72 h.
- Tercero: el plazo pactado en días.
- Estado del plazo: a tiempo; **por vencer** en el último 25 %; **vencida**. Al cerrar se congela como
  «en plazo» o «fuera de plazo» para el reporte mensual.
- Cambiar la urgencia o quién atiende recalcula el plazo desde la recepción.

### 3.10 Mapa (enmienda SPEC-102)

- Capa «Incidencias» con un marcador por incidencia activa no cerrada, visible según §3.1.
- Posición: GPS si existe; si no, un punto dentro de su sección (`ST_PointOnSurface`, no el centroide,
  que puede caer fuera del polígono).
- Color: verde a tiempo, ámbar por vencer, rojo vencida. Clic → `/incidencias/{id}`.
- Recuadro con el número de incidencias visibles que no tienen ubicación.

### 3.11 Pantallas

- `/incidencias/nueva`: descripción, gravedad, opcionales; al enviar, confirmación con código, hora y
  plazo. Al lado, «Mis reportes» (solo los propios).
- `/incidencias`: lista con filtros (estado, activa/no activa, urgencia, plazo, búsqueda por código o
  texto). Coordinación ve arriba los pendientes de activar y las vencidas.
- `/incidencias/{id}`: original, ficha (con marcas IA/Editado), plazo, intervenciones vinculadas con su
  estado, qué bloquea el cierre, comentarios e historial.

## 4. Base de datos

- Migración nueva con el siguiente número libre del mapa de migraciones al integrar (develop va en
  V051; hay ramas hasta V063: confirmar en `REGISTRO.md`). No se tocan V026, V028 ni V029.
- **Retira:** columnas y tablas de la matriz (`incident_impacts`, servicio, proceso, subproceso,
  severidad, empresa, causa, acciones, `official_number`, días hábiles…), la tabla de trabajos internos
  `incident_interventions`, el propósito por vínculo y sus catálogos (`INCIDENT_SERVICE*`,
  `INCIDENT_PROCESS`, `INCIDENT_SUBPROCESS`, `INCIDENT_ROOT_CAUSE`, `INCIDENT_IMPACT`,
  `INCIDENT_COMPANY`, `INCIDENT_EVENT`, `INCIDENT_SEVERITY`, `INCIDENT_ACTION_PURPOSE`).
- **Estados:** `INCIDENT_STATUS` pasa a `REPORTED`, `IN_PROGRESS`, `CLOSED`.
- **Añade:** `code`, `urgency_item_id`, `type_item_id`, `zone_id`, `activated_at/_by`, quién atiende,
  `provider_organization_id`, `agreed_days`, clase de altura, `resolution_summary`, `closed_at/_by`,
  plazo congelado, «Pedido de»/«Para», `external_code`, `source_item_id`, y la sugerencia del agente
  (JSONB con estado y fecha).
- **Datos reales:** existen solo en documentos privados (`docs/datos/privados/`): una fila real en la
  matriz del cliente y 17 podas con código OSG en la hoja de podas de árboles y palmeras. Ninguna
  migración ni seed los carga, así que las bases solo tienen demostración y la migración puede retirar
  tablas. Importar esas incidencias históricas queda fuera de este spec. Confirman el diseño: la hoja
  usa prioridad alta/media/baja (la urgencia de §3.2) y «reportado por» Supervisión/Unidad/Ningún
  reporte (`INCIDENT_SOURCE`).
- `R__seed_demo_incidents.sql` se reescribe con casos del nuevo flujo.
- `INCIDENT_TYPE` se siembra con la jerarquía del prototipo (Arbolado, Sanidad vegetal, Riego, Césped
  y jardines, Infraestructura verde, y sus tipos), marcada como provisional: el catálogo 5.7 la
  declara lista propia.

## 5. Contratos de API

Prefijo `/api/v1/incidents`, sobre `{ok,message,data}`. Los endpoints de matriz, exportación,
corrección y reenvío, observación de cierre y trabajos internos se eliminan.

| Método y ruta | Quién |
|---|---|
| GET `/` (paginado, filtros §3.11) | Según §3.1 |
| GET `/mine` | Cualquiera con acceso |
| POST `/` con `Idempotency-Key` | Todos los roles |
| GET `/{id}` | Según §3.1 |
| PUT `/{id}` con `version` | Gestión |
| POST `/{id}/activate` | Gestión |
| POST `/{id}/prefill/retry` | Gestión |
| POST `/{id}/links`, `/{id}/links/{linkId}/remove`, `/{id}/links/{linkId}/replace` | Gestión |
| POST `/{id}/close` con `version` y solución aplicada | Gestión |
| POST `/{id}/comments`, `/{id}/photos`; GET `/{id}/photos/{photoId}` | Según §3.1 |
| GET `/search?q=` (código o título, solo activas no cerradas) | Gestión, para el formulario de Intervenciones |
| GET `/map` | Según §3.1 |

Intervenciones (enmienda SPEC-200): su creación acepta `incidentIds` opcionales y su detalle lista y
gestiona los vínculos, usando el mismo servicio de vínculos.

## 6. Enmiendas a otros specs (anotar en REGISTRO.md)

- SPEC-000 §1: cuarta excepción, el proveedor de IA (Google Gemini; antes Ollama Cloud).
- SPEC-001 Anexo A fila 5: §3.1.
- SPEC-002 §4.8: `intervention_id` único → vínculos N:M.
- SPEC-102: capa de incidencias.
- SPEC-200: vínculos desde Intervenciones; la regla de maquinaria queda pendiente allí.
- SPEC-202 D-06: abiertas = `REPORTED` activas + `IN_PROGRESS`; «en plazo» deja de estar bloqueado
  por plazos sin confirmar (son provisionales y configurables).

## 7. Aceptación

1. Capataz envía solo texto y gravedad: se guarda no activa, con código y hora, aunque Gemini esté caído.
2. Con Gemini disponible, la ficha muestra lo prellenado con «Sugerido por IA»; editar marca «Editado».
3. El agente no recibe nombres, contactos ni fotos (prueba sobre la petición enviada).
4. Coordinación no puede activar sin tipo, urgencia y ubicación; ni un árbol `≥ 5 m` con propios.
5. Vincular desde Intervenciones por código se ve en ambas vistas; la incidencia pasa a En proceso.
6. Cerrar con una intervención `COMPLETED` o `CANCELLED` vinculada → 422 con el motivo; con todas
   `VALIDATED` y solución aplicada → Cerrada.
7. «Reemplazar» quita la cancelada y vincula la nueva en un paso, con historial en ambas.
8. Plazo: ámbar en el último 25 %, rojo vencido; se congela al cerrar.
9. Mapa: marcador en GPS o dentro de la sección, color por plazo, contador de sin ubicación; el capataz
   solo ve las suyas y las de su cuadrilla.
10. Operario reporta y ve solo las suyas.
11. Reintento con la misma clave no duplica; versión antigua → 409.
12. Ningún archivo de código supera los límites de CLAUDE.md.

## 8. Fuera de este spec, a cargo del equipo

- La V028 publicada contiene causas textuales de la matriz del cliente y el repo es público. La
  migración nueva las retira de la base; limpiar el historial público de git lo hará el equipo aparte.
- Importar las incidencias reales de los documentos privados (§4).

## 9. Decisiones tomadas al revisar el borrador (propuestas, corregibles)

- **Reportes de ADMIN o COORDINADOR:** nacen activos con la misma captura de dos campos. La ficha
  marca «falta completar» si no tienen tipo o ubicación; mientras no tengan ubicación cuentan en
  «sin ubicación» del mapa. La validación de §3.6 solo aplica al paso de activar.
- **Gravedad y urgencia:** son un solo campo vigente que coordinación puede cambiar; la gravedad que
  marcó el capataz se conserva aparte, junto con su texto original. El plazo usa la vigente.
- **Plazo antes de activar:** corre desde la recepción también para las no activas, con la urgencia
  vigente y como propios (un tercero solo se fija al activar, con sus días).
- **Prellenado:** la sugerencia llena solo los campos vacíos que nadie editó; nunca sobrescribe un
  valor puesto por una persona, tampoco al reintentar. Coordinación igual revisa todo al activar.
- **Recurrencia:** una sola llamada al agente. Las soluciones de casos cerrados del mismo tipo se
  muestran en la ficha cuando el tipo ya existe, no se envían en el prompt.
- **Reportes (SPEC-202):** se ajustan solo lo necesario para que sigan funcionando con los estados
  nuevos (`IncidentReportQueries`, `WeeklyIncidentQueries`, `DirectionReportBuilder`,
  `ProtectedCatalogItems`). El indicador nuevo «en plazo» queda para SPEC-202.
- **Capataz que crea intervenciones:** si SPEC-200 se lo permite, mandar `incidentIds` responde 403
  y el campo no aparece en su formulario.

## 10. Lo que queda a criterio de quien implementa

Modelo exacto de Gemini, prompt, tiempo de espera, forma de la cola en segundo plano, división final de
clases, textos de pantalla y estilo de marcadores, siempre dentro de este spec y de REGLAS.
