# REGLAS — Invariantes del proyecto Hesperides

> **Lectura obligatoria antes de generar cualquier código de este proyecto.**
>
> Este archivo contiene lo que es cierto para **todos** los specs. Ningún spec repite estas
> reglas: si una regla vale para más de un spec, vive aquí y solo aquí.
>
> **Precedencia:** si el SPEC-000 contradice a un spec fundacional, **manda el fundacional**.
> El SPEC-000 se escribió antes de conocer el dominio y algunas de sus directrices quedaron
> genéricas. Si este archivo contradice a un spec, manda este archivo.

**Stack verificado en el `pom`:** Java **26** (Temurin 26.0.2) · Spring Boot **4.1.1** ·
Spring Security **7.1.1** · JJWT **0.12.6** · Testcontainers **2.x** · JaCoCo **0.8.15** ·
PostgreSQL + PostGIS · Flyway · Next.js 16 (React 19) · TypeScript · Tailwind · React Native ·
Python 3.11 / Flask.

---

## 0. Las diez invariantes

Toda feature las cumple. No se re-justifican en cada spec.

| # | Invariante | Dónde se detalla |
|---|---|---|
| INV-1 | **Toda** respuesta HTTP usa el sobre `{ok, message, data}`, incluido el servicio Flask. Nunca un body desnudo | SPEC-C02 §3 |
| INV-2 | Tipos, estados, roles, prioridades y categorías son filas de `catalog_items`. **Prohibido** un `enum` de dominio en Java o `@Enumerated` | SPEC-003 |
| INV-3 | Toda entidad JPA extiende `BaseEntity`. No redeclara `id`, `createdAt`, `updatedAt` ni `deletedAt` | SPEC-002 §4.1 |
| INV-4 | Soft delete siempre (`deleted_at`). Nunca un `DELETE` físico. Los índices únicos llevan `WHERE deleted_at IS NULL` | §5.4 · SPEC-002 §5.2.5 |
| INV-5 | La matriz del **Anexo A de SPEC-001** gobierna la autorización de todos los endpoints. No se reinterpreta por spec | SPEC-001 Anexo A |
| INV-6 | La lógica de negocio vive en el Service. El Controller parsea, valida y delega | SPEC-000 §1 |
| INV-7 | Validación en backend con Bean Validation, no solo en frontend. Nunca SQL concatenado: JPA o query parametrizada | §5.2 |
| INV-8 | Los logs nunca contienen contraseñas, hashes ni tokens. Nunca `System.out.println` ni `console.log` de depuración | §5.2 · SPEC-C02 §7 |
| INV-9 | Ningún dato hardcodeado: URLs, credenciales ni "PUCP" en lógica de negocio. Variables de entorno y catálogos | SPEC-000 §1 |
| INV-10 | Toda feature con interfaz web se verifica **en un navegador real**, no solo con `curl` ni MockMvc | §5.2.2 |

### 0.1 Dependencias externas

**Sin dependencia de servicios externos** (SaaS, APIs de terceros), **con una única excepción:
el envío de correo por SMTP**. Un servidor SMTP es infraestructura estándar y sustituirlo es
cambiar variables de entorno, no código.

**Condición que acota la excepción:** la indisponibilidad del SMTP **nunca puede impedir una
operación de negocio**. Todo envío ocurre fuera de la transacción que persiste el cambio, y su
fallo se registra como estado recuperable, jamás como error que revierta la operación.
(SPEC-100 §5.3 es la aplicación concreta.)

Ninguna otra dependencia externa está admitida sin enmendar el SPEC-000 y anotarlo en
`REGISTRO.md`.

### 0.2 Antes de escribir código

- **Backend:** leer **§5.2.1**. Spring Boot 4 modularizó y renombró cosas que en 3.x venían
  incluidas. Asumir la API de 3.x produce errores de compilación desconcertantes o, peor,
  migraciones que silenciosamente no se ejecutan.
- **Endpoints que consume el navegador:** leer **§5.2.2**. Un endpoint nuevo bajo `/api/**` ya
  queda cubierto, pero toda cabecera personalizada debe añadirse a `allowedHeaders` o el
  navegador bloquea la petición.
