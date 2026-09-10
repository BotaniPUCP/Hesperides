# SPEC-003 — Catálogos configurables

| Campo | Valor |
|-------|-------|
| HU relacionada | — (spec fundacional, no deriva de una HU) |
| Plataforma | Ambas (el sistema de catálogos sirve a web y móvil por igual) |
| Sprint | S0 (fundacional) |
| Dependencias | SPEC-000 (arquitectura y convenciones), SPEC-002 (modelo de datos — consumidores de catálogo), SPEC-C02 (manejo de errores), SPEC-C03 (patrones de API) |

---

## 1. Objetivo

Definir el contrato de API, el patrón de uso en backend y frontend, y las reglas de negocio del sistema de catálogos configurables, para que todo tipo, estado, prioridad o categoría del dominio se resuelva contra una fila de `catalog_items` editable por un administrador, y ningún desarrollador —humano o IA— necesite declarar un enum para representarlo.

## 2. Contexto para la IA

> **Lectura obligatoria:** [`specs/REGLAS.md`](../REGLAS.md).
> **Específico de este spec:** las tablas `catalog_types`/`catalog_items` ya existen (V001):
> se documentan aquí, no se redefinen. Este spec **es** el mecanismo que sustituye a los enums (INV-2).

**Este spec no crea las tablas `catalog_types` ni `catalog_items`.** Ya existen en `V001__create_catalog_tables.sql`, propiedad de este spec pero ya aplicada al repo. Este documento las describe, define su API de administración y consumo, y fija el patrón que toda entidad JPA debe seguir para referenciarlas correctamente.

### 2.1 Módulo backend

- Paquete: `pe.edu.pucp.hesperides.shared.catalog` (no vive bajo `modules/`: es infraestructura transversal, consumida por todos los módulos, tal como fija SPEC-000 §4 con `shared/catalog/`).
- Entidades JPA involucradas: `CatalogType`, `CatalogItem`.
- Repositorios necesarios: `CatalogTypesRepository`, `CatalogItemsRepository`.
- Servicio: `CatalogsService` / `CatalogsServiceImpl`.
- Controller: `CatalogsController`, ruta base: `/api/v1/catalogs`.

### 2.2 Módulo frontend (web)

- Ruta de administración: `/admin/catalogs` (Next.js App Router, dentro del grupo `(dashboard)`).
- Componentes nuevos a crear: `CatalogTypeList` (`app/(dashboard)/admin/catalogs/`), `CatalogItemTable`, `CatalogItemFormModal` (`components/forms/`).
- Componentes existentes a reutilizar: `DataTable`, `Modal`, `Toast`, `Select` (SPEC-C01).
- Hook(s) necesario(s): `useCatalog(typeCode)` para consumo en desplegables; `useCatalogAdmin(typeCode)` para la pantalla de administración (sin caché agresiva, siempre trae el estado real incluyendo inactivos).

### 2.3 Módulo móvil

- Pantalla: no hay pantalla de administración de catálogos en móvil (fase 2; la administración es tarea de escritorio).
- El operario de campo sí **consume** catálogos (p. ej. `INTERVENTION_TYPE` en un formulario de registro): usa el mismo endpoint `GET /api/v1/catalogs/{typeCode}/items` y el mismo contrato de caché que la web, implementado como hook de React Native equivalente (`useCatalog` en `mobile/src/hooks/`, misma firma).
- Diferencias con web: ninguna a nivel de contrato; la única diferencia es que móvil no expone gestión CRUD de catálogos.

### 2.4 Restricciones técnicas

- Librerías que DEBE usar: Spring Data JPA, Jakarta Bean Validation, React (`useState`/`useEffect` o el cliente de datos ya adoptado en `lib/api.ts`).
- Librerías que NO debe usar: ninguna librería de manejo de estado adicional (Redux, Zustand, React Query) solo para catálogos — el caché de `useCatalog` se implementa con el mecanismo descrito en §6, no delegado a una dependencia nueva no aprobada.
- Patrón de catálogos aplicable: este spec **es** el patrón. Aplica a los 17 `catalog_types` listados en la tabla de la sección 7, y a cualquier `catalog_type` futuro.

---

## 3. Las tablas (ya existentes — documentación, no redefinición)

Implementadas en `backend/src/main/resources/db/migration/V001__create_catalog_tables.sql`. Este spec no las modifica; las documenta como contrato para quien las consuma.

```sql
CREATE TABLE catalog_types (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE catalog_items (
    id BIGSERIAL PRIMARY KEY,
    catalog_type_id BIGINT NOT NULL REFERENCES catalog_types(id),
    code VARCHAR(50) NOT NULL,
    label VARCHAR(100) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    UNIQUE (catalog_type_id, code)
);

CREATE INDEX idx_catalog_types_code ON catalog_types(code);
CREATE INDEX idx_catalog_items_catalog_type_id ON catalog_items(catalog_type_id);
```

### 3.1 Significado de cada columna

**`catalog_types`** — el "tipo enumerado": agrupa un conjunto cerrado de opciones (ROLE, INCIDENT_STATUS, …).

| Columna | Significado |
|---|---|
| `code` | Identificador estable en mayúsculas y guion bajo (`INCIDENT_STATUS`). Es lo que el backend usa en código y lo que aparece en la URL del endpoint de consumo. **Nunca cambia** una vez publicado: cambiarlo rompe a todo consumidor. |
| `name` | Nombre legible del tipo, para la UI de administración ("Estados de incidencia"). |
| `description` | Ayuda contextual para el administrador que edita este catálogo. |
| `is_system` | **`TRUE` = protegido.** El tipo lo creó una migración fundacional porque el propio código del backend depende de sus `code` de ítems para tomar decisiones (ver §3.2). Un `catalog_type` con `is_system = TRUE` no puede eliminarse ni renombrarse (`code`) desde la UI de administración; sus ítems tampoco pueden eliminarse, aunque sí pueden agregarse ítems nuevos y editarse `label`/`sort_order`/`metadata` de los existentes. `FALSE` = el administrador tiene control total, incluyendo desactivar el tipo completo si ya no aplica al cliente. |
| `deleted_at` | Soft delete del tipo completo. Solo aplicable a tipos con `is_system = FALSE` (ver CA-04). |

