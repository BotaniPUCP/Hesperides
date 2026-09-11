# SPEC-002 — Modelo de datos

| Campo | Valor |
|-------|-------|
| HU relacionada | — (spec fundacional, no deriva de una HU) |
| Plataforma | Ambas (el modelo sirve a web y móvil por igual) |
| Sprint | S0 (fundacional) — entidades de Sprint 1 marcadas como tal |
| Dependencias | SPEC-000 (arquitectura y convenciones), SPEC-001 (crea `users`), SPEC-003 (catálogos configurables) |

---

## 1. Objetivo

Definir el esquema completo de base de datos de Hesperides —entidades, tipos SQL, relaciones, índices y migraciones Flyway— para que el catastro georreferenciado de áreas verdes, las intervenciones, los contratos tercerizados y las incidencias del campus tengan una única fuente de verdad estructural sobre la que los demás specs construyan sin inventar tablas.

## 2. Contexto para la IA

> **Lectura obligatoria:** [`specs/REGLAS.md`](../REGLAS.md).
> **Específico de este spec:** SPEC-003 (todo tipo/estado es FK a `catalog_items`) y
> SPEC-004 (columnas de autoría). **§4.1 es obligatorio: toda entidad extiende `BaseEntity`.**

**Este spec NO define endpoints ni pantallas.** Define el esquema. Los specs de feature (SPEC-1XX en adelante) son los que exponen estas tablas por API. La sección 3 de la plantilla se limita, por tanto, a los invariantes de contrato que toda API sobre estas tablas debe respetar.

### 2.1 Módulo backend

Las entidades JPA se reparten por módulo siguiendo la estructura de `modules/` del SPEC-000. Ninguna entidad vive fuera de su módulo:

| Módulo (`pe.edu.pucp.hesperides.modules.*`) | Entidades JPA | Sprint |
|---|---|---|
| `catalog` (SPEC-003) | `CatalogType`, `CatalogItem` | S0 |
| `auth` (SPEC-001) | `User` | S0 |
| `admin` | `Zone`, `Species`, `Supply`, `SystemParameter` | S1 |
| `cadastre` | `GreenElement`, `GreenElementAttachment` | S1 |
| `interventions` | `Intervention`, `InterventionElement`, `InterventionSupply`, `InterventionEvidence` | S2 |
| `contracts` | `Provider`, `Contract`, `ContractZone`, `ContractExecution` | S2 |
| `incidents` | `Incident`, `IncidentStatusHistory`, `IncidentEvidence` | S2 |
| `reports` | sin entidades propias (lee de las anteriores) | S3 |

Repositorios: uno por entidad, en plural y con sufijo `Repository` (`GreenElementsRepository`, `ZonesRepository`, …), según REGLAS.md §5.2.

### 2.2 Módulo frontend (web)

Los tipos TypeScript espejo de estas entidades viven en `shared/types/models.ts` y extienden el `AuditFields` que ya existe allí. **No** se duplican en `frontend/src/types/`: se re-exportan.

### 2.3 Módulo móvil

Mismos tipos vía `shared/types/`. El móvil consume las mismas tablas por la misma API; no tiene esquema propio. El cacheo offline de intervenciones en campo es una decisión del spec de móvil (fase 2), no de este.

### 2.4 Restricciones técnicas

**Librerías que DEBE usar:**

- **PostGIS 3.4** sobre PostgreSQL 16. La imagen Docker del servicio `db` en `docker-compose.yml` y `docker-compose.dev.yml` pasa de `postgres:16-alpine` a **`postgis/postgis:16-3.4`**. Es un cambio de imagen base, no de motor: los datos existentes y la configuración de conexión no cambian.
- **`hibernate-spatial`** (`org.hibernate.orm:hibernate-spatial`, versión gestionada por el BOM de Spring Boot) como dependencia nueva en `backend/pom.xml`. Sin ella Hibernate no sabe mapear las columnas `GEOMETRY`.
- **JTS** (`org.locationtech.jts`), que entra transitivamente con `hibernate-spatial`. Los tipos Java de geometría son `org.locationtech.jts.geom.Point` y `org.locationtech.jts.geom.Polygon`.
- **Flyway** para toda evolución del esquema. `ddl-auto` se queda en `validate`; nunca en `update`.

**Librerías que NO debe usar:**

- Ninguna librería de geometría alternativa (GeoTools, spatial4j) ni un tipo propio `LatLng`. La geometría es PostGIS o no es.
- Ningún `@Enumerated` de Java para tipos, estados, prioridades o categorías. Van a `catalog_items` por FK (SPEC-003).
- Ningún cliente de S3 en las entidades. La tabla guarda una clave de objeto, no el binario ni la URL firmada (ver §5.4).

**Patrón de catálogos aplicable:** todos los `catalog_types` sembrados en V009 (§4.7). Cualquier FK cuyo nombre termine en `_item_id` apunta a `catalog_items(id)`.

---

## 3. Invariantes de contrato

Este spec no expone endpoints propios. Fija los invariantes que toda API construida sobre estas tablas debe cumplir, para que los SPEC-1XX no los renegocien:

| # | Invariante |
|---|---|
| INV-01 | Toda respuesta usa el sobre `{ ok, message, data }` de SPEC-C02. Sin excepciones para geometría. |
| INV-02 | Las filas con `deleted_at IS NOT NULL` **nunca** aparecen en listados ni en `GET /:id` (responde 404). Solo el módulo de auditoría, si se implementa, puede verlas. |
| INV-03 | La geometría viaja en JSON como **GeoJSON** (`{"type":"Point","coordinates":[lon,lat]}`), en orden longitud-latitud, que es el que manda GeoJSON. Nunca como WKT ni como par `lat`/`lng` suelto. |
| INV-04 | Toda referencia a catálogo se serializa como objeto embebido `{ id, code, label }`, no como entero pelado. El frontend muestra `label` y compara por `code`. |
| INV-05 | Todo listado que pueda superar 20 filas es paginado (`?page=&size=&sort=`) según SPEC-C03. Aplica sí o sí a `green_elements`, `interventions` e `incidents`. |
| INV-06 | La evidencia fotográfica se entrega como URL prefirmada de vida corta generada al momento de la respuesta, nunca como una URL pública permanente ni como base64. |

---

## 4. Migración de base de datos

### 4.0 Numeración y propiedad de migraciones

Rango fundacional `V001`–`V099` (REGLAS.md §5.4). Reparto:

| Versión | Archivo | Propietaria | Estado |
|---|---|---|---|
| V001 | `V001__create_catalog_tables.sql` | SPEC-003 | ✅ Ya existe en el repo. **Este spec no la toca.** |
| V002 | `V002__create_users.sql` | **SPEC-001** | ⚠️ La crea SPEC-001, no este spec. Aquí solo se referencia `users(id)` como FK. |
| V003 | `V003__enable_postgis.sql` | SPEC-002 | Definida abajo |
| V004 | `V004__create_zones.sql` | SPEC-002 | Definida abajo |
| V005 | `V005__create_species.sql` | SPEC-002 | Definida abajo |
| V006 | `V006__create_green_elements.sql` | SPEC-002 | Definida abajo |
| V007 | `V007__create_interventions.sql` | SPEC-002 | Definida abajo |
| V008 | `V008__create_contracts.sql` | SPEC-002 | Definida abajo |
| V009 | `V009__create_incidents.sql` | SPEC-002 | Definida abajo |
| V010 | `V010__seed_catalogs.sql` | SPEC-002 | Definida abajo |
| V011+ | — | Libre | Reservado para correcciones fundacionales |

> **Orden de aplicación:** V003 debe correr antes que V006, porque `green_elements` usa tipos `GEOMETRY` que solo existen tras `CREATE EXTENSION postgis`. Flyway lo garantiza por número de versión.

> ⚠️ **Pendiente del cliente — dato semilla, no estructura.** Las migraciones de abajo crean tablas vacías salvo los catálogos de V010. Las filas reales de `zones` y `species` entran por una migración posterior (rango `V1XX`, propiedad del spec de feature correspondiente) cuando el cliente entregue la zonificación oficial del campus y el listado de especies. **No** se siembran valores de ejemplo: un dato inventado en la tabla es indistinguible de un dato real para el equipo.

### 4.1 Convenciones aplicadas a toda tabla de este spec

Sin excepción, cada tabla lleva:

```sql
id          BIGSERIAL PRIMARY KEY,
...
created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
deleted_at  TIMESTAMP
```

