# SPEC-001 — Autenticación y autorización

## Metadatos

| Campo | Valor |
|-------|-------|
| HU relacionada | — (spec fundacional, no deriva de una HU) |
| Autor del spec | Equipo Hesperides |
| Plataforma | Ambas (web y móvil comparten el mismo backend y los mismos endpoints) |
| Prioridad | Alta |
| Sprint | S0 (fundacional) |
| Dependencias | SPEC-000 (arquitectura y convenciones), SPEC-002 (modelo de datos — consume `users`), SPEC-003 (catálogos configurables — este spec añade ítems a `ROLE`) |
| Fecha límite | Fin de Semana 1 |

---

## 1. Objetivo

Permitir que un administrador, un coordinador o un operario de campo inicien sesión con credenciales propias del sistema y que cada acción que realicen quede autorizada según su rol, para que solo quien tiene permiso pueda ver o modificar cada módulo de la gestión de áreas verdes del campus.

## 2. Contexto para la IA

> INSTRUCCIÓN: antes de generar código, la IA debe leer obligatoriamente:
> - Este spec completo
> - SPEC-000 (arquitectura y convenciones) — sección 7, apartado SPEC-001
> - SPEC-002 (modelo de datos) — todas las tablas de dominio tienen FK a `users(id)`, que este spec crea
> - SPEC-003 (catálogos configurables) — los roles son `catalog_items` del tipo `ROLE`, no un enum Java
> - SPEC-C02 (manejo de errores) — el sobre `{ ok, message, data }` y las excepciones custom
> - SPEC-C03 (patrones de API) — formato de endpoints y paginación

**Este spec posee la migración V002.** SPEC-002 la referencia como FK y da por hecho que la tabla `users` existe con exactamente la forma que aquí se define. Ningún otro spec crea ni altera `users`.

### 2.1 Módulo backend

- Paquete: `pe.edu.pucp.hesperides.modules.auth`
- Entidades JPA involucradas: `User` (este spec). `CatalogItem` (SPEC-003) por FK de rol.
- Repositorios necesarios: `UsersRepository`, `RefreshTokensRepository`
- Servicio: `AuthService` / `AuthServiceImpl`, `UsersService` / `UsersServiceImpl` (CRUD de usuarios del módulo 1.1)
- Controller: `AuthController`, ruta base `/api/v1/auth`. `UsersController`, ruta base `/api/v1/users` (CRUD de gestión de usuarios; contratos detallados en un SPEC-1XX de feature — este spec solo fija el modelo, el hashing y los cuatro endpoints de sesión).
- Paquete transversal: `pe.edu.pucp.hesperides.shared.security` — `JwtTokenProvider`, `JwtAuthenticationFilter`, `SecurityConfig`, `CustomUserDetailsService`.

### 2.2 Módulo frontend (web)

- Ruta: `/(auth)/login` (Next.js App Router, grupo de rutas sin layout autenticado)
- Componentes nuevos a crear: `LoginForm` (`components/forms/LoginForm.tsx`)
- Componentes existentes a reutilizar: `Button`, `Input`, `Toast` (SPEC-C01)
- Hook(s) necesario(s): `useAuth` (`hooks/useAuth.ts`) — expone `user`, `login()`, `logout()`, `isLoading`. Contexto de React (`AuthContext`) que carga `GET /auth/me` al montar la app.
- Extiende `frontend/src/lib/api.ts` en el punto ya marcado (línea del comentario `SPEC-001 extension point`): añade el interceptor de 401 con cola de refresh (sección 6).

### 2.3 Módulo móvil

- Pantalla: `LoginScreen`
- Ubicación en navegación: raíz de un `AuthStack` fuera del navigator autenticado; React Navigation cambia de stack según el estado de `useAuth`.
- Diferencias con web: el token de acceso y el de refresco se guardan en `SecureStore` (Expo) / Keychain, y se envían en la cabecera `Authorization: Bearer {accessToken}` en cada request. **No** hay cookie ni CSRF en este flujo — ver sección 5 para cómo el mismo backend distingue ambos.

### 2.4 Restricciones técnicas

**Librerías que DEBE usar:**

- `spring-boot-starter-security` — nueva dependencia en `backend/pom.xml`.
- `io.jsonwebtoken:jjwt-api` + `jjwt-impl` + `jjwt-jackson` (JJWT, versión estable 0.12.x) — nuevas dependencias. Es la librería de firma/verificación JWT; Spring Security no incluye una por defecto.
- `BCryptPasswordEncoder` de Spring Security para el hash de contraseñas.
- `js-cookie` **no** se usa en el cliente web: la cookie es `httpOnly`, por lo que JavaScript no puede ni debe leerla. El navegador la envía solo porque `fetch` ya usa `credentials: 'include'` (`frontend/src/lib/api.ts`, línea 33).
- `expo-secure-store` (o `@react-native-keychain` si el proyecto no usa Expo) en móvil para el almacenamiento de tokens.

**Librerías que NO debe usar:**

- `localStorage` o `sessionStorage` para tokens en web: expuestos a XSS, prohibido por SPEC-000.
- `AsyncStorage` para tokens en móvil: no cifrado, solo apto para datos no sensibles.
- Ningún `@Enumerated` de Java para roles ni un `enum RoleEnum`. El rol es una FK a `catalog_items`.
- Ninguna librería de sesión basada en estado del lado del servidor (Spring Session, Redis de sesión): la autenticación es JWT stateless, con revocación vía tabla de refresh tokens (sección 4).

**Patrón de catálogos aplicable:** `ROLE` (`catalog_type`, sembrado en V001, completado en V002 de SPEC-002 con `COORDINADOR`, `SUPERVISOR` y `OPERARIO`, y con `USER` desactivado). Este spec no vuelve a sembrar `ROLE`: ya está resuelto por SPEC-002 V010. Este spec solo lo consume por FK.

### 2.5 Decisión: alta de cuentas cerrada, sin autorregistro

**No existe endpoint de registro público.** Las cuentas las crea un administrador desde el módulo de gestión de usuarios (`POST /api/v1/users`, fuera del alcance de contratos de este spec, dentro del alcance de su modelo de datos). Razones:

- El cliente confirmó que **no hay integración con los sistemas de autenticación de la PUCP** (ítem 1.3 del análisis funcional): no existe un directorio externo (LDAP/SSO institucional) contra el cual validar que quien se registra es personal autorizado del campus.
- Los cuatro roles (administrador, coordinador, supervisor de cuadrilla, operario) son personal contratado o asignado por la unidad de áreas verdes, un conjunto cerrado y pequeño (decenas de personas, no miles). Un registro abierto obligaría a un flujo de aprobación posterior de todas formas — es más simple que el administrador cree la cuenta una sola vez.
- Un operario de campo no elige unirse al sistema: se le asigna una cuenta como parte de su alta administrativa. Igual que un lector de tarjeta de acceso al campus.
- Registro abierto + verificación por correo institucional era la alternativa considerada; se descarta porque añadiría una superficie de ataque (creación de cuentas no autorizadas por cualquiera que conozca la URL) sin necesidad real del dominio: no hay un público del que dar de alta a sí mismo, solo personal ya contratado.

> **Enmienda (SPEC-100 §2.5).** La redacción original de este apartado descartaba el registro
> abierto argumentando además que "no hay integración con correo PUCP en el alcance de este
> proyecto (SPEC-000 §1: sin dependencia de servicios externos)". **Ese argumento ya no es
> correcto:** SPEC-100 incorpora el envío de correo por SMTP al alcance del proyecto, y SPEC-000
> §1 fue enmendado para admitirlo como su única dependencia externa.
>
> **La decisión de fondo no cambia: sigue sin haber autorregistro.** El sistema envía correo para
> **entregar** las credenciales de una cuenta que un administrador creó, no para que un
> desconocido se dé de alta solo. Los tres primeros argumentos de esta lista —conjunto cerrado de
> personal, ausencia de directorio institucional contra el cual validar, y el hecho de que a un
> operario se le asigna la cuenta en vez de solicitarla— se sostienen por sí mismos y son los que
> gobiernan.
>
> Cómo llega entonces la contraseña a su destinatario: SPEC-100 §5.1 y §5.3. Qué pasa si el
> correo no se puede entregar: SPEC-100 §2.6 (`credential_status`).