**`catalog_items`** — cada opción concreta dentro de un tipo (`ADMIN` dentro de `ROLE`).

| Columna | Significado |
|---|---|
| `catalog_type_id` | A qué tipo pertenece. Es la FK que el patrón de validación de §5 protege. |
| `code` | Identificador estable dentro del tipo (`ADMIN`, `REPORTED`). Único por tipo (constraint `UNIQUE(catalog_type_id, code)`), no global: `ACTIVE` puede existir como ítem de `CONTRACT_STATUS` y de `EXECUTION_STATUS` sin colisión. El backend compara por `code`, nunca por `label`, cuando necesita tomar una decisión de negocio (ver §5.2). |
| `label` | Texto que ve el usuario final. Editable libremente incluso en ítems de sistema — es lo único que un cliente distinto a la PUCP normalmente querría cambiar ("Operario de campo" → "Jardinero", sin tocar el `code` del que depende la lógica). |
| `sort_order` | Orden de presentación en desplegables. No implica jerarquía de negocio. |
| `is_active` | Visibilidad para selección de **nuevos** registros. Ver regla completa en §7. |
| `metadata` | JSONB de atributos extra específicos del ítem, cuando un catálogo necesita más que `code`/`label`. Ejemplos de uso futuro: un `URGENCY_LEVEL` con `{"colorHex": "#DC2626", "slaHours": 4}` para que la UI pinte una insignia y el backend calcule un SLA sin agregar columnas nuevas a `catalog_items` por cada catálogo con necesidades distintas. Es un escape hatch deliberado (mismo principio que `species.attributes` en SPEC-002): un atributo que se vuelve consultable o filtrable con frecuencia se promueve a columna propia en una tabla dedicada, no se le construye lógica de consulta encima del JSONB. |
| `deleted_at` | Soft delete del ítem individual. |

### 3.2 Por qué existen `is_system` e `is_active` como conceptos distintos

Son dos ejes independientes:

- **`is_system`** protege la **estructura** (que el tipo y sus ítems de sistema existan con ese `code`) porque el backend tiene `if`/`switch` que compara contra esos códigos (p. ej., una transición de estado de intervención permitida solo si `status.code == "COMPLETED"`). Borrar o renombrar el código rompería el backend, no solo un reporte.
- **`is_active`** protege el **histórico** (que un ítem usado en el pasado siga siendo válido para lo ya registrado) sin permitir que se seleccione en registros nuevos. No tiene relación con si el backend depende de su `code`.

Un catálogo puede ser `is_system = FALSE` en su tipo y aun así tener una regla de negocio en el servicio que dependa de un `code` concreto de sus ítems (p. ej. `INTERVENTION_TYPE.PODA` podría disparar una validación de temporada en el futuro). `is_system` en el tipo no es garantía de que ningún ítem suyo importe al backend; es la señal de que **al menos uno** importa lo suficiente como para bloquear el borrado estructural completo. La tabla de la sección 7 indica, catálogo por catálogo, si hoy existe tal dependencia.

---

## 4. Contratos de API

Todos los endpoints usan el sobre `{ ok, message, data }` de SPEC-C02 y HTTP status explícito. Los de administración exigen rol `ADMIN` (catálogo `ROLE`, ver SPEC-001).

### GET /api/v1/catalogs/{typeCode}/items

**Descripción:** lista los ítems activos y vigentes de un tipo de catálogo, para poblar un desplegable. Es el único endpoint de este spec pensado para consumo general (cualquier usuario autenticado, no solo administradores).

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Query params:**
```
includeInactive: boolean (opcional, default false) — solo honrado si el usuario tiene rol ADMIN; en cualquier otro caso se ignora y se fuerza false.
```

**Response 200:**
```json
{
  "ok": true,
  "message": "Catalog items retrieved successfully",
  "data": [
    { "id": 12, "code": "REPORTED", "label": "Reportada", "sortOrder": 1, "metadata": null },
    { "id": 13, "code": "IN_REVIEW", "label": "En evaluación", "sortOrder": 2, "metadata": null }
  ]
}
```

Sin paginación: por diseño, un `catalog_type` es una lista corta (docenas de ítems como máximo) pensada para desplegables completos, no para tablas navegables. Si algún catálogo futuro creciera más allá de eso, deja de ser un catálogo configurable y pasa a ser una entidad de dominio con su propio spec.

**Response 404 (tipo inexistente):**
```json
{
  "ok": false,
  "message": "Catalog type not found",
  "data": null
}
```

### GET /api/v1/catalogs

**Descripción:** lista todos los `catalog_types` del sistema, para la pantalla de administración. Requiere rol `ADMIN`.

**Response 200:**
```json
{
  "ok": true,
  "message": "Catalog types retrieved successfully",
  "data": {
    "content": [
      { "id": 1, "code": "ROLE", "name": "Roles del sistema", "description": "Roles asignables a los usuarios", "isSystem": true, "itemCount": 3 }
    ],
    "page": { "number": 0, "size": 20, "totalElements": 17, "totalPages": 1 }
  }
}
```

Paginado según SPEC-C03 aun cuando hoy 17 filas caben en una sola página: es una lista administrativa que puede crecer al incorporar un nuevo cliente con sus propios catálogos.

### GET /api/v1/catalogs/{typeCode}

**Descripción:** detalle de un tipo, incluyendo **todos** sus ítems (activos e inactivos) para la pantalla de administración. Requiere rol `ADMIN`. Distinto del endpoint de consumo: este no filtra por `is_active`.

**Response 200:**
```json
{
  "ok": true,
  "message": "Catalog type retrieved successfully",
  "data": {
    "id": 16,
    "code": "INCIDENT_STATUS",
    "name": "Estados de incidencia",
    "description": "Flujo de atención de la incidencia",
    "isSystem": true,
    "items": [
      { "id": 40, "code": "REPORTED", "label": "Reportada", "sortOrder": 1, "isActive": true, "metadata": null, "createdAt": "2026-01-10T00:00:00Z", "updatedAt": "2026-01-10T00:00:00Z" }
    ]
  }
}
```