- `deleted_at IS NULL` significa "vigente". **Nunca se ejecuta `DELETE`.**

**En SQL estas tres columnas se repiten en cada `CREATE TABLE`** — PostgreSQL no tiene herencia de columnas utilizable para esto (`INHERITS` rompe índices y claves foráneas). La repetición es física e inevitable.

**En Java no se repiten.** Toda entidad de dominio extiende `BaseEntity`, una `@MappedSuperclass` que este spec define aquí para que nadie la reinvente:

```java
package pe.edu.pucp.hesperides.shared.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.SQLRestriction;
import java.time.LocalDateTime;

/**
 * Audit fields shared by every domain table (SPEC-000 section 5.4).
 * Entities never redeclare id, createdAt, updatedAt or deletedAt.
 */
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @CreatedDate
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /** Soft delete marker. Null means the row is current. */
    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    // getters y setters
}
```

Cada entidad la extiende y añade `@SQLRestriction("deleted_at IS NULL")` para que Hibernate excluya las filas borradas lógicamente sin que cada consulta lo repita:

```java
@Entity
@Table(name = "green_elements")
@SQLRestriction("deleted_at IS NULL")
public class GreenElement extends BaseEntity {
    // solo los campos propios del elemento
}
```

`@EnableJpaAuditing` debe estar activo en la configuración de Spring para que `@CreatedDate` y `@LastModifiedDate` se pueblen solas; sin esa anotación los campos quedan nulos y el `NOT NULL` de la base rechaza el `INSERT`.

**La jerarquía completa de superclases**, para que no compitan dos mecanismos por la misma columna:

| Superclase | Qué aporta | Quién la extiende | Definida en |
|---|---|---|---|
| `BaseEntity` | `id`, `createdAt`, `updatedAt`, `deletedAt` | Toda entidad de dominio | Este spec |
| `Auditable extends BaseEntity` | Además `createdByUserId` y `updatedByUserId` | Solo las siete tablas de la sección 4.2 de SPEC-004 | SPEC-004 |
| Ninguna | — | `AuditLog`, que es append-only y no tiene `updatedAt` ni `deletedAt` | SPEC-004 |
- Los índices de unicidad que deben convivir con el soft delete son **parciales**: `WHERE deleted_at IS NULL`. Así un código liberado por borrado lógico puede reutilizarse.
- Toda FK a catálogo se nombra `<concepto>_item_id` y referencia `catalog_items(id)`.
- Todas las FK son `ON DELETE RESTRICT` implícito (el default de PostgreSQL). Coherente con soft delete: nada se borra en cascada porque nada se borra.

### 4.2 V003 — Extensión PostGIS

```sql
-- V003__enable_postgis.sql
-- Requiere que la imagen del servicio `db` sea postgis/postgis:16-3.4.
-- Sobre una imagen postgres:16-alpine esta migración falla y el arranque se detiene:
-- es el comportamiento deseado (fail fast), no un bug.

CREATE EXTENSION IF NOT EXISTS postgis;
```

### 4.3 V004 — Zonas del campus

```sql
-- V004__create_zones.sql
-- Zonificación jerárquica del campus. Estructura definida; filas pendientes del cliente.

CREATE TABLE zones (
    id             BIGSERIAL PRIMARY KEY,
    code           VARCHAR(30)  NOT NULL,
    name           VARCHAR(150) NOT NULL,
    description    TEXT,
    parent_zone_id BIGINT REFERENCES zones(id),
    zone_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    boundary       GEOMETRY(Polygon, 4326),
    area_m2        NUMERIC(12, 2) CHECK (area_m2 IS NULL OR area_m2 >= 0),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at     TIMESTAMP
);

CREATE UNIQUE INDEX idx_zones_code_active ON zones(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_zones_parent_zone_id ON zones(parent_zone_id);
CREATE INDEX idx_zones_boundary ON zones USING GIST(boundary);
```

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `code` | VARCHAR(30) | No | Identificador corto legible. Único entre vigentes. |
| `name` | VARCHAR(150) | No | Nombre visible de la zona. |
| `parent_zone_id` | BIGINT | Sí | Autorreferencia. `NULL` = zona raíz. Permite sector → subsector sin decidir hoy cuántos niveles habrá. |
| `zone_type_item_id` | BIGINT | No | FK a catálogo `ZONE_TYPE`. |
| `boundary` | GEOMETRY(Polygon, 4326) | Sí | Polígono del perímetro. Nulable porque una zona puede registrarse administrativamente antes de que se digitalice su contorno. |
| `area_m2` | NUMERIC(12,2) | Sí | Área declarada. Se guarda además de calcularse de `boundary` porque el área oficial del cliente puede no coincidir con la digitalización, y manda la oficial. |

> ⚠️ **Pendiente del cliente:** la **zonificación oficial del campus** — cuántos niveles tiene la jerarquía (¿sector / subsector / jardín?), el listado de zonas con sus códigos y nombres, y los polígonos de sus perímetros. Sin esto la tabla queda vacía. Los valores del catálogo `ZONE_TYPE` también dependen de esta entrega (§4.7).

### 4.4 V005 — Especies

```sql
-- V005__create_species.sql
-- Catálogo botánico. Estructura definida; filas y atributos finales pendientes del cliente.

CREATE TABLE species (
    id                  BIGSERIAL PRIMARY KEY,
    scientific_name     VARCHAR(150) NOT NULL,
    common_name         VARCHAR(150),
    family              VARCHAR(100),
    species_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    origin_item_id      BIGINT REFERENCES catalog_items(id),
    description         TEXT,
    care_notes          TEXT,
    attributes          JSONB,
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE UNIQUE INDEX idx_species_scientific_name_active
    ON species(scientific_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_species_common_name ON species(common_name);
```

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `scientific_name` | VARCHAR(150) | No | Nombre binomial. Único entre vigentes. |
| `common_name` | VARCHAR(150) | Sí | Nombre de uso corriente en campo. |
| `family` | VARCHAR(100) | Sí | Familia botánica. |
| `species_type_item_id` | BIGINT | No | FK a catálogo `SPECIES_TYPE` (árbol, arbusto, herbácea, césped…). |
| `origin_item_id` | BIGINT | Sí | FK a catálogo `SPECIES_ORIGIN` (nativa, introducida…). |
| `attributes` | JSONB | Sí | **Escape hatch deliberado.** El cliente aún no ha dicho qué atributos lleva una especie. Los que se confirmen y se usen para filtrar o reportar se promueven a columnas propias en una migración posterior; los ocasionales se quedan aquí. Ver la nota de pendiente. |

> ⚠️ **Pendiente del cliente:** el **listado real de especies presentes en el campus y el conjunto de atributos que el cliente necesita registrar por especie** (¿altura esperada?, ¿requerimiento hídrico?, ¿época de floración?, ¿tolerancia a poda?). Mientras no llegue, la tabla queda vacía y `attributes` absorbe lo que aparezca. **No** se siembra ninguna especie de ejemplo: una lista inventada en la base es indistinguible de la lista oficial para quien la consulte después.

### 4.5 V006 — Catastro verde georreferenciado (núcleo del Sprint 1)

```sql
-- V006__create_green_elements.sql
-- Requiere V003 (extensión PostGIS).

CREATE TABLE green_elements (
    id                    BIGSERIAL PRIMARY KEY,
    code                  VARCHAR(40)  NOT NULL,
    name                  VARCHAR(150),
    zone_id               BIGINT NOT NULL REFERENCES zones(id),
    element_type_item_id  BIGINT NOT NULL REFERENCES catalog_items(id),
    species_id            BIGINT REFERENCES species(id),
    condition_item_id     BIGINT REFERENCES catalog_items(id),
    location              GEOMETRY(Point, 4326),
    area                  GEOMETRY(Polygon, 4326),
    area_m2               NUMERIC(12, 2) CHECK (area_m2 IS NULL OR area_m2 >= 0),
    quantity              INTEGER CHECK (quantity IS NULL OR quantity > 0),
    planting_date         DATE,
    registered_by_user_id BIGINT NOT NULL REFERENCES users(id),
    notes                 TEXT,
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP,

    -- Un elemento es un punto (un árbol) o un polígono (un jardín, un campo
    -- deportivo), nunca ninguno de los dos. La BD lo hace cumplir; no se
    -- delega a la capa de servicio.
    CONSTRAINT chk_green_elements_geometry
        CHECK (location IS NOT NULL OR area IS NOT NULL)
);

CREATE UNIQUE INDEX idx_green_elements_code_active
    ON green_elements(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_green_elements_zone_id ON green_elements(zone_id);
CREATE INDEX idx_green_elements_species_id ON green_elements(species_id);
CREATE INDEX idx_green_elements_element_type ON green_elements(element_type_item_id);
CREATE INDEX idx_green_elements_location ON green_elements USING GIST(location);
CREATE INDEX idx_green_elements_area ON green_elements USING GIST(area);

-- Fotos de ficha del elemento (distintas de la evidencia de intervención).
CREATE TABLE green_element_attachments (
    id                   BIGSERIAL PRIMARY KEY,
    green_element_id     BIGINT NOT NULL REFERENCES green_elements(id),
    storage_key          VARCHAR(500) NOT NULL,
    original_filename    VARCHAR(255),
    content_type         VARCHAR(100) NOT NULL,
    size_bytes           BIGINT NOT NULL CHECK (size_bytes > 0),
    caption              VARCHAR(255),
    uploaded_by_user_id  BIGINT NOT NULL REFERENCES users(id),
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at           TIMESTAMP
);

CREATE INDEX idx_green_element_attachments_element
    ON green_element_attachments(green_element_id);
```

