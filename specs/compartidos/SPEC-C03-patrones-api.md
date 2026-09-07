# SPEC-C03 — Patrones de API

## Metadatos

| Campo | Valor |
|-------|-------|
| HU relacionada | Transversal — sin HU propia, spec fundacional compartido |
| Autor del spec | Equipo Hesperides |
| Plataforma | Ambas (Web y Móvil) |
| Prioridad | Alta |
| Sprint | S0 |
| Dependencias | SPEC-000 (arquitectura general, sección 7 — SPEC-C03), SPEC-C02 (manejo de errores) |
| Fecha límite | 2026-09-07 |

---

## 1. Objetivo

Fijar las convenciones de diseño de API REST — rutas, paginación, filtros (incluidos los geoespaciales sobre PostGIS), formatos de fecha y nombres de campo, códigos HTTP e idempotencia — para que los 10 desarrolladores del equipo produzcan endpoints indistinguibles entre sí en su forma, sin importar quién ni qué módulo los escriba.

Este spec también **cierra la decisión pendiente** registrada en `specs/REGISTRO.md` sobre el prefijo de versión en servicios internos (backend vs. microservicio Flask).

## 2. Contexto para la IA

> INSTRUCCIÓN: antes de generar código, la IA debe leer obligatoriamente:
> - Este spec completo
> - SPEC-000 (arquitectura y convenciones), sección 7 — SPEC-C03
> - SPEC-C02 (manejo de errores) — los códigos de error de esta sección 7 se combinan con los códigos de éxito definidos aquí
> - `backend/src/main/java/pe/edu/pucp/hesperides/config/HealthController.java` (referencia de ruta versionada existente)
> - `services/app/routes/health.py` (referencia del microservicio Flask, ruta a alinear por este spec)
> - `shared/types/api.ts` (`Page<T>`, `ApiResponse<T>`)

### 2.1 Módulo backend

- Paquete: `pe.edu.pucp.hesperides.modules.[modulo]`
- Controllers: ruta base `/api/v1/[recurso-plural]`, siguiendo `HealthController` como referencia de estilo (`@RestController`, `@RequestMapping("/api/v1")`, métodos con `@GetMapping`/`@PostMapping`/etc. sobre el sub-path del recurso).
- Listados paginados: parámetro `Pageable` inyectado por Spring Data (`page`, `size`, `sort`), nunca paginación manual con `LIMIT`/`OFFSET` escritos a mano.
- Filtros: `Specification<T>` de Spring Data JPA (o `@Query` derivada) por cada combinación de filtros soportada; nunca concatenación de strings SQL.
- Filtros geoespaciales: Hibernate Spatial / `org.locationtech.jts` sobre columnas PostGIS (`geometry`/`geography`), expuestos como parámetros de query plano (sección 6).

### 2.2 Módulo frontend (web)

- Toda llamada a un endpoint paginado o filtrado pasa por `lib/api.ts`, construyendo el query string de forma centralizada (helper único de serialización de parámetros, no interpolación manual de strings en cada componente).
- Componentes de listado (tablas, mapas) consumen la forma `Page<T>` de `shared/types/api.ts` sin reinterpretarla.

### 2.3 Módulo móvil

- Mismas rutas, mismos query params y mismas formas de respuesta que la web — no hay una "API móvil" distinta.
- Diferencia relevante: las pantallas de listado en campo (ej. incidencias cercanas) usan los filtros geoespaciales de "cercanía a un punto" (sección 6.2) apoyados en el GPS del dispositivo.

### 2.4 Restricciones técnicas

- Librerías que DEBE usar: Spring Data JPA (`Pageable`, `Specification`), Hibernate Spatial/JTS para PostGIS.
- Librerías que NO debe usar: ningún ORM ni query builder adicional; ninguna librería de paginación custom en frontend (se consume `Page<T>` tal cual).
- Patrón de catálogos aplicable: los valores de filtros por estado, prioridad, tipo, etc. (ej. `status=ACTIVE`) son siempre `code` de `catalog_items` (SPEC-003), nunca literales libres ni enums Java.

## 3. Convención de rutas

### 3.1 Formato base