### 2.6 Decisión: sesión de un usuario desactivado

Desactivar un usuario (`is_active = FALSE`) es la única forma de "borrarlo" (SPEC-000: soft delete, nunca `DELETE`). Reglas:

- **Login:** si `is_active = FALSE`, el login falla con 401 y mensaje genérico (ver sección 9 — no se distingue de credenciales inválidas, para no confirmar a un atacante que el correo existe pero está desactivado).
- **Sesión ya activa en el momento de la desactivación:** el access token vigente (máx. 30 min de vida) sigue siendo criptográficamente válido hasta que expira — el filtro JWT no consulta la base de datos en cada request por diseño stateless. Esto es una ventana de exposición aceptada y acotada a 30 minutos como máximo, igual que en cualquier JWT sin revocación de access token.
- **Lo que sí se corta de inmediato:** todos los refresh tokens del usuario se revocan (`revoked_at = NOW()`) en el mismo momento en que un administrador lo desactiva (lo ejecuta `UsersService.deactivate()`, fuera de este contrato de API pero dependiente de `RefreshTokensRepository` que este spec sí define). Efecto: en cuanto el access token expira, `POST /auth/refresh` devuelve 401 y el usuario queda fuera. La ventana máxima de acceso post-desactivación es 30 minutos, no 7 días.
- `GET /auth/me` y cualquier endpoint protegido válidan además `is_active` en cada request contra la base (no solo la firma del JWT) precisamente para acotar esa ventana a algo menor a los 30 minutos en la práctica: el filtro JWT carga el usuario por `CustomUserDetailsService`, y `UserDetails.isEnabled()` devuelve `is_active`. Spring Security responde 401 en cuanto ese `UserDetails` está deshabilitado, incluso con firma y expiración válidas.

## 3. Contratos de API

Los cuatro endpoints son los únicos que este spec contractualiza en detalle. `POST/GET/PUT /api/v1/users` (CRUD 1.1) y `GET/POST /api/v1/roles` o el endpoint de catálogo `GET /api/v1/catalogs/ROLE/items` (1.2) se especifican en su propio SPEC-1XX de feature, y usan `UsersRepository` y el catálogo `ROLE` que este spec deja listos.

### POST /api/v1/auth/login

**Descripción:** Autentica con email y contraseña propios del sistema. Emite un access token y, según la plataforma, deja el refresh token en una cookie `httpOnly` (web) o lo devuelve en el cuerpo (móvil) para que el cliente lo guarde en SecureStore/Keychain.

**Headers:**
```
Content-Type: application/json
X-Client-Type: web | mobile   (opcional; por defecto "web" — ver sección 5.1)
```

**Request body:**
```json
{
  "email": "string (requerido, formato email, máx 255 chars)",
  "password": "string (requerido, mín 8 chars)"
}
```

**Response 200 (web — `X-Client-Type: web` o ausente):**

Cookies de respuesta:
```
Set-Cookie: refresh_token=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=604800
```

```json
{
  "ok": true,
  "message": "Login successful",
  "data": {
    "accessToken": "string (JWT)",
    "expiresIn": 1800,
    "user": {
      "id": 1,
      "email": "coordinador@hesperides.pucp.edu.pe",
      "fullName": "Ana Torres",
      "role": { "id": 5, "code": "COORDINADOR", "label": "Coordinador" }
    }
  }
}
```

**Response 200 (móvil — `X-Client-Type: mobile`):**
```json
{
  "ok": true,
  "message": "Login successful",
  "data": {
    "accessToken": "string (JWT)",
    "refreshToken": "string (JWT)",
    "expiresIn": 1800,
    "user": {
      "id": 3,
      "email": "operario1@hesperides.pucp.edu.pe",
      "fullName": "Luis Vera",
      "role": { "id": 6, "code": "OPERARIO", "label": "Operario de campo" }
    }
  }
}
```

**Response 401 (credenciales inválidas o usuario desactivado — mismo mensaje para ambos casos):**
```json
{
  "ok": false,
  "message": "Invalid email or password",
  "data": null
}
```

**Response 400 (validación):**
```json
{
  "ok": false,
  "message": "Validation failed",
  "data": {
    "errors": [
      { "field": "email", "message": "Debe ser un correo válido" },
      { "field": "password", "message": "No puede estar vacío" }
    ]
  }
}
```

**Response 429 (bloqueo por fuerza bruta, ver sección 9):**
```json
{
  "ok": false,
  "message": "Too many failed attempts. Try again in 15 minutes.",
  "data": null
}
```

---

### POST /api/v1/auth/refresh

**Descripción:** Cambia un refresh token vigente por un nuevo access token. En web, el refresh token viaja en la cookie `httpOnly` y no se toca en el body. En móvil, viaja explícito en el body porque no hay cookie.

**Headers (web):**
```
Content-Type: application/json
Cookie: refresh_token=<jwt>   (enviado automáticamente por el navegador, credentials: 'include')
```

**Request body (web):** vacío (`{}` o sin cuerpo).

**Headers (móvil):**
```
Content-Type: application/json
```

**Request body (móvil):**
```json
{
  "refreshToken": "string (requerido, JWT)"
}
```

**Response 200 (ambas plataformas):**
```json
{
  "ok": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "string (JWT)",
    "expiresIn": 1800
  }
}
```

En web, además se reemplaza la cookie `refresh_token` (rotación, sección 4.2). En móvil, el body de la respuesta **no** incluye un refresh token nuevo salvo que la política de rotación esté activa (sección 4.2) — en ese caso se añade `"refreshToken": "string"` al `data` y el cliente móvil debe reemplazar el guardado en SecureStore.

**Response 401 (refresh token ausente, expirado, revocado o de un usuario desactivado):**
```json
{
  "ok": false,
  "message": "Invalid or expired session. Please log in again.",
  "data": null
}
```

---

### POST /api/v1/auth/logout

**Descripción:** Revoca el refresh token actual y limpia la cookie en web. Idempotente: llamar dos veces no es error.

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
Cookie: refresh_token=<jwt>   (web, automático)
```

**Request body (móvil, requerido; web, vacío):**
```json
{
  "refreshToken": "string (requerido en móvil; ignorado en web, se usa la cookie)"
}
```

**Response 204:** sin cuerpo. La cookie `refresh_token` se limpia con `Set-Cookie: refresh_token=; Max-Age=0` en web.

**Response 401 (sin access token válido):**
```json
{
  "ok": false,
  "message": "Invalid or expired token",
  "data": null
}
```

---

### GET /api/v1/auth/me

**Descripción:** Devuelve los datos del usuario autenticado a partir del access token. Lo usa el `AuthContext` del frontend al montar la app para saber si hay sesión vigente, y para repoblar el estado tras un refresh de página (la cookie sobrevive, el estado de React no).

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request body:** ninguno.

**Response 200:**
```json
{
  "ok": true,
  "message": "User retrieved successfully",
  "data": {
    "id": 1,
    "email": "coordinador@hesperides.pucp.edu.pe",
    "fullName": "Ana Torres",
    "role": { "id": 5, "code": "COORDINADOR", "label": "Coordinador" },
    "isActive": true,
    "lastLogin": "2026-09-07T14:30:00Z"
  }
}
```

**Response 401 (sin token, expirado, o usuario desactivado desde el último request):**
```json
{
  "ok": false,
  "message": "Invalid or expired token",
  "data": null
}
```

> Ningún contrato de esta sección incluye `passwordHash` en ninguna respuesta, bajo ninguna condición (sección 9).

## 4. Migración de base de datos

Este spec posee y crea **V002**. Rango fundacional `V001`–`V099` (SPEC-000 §5.4); V001 (catálogos) ya existe y no se toca.

### 4.1 V002 — Tabla de usuarios y refresh tokens

```sql
-- V002__create_users.sql