| Campo de `green_elements` | Tipo | Nulo | Notas |
|---|---|---|---|
| `code` | VARCHAR(40) | No | Código de inventario. Único entre vigentes. Es el que irá en el QR de la fase futura. |
| `zone_id` | BIGINT | No | Zona a la que pertenece. Todo elemento está en una zona. |
| `element_type_item_id` | BIGINT | No | FK a catálogo `GREEN_ELEMENT_TYPE`: árbol, jardín, césped, campo deportivo. |
| `species_id` | BIGINT | Sí | Nulable: un césped o un campo deportivo no siempre corresponde a una especie única del catálogo. |
| `condition_item_id` | BIGINT | Sí | FK a catálogo `ELEMENT_CONDITION`. Estado fitosanitario/general. |
| `location` | GEOMETRY(Point, 4326) | Sí | Para elementos puntuales (un árbol). |
| `area` | GEOMETRY(Polygon, 4326) | Sí | Para elementos de superficie (jardín, césped, campo). |
| `quantity` | INTEGER | Sí | Para elementos agrupados ("este macizo tiene 40 plantas"). |
| `registered_by_user_id` | BIGINT | No | Trazabilidad: quién dio de alta el elemento. |

**Por qué `location` y `area` son dos columnas y no una `GEOMETRY(Geometry, 4326)` genérica:** con dos columnas tipadas, PostGIS valida el tipo geométrico al insertar y el índice GIST de cada una es específico. Una columna genérica aceptaría una `LineString` por error y obligaría a filtrar por `ST_GeometryType` en cada consulta. El `CHECK` garantiza que al menos una está poblada; ambas pobladas es válido y útil (un árbol singular con su copa proyectada).

### 4.6 V007 — Intervenciones de personal estable

```sql
-- V007__create_interventions.sql

CREATE TABLE supplies (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(40)  NOT NULL,
    name               VARCHAR(150) NOT NULL,
    unit_item_id       BIGINT NOT NULL REFERENCES catalog_items(id),
    supply_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    description        TEXT,
    is_active          BOOLEAN NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP
);

CREATE UNIQUE INDEX idx_supplies_code_active ON supplies(code) WHERE deleted_at IS NULL;

CREATE TABLE interventions (
    id                        BIGSERIAL PRIMARY KEY,
    code                      VARCHAR(40) NOT NULL,
    zone_id                   BIGINT NOT NULL REFERENCES zones(id),
    intervention_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    status_item_id            BIGINT NOT NULL REFERENCES catalog_items(id),
    contract_id               BIGINT,  -- FK añadida en V008 (dependencia circular)
    scheduled_date            DATE NOT NULL,
    started_at                TIMESTAMP,
    completed_at              TIMESTAMP,
    validated_at              TIMESTAMP,
    assigned_by_user_id       BIGINT NOT NULL REFERENCES users(id),
    assigned_to_user_id       BIGINT NOT NULL REFERENCES users(id),
    validated_by_user_id      BIGINT REFERENCES users(id),
    description               TEXT,
    execution_notes           TEXT,
    rejection_reason          TEXT,
    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at                TIMESTAMP,

    CONSTRAINT chk_interventions_dates
        CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at),
    -- Solo el coordinador cierra: si hay validador hay fecha de validación, y viceversa.
    CONSTRAINT chk_interventions_validation
        CHECK ((validated_at IS NULL) = (validated_by_user_id IS NULL))
);

CREATE UNIQUE INDEX idx_interventions_code_active
    ON interventions(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_interventions_zone_id ON interventions(zone_id);
CREATE INDEX idx_interventions_assigned_to ON interventions(assigned_to_user_id);
CREATE INDEX idx_interventions_scheduled_date ON interventions(scheduled_date);
CREATE INDEX idx_interventions_status ON interventions(status_item_id);

-- Tabla puente: una intervención toca N elementos del catastro y
-- un elemento acumula N intervenciones. Es la que produce el historial.
CREATE TABLE intervention_elements (
    id               BIGSERIAL PRIMARY KEY,
    intervention_id  BIGINT NOT NULL REFERENCES interventions(id),
    green_element_id BIGINT NOT NULL REFERENCES green_elements(id),
    notes            TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP
);

CREATE UNIQUE INDEX idx_intervention_elements_pair_active
    ON intervention_elements(intervention_id, green_element_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_intervention_elements_green_element
    ON intervention_elements(green_element_id);

CREATE TABLE intervention_supplies (
    id               BIGSERIAL PRIMARY KEY,
    intervention_id  BIGINT NOT NULL REFERENCES interventions(id),
    supply_id        BIGINT NOT NULL REFERENCES supplies(id),
    quantity         NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    notes            TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP
);

CREATE INDEX idx_intervention_supplies_intervention
    ON intervention_supplies(intervention_id);

-- Evidencia fotográfica antes/después.
CREATE TABLE intervention_evidences (
    id                  BIGSERIAL PRIMARY KEY,
    intervention_id     BIGINT NOT NULL REFERENCES interventions(id),
    green_element_id    BIGINT REFERENCES green_elements(id),
    moment_item_id      BIGINT NOT NULL REFERENCES catalog_items(id),
    storage_key         VARCHAR(500) NOT NULL,
    original_filename   VARCHAR(255),
    content_type        VARCHAR(100) NOT NULL,
    size_bytes          BIGINT NOT NULL CHECK (size_bytes > 0),
    captured_at         TIMESTAMP,
    captured_location   GEOMETRY(Point, 4326),
    caption             VARCHAR(255),
    uploaded_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX idx_intervention_evidences_intervention
    ON intervention_evidences(intervention_id);
CREATE INDEX idx_intervention_evidences_moment
    ON intervention_evidences(moment_item_id);
```

`moment_item_id` apunta al catálogo `EVIDENCE_MOMENT` (`BEFORE` / `AFTER`). Es catálogo y no booleano `is_before` porque el cliente puede pedir mañana un momento "durante" sin migrar datos.

`captured_location` guarda dónde se tomó la foto según el GPS del dispositivo, no dónde está el elemento. Sirve para contrastar que la evidencia se capturó en campo y no desde una oficina; es un dato de auditoría, no de catastro.

> ⚠️ **Pendiente del cliente:** el **formato del reporte diario de intervenciones** y el **Excel de checklist de jardines**. Determinan si `execution_notes` (texto libre) basta o si hace falta una tabla de ítems de checklist con respuestas estructuradas. Estructura mínima definida; la ampliación queda a un SPEC-2XX.

> ⚠️ **Pendiente del cliente:** las **frecuencias de mantenimiento por tipo de intervención y tipo de elemento**. No se modela aún una tabla `maintenance_frequencies` porque no se sabe si la frecuencia se define por zona, por tipo de elemento, por especie, o por combinación. Modelarla a ciegas obligaría a rehacerla. Los valores del catálogo `FREQUENCY` (§4.7) dependen de la misma entrega.

### 4.7 V008 — Contratos y servicios tercerizados

