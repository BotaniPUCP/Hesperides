# SPEC-001 — Autenticación y autorización

| Campo | Valor |
|-------|-------|
| HU relacionada | — (spec fundacional, no deriva de una HU) |
| Plataforma | Ambas (web y móvil comparten el mismo backend y los mismos endpoints) |
| Sprint | S0 (fundacional) |
| Dependencias | SPEC-000 (arquitectura y convenciones), SPEC-002 (modelo de datos — consume `users`), SPEC-003 (catálogos configurables — este spec añade ítems a `ROLE`) |

---

## 1. Objetivo

Permitir que un administrador, un coordinador o un operario de campo inicien sesión con credenciales propias del sistema y que cada acción que realicen quede autorizada según su rol, para que solo quien tiene permiso pueda ver o modificar cada módulo de la gestión de áreas verdes del campus.

## 2. Contexto para la IA

> **Lectura obligatoria:** [`specs/REGLAS.md`](../REGLAS.md).
> **Específico de este spec:** su **Anexo A gobierna la autorización de todo el proyecto**;
> SPEC-003 (el rol es un `catalog_item` de tipo `ROLE`, nunca un enum) y el Anexo B (cadena de
> filtros de Spring Security, CORS incluido).

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

**La forma de cada request y response está en `modules/auth/dto/`** (`LoginRequest`,
`LoginResponse`, `UserResponse`, `RoleResponse`) y en
[`shared/types/api.ts`](../../shared/types/api.ts). El envoltorio `{ok, message, data}` es INV-1.
No se reproduce aquí.

Cuatro endpoints bajo `/api/v1/auth`, todos públicos salvo donde se indica:

| Endpoint | Autenticación | Qué hace |
|---|---|---|
| `POST /auth/login` | Ninguna | Emite access token y refresh token |
| `POST /auth/refresh` | Refresh token (cookie o body) | Renueva el access token y **rota** el refresh |
| `POST /auth/logout` | `Bearer` | Revoca el refresh token de la sesión |
| `GET /auth/me` | `Bearer` | Datos del usuario autenticado |

El CRUD de usuarios y el catálogo `ROLE` son de SPEC-100 y SPEC-003; este spec solo deja listos
`UsersRepository` y el catálogo.

### 3.1 Decisiones que el código no explica

**El refresh token viaja distinto según la plataforma**, y lo decide el header `X-Client-Type`
(por defecto `web` si falta):

- **Web:** cookie `refresh_token`, `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth;
  Max-Age=604800`. Nunca en el cuerpo — en `localStorage` sería legible por cualquier XSS.
- **Móvil:** en el cuerpo, para guardarlo en SecureStore/Keychain. Una app nativa no tiene
  cookies con las mismas garantías.

`Path=/api/v1/auth` limita el envío de la cookie a los endpoints que la necesitan. La protección
CSRF se apoya en `SameSite=Strict`, no en tokens sincronizadores: la API es stateless y el resto
de la autenticación viaja en el header `Authorization`.

**Credenciales inválidas y usuario desactivado devuelven el mismo 401 con el mismo mensaje.**
Distinguirlos revelaría qué correos existen en el sistema.

**El bloqueo por fuerza bruta responde 429, no 401** (§9.3): al usuario legítimo bloqueado hay
que decirle qué pasó y cuándo reintentar. No filtra la existencia del correo, porque un 429
también puede darse machacando un email inexistente.

**`refresh` rota el token:** el anterior queda revocado. Si llega un refresh ya usado, se
revocan **todas** las sesiones del usuario — un token reutilizado significa que alguien tiene una
copia.

## 4. Migración de base de datos

**El DDL está en `V002__create_users.sql`** (tablas `users` y `refresh_tokens` con sus índices).
Rango fundacional `V001`–`V099` (REGLAS.md §5.4); V001 (catálogos) no se toca. SPEC-100 extiende
`users` con `V100`; SPEC-002 ocupa `V003`–`V010`.

### 4.1 Por qué el esquema es así

**`refresh_tokens` existe porque un JWT firmado no se puede "borrar".** La capacidad de cerrar
sesión de verdad —logout, desactivación de un usuario, rotación— vive en esta tabla, no en el
token. Sin ella, "cerrar sesión" solo borraría el token del cliente y cualquiera con una copia
seguiría entrando hasta que expirase.

**El índice único de `email` es parcial (`WHERE deleted_at IS NULL`):** libera el correo si la
cuenta se da de baja lógica y hay que reutilizarlo. Mismo patrón que SPEC-002 aplica en todas
sus tablas (INV-4).

**`client_type` es un `CHECK` de dos valores, no un catálogo:** es metadato del sistema, no un
dato de negocio que el cliente amplíe desde la UI. Misma excepción consciente a INV-2 que
`credential_status` en SPEC-100 §4.1.