CREATE TABLE users (
    id              BIGSERIAL PRIMARY KEY,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    first_name      VARCHAR(100) NOT NULL,
    last_name       VARCHAR(100) NOT NULL,
    role_item_id    BIGINT NOT NULL REFERENCES catalog_items(id),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    last_login      TIMESTAMP,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);

-- Único entre vigentes: libera el email si el usuario se da de baja lógica
-- y se necesita reutilizarlo (mismo patrón que SPEC-002 aplica en todas sus tablas).
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role_item_id ON users(role_item_id);

-- Revocación de sesiones: un JWT firmado no se puede "borrar", así que la
-- capacidad de cerrar sesión de verdad (logout, desactivación de usuario,
-- rotación) vive en esta tabla, no en el token.
CREATE TABLE refresh_tokens (
    id              BIGSERIAL PRIMARY KEY,
    user_id         BIGINT NOT NULL REFERENCES users(id),
    token_hash      VARCHAR(255) NOT NULL,
    issued_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    revoked_at      TIMESTAMP,
    replaced_by_id  BIGINT REFERENCES refresh_tokens(id),
    client_type     VARCHAR(10) NOT NULL CHECK (client_type IN ('web', 'mobile')),
    user_agent      VARCHAR(255),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at      TIMESTAMP
);

CREATE UNIQUE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

| Campo de `users` | Tipo | Nulo | Notas |
|---|---|---|---|
| `email` | VARCHAR(255) | No | Identificador de login. Único entre vigentes (índice parcial). |
| `password_hash` | VARCHAR(255) | No | Salida de BCrypt (60 caracteres típicos; 255 deja margen). Nunca se lee fuera de `AuthService`/`CustomUserDetailsService`. |
| `first_name`, `last_name` | VARCHAR(100) | No | Se separan, no un `full_name` único, porque los reportes de coordinación (módulo 6) y el formato de contrato tipo suelen requerir apellido solo. `fullName` en los DTO de respuesta se compone en el mapper. |
| `role_item_id` | BIGINT | No | FK a `catalog_items(id)` del `catalog_type` `ROLE`. Nunca un enum Java (SPEC-000 §1, SPEC-003). |
| `is_active` | BOOLEAN | No | Módulo 1.1: desactivar, no borrar. Controla login y, junto con `UserDetails.isEnabled()`, el acceso a cada request. |
| `last_login` | TIMESTAMP | Sí | Se actualiza en cada login exitoso. `NULL` = el usuario nunca inició sesión (recién creado por el administrador). |

| Campo de `refresh_tokens` | Tipo | Nulo | Notas |
|---|---|---|---|
| `token_hash` | VARCHAR(255) | No | **Hash SHA-256 del refresh token, no el token en texto plano.** Si la tabla se filtra, no expone tokens reutilizables — el mismo principio que `password_hash`. |
| `expires_at` | TIMESTAMP | No | `issued_at` + 7 días. Se indexa para que el job de limpieza (fuera de alcance de este spec) pueda purgar filas vencidas. |
| `revoked_at` | TIMESTAMP | Sí | `NULL` = vigente. Se setea en logout, en rotación (el token viejo queda revocado) y al desactivar un usuario (revocación masiva por `user_id`). |
| `replaced_by_id` | BIGINT | Sí | Autorreferencia. Encadena la rotación: permite detectar reuso de un token ya rotado (sección 4.2) y auditar la cadena completa de una sesión. |
| `client_type` | VARCHAR(10) | No | `'web'` o `'mobile'`. Determina si el token vive en cookie o en el body — informativo para auditoría, no cambia la validación. |

### 4.2 Rotación de refresh tokens y detección de reuso

Cada `POST /auth/refresh` exitoso **rota** el refresh token: crea una fila nueva en `refresh_tokens`, marca `revoked_at` en la fila vieja y la enlaza con `replaced_by_id`. Si `POST /auth/refresh` recibe un token cuyo `revoked_at` **ya** está seteado, se interpreta como reuso de un token robado o de una carrera entre pestañas: el servicio revoca **toda la cadena** de refresh tokens de ese `user_id` (`UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL`) y responde 401. El usuario debe volver a iniciar sesión. Este es el motivo de que `replaced_by_id` exista: sin la cadena, revocar "todo lo relacionado" no sería posible sin revocar toda la tabla.

## 5. Comportamiento esperado

### 5.1 Cómo conviven cookie (web) y Authorization header (móvil) en el mismo backend

Ambos flujos comparten `AuthController` y `JwtTokenProvider`. Lo que cambia es **dónde vive el refresh token** y **cómo se marca la plataforma**:

1. El cliente envía `X-Client-Type: web` o `X-Client-Type: mobile` en `POST /auth/login`. Si el header falta, `AuthController` asume `web` (es el valor seguro por defecto: nunca se filtra un refresh token en un body JSON por omisión).
2. **Web:** `AuthController` nunca incluye el refresh token en el JSON de respuesta. Lo escribe con `HttpServletResponse.addCookie(...)` como `Set-Cookie: refresh_token=...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth`. `SameSite=Strict` + `Path` acotado a `/api/v1/auth` es la protección CSRF primaria: el navegador no adjunta la cookie en peticiones de otro sitio ni en rutas fuera de auth. El access token **sí** viaja en el body JSON porque el frontend lo guarda en memoria (estado de React, no storage persistente) y lo reenvía como `Authorization: Bearer` en cada llamada — no se apoya en la cookie para las rutas de negocio, solo `/auth/refresh` la usa.
3. **Móvil:** no hay navegador ni cookie. `AuthController` devuelve el refresh token en el body JSON. React Native lo guarda en SecureStore/Keychain, igual que el access token, y manda ambos como corresponda: el access token como `Authorization: Bearer` en cada request, el refresh token solo en el body de `POST /auth/refresh` y `POST /auth/logout`.
4. **El filtro JWT (`JwtAuthenticationFilter`) es idéntico para ambos flujos** en cuanto al access token: siempre lo lee de `Authorization: Bearer {token}`, nunca de la cookie. La cookie `httpOnly` **solo** la lee `AuthController` en `/auth/refresh` y `/auth/logout`, nunca el filtro de autorización de rutas de negocio. Esto es deliberado: si el filtro aceptara el access token también desde cookie, un formulario malicioso en otro sitio podría disparar peticiones autenticadas sin que `SameSite` lo bloquee (los `GET`/`POST` simples de formulario no siempre respetan `SameSite=Strict` de la misma forma que `fetch`). Mantener el access token exclusivamente en el header evita esa ambigüedad.
5. **CSRF adicional para `/auth/refresh` y `/auth/logout` en web:** además de `SameSite=Strict`, estos dos endpoints exigen el header `X-Requested-With: XMLHttpRequest` (el navegador no lo añade en un envío de formulario cross-site ni en una navegación simple; `fetch` de `api.ts` sí lo añade). Un request a estas rutas sin ese header y con `X-Client-Type: web` (o ausente) se rechaza con 403 antes de tocar la cookie.

### 5.2 Flujo principal (Happy Path) — web

1. El usuario abre `/login`, ingresa email y contraseña, y envía el formulario.
2. `LoginForm` llama `apiClient.post('/auth/login', { email, password })`. `api.ts` ya manda `credentials: 'include'`.
3. El backend valida credenciales, verifica `is_active`, genera access token (30 min) y refresh token (7 días), guarda el refresh token hasheado en `refresh_tokens`, y responde 200 con el access token en el body y el refresh token en cookie `httpOnly`.
4. `useAuth` guarda el access token en memoria (contexto de React) y al usuario recibido. Redirige al dashboard según el rol.
5. Cada llamada siguiente a la API manda `Authorization: Bearer {accessToken}`. `JwtAuthenticationFilter` lo valida, carga el `UserDetails` (incluye rol e `is_active`), y `SecurityConfig` autoriza o no la ruta según el rol.
6. A los 30 minutos, un 401 dispara el flujo de refresh (sección 6): si el refresh (vía cookie) tiene éxito, la petición original se reintenta transparentemente. Si no, se redirige a `/login`.