```sql
-- V008__create_contracts.sql

CREATE TABLE providers (
    id               BIGSERIAL PRIMARY KEY,
    tax_id           VARCHAR(20)  NOT NULL,
    business_name    VARCHAR(200) NOT NULL,
    contact_name     VARCHAR(150),
    contact_email    VARCHAR(255),
    contact_phone    VARCHAR(30),
    address          VARCHAR(255),
    is_active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       TIMESTAMP
);

CREATE UNIQUE INDEX idx_providers_tax_id_active ON providers(tax_id) WHERE deleted_at IS NULL;

CREATE TABLE contracts (
    id                    BIGSERIAL PRIMARY KEY,
    contract_number       VARCHAR(60) NOT NULL,
    provider_id           BIGINT NOT NULL REFERENCES providers(id),
    service_type_item_id  BIGINT NOT NULL REFERENCES catalog_items(id),
    status_item_id        BIGINT NOT NULL REFERENCES catalog_items(id),
    agreed_frequency_item_id BIGINT REFERENCES catalog_items(id),
    start_date            DATE NOT NULL,
    end_date              DATE NOT NULL,
    amount                NUMERIC(14, 2) CHECK (amount IS NULL OR amount >= 0),
    currency_code         CHAR(3),
    scope_description     TEXT,
    responsible_user_id   BIGINT NOT NULL REFERENCES users(id),
    final_report_storage_key VARCHAR(500),
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP,

    CONSTRAINT chk_contracts_dates CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX idx_contracts_number_active
    ON contracts(contract_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_contracts_provider_id ON contracts(provider_id);
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date);

-- Zonas cubiertas por el contrato.
CREATE TABLE contract_zones (
    id          BIGSERIAL PRIMARY KEY,
    contract_id BIGINT NOT NULL REFERENCES contracts(id),
    zone_id     BIGINT NOT NULL REFERENCES zones(id),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);

CREATE UNIQUE INDEX idx_contract_zones_pair_active
    ON contract_zones(contract_id, zone_id) WHERE deleted_at IS NULL;

-- Cada visita/ejecución real del proveedor. Es lo que se contrasta
-- contra agreed_frequency_item_id para el informe de cumplimiento.
CREATE TABLE contract_executions (
    id                   BIGSERIAL PRIMARY KEY,
    contract_id          BIGINT NOT NULL REFERENCES contracts(id),
    zone_id              BIGINT REFERENCES zones(id),
    execution_date       DATE NOT NULL,
    status_item_id       BIGINT NOT NULL REFERENCES catalog_items(id),
    verified_by_user_id  BIGINT REFERENCES users(id),
    verified_at          TIMESTAMP,
    observations         TEXT,
    created_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at           TIMESTAMP
);

CREATE INDEX idx_contract_executions_contract ON contract_executions(contract_id);
CREATE INDEX idx_contract_executions_date ON contract_executions(execution_date);

-- Cierra la referencia diferida de V007: una intervención puede haberse
-- ejecutado bajo un contrato tercerizado en vez de por personal estable.
ALTER TABLE interventions
    ADD CONSTRAINT fk_interventions_contract
    FOREIGN KEY (contract_id) REFERENCES contracts(id);

CREATE INDEX idx_interventions_contract_id ON interventions(contract_id);
```

`interventions.contract_id` nulable es lo que unifica los módulos 3 y 4: `NULL` = personal estable, con valor = tercerizado. Una sola tabla de trabajo ejecutado, un solo historial por elemento, un solo reporte. La alternativa —dos tablas paralelas de intervención— duplicaría la evidencia, el historial y cada consulta de reporte.

> ⚠️ **Pendiente del cliente:** un **contrato tipo** real. Determina si `scope_description` en texto libre basta o si el alcance necesita ítems estructurados (metas por zona, penalidades, entregables con fecha), y si `amount` / `currency_code` son campos que el cliente realmente quiere en el sistema o los lleva por otra vía administrativa. Estructura mínima definida; se amplía cuando llegue el documento.

### 4.8 V009 — Incidencias

```sql
-- V009__create_incidents.sql

CREATE TABLE incidents (
    id                    BIGSERIAL PRIMARY KEY,
    code                  VARCHAR(40) NOT NULL,
    title                 VARCHAR(200) NOT NULL,
    description           TEXT NOT NULL,
    incident_type_item_id BIGINT NOT NULL REFERENCES catalog_items(id),
    status_item_id        BIGINT NOT NULL REFERENCES catalog_items(id),
    urgency_item_id       BIGINT NOT NULL REFERENCES catalog_items(id),
    zone_id               BIGINT REFERENCES zones(id),
    green_element_id      BIGINT REFERENCES green_elements(id),
    location              GEOMETRY(Point, 4326),
    reported_by_user_id   BIGINT NOT NULL REFERENCES users(id),
    assigned_to_user_id   BIGINT REFERENCES users(id),
    intervention_id       BIGINT REFERENCES interventions(id),
    reported_at           TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at           TIMESTAMP,
    resolution_notes      TEXT,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at            TIMESTAMP,

    -- Una incidencia se ubica: o apunta a un elemento del catastro,
    -- o trae su propio punto GPS. Sin ubicación no es accionable.
    CONSTRAINT chk_incidents_location
        CHECK (green_element_id IS NOT NULL OR location IS NOT NULL)
);

CREATE UNIQUE INDEX idx_incidents_code_active ON incidents(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_incidents_status ON incidents(status_item_id);
CREATE INDEX idx_incidents_urgency ON incidents(urgency_item_id);
CREATE INDEX idx_incidents_green_element ON incidents(green_element_id);
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at);
CREATE INDEX idx_incidents_location ON incidents USING GIST(location);

-- Bitácora del flujo Reportada → En evaluación → En atención → Resuelta.
-- Append-only: nunca se actualiza una fila, solo se inserta la siguiente.
CREATE TABLE incident_status_history (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         BIGINT NOT NULL REFERENCES incidents(id),
    from_status_item_id BIGINT REFERENCES catalog_items(id),
    to_status_item_id   BIGINT NOT NULL REFERENCES catalog_items(id),
    changed_by_user_id  BIGINT NOT NULL REFERENCES users(id),
    comment             TEXT,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX idx_incident_status_history_incident
    ON incident_status_history(incident_id, created_at);

CREATE TABLE incident_evidences (
    id                  BIGSERIAL PRIMARY KEY,
    incident_id         BIGINT NOT NULL REFERENCES incidents(id),
    storage_key         VARCHAR(500) NOT NULL,
    original_filename   VARCHAR(255),
    content_type        VARCHAR(100) NOT NULL,
    size_bytes          BIGINT NOT NULL CHECK (size_bytes > 0),
    captured_at         TIMESTAMP,
    caption             VARCHAR(255),
    uploaded_by_user_id BIGINT NOT NULL REFERENCES users(id),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at          TIMESTAMP
);

CREATE INDEX idx_incident_evidences_incident ON incident_evidences(incident_id);
```

`incidents.intervention_id` cierra el ciclo: una incidencia atendida genera una intervención, y esa intervención queda en el historial del elemento como cualquier otra. `from_status_item_id` nulable porque la primera fila del historial (creación en estado `REPORTED`) no viene de ningún estado previo.

### 4.9 V010 — Catálogos semilla

