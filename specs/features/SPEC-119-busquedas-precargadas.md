# SPEC-119 — Búsquedas sobre listas precargadas

| Campo | Valor |
|-------|-------|
| HU relacionada | — (pedido directo del 18 nov 2026) |
| Autor | Jean Piero David Morán |
| Plataforma | Web |
| Sprint | — |
| Dependencias | SPEC-100 (usuarios), SPEC-103 (catastro), SPEC-106 (directorio), SPEC-200/201 (intervenciones e incidencias), SPEC-109/116 (lugares) |

> **Lectura obligatoria:** `specs/REGLAS.md`.

> Mientras la feature no esté implementada, este spec es la fuente de verdad y el detalle se
> escribe literal. Al cerrarla, el detalle se sustituye por un puntero al código.

---

## 1. Objetivo

Que ningún buscador ni campo con sugerencias consulte al backend por cada letra: cada lista se
carga una vez, el navegador la filtra mientras se escribe, y se vuelve a cargar cuando alguien
registra o cambia algo.

## 2. Contexto

Hoy hay dos clases de buscador que llaman a la API mientras se escribe (con una espera de 250-300 ms):

**Campos con sugerencias** (eligen un registro dentro de un formulario):

| # | Campo | Componente | Consulta de hoy |
|---|---|---|---|
| 1 | Intervención de una incidencia | `incidents/InterventionPicker` | `GET /incidents/intervention-candidates?q=` (20 más recientes) |
| 2 | Incidencias que atiende una intervención | `interventions/InterventionIncidentPicker` | `GET /incidents/search?q=` (20) |
| 3 | Organización | `directorio/OrganizationPicker` | `GET /directory/organizations?q=` |
| 4 | Contacto | `directorio/ContactPicker` | `GET /directory/contacts?q=` (dos consultas) |
| 5 | Especie al registrar un ejemplar | `catastro/registrar/BuscadorDeEspecie` | `GET /green-inventory/species/assignable?search=` (8) |
| 6 | Especie al importar ejemplares | `catastro/importar/SelectorDeEspecieParaImportacion` | `GET /imports/specimens/species-options?search=` (20) |
| 7 | «Otro lugar» en la migración de referencias | `lugares/migracion/OtherPlacePicker` | `GET /places?q=` |
| 8 | Lugar conocido de una incidencia | `incidents/IncidentPlaceLookup` | `GET /places?q=` (con botón) |
| 9 | Parecidos al registrar organización o contacto | `useSimilarOrganizations` / `useSimilarContacts` | `GET …/similar` (trigramas de PostgreSQL) |

**Tablas con buscador** (filtran y paginan en el servidor):

| # | Pantalla | Consulta de hoy |
|---|---|---|
| 10 | Usuarios | `GET /users?search=&roleCode=&isActive=&teamId=&page=` |
| 11 | Incidencias | `GET /incidents?search=&status=&active=&page=` |
| 12 | Directorio · Organizaciones | `GET /directory/organizations?q=&typeCode=&page=` |
| 13 | Directorio · Contactos | `GET /directory/contacts?q=&withoutOrganization=&page=` |
| 14 | Lugares | `GET /places?q=&category=&kind=` |
| 15 | Inventario · Especies | `GET /green-inventory/species?search=&vegetationType=&retiring=&page=` |
| 16 | Inventario · Ejemplares (y los de una especie) | `GET /green-inventory/specimens?search=&location=&…&page=` |
| 17 | Migración de referencias | `GET /places/reference-links/queue?search=&page=` |

Planificación preventiva, Frecuencias de mantenimiento y el buscador del mapa ya filtran en el
navegador: son el modelo que este spec generaliza.

**Volumen** (BD de desarrollo, 18 nov): 965 ejemplares, 90 especies, 21 lugares, 15
incidencias, 14 intervenciones, 6 usuarios. El campus no pasará de unos pocos miles de filas por
lista, que caben en el navegador.

### 2.1 Backend

- Cada lista precargada tiene un endpoint que devuelve **todas** las filas que el usuario puede
  ver, sin paginar ni filtrar por texto, con el mismo control de acceso que la consulta actual.