### 5.3 Flujo principal (Happy Path) — móvil

1. El operario abre la app, `LoginScreen` es la pantalla inicial porque SecureStore no tiene tokens guardados.
2. Envía email y contraseña con `X-Client-Type: mobile`. El backend responde con access token y refresh token en el body.
3. El cliente guarda ambos en SecureStore/Keychain y navega al stack autenticado.
4. En cada request, el cliente móvil lee el access token de SecureStore y lo manda en `Authorization: Bearer`.
5. Al recibir 401, el cliente llama `POST /auth/refresh` con el refresh token guardado, reemplaza ambos tokens en SecureStore (el refresh token puede rotar, sección 4.2) y reintenta la petición original.
6. Si el refresh también falla (401), se limpia SecureStore y se navega de vuelta a `LoginScreen`.

### 5.4 Flujos alternativos

- **Credenciales inválidas:** 401 con mensaje genérico `"Invalid email or password"`. `LoginForm` lo muestra como error inline bajo el formulario, sin indicar si falló el email o la contraseña.
- **Usuario desactivado que intenta login:** mismo 401 y mismo mensaje genérico que credenciales inválidas (sección 9 — no confirmar existencia de la cuenta).
- **Access token expira a mitad de una sesión activa:** ver sección 6, flujo de refresh encolado.
- **Refresh token expira (7 días sin actividad) o fue revocado:** `POST /auth/refresh` devuelve 401; el cliente limpia el estado de sesión (web: contexto de React y la cookie ya expiró/se limpia; móvil: SecureStore) y redirige a login con el mensaje "Tu sesión expiró. Inicia sesión de nuevo."
- **El usuario cierra el navegador sin hacer logout:** la cookie `httpOnly` persiste (no es de sesión de navegador, tiene `Max-Age`), así que al volver, `GET /auth/me` con la cookie de refresh implícita en el próximo `/auth/refresh` revalida sin pedir credenciales de nuevo, hasta los 7 días.
- **Doble clic en "Iniciar sesión":** el botón se deshabilita (`disabled`) mientras la petición está en curso, mismo patrón que cualquier submit del proyecto (SPEC-C01).
- **Error de red durante login:** `api.ts` ya lanza `ApiError(0, 'Sin conexión. Verifique su red.')`; `LoginForm` lo muestra como toast.

### 5.5 Casos límite (Edge Cases)

- **Email con mayúsculas/minúsculas mezcladas:** se normaliza a minúsculas antes de comparar y antes de insertar (`LOWER(email)` en la búsqueda, `email` se guarda en minúsculas). `admin@X.com` y `Admin@x.com` son el mismo usuario.
- **Espacios en blanco en email o password:** se recortan (`trim`) en el email; **no** se recortan en la contraseña (un espacio final podría ser intencional y BCrypt lo trata como carácter válido).
- **Múltiples pestañas del mismo usuario en web:** comparten la misma cookie `httpOnly` de dominio. Si una pestaña dispara un refresh, la rotación invalida el refresh token viejo; si dos pestañas refrescan casi simultáneamente, la segunda puede toparse con un token ya rotado — se trata como el caso de reuso de la sección 4.2 solo si el token ya fue *usado y reemplazado*, no si ambas llegan con el mismo token vigente antes de que el primero rote (hay una ventana de carrera aceptada de milisegundos; ver también sección 6 para el caso de pestaña única con requests concurrentes, que es el que sí se resuelve por completo con la cola del cliente).
- **Access token válido pero de un usuario borrado lógicamente después de emitirlo:** ver sección 2.6 — el filtro consulta `is_active` en cada request vía `UserDetails.isEnabled()`, así que un `deleted_at`/`is_active=false` posterior a la emisión del token corta el acceso en el siguiente request, no hay que esperar a la expiración del JWT para eso (a diferencia del caso de mera desactivación sin invalidación de sesión discutido en 2.6, aquí sí se corta de inmediato porque `isEnabled()` se evalúa por request).
- **Rol reasignado mientras la sesión está activa:** el JWT no lleva permisos "congelados", lleva el `role_item_id`/`code` como claim informativo, pero `SecurityConfig` autoriza consultando el rol vigente vía `UserDetails` cargado en cada request (no cachea el rol dentro del token para autorizar). Un cambio de rol por el administrador aplica desde el siguiente request, no hace falta esperar a que expire el access token.
- **Contraseña con caracteres Unicode/emoji:** BCrypt opera sobre bytes; se normaliza a UTF-8 antes de hashear. Sin restricción de charset más allá del mínimo de 8 caracteres.

## 6. Criterios de aceptación (verificables por cualquiera)

| # | Criterio | Método de verificación |
|---|----------|----------------------|
| CA-01 | Un login válido devuelve un access token y dura exactamente lo especificado | `POST /api/v1/auth/login` con credenciales de un usuario activo → 200, `data.expiresIn = 1800`. Esperar 31 minutos (o generar un token con `exp` manipulado en un entorno de prueba) y llamar cualquier endpoint protegido con ese access token → 401. |
| CA-02 | En web el refresh token nunca aparece en el cuerpo de la respuesta ni es legible por JavaScript | Inspeccionar la respuesta de `POST /api/v1/auth/login` con `X-Client-Type: web` (o sin el header) en las DevTools → el JSON de `data` no contiene ningún campo `refreshToken`. En la pestaña Application/Cookies, la cookie `refresh_token` muestra el flag `HttpOnly` marcado. Ejecutar `document.cookie` en la consola del navegador → no aparece `refresh_token`. |
| CA-03 | En móvil el refresh token sí viaja en el body y el cliente lo persiste cifrado | `POST /api/v1/auth/login` con `X-Client-Type: mobile` → `data.refreshToken` presente en el JSON. Verificar en el código de la app que se guarda con `SecureStore.setItemAsync` (o Keychain), nunca con `AsyncStorage`. |
| CA-04 | Un usuario desactivado no puede iniciar sesión ni mantener una sesión de refresco | Desactivar un usuario de prueba (`is_active = FALSE`). `POST /api/v1/auth/login` con sus credenciales correctas → 401 con el mismo mensaje que credenciales inválidas. Con una sesión previa a la desactivación, llamar `POST /api/v1/auth/refresh` con su refresh token → 401. |
| CA-05 | Los cuatro roles tienen accesos distintos y verificables por endpoint | Con un usuario `OPERARIO`, llamar un endpoint reservado a `ADMIN` (p. ej. gestión de usuarios) → 403 con el sobre `{ ok: false, message: "Insufficient permissions for this action", data: null }`. El mismo request con un usuario `ADMIN` → 200. |
| CA-06 | `password_hash` nunca sale en ninguna respuesta de la API | Llamar `GET /api/v1/auth/me`, `POST /api/v1/auth/login` y cualquier endpoint de `GET /api/v1/users` con un usuario autenticado → ningún campo `passwordHash` ni `password_hash` aparece en el JSON de respuesta, bajo ninguna profundidad de anidamiento. |
| CA-07 | El logout revoca la sesión de verdad, no solo en el cliente | `POST /api/v1/auth/logout` con una sesión activa → 204. Intentar `POST /api/v1/auth/refresh` reusando el mismo refresh token (cookie o body guardado antes del logout) → 401. En la BD, la fila de `refresh_tokens` correspondiente tiene `revoked_at` no nulo. |
| CA-08 | Múltiples peticiones simultáneas con el access token vencido disparan un único refresh | En el cliente web, forzar 3 llamadas API concurrentes con un access token ya expirado → en la pestaña Network se observa **una sola** llamada a `POST /api/v1/auth/refresh`, seguida de las 3 peticiones originales reintentadas con el nuevo access token. |
| CA-09 | Los intentos fallidos de login se limitan por email | Enviar 6 intentos de login fallidos seguidos para el mismo email en menos de 15 minutos → el sexto (o el que corresponda según el umbral fijado en sección 9) responde 429 con el mensaje de bloqueo, no 401. |
| CA-10 | La migración V002 crea exactamente las tablas y columnas descritas | `docker-compose down -v && docker-compose up --build` levanta sin error. `\d users` en `psql` muestra las columnas `id, email, password_hash, first_name, last_name, role_item_id, is_active, last_login, created_at, updated_at, deleted_at`. `\d refresh_tokens` muestra `id, user_id, token_hash, issued_at, expires_at, revoked_at, replaced_by_id, client_type, user_agent, created_at, updated_at, deleted_at`. |
| CA-11 | El login funciona **desde un navegador**, no solo por protocolo | Abrir `http://localhost:3000/login` en Chrome o Firefox e iniciar sesión con un usuario activo → entra al sistema. En la pestaña Network, la petición `OPTIONS` a `/api/v1/auth/login` responde **200** (no 401) con `Access-Control-Allow-Origin: http://localhost:3000` y `Access-Control-Allow-Credentials: true`. Este CA existe porque `curl` y MockMvc no hacen preflight: sin él, una suite entera en verde es compatible con un login que ningún navegador puede usar. |
| CA-12 | Un origen no autorizado no puede llamar a la API | `curl -i -X OPTIONS http://localhost:8080/api/v1/auth/login -H "Origin: http://sitio-cualquiera.example" -H "Access-Control-Request-Method: POST"` → **403**, sin cabecera `Access-Control-Allow-Origin`. Repetir con `Origin: http://localhost:3000` → 200 con la cabecera presente. |