```sql
-- V010__seed_catalogs.sql
-- Solo se siembran los catálogos cuyos valores están confirmados por el
-- material del cliente. Los tipos sin valores confirmados se crean vacíos:
-- la aplicación arranca y el administrador los llena desde la UI de catálogos.

-- ── Tipos de catálogo ────────────────────────────────────────────────────
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('ZONE_TYPE',         'Tipos de zona',              'Niveles de la zonificación del campus', FALSE),
    ('SPECIES_TYPE',      'Tipos de especie',           'Clasificación de porte de la especie',  FALSE),
    ('SPECIES_ORIGIN',    'Origen de especie',          'Procedencia de la especie',             FALSE),
    ('GREEN_ELEMENT_TYPE','Tipos de elemento verde',    'Clases de elemento del catastro',       FALSE),
    ('ELEMENT_CONDITION', 'Estados de conservación',    'Condición del elemento verde',          FALSE),
    ('INTERVENTION_TYPE', 'Tipos de intervención',      'Trabajos ejecutables sobre un elemento', FALSE),
    ('INTERVENTION_STATUS','Estados de intervención',   'Ciclo de vida de una intervención',     TRUE),
    ('EVIDENCE_MOMENT',   'Momentos de evidencia',      'Momento de captura de la fotografía',   TRUE),
    ('SUPPLY_TYPE',       'Tipos de insumo',            'Clasificación de insumos',              FALSE),
    ('MEASUREMENT_UNIT',  'Unidades de medida',         'Unidades para cantidades de insumo',    FALSE),
    ('SERVICE_TYPE',      'Tipos de servicio',          'Servicios contratables a terceros',     FALSE),
    ('CONTRACT_STATUS',   'Estados de contrato',        'Ciclo de vida de un contrato',          TRUE),
    ('EXECUTION_STATUS',  'Estados de ejecución',       'Resultado de una visita del proveedor', TRUE),
    ('FREQUENCY',         'Frecuencias',                'Periodicidad pactada o de mantenimiento', FALSE),
    ('INCIDENT_TYPE',     'Tipos de incidencia',        'Naturaleza de la incidencia reportada', FALSE),
    ('INCIDENT_STATUS',   'Estados de incidencia',      'Flujo de atención de la incidencia',    TRUE),
    ('URGENCY_LEVEL',     'Niveles de urgencia',        'Prioridad de atención',                 TRUE);

-- ── Roles (completa los de V001) ─────────────────────────────────────────
-- V001 sembró ADMIN y USER genéricos. Aquí se añaden los roles reales del
-- dominio y se desactiva el USER genérico, que ningún rol de negocio usa.
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'COORDINADOR', 'Coordinador',            2),
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'SUPERVISOR',  'Supervisor de cuadrilla', 3),
    ((SELECT id FROM catalog_types WHERE code = 'ROLE'), 'OPERARIO',    'Operario de campo',       4);

UPDATE catalog_items SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
 WHERE code = 'USER'
   AND catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'ROLE');

-- ── Tipos de intervención (confirmados por el material del cliente) ──────
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), 'PODA',              'Poda',                     1),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), 'CONTROL_FITO',      'Control fitosanitario',    2),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), 'CORTE_CESPED',      'Corte de césped',          3),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), 'RESIEMBRA',         'Resiembra',                4),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), 'DECORACION',        'Decoración',               5),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_TYPE'), 'REMOCION_TERRENO',  'Remoción de terreno',      6);

-- ── Estados de incidencia (flujo confirmado) ─────────────────────────────
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INCIDENT_STATUS'), 'REPORTED',    'Reportada',     1),
    ((SELECT id FROM catalog_types WHERE code = 'INCIDENT_STATUS'), 'IN_REVIEW',   'En evaluación', 2),
    ((SELECT id FROM catalog_types WHERE code = 'INCIDENT_STATUS'), 'IN_PROGRESS', 'En atención',   3),
    ((SELECT id FROM catalog_types WHERE code = 'INCIDENT_STATUS'), 'RESOLVED',    'Resuelta',      4);

-- ── Niveles de urgencia ──────────────────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'URGENCY_LEVEL'), 'LOW',      'Baja',    1),
    ((SELECT id FROM catalog_types WHERE code = 'URGENCY_LEVEL'), 'MEDIUM',   'Media',   2),
    ((SELECT id FROM catalog_types WHERE code = 'URGENCY_LEVEL'), 'HIGH',     'Alta',    3),
    ((SELECT id FROM catalog_types WHERE code = 'URGENCY_LEVEL'), 'CRITICAL', 'Crítica', 4);

-- ── Estados de intervención (derivados del flujo descrito: el coordinador
--    asigna, el operario ejecuta, el coordinador valida el cierre) ────────
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_STATUS'), 'ASSIGNED',     'Asignada',            1),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_STATUS'), 'IN_PROGRESS',  'En ejecución',        2),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_STATUS'), 'COMPLETED',    'Ejecutada',           3),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_STATUS'), 'VALIDATED',    'Validada',            4),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_STATUS'), 'REJECTED',     'Observada',           5),
    ((SELECT id FROM catalog_types WHERE code = 'INTERVENTION_STATUS'), 'CANCELLED',    'Cancelada',           6);

-- ── Momentos de evidencia ────────────────────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'EVIDENCE_MOMENT'), 'BEFORE', 'Antes',   1),
    ((SELECT id FROM catalog_types WHERE code = 'EVIDENCE_MOMENT'), 'AFTER',  'Después', 2);

-- ── Tipos de elemento verde (derivados del alcance del catastro) ─────────
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'GREEN_ELEMENT_TYPE'), 'TREE',        'Árbol',           1),
    ((SELECT id FROM catalog_types WHERE code = 'GREEN_ELEMENT_TYPE'), 'GARDEN',      'Jardín',          2),
    ((SELECT id FROM catalog_types WHERE code = 'GREEN_ELEMENT_TYPE'), 'LAWN',        'Césped',          3),
    ((SELECT id FROM catalog_types WHERE code = 'GREEN_ELEMENT_TYPE'), 'SPORTS_FIELD','Campo deportivo', 4);

-- ── Estados de contrato y de ejecución ───────────────────────────────────
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'CONTRACT_STATUS'), 'DRAFT',     'Borrador',  1),
    ((SELECT id FROM catalog_types WHERE code = 'CONTRACT_STATUS'), 'ACTIVE',    'Vigente',   2),
    ((SELECT id FROM catalog_types WHERE code = 'CONTRACT_STATUS'), 'EXPIRED',   'Vencido',   3),
    ((SELECT id FROM catalog_types WHERE code = 'CONTRACT_STATUS'), 'TERMINATED','Resuelto',  4),
    ((SELECT id FROM catalog_types WHERE code = 'EXECUTION_STATUS'), 'PLANNED',   'Planificada', 1),
    ((SELECT id FROM catalog_types WHERE code = 'EXECUTION_STATUS'), 'EXECUTED',  'Ejecutada',   2),
    ((SELECT id FROM catalog_types WHERE code = 'EXECUTION_STATUS'), 'MISSED',    'No ejecutada',3),
    ((SELECT id FROM catalog_types WHERE code = 'EXECUTION_STATUS'), 'OBSERVED',  'Observada',   4);

-- ── Parámetros generales del sistema ─────────────────────────────────────
CREATE TABLE system_parameters (
    id           BIGSERIAL PRIMARY KEY,
    code         VARCHAR(60)  NOT NULL,
    label        VARCHAR(150) NOT NULL,
    value        TEXT,
    value_type   VARCHAR(20)  NOT NULL DEFAULT 'STRING'
                 CHECK (value_type IN ('STRING','INTEGER','DECIMAL','BOOLEAN','JSON')),
    description  TEXT,
    is_editable  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at   TIMESTAMP
);

CREATE UNIQUE INDEX idx_system_parameters_code_active
    ON system_parameters(code) WHERE deleted_at IS NULL;
```

**Catálogos creados sin valores** (`ZONE_TYPE`, `SPECIES_TYPE`, `SPECIES_ORIGIN`, `ELEMENT_CONDITION`, `SUPPLY_TYPE`, `MEASUREMENT_UNIT`, `SERVICE_TYPE`, `FREQUENCY`, `INCIDENT_TYPE`):

> ⚠️ **Pendiente del cliente:** los valores de estos nueve catálogos. Se crea el `catalog_type` para que las FK sean válidas y la UI de administración pueda listarlos, pero **no se siembra ningún ítem**. Un `INCIDENT_TYPE` inventado terminaría en un reporte a dirección como si fuera una clasificación acordada. El administrador los carga desde la UI de catálogos (módulo 1) en cuanto el cliente entregue las listas.

`system_parameters` también se crea vacía por la misma razón: no se sabe qué parámetros generales quiere el cliente.

### 4.10 V012 — Cuadrillas de trabajo

La operación de campo no es plana: el operario reporta a un **supervisor de cuadrilla**, y el
supervisor al coordinador. El coordinador ve todas las cuadrillas; el supervisor solo la suya.
Estas dos tablas son las que permiten resolver "solo mi equipo" sin recorrer la jerarquía a mano
en cada consulta.