- **Migraciones:** el rango lo fija la spec que **posee** la tabla, no la primera que la
  consume. Fundacionales `V001`–`V099`; un SPEC-1NN usa `V1NN__`. Si la feature no necesita
  tablas nuevas, decirlo explícitamente: una migración duplicada rompe Flyway por checksum.

## 5. Convenciones obligatorias

### 5.1 Convenciones generales

| Aspecto | Convención |
|---------|-----------|
| Idioma de código | **Inglés** para todo (variables, funciones, clases, comentarios en código) |
| Idioma de specs | **Español** |
| Idioma de commits | **Español**, Conventional Commits con alcance: `feat(auth): agrega inicio de sesión` |
| Branch naming | `feature/SPEC-NNN-nombre-corto`, `fix/SPEC-NNN-descripcion`, `hotfix/descripcion` |
| PR naming | `[SPEC-NNN] Descripción corta en español` |
| Aprobaciones PR | Mínimo **1** aprobación de otro integrante |

### 5.2 Convenciones Java / Spring Boot

| Aspecto | Convención |
|---------|-----------|
| Package base | `pe.edu.pucp.hesperides` |
| Clases Entity | `PascalCase`, sufijo ninguno: `User`, `Course`, `Enrollment` |
| Clases DTO | Sufijo `Request` / `Response`: `CreateUserRequest`, `UserResponse` |
| Clases Controller | Sufijo `Controller`: `UserController` |
| Clases Service | Interfaz + Impl, en **plural**: `UsersService` (interfaz), `UsersServiceImpl` (implementación) |
| Clases Repository | Sufijo `Repository`, en **plural**: `UsersRepository` |
| Métodos REST | `getAll`, `getById`, `create`, `update`, `delete`, `search` |
| Paquete por módulo | Cada feature en su propio paquete dentro de `modules/` |
| Validación | Bean Validation (`@Valid`, `@NotBlank`, `@Size`, etc.) en DTOs |
| Respuestas API | Siempre `ResponseEntity<ApiResponse<T>>` con HTTP status explícito |
| Excepciones | Excepciones custom + `@ControllerAdvice` global |
| Logs | SLF4J con `@Slf4j` (Lombok). Nunca `System.out.println` |
| Config sensible | Variables de entorno via `application.yml` con `${ENV_VAR:default}` |

### 5.2.1 Spring Boot 4: qué cambió respecto a 3.x

Esta sección se escribió **después** de implementar SPEC-001, al encontrar que Spring Boot 4
modularizó y renombró cosas que en 3.x venían incluidas. Todo lo de aquí está verificado contra
los jars reales, no deducido: cada fila costó un fallo de compilación o un test en rojo.

**La regla general:** si algo "debería venir con `spring-boot-starter-web`" y no compila, en
Boot 4 probablemente vive en su propio starter. Buscar en el BOM antes de asumir la API de 3.x.

| Qué | En Spring Boot 3.x | En Spring Boot 4.1 |
|---|---|---|
| Autoconfiguración de Flyway | Incluida con `flyway-core` | **Exige `spring-boot-starter-flyway`.** Sin él, `flyway-core` está en el classpath pero **las migraciones no se ejecutan** — ni en tests ni al arrancar, y sin error visible |
| Jackson | Incluido en `starter-web`, paquete `com.fasterxml.jackson` | **Jackson 3**: `spring-boot-starter-jackson`, y `ObjectMapper` vive en **`tools.jackson.databind`**. Las *anotaciones* (`@JsonInclude`) siguen en `com.fasterxml.jackson.annotation` |
| `JsonNode.asText()` | Existe | Se llama **`asString()`** |
| `@WebMvcTest`, `@AutoConfigureMockMvc` | `org.springframework.boot.test.autoconfigure.web.servlet` | **`org.springframework.boot.webmvc.test.autoconfigure`**, en el starter `spring-boot-starter-webmvc-test` |
| `@MockBean` | Existe | **Eliminado.** Usar `@MockitoBean` de `org.springframework.test.context.bean.override.mockito` |
| Bean `HttpSecurity` en slices de test | Disponible | Un `@WebMvcTest` que importe `SecurityConfig` necesita **`spring-boot-starter-security-test`** o no existe el bean |
| Lombok como annotation processor | Lo inyecta el parent | **Hay que declararlo** en `annotationProcessorPaths` del `maven-compiler-plugin`, o `@Slf4j` no genera el campo `log` y la compilación falla |
| JaCoCo | 0.8.12 sirve | 0.8.12 **no instrumenta bytecode de Java 26** (class file 70) y rompe todo test que cargue el contexto de Spring. Mínimo **0.8.15** |
| Testcontainers | Artefactos `postgresql`, `junit-jupiter` | Boot 4 gestiona Testcontainers **2.x**, que los renombró a **`testcontainers-postgresql`** y **`testcontainers-junit-jupiter`** |
| `OncePerRequestFilter` | `org.springframework.web.filter` | Sin cambio (está en `spring-web`, **no** en `spring-security-web`) |

