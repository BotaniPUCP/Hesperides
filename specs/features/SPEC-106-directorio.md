# SPEC-106 — Directorio de organizaciones y contactos

| Campo | Valor |
|-------|-------|
| HU relacionada | REQ 4.2 (datos básicos del proveedor) · habilitador de REQ 1.12 (préstamos) y de incidencias |
| Autor | Jean Piero David Morán |
| Plataforma | Web |
| Sprint | Por asignar |
| Dependencias | SPEC-001 Anexo A, SPEC-003, SPEC-004, SPEC-C01, SPEC-C02, SPEC-C03 |

> **Lectura obligatoria:** `specs/REGLAS.md`.
> **Específico de este spec:** SPEC-001 Anexo A (filas nuevas en §9.1), SPEC-004 §3.2 (acciones
> auditables nuevas en §9.2), SPEC-003 (un tipo de catálogo de sistema).

---

## 1. Objetivo

Que toda organización (unidad PUCP o empresa externa) y toda persona de contacto se registre
**una sola vez** y se **elija de una lista** en los formularios de préstamo de jardines,
incidencias e intervenciones tercerizadas, en lugar de escribir su nombre a mano.

## 2. Contexto

**Por qué existe.** Hoy la misma idea vive en cuatro sitios que no se hablan: el catálogo
`RESERVATION_OWNER` (solo «DAF» o «Unidades»), el catálogo `INCIDENT_COMPANY` (38 nombres, sin
RUC ni teléfono), el REQ 4.2 sin construir y el calendario de reservas de la OSG, con **113
variantes de texto libre** para las unidades («EEGGCC» y «Estudios Generales Ciencias»;
«OIE-FEPUC» y «OIE - FEPUCP»). Los datos que el Directorio pide salen del análisis de esos
archivos (§2.6).

**Quién lo usa.** Las organizaciones no tienen cuenta en el sistema. Coordinador y administrador
mantienen el Directorio y pueden registrar ahí mismo, desde un formulario, lo que falte. El
capataz **solo ejecuta**: ve, busca y elige, pero no registra organizaciones ni contactos
(decisión del usuario).

### 2.1 Backend

- Paquete: `pe.edu.pucp.hesperides.modules.directory`
- Entidades: `Organization`, `OrganizationAlias`, `Contact`, `ContactOrganization` (este spec)
- Servicios: `OrganizationService`, `ContactService`
- Controllers: `OrganizationController` → `/api/v1/directory/organizations`,
  `ContactController` → `/api/v1/directory/contacts`
- Engine: `engine/directory/` con las reglas puras de RUC y teléfonos (§5.4)

### 2.2 Frontend web

- Rutas: `/directorio` (lista de organizaciones), `/directorio/[code]` (ficha con sus contactos)
- Componentes reutilizables por otros módulos: `OrganizationPicker` y `ContactPicker`, ambos con
  **alta en el mismo formulario** para ADMIN y COORDINADOR (§5.2)
- Reutilizados de SPEC-C01: `PageFrame`, `PageHeader`, tarjetas, tabla, diálogos y el aviso de
  cambios sin guardar
- Entrada «Directorio» en el menú para ADMIN, COORDINADOR y SUPERVISOR

### 2.3 Móvil

Fuera de alcance: los formularios que lo consumen todavía son web.

### 2.4 Restricciones técnicas

- Catálogos aplicables: `ORGANIZATION_TYPE` (nuevo, de sistema: `PUCP_UNIT`, `EXTERNAL_COMPANY`).
  Es de sistema porque el código se comporta distinto según el tipo (el RUC solo existe para
  empresas).
- La búsqueda por nombre y alias ignora tildes y mayúsculas con `unaccent(lower(...))`, como
  `PlaceQueries`.

### 2.5 Decisiones propias de este spec