```
/api/v1/[recurso-plural]
```

- Recurso siempre en plural, `kebab-case` si es compuesto: `/api/v1/catalog-elements`, `/api/v1/incidents`, `/api/v1/interventions`.
- CRUD estándar sobre el recurso:

| Operación | Método + ruta |
|---|---|
| Listar (paginado) | `GET /api/v1/[recurso]` |
| Obtener uno | `GET /api/v1/[recurso]/{id}` |
| Crear | `POST /api/v1/[recurso]` |
| Reemplazar/actualizar | `PUT /api/v1/[recurso]/{id}` |
| Eliminar (soft delete) | `DELETE /api/v1/[recurso]/{id}` |

### 3.2 Subrecursos

Cuando una entidad solo tiene sentido dentro de otra, se anida un nivel (nunca más de uno):

```
GET  /api/v1/interventions/{id}/photos
POST /api/v1/interventions/{id}/photos
```

Si el subrecurso también existe de forma independiente (tiene su propio ciclo de vida y se lista por sí solo), se prefiere un recurso de primer nivel con filtro por el padre en vez de anidarlo:

```
GET /api/v1/incidents?interventionId=42
```

en lugar de `GET /api/v1/interventions/42/incidents`, salvo que el dominio exija explícitamente la relación de contención.

### 3.3 Acciones que no son CRUD

Para operaciones de negocio que no mapean a un verbo HTTP estándar, se usa `POST` sobre el recurso singular más un verbo de acción:

```
POST /api/v1/incidents/{id}/assign      -- asignar responsable a una incidencia
POST /api/v1/incidents/{id}/resolve     -- marcar una incidencia como resuelta
POST /api/v1/interventions/{id}/close   -- cerrar una intervención (dispara BusinessRuleException si falta evidencia)
POST /api/v1/interventions/{id}/cancel  -- cancelar una intervención programada
```

Regla: el verbo de acción va siempre en el path, nunca en el body (`{"action": "assign"}` está prohibido) ni como query param.

## 4. Prefijo de versión en servicios internos — decisión

**Contexto de la decisión** (ver `specs/REGISTRO.md`): el backend Spring expone `/api/v1/health`; el microservicio Flask expone `/health`, sin prefijo. El sobre de respuesta ya es idéntico en ambos. `services/app/routes/health.py` deja el comentario explícito de que la decisión se cierra aquí.

**Decisión: los servicios internos (Flask incluido) usan el mismo prefijo `/api/v1` que el backend.**

Justificación:

1. **Consistencia cognitiva única.** El equipo tiene 10 desarrolladores rotando entre módulos y lenguajes (Java, Python, TypeScript). Una sola convención de rutas — "todo endpoint HTTP de este sistema empieza con `/api/v1`" — sin excepciones por servicio, elimina una pregunta que de otro modo se repite en cada code review y cada spec de feature que toque el microservicio de datos.
2. **El hecho de que Flask sea interno (no lo consume el navegador, solo `backend` vía la red Docker `hesperides-net`, según `docker-compose.yml`: `DATA_SERVICE_URL: http://data-service:5001`) no es razón para una convención distinta.** El versionado de rutas no es una preocupación de "quién es el cliente" sino de "este servicio puede tener endpoints que cambien de forma incompatible en el futuro" — y Flask, como servicio de procesamiento de datos, es tan candidato a una v2 como cualquier otro.
3. **Costo de alinear ahora es mínimo; costo de no alinear crece.** Hoy solo existe `/health` en Flask. Cuantos más endpoints se agreguen sin prefijo (Sprint 2, microservicios de procesamiento de datos geoespaciales), más costoso será migrarlos después. Alinear ahora, con un solo endpoint, es el momento más barato posible.
4. **No hay un argumento técnico real a favor de mantener a Flask sin versionar**: no expone una API pública estable que un tercero externo consuma sin control de versión (eso justificaría lo opuesto: congelar la ruta). Al ser 100% interno, el equipo controla ambos extremos de la llamada y puede versionar libremente.

**Acción requerida (fuera del alcance de este documento, pero explícita como consecuencia de esta decisión):**