## 7. Especificación visual

### 7.1 Web (Next.js)

- Responsive breakpoints: móvil (<640px) formulario a ancho completo con padding; tablet/desktop, tarjeta centrada de ancho fijo (max 400px) sobre fondo con el branding del proyecto.
- Layout: `Card` (SPEC-C01) con logo, título "Iniciar sesión", `Input` de email, `Input` de contraseña (tipo `password`, sin toggle de visibilidad en esta versión), `Button` primary de ancho completo.
- Estados de componentes: `default`, `loading` (botón con spinner y `disabled` mientras la petición está en curso), `error` (mensaje bajo el formulario, rojo, no un `Toast` — es un error del propio formulario, no una notificación transitoria), `disabled` (inputs deshabilitados mientras `loading`).
- Feedback visual: spinner en el botón durante el submit; sin loading skeleton (la página de login no carga datos previos).

### 7.2 Móvil (React Native)

- Gestos soportados: tap en los campos y el botón; el teclado se cierra al tocar fuera del formulario.
- Adaptaciones: mismo layout que web pero con `KeyboardAvoidingView` para que el teclado no tape el botón de submit. Sin `Card` con sombra compleja — se simplifica a un contenedor con padding, misma paleta de colores que web (SPEC-000 §5.3).
- Navegación: es la pantalla raíz del `AuthStack` cuando no hay tokens válidos en SecureStore; no tiene botón de "atrás". Al loguear, se reemplaza el stack completo por el navigator autenticado (no se apila encima, para que el botón físico de atrás de Android no regrese a login).
- Orientación: solo portrait.

### 7.3 Referencia visual

No hay mockup de Figma para este spec. El login es un formulario mínimo de dos campos; cualquier desarrollador puede maquetarlo siguiendo los componentes base de SPEC-C01 sin ambigüedad adicional.

## 8. Tests que la IA debe generar

### 8.1 Tests unitarios (backend — JUnit 5 + Mockito)

```
- AuthServiceImpl.login() con credenciales válidas y usuario activo → retorna accessToken + refreshToken, actualiza last_login
- AuthServiceImpl.login() con contraseña incorrecta → lanza UnauthorizedException con mensaje genérico
- AuthServiceImpl.login() con email inexistente → lanza UnauthorizedException con el mismo mensaje genérico que contraseña incorrecta (no debe distinguirse)
- AuthServiceImpl.login() con usuario is_active = false → lanza UnauthorizedException con el mismo mensaje genérico
- AuthServiceImpl.login() con más de N intentos fallidos recientes para el mismo email → lanza TooManyAttemptsException (o equivalente) antes de verificar la contraseña
- AuthServiceImpl.refresh() con refresh token vigente y no revocado → retorna nuevo accessToken, rota el refresh token (revoked_at seteado en el viejo, fila nueva creada)
- AuthServiceImpl.refresh() con refresh token expirado → lanza UnauthorizedException
- AuthServiceImpl.refresh() con refresh token ya revocado (reuso) → lanza UnauthorizedException y revoca toda la cadena de refresh tokens del usuario
- AuthServiceImpl.refresh() de un usuario desactivado después de emitido el token → lanza UnauthorizedException
- AuthServiceImpl.logout() con refresh token vigente → lo marca revoked_at, responde sin error
- AuthServiceImpl.logout() llamado dos veces con el mismo token → segunda llamada no lanza excepción (idempotente)
- JwtTokenProvider.generateAccessToken() → el JWT resultante tiene claim "sub" = userId y expira en 30 minutos desde su emisión
- JwtTokenProvider.validateToken() con token manipulado (firma inválida) → retorna false / lanza excepción de validación
- JwtTokenProvider.validateToken() con token expirado → retorna false / lanza excepción de expiración
- PasswordEncoder: dos hashes de la misma contraseña son distintos (salt aleatorio) y ambos matchean contra la contraseña original
```

### 8.2 Tests de integración (backend — `@SpringBootTest` / `@WebMvcTest`)

```
- POST /api/v1/auth/login con credenciales válidas y sin X-Client-Type → 200, la respuesta trae Set-Cookie con HttpOnly y Secure, el body no contiene refreshToken
- POST /api/v1/auth/login con credenciales válidas y X-Client-Type: mobile → 200, el body contiene refreshToken, no hay Set-Cookie
- POST /api/v1/auth/login con body inválido (email mal formado, password vacío) → 400 con errores detallados por campo
- POST /api/v1/auth/login con usuario desactivado → 401 con mensaje genérico
- POST /api/v1/auth/refresh (web) sin cookie de refresh → 401
- POST /api/v1/auth/refresh (web) con cookie válida → 200, nuevo accessToken, cookie de refresh rotada
- POST /api/v1/auth/refresh (móvil) con refreshToken en el body inválido → 401
- POST /api/v1/auth/refresh reusando un refresh token ya rotado → 401 y las demás sesiones del usuario quedan revocadas (verificar con una segunda llamada de refresh sobre una sesión distinta del mismo usuario → también 401)
- POST /api/v1/auth/logout sin Authorization header → 401
- POST /api/v1/auth/logout con token válido → 204, refresh token queda revocado en BD
- GET /api/v1/auth/me sin token → 401
- GET /api/v1/auth/me con token expirado → 401
- GET /api/v1/auth/me con token válido → 200 + datos del usuario, sin passwordHash en ningún nivel del JSON
- GET /api/v1/auth/me con token válido de usuario desactivado después de emitido el token → 401
- Cualquier endpoint protegido con rol ADMIN llamado por un usuario OPERARIO → 403
- Cualquier endpoint protegido con rol ADMIN llamado por un usuario ADMIN → 200 (o el código de éxito que corresponda)
- 6 POST /api/v1/auth/login fallidos consecutivos para el mismo email en la ventana configurada → el que exceda el umbral responde 429
- OPTIONS /api/v1/auth/login con Origin permitido y Access-Control-Request-Method → 200 con Access-Control-Allow-Origin y Allow-Credentials: true
- OPTIONS /api/v1/auth/login con un Origin que no está en la lista → 403 y sin cabecera Allow-Origin
- OPTIONS sobre una ruta protegida (/api/v1/auth/me) sin credenciales → 200: el preflight nunca las lleva
- POST /api/v1/auth/login con Origin permitido → la respuesta 200 incluye Access-Control-Allow-Origin (un 200 sin esa cabecera lo bloquea el navegador igual que un error)
```

### 8.3 Tests frontend (Jest + React Testing Library)