**`replaced_by_id` encadena cada token con el que lo sustituyó.** Es lo que permite detectar el
reuso descrito en §4.2: sin la cadena, un token viejo presentado por segunda vez sería
indistinguible de uno inválido cualquiera.

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
- Adaptaciones: mismo layout que web pero con `KeyboardAvoidingView` para que el teclado no tape el botón de submit. Sin `Card` con sombra compleja — se simplifica a un contenedor con padding, misma paleta de colores que web (REGLAS.md §5.3).
- Navegación: es la pantalla raíz del `AuthStack` cuando no hay tokens válidos en SecureStore; no tiene botón de "atrás". Al loguear, se reemplaza el stack completo por el navigator autenticado (no se apila encima, para que el botón físico de atrás de Android no regrese a login).
- Orientación: solo portrait.

### 7.3 Referencia visual

No hay mockup de Figma para este spec. El login es un formulario mínimo de dos campos; cualquier desarrollador puede maquetarlo siguiendo los componentes base de SPEC-C01 sin ambigüedad adicional.

## 8. Tests

**La suite está en el repo** (`modules/auth/**Test.java`, `frontend/src/**/__tests__/`) y es
ejecutable. Los casos mecánicos —sin token → 401, campo vacío → 400— son invariantes de
`REGLAS.md`. Lo que debe quedar fijado, porque es regla de seguridad y no se deduce de un método:

```
No filtrar existencia de cuentas
- credenciales inválidas y usuario desactivado → 401 idéntico, mismo mensaje
- el 429 de bloqueo no revela si el correo existe

Rotación y reuso
- refresh válido → nuevo par, el anterior queda revocado
- refresh YA USADO → revoca TODAS las sesiones del usuario, no solo esa
- refresh de un usuario desactivado → 401 y revocación
- logout revoca solo el token de esa sesión

Transporte del token según plataforma
- sin X-Client-Type → tratado como web: cookie, y refreshToken ausente del body
- X-Client-Type: mobile → refreshToken en el body y ninguna cookie
- la cookie lleva HttpOnly, Secure, SameSite=Strict y Path=/api/v1/auth

Fuerza bruta
- 5 fallos del mismo email en 15 min → 429
- un login exitoso resetea el contador a cero

CORS (no lo detectan MockMvc ni curl: exige navegador real, INV-10)
- preflight OPTIONS a /api/** responde sin autenticación
- origen no listado → el navegador bloquea la respuesta
```

## 9. Propio de este spec

Lo general está en [`REGLAS.md` §0](../REGLAS.md). Propio de la autenticación:

- **Autenticación por endpoint:** `POST /auth/login` es el punto de entrada (sin token).
  `POST /auth/refresh` no lleva `Authorization`, pero sí un refresh token válido (cookie o
  body). `POST /auth/logout` y `GET /auth/me` exigen `Authorization: Bearer`.
- **Ningún rol específico** para estos cuatro endpoints: son iguales para los cuatro roles. La
  matriz del Anexo A aplica a los endpoints de negocio de los demás specs.
- **Nunca salen en una respuesta:** `password_hash` (§9.1), `token_hash` de `refresh_tokens`,
  ni el refresh token en claro.
- **`firstName`/`lastName`** son texto libre de entrada administrativa; se sanean al renderizar,
  nunca al guardar.

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

## 10. Checklist propio

El común está en [`REGLAS.md` §6](../REGLAS.md). Propio de este spec:

- [ ] `V002__create_users.sql` no colisiona con V001 ni con las V003+ de SPEC-002.
- [ ] Sin dependencias fuera de `spring-boot-starter-security`, `jjwt-*` y
      `expo-secure-store`/Keychain.
- [ ] **Web:** cookie `HttpOnly`+`Secure`+`SameSite=Strict` visible en DevTools, y refresh
      encolado verificado con Network throttling (Anexo C).
- [ ] **Móvil:** tokens en SecureStore, nunca en AsyncStorage.
- [ ] `users` usa soft delete; `refresh_tokens` se revoca (`revoked_at`), nunca se borra.
- [ ] No hay `enum RoleEnum`: el rol es FK a `catalog_items` de tipo `ROLE`.
- [ ] Los mensajes de error no filtran si un email existe.
- [ ] Ningún log contiene contraseñas, hashes ni tokens completos (§9.2).

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
- **CORS es parte de esta cadena, no un detalle de infraestructura.** `SecurityConfig` recibe el `CorsConfigurationSource` de `shared/security/CorsConfig.java` (REGLAS.md §5.2.2) y lo conecta con `.cors(cors -> cors.configurationSource(...))`. Dos razones por las que no es opcional:
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
