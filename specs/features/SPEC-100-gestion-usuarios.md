# SPEC-100 — Gestión de usuarios

## Metadatos

| Campo | Valor |
|-------|-------|
| HU relacionada | 1.1 — Gestión de usuarios (CRUD): crear, editar, desactivar usuarios del sistema |
| Autor del spec | Equipo Hesperides |
| Plataforma | Web (móvil fuera de alcance, ver §2.3) |
| Prioridad | Alta |
| Sprint | S1 |
| Dependencias | SPEC-000, SPEC-001 (posee `users`), SPEC-002, SPEC-003 (catálogo `ROLE`), SPEC-004 (auditoría), SPEC-C01, SPEC-C02, SPEC-C03 |
| Fecha límite | Fin de Semana 3 |

---

## 1. Objetivo

Permitir que un administrador dé de alta, edite, desactive y reactive las cuentas del personal de áreas verdes, y que cada persona reciba sus credenciales por correo y fije su propia contraseña en el primer ingreso, para que el acceso al sistema refleje en todo momento quién trabaja hoy en el campus y con qué rol.

## 2. Contexto para la IA

> INSTRUCCIÓN: antes de generar código, la IA debe leer obligatoriamente:
> - Este spec completo
> - SPEC-001 (autenticación) — **posee la tabla `users` (V002)**; este spec la extiende con
>   un `ALTER TABLE`, nunca la vuelve a crear. Su Anexo A gobierna la autorización de cada
>   endpoint de aquí. Su §2.6 fija qué pasa con la sesión de un usuario desactivado.
> - SPEC-003 (catálogos) — el rol es un `catalog_item` del tipo `ROLE`. Prohibido cualquier
>   `enum` de rol en Java.
> - SPEC-004 (auditoría) — este módulo emite cinco acciones auditables (§9.3).
> - SPEC-C01 (componentes UI), SPEC-C02 (errores), SPEC-C03 (patrones de API).
>
> **Este spec enmienda tres specs ya cerrados** (§2.5). Leer esas enmiendas antes de asumir
> que "no hay servicios externos" o que "no hay envío de correo" siguen vigentes tal cual.

### 2.1 Módulo backend

- Paquete: `pe.edu.pucp.hesperides.modules.users`
- Entidades JPA involucradas: `User` (definida por SPEC-001, extendida aquí con tres columnas),
  `CatalogItem` (SPEC-003, por la FK de rol), `RefreshToken` (SPEC-001, para revocación masiva),
  `TeamMember` (SPEC-002 V012, para el alcance "solo su cuadrilla")
- Repositorios necesarios: `UsersRepository` y `RefreshTokensRepository` (ambos ya declarados
  por SPEC-001), `TeamMembersRepository` (SPEC-002)
- Servicio: `UsersService` / `UsersServiceImpl`; `CredentialDeliveryService` (envío SMTP,
  §5.3); `TemporaryPasswordGenerator` (componente puro, sin I/O)
- Controller: `UsersController`, ruta base: `/api/v1/users`

### 2.2 Módulo frontend (web)

- Rutas (Next.js App Router):
  - `/admin/usuarios` — listado y administración (ADMIN, COORDINADOR, SUPERVISOR)
  - `/cambiar-password` — cambio obligatorio de contraseña (cualquier usuario autenticado)
- Componentes nuevos a crear:
  - `frontend/src/app/admin/usuarios/page.tsx` — página de listado
  - `frontend/src/components/users/UsersTable.tsx` — tabla con acciones por fila
  - `frontend/src/components/users/UserFormModal.tsx` — alta y edición
  - `frontend/src/components/users/UserFilters.tsx` — barra de filtros
  - `frontend/src/components/users/CredentialStatusBadge.tsx` — estado de entrega
  - `frontend/src/app/cambiar-password/page.tsx` — cambio obligatorio
- Componentes existentes a reutilizar (SPEC-C01, no se redefinen sus props):
  `DataTable` (§4.6), `Modal` (§4.4), `Input` (§4.2), `Select` (§4.3), `Button` (§4.1),
  `Toast` (§4.5), `Badge`/`StatusBadge` (§4.9), `EmptyState` (§4.10), `LoadingSkeleton` (§4.8)
- Hook(s) necesario(s): `useUsers` (listado paginado + filtros), `useUserMutations`
  (crear/editar/desactivar/reactivar/reenviar), `useCatalog('ROLE')` (SPEC-003 §6.1, ya existe)

### 2.3 Módulo móvil

**Fuera de alcance, deliberadamente.** La matriz del Anexo A de SPEC-001 no concede al OPERARIO
—único rol cuyo trabajo es principalmente móvil— ninguna acción sobre el módulo 1.1 Usuarios:
ni crear, ni editar, ni desactivar, ni siquiera leer el listado. La administración de cuentas se
hace desde un escritorio, no desde el campo.

La única pantalla de este spec que un usuario móvil sí necesita es el **cambio obligatorio de
contraseña** (§5.2), porque un operario recibe sus credenciales por correo y entra por primera
vez desde la app. Esa pantalla la especifica el spec de la app móvil cuando se escriba (fase 2,
ver `specs/REGISTRO.md`); el endpoint `POST /api/v1/users/me/password` que consume ya queda
definido aquí y no cambiará.

### 2.4 Restricciones técnicas

- Librerías que DEBE usar:
  - `spring-boot-starter-mail` (JavaMailSender) para el envío SMTP — §5.3
  - `spring-boot-starter-validation` (Bean Validation) para los DTO de entrada
  - `BCryptPasswordEncoder` ya configurado por SPEC-001 para el hash de contraseñas
  - `java.security.SecureRandom` para generar la contraseña temporal
  - `Specification<User>` de Spring Data JPA para componer los filtros del listado (SPEC-C03 §6.1)
- Librerías que NO debe usar:
  - Ninguna librería de correo de terceros (SendGrid, Mailgun, AWS SES SDK): el envío es SMTP
    plano vía JavaMailSender, configurable por variables de entorno. Cambiar de proveedor es
    cambiar el host SMTP, no el código.
  - `java.util.Random` para la contraseña temporal (no es criptográficamente seguro).
  - Ningún `enum` Java de rol ni `@Enumerated` sobre el rol.
- Patrón de catálogos aplicable: `ROLE` (SPEC-003 §8, `is_system = TRUE`, ítems protegidos
  `ADMIN`, `COORDINADOR`, `SUPERVISOR`, `OPERARIO`).

### 2.5 Enmiendas a specs ya cerrados

Este spec introduce el envío automático de credenciales por correo. Eso contradice el texto
literal de dos specs fundacionales, que se corrigen aquí. **Las enmiendas se aplican a los
archivos originales como parte de esta entrega**; esta sección las resume para dejar constancia
de qué cambió y por qué.

| Spec | Decía | Pasa a decir | Motivo |
|---|---|---|---|
| SPEC-000 §1 | "Sin dependencia de servicios externos (SaaS, APIs de terceros) en esta versión." | Se acota: SMTP es la única dependencia externa admitida, y su indisponibilidad nunca puede impedir una operación de negocio. | El principio existe para evitar acoplarse a un SaaS que el cliente no controla. Un servidor SMTP —el de la propia PUCP o cualquier otro— es infraestructura estándar, sustituible por configuración, y sin él no hay forma de entregar credenciales a decenas de personas sin integración con el directorio institucional. |
| SPEC-001 §2.5 | Descarta el autorregistro **porque** "no hay integración con correo PUCP en el alcance de este proyecto". | Mantiene la decisión de no autorregistro, con la justificación corregida: sí hay envío de correo, pero sirve para **entregar** credenciales de cuentas que un ADMIN crea, no para que un desconocido se dé de alta solo. | La decisión de fondo (alta cerrada, sin autorregistro) sigue siendo correcta y no cambia: los cuatro roles son personal asignado por la unidad de áreas verdes, no un público abierto. Lo que era incorrecto era el argumento de que el correo no existía. |
| SPEC-004 §3.2 | Lista cuatro acciones auditables sobre usuarios. | Añade `USER_CREDENTIALS_DELIVERY_FAILED` a la tabla de acciones auditables. | §9.3 lo justifica: el fallo de entrega es exactamente el tipo de hecho que alguien necesita reconstruir meses después ("¿por qué esta persona nunca pudo entrar?"), y no basta con un log SLF4J rotado a las pocas semanas. |

### 2.6 Decisión: tres conceptos distintos, tres columnas distintas

El estado de una cuenta responde a tres preguntas independientes que no deben colapsarse en un
solo campo. Colapsarlas es el error clásico de este módulo:

| Columna | Pregunta que responde | Quién la cambia |
|---|---|---|
| `is_active` (ya existe, V002) | ¿Esta persona sigue trabajando aquí? | ADMIN, con `deactivate` / `reactivate` |
| `credential_status` (nuevo) | ¿Llegó a recibir sus credenciales? | El sistema, según el resultado del envío SMTP; el ADMIN al reenviar o al marcar entrega manual |
| `must_change_password` (nuevo) | ¿La contraseña que tiene es la temporal que le asignaron? | El sistema: `TRUE` al crear y al reenviar credenciales, `FALSE` cuando la persona fija la suya |

**Por qué no reutilizar `is_active` para el rebote de correo:** un listado donde "nunca recibió
su clave" y "lo dimos de baja" se ven idénticos obliga al ADMIN a adivinar cuál es cuál, y la
auditoría no podría distinguir un alta fallida de una baja deliberada. Son hechos distintos con
acciones correctivas distintas: uno se resuelve reenviando, el otro reactivando.

**Por qué `must_change_password` es imprescindible:** sin esa bandera, la contraseña que el
ADMIN eligió y que viajó por correo seguiría siendo válida indefinidamente, y el requisito de
que "el usuario al ingresar escribe una nueva contraseña" quedaría como una sugerencia que nada
obliga a cumplir. Una credencial que existe en el buzón de dos personas (quien la envió y quien
la recibió) debe dejar de ser válida en cuanto se usa una vez.

### 2.7 Decisión: la contraseña de otro usuario no se fija, se regenera

Un ADMIN **nunca** puede escribir directamente la contraseña de una cuenta ya existente. Puede
crear la cuenta con una contraseña inicial (que el sistema fuerza a cambiar en el primer
ingreso) y puede regenerar credenciales con `POST /users/{id}/resend-credentials`, pero el
formulario de edición no tiene campo de contraseña.