### 5.2.2 CORS: obligatorio en toda API que consuma el navegador

La sección 4 reserva `shared/security/` para CORS, pero ningún spec lo había detallado. Se
documenta aquí porque su ausencia produce un fallo desconcertante: **el frontend muestra "Sin
conexión. Verifique su red." aunque el backend responda 200 correctamente**.

**Por qué ocurre.** El frontend corre en el puerto 3000 y el backend en el 8080: para el
navegador son orígenes distintos. Antes de cualquier `POST`, el navegador envía un *preflight*
`OPTIONS` pidiendo permiso. Si esa petición no se responde con las cabeceras correctas, el
navegador **aborta antes de enviar la petición real** y `fetch` lanza una excepción de red que
el cliente no puede distinguir de una caída de internet.

**Por qué no lo detectan los tests.** Ni MockMvc ni `curl` hacen preflight ni validan cabeceras
CORS: CORS es una protección del **navegador**, no del servidor. Una suite entera en verde y un
script de `curl` con todos sus checks pasando son compatibles con un login que ningún navegador
puede usar. **Todo spec con interfaz web debe verificarse en un navegador real**, no solo por
protocolo.

Reglas obligatorias (implementadas en `shared/security/CorsConfig.java`):

- **Lista cerrada de orígenes**, configurable por entorno (`CORS_ALLOWED_ORIGINS`). **Nunca
  `*`**: combinado con credenciales el propio navegador rechaza la respuesta, y permitiría que
  cualquier sitio llamase a la API con la cookie de sesión de la víctima.
- **`allowCredentials: true`** es imprescindible: sin ello el navegador descarta la cookie
  `httpOnly` del refresh token y la sesión no sobrevive a una recarga.
- **El preflight `OPTIONS` se permite sin autenticación** (`requestMatchers(OPTIONS, "/api/**").permitAll()`).
  No lleva credenciales por diseño, así que exigirlas lo condena a un 401 y rompe toda petición
  del navegador.
- Cabeceras admitidas mínimas: `Authorization`, `Content-Type` y `X-Client-Type` (este último lo
  usa SPEC-001 para distinguir web de móvil).

### 5.3 Convenciones TypeScript / Next.js / React Native

| Aspecto | Convención |
|---------|-----------|
| Componentes | `PascalCase`, archivos `PascalCase.tsx`: `UserCard.tsx` |
| Hooks | `camelCase` con prefijo `use`: `useAuth.ts`, `useCatalog.ts` |
| Tipos/Interfaces | `PascalCase`, prefijo `I` solo si colisiona con componente |
| Archivos de utilidad | `camelCase`: `formatDate.ts`, `validateEmail.ts` |
| Props | Interface nombrada `[Componente]Props`: `UserCardProps` |
| API calls | Siempre a través de `lib/api.ts`, nunca `fetch` directo en componentes |
| Estado global | React Context para auth y catálogos, estado local para UI |
| Estilos web | Tailwind CSS (utility-first), nunca CSS inline para layouts |
| Estilos móvil | StyleSheet de React Native, misma paleta de colores que web |
| Rutas web | Next.js App Router, carpetas con `page.tsx` |
| Navegación móvil | React Navigation (Stack + Tab navigators) |

### 5.4 Convenciones de base de datos