**Response 404:**
```json
{ "ok": false, "message": "Catalog type not found", "data": null }
```

### POST /api/v1/catalogs/{typeCode}/items

**Descripción:** crea un ítem nuevo dentro de un tipo existente. Requiere rol `ADMIN`. No crea tipos: los `catalog_types` se crean por migración (nuevo dominio funcional) o, si el proyecto decide habilitarlo, por un endpoint separado fuera del alcance de este spec inicial.

**Request body:**
```json
{
  "code": "string (requerido, máx 50 chars, patrón ^[A-Z][A-Z0-9_]*$, único dentro del tipo)",
  "label": "string (requerido, máx 100 chars)",
  "sortOrder": "integer (opcional, default 0)",
  "metadata": "object (opcional, JSON arbitrario)"
}
```

**Response 201:**
```json
{
  "ok": true,
  "message": "Catalog item created successfully",
  "data": { "id": 41, "code": "NEW_CODE", "label": "Nueva etiqueta", "sortOrder": 5, "isActive": true, "metadata": null }
}
```

**Response 400 (validación o código duplicado):**
```json
{
  "ok": false,
  "message": "Validation failed",
  "data": { "errors": [ { "field": "code", "message": "Ya existe un ítem con este código en el catálogo" } ] }
}
```

### PUT /api/v1/catalogs/{typeCode}/items/{itemId}

**Descripción:** edita `label`, `sortOrder` y `metadata` de un ítem. Requiere rol `ADMIN`. **`code` no es editable por este endpoint** en ítems de catálogos con `is_system = TRUE` (ver §3.2); en catálogos no-sistema, cambiar `code` está permitido pero se documenta como operación sensible porque puede desalinear lógica de negocio que ya lo referencie.

**Request body:**
```json
{
  "label": "string (requerido, máx 100 chars)",
  "sortOrder": "integer (opcional)",
  "metadata": "object (opcional, JSON arbitrario o null para limpiar)"
}
```

**Response 200:** igual forma que el `data` de creación, con valores actualizados.

**Response 404:**
```json
{ "ok": false, "message": "Catalog item not found", "data": null }
```

### PATCH /api/v1/catalogs/{typeCode}/items/{itemId}/deactivate

**Descripción:** desactiva un ítem (`is_active = false`). Es la operación de "borrado" normal de un ítem (ver §7 — nunca DELETE físico ni soft delete vía `deleted_at` mientras el ítem siga siendo históricamente válido). Requiere rol `ADMIN`.

**Response 200:**
```json
{
  "ok": true,
  "message": "Catalog item deactivated successfully",
  "data": { "id": 41, "code": "NEW_CODE", "isActive": false }
}
```

**Response 409 (ítem de sistema, tipo protegido para este código):**
```json
{
  "ok": false,
  "message": "This item is required by the system and cannot be deactivated",
  "data": null
}
```

Este 409 solo aplica a los ítems de sistema explícitamente protegidos (ver columna "Protegido" en la tabla de §7), no a todo ítem de un tipo `is_system = TRUE`: por ejemplo, dentro de `INCIDENT_STATUS` (tipo de sistema) sí se puede desactivar un estado agregado a futuro por el administrador, pero no los cuatro que sostienen el flujo `REPORTED → IN_REVIEW → IN_PROGRESS → RESOLVED`.

### PATCH /api/v1/catalogs/{typeCode}/items/{itemId}/activate

**Descripción:** reactiva un ítem previamente desactivado. Simétrico al anterior. Requiere rol `ADMIN`.

**Response 200:** misma forma, `isActive: true`.

### Envolturas comunes de error (401 / 403)

Igual que en el resto del sistema (SPEC-C02):

```json
{ "ok": false, "message": "Invalid or expired token", "data": null }
```
```json
{ "ok": false, "message": "Insufficient permissions for this action", "data": null }
```

---

## 5. Patrón de uso en backend

### 5.1 Cómo una entidad referencia un `CatalogItem`

Toda entidad que necesite un tipo, estado, prioridad o categoría lo hace con `@ManyToOne` hacia `CatalogItem`, nunca con un campo `@Enumerated`:

```java
@Entity
@Table(name = "incidents")
public class Incident {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ... otros campos ...

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "status_item_id", nullable = false)
    private CatalogItem status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "urgency_item_id", nullable = false)
    private CatalogItem urgency;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_type_item_id", nullable = false)
    private CatalogItem incidentType;
}
```

`FetchType.LAZY` siempre: un listado de incidencias no debe traer, por cada fila, el `CatalogItem` completo si el DTO de listado no lo necesita expandido.

### 5.2 El fallo clásico y cómo se resuelve

**El fallo:** `status_item_id` es una FK desnuda a `catalog_items(id)`. Nada en el esquema impide que apunte a un ítem del tipo `ROLE` en vez de `INCIDENT_STATUS` — la FK solo garantiza que la fila existe en `catalog_items`, no que pertenece al tipo correcto. Un bug de frontend que envíe el `id` equivocado, o un script de importación con datos mal mapeados, produce una incidencia con "estado" `ADMIN`.

**Por qué no se resuelve con una FK compuesta a nivel de base de datos:** requeriría que `catalog_items` tuviera una columna `catalog_type_code` denormalizada además de `catalog_type_id`, y que cada tabla consumidora (`incidents.status_item_id`, `incidents.status_item_id_type = 'INCIDENT_STATUS'`) llevara el tipo esperado como columna paralela para poder declarar `FOREIGN KEY (status_item_id, 'INCIDENT_STATUS') REFERENCES catalog_items(id, catalog_type_code)`. Es una solución real, pero infla cada tabla consumidora con una columna redundante y acopla el esquema de negocio al vocabulario de catálogos en cada FK. Este proyecto no lo adopta.

**La solución que sí adopta el proyecto — validación de pertenencia en la capa de servicio, en dos puntos:**