```sql
-- V012__create_teams.sql
-- Cuadrillas de trabajo. Un supervisor dirige una cuadrilla; los operarios
-- pertenecen a ella. El coordinador supervisa a todos los supervisores.

CREATE TABLE teams (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(50)  NOT NULL,
    name               VARCHAR(150) NOT NULL,
    supervisor_user_id BIGINT       NOT NULL REFERENCES users(id),
    zone_id            BIGINT       REFERENCES zones(id),
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP
);

CREATE UNIQUE INDEX idx_teams_code_active ON teams(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_supervisor ON teams(supervisor_user_id);
CREATE INDEX idx_teams_zone ON teams(zone_id);

-- Pertenencia de operarios a una cuadrilla. Es una tabla puente con historia:
-- left_at permite saber quién estuvo en qué cuadrilla cuando se ejecutó una
-- intervención pasada, sin reescribir el histórico al reasignar a alguien.
CREATE TABLE team_members (
    id          BIGSERIAL PRIMARY KEY,
    team_id     BIGINT    NOT NULL REFERENCES teams(id),
    user_id     BIGINT    NOT NULL REFERENCES users(id),
    joined_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at     TIMESTAMP,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at  TIMESTAMP
);

-- Un usuario no puede estar dos veces activo en la misma cuadrilla.
CREATE UNIQUE INDEX idx_team_members_unique_active
    ON team_members(team_id, user_id) WHERE left_at IS NULL AND deleted_at IS NULL;
CREATE INDEX idx_team_members_user ON team_members(user_id);
```

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `teams.supervisor_user_id` | BIGINT | No | El usuario con rol `SUPERVISOR` que dirige la cuadrilla. La FK no puede exigir el rol (es una fila de `catalog_items`); lo valida el servicio, igual que la pertenencia de tipo de catálogo de SPEC-003 §5.2. |
| `teams.zone_id` | BIGINT | Sí | Zona habitual de la cuadrilla. Nulable: una cuadrilla puede ser polivalente o cubrir varias zonas. |
| `team_members.left_at` | TIMESTAMP | Sí | `NULL` = miembro vigente. Se rellena al sacar a alguien de la cuadrilla, en vez de borrar la fila, para no falsear a qué equipo pertenecía cuando ejecutó una intervención antigua. |

**Por qué una tabla y no una columna `supervisor_user_id` en `users`:** una columna resolvería "quién es mi jefe", pero no permite nombrar la cuadrilla, asignarle una zona, ni consultar "qué equipos existen" — que es exactamente lo que el coordinador necesita ver. Tampoco conservaría el histórico de pertenencia.

> ⚠️ **Pendiente del cliente:** cuántas cuadrillas existen, cómo se llaman y qué zonas cubre cada una. La estructura queda lista; las filas las carga el administrador.

---

## 5. Comportamiento esperado

### 5.1 Diagrama ER

Las columnas están en el DDL de §4; repetirlas en un diagrama crea una segunda versión que
envejece sola. Lo que importa es **cómo se relacionan**:

```
catalog_items ──< users, zones, species, green_elements, incidents, interventions, contracts
                  (todo tipo, estado, rol y categoría es una fila de catálogo — INV-2)

zones ──< zones                    jerarquía de zonas (el servicio impide ciclos, §5.4)
zones ──< green_elements           una zona contiene elementos
species ──< green_elements         una especie clasifica elementos

green_elements >──< interventions  N:M vía intervention_elements
                                   (una salida de campo toca varios elementos)
green_elements ──< incidents       una incidencia puede señalar un elemento…
incidents ──> interventions        …y resolverse con una intervención

contracts ──< contract_services ──< contract_executions
                                   lo pactado frente a lo realmente ejecutado

teams ──< team_members ──> users   composición de cuadrillas (V012)

*_evidences / *_attachments        guardan storage_key, nunca el binario (§5.2.4)
*_status_history                   rastro de cambios de estado
```

El **historial de un elemento no es una tabla**: es la consulta
`green_elements → intervention_elements → interventions` ordenada por fecha (§5.2.3).

### 5.2 Decisiones de diseño

#### 5.2.1 Por qué PostGIS y no dos columnas `latitude` / `longitude`

El módulo 2 es un **mapa**, no una lista con coordenadas. Las consultas que el sistema necesita responder —"qué elementos caen dentro de esta zona", "qué hay a 50 m de esta incidencia", "qué área cubre este contrato"— son operaciones espaciales. Con `latitude`/`longitude`:

- Un jardín o un campo deportivo no se puede representar: son polígonos, no puntos.
- "Elementos dentro de la zona X" exige traer todo a memoria y calcular en Java. Con PostGIS es `ST_Within(location, boundary)` resuelto por índice GIST.
- El cálculo de área y de distancia hay que reimplementarlo (y equivocarse con la curvatura terrestre).

**SRID 4326 (WGS84)** porque es el sistema de coordenadas del GPS de los dispositivos móviles y el que consumen las librerías de mapas web sin reproyección. Para el cálculo de áreas y distancias en metros se usa `ST_Area(geography(...))` / `ST_Distance(geography(...))`, que hace la conversión sobre el elipsoide; no se guarda una segunda columna reproyectada.

**Impacto operativo del cambio de imagen:** `postgis/postgis:16-3.4` está basada en Debian, no en Alpine, así que la imagen es notablemente más pesada que `postgres:16-alpine`. Es un coste de descarga en CI y en el primer arranque local, no de ejecución. La alternativa —instalar PostGIS sobre la imagen Alpine con un Dockerfile propio— añade una imagen que mantener a cambio de ahorrar espacio en disco.

#### 5.2.2 BIGSERIAL, no UUID

Se decidió para on-premise y se mantiene tras el paso a AWS. Razones que siguen valiendo en la nube: los índices B-tree sobre enteros secuenciales no fragmentan como los UUID v4 aleatorios; las FK ocupan 8 bytes y no 16; y en depuración de campo un código de elemento legible pesa. El riesgo del BIGSERIAL —IDs adivinables— se cubre con autorización por rol en cada endpoint (SPEC-001), no ocultando el identificador. No se prevé fusionar bases de datos de instalaciones distintas, que es el caso donde el UUID gana de verdad.

#### 5.2.3 Cómo se modela el historial de intervenciones por elemento

**No hay tabla `element_history`.** El historial es una consulta, no una tabla:

```
green_elements → intervention_elements → interventions
```

Una fila de `intervention_elements` es un hecho inmutable: "esta intervención tocó este elemento". El historial de un elemento es el `SELECT` de sus `interventions` ordenadas por `completed_at`. Las incidencias entran al mismo historial por `incidents.intervention_id`.

Se descartó una tabla de historial denormalizada (con el tipo y la fecha copiados) porque introduce dos fuentes de verdad: corregir la fecha de una intervención dejaría el historial mintiendo. Si el volumen lo exigiera —no se prevé en el orden de magnitud de un campus— la solución es una vista materializada refrescada al validar la intervención, no una tabla escrita a mano.

La relación es **N:M** y no `interventions.green_element_id` porque una sola salida de campo poda varios árboles de la misma zona: con FK simple habría que crear una intervención por árbol y el conteo de trabajo real se distorsionaría.

#### 5.2.4 Dónde vive la evidencia fotográfica

**El binario nunca entra a PostgreSQL.** Las tablas `*_evidences` y `*_attachments` guardan `storage_key`: la clave del objeto en el almacenamiento de ficheros, más los metadatos (tipo MIME, tamaño, quién subió, cuándo se capturó).

- **En AWS:** `storage_key` es la key del objeto en un bucket S3 privado. El backend genera una URL prefirmada de vida corta al servir la respuesta (INV-06). El bucket no tiene acceso público.
- **On-premise / desarrollo local:** `storage_key` es una ruta relativa dentro de un directorio de almacenamiento configurado por variable de entorno. El backend sirve el fichero tras verificar autorización.

La columna guarda una **clave, no una URL completa**: una URL absoluta ataría cada fila a un bucket y una región concretos, y migrar de proveedor obligaría a un `UPDATE` masivo. Con la clave, el prefijo lo pone la configuración del entorno y la misma base de datos sirve en local, en AWS y on-premise.

Se descartó `BYTEA` en la tabla: las fotos de campo pesan megabytes, inflarían cada backup de la base, romperían el rendimiento de cualquier `SELECT *` y obligarían a que un `GET` de intervención transportara los binarios.

Se descartó una tabla `attachments` única y polimórfica (con `entity_type` + `entity_id`): mata la integridad referencial —no hay FK posible a "alguna de estas tres tablas"— y una foto de evidencia huérfana en un reporte de cumplimiento de contrato es exactamente el error que este sistema existe para evitar. Tres tablas con FK real cuestan más DDL y garantizan que el dato existe.

> ⚠️ **Pendiente de decisión técnica (interna, no del cliente):** el bucket S3, su política de ciclo de vida y el tamaño máximo por fichero. Lo cierra el spec de infraestructura/despliegue. Este spec fija el contrato de la tabla: `storage_key` + metadatos, nunca binario.

#### 5.2.5 Índices parciales para convivir con el soft delete

`UNIQUE (code)` a secas impediría reutilizar el código de un elemento dado de baja lógicamente, que es un requisito operativo real (se retira un árbol, se planta otro en el mismo sitio). Por eso todo índice único de este spec lleva `WHERE deleted_at IS NULL`.

#### 5.2.6 Fuera de alcance confirmado