- Actualizar `services/app/routes/health.py`: cambiar la ruta de `@health_bp.get("/health")` a `@health_bp.get("/api/v1/health")` (o registrar el blueprint con `url_prefix="/api/v1"` en `app/main.py`, que es la forma más escalable si se van a agregar más blueprints).
- Actualizar `services/app/tests/test_health.py`: el `client.get("/health")` debe cambiar a `client.get("/api/v1/health")`.
- Actualizar `DATA_SERVICE_URL` y cualquier llamada del backend Spring hacia el data service para incluir `/api/v1` en el path solicitado.

## 5. Paginación

### 5.1 Request

```
GET /api/v1/catalog-elements?page=0&size=20&sort=createdAt,desc
```

- `page`: base 0 (primera página es `page=0`), acorde a `Pageable` de Spring Data.
- `size`: tamaño por defecto **20** si se omite; **máximo 100** — un request con `size` mayor a 100 se trata como `size=100` (clamping), nunca como error 400, para no romper clientes que pidan de más por error.
- `sort`: formato `campo,dirección` (`createdAt,desc` o `createdAt,asc`); admite múltiples repitiendo el parámetro (`sort=zone,asc&sort=createdAt,desc`). Si se omite, orden por defecto `createdAt,desc` (los registros más recientes primero).

### 5.2 Response

El resultado paginado viaja siempre dentro de `data`, con esta forma fija (`Page<T>` en `shared/types/api.ts`):

```json
{
  "ok": true,
  "message": "Catalog elements retrieved successfully",
  "data": {
    "content": [
      { "id": 1, "species": "Ficus benjamina", "zoneId": 3 }
    ],
    "page": {
      "number": 0,
      "size": 20,
      "totalElements": 150,
      "totalPages": 8
    }
  }
}
```

- `content`: el arreglo de items de la página actual (puede ser `[]`, nunca `null`).
- `page.number`: página actual (base 0).
- `page.size`: tamaño efectivo aplicado (después de cualquier clamping).
- `page.totalElements`: total de registros que matchean el filtro, sin paginar.
- `page.totalPages`: `ceil(totalElements / size)`.

### 5.3 Implementación backend

Spring Data `Pageable` inyectado directamente en el método del controller; el mapeo de `Page<Entity>` (Spring) a `Page<Dto>` (el tipo de este contrato) ocurre en el mapper del módulo, nunca exponiendo directamente el `Page` de Spring (que trae campos adicionales no deseados como `pageable`, `sort`, etc.).

## 6. Filtros y búsqueda

### 6.1 Filtros de campo

Formato: query params planos, un parámetro por criterio, combinables con AND implícito.

```
GET /api/v1/catalog-elements?zoneId=3&species=Ficus+benjamina
GET /api/v1/incidents?status=OPEN&urgency=HIGH
GET /api/v1/interventions?dateFrom=2026-08-01&dateTo=2026-08-31
GET /api/v1/incidents?search=fuga+de+agua
```

- Filtrar elementos del catastro por zona y especie: `?zoneId={id}&species={texto}`. `zoneId` referencia la zona del campus (entidad propia, no catálogo); `species` es texto libre o `speciesId` si las especies están modeladas como catálogo/tabla propia (a definir en SPEC-002).
- Filtrar incidencias por estado y urgencia: `?status={code}&urgency={code}`, donde ambos son `code` de `catalog_items` (catálogos `INCIDENT_STATUS` y `URGENCY`, por ejemplo), nunca un enum Java ni un valor arbitrario.
- Filtrar intervenciones por rango de fechas: `?dateFrom=2026-08-01&dateTo=2026-08-31` (ambos límites inclusivos, formato de fecha ver sección 7).
- Búsqueda de texto libre: `?search=texto`, aplicado sobre los campos textuales relevantes del recurso (a definir por cada feature, ej. descripción de la incidencia).
- Implementación: `Specification<T>` de Spring Data JPA componiendo un predicado por cada parámetro presente; un parámetro ausente no agrega condición (no se filtra por él).

### 6.2 Filtros geoespaciales (PostGIS)