1. **Al recibir el DTO de entrada.** El `Service` de cada módulo consumidor (nunca el `Controller`: no es parseo, es regla de negocio) resuelve el `id` recibido contra `CatalogItemsRepository` exigiendo el `typeCode` esperado, no solo el `id`:

   ```java
   // CatalogsService — método compartido, vive en shared/catalog
   CatalogItem findByIdAndType(Long itemId, String expectedTypeCode) {
       CatalogItem item = catalogItemsRepository.findById(itemId)
           .orElseThrow(() -> new ResourceNotFoundException("Catalog item not found: " + itemId));

       if (!item.getCatalogType().getCode().equals(expectedTypeCode)) {
           throw new BusinessRuleException(
               "Item %d belongs to catalog '%s', expected '%s'"
                   .formatted(itemId, item.getCatalogType().getCode(), expectedTypeCode));
       }
       if (!item.isActive()) {
           throw new BusinessRuleException(
               "Item %d is inactive and cannot be assigned".formatted(itemId));
       }
       return item;
   }
   ```

   Cada servicio de módulo (`IncidentsServiceImpl`, `InterventionsServiceImpl`, …) llama a este método con la constante de tipo que le corresponde antes de persistir:

   ```java
   incident.setStatus(catalogsService.findByIdAndType(request.statusId(), "INCIDENT_STATUS"));
   incident.setUrgency(catalogsService.findByIdAndType(request.urgencyId(), "URGENCY_LEVEL"));
   ```

   Esto convierte el fallo clásico en un `BusinessRuleException` → 422 explícito, en vez de una fila corrupta silenciosa. Es Fail Fast aplicado al patrón de catálogos.

2. **Las constantes de `typeCode` no se repiten como strings sueltos.** Cada módulo consumidor declara sus tipos esperados como constantes en su propio `service`, para que un typo (`"INCIDENT_STATUS"` vs `"INCIDENT_STATUSS"`) sea un error de compilación de referencia, no un string mágico repetido:

   ```java
   public final class IncidentCatalogTypes {
       public static final String STATUS = "INCIDENT_STATUS";
       public static final String URGENCY = "URGENCY_LEVEL";
       public static final String TYPE = "INCIDENT_TYPE";
       private IncidentCatalogTypes() {}
   }
   ```

**Por qué la validación no vive en el `Controller`:** el controller solo valida forma (Bean Validation: que `statusId` sea un `Long` no nulo). Que ese `Long` pertenezca al catálogo correcto es una regla de negocio del dominio incidencias, y por la arquitectura por capas del proyecto (SPEC-000 §3) las reglas de negocio están en el `Service`, nunca en el `Controller`.

**Por qué no vive en el `Engine/Core`:** requiere una consulta a base de datos (`CatalogItemsRepository`), y el core es puro por definición (sin I/O). La validación de pertenencia es responsabilidad de servicio, no de lógica pura.

### 5.3 Tests que fijan este contrato

Ver sección 8. En particular, todo módulo consumidor de catálogos (`incidents`, `interventions`, `contracts`, `admin`) debe tener un test de servicio que pruebe exactamente el escenario "envío un `id` de un tipo de catálogo distinto" y verifique el `BusinessRuleException`.

---

## 6. Patrón de uso en frontend

### 6.1 Firma del hook `useCatalog`

```typescript
// frontend/src/hooks/useCatalog.ts

interface CatalogItemOption {
  id: number;
  code: string;
  label: string;
  sortOrder: number;
  metadata: Record<string, unknown> | null;
}

interface UseCatalogResult {
  items: CatalogItemOption[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

function useCatalog(typeCode: string): UseCatalogResult;
```

Uso típico en un `<Select>` (SPEC-C01):

```tsx
const { items, isLoading, error } = useCatalog("INCIDENT_STATUS");

<Select
  label="Estado"
  options={items.map(i => ({ value: i.code, label: i.label }))}
  loading={isLoading}
  error={error}
/>
```

El componente compara y envía `code` (no `id`) cuando el flujo lo permite en el nivel de UI, coherente con INV-04 de SPEC-002 (el frontend muestra `label`, compara por `code`); el `id` numérico se resuelve al armar el payload final hacia el backend, que es quien exige el `id`.

### 6.2 Comportamiento de caché

Objetivo explícito: **un mismo `typeCode` solicitado por N componentes montados a la vez, o remontados entre navegaciones dentro de la misma sesión, dispara como máximo una petición de red**, no una por render ni una por instancia de componente.

- El caché es un módulo singleton en memoria (`Map<string, CatalogCacheEntry>`), no estado de React — así sobrevive a que un componente se desmonte y otro distinto pida el mismo `typeCode` un segundo después.
- Cada entrada de caché guarda `{ items, fetchedAt, promise }`. Mientras `promise` está pendiente, una segunda llamada a `useCatalog` con el mismo `typeCode` se adjunta a la misma promesa en lugar de lanzar una petición nueva (deduplicación de peticiones concurrentes, no solo de resultados).
- **TTL: 5 minutos** desde `fetchedAt`. Pasado el TTL, la siguiente llamada a `useCatalog` dispara una revalidación en segundo plano: devuelve de inmediato el valor cacheado (sin parpadeo de loading) y reemplaza el caché cuando la respuesta nueva llega. Un catálogo cambia con poca frecuencia (un administrador edita ítems, no cada minuto); 5 minutos evita pedir el mismo `INTERVENTION_TYPE` en cada formulario sin dejar la UI desactualizada por horas.
- `refetch()` fuerza una recarga inmediata ignorando el TTL — lo usa la pantalla de administración de catálogos después de crear/editar/(des)activar un ítem, para que el propio panel de administración no muestre datos obsoletos tras su propia escritura.
- El caché se **invalida por `typeCode`**, no globalmente: guardar un ítem de `INCIDENT_STATUS` no fuerza refetch de `ROLE`.
- Los ítems inactivos **nunca** entran al caché de `useCatalog` (el hook de consumo llama al endpoint sin `includeInactive`): el desplegable de un formulario de creación jamás ofrece una opción retirada, sin necesidad de filtrar en el cliente.
- Persistencia: solo en memoria del proceso de la pestaña/app (no `localStorage`). Un refresh de página vuelve a pedir una vez; es aceptable porque el costo es una sola petición por sesión de pestaña, y evita servir catálogos obsoletos tras un despliegue o una edición hecha desde otra pestaña.