```
- LoginForm renderiza los campos email y password y el botón de submit
- LoginForm muestra estado loading (botón disabled + spinner) mientras la petición está en curso
- LoginForm muestra el mensaje de error inline cuando la API responde 401
- LoginForm con datos válidos → llama apiClient.post('/auth/login', {...}) exactamente una vez
- LoginForm con campos vacíos → muestra validación inline y no llama a la API
- useAuth: tres llamadas concurrentes a apiClient con un 401 disparan una sola llamada real a /auth/refresh (mock de fetch contando invocaciones)
- useAuth: tras un refresh exitoso, las peticiones en cola se reintentan con el nuevo access token
- useAuth: tras un refresh fallido, se limpia el estado de sesión y se redirige a /login
- AuthContext: al montar la app, llama GET /auth/me una vez para repoblar el usuario si hay cookie de sesión
```

### 8.4 Tests E2E (si aplica)

```
- Un administrador abre /login, ingresa credenciales válidas, es redirigido al dashboard correspondiente a su rol, y ve su nombre en el header (dato de GET /auth/me)
- Un usuario con sesión expirada intenta abrir una página protegida → es redirigido a /login con un mensaje de sesión expirada
- Un usuario hace logout desde el header → es redirigido a /login y un intento posterior de volver atrás con el navegador no muestra contenido protegido
```

## 9. Seguridad

- [x] **Validación en backend (Bean Validation), no solo en frontend:** `LoginRequest` usa `@NotBlank`, `@Email`, `@Size(min = 8)` en el DTO; el frontend valida en paralelo solo para UX inmediata.
- [x] **Endpoint requiere autenticación JWT:** `POST /auth/login` → no (es el punto de entrada). `POST /auth/refresh` → no requiere `Authorization`, pero sí un refresh token válido (cookie o body). `POST /auth/logout` y `GET /auth/me` → sí, `Authorization: Bearer` obligatorio.
- [x] **Roles/permisos necesarios:** ninguno de los cuatro endpoints de este spec exige un rol específico (login/refresh/logout/me son iguales para los cuatro roles); la matriz de permisos por módulo (más abajo) aplica a los endpoints de negocio de los demás specs, no a estos cuatro.
- [x] **Datos sensibles que NO deben exponerse en response:** `password_hash` — nunca, bajo ninguna circunstancia, en ningún DTO, ni siquiera en respuestas de error o de auditoría. El `UserMapper` (Entity → DTO) no tiene ningún método que lo toque: la ausencia del campo en el DTO de respuesta lo hace estructuralmente imposible de serializar, no una omisión manual que alguien pueda olvidar. Tampoco se expone `token_hash` de `refresh_tokens`, ni el refresh token en texto plano se loguea nunca (ver más abajo).
- [x] **Prevención de inyección SQL:** JPA con `UsersRepository.findByEmailAndDeletedAtIsNull(String email)` derivado o `@Query` parametrizado. Cero concatenación de strings.
- [x] **XSS:** `firstName`/`lastName` son texto libre de entrada administrativa (los crea un administrador, no el propio usuario en un registro abierto), pero igual se sanean al renderizar en el frontend, nunca al guardar.

### 9.1 Por qué `password_hash` nunca sale en una respuesta

Un hash de BCrypt filtrado no es información pública "de todos modos": permite ataques de fuerza bruta offline sin límite de intentos (a diferencia del login online, que sí se limita — ver 9.3), y si dos usuarios reutilizan contraseña entre sistemas, comprometer Hesperides compromete la otra cuenta. La regla no es "no mostrarlo en la UI": es que **ninguna clase DTO de este módulo tiene un campo para él**. `UserResponse` se construye explícitamente campo por campo desde `User`, nunca por reflexión ni por un mapper genérico que copie todo lo que encuentre.

### 9.2 Qué se registra en logs y qué no

**Sí se registra** (SLF4J, nivel según el caso, JSON en producción):

- Intentos de login: email (el email es un identificador de negocio, no un secreto), resultado (éxito/fallo), IP de origen, timestamp. Nivel `INFO` en éxito, `WARN` en fallo.
- Bloqueos por fuerza bruta: email afectado, IP, timestamp, nivel `WARN`.
- Emisión y revocación de refresh tokens: `user_id`, `client_type`, timestamp, motivo de revocación (logout / rotación / reuso detectado / usuario desactivado). Nivel `INFO`.
- Fallos de validación de JWT (firma inválida, expirado): nivel `WARN`, sin el token completo (ver abajo).
- Cualquier 403 por rol insuficiente: `user_id`, rol, endpoint solicitado. Nivel `WARN` — es una señal de posible abuso o de un permiso mal configurado en el frontend.

**Nunca se registra:**

- La contraseña en texto plano, en ningún nivel de log, ni siquiera en `DEBUG` (un `DEBUG` accidentalmente activo en producción no debe convertirse en una fuga de credenciales).
- `password_hash`.
- El access token o el refresh token completos. Si un log necesita referenciar "cuál" token, usa un prefijo corto (primeros 8 caracteres) o el `id` de la fila de `refresh_tokens`, nunca el JWT ni el hash completo — un log server-side comprometido no debe equivaler a robar la sesión.
- El body completo de `POST /auth/login` (evita loguear accidentalmente la contraseña si algún interceptor de logging de requests captura el payload crudo; `AuthController` debe estar explícitamente excluido de cualquier logging genérico de request/response bodies).

### 9.3 Protección contra fuerza bruta

- **Umbral:** 5 intentos fallidos consecutivos para el mismo email en una ventana de 15 minutos bloquean nuevos intentos para ese email con `429 Too Many Requests` durante 15 minutos adicionales desde el último intento fallido.
- **Conteo por email, no solo por IP:** un atacante distribuido en múltiples IPs contra una sola cuenta debe bloquearse igual; contar solo por IP no lo detendría.
- **El contador se resetea a cero en un login exitoso.** No se acumulan intentos fallidos antiguos indefinidamente.
- **Almacenamiento del contador:** en memoria del proceso (caché local con expiración) para la versión inicial, dado que el backend corre como una única instancia en esta fase (SPEC-000, sin balanceo de carga anticipado). Si el proyecto escala a múltiples instancias, este contador debe moverse a un almacén compartido (p. ej. una tabla `login_attempts` o Redis) — se deja anotado como deuda técnica conocida, no resuelta por este spec porque SPEC-000 no define infraestructura de caché distribuida.
- **El mensaje de bloqueo (429) es distinto del de credenciales inválidas (401)** deliberadamente: distinguir "estás bloqueado" de "credenciales incorrectas" no revela si el email existe (ambos 401 y 429 pueden ocurrir para un email inexistente si alguien machaca ese email en particular), y sí le da al usuario legítimo bloqueado una indicación útil de qué pasó y cuándo reintentar.
- **No se bloquea la cuenta de forma permanente ni se notifica al usuario por correo:** no hay integración de correo en el alcance del proyecto (SPEC-000 §1). El bloqueo es temporal y autolimitado.

## 10. Consideraciones de extensibilidad

- [x] **¿Usa catálogos configurables en vez de enums hardcodeados?** Sí: el rol es `catalog_items` del tipo `ROLE` (SPEC-003), consumido por FK `role_item_id`. Añadir un cuarto rol en el futuro (p. ej. "supervisor externo") es una fila nueva en `catalog_items`, no un cambio de código ni una migración de esquema.
- [x] **¿La lógica de negocio está en el Service, no en el Controller?** Sí: `AuthController` solo parsea el request, delega a `AuthService`, y traduce el resultado al sobre `ApiResponse`. Toda decisión (umbral de intentos, rotación, revocación en cascada) vive en `AuthServiceImpl`.
- [x] **¿Los textos de UI son externalizables (i18n-ready)?** Los mensajes de error del backend (`"Invalid email or password"`, etc.) son claves de mensaje, no lógica; el frontend puede mapearlos a un catálogo de i18n sin tocar el backend. No se hardcodea español ni inglés en la lógica de negocio, solo en los `message` de las respuestas, que es donde corresponde.
- [x] **¿Las reglas de negocio específicas de PUCP están en configuración, no en código?** Sí: no hay ninguna referencia a "PUCP", a un dominio de correo institucional, ni a un directorio LDAP en la lógica de autenticación. El sistema autentica contra su propia tabla `users`, algo que cualquier otro cliente institucional puede reutilizar sin modificar código, solo cargando sus propios usuarios.