El proyecto usa PostGIS para las columnas de geometría de los elementos del catastro (ubicación de árboles, jardines, zonas). Se definen dos operaciones geoespaciales expuestas como query params planos — nunca como GeoJSON en el body de un GET, para mantener estas consultas cacheables e inspeccionables como cualquier otro filtro:

**a) Elementos dentro de una zona (bounding box):**

```
GET /api/v1/catalog-elements?bbox=minLon,minLat,maxLon,maxLat
```

Ejemplo: `GET /api/v1/catalog-elements?bbox=-77.0835,-12.0700,-77.0790,-12.0660` — todos los elementos del catastro cuya geometría intersecta el rectángulo dado (equivalente a `ST_Intersects` / `ST_MakeEnvelope` en PostGIS). Los cuatro valores van en orden `minLon,minLat,maxLon,maxLat` (WGS 84 / SRID 4326), separados por coma, sin espacios.

**b) Elementos cerca de un punto (radio de búsqueda):**

```
GET /api/v1/catalog-elements?near=lon,lat&radius=metros
```

Ejemplo: `GET /api/v1/catalog-elements?near=-77.0812,-12.0678&radius=50` — todos los elementos dentro de 50 metros del punto dado (equivalente a `ST_DWithin` sobre `geography` en PostGIS, para que `radius` se interprete en metros y no en grados). `near` es un único parámetro con `lon,lat` separados por coma (orden GeoJSON: longitud primero); `radius` es un entero en metros, con un máximo razonable definido por cada feature (evitar `radius` sin límite que fuerce un escaneo de todo el catastro).

Reglas comunes a ambos filtros geoespaciales:

- `bbox` y `near`+`radius` son mutuamente excluyentes en un mismo request; si ambos están presentes, el backend responde 400 con un error de validación indicando que son incompatibles.
- Ambos son combinables con los filtros de campo de la sección 6.1 (AND implícito): `?zoneId=3&near=-77.08,-12.07&radius=100` es válido.
- Coordenadas siempre en WGS 84 (SRID 4326), `lon,lat` (no `lat,lon`) para consistencia con GeoJSON, que es el formato que consume el mapa del frontend.
- El resultado de estos filtros sigue paginado igual que cualquier listado (sección 5); no se asume que "cerca de un punto" siempre devuelve pocos resultados.

## 7. Convención de fechas y nombres de campo

### 7.1 Fechas

- Toda fecha/hora en JSON (request y response) usa **ISO 8601 en UTC**: `2026-09-07T14:30:00Z`. Nunca timestamps epoch, nunca formatos locales (`dd/MM/yyyy`).
- Fechas sin hora (ej. `dateFrom`/`dateTo` en filtros) usan `YYYY-MM-DD`.
- La conversión a hora local de Lima para mostrar al usuario es responsabilidad exclusiva del frontend (web y móvil), nunca del backend.
- En base de datos, las columnas de fecha/hora se almacenan en UTC (`TIMESTAMP` sin zona, asumiendo siempre UTC, consistente con `created_at`/`updated_at` de SPEC-000 sección 5.4).

### 7.2 Nombres de campo

| Contexto | Convención | Ejemplo |
|---|---|---|
| JSON (request/response) | `camelCase` | `createdAt`, `zoneId`, `inventoryCode` |
| Base de datos (columnas y tablas) | `snake_case` | `created_at`, `zone_id`, `inventory_code` |
| Query params | `camelCase`, igual que el JSON | `?zoneId=3&dateFrom=2026-08-01` |

El mapeo `snake_case` (BD) ↔ `camelCase` (JSON) lo resuelve Jackson en el backend de forma automática sobre los DTOs; ningún desarrollador escribe ese mapeo a mano ni expone nombres de columna de BD directamente en el JSON.

## 8. Códigos HTTP por operación