### 6.3 Diferencia con `useCatalogAdmin`

`useCatalog` es de solo lectura y cacheado, pensado para desplegables. La pantalla de administración (`/admin/catalogs`) usa un hook separado, `useCatalogAdmin(typeCode)`, que **no** cachea (siempre pide datos frescos al montar, incluye inactivos) porque su propósito es exactamente ver y modificar el estado real, no optimizar renders de un `<Select>`. No se sobrecarga `useCatalog` con un flag `includeInactive` para no mezclar dos contratos de caché incompatibles en un mismo hook.

---

## 7. Reglas de negocio

### 7.1 `is_active` en vez de borrar

Un `catalog_item` **nunca** se borra físicamente y, salvo el caso límite de un ítem creado por error y jamás usado (§7.3), tampoco se le pone `deleted_at`. La operación normal de "quitar una opción" es `PATCH .../deactivate`, que solo cambia `is_active` a `false`. Motivo: `incidents.status_item_id`, `interventions.intervention_type_item_id`, y cualquier otra FK histórica hacia `catalog_items(id)` seguiría resolviendo, pero un registro antiguo que apunta a un ítem borrado se rompe (la fila referenciada no existe) o, peor, con soft delete vía `deleted_at` mal aplicado a nivel de consulta, desaparece de vistas que hacen `JOIN` con filtro `deleted_at IS NULL` sobre `catalog_items`. El histórico de una incidencia resuelta hace tres meses con un tipo de intervención que hoy ya no se ofrece debe seguir mostrando fielmente qué tipo se usó entonces.

**Qué pasa exactamente al desactivar un ítem referenciado:**

- Los registros existentes que ya apuntan a ese `id` **no cambian**: siguen resolviendo el mismo `code`/`label` al leerse, sin ningún efecto visible en el histórico.
- El ítem **desaparece de `GET /api/v1/catalogs/{typeCode}/items`** (el endpoint de consumo para desplegables), por lo que ya no puede seleccionarse en un registro **nuevo**.
- El ítem **sigue apareciendo en `GET /api/v1/catalogs/{typeCode}`** (el endpoint de administración, que no filtra por `is_active`), marcado `isActive: false`, para que el administrador pueda reactivarlo si se equivocó.
- Cualquier intento de asignar ese `id` a un registro nuevo falla con `BusinessRuleException` en la validación de §5.2 (`is_active` es parte de esa misma verificación), no solo por ausencia en el desplegable — la regla se hace cumplir en el servidor, no solo ocultando la opción en la UI.

### 7.2 Qué protege `is_system`

`is_system = TRUE` en un `catalog_type` bloquea, desde la API de administración:

- Eliminar el tipo completo (no hay endpoint de borrado de tipo en este spec; aun si existiera, un tipo de sistema lo rechazaría con 409).
- Cambiar el `code` del tipo.
- Eliminar (soft-delete) los ítems marcados como protegidos dentro de ese tipo (ver `PATCH .../deactivate`, respuesta 409 en §4). No todo ítem de un tipo de sistema está protegido individualmente — solo aquellos de los que depende una decisión de negocio en el backend; la tabla de §8 lo señala catálogo por catálogo.

`is_system = TRUE` **no** bloquea agregar ítems nuevos a ese tipo, ni editar `label`, `sortOrder` o `metadata` de sus ítems existentes (protegidos o no). Un cliente distinto a la PUCP puede necesitar un quinto estado de incidencia sin que eso implique rehacer el tipo.

### 7.3 Borrado físico — el único caso permitido

Un ítem puede eliminarse (borrado físico, sin dejar rastro) únicamente cuando **nunca ha sido referenciado por ninguna fila fuera de `catalog_items`** — típicamente, un ítem creado por error y corregido en el mismo acto administrativo. Este spec no expone un endpoint `DELETE` para ítems: la vía es desactivarlo (§7.1). Si el proyecto decide en el futuro ofrecer un borrado físico explícito para este caso límite, ese endpoint debe verificar la ausencia de referencias en tiempo de ejecución antes de ejecutar el `DELETE`, y queda fuera del alcance de este spec fundacional.

---

## 8. Catálogos del sistema

Fuente: `catalog_types` sembrados por `V001__create_catalog_tables.sql` (SPEC-003, `ROLE`) y `V010__seed_catalogs.sql` (SPEC-002, el resto). Esta tabla es el inventario completo — cualquier `catalog_type` nuevo que un spec de feature necesite se agrega aquí como actualización de este documento, no se inventa suelto en el spec de la feature.