- Cada fila lleva `searchKey`: el texto en que se buscaba hasta hoy (las mismas columnas del
  `LIKE` actual, incluidas las que no se muestran: alias, RUC, correo, notas, nombres comunes
  alternativos, perspectivas), ya normalizado en minúsculas y sin tildes.

### 2.2 Frontend web

- `lib/search/searchText.ts` (puro): `normalize(text)` y `matches(searchKey, query)`.
- `lib/search/trigram.ts` (puro): `similarity` y `wordSimilarity` iguales a las de `pg_trgm`.
- `lib/preload/preloadedList.ts`: cada lista con su cargador y las rutas que la afectan;
  `usePreloadedList(lista)` → `{ items, loading, errorMessage, reload }`.
- `lib/api` avisa tras cada escritura exitosa con su ruta, y solo se recargan las listas
  relacionadas (§2.5 D-03).
- Las pantallas y campos de §2 dejan de pasar el texto al backend y filtran `items` en memoria.
  Las tablas filtran, ordenan y paginan en el navegador; la URL sigue guardando los filtros.

### 2.3 Móvil

Fuera de alcance: la app móvil todavía no existe.

### 2.4 Restricciones técnicas

- NO debe usar librerías de búsqueda difusa (Fuse.js y similares): la coincidencia es «contiene»,
  como el `LIKE` de hoy, y los parecidos replican `pg_trgm` para dar el mismo resultado.
- Catálogos aplicables: no aplica.

### 2.5 Decisiones propias de este spec

- **D-01 · El backend decide en qué se busca (`searchKey`).** Las columnas buscables incluyen
  datos que la tabla no muestra; si el frontend armara el texto con lo visible, buscar por RUC,
  alias o placa dejaría de funcionar. *Descartado:* armar el texto en el frontend.
- **D-02 · Coincidencia «contiene» sin tildes ni mayúsculas, en todas las listas.** Es el `LIKE
  '%texto%'` de hoy. Incidencias e intervenciones no quitaban tildes; ahora sí, para que todos los
  buscadores se comporten igual. *Descartado:* conservar la diferencia.
- **D-03 · Un registro recarga solo las listas relacionadas.** Cada lista declara qué escrituras
  la afectan (tabla de abajo). Tras un `POST`, `PUT`, `PATCH` o `DELETE` exitoso, solo vencen las
  listas cuya relación coincide con la ruta escrita: si una pantalla abierta la muestra, se vuelve
  a pedir en el acto; si no, se pide la próxima vez que se abra. Los `POST` que no guardan nada
  (`…/preview`, `…/confirmation-summary`, `/places/export`, `/map/describe`) no vencen ninguna.
  *Descartado:* recargar todas tras cualquier registro (corrección del usuario, 18 nov).

  | Lista | La recargan las escrituras en |
  |---|---|
  | Usuarios | `/users` |
  | Incidencias (tabla y campo 2) | `/incidents`, `/interventions/{id}/incident-links` |
  | Intervenciones candidatas (campo 1) | `/interventions` |
  | Organizaciones, contactos y parecidos | `/directory`, `/imports/{id}/confirm` |
  | Lugares y «otro lugar» | `/places` (importación incluida) |
  | Cola de migración de referencias | `/places/reference-links` |
  | Especies (tabla y campos 5 y 6) | `/green-inventory/species`, `/green-inventory/specimens`, `/imports/{id}/confirm` |
  | Ejemplares | `/green-inventory/specimens`, `/green-inventory/species`, `/imports/{id}/confirm` |

  `/imports/{id}/confirm` no dice qué se importó, así que recarga las tres listas que se
  alimentan de importaciones. Especies también se recarga con los ejemplares: cada tarjeta muestra
  cuántos tiene y una foto de uno de ellos.
- **D-04 · Cada lista se carga una vez al abrir la pantalla o el formulario que la usa** y no
  vuelve a pedirse mientras se escribe. Al salir y volver a entrar se pide de nuevo: así se ve lo
  que registró otra persona entretanto, con una consulta por pantalla abierta y no por letra. Dos
  buscadores de la misma pantalla que usan la misma lista comparten una sola petición.