| Decisión | Por qué | Alternativa descartada |
|---|---|---|
| Organización y contacto son **tablas**, no catálogos | Tienen datos propios (RUC, teléfonos, personas a cargo); un `catalog_item` es una lista fija que solo administra el ADMIN | Ampliar `INCIDENT_COMPANY` |
| **Directorio plano, sin organización padre** | Lo que la jerarquía resolvía (la OIE pide un jardín para un centro federado) es un dato **del pedido**, no de la organización: préstamos e incidencias guardan «Pedido de» y «Para» (decisión del usuario, §9.4). «OIE» y «CF Psicología» son dos organizaciones independientes | Padre de un solo nivel con nombre «<padre> - <nombre>» (versión anterior de este spec) |
| **Un contacto pertenece a varias organizaciones** | Una misma persona puede tramitar para más de una unidad; registrarla una vez evita duplicarla | Un contacto por organización |
| **Solo coordinador y administrador registran, vinculan, editan y dan de baja; el capataz solo ve y busca** | Decisión del usuario: el capataz ejecuta y usa los registros básicos, no los mantiene. Así el Directorio lo cuida un solo equipo | Que el capataz también registre (versión anterior) |
| **Antes de crear se muestran los parecidos** | Sin aviso, «EEGGCC» terminaría al lado de «Estudios Generales Ciencias». La variante se guarda como alias | Unicidad estricta sin sugerencias |
| **No se guarda el código de alumno** | El calendario lo trae mezclado en la columna de teléfono; no sirve para ubicar a nadie y es un dato personal más que proteger | Columna `student_code` |
| **Los contactos de la carga inicial no entran por migración** (§4.2) | Nombres y teléfonos son datos personales; una migración los dejaría para siempre en el historial de Git | Semilla en SQL |

### 2.6 De dónde salen los datos

| Hallazgo en los archivos de la OSG | Consecuencia en el diseño |
|---|---|
| Solo 95 de 682 préstamos traen teléfono | Todos los medios de contacto son opcionales |
| 35 anexos de 4 dígitos y 56 celulares de 9 | Anexo y celular son campos separados, cada uno con su formato |
| Ningún correo, pero 549 préstamos llegaron por correo | Correo opcional |
| Dos personas en una celda («Xiomara Torres / Isai Marcos») | Son dos contactos; un préstamo podrá tener más de uno (lo define su spec) |
| La lista de empresas de la matriz incluye personas naturales («Mary Chalco») | Una empresa externa puede tener RUC 10 (persona natural) o 20 (persona jurídica) |
| La matriz de incidencias guarda «Reportado por: Manuel Martínez» | La incidencia elegirá un contacto en vez de escribir el nombre |