| Code | Para qué sirve | Quién lo consume | `is_system` | Ítems protegidos | Valores |
|---|---|---|---|---|---|
| `ROLE` | Rol del usuario en el sistema | `users.role_item_id` (SPEC-001) | TRUE | `ADMIN`, `COORDINADOR`, `SUPERVISOR`, `OPERARIO` | **Definido**: Administrador, Coordinador, Supervisor de cuadrilla, Operario de campo (`USER` genérico de V001 queda desactivado) |
| `ZONE_TYPE` | Nivel de la jerarquía de zonificación (sector, subsector, jardín…) | `zones.zone_type_item_id` | FALSE | — | **Pendiente del cliente** |
| `SPECIES_TYPE` | Porte/clasificación de la especie (árbol, arbusto, herbácea, césped…) | `species.species_type_item_id` | FALSE | — | **Pendiente del cliente** |
| `SPECIES_ORIGIN` | Procedencia de la especie (nativa, introducida…) | `species.origin_item_id` | FALSE | — | **Pendiente del cliente** |
| `GREEN_ELEMENT_TYPE` | Clase de elemento del catastro (árbol, jardín, césped, campo deportivo) | `green_elements.element_type_item_id` | FALSE | — | **Definido** (derivado del alcance del catastro): Árbol, Jardín, Césped, Campo deportivo |
| `ELEMENT_CONDITION` | Estado de conservación/fitosanitario de un elemento verde | `green_elements.condition_item_id` | FALSE | — | **Pendiente del cliente** |
| `INTERVENTION_TYPE` | Trabajo ejecutable sobre un elemento (poda, control fitosanitario…) | `interventions.intervention_type_item_id` | FALSE | — | **Definido**: Poda, Control fitosanitario, Corte de césped, Resiembra, Decoración, Remoción de terreno |
| `INTERVENTION_STATUS` | Ciclo de vida de una intervención | `interventions.status_item_id` | TRUE | `ASSIGNED`, `IN_PROGRESS`, `COMPLETED`, `VALIDATED` (el flujo de asignación → ejecución → validación que el servicio de intervenciones controla por `code`) | **Definido** (derivado del flujo descrito en SPEC-002): Asignada, En ejecución, Ejecutada, Validada, Observada, Cancelada |
| `EVIDENCE_MOMENT` | Momento de captura de una foto de evidencia | `intervention_evidences.moment_item_id` | TRUE | `BEFORE`, `AFTER` | **Definido**: Antes, Después |
| `SUPPLY_TYPE` | Clasificación de un insumo | `supplies.supply_type_item_id` | FALSE | — | **Pendiente del cliente** |
| `MEASUREMENT_UNIT` | Unidad de medida de cantidades de insumo | `supplies.unit_item_id` | FALSE | — | **Pendiente del cliente** |
| `SERVICE_TYPE` | Tipo de servicio contratable a terceros | `contracts.service_type_item_id` | FALSE | — | **Pendiente del cliente** |
| `CONTRACT_STATUS` | Ciclo de vida de un contrato | `contracts.status_item_id` | TRUE | `DRAFT`, `ACTIVE`, `EXPIRED`, `TERMINATED` | **Definido** (derivado del ciclo de vida estándar de un contrato): Borrador, Vigente, Vencido, Resuelto |
| `EXECUTION_STATUS` | Resultado de una visita/ejecución de un proveedor | `contract_executions.status_item_id` | TRUE | `PLANNED`, `EXECUTED`, `MISSED`, `OBSERVED` | **Definido**: Planificada, Ejecutada, No ejecutada, Observada |
| `FREQUENCY` | Periodicidad pactada o de mantenimiento | `contracts.agreed_frequency_item_id` | FALSE | — | **Pendiente del cliente** |
| `INCIDENT_TYPE` | Naturaleza de la incidencia reportada | `incidents.incident_type_item_id` | FALSE | — | **Pendiente del cliente** |
| `INCIDENT_STATUS` | Flujo de atención de una incidencia | `incidents.status_item_id` | TRUE | `REPORTED`, `IN_REVIEW`, `IN_PROGRESS`, `RESOLVED` (el flujo que controla `incident_status_history`) | **Definido**: Reportada, En evaluación, En atención, Resuelta |
| `URGENCY_LEVEL` | Prioridad de atención de una incidencia | `incidents.urgency_item_id` | TRUE | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` (ordenan escalamiento/SLA futuro) | **Definido**: Baja, Media, Alta, Crítica |

**Nota sobre `INTERVENTION_STATUS`, `CONTRACT_STATUS`, `EXECUTION_STATUS`, `EVIDENCE_MOMENT` y `URGENCY_LEVEL` marcados como "Definido" pero `is_system = TRUE`:** estos cinco no vinieron de una entrega del cliente; SPEC-002 los derivó del flujo de negocio ya descrito en los documentos base (ciclo asignación-ejecución-validación, ciclo de vida estándar de un contrato). Se marcan de sistema porque el backend ya depende de esos `code` para lógica de transición de estado, no porque el cliente los haya confirmado carácter por carácter. Si el cliente entrega una nomenclatura distinta para estos flujos, el `label` se ajusta libremente (§7.2); el `code` solo cambiaría con una migración correctiva que también actualice las referencias en código.

**Los nueve catálogos "Pendiente del cliente"** (`ZONE_TYPE`, `SPECIES_TYPE`, `SPECIES_ORIGIN`, `ELEMENT_CONDITION`, `SUPPLY_TYPE`, `MEASUREMENT_UNIT`, `SERVICE_TYPE`, `FREQUENCY`, `INCIDENT_TYPE`) existen como fila en `catalog_types` (para que las FK sean válidas y la UI de administración los liste), pero **sin ningún `catalog_item`**. No se inventa contenido de relleno: el administrador los completa desde `/admin/catalogs` en cuanto el cliente entregue las listas oficiales (SPEC-002 §4.9).

---

## 9. Comportamiento esperado

### 9.1 Flujo principal (Happy Path) — consumo en un formulario

1. Un operario abre el formulario de registro de incidencia.
2. El campo "Tipo de incidencia" monta `useCatalog("INCIDENT_TYPE")`. Si el caché tiene una entrada vigente (<5 min), el desplegable se llena de inmediato sin spinner.
3. Si no hay caché vigente, se muestra el estado de carga del `<Select>` y se dispara `GET /api/v1/catalogs/INCIDENT_TYPE/items`.
4. El operario selecciona una opción por su `label`; el formulario retiene el `id` numérico correspondiente.
5. Al enviar, el backend valida con `findByIdAndType(id, "INCIDENT_TYPE")` antes de persistir.

### 9.2 Flujo principal — administración de un catálogo

1. Un administrador entra a `/admin/catalogs`, ve la lista paginada de tipos.
2. Abre `INCIDENT_STATUS`, ve sus 4 ítems, todos activos, los 4 marcados como protegidos (no ofrecen botón de desactivar).
3. Agrega un ítem nuevo `ESCALATED` / "Escalada". Se crea `is_active = true`.
4. Ese mismo ítem aparece, desde ese momento, en el `useCatalog("INCIDENT_STATUS")` de cualquier formulario (tras el TTL o un `refetch`).

### 9.3 Flujos alternativos

- **El cliente envía un `id` de catálogo con `typeCode` incorrecto:** el servicio responde 422 (`BusinessRuleException`) con mensaje explícito de qué tipo se esperaba, nunca persiste la fila incorrecta.
- **Se intenta desactivar un ítem protegido:** 409, mensaje "This item is required by the system and cannot be deactivated", el frontend no muestra el botón de desactivar para esos ítems en primer lugar (defensa en profundidad: UI oculta la acción, backend la rechaza igual si llega por otra vía).
- **Se solicita `GET /api/v1/catalogs/{typeCode}/items` con un `typeCode` que no existe:** 404, `data: null`. El frontend interpreta esto como catálogo mal configurado (error de desarrollo, no de usuario) y lo reporta a consola/observabilidad, no como un desplegable vacío silencioso.
- **Se intenta crear un ítem con `code` duplicado dentro del mismo tipo:** 400 con el detalle de campo (`UNIQUE(catalog_type_id, code)` en base de datos es el respaldo final; el servicio valida antes para dar un mensaje claro).
- **Sesión expira mientras se edita un catálogo:** 401 → redirección a login (SPEC-C02), sin perder el borrador de edición local en el store del formulario si el componente ya lo maneja así.

### 9.4 Casos límite (Edge Cases)

- **Catálogo sin ítems activos** (uno de los nueve pendientes): `GET .../items` responde `data: []`, no error. El `<Select>` se renderiza vacío con estado "Sin opciones disponibles" en vez de fallar.
- **`metadata` con estructura inconsistente entre ítems del mismo tipo:** el backend no valida el esquema interno de `metadata` (es JSON arbitrario por diseño); es responsabilidad del consumidor específico tolerar ausencia de una clave esperada.
- **Doble clic en "Guardar" al crear un ítem:** el formulario deshabilita el botón de envío mientras la petición está en curso (patrón estándar SPEC-C01); si aun así llegan dos `POST` casi simultáneos con el mismo `code`, el segundo falla por el `UNIQUE` de base de datos con 400, no crea un duplicado.
- **Dos administradores editan el mismo `catalog_item` a la vez:** última escritura gana (no hay bloqueo optimista en este spec); el `updatedAt` en la respuesta permite a la UI detectar y avisar si se implementa control de concurrencia en una iteración futura, pero no es requisito de este spec.
- **Un `typeCode` en la URL con minúsculas o espacios:** el backend normaliza a mayúsculas antes de buscar, o responde 404 si no matchea tras normalizar; nunca hace un `LIKE` parcial.

---

## 10. Criterios de aceptación (verificables por cualquiera)

| # | Criterio | Método de verificación |
|---|----------|----------------------|
| CA-01 | `GET /api/v1/catalogs/INCIDENT_STATUS/items` devuelve exactamente 4 ítems activos (Reportada, En evaluación, En atención, Resuelta) en ese orden. | Llamar el endpoint con un token válido y revisar el array `data`: 4 elementos, `sortOrder` 1-4, sin campos `isActive: false`. |
| CA-02 | Un catálogo "pendiente del cliente" (p. ej. `ZONE_TYPE`) devuelve una lista vacía, no un error. | Llamar `GET /api/v1/catalogs/ZONE_TYPE/items`: respuesta 200, `data: []`. |
| CA-03 | Intentar desactivar un ítem protegido de `INCIDENT_STATUS` (p. ej. `REPORTED`) es rechazado. | Llamar `PATCH /api/v1/catalogs/INCIDENT_STATUS/items/{id}/deactivate` sobre el ítem `REPORTED`: respuesta 409 con el mensaje de ítem requerido por el sistema; el ítem sigue `isActive: true` en una consulta posterior. |
| CA-04 | Desactivar un ítem no protegido lo saca del endpoint de consumo pero lo conserva en el de administración. | Crear un ítem nuevo en un catálogo no-sistema, desactivarlo, verificar que desaparece de `GET .../items` (consumo) y sigue apareciendo con `isActive: false` en `GET /api/v1/catalogs/{typeCode}` (administración). |
| CA-05 | Asignar a una entidad un `id` de catálogo que pertenece a otro tipo es rechazado antes de persistir. | Intentar crear/editar una incidencia enviando como `statusId` el `id` de un ítem de `ROLE`: la operación responde error (422/400 según implementación) y la incidencia no queda creada con ese estado — verificar que no aparece en un listado posterior con ese `statusId`. |
| CA-06 | Un mismo desplegable montado varias veces en la misma sesión no repite la petición de red dentro del TTL. | Con las herramientas de red del navegador abiertas, navegar a dos pantallas distintas que usan `useCatalog("INTERVENTION_TYPE")` dentro de una ventana de menos de 5 minutos: solo la primera navegación muestra la petición `GET /api/v1/catalogs/INTERVENTION_TYPE/items`. |
| CA-07 | Ningún `catalog_type` de los nueve pendientes tiene ítems sembrados. | Consultar (o pedir a alguien con acceso a BD que consulte) `SELECT COUNT(*) FROM catalog_items ci JOIN catalog_types ct ON ci.catalog_type_id = ct.id WHERE ct.code IN ('ZONE_TYPE','SPECIES_TYPE','SPECIES_ORIGIN','ELEMENT_CONDITION','SUPPLY_TYPE','MEASUREMENT_UNIT','SERVICE_TYPE','FREQUENCY','INCIDENT_TYPE')`: el resultado es 0. |

---

## 11. Especificación visual

### 11.1 Web (Next.js)

- Responsive breakpoints: móvil (<640px), tablet (640-1024px), desktop (>1024px).
- Layout de `/admin/catalogs`: lista de tipos a la izquierda (o superior en móvil) con buscador simple, detalle del tipo seleccionado a la derecha (o debajo) con su tabla de ítems (`DataTable` de SPEC-C01).
- Estados de componentes: fila de ítem protegido muestra un ícono de candado y el botón de desactivar deshabilitado con tooltip ("Ítem requerido por el sistema"); fila de ítem inactivo se muestra atenuada (opacidad reducida) con badge "Inactivo".
- Feedback visual: `LoadingSkeleton` mientras carga la lista de ítems; `Toast` de éxito al crear/editar/(des)activar; `Toast` de error con el `message` del sobre `{ok,message,data}` cuando la operación falla.

### 11.2 Móvil (React Native)

- No hay pantalla de administración de catálogos en móvil (fuera de alcance, ver §2.3).
- Los desplegables que consumen `useCatalog` en formularios móviles (p. ej. tipo de intervención en un registro de campo) usan el mismo componente `Select` adaptado a RN de SPEC-C01, con el mismo comportamiento de caché descrito en §6.2 detrás de un hook equivalente.
- Gestos: los propios del componente `Select` nativo (tap para abrir, scroll para elegir); no hay gestos adicionales específicos de catálogos.

### 11.3 Referencia visual

No hay mockup de Figma para este spec fundacional; la pantalla de administración de catálogos se maqueta con los componentes base de SPEC-C01 sin diseño visual dedicado.

---

## 12. Tests que la IA debe generar

### 12.1 Tests unitarios (backend — JUnit 5 + Mockito)

```
- CatalogsService.findByIdAndType() con id existente y typeCode correcto → retorna el CatalogItem
- CatalogsService.findByIdAndType() con id existente pero typeCode distinto al del ítem → lanza BusinessRuleException
- CatalogsService.findByIdAndType() con id inexistente → lanza ResourceNotFoundException
- CatalogsService.findByIdAndType() con ítem existente pero is_active = false → lanza BusinessRuleException
- CatalogsService.createItem() con code duplicado dentro del mismo tipo → lanza DuplicateResourceException
- CatalogsService.createItem() con code que no matchea el patrón ^[A-Z][A-Z0-9_]*$ → falla validación
- CatalogsService.deactivateItem() sobre un ítem marcado como protegido → lanza BusinessRuleException
- CatalogsService.deactivateItem() sobre un ítem no protegido → is_active pasa a false, no se ejecuta DELETE
- CatalogsService.activateItem() sobre un ítem previamente desactivado → is_active vuelve a true
- CatalogsService.getItemsByType() sobre un tipo sin ítems (pendiente del cliente) → retorna lista vacía, no lanza excepción
- CatalogsService.getItemsByType() con typeCode inexistente → lanza ResourceNotFoundException
```

### 12.2 Tests de integración (backend — @WebMvcTest o @SpringBootTest)

```
- GET /api/v1/catalogs/INCIDENT_STATUS/items → 200 + 4 ítems activos en el orden de sort_order
- GET /api/v1/catalogs/{typeCode}/items con typeCode inexistente → 404
- GET /api/v1/catalogs/{typeCode}/items sin token → 401
- GET /api/v1/catalogs (listado de tipos) sin rol ADMIN → 403
- GET /api/v1/catalogs/{typeCode} (detalle admin) con rol ADMIN → 200 + items incluye activos e inactivos
- POST /api/v1/catalogs/{typeCode}/items con body válido y rol ADMIN → 201 + item creado
- POST /api/v1/catalogs/{typeCode}/items con code duplicado → 400 + error de campo detallado
- POST /api/v1/catalogs/{typeCode}/items sin rol ADMIN → 403
- PUT /api/v1/catalogs/{typeCode}/items/{id} con label nuevo → 200 + label actualizado
- PATCH /api/v1/catalogs/{typeCode}/items/{id}/deactivate sobre ítem protegido → 409
- PATCH /api/v1/catalogs/{typeCode}/items/{id}/deactivate sobre ítem no protegido → 200 + isActive false
- PATCH /api/v1/catalogs/{typeCode}/items/{id}/activate sobre ítem inactivo → 200 + isActive true
- Un módulo consumidor (ej. incidents): POST /api/v1/incidents con statusId de un ítem de tipo ROLE → 422/400, incidencia no persistida
```

### 12.3 Tests frontend (Jest + React Testing Library)

```
- useCatalog("X") en el primer render dispara exactamente una petición GET
- useCatalog("X") montado en dos componentes simultáneos dispara una sola petición (deduplicación)
- useCatalog("X") remontado dentro del TTL no dispara una petición nueva y devuelve el valor cacheado
- useCatalog("X") remontado después del TTL dispara revalidación en segundo plano sin mostrar loading si ya había datos cacheados
- useCatalog("X") ante error de red expone `error` no nulo y `items` como arreglo vacío
- refetch() ignora el TTL y fuerza una petición nueva
- CatalogItemFormModal envía POST con datos válidos → llama a la API y cierra el modal en éxito
- CatalogItemFormModal con code inválido (minúsculas) → muestra validación inline, no envía petición
- CatalogItemTable no renderiza botón de desactivar para ítems marcados como protegidos
```

### 12.4 Tests E2E (si aplica)

```
- Un administrador entra a /admin/catalogs, abre INCIDENT_STATUS, agrega un ítem nuevo, y ese ítem aparece
  poco después (tras refetch) en el desplegable de estado del formulario de registro de incidencias.