- **D-05 · Nada queda guardado entre sesiones**: al cerrar sesión se descarta lo cargado, porque
  cada lista depende de lo que ese usuario puede ver (incidencias, usuarios).
- **D-06 · Los parecidos se calculan en el navegador** con la lista precargada del Directorio y el
  mismo umbral (0,4) y tope (5) del backend. El endpoint `…/similar` se retira.
- **D-07 · Se retiran los endpoints y parámetros que nadie usa después** (los `q`/`search`, la
  paginación de las listas migradas y `/similar`), para no mantener dos caminos. Ningún cliente
  móvil los consume todavía.
- **D-08 · Los campos con sugerencias muestran las coincidencias desde la primera letra**, sin
  espera; los que exigían dos letras (especie al registrar) mantienen ese mínimo, porque con una
  sola letra casi toda la lista coincide.

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/users/all` | La de `GET /users` | Todos los usuarios, con `searchKey` (nombre, apellido, correo) |
| `GET /api/v1/incidents/all` | La de `GET /incidents` (lo visible para el actor) | Todas las incidencias visibles, con `searchKey` (código, título, descripción, referencia) |
| `GET /api/v1/incidents/intervention-candidates` | La actual | Sin `q` ni tope: todas las intervenciones no canceladas, con `searchKey` (código, descripción) |
| `GET /api/v1/incidents/search` | La actual | Sin `q` ni tope: todas las incidencias activas y abiertas, con `searchKey` |
| `GET /api/v1/directory/organizations/all` | La de la lista actual | Todas, con `aliases` y `searchKey` (código, nombre, RUC, alias) |
| `GET /api/v1/directory/contacts/all` | La de la lista actual | Todos, con sus organizaciones y `searchKey` (código, nombre, correo, anexo, celular) |
| `GET /api/v1/places` | La actual | Sin `q`, `category` ni `kind`; cada fila con `searchKey` (código, nombre, padre, alias, perspectivas) |
| `GET /api/v1/places/reference-links/queue/all` | La actual | Toda la cola pendiente, con `searchKey` (nombre) |
| `GET /api/v1/green-inventory/species/all` | Pública, como el resto del inventario | Activas y en proceso de retiro (`isActive` las distingue), con `searchKey` (nombres científico, común y alternativos, familia). Sirve también a los campos 5 y 6 con las activas |
| `GET /api/v1/green-inventory/specimens/all` | Pública | Todos los ejemplares activos, con tipo de vegetación, `speciesCritical`, `measured` y `searchKey` (código, referencia, ubicación, placa, notas, nombres de la especie). La ficha de una especie los filtra por su slug |

**Retirados (D-07):** las listas paginadas con `q`/`search` de los endpoints de arriba,
`…/organizations/similar`, `…/contacts/similar`, `/green-inventory/species/assignable`,
`/green-inventory/species/{slug}/specimens`, `/green-inventory/specimens/search` (no la usaba ninguna
pantalla) e `/imports/specimens/species-options`.

### 3.1 Decisiones que el código no explica

- **`/all` y no `size=0`.** Una ruta propia deja claro que no hay paginación y permite retirar la
  paginada sin ambigüedad.
- **`searchKey` se calcula en SQL con `unaccent(lower(concat_ws(' ', …)))`**, la misma expresión
  que iba en el `WHERE`, para que la regla de qué se busca no se duplique. Donde la respuesta se
  arma en Java (incidencias, usuarios), `engine/search/SearchKey` aplica la misma regla.
- **Un solo catálogo de especies para la tabla y los dos campos.** Las asignables eran las activas
  y las opciones de importación también; filtrar por `isActive` en el navegador evita tres listas
  casi iguales.
- **Usuarios: sin estado elegido se ven todos.** La pantalla ya trataba la ausencia del filtro como
  «todos», pero el backend la convertía en «solo activos», así que «también entre los desactivados»
  no mostraba a nadie más. Al filtrar en el navegador se corrige.

## 4. Migración de base de datos

No necesita tablas ni columnas nuevas.

## 5. Comportamiento

### 5.1 Flujo principal

1. El usuario abre una pantalla o un formulario con buscador → su lista se pide una vez; mientras
   llega, el buscador dice «Cargando…».
2. Escribe → las coincidencias se calculan en memoria en cada letra, sin red.
3. Registra o cambia algo → al responder el backend, se recargan solo las listas relacionadas
   con lo escrito (D-03); el registro nuevo aparece en el buscador.

### 5.2 Flujos alternativos

- **Falla la carga:** el buscador muestra el error en español y un botón «Reintentar»; en los
  formularios, el campo queda utilizable para escribir texto libre donde hoy ya se permite.
- **Falla la recarga tras un registro:** se conserva la lista anterior y el buscador avisa que
  puede no incluir lo último registrado, con «Reintentar».

### 5.3 Casos límite

- **Texto vacío:** los campos con sugerencias no muestran lista; las tablas muestran todo.
- **Comodines `%` y `_`:** se buscan como texto literal (hoy `LikePattern` los escapa).
- **Respuesta tardía de una recarga vieja:** se descarta; manda la última pedida.

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Escribir en cualquier buscador de §2 no hace peticiones | En el navegador, pestaña Red: escribir «ceiba» letra por letra no genera ninguna petición |
| CA-02 | Los resultados coinciden con los de antes | Buscar por RUC una organización, por alias un lugar, por placa un ejemplar y por nombre alternativo una especie: aparecen |
| CA-03 | Sin tildes ni mayúsculas | «AREA» encuentra «Área …» en todas las listas, incluidas incidencias |
| CA-04 | Lo registrado aparece al instante | Registrar una organización desde el Directorio y escribir su nombre en el campo Organización de una reserva: aparece sin recargar la página |
| CA-05 | Solo se recargan las listas relacionadas | Con el formulario de reserva abierto, registrar una organización: en Red se pide de nuevo la lista de organizaciones y no la de lugares ni la de especies |
| CA-06 | Los parecidos siguen avisando | Al registrar «Facultad de derecho» con «Facultad de Derecho» existente, sale el aviso de parecido, sin peticiones mientras se escribe |
| CA-07 | Paginación, orden y URL de las tablas se conservan | En Incidencias, filtrar, pasar a la página 2, recargar la página: mismos filtros y página |
| CA-08 | Cambiar de usuario no muestra datos del anterior | Cerrar sesión como coordinador y entrar como capataz: la lista de incidencias es la del capataz |

## 7. Especificación visual

Sin cambios de diseño: cada buscador conserva su aspecto. Desaparecen los mensajes «Buscando…»
de cada letra; queda un único «Cargando…» mientras llega la lista la primera vez.

## 8. Tests

```
Motor de búsqueda (puro)
- normalize("Área VERDE") → "area verde"; matches con tildes en la clave o en el texto
- "%" y "_" se buscan literales
- similarity/wordSimilarity dan los mismos valores que pg_trgm en casos de referencia
  («Facultad de Derecho» vs «facultad de derecho», «derecho» dentro de «Facultad de Derecho»)

Caché de listas
- dos componentes de la misma pantalla con la misma lista → una sola petición
- abrir de nuevo la pantalla → la lista se pide otra vez
- escritura exitosa en /directory → recarga organizaciones y contactos, no lugares ni especies
- POST de /imports/{id}/confirm → recarga directorio, especies y ejemplares
- POST de …/preview o /places/export → no recarga nada
- una escritura fallida no recarga nada
- cerrar sesión descarta lo cargado
- una respuesta vieja que llega después de una nueva se descarta

Cada buscador
- escribir varias letras no llama a la API (mock) y filtra la lista precargada

Backend
- cada /all devuelve todas las filas visibles sin paginar, con searchKey normalizado
- /incidents/all respeta lo que ve cada rol
- searchKey incluye las columnas que no se muestran (alias, RUC, notas, nombres alternativos)
```

## 9. Propio de este spec

- **Verificación en navegador (INV-10):** CA-01 se comprueba en la pestaña Red, no solo con tests.
- **Tamaño:** si alguna respuesta `/all` supera 1 MB comprimida en la BD de desarrollo, se
  reduce a una proyección con las columnas que la pantalla usa, antes de cerrar el spec.