| Operación | Código de éxito | Detalle |
|---|---|---|
| `GET` (listar o uno) | `200 OK` | Cuerpo con el sobre estándar y el recurso o `Page<T>` en `data`. |
| `POST` (crear) | `201 Created` | Header `Location` apuntando a `GET /api/v1/[recurso]/{id}` del recurso recién creado; `data` contiene el recurso creado completo. |
| `PUT` (actualizar) | `200 OK` | `data` contiene el recurso actualizado completo. |
| `DELETE` (soft delete) | `204 No Content` | Sin cuerpo (ni siquiera el sobre estándar — 204 por definición no lleva body). El registro queda con `deleted_at` poblado, nunca se borra físicamente. |
| `POST` de acción (`/assign`, `/resolve`, `/close`) | `200 OK` | `data` contiene el recurso en su nuevo estado tras la acción. |
| Cualquier error | Ver SPEC-C02, sección 4 | 400/401/403/404/409/422/500 según la excepción. |

## 9. Idempotencia y doble submit

Los operarios de campo, con conexión intermitente (ver SPEC-C02 sección 6.1), reintentan envíos con frecuencia — un mismo `POST` puede llegar dos veces al servidor sin que el usuario lo perciba (timeout en el cliente que en realidad sí llegó al servidor, doble toque en "Reintentar"). Este spec fija:

### 9.1 Regla general

- `GET`, `PUT` y `DELETE` son naturalmente idempotentes (repetir la misma request produce el mismo estado final) y no requieren tratamiento especial.
- `POST` de creación **no** es idempotente por defecto en HTTP, por lo que las creaciones que se originan en formularios de campo (incidencias, evidencia fotográfica de intervenciones) deben poder deduplicarse.

### 9.2 Mecanismo: clave de idempotencia provista por el cliente

Para los `POST` de creación identificados como sensibles a doble submit (a definir por cada spec de feature, obligatorio como mínimo para `POST /api/v1/incidents` y cualquier `POST` que adjunte evidencia fotográfica de intervenciones):

```
POST /api/v1/incidents
Idempotency-Key: {uuid-v4-generado-por-el-cliente}
```

- El cliente (web o móvil) genera un UUID v4 único por intento de creación **la primera vez que el usuario confirma el formulario**, y reenvía el mismo UUID en cada reintento del mismo submit (no genera uno nuevo al reintentar).
- El backend guarda `Idempotency-Key` asociada al recurso creado. Si llega un segundo `POST` con la misma clave:
  - Si la primera creación ya terminó con éxito: responde `200 OK` (no `201`) con el recurso ya existente, sin crear un duplicado.
  - Si la primera creación sigue en curso: responde `409 Conflict` indicando que ya hay una operación con esa clave en proceso.
- Un `POST` sin `Idempotency-Key` en un endpoint que la exige se rechaza con `400 Bad Request` (falta un header requerido) — esto obliga a que los formularios de campo la implementen desde el día uno, en vez de agregarla como parche posterior.
- La clave se descarta (deja de deduplicarse) pasado un tiempo prudente desde la creación (ej. 24 horas), suficiente para cubrir reintentos en campo sin retener el registro de claves indefinidamente.

### 9.3 En el cliente (web y móvil)

- El botón de submit se deshabilita inmediatamente al primer toque/click y solo vuelve a habilitarse cuando la request resuelve (éxito o error no relacionado a red) — esto es la primera línea de defensa contra doble submit, independiente del mecanismo de `Idempotency-Key` del backend, que cubre el caso donde la request sí salió dos veces pese al debounce del botón (por ejemplo, timeout del cliente seguido de un reintento manual).

## 10. Criterios de aceptación (verificables por cualquiera)

