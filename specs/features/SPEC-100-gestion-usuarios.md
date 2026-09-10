# SPEC-100 — Gestión de usuarios

| Campo | Valor |
|-------|-------|
| HU relacionada | 1.1 — Gestión de usuarios (CRUD): crear, editar, desactivar usuarios del sistema |
| Plataforma | Web (móvil fuera de alcance, ver §2.3) |
| Sprint | S1 |
| Dependencias | SPEC-000, SPEC-001 (posee `users`), SPEC-002, SPEC-003 (catálogo `ROLE`), SPEC-004 (auditoría), SPEC-C01, SPEC-C02, SPEC-C03 |

---

## 1. Objetivo

Permitir que un administrador dé de alta, edite, desactive y reactive las cuentas del personal de áreas verdes, y que cada persona reciba sus credenciales por correo y fije su propia contraseña en el primer ingreso, para que el acceso al sistema refleje en todo momento quién trabaja hoy en el campus y con qué rol.

## 2. Contexto para la IA

> **Lectura obligatoria:** [`specs/REGLAS.md`](../REGLAS.md).
> **Específico de este spec:** SPEC-001 **posee la tabla `users` (V002)** —este spec la
> extiende con `ALTER TABLE`, nunca la recrea— y su Anexo A gobierna la autorización;
> SPEC-003 (el rol es un `catalog_item` de tipo `ROLE`); SPEC-004 (cinco acciones auditables, §9.3).
>
> **Este spec enmienda tres specs ya cerrados (§2.5).** Leer esas enmiendas antes de asumir
> que "no hay servicios externos" o que "no hay envío de correo" siguen vigentes tal cual.

### 2.1 Dónde vive el código

- **Backend:** `modules/users/` (controller, dto, entity, repository, service). La tabla `users`
  y `RefreshToken` son de SPEC-001; `TeamMember` de SPEC-002 V012; el rol es un `CatalogItem`
  de SPEC-003.
- **Frontend:** `frontend/src/app/admin/usuarios/`, `frontend/src/app/cambiar-password/` y
  `frontend/src/components/users/`.
- **Tipos compartidos:** [`shared/types/users.ts`](../../shared/types/users.ts), espejo de los
  DTO del backend para web y móvil.

Los nombres de clase y de archivo se leen del repo, no de este documento: una lista aquí queda
desfasada en cuanto alguien refactoriza. Lo que sí se fija es la **estructura por capas** de
`REGLAS.md` §5.2 y que la UI reutiliza los componentes de SPEC-C01 sin redefinir sus props.

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

**La forma exacta de cada request y response está en el código, que es donde se verifica:**
`modules/users/dto/` (backend) y [`shared/types/users.ts`](../../shared/types/users.ts) (espejo
tipado para web y móvil). El envoltorio `{ok, message, data}` es INV-1 y la paginación es
SPEC-C03 §5.2. Nada de eso se reproduce aquí: una copia que nadie compila es la única que puede
mentir.

Esta sección fija lo que el código **no** puede decir: quién puede llamar a cada endpoint y qué
decisión hay detrás.

| Endpoint | Autorización | Qué resuelve |
|---|---|---|
| `GET /users` | ADMIN y COORDINADOR (todos); SUPERVISOR (su cuadrilla) | Listado paginado. Filtros `search`, `roleCode`, `isActive`, `teamId` |
| `GET /users/{id}` | Igual, más cualquiera sobre su propia ficha | Ficha individual |
| `POST /users` | ADMIN | Alta + envío de credenciales |
| `PUT /users/{id}` | ADMIN | Nombre, apellido, correo y rol. **No** contraseña ni `is_active` |
| `POST /users/{id}/deactivate` | ADMIN | `is_active = FALSE` + revoca refresh tokens |
| `POST /users/{id}/reactivate` | ADMIN | Revierte. No restaura sesiones ni regenera clave |
| `POST /users/{id}/resend-credentials` | ADMIN | Regenera clave, reenvía, revoca sesiones |
| `POST /users/{id}/mark-credentials-delivered` | ADMIN | Cierra un `PENDING_DELIVERY` resuelto fuera del sistema |
| `POST /users/me/password` | Cualquier autenticado, sobre su cuenta | Único endpoint que acepta una clave escrita a mano tras el alta |

### 3.1 Decisiones que el código no explica