## 3. Contratos de API

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /api/v1/directory/organizations?q=&typeCode=&page=` | ADMIN, COORDINADOR, SUPERVISOR | Lista paginada; `q` busca en nombre y alias |
| `GET /api/v1/directory/organizations/similar?name=` | ADMIN, COORDINADOR | Hasta 5 organizaciones vigentes parecidas al nombre, antes de crear |
| `GET /api/v1/directory/organizations/{code}` | ADMIN, COORDINADOR, SUPERVISOR | Ficha con alias y contactos |
| `POST /api/v1/directory/organizations` | ADMIN, COORDINADOR | Crea |
| `PUT /api/v1/directory/organizations/{code}` | ADMIN, COORDINADOR | Edita |
| `DELETE /api/v1/directory/organizations/{code}` | ADMIN, COORDINADOR | Baja lógica |
| `GET /api/v1/directory/contacts?q=&organizationCode=&page=` | ADMIN, COORDINADOR, SUPERVISOR | Lista paginada; `organizationCode` es lo que usa `ContactPicker` |
| `GET /api/v1/directory/contacts/similar?fullName=` | ADMIN, COORDINADOR | Hasta 5 contactos vigentes de nombre parecido, de cualquier organización, antes de crear |
| `GET /api/v1/directory/contacts/{code}` | ADMIN, COORDINADOR, SUPERVISOR | Ficha |
| `POST /api/v1/directory/contacts` | ADMIN, COORDINADOR | Crea, vinculado a una o más organizaciones |
| `POST /api/v1/directory/contacts/{code}/organizations` | ADMIN, COORDINADOR | Vincula un contacto existente a una organización más; no toca sus datos ni sus otros vínculos |
| `PUT /api/v1/directory/contacts/{code}` | ADMIN, COORDINADOR | Edita, incluidas sus organizaciones |
| `DELETE /api/v1/directory/contacts/{code}` | ADMIN, COORDINADOR | Baja lógica |

**Crear organización** (`POST`):

```json
{
  "name": "CF Psicología",
  "typeCode": "PUCP_UNIT",
  "ruc": null,
  "phone": null,
  "aliases": ["Centro Federado de Psicología"]
}
```

**Ficha de organización** (`GET /{code}`):

```json
{
  "code": "ORG-0031",
  "name": "CF Psicología",
  "type": {"code": "PUCP_UNIT", "label": "Unidad PUCP"},
  "ruc": null,
  "phone": null,
  "aliases": ["Centro Federado de Psicología"],
  "contacts": [{"code": "CON-0007", "fullName": "Juan Diego Villasante", "extension": null, "mobile": null, "email": null}]
}
```

**Crear contacto** (`POST`):

```json
{
  "fullName": "Juan Diego Villasante",
  "organizationCodes": ["ORG-0012", "ORG-0031"],
  "extension": "4549",
  "mobile": null,
  "email": null
}
```

### 3.1 Decisiones que el código no explica

- **`/similar` no bloquea**: devuelve sugerencias y el cliente decide. La unicidad real la
  hace cumplir el `POST` (409, §5.3).
- **Códigos legibles** `ORG-0001` y `CON-0001` en las URL, como `LUG-0001` en Lugares; el `id`
  numérico no sale en la API.
- **SUPERVISOR solo usa los `GET` de lista y ficha**; cualquier escritura y `/similar` le
  responden 403 (decisión del usuario: el capataz solo ve y busca).
- **Vincular es una operación aparte del `PUT`**: `POST /contacts/{code}/organizations` (cuerpo
  `{"organizationCode": "ORG-0031"}`) agrega un vínculo sin reenviar los datos ni los demás
  vínculos del contacto. Así el selector de un formulario puede vincular sin abrir la edición
  completa *(decisión de diseño)*.

## 4. Migración de base de datos

### 4.1 Esquema

`Vnext__create_directory.sql` (siguiente número libre al implementar; hoy sería V036).

```sql
INSERT INTO catalog_types (code, name, description, is_system) VALUES
    ('ORGANIZATION_TYPE', 'Tipos de organización', 'Unidad PUCP o empresa externa', TRUE);
INSERT INTO catalog_items (catalog_type_id, code, label, sort_order) VALUES
    ((SELECT id FROM catalog_types WHERE code = 'ORGANIZATION_TYPE'), 'PUCP_UNIT',        'Unidad PUCP',      1),
    ((SELECT id FROM catalog_types WHERE code = 'ORGANIZATION_TYPE'), 'EXTERNAL_COMPANY', 'Empresa externa', 2);

CREATE SEQUENCE organization_code_seq;
CREATE TABLE organizations (
    id                     BIGSERIAL PRIMARY KEY,
    code                   VARCHAR(20)  NOT NULL UNIQUE DEFAULT 'ORG-' || lpad(nextval('organization_code_seq')::text, 4, '0'),
    name                   VARCHAR(200) NOT NULL,
    type_item_id           BIGINT       NOT NULL REFERENCES catalog_items(id),
    ruc                    CHAR(11),
    phone                  VARCHAR(30),
    created_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at             TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at             TIMESTAMP,
    CONSTRAINT chk_organizations_ruc_format CHECK (ruc IS NULL OR ruc ~ '^(10|20)[0-9]{9}$')
);
-- Sin tildes ni mayúsculas: «Estudios Generales Ciencias» y «estudios generales ciencias» son la misma.
CREATE UNIQUE INDEX idx_organizations_name ON organizations (unaccent(lower(name))) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_organizations_ruc ON organizations (ruc) WHERE deleted_at IS NULL AND ruc IS NOT NULL;

CREATE TABLE organization_aliases (
    id              BIGSERIAL PRIMARY KEY,
    organization_id BIGINT       NOT NULL REFERENCES organizations(id),
    alias           VARCHAR(200) NOT NULL,
    created_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);
-- Un alias apunta a una sola organización; que no choque con el nombre de otra lo valida el servicio.
CREATE UNIQUE INDEX idx_organization_aliases_alias ON organization_aliases (unaccent(lower(alias))) WHERE deleted_at IS NULL;