| Aspecto | Convención |
|---------|-----------|
| Nombre de tablas | `snake_case` plural: `users`, `course_enrollments` |
| Nombre de columnas | `snake_case`: `first_name`, `created_at` |
| Primary key | `id` tipo `BIGSERIAL` o `UUID` (definir en SPEC-002) |
| Timestamps | Siempre `created_at` y `updated_at` en toda tabla |
| Soft delete | `deleted_at TIMESTAMP NULL` (nunca DELETE físico) |
| Foreign keys | `[tabla_singular]_id`: `user_id`, `course_id` |
| Índices | `idx_[tabla]_[columnas]`: `idx_users_email` |
| Migraciones | Flyway, archivos `V[N]__[description].sql` en `resources/db/migration/` |
| Rango de migraciones | Por spec propietaria: fundacionales `V001`-`V099`; un SPEC-1NN usa `V1NN__`. El rango lo fija la spec que **posee** la tabla, no la primera que la consume |
| Datos de catálogos | Tablas de catálogo con `code`, `label`, `is_active`, `sort_order` |

### 5.5 Convenciones Docker

| Aspecto | Convención |
|---------|-----------|
| Nombres de servicio | `backend`, `frontend`, `db`, `data-service` |
| Puertos | Backend: 8080, Frontend: 3000, Flask: 5001, PostgreSQL: 5432 |
| Env vars | Archivo `.env` (no commiteado), `.env.example` (commiteado con placeholders) |
| Volúmenes | Solo para BD en dev (`pgdata:/var/lib/postgresql/data`) |


---

## 6. Checklist de verificación

Aplica a toda entrega. Un spec solo añade lo que sea **propio suyo**, en su §9.

### 6.1 Antes de pedir código a la IA

- [ ] El spec tiene objetivo en una oración.
- [ ] Los contratos de API están definidos con tipos exactos.
- [ ] La migración SQL está definida, o el spec dice explícitamente que no necesita tablas nuevas.
- [ ] Hay al menos 5 criterios de aceptación verificables sin leer código.
- [ ] Se contemplan flujos alternativos y casos límite.
- [ ] Se especifica el comportamiento para web y para móvil (o por qué móvil queda fuera de alcance).

### 6.2 Después de recibir código de la IA

**Estructura y convenciones**

- [ ] El paquete Java es `pe.edu.pucp.hesperides.modules.[modulo].[capa]`; los componentes TS están en su carpeta.
- [ ] Los nombres siguen §5.2 y §5.3. La migración Flyway tiene el número del rango correcto.
- [ ] No se instalaron dependencias no autorizadas.

**Invariantes** (§0)

- [ ] Sobre `{ok, message, data}` en toda respuesta (INV-1).
- [ ] Ningún `enum` de dominio ni `@Enumerated`; se usaron catálogos (INV-2).
- [ ] Toda entidad nueva extiende `BaseEntity` sin redeclarar sus campos (INV-3).
- [ ] Soft delete, no `DELETE` físico (INV-4).
- [ ] La autorización de cada endpoint coincide con el Anexo A de SPEC-001 (INV-5).
- [ ] La lógica de negocio está en el Service, no en el Controller (INV-6).
- [ ] Sin datos hardcodeados: URLs, credenciales ni "PUCP" en lógica (INV-9).

**Calidad**

- [ ] Los tests cubren todos los criterios de aceptación y pasan (`mvn test` / `npm test`).
- [ ] Sin `System.out.println` ni `console.log` de depuración; los logs no llevan datos sensibles (INV-8).
- [ ] Los mensajes de error son claros para el usuario final y no exponen internals (SPEC-C02).
- [ ] Los textos de UI son externalizables (i18n-ready).

**Verificación real** (INV-10)

- [ ] Probado **en un navegador real**, no solo con `curl` ni MockMvc: ninguno de los dos hace
      preflight de CORS, así que una suite en verde es compatible con una pantalla que el
      navegador bloquea entera (§5.2.2).
- [ ] Si la feature añade endpoints que el navegador consume, la pestaña Network no muestra
      ningún `OPTIONS` con 401 ni error de CORS en consola.
- [ ] Probado en móvil o simulador, si la feature tiene pantalla móvil.