- **Módulo 7 — Vivero:** el cliente **no ha confirmado el alcance**. No se define ninguna tabla. Cuando se confirme, entra por su propio spec con rango `V2XX`. Se anticipa que reutilizará `species`, `zones` y el patrón de catálogos, y que eso no obliga a modificar nada de lo definido aquí.
- **Módulo 8 — QR público:** fase futura, prioridad baja. No se define tabla `qr_codes`. `green_elements.code` es único entre vigentes, que es la única precondición que el QR necesita del modelo de datos.

### 5.3 Reglas que la base de datos hace cumplir vs. las que hace cumplir el servicio

Distinción explícita para que ningún SPEC-1XX duplique validaciones ni las dé por hechas:

| Regla | Dónde vive | Cómo |
|---|---|---|
| Un elemento verde tiene punto o polígono | **BD** | `CHECK chk_green_elements_geometry` |
| Una incidencia tiene elemento o coordenada | **BD** | `CHECK chk_incidents_location` |
| `end_date >= start_date` en contratos | **BD** | `CHECK chk_contracts_dates` |
| Cantidad de insumo positiva | **BD** | `CHECK quantity > 0` |
| Código único entre elementos vigentes | **BD** | índice único parcial |
| Validador y fecha de validación van juntos | **BD** | `CHECK chk_interventions_validation` |
| El flujo de estados de incidencia respeta el orden | **Servicio** | Los estados son filas de catálogo; la BD no conoce las transiciones válidas. `incident_status_history` deja el rastro. |
| Solo un coordinador valida una intervención | **Servicio** | La FK apunta a `users`, no a un rol. La autorización es de SPEC-001. |
| El operario asignado es el que registra la ejecución | **Servicio** | — |
| El polígono de un elemento cae dentro de su zona | **Servicio** (advertencia, no bloqueo) | `ST_Within`. Es advertencia porque los límites digitalizados serán aproximados hasta que el cliente entregue la zonificación oficial. |

### 5.4 Casos límite

- **Elemento sin geometría:** rechazado por el `CHECK`. No existe elemento sin ubicar.
- **Zona sin polígono:** permitido. Una zona puede crearse administrativamente antes de digitalizar su contorno; los elementos se le asignan igual por `zone_id`.
- **Ciclo en la jerarquía de zonas** (`A` padre de `B`, `B` padre de `A`): la BD no lo impide. Lo valida el servicio al guardar, recorriendo los ancestros. Sin esa validación, cualquier consulta recursiva del árbol cuelga.
- **Especie eliminada lógicamente con elementos vivos que la referencian:** la FK sigue siendo válida (la fila existe). El servicio impide dar de baja una especie con elementos vigentes; si el cliente lo exige, se desactiva con `is_active = FALSE`, que la oculta de los desplegables sin romper las fichas históricas.
- **Contrato vencido con ejecuciones pendientes:** permitido. `contracts.status_item_id` pasa a `EXPIRED`, las `contract_executions` en `PLANNED` quedan como no ejecutadas y así aparecen en el comparativo de frecuencia pactada vs. real. Es precisamente el dato que el reporte necesita mostrar.
- **Dos usuarios editan el mismo elemento a la vez:** bloqueo optimista por `@Version` o comparación de `updated_at`. Lo define SPEC-C03; el modelo lo soporta porque `updated_at` es obligatorio en toda tabla.
- **Coordenadas fuera del campus:** la BD las acepta (4326 admite cualquier punto del planeta). El servicio advierte si el punto cae fuera del polígono del campus — pendiente de que el cliente entregue ese polígono.
- **Volumen:** un campus universitario está en el orden de miles de elementos y decenas de miles de intervenciones a varios años. Los índices GIST y B-tree definidos cubren ese orden de magnitud sin particionado.

---

## 6. Criterios de aceptación (verificables por cualquiera)

> Verificables desde `psql` sin leer una línea de Java. Conexión: `docker exec -it hesperides-db psql -U hesperides -d hesperides`.

| # | Criterio | Método de verificación |
|---|----------|----------------------|
| CA-01 | Las migraciones corren limpias desde cero | `docker-compose down -v && docker-compose up --build`. El backend arranca sin error. `SELECT version, description, success FROM flyway_schema_history ORDER BY installed_rank;` devuelve V001–V010 con `success = t` en todas. |
| CA-02 | PostGIS está instalado y operativo | `SELECT PostGIS_Version();` devuelve una versión 3.4.x. `SELECT extname FROM pg_extension WHERE extname='postgis';` devuelve una fila. |
| CA-03 | Existen las 20 tablas de dominio (17 de este spec + `catalog_types`/`catalog_items` de V001 + `users` de V002) | `SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('catalog_types','catalog_items','users','zones','species','green_elements','green_element_attachments','supplies','interventions','intervention_elements','intervention_supplies','intervention_evidences','providers','contracts','contract_zones','contract_executions','incidents','incident_status_history','incident_evidences','system_parameters');` devuelve **20**. |
| CA-04 | Toda tabla de dominio cumple la convención de auditoría | `SELECT table_name FROM information_schema.tables t WHERE table_schema='public' AND table_name NOT LIKE 'flyway%' AND table_name NOT LIKE 'spatial_ref_sys' AND NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name=t.table_name AND c.column_name='deleted_at');` devuelve **0 filas**. Repetir cambiando `deleted_at` por `created_at` y `updated_at`. |
| CA-05 | Las columnas geométricas tienen el tipo y el SRID correctos | `SELECT f_table_name, f_geometry_column, type, srid FROM geometry_columns ORDER BY 1,2;` devuelve `zones.boundary` (Polygon, 4326), `green_elements.location` (Point, 4326), `green_elements.area` (Polygon, 4326), `intervention_evidences.captured_location` (Point, 4326) e `incidents.location` (Point, 4326). Todas con SRID **4326**. |
| CA-06 | Un elemento verde sin ninguna geometría es rechazado por la base | Insertar una fila de `green_elements` con `location` y `area` ambos `NULL` → la BD responde error de violación de la restricción `chk_green_elements_geometry`. La fila no se crea. |
| CA-07 | Una incidencia sin elemento ni coordenada es rechazada | Insertar en `incidents` con `green_element_id` y `location` ambos `NULL` → error de `chk_incidents_location`. |
| CA-08 | Los catálogos confirmados están sembrados, exactos y completos | `SELECT ci.code, ci.label FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='INTERVENTION_TYPE' ORDER BY ci.sort_order;` devuelve exactamente 6 filas: Poda, Control fitosanitario, Corte de césped, Resiembra, Decoración, Remoción de terreno. Lo mismo con `INCIDENT_STATUS` → 4 filas (Reportada, En evaluación, En atención, Resuelta) y `URGENCY_LEVEL` → 4 filas (Baja, Media, Alta, Crítica). |
| CA-09 | Los cuatro roles del dominio existen y el genérico está desactivado | `SELECT ci.code, ci.is_active FROM catalog_items ci JOIN catalog_types ct ON ct.id=ci.catalog_type_id WHERE ct.code='ROLE' ORDER BY ci.sort_order;` devuelve ADMIN (`t`), COORDINADOR (`t`), SUPERVISOR (`t`), OPERARIO (`t`) y USER (`f`). |
| CA-10 | Ningún dato pendiente del cliente fue inventado | `SELECT count(*) FROM zones;`, `SELECT count(*) FROM species;` y `SELECT count(*) FROM system_parameters;` devuelven **0** en una base recién migrada. `SELECT ct.code, count(ci.id) FROM catalog_types ct LEFT JOIN catalog_items ci ON ci.catalog_type_id=ct.id WHERE ct.code IN ('ZONE_TYPE','SPECIES_TYPE','SPECIES_ORIGIN','ELEMENT_CONDITION','SUPPLY_TYPE','MEASUREMENT_UNIT','SERVICE_TYPE','FREQUENCY','INCIDENT_TYPE') GROUP BY 1;` devuelve **0** en cada uno. |
| CA-11 | Los índices únicos respetan el soft delete | Insertar un elemento con `code='TEST-1'`; marcarlo con `UPDATE green_elements SET deleted_at = NOW() WHERE code='TEST-1'`; insertar otro elemento con el mismo `code='TEST-1'` → **funciona**. Insertar un tercero sin borrar el segundo → **falla** por índice único. |
| CA-12 | Existen los índices espaciales GIST | `SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexdef LIKE '%USING gist%' ORDER BY 1;` incluye `idx_zones_boundary`, `idx_green_elements_location`, `idx_green_elements_area` e `idx_incidents_location`. |
| CA-13 | Ninguna tabla usa un tipo ENUM de PostgreSQL | `SELECT typname FROM pg_type WHERE typtype='e';` devuelve **0 filas**. Todo tipo/estado/prioridad es una fila de `catalog_items`. |
| CA-14 | El historial de intervenciones de un elemento se obtiene con una sola consulta | `SELECT i.code, i.scheduled_date, ci.label FROM interventions i JOIN intervention_elements ie ON ie.intervention_id=i.id JOIN catalog_items ci ON ci.id=i.intervention_type_item_id WHERE ie.green_element_id = :id AND i.deleted_at IS NULL ORDER BY i.scheduled_date DESC;` se ejecuta sin error sobre la base vacía (devuelve 0 filas) y no requiere ninguna tabla de historial adicional. |
| CA-15 | Hibernate valida el esquema al arrancar | Con `ddl-auto: validate`, el backend levanta sin excepciones de validación una vez implementadas las entidades. Verificable en los logs de `docker-compose logs backend`: no aparece `SchemaManagementException`. |