## 11. Checklist de verificación (para el desarrollador)

### Antes de pedir código a la IA

- [x] ¿El spec tiene objetivo claro y en una oración?
- [x] ¿Los contratos de API están definidos con tipos exactos?
- [x] ¿La migración SQL está definida?
- [x] ¿Hay al menos 5 criterios de aceptación verificables? — 10.
- [x] ¿Se contemplan flujos alternativos y edge cases?
- [x] ¿Se especifica comportamiento para web Y móvil?
- [ ] ¿Alguien más revisó y aprobó el spec? — pendiente de peer review.

### Después de recibir código de la IA

- [ ] El código respeta la estructura de carpetas del proyecto (`modules/auth/`, `shared/security/`).
- [ ] El paquete Java es `pe.edu.pucp.hesperides.modules.auth.[capa]` y `pe.edu.pucp.hesperides.shared.security`.
- [ ] Los componentes TypeScript están en la carpeta correcta (`components/forms/LoginForm.tsx`, `hooks/useAuth.ts`).
- [ ] Los nombres de clases/componentes siguen las convenciones de SPEC-000 §5.2/§5.3.
- [ ] La migración Flyway `V002__create_users.sql` tiene el número de versión correcto y no colisiona con V001 ni con las V003+ de SPEC-002.
- [ ] No se instalaron dependencias no autorizadas fuera de `spring-boot-starter-security`, `jjwt-*` y `expo-secure-store`/Keychain.
- [ ] Los tests generados cubren todos los criterios de aceptación de la sección 6.
- [ ] Todos los tests pasan (`mvn test` / `npm test`).
- [ ] La funcionalidad se probó manualmente en web: cookie `HttpOnly`+`Secure`+`SameSite=Strict` visible en DevTools, refresh encolado verificado con Network throttling.
- [ ] La funcionalidad se probó manualmente en móvil (o simulador): tokens en SecureStore, no en AsyncStorage.
- [ ] No hay datos hardcodeados (URLs, credenciales, nombres de PUCP en lógica).
- [ ] Los mensajes de error son claros para el usuario final y no filtran si un email existe.
- [ ] No hay `System.out.println`, `console.log` de depuración, y ningún log contiene contraseñas, hashes o tokens completos.
- [ ] Se usó soft delete (no `DELETE`) en `users`; `refresh_tokens` se revoca (`revoked_at`), nunca se borra.
- [ ] Se usaron catálogos configurables (`ROLE`) donde corresponde; no hay `enum RoleEnum` en el código Java.

---

## Anexo A — Matriz de permisos por rol × módulo × acción

Esta matriz gobierna la autorización (`@PreAuthorize` o equivalente) de **todos** los endpoints de negocio del proyecto, no solo los de este spec. Se documenta aquí porque SPEC-001 es quien define el mecanismo de roles; cada SPEC-1XX de feature debe implementar exactamente estas reglas sobre sus propios controllers, sin reinterpretarlas.

Convención: **C** = crear, **L** = leer/listar, **U** = actualizar, **D** = desactivar (soft delete), **V** = validar/aprobar (acción de negocio, no CRUD), **A** = asignar. Celda vacía = sin acceso; el intento responde 403.

La operación de campo tiene tres niveles: el **operario** ejecuta, el **supervisor** dirige su cuadrilla, y el **coordinador** planifica sobre todas las cuadrillas. El operario reporta a su supervisor y el supervisor al coordinador; por eso el coordinador ve todos los equipos y el supervisor solo el suyo.

| Módulo | Acción | ADMIN | COORDINADOR | SUPERVISOR | OPERARIO |
|---|---|:---:|:---:|:---:|:---:|
| **1.1 Usuarios** | Crear / editar / desactivar usuarios | CUD | | | |
| **1.1 Usuarios** | Ver listado y ficha de usuarios | L | L (todos, ver nota 1) | L (solo su cuadrilla) | |
| **1.1 Equipos** | Crear / editar cuadrillas y su composición | CUD | CU | | |
| **1.1 Equipos** | Ver cuadrillas | L | L (todas) | L (la suya) | L (la suya) |
| **1.2 Roles y catálogos** | Administrar `catalog_types`/`catalog_items` | CUD | | | |
| **1.2 Roles y catálogos** | Leer catálogos (para llenar selects) | L | L | L | L |
| **2. Catastro** (`zones`, `species`, `green_elements`) | Crear / editar / desactivar elementos | CUD | CU (sin desactivar, ver nota 2) | | |
| **2. Catastro** | Ver mapa y ficha de elementos | L | L | L | L (solo lectura, sin edición) |
| **3. Intervenciones** | Crear / editar una intervención | CU | CU | | |
| **3. Intervenciones** | Asignar una intervención | | A (a cualquier cuadrilla) | A (dentro de su cuadrilla) | |
| **3. Intervenciones** | Registrar ejecución (iniciar/completar, subir evidencia) | | | CU (las de su cuadrilla) | CU (solo las propias asignadas) |
| **3. Intervenciones** | Validar/observar una intervención ejecutada | | V | V (las de su cuadrilla, ver nota 4) | |
| **3. Intervenciones** | Ver historial de intervenciones | L | L | L (las de su cuadrilla) | L (solo las propias) |
| **4. Contratos y proveedores** | Crear / editar contratos y proveedores | CUD | CU (sin desactivar, ver nota 3) | | |
| **4. Contratos y proveedores** | Registrar y ver ejecuciones de servicio | CUD | CU | L (las de su zona) | |
| **5. Incidencias** | Reportar una incidencia | C | C | C | C |
| **5. Incidencias** | Cambiar estado / asignar / resolver una incidencia | U, A | U, A | U, A (las de su cuadrilla) | |
| **5. Incidencias** | Ver incidencias | L | L | L (las de su cuadrilla/zona) | L (solo las propias/asignadas) |
| **6. Reportes** | Generar y ver reportes de dirección/coordinación | L | L | L (solo de su cuadrilla) | |
| **Configuración del sistema** (`system_parameters`) | Editar parámetros generales | CU | | | |

**Resumen por rol (una línea cada uno):**

- **ADMIN:** control total sobre usuarios, catálogos, catastro, contratos y parámetros del sistema; solo lectura sobre la ejecución diaria del trabajo de campo, que no le corresponde ejecutar ni validar.
- **COORDINADOR:** planifica y supervisa toda la operación — crea y edita intervenciones y contratos, asigna trabajo a cualquier cuadrilla, valida lo ejecutado y ve todos los equipos —, pero no administra usuarios, catálogos ni parámetros del sistema.
- **SUPERVISOR:** dirige una cuadrilla: asigna a sus operarios el trabajo que el coordinador planificó, valida lo que su equipo ejecuta, y ve únicamente lo que concierne a su cuadrilla. Es el eslabón entre el operario y el coordinador.
- **OPERARIO:** ejecuta las intervenciones que se le asignan y reporta incidencias; lee lo necesario para trabajar en campo (mapa, ficha de elementos, su propio historial) y no administra nada.

**Notas:**

1. El coordinador ve el listado completo de usuarios y de cuadrillas porque planifica sobre todas ellas y necesita saber a qué supervisor dirigirse; sigue sin poder crear, editar ni desactivar cuentas, que es acción exclusivamente administrativa. El supervisor ve solo a los miembros de su propia cuadrilla.
2. El coordinador mantiene el catastro (crear/editar elementos que descubre o corrige en campo) pero no desactiva elementos: desactivar un elemento del catastro es una decisión administrativa con impacto en reportes históricos, reservada a ADMIN.
3. El coordinador crea y actualiza contratos y proveedores porque es quien gestiona la relación operativa con los tercerizados y da seguimiento al cumplimiento. Lo que no puede es desactivar un proveedor o un contrato: dar de baja una relación comercial tiene implicaciones administrativas y queda en ADMIN.
4. Un supervisor no valida su propia ejecución: si él mismo registró la intervención, la validación corresponde al coordinador. La regla concreta ("quien ejecuta no valida") la implementa el SPEC-1XX de intervenciones sobre `validated_by_user_id`, que no puede coincidir con quien registró la ejecución.