| # | Criterio | Método de verificación |
|---|----------|----------------------|
| CA-01 | Todo endpoint del backend y del microservicio Flask empieza con `/api/v1`, sin excepciones. | `GET /api/v1/health` en el backend (puerto 8080) y `GET /api/v1/health` en el data service (puerto 5001, dentro de la red Docker) → ambos responden 200 con el mismo prefijo. |
| CA-02 | Un listado sin parámetros de paginación devuelve 20 elementos como máximo, con `page.size=20`. | `GET /api/v1/[recurso]` sobre una tabla con más de 20 registros → verificar `data.content.length <= 20` y `data.page.size === 20`. |
| CA-03 | Pedir un `size` mayor a 100 se recorta a 100, no produce error. | `GET /api/v1/[recurso]?size=500` → verificar `data.page.size === 100` y código 200 (no 400). |
| CA-04 | Filtrar el catastro por `bbox` devuelve solo elementos cuya ubicación cae dentro del rectángulo dado. | `GET /api/v1/catalog-elements?bbox=...` con coordenadas que cubran solo una porción conocida del campus → verificar que todos los elementos de `data.content` están geográficamente dentro de ese rectángulo (comparar contra el mapa). |
| CA-05 | Combinar `bbox` y `near` en el mismo request devuelve 400, no un resultado silencioso. | `GET /api/v1/catalog-elements?bbox=...&near=...&radius=50` → verificar código 400 y mensaje de error indicando la incompatibilidad. |
| CA-06 | Crear un recurso devuelve 201 con header `Location` apuntando al recurso creado. | `POST /api/v1/[recurso]` con body válido → verificar código 201 y que el header `Location` responde 200 al hacer `GET` sobre él. |
| CA-07 | Eliminar un recurso devuelve 204 sin cuerpo, y el recurso deja de aparecer en listados pero conserva `deleted_at` en base de datos. | `DELETE /api/v1/[recurso]/{id}` → verificar 204 sin body; `GET /api/v1/[recurso]/{id}` después → 404; verificar en BD que la fila sigue existiendo con `deleted_at` poblado. |
| CA-08 | Reenviar el mismo `POST` de creación de incidencia con el mismo `Idempotency-Key` no crea un segundo registro. | `POST /api/v1/incidents` dos veces seguidas con el mismo header `Idempotency-Key` y el mismo body → verificar que solo existe un registro en el listado y que la segunda respuesta es 200 (no 201) con el mismo `id`. |

## 11. Tests

### 11.1 Tests unitarios backend (JUnit 5 + Mockito)

```
- [Recurso]Service.list() con page=0,size=20 → retorna Page con content.size() <= 20
- [Recurso]Service.list() con size=500 → aplica el máximo de 100
- [Recurso]Service.list() con filtro zoneId → todos los resultados tienen ese zoneId
- [Recurso]Service.list() con filtro por bbox → delega en el repositorio con el
  predicado ST_Intersects/ST_MakeEnvelope correcto
- [Recurso]Service.list() con bbox y near simultáneos → lanza excepción de validación
- [Recurso]Service.create() con Idempotency-Key ya usada y creación previa exitosa
  → retorna el recurso existente sin crear uno nuevo
- [Recurso]Service.create() con Idempotency-Key de una operación aún en curso
  → lanza conflicto (409)
```

### 11.2 Tests de integración backend (`@WebMvcTest` / `@SpringBootTest`)

```
- GET /api/v1/[recurso] sin params → 200, data.page.size === 20
- GET /api/v1/[recurso]?page=0&size=20&sort=createdAt,desc → 200, orden descendente verificado
- GET /api/v1/[recurso]?size=500 → 200, data.page.size === 100
- GET /api/v1/[recurso]?zoneId=3 → 200, todos los items de data.content tienen zoneId=3
- GET /api/v1/catalog-elements?bbox=... → 200, resultados dentro del rectángulo
- GET /api/v1/catalog-elements?near=...&radius=50 → 200, resultados dentro del radio
- GET /api/v1/catalog-elements?bbox=...&near=... → 400
- POST /api/v1/[recurso] válido → 201 + header Location + body con el recurso creado
- POST /api/v1/incidents con Idempotency-Key repetida → segunda llamada 200, no 201,
  mismo id que la primera
- POST /api/v1/incidents sin Idempotency-Key (en endpoint que la exige) → 400
- DELETE /api/v1/[recurso]/{id} → 204 sin body; GET posterior → 404;
  fila en BD sigue existiendo con deleted_at no nulo
```

### 11.3 Tests del microservicio Flask (pytest)

```
- GET /api/v1/health → 200, mismo sobre {ok, message, data} que el backend
  (test_health.py actualizado a la ruta con prefijo /api/v1)
```

### 11.4 Tests frontend (Jest + Testing Library)