**`POST /{id}/deactivate`, no `DELETE /{id}`.** SPEC-C03 §3.1 reserva `DELETE` para el soft
delete (`deleted_at`). Desactivar es otra cosa: `is_active = FALSE`, reversible y con acción
inversa explícita. Una cuenta no se borra, se desactiva; `deleted_at` queda para un borrado
lógico definitivo que este spec no expone.

**Las acciones devuelven 200 con el recurso, no 204.** SPEC-C03 §8 para acciones de negocio: el
cliente necesita el estado resultante para refrescar la fila sin un segundo `GET`.

**El orden por defecto del listado es `lastName,asc`**, no el `createdAt,desc` general de
SPEC-C03 §5.1. Esta pantalla se usa para *buscar a una persona concreta*, y el orden alfabético
es el que permite recorrerla con la vista. Excepción consciente y local.

**Sin el parámetro `isActive`, el listado devuelve solo activos.** Es lo que se necesita el 95%
de las veces; el riesgo que introduce y su mitigación están en §5.5.

**`teamId` no amplía el alcance de un SUPERVISOR.** Si apunta a una cuadrilla ajena se ignora:
su alcance ya está restringido y un query param no lo abre.

**Un SUPERVISOR que pide una ficha fuera de su cuadrilla recibe 404, no 403** (§9.2 explica por
qué). Cualquier autenticado puede pedir su propia ficha aunque su rol no tenga permiso de
listado.

**El alta responde 201 aunque el correo no salga**, con `credentialStatus = PENDING_DELIVERY`.
El frontend distingue los dos casos por ese campo, nunca por el `message`. El porqué está en
§5.3.

**`resend-credentials` regenera la clave antes de intentar el envío.** Si el envío falla, la
anterior ya no sirve: es la trampa del endpoint y el frontend debe advertirlo (§5.4).

**Cambiar el correo con `PUT` no reenvía credenciales.** Cambiar el correo no invalida la
contraseña que la persona ya fijó. Para eso está `resend-credentials`, explícito.

**`POST /users/me/password` con la contraseña actual incorrecta responde 400, no 401.** El token
es válido y la sesión existe; lo que falló es un dato del formulario. Un 401 dispararía el flujo
de refresh de SPEC-001 Anexo C sin motivo.

## 4. Migración de base de datos

**El DDL está en `backend/src/main/resources/db/migration/`:** `V100__add_credential_columns_to_users.sql`
(las tres columnas y sus dos índices parciales) y `V101__enable_unaccent.sql` (extensión que usa
la búsqueda insensible a acentos del listado).

La tabla `users` **ya existe**: la crea `V002`, propiedad de SPEC-001. Este spec solo la extiende
con `ALTER TABLE`; duplicar el `CREATE` rompería Flyway por checksum.

### 4.1 Decisiones que el DDL no explica

**Los defaults son `'DELIVERED'` y `FALSE`** porque describen correctamente lo que ya existía
antes de la migración: el administrador semilla y las cuentas de prueba no pasaron por el flujo
de envío y no deben aparecer como pendientes ni forzadas a cambiar la clave. El alta de §5.1 fija
los valores explícitamente en cada creación nueva.

**`credential_status` es un `CHECK` de dos valores, no un catálogo** (excepción consciente a
INV-2, igual que `refresh_tokens.client_type` en SPEC-001 y `AuditActionCode` en SPEC-004 §3.1).
Es metadato del sistema, no un dato de negocio ampliable desde la UI: un administrador que
añadiera un tercer estado desde `/admin/catalogs` no encontraría código que lo produjera ni lo
interpretara. En Java se mapea `@Enumerated(EnumType.STRING)`, nunca `ORDINAL`, para que la
columna sea legible en una consulta directa.

### 4.2 Variables de entorno

`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM` y `APP_PUBLIC_URL`
(valores de referencia en `.env.example`; fail fast si falta alguna, SPEC-000).

**`APP_PUBLIC_URL` no se deriva del header `Host` del request.** Un atacante que controlara ese
header haría que el correo de credenciales apuntara a un dominio suyo.

**`SMTP_FROM` debe ser un remitente verificado en el proveedor.** Uno inexistente puede recibir
un `250 OK` y descartarse en silencio después: el sistema lo daría por entregado y la persona
nunca recibiría nada.

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

## 6. Criterios de aceptación

Verificables sin leer el código. Los que la suite ya cubre se comprueban con `mvn test` y
`npm test`; los marcados **[manual]** exigen un navegador real (INV-10) o un buzón de correo, y
son los únicos que ninguna suite puede dar por buenos.