Motivo: si un ADMIN pudiera fijar la clave de un COORDINADOR sin dejar rastro visible para esa
persona, podría entrar como él y registrar acciones a su nombre —validar intervenciones, cerrar
contratos— y la auditoría atribuiría esas acciones al coordinador. Con la regeneración, la
suplantación sigue siendo técnicamente posible pero **nunca silenciosa**: la persona suplantada
descubre que su contraseña dejó de funcionar la próxima vez que entra, y queda una fila en
`audit_log`. El costo de la restricción es nulo: el caso de soporte legítimo ("olvidé mi
contraseña") se resuelve igual de bien regenerando.

Corolario: **no existe recuperación de contraseña autoservicio** en este spec. La persona se lo
pide al ADMIN, que regenera. Un flujo de token de un solo uso por correo es una feature propia,
con su propia superficie de ataque (enumeración de cuentas, expiración de tokens), y el volumen
de usuarios —decenas— no la justifica todavía.

---

## 3. Contratos de API

Nueve endpoints bajo `/api/v1/users`. Todos exigen access token válido; la autorización fina por
rol sale del Anexo A de SPEC-001 y se indica en cada uno.

**Nota sobre el verbo de desactivación:** se usa `POST /users/{id}/deactivate`, no
`DELETE /users/{id}`. SPEC-C03 §3.1 reserva `DELETE` para el soft delete (`deleted_at`), y aquí
desactivar es otra cosa: `is_active = FALSE`, un estado reversible con acción inversa explícita.
SPEC-C03 §3.3 contempla exactamente este caso (acción de negocio con verbo en el path), y
SPEC-004 CA-04 ya anticipa un endpoint de esta forma. `deleted_at` queda reservado para un
borrado lógico definitivo que este spec no expone: una cuenta no se borra, se desactiva.

### GET /api/v1/users

**Descripción:** lista usuarios de forma paginada, con filtros combinables. El alcance depende
del rol de quien consulta.

**Autorización:** ADMIN y COORDINADOR ven todos los usuarios. SUPERVISOR ve únicamente a los
miembros vigentes de su(s) cuadrilla(s). OPERARIO recibe 403.

**Headers:**
```
Authorization: Bearer {jwt_token}
```

**Query params** (todos opcionales, AND implícito, SPEC-C03 §6.1):

| Param | Tipo | Notas |
|---|---|---|
| `search` | string | Texto libre, insensible a mayúsculas y acentos, sobre `first_name`, `last_name` y `email`. Coincidencia parcial (`LIKE %texto%`). Máx. 100 chars. |
| `roleCode` | string | `code` del `catalog_item` de tipo `ROLE` (`ADMIN`, `COORDINADOR`, `SUPERVISOR`, `OPERARIO`). Nunca el `id` numérico ni un enum. |
| `isActive` | boolean | **Si se omite, el listado devuelve solo `isActive = true`.** Ver §5.5 sobre por qué el defecto no es "todos". |
| `teamId` | long | Filtra por miembros vigentes (`team_members.left_at IS NULL`) de esa cuadrilla. Para un SUPERVISOR se ignora si apunta a una cuadrilla ajena: su alcance ya está restringido y no se amplía por query param. |
| `page`, `size`, `sort` | — | SPEC-C03 §5.1. Defecto `page=0`, `size=20`, `sort=lastName,asc`. |

El orden por defecto es `lastName,asc` (no `createdAt,desc` como el defecto general de SPEC-C03
§5.1) porque este listado se usa para **buscar a una persona concreta**, y el orden alfabético
por apellido es el que permite recorrerlo con la vista. Es una excepción consciente y local.

**Response 200:**
```json
{
  "ok": true,
  "message": "Users retrieved successfully",
  "data": {
    "content": [
      {
        "id": 12,
        "email": "jperez@pucp.edu.pe",
        "firstName": "Juan",
        "lastName": "Pérez",
        "fullName": "Juan Pérez",
        "role": { "id": 3, "code": "OPERARIO", "label": "Operario de campo" },
        "isActive": true,
        "credentialStatus": "DELIVERED",
        "mustChangePassword": false,
        "lastLogin": "2026-09-05T14:22:00Z",
        "teams": [ { "id": 2, "name": "Cuadrilla Norte" } ],
        "createdAt": "2026-08-01T09:00:00Z",
        "updatedAt": "2026-09-05T14:22:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 47,
    "totalPages": 3,
    "first": true,
    "last": false
  }
}
```

Ningún campo `passwordHash` aparece jamás, a ninguna profundidad (SPEC-001 §9.1 y CA-06).

### GET /api/v1/users/{id}

**Descripción:** ficha de un usuario.

**Autorización:** misma que el listado. Un SUPERVISOR que pide el `id` de alguien fuera de su
cuadrilla recibe **404**, no 403: revelar "existe pero no puedes verlo" filtra la existencia de
cuentas que no le conciernen. Cualquier usuario autenticado puede pedir **su propio** `id`
aunque su rol no tenga permiso de listado (un OPERARIO consultando su propia ficha).

**Response 200:** el mismo objeto de usuario del listado, dentro de `data`.

**Response 404:**
```json
{ "ok": false, "message": "User not found", "data": null }
```

### POST /api/v1/users

**Descripción:** crea una cuenta, le asigna la contraseña inicial que el ADMIN escribe, y le
envía sus credenciales por correo.

**Autorización:** `@PreAuthorize("hasAuthority('ADMIN')")`.

**Request body:**
```json
{
  "email": "string (requerido, formato correo válido, máx 255 chars)",
  "firstName": "string (requerido, máx 100 chars, no solo espacios)",
  "lastName": "string (requerido, máx 100 chars, no solo espacios)",
  "roleCode": "string (requerido, code de catalog_items tipo ROLE, debe estar activo)",
  "initialPassword": "string (requerido, ver política en §9.1)"
}
```

**Response 201** (header `Location: /api/v1/users/{id}`):
```json
{
  "ok": true,
  "message": "User created successfully",
  "data": {
    "id": 48,
    "email": "mgarcia@pucp.edu.pe",
    "firstName": "María",
    "lastName": "García",
    "fullName": "María García",
    "role": { "id": 2, "code": "COORDINADOR", "label": "Coordinador" },
    "isActive": true,
    "credentialStatus": "DELIVERED",
    "mustChangePassword": true,
    "lastLogin": null,
    "teams": [],
    "createdAt": "2026-09-07T16:00:00Z",
    "updatedAt": "2026-09-07T16:00:00Z"
  }
}
```

**Response 201 con entrega fallida:** el mismo 201, pero `credentialStatus` vale
`PENDING_DELIVERY` y `message` es `"User created, but credential delivery failed"`. **El alta no
se revierte** (§5.3 explica por qué). El frontend distingue ambos casos por
`data.credentialStatus`, no por el `message`.

**Response 400 (validación):**
```json
{
  "ok": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "email", "message": "Debe ser un correo electrónico válido" },
      { "field": "initialPassword", "message": "Debe tener al menos 10 caracteres" }
    ]
  }
}
```

**Response 409 (correo ya registrado):**
```json
{ "ok": false, "message": "Email already registered", "data": null }
```

**Response 422 (rol inexistente o inactivo):**
```json
{ "ok": false, "message": "Role 'SUPERVISOR_X' does not exist or is not active", "data": null }
```

### PUT /api/v1/users/{id}

**Descripción:** actualiza nombre, apellido, correo y rol. **No toca la contraseña** (§2.7) ni
`is_active` (para eso están `deactivate`/`reactivate`).

**Autorización:** `@PreAuthorize("hasAuthority('ADMIN')")`.

**Request body:**
```json
{
  "email": "string (requerido, formato válido, máx 255)",
  "firstName": "string (requerido, máx 100)",
  "lastName": "string (requerido, máx 100)",
  "roleCode": "string (requerido, code de ROLE activo)"
}
```

**Response 200:** el usuario actualizado completo, misma forma que el listado.

**Response 409 (correo de otro usuario vigente):** `"Email already registered"`.

**Response 422 (violaría la regla del último ADMIN):**
```json
{
  "ok": false,
  "message": "Cannot change the role of the last active administrator",
  "data": null
}
```

Si el correo cambió, el sistema **no** reenvía credenciales automáticamente: cambiar el correo
no invalida la contraseña que la persona ya fijó. Si el ADMIN corrigió un correo equivocado de
una cuenta en `PENDING_DELIVERY`, usa `resend-credentials` explícitamente.

### POST /api/v1/users/{id}/deactivate

**Descripción:** desactiva la cuenta y **corta sus sesiones** revocando todos sus refresh tokens.

**Autorización:** `@PreAuthorize("hasAuthority('ADMIN')")`.

**Request body:** ninguno.

**Response 200:** el usuario en su nuevo estado (`isActive: false`), conforme a SPEC-C03 §8 para
acciones de negocio (200 con el recurso, no 204).

**Response 422 (autodesactivación):**
```json
{ "ok": false, "message": "You cannot deactivate your own account", "data": null }
```

**Response 422 (último ADMIN):**
```json
{ "ok": false, "message": "Cannot deactivate the last active administrator", "data": null }
```

**Response 200 sobre un usuario ya desactivado:** idempotente. No falla, no vuelve a auditar
(§5.5), devuelve el estado actual.

### POST /api/v1/users/{id}/reactivate

**Descripción:** revierte la desactivación. No restaura sesiones (los refresh tokens revocados
lo siguen estando): la persona vuelve a iniciar sesión con normalidad.

**Autorización:** `@PreAuthorize("hasAuthority('ADMIN')")`.

**Response 200:** el usuario con `isActive: true`. Idempotente igual que `deactivate`.

**Nota:** reactivar no regenera la contraseña. Si la persona ya no la recuerda tras meses de
baja, el ADMIN usa `resend-credentials`.

### POST /api/v1/users/{id}/resend-credentials

**Descripción:** genera una contraseña temporal nueva, la envía por correo, y obliga a cambiarla
en el próximo ingreso. Sirve para dos casos: reintentar una entrega fallida y atender un "olvidé
mi contraseña".

**Autorización:** `@PreAuthorize("hasAuthority('ADMIN')")`.

**Request body:** ninguno. La contraseña la genera el sistema (§9.1), no la escribe el ADMIN,
por lo dicho en §2.7.

**Efectos:** nueva `password_hash`, `must_change_password = TRUE`, `credential_status` según el
resultado del envío, y **revocación de todos los refresh tokens del usuario** — si la clave se
regeneró porque se sospecha que estaba comprometida, dejar sesiones vivas anularía el propósito.

**Response 200:**
```json
{
  "ok": true,
  "message": "Credentials sent successfully",
  "data": { "id": 48, "email": "mgarcia@pucp.edu.pe", "credentialStatus": "DELIVERED" }
}
```

**Response 200 con fallo de envío:** `credentialStatus: "PENDING_DELIVERY"` y `message`
`"Credential delivery failed"`. La contraseña **sí** se regeneró: la anterior ya no sirve. El
frontend advierte explícitamente de esto (§5.4), porque es la trampa del endpoint: reintentar y
fallar deja a la persona sin acceso hasta que una entrega funcione.

**Response 422 (cuenta desactivada):**
```json
{ "ok": false, "message": "Cannot send credentials to an inactive user", "data": null }
```

### POST /api/v1/users/{id}/mark-credentials-delivered

**Descripción:** el ADMIN declara que comunicó las credenciales por otra vía (teléfono, en
persona) tras un rebote de correo. Solo cambia `credential_status` de `PENDING_DELIVERY` a
`DELIVERED`; no toca la contraseña ni `must_change_password`.

**Autorización:** `@PreAuthorize("hasAuthority('ADMIN')")`.

**Response 200:** el usuario con `credentialStatus: "DELIVERED"`.

**Response 422 (no estaba pendiente):**
```json
{ "ok": false, "message": "User credentials are not pending delivery", "data": null }
```

Existe para que el listado no acumule indefinidamente cuentas marcadas como no entregadas cuando
el problema ya se resolvió fuera del sistema. Sin esta acción, el único modo de limpiar la marca
sería regenerar la contraseña de alguien que ya está usando la suya.

### POST /api/v1/users/me/password

**Descripción:** la persona autenticada cambia su propia contraseña. Es el único endpoint que
acepta contraseñas escritas a mano después del alta, y solo sobre la cuenta propia.

**Autorización:** cualquier usuario autenticado. **Accesible incluso con
`must_change_password = TRUE`** — es la única excepción del interceptor de §5.2.

**Request body:**
```json
{
  "currentPassword": "string (requerido)",
  "newPassword": "string (requerido, política de §9.1)"
}
```

**Efectos:** nueva `password_hash`, `must_change_password = FALSE`, y revocación de todos los
refresh tokens **excepto el de la sesión en curso** — cambiar la contraseña debe expulsar
cualquier otra sesión abierta (el motivo habitual del cambio es sospechar que alguien más entró)
sin desconectar a quien la está cambiando.

**Response 200:**
```json
{ "ok": true, "message": "Password updated successfully", "data": null }
```

**Response 400 (contraseña actual incorrecta):**
```json
{ "ok": false, "message": "Current password is incorrect", "data": null }
```

Se responde 400 y no 401: el token es válido y la sesión existe; lo que falló es un dato del
formulario. Un 401 haría que el cliente disparara el flujo de refresh de SPEC-001 Anexo C sin
motivo.

**Response 422 (la nueva es igual a la actual):**
```json
{ "ok": false, "message": "New password must be different from the current one", "data": null }
```

### Envolturas comunes de error (401 / 403)

Idénticas en los nueve endpoints, según SPEC-C02 y el Anexo B de SPEC-001:

```json
{ "ok": false, "message": "Invalid or expired token", "data": null }
```
```json
{ "ok": false, "message": "Insufficient permissions for this action", "data": null }
```

---

## 4. Migración de base de datos

La tabla `users` **ya existe**: la crea `V002__create_users.sql`, propiedad de SPEC-001. Este
spec **no la vuelve a crear**; añade tres columnas con un `ALTER TABLE`. Duplicar el `CREATE`
rompería Flyway por conflicto de checksum (plantilla §4).

Rango: SPEC-1NN usa `V1NN__` en adelante. Este spec es SPEC-100 y ocupa **V100**.

```sql
-- V100__add_credential_columns_to_users.sql

-- Estado de entrega de credenciales. Independiente de is_active (SPEC-100 §2.6):
-- is_active responde "¿sigue trabajando aquí?"; esta columna, "¿recibió su clave?".
ALTER TABLE users
    ADD COLUMN credential_status VARCHAR(20) NOT NULL DEFAULT 'DELIVERED'
        CHECK (credential_status IN ('PENDING_DELIVERY', 'DELIVERED'));

-- TRUE mientras la contraseña vigente sea la temporal que asignó un administrador.
-- Fuerza el cambio en el primer ingreso (SPEC-100 §5.2).
ALTER TABLE users
    ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Momento del último envío de credenciales. Sirve para que el administrador sepa
-- cuánto lleva pendiente una entrega sin tener que consultar audit_log.
ALTER TABLE users
    ADD COLUMN credentials_sent_at TIMESTAMP;

-- El listado por defecto filtra activos y suele filtrar por rol; el índice cubre
-- el caso más frecuente de la pantalla /admin/usuarios.
CREATE INDEX idx_users_is_active_role ON users(is_active, role_item_id)
    WHERE deleted_at IS NULL;

-- Permite que la pantalla resalte las entregas pendientes sin escanear la tabla.
CREATE INDEX idx_users_credential_status ON users(credential_status)
    WHERE credential_status = 'PENDING_DELIVERY' AND deleted_at IS NULL;
```

**Por qué los defaults son `'DELIVERED'` y `FALSE`:** las cuentas que existan antes de esta
migración (el usuario administrador semilla, cuentas de prueba) no pasaron por el flujo de envío
y no deben quedar marcadas como pendientes ni forzadas a cambiar la contraseña. El default
describe correctamente el estado de lo que ya existe; el flujo de alta de §5.1 fija los valores
explícitamente en cada creación nueva.

**Por qué `credential_status` es un `CHECK` de dos valores y no un catálogo:** mismo criterio que
`refresh_tokens.client_type` en SPEC-001 y que `AuditActionCode` en SPEC-004 §3.1 — es metadato
del sistema, no un dato de negocio que el cliente pueda ampliar desde la UI. Un administrador
que agregara un tercer estado desde `/admin/catalogs` no encontraría ningún código que lo
produjera ni lo interpretara. En Java se mapea con `@Enumerated(EnumType.STRING)` (nunca
`ORDINAL`), para que la columna sea legible en una consulta SQL directa.

**Nueva variable de entorno** (SPEC-000: fail fast si falta, y `.env.example` actualizado):

```
SMTP_HOST=smtp.pucp.edu.pe
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=no-reply@hesperides.pucp.edu.pe
APP_PUBLIC_URL=https://hesperides.pucp.edu.pe
```

`APP_PUBLIC_URL` es necesaria para que el correo incluya el enlace de acceso. Nunca se arma esa
URL a partir del `Host` del request entrante: un atacante que controle ese header podría hacer
que el correo apunte a un dominio suyo.

---

## 5. Comportamiento esperado

### 5.1 Flujo principal (Happy Path) — alta de un usuario

1. El ADMIN entra a `/admin/usuarios` y pulsa **Nuevo usuario**.
2. Llena correo, nombre, apellido, rol (select alimentado por `useCatalog('ROLE')`) y una
   contraseña inicial. El indicador de política (§9.1) valida en vivo.
3. Al enviar, el botón se deshabilita inmediatamente (SPEC-C03 §9.3) y se llama
   `POST /api/v1/users`.
4. El backend, **en una transacción**: valida, verifica que el correo esté libre entre vigentes,
   resuelve el `roleCode` a `role_item_id`, hashea la contraseña con BCrypt, inserta la fila con
   `is_active = TRUE`, `must_change_password = TRUE`, `credential_status = 'PENDING_DELIVERY'`,
   y registra `USER_CREATED` en `audit_log`.
5. **Cerrada la transacción**, intenta el envío SMTP (§5.3). Si tiene éxito, actualiza
   `credential_status = 'DELIVERED'` y `credentials_sent_at = NOW()`. Si falla, la fila se queda
   en `PENDING_DELIVERY` y se registra `USER_CREDENTIALS_DELIVERY_FAILED`.
6. La respuesta 201 llega al frontend, que muestra un `Toast` de éxito y refresca el listado. Si
   `credentialStatus` vino `PENDING_DELIVERY`, el toast es de advertencia y explica la acción
   correctiva.
7. La persona recibe el correo, entra con su contraseña temporal, y el sistema la lleva
   directamente a `/cambiar-password` (§5.2).

### 5.2 Flujo principal — primer ingreso y cambio obligatorio

1. La persona hace login normal (`POST /api/v1/auth/login`, SPEC-001). El login **funciona**:
   la contraseña temporal es válida.
2. La respuesta de login y `GET /api/v1/auth/me` incluyen `mustChangePassword: true`.
   *(Esto añade un campo a la respuesta de `/auth/me` de SPEC-001; es una adición retrocompatible,
   ningún campo existente cambia de forma ni de significado.)*
3. El frontend redirige a `/cambiar-password` y **no permite navegar a ninguna otra ruta**
   mientras la bandera siga en `true`.
4. En el backend, un interceptor rechaza con **403** cualquier endpoint bajo `/api/v1/**` para un
   usuario con `must_change_password = TRUE`, salvo esta lista corta:
   `POST /api/v1/users/me/password`, `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh`,
   `POST /api/v1/auth/logout`.
   ```json
   { "ok": false, "message": "Password change required before using the system", "data": null }
   ```
   La restricción vive en el backend, no solo en el frontend: si estuviera únicamente en el
   cliente, cualquiera con la contraseña temporal y `curl` operaría el sistema sin cambiarla.

   La lista es **cerrada y deliberadamente corta**: ni siquiera `GET /api/v1/users/{id}` de la
   propia ficha está permitido, aunque §3 lo autorice a cualquier usuario sobre sí mismo. Lo que
   la pantalla de cambio de contraseña necesita saber del usuario (su nombre) ya viene en
   `GET /api/v1/auth/me`. Toda excepción añadida a esta lista es una vía por la que alguien opera
   el sistema con una credencial que dos personas conocen; agregar una exige justificarla aquí.
5. La persona escribe su contraseña actual (la temporal) y la nueva dos veces.
   `POST /api/v1/users/me/password` responde 200, `must_change_password` pasa a `FALSE`, y el
   frontend la lleva al inicio.

### 5.3 El envío de correo: qué pasa cuando falla

**Regla central: el envío de correo nunca forma parte de la transacción del alta.** La cuenta se
crea, se hace commit, y solo entonces se intenta el correo.

Justificación: si el envío estuviera dentro de la transacción, un servidor SMTP lento mantendría
abierta una transacción de base de datos durante segundos, y un SMTP caído impediría dar de alta
a cualquier persona hasta que se restableciera. La operación de negocio ("registrar a esta
persona en el sistema") no depende de que un servicio externo esté disponible — esa es
exactamente la reserva que SPEC-000 §1 pretendía proteger y que la enmienda de §2.5 conserva.

Qué se considera fallo de entrega:

| Situación | Se detecta | Resultado |
|---|---|---|
| SMTP inalcanzable, credenciales SMTP inválidas, timeout | Síncrono, al enviar | `PENDING_DELIVERY` + `USER_CREDENTIALS_DELIVERY_FAILED` |
| El servidor rechaza el destinatario en el diálogo SMTP (buzón inexistente) | Síncrono, `SendFailedException` | Igual que arriba |
| Rebote diferido (llega minutos después al buzón `SMTP_FROM`) | **No se detecta** | La cuenta queda `DELIVERED` aunque el correo no llegó |

El tercer caso es una limitación consciente: detectarlo exige procesar el buzón de rebotes
(POP/IMAP, parseo de DSN), lo que multiplica la complejidad del módulo para un caso que, con
correos institucionales verificados por el ADMIN al escribirlos, es poco frecuente. La vía de
recuperación existe y es suficiente: la persona avisa que no recibió nada y el ADMIN usa
`resend-credentials`.

Contenido del correo (texto plano, sin HTML — no hay necesidad de maquetación y el texto plano
no dispara filtros de spam ni requiere plantillas):

```
Asunto: Acceso al sistema Hesperides — Gestión de Áreas Verdes PUCP

Hola {firstName},

Se ha creado tu cuenta en el sistema de gestión de áreas verdes del campus.

Correo de acceso: {email}
Contraseña temporal: {temporaryPassword}

Ingresa en {APP_PUBLIC_URL} y cambia tu contraseña. El sistema te la pedirá
apenas entres; hasta que la cambies no podrás usar el resto de funciones.

Si no esperabas este correo, avisa al administrador del sistema.
```

La contraseña viaja en el cuerpo del correo. Es una debilidad conocida y aceptada, mitigada por
`must_change_password`: deja de ser válida en cuanto la persona entra una vez. La alternativa
—un enlace con token de un solo uso— evita que la contraseña quede en el buzón, pero introduce
un flujo de tokens con expiración y su propia superficie de ataque; queda anotado en §10 como
evolución natural si el cliente lo pide.

### 5.4 Flujos alternativos

- **Campo obligatorio vacío:** validación inline en el formulario, no se envía el request
  (SPEC-C01 §4.2).
- **Correo ya registrado:** el backend responde 409 y el frontend marca el campo `email` con el
  mensaje "Ya existe un usuario con ese correo", sin cerrar el modal ni perder lo escrito.
- **Fallo de envío al crear:** el modal se cierra (la cuenta **sí** se creó), y aparece un
  `Toast` de advertencia: *"Usuario creado, pero no se pudo enviar el correo. Comunícale su
  contraseña o usa Reenviar credenciales."* La fila aparece en el listado con el badge
  **Correo no entregado**.
- **Fallo de envío al reenviar:** `Toast` de error con una advertencia explícita: *"No se pudo
  enviar el correo. La contraseña anterior ya no es válida; comunícale la nueva o vuelve a
  intentar."* Es el caso más delicado del módulo y el mensaje debe decirlo sin rodeos.
- **Error de red:** `Toast` "Error de conexión. Intente de nuevo." (SPEC-C02).
- **Sesión expirada:** el cliente dispara el refresh encolado de SPEC-001 Anexo C; si también
  falla, redirige a login.
- **Usuario inexistente (404):** el listado muestra `EmptyState` con opción de volver; una acción
  sobre una fila que otro ADMIN acaba de eliminar muestra un `Toast` y refresca la tabla.
- **Sin resultados con los filtros aplicados:** `EmptyState` (SPEC-C01 §4.10) con el texto "No se
  encontraron usuarios con esos criterios" y un botón para limpiar filtros — distinto del estado
  "todavía no hay usuarios", que ofrece crear el primero.

### 5.5 Casos límite (Edge Cases)

- **El ADMIN intenta desactivarse a sí mismo:** 422. Sin esta regla, el único administrador puede
  dejarse fuera del sistema con un clic, y la recuperación exige un `UPDATE` manual en la base de
  datos.
- **Se intenta desactivar o degradar al último ADMIN activo:** 422. El sistema quedaría sin nadie
  capaz de crear usuarios, administrar catálogos ni editar parámetros — un estado del que no se
  sale desde la aplicación. La comprobación cuenta administradores activos **excluyendo al
  afectado** y se ejecuta dentro de la misma transacción, con bloqueo pesimista sobre las filas
  contadas, para que dos ADMIN desactivándose simultáneamente no dejen cero (§5.6).
- **Doble clic en Crear:** el botón se deshabilita al primer clic. Además, el índice único parcial
  `idx_users_email_active` de V002 hace que la segunda inserción falle en la base de datos, y el
  servicio la traduce a 409. No se usa `Idempotency-Key` (SPEC-C03 §9.2): ese mecanismo está
  pensado para formularios de campo con conexión intermitente; el alta de usuarios ocurre desde
  un escritorio y ya tiene una clave natural de deduplicación —el correo— que el mecanismo
  genérico no aportaría.
- **Desactivar a alguien ya desactivado / reactivar a alguien ya activo:** idempotente, 200 con el
  estado actual, **sin escribir en `audit_log`**. Auditar un no-cambio llenaría la bitácora de
  filas cuyo `before` y `after` son idénticos.
- **El listado por defecto oculta a los desactivados:** un ADMIN que busca a alguien recién dado
  de baja no lo encuentra y podría crear un duplicado — que fallaría con 409 por correo repetido,
  un error confuso. Mitigación en la UI: cuando la búsqueda no arroja resultados **y** el filtro
  de estado está en "Activos", el `EmptyState` ofrece explícitamente "Buscar también entre los
  desactivados". El defecto se mantiene en "solo activos" porque es lo que se necesita el 95% de
  las veces.
- **Cambio de rol de una persona con sesión abierta:** el rol vive en el `UserDetails` que
  `CustomUserDetailsService` carga en **cada** request (SPEC-001 Anexo B), no en un claim
  congelado del JWT. El cambio surte efecto en el siguiente request, sin esperar a que expire el
  token. No hace falta revocar sesiones al cambiar el rol.
- **Correos con mayúsculas o espacios:** se normalizan a minúsculas y sin espacios en los
  extremos **antes** de validar unicidad y de persistir. `Juan@PUCP.edu.pe ` y `juan@pucp.edu.pe`
  son la misma cuenta; sin normalizar, el índice único los admitiría como dos y el login fallaría
  de forma inexplicable.
- **Nombres con tildes, apóstrofes o emojis:** se aceptan tildes y apóstrofes (`D'Angelo`,
  `Núñez`) sin transformarlos. La búsqueda por `search` es insensible a acentos, de modo que
  "nunez" encuentra a "Núñez". Los emojis no se bloquean pero tampoco se contemplan: el campo es
  texto libre de 100 caracteres y la salida se escapa como cualquier otra (§9.2).
- **Volumen:** el orden de magnitud esperado es de decenas de usuarios, no miles. Aun así el
  listado es paginado desde el primer día (SPEC-C03 §5), porque una tabla sin paginar es una
  decisión que se paga cuando ya hay pantallas construidas encima.
- **Dos ADMIN editando al mismo usuario a la vez:** gana el último en escribir. No se implementa
  bloqueo optimista: son decenas de usuarios administrados por muy pocas personas, y el campo en
  disputa más probable —el rol— queda registrado en `audit_log` con su `before`/`after`, así que
  un cambio pisado es reconstruible. Si el módulo creciera a varios administradores concurrentes,
  la solución sería una columna `version` de JPA, no un rediseño.

### 5.6 Concurrencia en la regla del último ADMIN

Dos administradores desactivándose mutuamente en el mismo instante podrían dejar el sistema sin
ninguno: ambas transacciones leerían "hay 2 administradores activos", ambas concluirían que
pueden proceder, y ambas escribirían. El resultado sería cero.

Se resuelve dentro de la transacción del servicio con una lectura bloqueante:

```sql
SELECT COUNT(*) FROM users u
JOIN catalog_items c ON c.id = u.role_item_id
WHERE c.code = 'ADMIN' AND u.is_active = TRUE AND u.deleted_at IS NULL
  AND u.id <> :targetUserId
FOR UPDATE
```

Si el resultado es 0, se lanza `BusinessRuleException` y la transacción no llega a commit. El
`FOR UPDATE` serializa las dos transacciones: la segunda espera a que la primera termine y
entonces cuenta correctamente. La misma comprobación protege `deactivate` y el cambio de rol en
`PUT` (degradar al último ADMIN tiene el mismo efecto que desactivarlo).

---

## 6. Criterios de aceptación (verificables por cualquiera)

| # | Criterio | Método de verificación |
|---|----------|----------------------|
| CA-01 | Solo un ADMIN puede crear usuarios | Autenticado como COORDINADOR, `POST /api/v1/users` con body válido → 403 con `{ ok: false, message: "Insufficient permissions for this action" }`. El mismo request como ADMIN → 201. Repetir como SUPERVISOR y como OPERARIO → 403 en ambos. |
| CA-02 | Al crear un usuario, la persona recibe un correo con su contraseña y está obligada a cambiarla | Crear un usuario con un correo real de prueba → llega el correo con la contraseña escrita por el ADMIN. Iniciar sesión con ella → el login devuelve 200 y `mustChangePassword: true`. Llamar `GET /api/v1/users` con ese token → 403 `"Password change required before using the system"`. Llamar `POST /api/v1/users/me/password` con la temporal y una nueva → 200. Repetir `GET /api/v1/users` → ya no da 403 por ese motivo. |
| CA-03 | Si el correo no se puede entregar, la cuenta se crea igual y queda marcada | Apagar el servidor SMTP (o poner `SMTP_HOST` inválido) y crear un usuario → 201 con `data.credentialStatus = "PENDING_DELIVERY"`. En `/admin/usuarios` esa fila muestra el badge "Correo no entregado". `SELECT credential_status FROM users WHERE id = {id}` devuelve `PENDING_DELIVERY`. `SELECT action FROM audit_log WHERE entity_id = {id}` incluye `USER_CREDENTIALS_DELIVERY_FAILED`. |
| CA-04 | Desactivar un usuario le corta el acceso y revoca sus sesiones | Con un usuario de prueba con sesión iniciada, ejecutar `POST /api/v1/users/{id}/deactivate` como ADMIN → 200 con `isActive: false`. `POST /api/v1/auth/refresh` con su refresh token → 401. `SELECT COUNT(*) FROM refresh_tokens WHERE user_id = {id} AND revoked_at IS NULL` devuelve 0. `POST /api/v1/auth/login` con sus credenciales correctas → 401. |
| CA-05 | El sistema no puede quedarse sin administradores | En una base con un solo ADMIN activo, `POST /api/v1/users/{suPropioId}/deactivate` → 422 `"You cannot deactivate your own account"`. Crear un segundo ADMIN, desactivar al primero → 200. Intentar desactivar al segundo (ahora único) desde su propia sesión → 422. Intentar cambiarle el rol a OPERARIO con `PUT` → 422 `"Cannot change the role of the last active administrator"`. |
| CA-06 | El listado filtra y busca según los cuatro criterios | `GET /api/v1/users?search=perez` → solo usuarios cuyo nombre, apellido o correo contienen "perez", sin importar mayúsculas ni tildes. `?roleCode=OPERARIO` → solo operarios. `?isActive=false` → solo desactivados. Sin el parámetro `isActive` → ningún elemento con `isActive: false`. `?teamId=2` → solo miembros vigentes de esa cuadrilla. Combinar dos filtros → se aplican en AND. |
| CA-07 | Un SUPERVISOR solo ve a su cuadrilla; un OPERARIO no ve el listado | Autenticado como SUPERVISOR de la cuadrilla 2, `GET /api/v1/users` → todos los elementos devueltos tienen la cuadrilla 2 entre sus `teams`. `GET /api/v1/users/{id}` de alguien de otra cuadrilla → 404. Como OPERARIO, `GET /api/v1/users` → 403; `GET /api/v1/users/{suPropioId}` → 200. |
| CA-08 | Ninguna respuesta expone la contraseña | Ejecutar `GET /api/v1/users`, `GET /api/v1/users/{id}`, `POST /api/v1/users`, `PUT /api/v1/users/{id}` y `POST /api/v1/users/{id}/resend-credentials`, y buscar en cada JSON completo las cadenas `passwordHash`, `password_hash`, `password` y `temporaryPassword` → no aparece ninguna, a ninguna profundidad de anidamiento. |
| CA-09 | Un ADMIN no puede fijar la contraseña de otro usuario | Inspeccionar el formulario de edición en `/admin/usuarios` → no existe campo de contraseña. `PUT /api/v1/users/{id}` con un campo extra `"password": "loquesea"` en el body → 200, y la contraseña del usuario **no cambia** (verificable iniciando sesión con la anterior, que sigue funcionando). |
| CA-10 | Las cinco acciones dejan rastro en `audit_log` | Crear un usuario, cambiarle el rol, desactivarlo, reactivarlo y provocar un fallo de envío. Luego `SELECT action, entity_type, entity_id, changes FROM audit_log WHERE entity_type = 'User' ORDER BY created_at` → aparecen `USER_CREATED`, `USER_ROLE_CHANGED` (con `before`/`after` del rol), `USER_DEACTIVATED` (`{"isActive": {"before": true, "after": false}}`), `USER_REACTIVATED` y `USER_CREDENTIALS_DELIVERY_FAILED`. Desactivar dos veces seguidas al mismo usuario genera **una sola** fila `USER_DEACTIVATED`. |
| CA-11 | Cambiar la propia contraseña expulsa las demás sesiones pero no la actual | Iniciar sesión con el mismo usuario en dos navegadores. En el primero, `POST /api/v1/users/me/password` → 200. Seguir navegando en el primero → funciona. En el segundo, esperar a que expire el access token y dejar que dispare el refresh → 401 y redirección a login. |
| CA-12 | La migración V100 añade exactamente las tres columnas | `docker-compose down -v && docker-compose up --build` levanta sin error de Flyway. `\d users` en `psql` muestra, además de las columnas de V002, `credential_status` (VARCHAR(20) NOT NULL DEFAULT 'DELIVERED'), `must_change_password` (BOOLEAN NOT NULL DEFAULT FALSE) y `credentials_sent_at` (TIMESTAMP). `INSERT` con `credential_status = 'OTRO'` → falla por el CHECK. |

---

## 7. Especificación visual

### 7.1 Web (Next.js)

**Pantalla `/admin/usuarios`:**

- Responsive: móvil (<640px), tablet (640–1024px), desktop (>1024px). En móvil, el `DataTable`
  colapsa a tarjetas apiladas (SPEC-C01 §9.1).
- Layout de arriba abajo: título "Usuarios" + botón primario **Nuevo usuario** (solo visible para
  ADMIN) · barra de filtros · tabla · paginación.
- Barra de filtros: campo de búsqueda con icono de lupa y *debounce* de 300 ms; `Select` de rol
  alimentado por `useCatalog('ROLE')`; `Select` de estado (Activos / Desactivados / Todos, con
  "Activos" preseleccionado); `Select` de cuadrilla. Un botón "Limpiar filtros" aparece solo
  cuando hay alguno aplicado.
- Columnas de la tabla: Nombre completo · Correo · Rol (`Badge`) · Estado (`StatusBadge`: verde
  "Activo" / gris "Desactivado") · Entrega de credenciales (`Badge` ámbar "Correo no entregado",
  visible **solo** cuando `credentialStatus = PENDING_DELIVERY`) · Último ingreso ("Nunca" si es
  `null`) · Acciones.
- Acciones por fila (solo ADMIN): Editar · Desactivar o Reactivar según el estado · Reenviar
  credenciales · Marcar como entregada (solo si está pendiente). Para COORDINADOR y SUPERVISOR la
  columna de acciones no se renderiza.
- **Ocultar controles según el rol es una decisión de usabilidad, no de seguridad.** Un
  COORDINADOR no ve el botón de desactivar porque mostrarle algo que siempre fallaría con 403
  sería confuso, no porque eso lo impida: quien de verdad lo impide es `@PreAuthorize` en el
  controller (§3). Nunca se debe implementar un permiso únicamente escondiendo un botón.
- Estados de componentes: default, hover, active, disabled, error, loading. Mientras carga la
  primera página se muestra `LoadingSkeleton` con la forma de la tabla, no un spinner centrado:
  evita el salto de layout al llegar los datos.
- Confirmación destructiva: desactivar y reenviar credenciales abren un `Modal` de confirmación
  con el nombre de la persona escrito en el texto ("¿Desactivar la cuenta de María García?"). El
  de reenviar advierte además que la contraseña anterior dejará de funcionar.
- Feedback: `Toast` verde al crear, editar, desactivar y reactivar; `Toast` ámbar cuando la
  entrega de correo falla; `Toast` rojo en error de red o de servidor.

**Pantalla `/cambiar-password`:**

- Layout centrado de una sola columna, sin barra de navegación ni menú lateral: mientras
  `mustChangePassword` sea `true` no hay ningún otro destino al que ir, y ofrecer enlaces que
  llevan a un 403 sería engañoso.
- Tres campos: contraseña actual, nueva, repetir nueva. Indicador de cumplimiento de la política
  (§9.1) que se actualiza mientras se escribe, con cada requisito como una línea que pasa de gris
  a verde.
- El botón de confirmar permanece deshabilitado hasta que la política se cumple y las dos copias
  de la contraseña nueva coinciden.
- Mensaje de encabezado: "Por seguridad, cambia la contraseña que recibiste por correo antes de
  continuar."

### 7.2 Móvil (React Native)

No aplica a la administración de usuarios (§2.3). La pantalla de cambio obligatorio de
contraseña se especifica en el spec de la app móvil; consumirá
`POST /api/v1/users/me/password` sin cambios.

### 7.3 Referencia visual

No hay Figma para este módulo. La descripción textual de §7.1 es la referencia, y se apoya
íntegramente en componentes ya especificados en SPEC-C01: no se introduce ningún patrón visual
nuevo. Cualquier duda de espaciado, color o tipografía se resuelve con los tokens de SPEC-C01 §3,
nunca inventando valores.

---

## 8. Tests que la IA debe generar

> REGLA: la IA genera tests ANTES de la implementación.

### 8.1 Tests unitarios (backend — JUnit 5 + Mockito)

```
UsersService.create() con datos válidos → persiste con mustChangePassword=TRUE y llama a CredentialDeliveryService
UsersService.create() con correo ya registrado entre vigentes → lanza DuplicateResourceException
UsersService.create() con correo de un usuario desactivado → tiene éxito (el índice único es parcial)
UsersService.create() normaliza el correo a minúsculas y sin espacios antes de persistir
UsersService.create() con roleCode inexistente → lanza BusinessRuleException
UsersService.create() con roleCode de un catalog_item inactivo → lanza BusinessRuleException
UsersService.create() cuando el envío SMTP falla → la entidad queda persistida con credentialStatus=PENDING_DELIVERY
UsersService.create() cuando el envío SMTP falla → registra USER_CREDENTIALS_DELIVERY_FAILED en audit_log
UsersService.create() nunca escribe la contraseña en claro: el valor persistido difiere del recibido y valida con BCrypt

UsersService.update() con cambio de rol → registra USER_ROLE_CHANGED con before y after
UsersService.update() sin cambio de rol → NO registra USER_ROLE_CHANGED
UsersService.update() que degradaría al último ADMIN activo → lanza BusinessRuleException
UsersService.update() con el correo de otro usuario vigente → lanza DuplicateResourceException
UsersService.update() con el mismo correo que ya tenía → tiene éxito
UsersService.update() sobre un id inexistente → lanza NotFoundException
UsersService.update() ignora cualquier campo de contraseña presente en el DTO

UsersService.deactivate() → is_active=FALSE y revoca todos los refresh tokens del usuario
UsersService.deactivate() sobre uno ya desactivado → no falla y NO vuelve a auditar
UsersService.deactivate() del propio usuario autenticado → lanza BusinessRuleException
UsersService.deactivate() del último ADMIN activo → lanza BusinessRuleException
UsersService.deactivate() de un ADMIN cuando hay otro activo → tiene éxito
UsersService.reactivate() → is_active=TRUE, audita USER_REACTIVATED, no restaura refresh tokens
UsersService.reactivate() sobre uno ya activo → no falla y NO vuelve a auditar

UsersService.resendCredentials() → nueva password_hash distinta, mustChangePassword=TRUE, revoca refresh tokens
UsersService.resendCredentials() sobre un usuario inactivo → lanza BusinessRuleException
UsersService.markCredentialsDelivered() sobre uno en DELIVERED → lanza BusinessRuleException
UsersService.changeOwnPassword() con contraseña actual incorrecta → lanza InvalidCredentialsException
UsersService.changeOwnPassword() con la nueva igual a la actual → lanza BusinessRuleException
UsersService.changeOwnPassword() válido → mustChangePassword=FALSE y revoca los demás refresh tokens salvo el actual
UsersService.changeOwnPassword() con una contraseña que incumple la política → lanza ValidationException

UsersService.findAll() como SUPERVISOR → la Specification incluye el filtro de cuadrilla propia
UsersService.findAll() sin filtro isActive → la Specification restringe a is_active = TRUE
UsersService.findById() como SUPERVISOR sobre alguien de otra cuadrilla → lanza NotFoundException
UsersService.findById() de la propia ficha como OPERARIO → tiene éxito

TemporaryPasswordGenerator.generate() → cumple la política de §9.1 en 1000 iteraciones consecutivas
TemporaryPasswordGenerator.generate() → dos llamadas seguidas devuelven valores distintos
```

### 8.2 Tests de integración (backend — `@SpringBootTest` con Testcontainers)

```
POST /api/v1/users como ADMIN con body válido → 201 + header Location + data sin passwordHash
POST /api/v1/users como COORDINADOR → 403
POST /api/v1/users como SUPERVISOR → 403
POST /api/v1/users como OPERARIO → 403
POST /api/v1/users sin token → 401
POST /api/v1/users con email inválido → 400 con errors[].field = "email"
POST /api/v1/users con contraseña que incumple la política → 400 con errors[].field = "initialPassword"
POST /api/v1/users con correo duplicado → 409
POST /api/v1/users con roleCode inexistente → 422
POST /api/v1/users con SMTP caído (GreenMail detenido) → 201 con credentialStatus=PENDING_DELIVERY
POST /api/v1/users con SMTP activo (GreenMail) → el buzón recibe un correo cuyo cuerpo contiene la contraseña enviada

GET /api/v1/users como ADMIN → 200 con la forma Page<T> de SPEC-C03 §5.2
GET /api/v1/users?search=... → filtra por nombre, apellido y correo, insensible a mayúsculas y tildes
GET /api/v1/users?roleCode=OPERARIO → solo operarios
GET /api/v1/users?isActive=false → solo desactivados
GET /api/v1/users sin isActive → ningún desactivado en la respuesta
GET /api/v1/users?teamId=2 → solo miembros vigentes de esa cuadrilla
GET /api/v1/users?size=500 → se aplica clamping a 100, no 400 (SPEC-C03 §5.1)
GET /api/v1/users como SUPERVISOR → solo miembros de su cuadrilla
GET /api/v1/users como OPERARIO → 403
GET /api/v1/users/{id} como SUPERVISOR sobre alguien de otra cuadrilla → 404
GET /api/v1/users/{id} inexistente → 404

PUT /api/v1/users/{id} como ADMIN → 200 con el recurso actualizado
PUT /api/v1/users/{id} degradando al último ADMIN → 422
POST /api/v1/users/{id}/deactivate → 200, is_active=FALSE en BD y refresh_tokens revocados
POST /api/v1/users/{id}/deactivate sobre uno mismo → 422
POST /api/v1/users/{id}/deactivate del último ADMIN → 422
POST /api/v1/users/{id}/deactivate dos veces → 200 ambas, una sola fila en audit_log
POST /api/v1/users/{id}/reactivate → 200 e is_active=TRUE
POST /api/v1/users/{id}/resend-credentials → 200, password_hash cambia, refresh tokens revocados
POST /api/v1/users/{id}/resend-credentials sobre un inactivo → 422
POST /api/v1/users/{id}/mark-credentials-delivered sobre uno pendiente → 200 y credentialStatus=DELIVERED
POST /api/v1/users/{id}/mark-credentials-delivered sobre uno ya entregado → 422

POST /api/v1/users/me/password con la actual correcta → 200 y mustChangePassword=FALSE
POST /api/v1/users/me/password con la actual incorrecta → 400 (no 401)
POST /api/v1/users/me/password con la nueva igual a la actual → 422
GET /api/v1/users con un token de un usuario con mustChangePassword=TRUE → 403 "Password change required"
POST /api/v1/users/me/password con mustChangePassword=TRUE → 200 (la excepción del interceptor)
GET /api/v1/auth/me con mustChangePassword=TRUE → 200 (excepción del interceptor)

Login de un usuario recién creado → 200 con mustChangePassword=true en la respuesta
Flyway aplica V100 sobre una base con V002 ya aplicada, sin conflicto de checksum
```

### 8.3 Tests frontend (Jest + React Testing Library)

```
UsersTable renderiza las filas con nombre, correo, rol y estado
UsersTable muestra LoadingSkeleton mientras carga
UsersTable muestra EmptyState cuando no hay resultados
UsersTable muestra el badge "Correo no entregado" solo si credentialStatus es PENDING_DELIVERY
UsersTable no renderiza la columna de acciones para un COORDINADOR
UsersTable no renderiza la columna de acciones para un SUPERVISOR
UsersTable muestra "Nunca" cuando lastLogin es null

UserFormModal con datos válidos → llama a la API con el payload correcto
UserFormModal con correo inválido → muestra validación inline y NO llama a la API
UserFormModal con campos obligatorios vacíos → muestra validación inline y NO llama a la API
UserFormModal deshabilita el botón de envío tras el primer clic
UserFormModal en modo edición NO renderiza ningún campo de contraseña
UserFormModal ante un 409 muestra el error en el campo de correo sin cerrarse ni perder lo escrito

UserFilters con debounce → una sola llamada a la API tras 300 ms de inactividad al escribir
UserFilters preselecciona el estado "Activos"
UserFilters muestra "Limpiar filtros" solo cuando hay alguno aplicado

Página de cambio de contraseña deshabilita el envío hasta que se cumple la política
Página de cambio de contraseña muestra error si las dos copias de la nueva no coinciden
Página de cambio de contraseña ante un 400 muestra "La contraseña actual es incorrecta"
El guard de navegación redirige a /cambiar-password cuando mustChangePassword es true
```

### 8.4 Tests E2E (si aplica)

```
Un ADMIN crea un usuario, la persona recibe el correo (buzón GreenMail), inicia sesión con la
contraseña temporal, es redirigida a /cambiar-password, la cambia, y accede al sistema con
normalidad.

Un ADMIN desactiva a un usuario que tiene sesión abierta en otra pestaña; esa pestaña queda
fuera del sistema en cuanto expira su access token.
```

---

## 9. Seguridad

- [x] Validación en backend (Bean Validation) además de en frontend. El frontend valida para dar
      feedback inmediato; el backend valida porque es el único lugar donde la validación no se
      puede saltar.
- [x] Todos los endpoints exigen JWT válido. No hay ninguno público en este módulo.
- [x] Roles necesarios: CUD solo ADMIN; lectura ADMIN y COORDINADOR (todos) y SUPERVISOR (su
      cuadrilla); `POST /users/me/password` cualquier autenticado sobre su propia cuenta. Coincide
      exactamente con el Anexo A de SPEC-001, sin reinterpretarlo.
- [x] Datos que NO deben exponerse en ninguna respuesta: `password_hash`, la contraseña temporal
      generada (existe únicamente en memoria y en el cuerpo del correo), y los `token_hash` de
      `refresh_tokens`.
- [x] Inyección SQL: todo el acceso a datos pasa por JPA y `Specification`; ninguna consulta se
      arma concatenando cadenas. El `search` viaja como parámetro vinculado, nunca interpolado.
- [x] XSS: nombres y correos son texto libre. React escapa por defecto en el renderizado; se
      prohíbe `dangerouslySetInnerHTML` sobre cualquier dato de usuario. En el correo, el cuerpo
      es texto plano, de modo que no hay contexto HTML donde inyectar.
- [x] Acciones auditables: sí, cinco (§9.3).
- [x] Qué se registra en logs y qué NO: §9.4.

### 9.1 Política de contraseñas

Aplica por igual a la contraseña inicial que escribe el ADMIN, a la temporal que genera el
sistema y a la que la persona elige:

- Mínimo 10 caracteres, máximo 72 (el límite real de BCrypt: más allá de 72 bytes trunca en
  silencio, y una contraseña truncada sin aviso es peor que una corta).
- Al menos una letra minúscula, una mayúscula y un dígito.
- No puede coincidir con el correo ni con el nombre o apellido del usuario.
- No se exige un carácter especial: alarga la contraseña sin aumentar la entropía de forma
  significativa y empuja a la gente a patrones predecibles (`Password1!`). La longitud mínima de
  10 aporta más.
- La contraseña temporal que genera el sistema usa `SecureRandom` sobre un alfabeto sin
  caracteres ambiguos (sin `l`, `I`, `1`, `O`, `0`), porque a menudo se dicta por teléfono o se
  copia a mano desde el correo.

### 9.2 Por qué el 404 en vez del 403 para el SUPERVISOR

Cuando un SUPERVISOR pide la ficha de alguien de otra cuadrilla, la respuesta es 404, no 403. Un
403 confirmaría que el `id` existe, permitiendo enumerar la plantilla completa iterando ids. El
404 no distingue "no existe" de "no te corresponde". Es la misma razón por la que SPEC-001 §2.6
devuelve un mensaje genérico en el login de un usuario desactivado.

Esto es deliberadamente distinto del 403 que devuelve el **listado** a un OPERARIO: ahí no se
filtra la existencia de ningún recurso concreto, solo se dice que el rol no alcanza para esa
operación.

### 9.3 Acciones auditables de este módulo

| Acción | Cuándo | `changes` |
|---|---|---|
| `USER_CREATED` | Alta exitosa | `{ "email": "...", "roleCode": "OPERARIO" }` — nunca la contraseña |
| `USER_ROLE_CHANGED` | `PUT` que cambia el rol | `{ "roleItemId": { "before": 3, "after": 2 }, "roleCode": { "before": "OPERARIO", "after": "COORDINADOR" } }` |
| `USER_DEACTIVATED` | Desactivación efectiva | `{ "isActive": { "before": true, "after": false } }` |
| `USER_REACTIVATED` | Reactivación efectiva | `{ "isActive": { "before": false, "after": true } }` |
| `USER_CREDENTIALS_DELIVERY_FAILED` | **Nueva** (§2.5). Fallo de envío al crear o reenviar | `{ "email": "...", "reason": "SMTP connection refused" }` |

Las cuatro primeras ya figuran en SPEC-004 §3.2 y aquí solo se implementan. La quinta se añade a
aquella tabla como parte de esta entrega.

**Por qué `USER_CREDENTIALS_DELIVERY_FAILED` merece una fila en `audit_log` y no solo un log
SLF4J:** el criterio de SPEC-004 §3.4 es si alguien necesitará reconstruir el hecho meses
después sin depender de logs rotados. Una persona que nunca pudo entrar al sistema es una
pregunta que aparece semanas más tarde ("¿por qué este operario nunca registró nada?"), y su
respuesta —el correo rebotó el día del alta— tiene que sobrevivir a la rotación de logs. Además
es un hecho de volumen bajo por definición: solo se escribe cuando algo falla.

`reason` guarda el mensaje técnico de la excepción SMTP, nunca la contraseña ni el cuerpo del
correo.

**Lo que NO se audita en este módulo** (queda en SLF4J, según SPEC-004 §3.4): la edición de
nombre o apellido sin cambio de rol (`updated_by_user_id` de SPEC-004 §4.2 ya dice quién tocó la
fila), los envíos de correo exitosos, y cualquier `GET`.

### 9.4 Qué se registra en logs y qué no

- **Sí:** id del usuario afectado, id del administrador que ejecuta, acción, resultado del envío
  SMTP (éxito/fallo y motivo técnico), duración de la petición.
- **Nunca:** la contraseña inicial, la temporal generada, ningún `password_hash`, ningún
  `token_hash`, ni el cuerpo completo del correo enviado.
- El correo del usuario **sí** aparece en los logs: es su identificador de negocio y sin él los
  registros no sirven para diagnosticar. Es coherente con SPEC-001 §9.2, que ya registra el
  correo en los intentos de login.

---

## 10. Consideraciones de extensibilidad

- [x] **Catálogos configurables en vez de enums:** el rol es un `catalog_item` de tipo `ROLE`. Si
      la PUCP (u otro cliente) necesita un quinto rol, se crea desde `/admin/catalogs` y este
      módulo lo ofrece en el select sin recompilar. Lo único que no se resuelve solo son los
      permisos del rol nuevo, que viven en las expresiones `@PreAuthorize` de cada controller —
      una limitación heredada del diseño de SPEC-001, no introducida aquí.
- [x] **Lógica de negocio en el Service, no en el Controller:** el `UsersController` parsea,
      valida el schema y delega. Las reglas del último ADMIN, la normalización del correo y la
      orquestación del envío viven en `UsersServiceImpl`.
- [x] **Textos de UI externalizables:** ningún literal de interfaz se escribe directamente en el
      JSX; todos salen del módulo de textos, incluida la plantilla del correo, que debe poder
      traducirse sin tocar el servicio que la envía.
- [x] **Reglas específicas de PUCP en configuración, no en código:** no se valida que el correo
      termine en `@pucp.edu.pe`. La unidad de áreas verdes emplea personal contratado que puede no
      tener correo institucional, y codificar el dominio impediría reutilizar el sistema en otro
      cliente. Si más adelante se quisiera restringir el dominio, sería un parámetro de
      `system_parameters`, nunca una constante en el código.
- **Evolución natural (no se implementa ahora):** sustituir la contraseña en el correo por un
  enlace con token de un solo uso y expiración. Cuando se haga, `must_change_password` y
  `credential_status` siguen sirviendo tal cual; lo único que cambia es qué viaja en el correo y
  un endpoint público nuevo para canjear el token. El diseño de este spec no lo estorba.
- **Evolución natural:** detección de rebotes diferidos procesando el buzón de `SMTP_FROM`. El
  estado `PENDING_DELIVERY` ya existe para representar el resultado; solo haría falta quien lo
  escriba de forma asíncrona.

---

## 11. Checklist de verificación (para el desarrollador)

### Antes de pedir código a la IA

- [x] ¿El spec tiene objetivo claro y en una oración? — §1
- [x] ¿Los contratos de API están definidos con tipos exactos? — §3, nueve endpoints
- [x] ¿La migración SQL está definida? — §4, V100 (`ALTER`, no `CREATE`)
- [x] ¿Hay al menos 5 criterios de aceptación verificables? — §6, doce
- [x] ¿Se contemplan flujos alternativos y edge cases? — §5.4, §5.5, §5.6
- [x] ¿Se especifica comportamiento para web Y móvil? — §7.1 y §2.3 (móvil fuera de alcance, con
      su justificación)
- [ ] ¿Alguien más revisó y aprobó el spec?

### Después de recibir código de la IA

- [ ] El código respeta la estructura de carpetas del proyecto.
- [ ] El paquete Java es `pe.edu.pucp.hesperides.modules.users.[capa]`.
- [ ] Los componentes TypeScript están en `frontend/src/components/users/`.
- [ ] Los nombres de clases y componentes siguen las convenciones.
- [ ] La migración Flyway es `V100__add_credential_columns_to_users.sql` y usa `ALTER TABLE`.
- [ ] No se instalaron dependencias no autorizadas (solo `spring-boot-starter-mail`).
- [ ] Los tests generados cubren los doce criterios de aceptación.
- [ ] Todos los tests pasan (`mvn test` / `npm test`).
- [ ] La funcionalidad se probó manualmente en web, incluido el caso de SMTP caído.
- [ ] No hay datos hardcodeados: ni el dominio `@pucp.edu.pe`, ni el host SMTP, ni la URL pública.
- [ ] Los mensajes de error son claros para el usuario final.
- [ ] No hay `System.out.println` ni `console.log` de depuración.
- [ ] Se usó desactivación lógica (`is_active`), no `DELETE` físico ni `deleted_at`.
- [ ] El rol se resuelve contra `catalog_items`; no hay ningún `enum` de rol ni `@Enumerated`
      sobre el rol.
- [ ] `User` extiende `BaseEntity` y no redeclara `id`, `createdAt`, `updatedAt` ni `deletedAt`.
- [ ] La autorización de cada endpoint coincide con la matriz del Anexo A de SPEC-001.
- [ ] Ninguna respuesta ni log contiene contraseñas, hashes ni tokens.
- [ ] El envío de correo ocurre fuera de la transacción del alta.