```
- Helper de serialización de query params en lib/api.ts: genera correctamente
  ?page=&size=&sort=&bbox=&near=&radius= combinados
- Componente de listado: consume Page<T>.content y Page<T>.page.totalPages
  para renderizar la tabla y el paginador
- Componente de mapa: al mover/hacer zoom, dispara un GET con bbox actualizado
- Formulario de creación con envío en curso: el botón de submit está disabled
  hasta que la request resuelve
- Reintento de un submit fallido por red: reutiliza el mismo Idempotency-Key
  generado en el primer intento, no genera uno nuevo
```

### 11.5 Tests E2E (si aplica)

```
- Usuario filtra el catastro por zona y especie desde la UI → la URL de la API
  refleja ambos filtros y la tabla muestra solo coincidencias
- Usuario en el mapa hace zoom sobre una sección del campus → la lista de
  elementos visibles se actualiza vía el filtro bbox
- Usuario en móvil pierde conexión justo después de enviar una incidencia y
  la reintenta al recuperar señal → solo se crea una incidencia, no dos
```

## 12. Seguridad

- [x] Validación en backend de todo query param (tipos, rangos de `page`/`size`, formato de `bbox`/`near`), no solo en frontend.
- [x] Endpoints de listado y creación requieren autenticación JWT (heredado de SPEC-001); este spec no redefine autenticación, solo la forma de la URL y el payload.
- [x] Roles/permisos: cada feature define quién puede filtrar/crear/eliminar; este spec no los prescribe.
- [x] Datos sensibles que no deben exponerse: ninguna coordenada ni dato de ubicación de un reporte marcado como confidencial debe filtrarse vía `bbox`/`near` a un rol sin permiso sobre ese recurso (la restricción de visibilidad se aplica antes del filtro geoespacial, no después).
- [x] Prevención de inyección SQL: `Specification`/`@Query` parametrizada de Spring Data; ningún filtro (incluidos `bbox`/`near`) se concatena como string en una query nativa.
- [x] XSS: el parámetro `search` de texto libre se trata como dato, nunca se refleja sin escapar en ninguna respuesta HTML (no aplica directamente a JSON, pero sí si algún reporte exportado a HTML lo incluye).

## 13. Consideraciones de extensibilidad

- [x] Los valores de filtro por estado/urgencia/tipo son siempre `code` de catálogos configurables (SPEC-003), nunca enums Java ni listas hardcodeadas en el frontend.
- [x] La lógica de construcción de filtros y de resolución geoespacial vive en el Service (`Specification` armada ahí), nunca en el Controller.
- [x] El límite de paginación (20/100) y el radio máximo de búsqueda por cercanía son candidatos a configuración externa (`application.yml`) si un futuro cliente necesita valores distintos — no deben quedar como literales repetidos en múltiples controllers.
- [x] Ninguna referencia a "PUCP" ni a nombres de zonas específicas del campus aparece en la lógica de filtros: los ejemplos de esta spec (Ficus benjamina, coordenadas del campus) son ilustrativos, no hardcodeados en código.

## 14. Checklist de verificación (para el desarrollador)

### Antes de pedir código a la IA

- [x] Spec tiene objetivo claro en una oración.
- [x] Los contratos de paginación, filtros y filtros geoespaciales están definidos con tipos y formatos exactos.
- [x] Hay al menos 5 criterios de aceptación verificables sin leer código (hay 8).
- [x] Se contemplan edge cases: `size` fuera de rango, filtros geoespaciales incompatibles entre sí, doble submit.
- [x] Se especifica comportamiento común a web y móvil (misma API, mismos query params).

### Después de recibir código de la IA

- [ ] Toda ruta nueva sigue `/api/v1/[recurso-plural]` sin excepciones, incluidas las del microservicio Flask.
- [ ] Ningún listado nuevo omite paginación ni supera el máximo de `size`.
- [ ] Los filtros usan `Specification`/`@Query` parametrizada, nunca SQL concatenado.
- [ ] Los filtros geoespaciales usan SRID 4326 y las funciones PostGIS correctas (`ST_Intersects`, `ST_DWithin`), no cálculos manuales de distancia.
- [ ] Las fechas en JSON son ISO 8601 UTC; los nombres de campo son camelCase en JSON y snake_case en BD.
- [ ] Los `POST` de creación sensibles a doble submit implementan `Idempotency-Key`.
- [ ] Los tests de la sección 11 pasan.