| # | Criterio |
|---|---|
| CA-01 | Solo un ADMIN crea usuarios. Los otros tres roles reciben 403 con el mismo body |
| CA-02 | **[manual]** La persona recibe el correo, entra con la clave temporal y el sistema la retiene en `/cambiar-password`: cualquier otro endpoint responde 403 hasta que la cambia |
| CA-03 | Con SMTP caído, el alta responde 201 con `PENDING_DELIVERY`, la fila queda en BD y `audit_log` registra `USER_CREDENTIALS_DELIVERY_FAILED` |
| CA-04 | Desactivar corta el acceso: refresh 401, cero refresh tokens vigentes, login 401 |
| CA-05 | El sistema no puede quedarse sin administradores: autodesactivación, desactivar al último y degradarlo por `PUT` responden 422 |
| CA-06 | Los cuatro filtros funcionan y se combinan en AND. Sin `isActive`, ningún desactivado aparece. `search` es insensible a mayúsculas y acentos |
| CA-07 | Un SUPERVISOR solo ve su cuadrilla y recibe 404 —no 403— ante una ficha ajena. Un OPERARIO recibe 403 en el listado y 200 en su propia ficha |
| CA-08 | Ninguna respuesta contiene `passwordHash`, `password_hash`, `password` ni `temporaryPassword`, a ninguna profundidad |
| CA-09 | **[manual]** El formulario de edición no tiene campo de contraseña, y un `password` inyectado en el body de `PUT` no la cambia |
| CA-10 | Las cinco acciones dejan rastro en `audit_log` con su `before`/`after`. Desactivar dos veces deja **una** sola fila |
| CA-11 | **[manual]** Cambiar la propia contraseña expulsa las demás sesiones y mantiene la actual |
| CA-12 | `docker-compose down -v && up --build` aplica V100 y V101 sin error de checksum; un `INSERT` con `credential_status = 'OTRO'` falla por el CHECK |

## 7. Especificación visual

### 7.1 Web (Next.js)

El maquetado está implementado y usa exclusivamente componentes y tokens de SPEC-C01: no hay
ningún patrón visual nuevo que describir. Lo que no se deduce mirando la pantalla:

- **Ocultar controles según el rol es usabilidad, no seguridad.** Un COORDINADOR no ve el botón
  de desactivar porque mostrarle algo que siempre daría 403 sería confuso. Quien lo impide es
  `@PreAuthorize` en el controller. **Nunca se implementa un permiso escondiendo un botón.**
- **El filtro de estado viene preseleccionado en "Activos"** (§5.5), y cuando una búsqueda no
  arroja resultados con ese filtro puesto, el `EmptyState` ofrece buscar también entre los
  desactivados. Sin esa salida, un ADMIN no encuentra a quien acaba de dar de baja y crea un
  duplicado que falla con un 409 confuso.
- **`LoadingSkeleton` con la forma de la tabla**, no un spinner centrado: evita el salto de
  layout al llegar los datos.