**Cómo se resuelve "solo su cuadrilla":** el alcance del supervisor y del operario se calcula contra las tablas `teams`/`team_members` de SPEC-002 (V012), no contra un campo del JWT. El servicio filtra por las cuadrillas vigentes del usuario (`team_members.left_at IS NULL`), de modo que reasignar a alguien de equipo cambia su alcance en el siguiente request, sin esperar a que expire su token.

Esta matriz se traduce en Spring Security como expresiones sobre el `code` del rol (leído del `UserDetails`, nunca hardcodeado como cadena mágica repetida — se centraliza en constantes de `shared/security`, p. ej. `RoleCodes.ADMIN = "ADMIN"`), por ejemplo:

```
@PreAuthorize("hasAuthority('ADMIN')")                                              // 1.1 crear usuario
@PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR')")                            // crear una intervención o un contrato
@PreAuthorize("hasAnyAuthority('COORDINADOR', 'SUPERVISOR')")                       // asignar trabajo
@PreAuthorize("hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR', 'OPERARIO')")  // leer catálogos
```

## Anexo B — Cómo se protegen los endpoints en Spring Security

- `SecurityConfig` (`shared/security`) define una `SecurityFilterChain` con `sessionCreationPolicy(STATELESS)` — no hay `HttpSession` del lado del servidor; toda la autenticación vive en el JWT y en `refresh_tokens`.
- `JwtAuthenticationFilter` extiende `OncePerRequestFilter`, se registra antes de `UsernamePasswordAuthenticationFilter`, y por cada request: extrae el `Authorization: Bearer`, valida firma y expiración con `JwtTokenProvider`, carga el `UserDetails` vía `CustomUserDetailsService.loadUserByUsername(email)` (que a su vez consulta `UsersRepository` y por tanto refleja `is_active` en tiempo real), y si todo es válido, puebla el `SecurityContextHolder` con una `Authentication` cuyas `authorities` son `[ROLE_<code>]` o el `code` plano según se use `hasRole` o `hasAuthority` (este spec usa `hasAuthority` con el `code` tal cual, sin prefijo `ROLE_`, para que coincida exactamente con `catalog_items.code`).
- Rutas públicas (sin filtro de autenticación): `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `GET /api/v1/health` y **`OPTIONS` sobre `/api/**`** (el preflight de CORS, ver abajo). Todo lo demás bajo `/api/v1/**` exige un access token válido como mínimo; la autorización fina por rol la añade `@PreAuthorize` en cada controller según el Anexo A.
- **CORS es parte de esta cadena, no un detalle de infraestructura.** `SecurityConfig` recibe el `CorsConfigurationSource` de `shared/security/CorsConfig.java` (SPEC-000 §5.2.2) y lo conecta con `.cors(cors -> cors.configurationSource(...))`. Dos razones por las que no es opcional:
  1. **El preflight `OPTIONS` debe ser público.** El navegador lo envía antes de cada `POST` cross-origin y **no incluye credenciales por diseño**. Si la cadena lo exige, responde 401, el navegador aborta y la petición real nunca sale: el usuario ve un fallo de red aunque el backend esté perfectamente sano.
  2. **`allowCredentials` debe estar activo** o el navegador descarta la cookie `refresh_token` de §5.1 — el flujo web entero (incluido el refresh encolado del Anexo C) depende de que esa cookie viaje.

  Corolario de verificación: **los tests de MockMvc y las pruebas con `curl` no detectan un fallo de CORS**, porque ninguno hace preflight ni valida las cabeceras. Un CA que diga "el login funciona" solo está verificado de verdad si se comprobó en un navegador.
- **Qué pasa cuando el access token expira:** el filtro detecta la excepción de expiración de JJWT, no puebla el `SecurityContextHolder`, y delega en un `AuthenticationEntryPoint` custom que responde directamente `401` con el sobre `{ ok: false, message: "Invalid or expired token", data: null }" — nunca deja que la petición llegue al controller ni que Spring Security devuelva su página de error HTML por defecto.
- **Qué pasa cuando el rol no alcanza:** `@PreAuthorize` deniega antes de invocar el método del controller; un `AccessDeniedHandler` custom traduce eso a `403` con `{ ok: false, message: "Insufficient permissions for this action", data: null }`, igual que en la plantilla de contratos de API (sección 3 de `_plantilla.md`).
- El cliente (web o móvil) es responsable de disparar el flujo de refresh ante ese 401 antes de asumir que la sesión terminó (sección 6); el backend no distingue "expiró" de "nunca existió" en el mensaje, por la misma razón de no filtrar información que en el login.

## Anexo C — Flujo de refresh encolado en el cliente web

Extiende el punto marcado en `frontend/src/lib/api.ts` (comentario `SPEC-001 extension point`, función `request<T>`). Problema a resolver: si 3 componentes llaman a la API casi simultáneamente con un access token ya vencido, sin coordinación se dispararían 3 `POST /auth/refresh` en paralelo — el primero rota el refresh token (sección 4.2), y los otros dos llegarían con un refresh token ya revocado, lo que el backend interpreta como reuso y **cierra la sesión de golpe**. La cola no es una optimización, es lo que evita ese auto-bloqueo.

Mecanismo (a implementar dentro de `api.ts`, sin nueva librería — es un patrón de módulo, no necesita `axios` ni interceptores de terceros):

1. Una variable de módulo `refreshPromise: Promise<void> | null = null`, privada al archivo.
2. Cuando `request<T>` recibe un 401 de un endpoint que **no** es `/auth/login` ni `/auth/refresh`:
   - Si `refreshPromise` es `null`, esta llamada es la primera en notar la expiración: crea la promesa llamando a `POST /auth/refresh`, la asigna a `refreshPromise`, y cuando resuelve (éxito o fallo) la vuelve a poner en `null` (en un `finally`), para que el próximo 401 futuro dispare un refresh nuevo.
   - Si `refreshPromise` ya existe, esta llamada **no** dispara un segundo refresh: simplemente hace `await refreshPromise`.
3. Todas las llamadas que estaban esperando (la que disparó el refresh y las que se sumaron) continúan tras resolverse la promesa: si el refresh tuvo éxito, cada una reintenta su petición original **una sola vez** con el access token nuevo (que `useAuth`/`AuthContext` ya actualizó en memoria); si el refresh falló, cada una propaga un `ApiError(401, ...)` para que el llamador redirija a login, sin reintentar en bucle.
4. El reintento se limita a **una vez por petición**: si la petición reintentada vuelve a dar 401 (el nuevo access token tampoco sirvió, lo que no debería pasar salvo error de servidor), se propaga el error sin encolar un segundo refresh — evita un bucle infinito.
5. En móvil el mismo patrón aplica dentro del `apiClient` propio de `mobile/src/lib/api.ts` (misma interfaz, distinta implementación, como ya indica la estructura de carpetas de SPEC-000): la única diferencia es que el refresh token se lee de SecureStore en vez de depender de una cookie automática del navegador.

Pseudocódigo del punto de extensión (ilustrativo, no es el código final — la implementación es tarea de la IA en su momento, no de este spec):

```
async function request(method, path, body) {
  let response = await doFetch(method, path, body);
  if (response.status === 401 && path !== '/auth/refresh' && path !== '/auth/login') {
    await getOrCreateRefresh();          // se une a la cola si ya hay una en curso
    response = await doFetch(method, path, body, { isRetry: true });
  }
  return parseEnvelope(response);
}

function getOrCreateRefresh() {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}
```