CREATE SEQUENCE contact_code_seq;
CREATE TABLE contacts (
    id         BIGSERIAL PRIMARY KEY,
    code       VARCHAR(20)  NOT NULL UNIQUE DEFAULT 'CON-' || lpad(nextval('contact_code_seq')::text, 4, '0'),
    full_name  VARCHAR(200) NOT NULL,
    extension  CHAR(4),
    mobile     CHAR(9),
    email      VARCHAR(254),
    created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,
    CONSTRAINT chk_contacts_extension CHECK (extension IS NULL OR extension ~ '^[0-9]{4}$'),
    CONSTRAINT chk_contacts_mobile CHECK (mobile IS NULL OR mobile ~ '^9[0-9]{8}$')
);
-- Sin índice único de nombre: dos personas distintas pueden llamarse igual.

CREATE TABLE contact_organizations (
    id              BIGSERIAL PRIMARY KEY,
    contact_id      BIGINT    NOT NULL REFERENCES contacts(id),
    organization_id BIGINT    NOT NULL REFERENCES organizations(id),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);
CREATE UNIQUE INDEX idx_contact_organizations_pair ON contact_organizations (contact_id, organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contact_organizations_org ON contact_organizations (organization_id) WHERE deleted_at IS NULL;
```

**Nota para quien implemente:** `unaccent` no es `IMMUTABLE`, así que los índices únicos sobre
`unaccent(lower(...))` necesitan una función envoltorio inmutable. Las sugerencias de `/similar`
pueden usar `pg_trgm`, como `PlaceSuggestionRepository`.

### 4.2 Carga inicial: Registro masivo

> **Enmienda del 8 nov 2026 (decisión del usuario):** la carga inicial entra por una sección
> **Registro masivo** del Directorio, no por una migración ni por un script. Así la hace
> coordinación con las mismas reglas que el alta manual, y ningún dato personal pasa por Git.

- `/directorio/importar`, solo ADMIN y COORDINADOR. Se elige **Organizaciones** o
  **Contactos**, se descarga su plantilla y se sube un CSV (UTF-8, separador `;`, listas con `|`).
  Los estándares están en `docs/estandares/` (`organizaciones.md`, `contactos.md`).
- Columnas: organizaciones `nombre;tipo;ruc;telefono;otros_nombres` (tipo «Unidad PUCP» o
  «Empresa externa»); contactos `nombre;organizaciones;anexo;celular;correo` (organizaciones por
  nombre, alias o código; se cargan primero). Exactamente esas columnas: una que falta o una
  desconocida rechaza el archivo.

> **Enmienda del 8 nov 2026 (decisión del usuario, a partir de la revisión del analista de
> procesos):** el registro masivo usa el **ciclo común de cargas** del catastro (SPEC-103 D-04)
> en vez de un flujo propio.

- **Vista previa** (`POST /api/v1/imports/{organizations|contacts}/preview`): no escribe en el
  Directorio; abre un **lote** en `import_batches` con lo revisado. Cada fila sale como *Se crea*,
  *Ya existe, se omite*, *Se omite: falta su organización* o *Error* con sus motivos (código
  estable + dato).
- **Confirmación** (`POST /api/v1/imports/{batchId}/confirm`): escribe **exactamente lo revisado**,
  sin volver a leer el archivo. Solo quien abrió el lote lo confirma, dentro de la hora, una vez,
  y una carga a la vez en todo el sistema. **Todo o nada**: con una fila con error responde 422 y
  no guarda ninguna. Crea con los mismos servicios (y auditoría) que el alta manual y cada fila
  creada guarda su `import_batch_id` (V037; nulo en el alta manual). Hasta 2000 filas por archivo.
- «Ya existe»: una organización vigente con el mismo nombre; un contacto con el mismo nombre ya
  vinculado a la primera organización de su fila *(decisión de diseño)*. Se muestra en la
  revisión y se omite siempre: no se decide fila por fila.
- **Organización desconocida en contactos** *(cambio de regla del 8 nov 2026)*: ya no bloquea el
  archivo. La fila se omite entera, aunque sus otras organizaciones existan, y se cuenta por
  organización faltante, como una especie desconocida en el catastro. Un error de formato en la
  misma fila pesa más: la fila queda con error.
- Los datos del calendario se preparan **fuera del repositorio** (tabla de equivalencias revisada
  por el usuario, «A / B» separado en dos personas, sin códigos de alumno, filas sucias
  ignoradas) y se suben por esta sección.

### 4.3 Rol del contacto en cada organización

> **Enmienda del 11 nov 2026 (decisión del usuario, desde SPEC-107 D-08b):** el vínculo
> contacto–organización gana un **rol** opcional. La regla de §2.5 no cambia: todo contacto
> pertenece al menos a una organización.

- `contact_organizations.role VARCHAR(100)`, nulo sin rol, texto libre («Delegado», «Secretaria
  académica»). La columna la agrega la migración de SPEC-107 (§4).
- Un vínculo por par contacto–organización, con **un solo rol**; para cambiarlo se edita. Juan
  Diego puede ser «Delegado» en la OIE y «Tesorero» en CF Psicología, y la ficha del contacto
  junta sus roles («Delegado · OIE», «Tesorero · CF Psicología»).
- API: `POST /contacts` acepta `roles`, un objeto código de organización → rol
  (`{"ORG-0012": "Delegado"}`), con claves solo de `organizationCodes`; `POST
  /contacts/{code}/organizations` acepta `role`; `PUT /contacts/{code}/organizations/{orgCode}`
  (ADMIN, COORDINADOR) cambia solo el rol, `{"role": "Tesorero"}` o `null`. Las fichas devuelven
  `role` en cada contacto de una organización y en cada organización de un contacto.
- La ventana de alta y «Vincular a <organización>» de §5.2 piden el rol, opcional. Vincular un
  contacto que ya está en esa organización no crea otro vínculo: ofrece editar su rol.
- `contactos.csv` gana la columna opcional **`roles`** al final:
  `nombre;organizaciones;anexo;celular;correo;roles`, con un rol por organización, en el mismo
  orden y separados por `|`; un rol puede ir vacío. Un archivo **sin** la columna sigue valiendo
  (excepción a «exactamente esas columnas» de §4.2). Más roles que organizaciones es error de la
  fila. Un contacto «Ya existe» se omite igual: el CSV no cambia el rol de un vínculo existente.
- Auditoría: `CONTACT_LINK_ROLE_UPDATED` con el código del contacto y el de la organización;
  como los demás cambios de un contacto, sin el valor (§9.2).

## 5. Comportamiento

### 5.1 Flujo principal: registrar una organización

Lo hacen coordinador o administrador.

1. Escribe el nombre → el sistema muestra hasta 5 organizaciones parecidas.
2. Si una es la misma, la elige (en un formulario) o la abre (en `/directorio`) y puede guardar
   el nombre escrito como alias.
3. Si no, completa tipo, RUC (solo empresa externa), teléfono y alias → guarda.

### 5.2 Alta en el mismo formulario

`OrganizationPicker` y `ContactPicker` buscan mientras se escribe. Para SUPERVISOR solo buscan
y eligen: si no hay resultado, muestran «No está en el directorio» sin opción de registrar (qué
hace entonces el formulario lo decide el spec de cada módulo, §9.4).

Para ADMIN y COORDINADOR, si no hay resultado, ofrecen
«Registrar «<texto>»» y abren un diálogo con el formulario de alta, ya con el nombre escrito.
Al guardar, el registro nuevo queda elegido y el formulario de origen **no pierde lo que ya
tenía**. `ContactPicker` recibe la organización ya elegida: filtra por ella y el alta vincula
el contacto a esa organización.

Cuando la búsqueda no encuentra nada en la organización elegida, `ContactPicker` muestra también
los contactos de **otras** organizaciones que coinciden, con su organización al lado y la opción
«Vincular a <organización>». Elegirla llama al endpoint de vínculo y deja al contacto elegido.
Antes de abrir el alta de un contacto nuevo, el diálogo muestra los parecidos de `/similar`
*(decisión de diseño: mismo patrón que las organizaciones)*; como el nombre no es único, el
usuario puede crear de todos modos.

### 5.3 Rechazos

| Caso | Respuesta |
|---|---|
| Nombre o alias ya usado por otra organización vigente (sin tildes ni mayúsculas) | 409 |
| RUC ya usado por otra organización vigente | 409 |
| RUC en una unidad PUCP | 422 |
| Contacto sin ninguna organización vigente | 422 |
| Vincular a una organización con la que ya está vinculado | 409 |
| Vincular a una organización dada de baja, o vincular un contacto dado de baja | 422 |
| Anexo, celular o correo con formato inválido | 400 |

Todos los mensajes van en español (memoria del proyecto: errores visibles en español).

### 5.4 Reglas puras (engine)

- `RucRule`: 11 dígitos, empieza con 10 o 20.
- `ContactPhones`: anexo `^[0-9]{4}$`, celular `^9[0-9]{8}$`. **El backend** quita espacios y
  guiones antes de validar («987 654 321» es válido), para que el formulario y el script de
  carga obtengan el mismo resultado.

### 5.5 Casos límite

- **Baja de una organización**: deja de aparecer en búsquedas y en los selectores; los registros
  que ya la usaban la siguen mostrando con su nombre. Sus contactos no se dan de baja, porque
  pueden pertenecer a otras.
- **Baja de un contacto**: igual; sus vínculos quedan, pero no aparece para elegir.
- **Contacto cuya única organización se da de baja**: sigue vigente y aparece en `/directorio`
  marcado «sin organización vigente», para que coordinación lo reasigne o lo dé de baja.

## 6. Criterios de aceptación

| # | Criterio | Cómo verificarlo |
|---|----------|------------------|
| CA-01 | Un coordinador registra una organización desde `/directorio` | Con sesión de COORDINADOR, crear «Facultad de Derecho»; aparece en la lista |
| CA-02 | Antes de crear se ven los parecidos | Escribir «estudios generales ciencias» con «Estudios Generales Ciencias» existente; aparece como sugerencia |
| CA-03 | El capataz solo ve y busca | Con SUPERVISOR, `/directorio` no ofrece registrar, editar, vincular ni dar de baja; los selectores no ofrecen «Registrar…»; la API responde 403 a toda escritura |
| CA-05 | El RUC solo existe para empresas y se valida | RUC en unidad PUCP: error; RUC «2012345678» (10 dígitos): error; «20123456789»: se guarda |
| CA-06 | Un contacto en varias organizaciones | Crear a Juan Diego en OIE y en «CF Psicología»; aparece en las fichas de ambas |
| CA-08 | Alta en el mismo formulario | En un formulario que use `OrganizationPicker`, escribir un nombre inexistente, registrarlo en el diálogo: queda elegido y el resto del formulario conserva sus datos |
| CA-09 | Búsqueda por alias | Buscar «EEGGCC» encuentra «Estudios Generales Ciencias» |
| CA-10 | Una baja no desaparece del historial | Dar de baja una organización: ya no aparece en el selector; su ficha sigue accesible por código |
| CA-11 | Vincular un contacto existente desde un formulario | Juan Diego solo en OIE; con COORDINADOR, en un formulario con «CF Psicología», buscar «Juan Diego», elegir «Vincular a CF Psicología»: queda elegido y aparece en ambas fichas, sin un contacto duplicado |
| CA-12 | Antes de crear un contacto se ven los parecidos | Con «Juan Diego Villasante» existente, registrar «juan diego villasante»: el diálogo lo sugiere y permite crear de todos modos |

## 7. Especificación visual

- `/directorio`: `PageHeader` «Directorio», buscador, filtro por tipo,
  y tabla con nombre, tipo, teléfono y número de contactos. En móvil (<640px), tarjetas en lugar
  de tabla.
- `/directorio` tiene dos pestañas, **Organizaciones** y **Contactos**. La de contactos lista
  nombre, organizaciones, anexo y celular, con un filtro «Sin organización vigente».
- `/directorio/contactos/[code]`: ficha del contacto con sus datos y sus organizaciones; ahí se
  edita y se da de baja.
- `/directorio/[code]`: tarjeta de datos (nombre, tipo, RUC, teléfono, alias) y tarjeta de
  contactos con anexo, celular y correo.
- El menú tiene un grupo **Directorio** con *Directorio*, *Registro individual* y *Registro
  masivo*; el capataz solo ve el primero. Fondo de módulo propio (violeta, `moduleThemes.ts`).
- `/directorio/registrar` (**Registro individual**, decisión del usuario): un único «Registrar»
  lleva aquí; primero se elige *Organización* o *Contacto* y luego se llenan sus datos.
- Botones «Registrar», «Editar», «Vincular» y «Dar de baja» solo para ADMIN y COORDINADOR.
- Estados: cargando, vacío («Aún no hay organizaciones»), error y sugerencias de parecidos.

## 8. Tests

```
Unicidad sin tildes ni mayúsculas
- «Estudios Generales Ciencias» existe → crear «estudios generales ciencias» da 409
- un alias igual al nombre de otra organización → 409
- una organización dada de baja libera su nombre

RUC
- RUC en unidad PUCP → 422; RUC repetido entre vigentes → 409; RUC de una dada de baja se puede reutilizar

Contactos
- contacto sin organizaciones → 422; vinculado a dos organizaciones aparece en ambas fichas
- el formulario normaliza «987 654 321» a «987654321»
- contacto cuya única organización se da de baja sigue vigente y aparece como sin organización vigente
- vincular agrega la organización sin tocar los datos ni los otros vínculos; repetir el vínculo → 409
- vincular a una organización dada de baja → 422
- /similar de contactos encuentra «juan diego villasante» para «Juan Diego Villasante» en otra organización

Permisos
- SUPERVISOR lista y abre fichas de organizaciones y contactos (200)
- SUPERVISOR recibe 403 al crear, vincular, editar, dar de baja y en /similar
- COORDINADOR crea, vincula, edita y da de baja

Datos personales
- ningún log contiene celular, anexo ni correo de un contacto
```

## 9. Propio de este spec

### 9.1 Filas nuevas del Anexo A de SPEC-001

| Módulo | Acción | ADMIN | COORDINADOR | SUPERVISOR | OPERARIO |
|---|---|:---:|:---:|:---:|:---:|
| **Directorio** | Crear organizaciones y contactos | C | C | | |
| **Directorio** | Vincular un contacto existente a otra organización | C | C | | |
| **Directorio** | Editar y dar de baja organizaciones y contactos | UD | UD | | |
| **Directorio** | Ver y buscar organizaciones y contactos | L | L | L | |

### 9.2 Acciones auditables nuevas (SPEC-004 §3.2)

`ORGANIZATION_CREATED`, `ORGANIZATION_UPDATED`, `ORGANIZATION_DEACTIVATED`, `CONTACT_CREATED`,
`CONTACT_UPDATED`, `CONTACT_DEACTIVATED`, `CONTACT_LINKED` (registra el código de la
organización agregada). El detalle de cambios de un contacto registra **qué
campos** cambiaron, nunca sus valores (son datos personales).

### 9.3 Datos personales

Nombre, anexo, celular y correo de un contacto son datos personales (Ley 29733). Nunca salen en
logs (INV-8 se extiende a ellos), solo los ven roles con cuenta y la carga inicial no los guarda
en el repositorio (§4.2).

### 9.4 Fuera de este spec

- **Que los formularios usen el Directorio.** Préstamos, incidencias e intervenciones
  tercerizadas incorporan `OrganizationPicker` y `ContactPicker` en sus propios specs. En
  particular, reemplazar `INCIDENT_COMPANY` y el texto «Reportado por» de incidencias se hace
  cuando se trabaje ese módulo: hoy otra rama lo está modificando.
- **Reemplazar `RESERVATION_OWNER`** por una organización: lo hace el spec de préstamos.
- **«Pedido de» y «Para»** (decisión del usuario): préstamos e incidencias guardan la
  organización que hace el pedido (obligatoria, con su contacto) y, **solo cuando hace falta**,
  la organización para la que es (opcional). Ejemplo: pedido de OIE (Juan Diego), para CF
  Psicología. Los definen los specs de Reservas e Incidencias.
- **Para el spec de Incidencias** (decisión del usuario): si quien reporta no está en el
  Directorio, el capataz escribe el nombre de la organización a mano y la incidencia se
  registra igual. Además, toda incidencia registrada por alguien que no sea coordinador
  (o administrador, que incluye al coordinador) nace **no activa** hasta que el coordinador la
  activa; ahí coordinación registra o elige la organización escrita a mano. Mientras no está
  activa, el coordinador la ve pero no se puede empezar.
- Clasificar unidades (facultad, servicio, espacio común) y el cargo de cada persona.