- **Las confirmaciones destructivas nombran a la persona** ("¿Desactivar la cuenta de María
  García?"). La de reenviar credenciales advierte además de que la contraseña anterior dejará
  de funcionar: es el efecto que sorprende (§5.4).
- **`/cambiar-password` no lleva navegación ni menú.** Mientras `mustChangePassword` sea `true`
  no hay ningún otro destino válido, y ofrecer enlaces que terminan en 403 sería engañoso.
- El badge de entrega solo aparece con `credentialStatus = PENDING_DELIVERY`; `lastLogin` nulo
  se muestra como "Nunca".

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

## 8. Tests

**La suite vive en el repo** (`modules/users/**Test.java`, `frontend/src/components/users/*.test.tsx`)
y es ejecutable: `mvn test` y `npm test` dicen más que una lista en prosa. Los casos mecánicos
—sin token → 401, campo vacío → 400, rol insuficiente → 403— son invariantes de `REGLAS.md` y no
se enumeran por endpoint.

Lo que sí debe quedar fijado aquí, porque es **regla de negocio y no se deduce leyendo un
método**:

```
Último ADMIN
- deactivate del último ADMIN activo → 422
- PUT que degrada al último ADMIN → 422 (mismo efecto que desactivarlo)
- deactivate sobre uno mismo → 422, aunque haya otros ADMIN
- el conteo excluye al afectado y corre con FOR UPDATE en la misma transacción (§5.6)

Idempotencia
- deactivate dos veces → 200 ambas, UNA sola fila en audit_log
- reactivate sobre uno ya activo → 200, sin auditar
- mark-credentials-delivered sobre uno ya DELIVERED → 422

SMTP
- SMTP caído al crear → 201 con PENDING_DELIVERY: el alta NO se revierte
- SMTP caído al crear → escribe USER_CREDENTIALS_DELIVERY_FAILED
- envío exitoso → el cuerpo del correo contiene la contraseña (GreenMail)

Sesiones
- me/password revoca las demás sesiones pero NO la que ejecuta el cambio
- deactivate revoca todos los refresh tokens del afectado
- resend-credentials revoca todos: la clave regenerada no convive con sesiones vivas
- cambio de rol NO revoca nada: el rol se lee en cada request (SPEC-001 Anexo B)

Alcance por rol
- SUPERVISOR: el listado devuelve solo su cuadrilla
- SUPERVISOR pidiendo una ficha ajena → 404, no 403
- OPERARIO: listado 403, su propia ficha 200

Contraseñas
- create con correo de un usuario desactivado → tiene éxito (índice único parcial)
- el correo se normaliza (minúsculas, sin espacios) antes de validar unicidad
- PUT ignora cualquier campo de contraseña que llegue en el body
- TemporaryPasswordGenerator cumple la política en 1000 iteraciones y no repite valores
- interceptor: con mustChangePassword=TRUE solo pasan los cuatro endpoints de §5.2
```

## 9. Propio de este spec

Lo general está en [`REGLAS.md` §0](../REGLAS.md). Propio de la gestión de usuarios:

- **Autorización:** CUD solo `ADMIN`; lectura `ADMIN` y `COORDINADOR` (todos) y `SUPERVISOR`
  (su cuadrilla); `POST /users/me/password` cualquier autenticado sobre su propia cuenta.
  Coincide con el Anexo A de SPEC-001, sin reinterpretarlo.
- **Nunca salen en una respuesta:** `password_hash`, la contraseña temporal generada (vive solo
  en memoria y en el cuerpo del correo) y los `token_hash` de `refresh_tokens`.
- **El `search` viaja como parámetro vinculado** en la `Specification`, nunca interpolado.
- **El correo es texto plano**, así que no hay contexto HTML donde inyectar. En la UI se prohíbe
  `dangerouslySetInnerHTML` sobre cualquier dato de usuario.

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

## 10. Extensibilidad y evolución prevista

- **Un quinto rol** se crea desde `/admin/catalogs` y este módulo lo ofrece en el select sin
  recompilar. Lo único que no se resuelve solo son sus permisos, que viven en las expresiones
  `@PreAuthorize` de cada controller: limitación heredada del diseño de SPEC-001, no introducida
  aquí.
- **No se valida que el correo termine en `@pucp.edu.pe`.** La unidad emplea personal contratado
  que puede no tener correo institucional, y codificar el dominio impediría reutilizar el sistema.
  Si se quisiera restringir, sería un parámetro de `system_parameters`, nunca una constante.
- **Evolución natural (no se implementa ahora):** sustituir la contraseña del correo por un
  enlace con token de un solo uso y expiración. `must_change_password` y `credential_status`
  siguen sirviendo tal cual; solo cambia qué viaja en el correo, más un endpoint público de
  canje. El diseño actual no lo estorba.
- **Evolución natural:** detección de rebotes diferidos procesando el buzón de `SMTP_FROM`. El
  estado `PENDING_DELIVERY` ya existe para representarlo; falta solo quien lo escriba de forma
  asíncrona.

---

## 11. Checklist propio

El común está en [`REGLAS.md` §6](../REGLAS.md). Propio de este spec:

- [ ] La migración es `V100__add_credential_columns_to_users.sql` y usa `ALTER TABLE`, no `CREATE`.
- [ ] Sin dependencias nuevas más allá de `spring-boot-starter-mail`.
- [ ] **El envío de correo ocurre fuera de la transacción del alta** (REGLAS §0.1).
- [ ] Probado en web **incluido el caso de SMTP caído** (§5.3).
- [ ] Se usó desactivación lógica (`is_active`), no `DELETE` físico ni `deleted_at`.
- [ ] Ni el dominio `@pucp.edu.pe`, ni el host SMTP, ni la URL pública están hardcodeados.
- [ ] Los tests cubren los doce criterios de aceptación.