```

---

## 13. Propio de este spec

Lo general está en [`REGLAS.md` §0](../REGLAS.md). Propio de los catálogos:

- **Autorización:** `GET /api/v1/catalogs/{typeCode}/items` exige solo sesión válida; todo lo
  demás (escritura, listado de administración) exige `ADMIN`.
- **Sin datos sensibles:** los catálogos son configuración de dominio. Si un catálogo futuro
  guardara algo sensible en `metadata`, hay que revisarlo caso por caso; hoy ninguno lo hace.
- **`typeCode` se compara por igualdad exacta** contra columna indexada, nunca interpolado en
  JPQL nativo.
- **XSS:** `label`, `name` y `description` son texto libre editado por un administrador. Se
  escapan en el render igual que cualquier texto de usuario: "solo lo edita un admin" no es
  razón para omitir el escape.
- **Punto de extensión:** el `label` de cada ítem ya es el mecanismo de externalización de
  texto de dominio.

**Checklist propio** (el común está en [`REGLAS.md` §6](../REGLAS.md)):

- [ ] Ningún módulo consumidor declaró un `@Enumerated` ni una constante de tipo/estado propia
      fuera de `catalog_items`.
- [ ] Todo `@ManyToOne` a `CatalogItem` pasa por `CatalogsService.findByIdAndType()` con el
      `typeCode` correcto de la sección 8 antes de persistir.
- [ ] Los nueve catálogos pendientes no tienen ningún `INSERT` de ítems de ejemplo.
- [ ] El paquete es `shared.catalog`, no `modules.catalog`.
- [ ] Desactivación en vez de borrado, salvo el caso límite de §7.3.