---

## 7. Especificación visual

No aplica. Este spec no tiene interfaz: define esquema. Las decisiones visuales del mapa (librería, capas, clustering de marcadores, estilo de polígonos) pertenecen al spec de feature del catastro (SPEC-1XX) y a SPEC-C01.

Lo único que este spec impone al frontend es el formato de intercambio de la geometría (INV-03: GeoJSON, orden longitud-latitud), que es lo que consumen directamente las librerías de mapas web sin conversión.

---

## 8. Tests

Lo que debe quedar fijado:

```
Migraciones
- docker-compose down -v && up --build aplica V003-V010 desde cero sin error
- la extensión PostGIS queda disponible antes de la primera tabla con geometría
- reejecutar las migraciones no altera checksums (V001 y V002 no se tocan)

Los CHECK que la BD hace cumplir (§5.3)
- green_element sin punto ni polígono → falla
- incidencia sin elemento ni coordenada → falla
- contrato con end_date < start_date → falla
- cantidad de insumo <= 0 → falla
- intervención con validador pero sin fecha de validación → falla

Soft delete e índices parciales
- dar de baja un elemento y reutilizar su code en uno nuevo → permitido (§5.2.5)
- el mismo code duplicado entre elementos vigentes → falla

Geometría
- las columnas son SRID 4326; ST_Area/ST_Distance sobre geography devuelven metros
- los tipos en Java son Point y Polygon de JTS, no una clase propia

Entidades
- toda entidad extiende BaseEntity y no redeclara sus campos (INV-3)
- @EnableJpaAuditing activo: sin él createdAt queda nulo y el INSERT falla
- ningún @Enumerated ni enum de dominio: todo tipo o estado es FK a CatalogItem

Datos semilla
- las migraciones NO siembran zonas, especies ni frecuencias: siguen pendientes del cliente
```

## 9. Propio de este spec

Lo general está en [`REGLAS.md` §0](../REGLAS.md). Propio del modelo de datos:

- **Los `CHECK` son la última línea, no la única.** Bean Validation en los DTO replica las
  reglas para dar mensajes útiles (SPEC-C02). El reparto exacto BD/servicio está en §5.3.
- **Nunca salen al cliente:** `users.password_hash`, ni siquiera anidado como autor de una
  intervención (se expone `{id, fullName}`); y `storage_key`, que se sustituye por una URL
  prefirmada de vida corta — exponer la clave permitiría enumerar el bucket.
- **`captured_location`** revela dónde estuvo un operario y cuándo. Es dato de auditoría:
  acceso restringido a coordinador y administrador.
- **Ficheros subidos:** `content_type` y `size_bytes` se validan **en el servidor** contra el
  fichero real, nunca contra lo que declare el cliente.
- **Texto libre** (`description`, `notes`, `observations`, `execution_notes`,
  `resolution_notes`, `caption`) se sanea al renderizar, no al guardar: el original preserva lo
  que el operario escribió.
- **Consultas espaciales:** `ST_*` en `@Query` con parámetros nombrados, nunca concatenando
  coordenadas.
- **Trazabilidad que aporta el modelo:** `registered_by_user_id`, `assigned_by_user_id`,
  `assigned_to_user_id`, `validated_by_user_id`, `uploaded_by_user_id`, `changed_by_user_id`,
  `verified_by_user_id`.

**Puntos de extensión.** El vivero (módulo 7) y el QR (módulo 8) entran por su propio spec sin
modificar ninguna tabla de aquí; la única precondición del QR es que `green_elements.code` sea
único entre vigentes. `species.attributes` (JSONB) absorbe los atributos que el cliente aún no
ha definido: los que se confirmen y se usen para filtrar o reportar se promueven a columna
propia en una `V1XX`. El JSONB no es el destino final de un atributo consolidado.

**Checklist propio** (el común está en [`REGLAS.md` §6](../REGLAS.md)):

- [ ] Los ocho archivos `V003`–`V010` están en `db/migration/`, uno por área, y
      `V001__create_catalog_tables.sql` **no fue modificado** (Flyway falla por checksum).
- [ ] La imagen de `db` es `postgis/postgis:16-3.4` en `docker-compose.yml` **y** en
      `docker-compose.dev.yml`; `hibernate-spatial` está en el `pom` sin versión explícita.
- [ ] `ddl-auto` sigue en `validate` en los tres `application*.yml`.
- [ ] Los tipos geométricos son `org.locationtech.jts.geom.Point`/`Polygon`; no hay `LatLng` propia.
- [ ] Ningún `@Column` de tipo `byte[]` para imágenes.
- [ ] Toda entidad extiende `BaseEntity` (§4.1) y lleva `@SQLRestriction("deleted_at IS NULL")`.
- [ ] **`@EnableJpaAuditing` está activo:** sin él `createdAt`/`updatedAt` quedan nulos y el
      `INSERT` falla por `NOT NULL`.
- [ ] `shared/types/models.ts` refleja las entidades y extiende `AuditFields`.
- [ ] `docker-compose down -v && docker-compose up --build` levanta desde cero sin error de Flyway.
- [ ] Ninguna migración siembra zonas, especies, frecuencias ni parámetros: siguen pendientes
      del cliente (ver Anexo).

## Anexo — Resumen de pendientes del cliente

Consolidado para seguimiento. Ninguno bloquea el arranque del Sprint 1: todas las estructuras están definidas y las tablas afectadas quedan vacías a propósito.

| # | Qué falta | Bloquea | Impacto si no llega |
|---|---|---|---|
| P-01 | **Zonificación oficial del campus**: niveles de jerarquía, listado de zonas, códigos, nombres y polígonos | Filas de `zones`, ítems de `ZONE_TYPE` | El catastro no puede asignar elementos a zonas reales. **El más urgente: es Sprint 1.** |
| P-02 | **Listado de especies y sus atributos** | Filas de `species`, ítems de `SPECIES_TYPE` y `SPECIES_ORIGIN`, posible promoción de campos desde `attributes` | Los elementos se registran sin especie (el campo es nulable) y hay que completarlos después |
| P-03 | **Frecuencias de mantenimiento por tipo de intervención y de elemento** | Ítems de `FREQUENCY`; decisión sobre una tabla `maintenance_frequencies` | No hay comparativo de frecuencia pactada vs. real ni alertas de mantenimiento vencido |
| P-04 | **Formato del reporte diario** | Confirmar si `execution_notes` en texto libre basta | El reporte operativo se genera con la estructura que haya, y puede no coincidir con lo que el cliente espera ver |
| P-05 | **Un contrato tipo** | Alcance final de `contracts`: si `scope_description` basta, si `amount`/`currency_code` se usan | El módulo de contratos se construye sobre supuestos |
| P-06 | **Excel de checklist de jardines** | Posible tabla de ítems de checklist con respuestas estructuradas | La verificación en campo queda en texto libre, no comparable entre visitas |
| P-07 | **Formatos de los reportes** (operativo, coordinación, dirección) | Nada del esquema; sí el módulo 6 | Los reportes se diseñan a ciegas |
| P-08 | **Tipos de incidencia y estados de conservación** | Ítems de `INCIDENT_TYPE` y `ELEMENT_CONDITION` | El administrador los carga desde la UI de catálogos apenas los reciba; no requiere migración |
| P-09 | **Alcance del módulo de vivero** | Nada de lo definido aquí | Entra por su propio spec cuando se confirme |
