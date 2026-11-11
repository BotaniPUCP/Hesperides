# SPEC-001 Autenticación y autorización — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un administrador, coordinador, supervisor u operario inicie sesión con credenciales propias y que cada request quede autorizado según su rol, dejando lista la base (`users`, `BaseEntity`, seguridad JWT) sobre la que se apoyan todos los módulos de negocio.

**Architecture:** Autenticación stateless con JWT de acceso (30 min) y refresh tokens rotatorios persistidos en base de datos (7 días). El access token no se puede revocar, así que la capacidad real de cerrar sesión vive en la tabla `refresh_tokens`; el filtro JWT carga el usuario en cada request vía `CustomUserDetailsService`, de modo que desactivar una cuenta surte efecto sin esperar a que expire el token. Los roles son filas de `catalog_items` (tipo `ROLE`), nunca un enum Java. Web recibe el refresh token en cookie httpOnly; móvil lo recibe en el body.

**Tech Stack:** Java 26 · Spring Boot 4.1.1 · Spring Security 7.1.1 · JJWT 0.12.6 · PostgreSQL 16 · Flyway · JPA/Hibernate · JUnit 5 + Mockito + Testcontainers · Lombok

**Spec:** `specs/fundacionales/SPEC-001-autenticacion.md` (leer completo antes de empezar; su Anexo A gobierna la autorización de todo el proyecto)

## Global Constraints

Copiadas literalmente de los specs. Aplican a **todas** las tareas de este plan.

- **Java 26 / Spring Boot 4.1.1.** Ya configurado en `backend/pom.xml` (commit `fe7e343`). No cambiar.
- **Paquete raíz:** `pe.edu.pucp.hesperides`. Los módulos van en `modules.<modulo>.<capa>`; lo transversal en `shared.<area>`.
- **Sobre de respuesta uniforme:** todo endpoint devuelve `ApiResponse<T>` — `{ ok, message, data }` (`shared/exception/ApiResponse.java`, ya existe). Nunca 200 en un error.
- **Mensajes de `message` en inglés técnico** (el frontend traduce). Los textos de UI en español viven en el frontend.
- **JSON en `camelCase`, columnas en `snake_case`.** Jackson resuelve el mapeo; ningún DTO expone nombres de columna.
- **Fechas ISO 8601 en UTC** (`2026-09-07T14:30:00Z`). En BD, `TIMESTAMP` asumido UTC.
- **Soft delete siempre:** toda tabla lleva `created_at`, `updated_at`, `deleted_at`. Nunca `DELETE` físico.
- **Toda entidad extiende `BaseEntity`** (SPEC-002 §4.1) y no redeclara `id`, `createdAt`, `updatedAt`, `deletedAt`.
- **Prohibido cualquier `enum` de dominio y cualquier `@Enumerated` sobre datos de negocio.** Tipos, estados y roles son `catalog_items`. Excepción explícita: metadato del sistema (`client_type`, `AuditActionCode`), que se mapea con `@Enumerated(EnumType.STRING)`, nunca `ORDINAL`.
- **`password_hash` nunca sale en una respuesta ni en un log**, a ninguna profundidad. Ningún DTO tiene un campo para él.
- **Rango de migraciones:** los specs fundacionales ocupan `V001`–`V099`. Este spec **posee V002**. `V001` ya existe y no se toca.
- **Autorización por `@PreAuthorize` con `hasAuthority` sobre el `code` del rol, sin prefijo `ROLE_`**, centralizando las cadenas en constantes (`RoleCodes.ADMIN = "ADMIN"`), nunca literales repetidos.
- **Límites de tamaño de archivo** (CLAUDE.md): controllers ≤100 líneas, services ≤150, repositories ≤100, ningún archivo >200. Tipos/DTO y tests sin límite.
- **TDD estricto:** el test se escribe antes, se ejecuta y debe fallar, luego se implementa el mínimo.
- **Comando de build:** desde `backend/`, `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test`. El JDK del sistema es el 21 y no compila a release 26, así que `JAVA_HOME` es obligatorio en cada invocación.

## Notas de API verificadas (Spring Security 7.1.1)

Verificadas contra los jars reales, no asumidas. Spring Boot 4 movió varias clases:

| Clase | Paquete correcto en esta versión |
|---|---|
| `OncePerRequestFilter` | `org.springframework.web.filter` (spring-web, no security) |
| `SecurityFilterChain`, `HttpSecurity` | `org.springframework.security.web` / `...config.annotation.web.builders` |
| `EnableMethodSecurity` | `org.springframework.security.config.annotation.method.configuration` |
| `UserDetails`, `UserDetailsService` | `org.springframework.security.core.userdetails` |
| `BCryptPasswordEncoder` | `org.springframework.security.crypto.bcrypt` |
| `AuthenticationEntryPoint` | `org.springframework.security.web` |
| `AccessDeniedHandler` | `org.springframework.security.web.access` |
| `@WebMvcTest`, `@AutoConfigureMockMvc` | `org.springframework.boot.webmvc.test.autoconfigure` (starter `spring-boot-starter-webmvc-test`) |
| `@MockitoBean` | `org.springframework.test.context.bean.override.mockito` — **`@MockBean` ya no existe en esta versión** |
| `Customizer` | `org.springframework.security.config` (por si el IDE sugiere otro paquete) |

---

## File Structure

**Migraciones** (`backend/src/main/resources/db/migration/`)
- `V002__create_users.sql` — tablas `users` y `refresh_tokens` (propiedad de este spec)
- `V003__seed_role_catalog.sql` — completa el catálogo `ROLE` con los cuatro roles reales

**Compartido** (`backend/src/main/java/pe/edu/pucp/hesperides/shared/`)
- `entity/BaseEntity.java` — `id`, `createdAt`, `updatedAt`, `deletedAt`; la hereda toda entidad
- `security/RoleCodes.java` — constantes de los cuatro roles
- `security/SecurityConfig.java` — `SecurityFilterChain`, rutas públicas, entry point y handler
- `security/JwtTokenProvider.java` — firma y validación del access token
- `security/JwtAuthenticationFilter.java` — filtro por request
- `security/CustomUserDetailsService.java` — carga el usuario y refleja `is_active`
- `security/RestAuthenticationEntryPoint.java` — 401 con el sobre estándar
- `security/RestAccessDeniedHandler.java` — 403 con el sobre estándar

**Módulo auth** (`backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/`)
- `entity/User.java`, `entity/RefreshToken.java`
- `repository/UsersRepository.java`, `repository/RefreshTokensRepository.java`
- `service/AuthService.java` + `AuthServiceImpl.java` — login, refresh, logout
- `service/RefreshTokenService.java` — emisión, rotación, detección de reuso
- `service/LoginAttemptService.java` — lockout por fuerza bruta
- `controller/AuthController.java` — los cuatro endpoints
- `dto/` — `LoginRequest`, `LoginResponse`, `RefreshRequest`, `UserResponse`, `RoleResponse`

**Catálogos** (`backend/src/main/java/pe/edu/pucp/hesperides/modules/catalogs/`)
- `entity/CatalogItem.java`, `entity/CatalogType.java` — necesarias por la FK de rol

Cada archivo tiene una responsabilidad y respeta los límites de tamaño. `AuthServiceImpl` delega la rotación en `RefreshTokenService` y el lockout en `LoginAttemptService` precisamente para no superar las 150 líneas.

---

## Task 1: BaseEntity y entidades de catálogo

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/entity/BaseEntity.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/catalogs/entity/CatalogType.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/catalogs/entity/CatalogItem.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/shared/entity/BaseEntityTest.java`

**Interfaces:**
- Consumes: nada (primera tarea)
- Produces: `BaseEntity` con `getId(): Long`, `getCreatedAt(): Instant`, `getUpdatedAt(): Instant`, `getDeletedAt(): Instant`, `isDeleted(): boolean`, `softDelete(): void`. `CatalogItem` con `getCode(): String`, `getLabel(): String`, `isActive(): boolean`, `getCatalogType(): CatalogType`.

- [ ] **Step 1: Escribir el test que falla**

`backend/src/test/java/pe/edu/pucp/hesperides/shared/entity/BaseEntityTest.java`:

```java
package pe.edu.pucp.hesperides.shared.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class BaseEntityTest {

    /** Entidad mínima concreta: BaseEntity es abstracta y no se instancia sola. */
    private static class SampleEntity extends BaseEntity {
    }

    @Test
    void newEntityIsNotDeleted() {
        SampleEntity entity = new SampleEntity();

        assertThat(entity.getDeletedAt()).isNull();
        assertThat(entity.isDeleted()).isFalse();
    }

    @Test
    void softDeleteStampsDeletedAt() {
        SampleEntity entity = new SampleEntity();

        entity.softDelete();

        assertThat(entity.getDeletedAt()).isNotNull();
        assertThat(entity.isDeleted()).isTrue();
    }

    @Test
    void onCreateSetsBothTimestamps() {
        SampleEntity entity = new SampleEntity();

        entity.onCreate();

        assertThat(entity.getCreatedAt()).isNotNull();
        assertThat(entity.getUpdatedAt()).isNotNull();
        assertThat(entity.getCreatedAt()).isEqualTo(entity.getUpdatedAt());
    }

    @Test
    void onUpdateMovesUpdatedAtForward() throws InterruptedException {
        SampleEntity entity = new SampleEntity();
        entity.onCreate();
        Instant originalCreatedAt = entity.getCreatedAt();
        Thread.sleep(5);

        entity.onUpdate();

        assertThat(entity.getCreatedAt()).isEqualTo(originalCreatedAt);
        assertThat(entity.getUpdatedAt()).isAfter(originalCreatedAt);
    }
}
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=BaseEntityTest
```

Esperado: FALLA con error de compilación, `package pe.edu.pucp.hesperides.shared.entity does not exist`.

- [ ] **Step 3: Implementar BaseEntity**

`backend/src/main/java/pe/edu/pucp/hesperides/shared/entity/BaseEntity.java`:

```java
package pe.edu.pucp.hesperides.shared.entity;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.Getter;

import java.time.Instant;

/**
 * Campos que toda entidad del sistema comparte. Ninguna entidad redeclara
 * id, createdAt, updatedAt ni deletedAt: los hereda de aquí (SPEC-002 §4.1).
 *
 * El borrado es siempre lógico: deletedAt distinto de null significa que la
 * fila ya no está vigente, pero la fila permanece para trazabilidad.
 */
@Getter
@MappedSuperclass
public abstract class BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public boolean isDeleted() {
        return deletedAt != null;
    }

    public void softDelete() {
        this.deletedAt = Instant.now();
    }
}
```

Nota: `onCreate` y `onUpdate` son package-private a propósito — los invoca JPA, y el test vive en el mismo paquete, así que puede llamarlos sin abrirlos al resto de la aplicación.

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=BaseEntityTest
```

Esperado: `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Step 5: Implementar las entidades de catálogo**

`backend/src/main/java/pe/edu/pucp/hesperides/modules/catalogs/entity/CatalogType.java`:

```java
package pe.edu.pucp.hesperides.modules.catalogs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/** Agrupa los ítems de un catálogo configurable (SPEC-003). Creado por V001. */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "catalog_types")
public class CatalogType extends BaseEntity {

    @Column(nullable = false, unique = true, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_system", nullable = false)
    private boolean system;
}
```

`backend/src/main/java/pe/edu/pucp/hesperides/modules/catalogs/entity/CatalogItem.java`:

```java
package pe.edu.pucp.hesperides.modules.catalogs.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/**
 * Un valor concreto de un catálogo: un rol, un estado, un tipo. Sustituye a
 * los enum de dominio para que el cliente pueda ampliarlos sin desplegar
 * código (SPEC-003).
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "catalog_items")
public class CatalogItem extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "catalog_type_id", nullable = false)
    private CatalogType catalogType;

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
```

- [ ] **Step 6: Compilar y verificar que todo sigue verde**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test
```

Esperado: `BUILD SUCCESS`, 12 tests (8 previos + 4 nuevos).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/shared/entity/ \
        backend/src/main/java/pe/edu/pucp/hesperides/modules/catalogs/ \
        backend/src/test/java/pe/edu/pucp/hesperides/shared/entity/
git commit -m "feat(shared): agrega BaseEntity y las entidades de catalogo

BaseEntity centraliza id, createdAt, updatedAt y deletedAt para que ninguna
entidad los redeclare (SPEC-002 §4.1). El borrado es siempre logico.

CatalogItem y CatalogType mapean las tablas que V001 ya creo: la FK de rol
de users apunta a catalog_items, no a un enum Java (SPEC-003).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Migración V002 y catálogo ROLE completo

**Files:**
- Create: `backend/src/main/resources/db/migration/V002__create_users.sql`
- Create: `backend/src/main/resources/db/migration/V003__seed_role_catalog.sql`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/migration/MigrationSmokeTest.java`
- Modify: `backend/pom.xml` (añadir Testcontainers)

**Interfaces:**
- Consumes: nada del código Java; V001 debe existir ya (crea `catalog_types`/`catalog_items`)
- Produces: tablas `users` y `refresh_tokens` con la forma exacta que el resto del plan asume; catálogo `ROLE` con los códigos `ADMIN`, `COORDINADOR`, `SUPERVISOR`, `OPERARIO`

**Contexto necesario:** V001 sembró el catálogo `ROLE` con solo dos ítems (`ADMIN` y `USER`). El spec exige cuatro roles reales y que `USER` quede desactivado (SPEC-003 §8). No se edita V001 —una migración ya aplicada no se toca, rompería el checksum de Flyway—, se corrige con V003.

- [ ] **Step 1: Añadir Testcontainers al pom**

En `backend/pom.xml`, dentro de `<dependencies>`, junto a las demás de test:

```xml
        <!-- Las migraciones se prueban contra PostgreSQL real: H2 no soporta
             indices parciales (WHERE deleted_at IS NULL) ni JSONB. -->
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-testcontainers</artifactId>
            <scope>test</scope>
        </dependency>
```

- [ ] **Step 2: Escribir el test de migración que falla**

`backend/src/test/java/pe/edu/pucp/hesperides/migration/MigrationSmokeTest.java`:

```java
package pe.edu.pucp.hesperides.migration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** Verifica que Flyway aplica todas las migraciones y deja el esquema esperado. */
@Testcontainers
@SpringBootTest
class MigrationSmokeTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void usersTableHasEveryColumnTheSpecDeclares() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
                String.class);

        assertThat(columns).containsExactlyInAnyOrder(
                "id", "email", "password_hash", "first_name", "last_name",
                "role_item_id", "is_active", "last_login",
                "created_at", "updated_at", "deleted_at");
    }

    @Test
    void refreshTokensTableHasEveryColumnTheSpecDeclares() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'refresh_tokens'",
                String.class);

        assertThat(columns).containsExactlyInAnyOrder(
                "id", "user_id", "token_hash", "issued_at", "expires_at",
                "revoked_at", "replaced_by_id", "client_type", "user_agent",
                "created_at", "updated_at", "deleted_at");
    }

    @Test
    void emailIsUniqueOnlyAmongLiveRows() {
        jdbcTemplate.execute("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, deleted_at)
                VALUES ('repetido@pucp.edu.pe', 'hash', 'A', 'B',
                        (SELECT id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'),
                        CURRENT_TIMESTAMP)
                """);

        // El mismo correo vuelve a estar libre porque la fila anterior está dada de baja.
        jdbcTemplate.execute("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                VALUES ('repetido@pucp.edu.pe', 'hash', 'A', 'B',
                        (SELECT id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'))
                """);

        Integer live = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email = 'repetido@pucp.edu.pe' AND deleted_at IS NULL",
                Integer.class);
        assertThat(live).isEqualTo(1);
    }

    @Test
    void roleCatalogHasTheFourRealRolesActive() {
        List<String> codes = jdbcTemplate.queryForList("""
                SELECT ci.code FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'ROLE' AND ci.is_active = TRUE
                """, String.class);

        assertThat(codes).containsExactlyInAnyOrder(
                "ADMIN", "COORDINADOR", "SUPERVISOR", "OPERARIO");
    }

    @Test
    void genericUserRoleFromV001IsDeactivatedNotDeleted() {
        Boolean active = jdbcTemplate.queryForObject("""
                SELECT ci.is_active FROM catalog_items ci
                JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                WHERE ct.code = 'ROLE' AND ci.code = 'USER'
                """, Boolean.class);

        assertThat(active).isFalse();
    }
}
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=MigrationSmokeTest
```

Esperado: FALLA. `users` no existe todavía, así que la consulta a `information_schema` devuelve lista vacía.

- [ ] **Step 4: Escribir V002**

`backend/src/main/resources/db/migration/V002__create_users.sql`:

```sql
-- Propiedad de SPEC-001. Ningún otro spec crea ni altera estas dos tablas.

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

-- Único entre vigentes: libera el correo si el usuario se da de baja lógica
-- y se necesita reutilizarlo.
CREATE UNIQUE INDEX idx_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role_item_id ON users(role_item_id);

-- Revocación de sesiones: un JWT firmado no se puede "borrar", así que la
-- capacidad de cerrar sesión de verdad vive en esta tabla, no en el token.
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

- [ ] **Step 5: Escribir V003**

`backend/src/main/resources/db/migration/V003__seed_role_catalog.sql`:

```sql
-- V001 sembró el catálogo ROLE con solo ADMIN y un USER genérico. El dominio
-- real tiene cuatro roles (SPEC-001 Anexo A). No se edita V001: una migración
-- aplicada no se toca, rompería el checksum de Flyway.

INSERT INTO catalog_items (catalog_type_id, code, label, sort_order)
SELECT (SELECT id FROM catalog_types WHERE code = 'ROLE'), v.code, v.label, v.sort_order
FROM (VALUES
    ('COORDINADOR', 'Coordinador', 2),
    ('SUPERVISOR',  'Supervisor de cuadrilla', 3),
    ('OPERARIO',    'Operario de campo', 4)
) AS v(code, label, sort_order);

-- ADMIN ya existía desde V001; solo se corrige su etiqueta y su orden.
UPDATE catalog_items SET label = 'Administrador', sort_order = 1
WHERE code = 'ADMIN'
  AND catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'ROLE');

-- El USER genérico se desactiva, no se borra: si alguna fila de prueba ya lo
-- referencia, un DELETE rompería la FK. Desactivado deja de ofrecerse en los
-- selects pero la referencia histórica sigue siendo válida (SPEC-003 §7.1).
UPDATE catalog_items SET is_active = FALSE
WHERE code = 'USER'
  AND catalog_type_id = (SELECT id FROM catalog_types WHERE code = 'ROLE');
```

- [ ] **Step 6: Ejecutar el test y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=MigrationSmokeTest
```

Esperado: `Tests run: 5, Failures: 0, Errors: 0`. Docker debe estar corriendo (Testcontainers levanta PostgreSQL 16).

- [ ] **Step 7: Verificar contra la base real del entorno de desarrollo**

```bash
docker compose down -v && docker compose up -d db backend
sleep 30
docker exec hesperides-db psql -U hesperides -d hesperides -c "\d users"
docker exec hesperides-db psql -U hesperides -d hesperides -c "SELECT ci.code, ci.is_active FROM catalog_items ci JOIN catalog_types ct ON ct.id = ci.catalog_type_id WHERE ct.code = 'ROLE' ORDER BY ci.sort_order;"
```

Esperado: `users` con sus 11 columnas; cinco roles listados, con `USER` en `is_active = f` y los otros cuatro en `t`.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/db/migration/ \
        backend/src/test/java/pe/edu/pucp/hesperides/migration/ backend/pom.xml
git commit -m "feat(db): crea users y refresh_tokens (V002) y completa el catalogo ROLE (V003)

V002 es propiedad de SPEC-001: ningun otro spec crea ni altera estas tablas.
El indice unico de email es parcial (WHERE deleted_at IS NULL) para que dar
de baja a alguien libere su correo.

V003 corrige el catalogo ROLE que V001 dejo incompleto: agrega COORDINADOR,
SUPERVISOR y OPERARIO, y desactiva el USER generico en vez de borrarlo, que
romperia cualquier FK que ya lo referencie.

Las migraciones se prueban con Testcontainers sobre PostgreSQL real: H2 no
soporta indices parciales y dejaria sin verificar justamente esa regla.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Entidades User y RefreshToken con sus repositorios

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/entity/User.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/entity/RefreshToken.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/entity/ClientType.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/repository/UsersRepository.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/repository/RefreshTokensRepository.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/repository/UsersRepositoryTest.java`

**Interfaces:**
- Consumes: `BaseEntity` y `CatalogItem` (Task 1); tablas de V002 (Task 2)
- Produces:
  - `User` con `getEmail()`, `getPasswordHash()`, `getFirstName()`, `getLastName()`, `getRoleItem(): CatalogItem`, `isActive()`, `getLastLogin(): Instant`, `getFullName(): String`
  - `UsersRepository.findActiveByEmail(String): Optional<User>`
  - `RefreshTokensRepository.findByTokenHash(String): Optional<RefreshToken>`, `revokeAllForUser(Long, Instant): int`

- [ ] **Step 1: Escribir el test de repositorio que falla**

`backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/repository/UsersRepositoryTest.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
@Transactional
class UsersRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private UsersRepository usersRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private void insertUser(String email, boolean active, boolean deleted) {
        jdbcTemplate.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, is_active, deleted_at)
                VALUES (?, 'hash', 'Juan', 'Perez',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'OPERARIO'),
                        ?, ?)
                """, email, active, deleted ? java.sql.Timestamp.from(java.time.Instant.now()) : null);
    }

    @Test
    void findsAnActiveUserByEmail() {
        insertUser("activo@pucp.edu.pe", true, false);

        Optional<User> found = usersRepository.findActiveByEmail("activo@pucp.edu.pe");

        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("activo@pucp.edu.pe");
        assertThat(found.get().getFullName()).isEqualTo("Juan Perez");
    }

    @Test
    void doesNotFindASoftDeletedUser() {
        insertUser("borrado@pucp.edu.pe", true, true);

        assertThat(usersRepository.findActiveByEmail("borrado@pucp.edu.pe")).isEmpty();
    }

    @Test
    void findsADeactivatedUserBecauseLoginMustDistinguishItLater() {
        // findActiveByEmail filtra por deleted_at, no por is_active: quien decide
        // qué hacer con una cuenta desactivada es el servicio de login, que debe
        // poder distinguir "no existe" de "existe pero está desactivada".
        insertUser("inactivo@pucp.edu.pe", false, false);

        Optional<User> found = usersRepository.findActiveByEmail("inactivo@pucp.edu.pe");

        assertThat(found).isPresent();
        assertThat(found.get().isActive()).isFalse();
    }

    @Test
    void loadsTheRoleAsACatalogItemNotAnEnum() {
        insertUser("conrol@pucp.edu.pe", true, false);

        User user = usersRepository.findActiveByEmail("conrol@pucp.edu.pe").orElseThrow();

        assertThat(user.getRoleItem().getCode()).isEqualTo("OPERARIO");
        assertThat(user.getRoleItem().getLabel()).isEqualTo("Operario de campo");
    }
}
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=UsersRepositoryTest
```

Esperado: FALLA con error de compilación, `package pe.edu.pucp.hesperides.modules.auth.entity does not exist`.

- [ ] **Step 3: Implementar las entidades**

`backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/entity/User.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.time.Instant;

/**
 * Cuenta de una persona del sistema. El rol es una fila de catalog_items
 * (tipo ROLE), nunca un enum: el cliente puede añadir roles sin desplegar.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "users")
public class User extends BaseEntity {

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;

    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_item_id", nullable = false)
    private CatalogItem roleItem;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "last_login")
    private Instant lastLogin;

    /**
     * Se compone al vuelo en vez de guardarse: los reportes necesitan el
     * apellido por separado, y un campo derivado en BD se desincroniza.
     */
    public String getFullName() {
        return firstName + " " + lastName;
    }

    public String getRoleCode() {
        return roleItem.getCode();
    }
}
```

El rol se carga `EAGER` a propósito: `CustomUserDetailsService` necesita el `code` en cada request para construir las authorities, y con `LAZY` fallaría fuera de la sesión de Hibernate (`open-in-view` está en `false`).

`backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/entity/ClientType.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.entity;

/**
 * Metadato del sistema, no un dato de negocio: por eso es un enum Java y no
 * un catálogo configurable. Un administrador no puede inventar un tercer tipo
 * de cliente desde la UI porque ningún código sabría atenderlo (SPEC-004 §3.1
 * aplica el mismo criterio a AuditActionCode).
 */
public enum ClientType {
    WEB("web"),
    MOBILE("mobile");

    private final String value;

    ClientType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static ClientType fromHeader(String header) {
        return MOBILE.value.equalsIgnoreCase(header) ? MOBILE : WEB;
    }
}
```

`backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/entity/RefreshToken.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

import java.time.Instant;

/**
 * Solo se guarda el hash SHA-256 del refresh token, nunca el token en claro:
 * si la tabla se filtra, no expone credenciales reutilizables.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "refresh_tokens")
public class RefreshToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "token_hash", nullable = false, length = 255)
    private String tokenHash;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    /** Encadena la rotación: permite revocar toda la cadena ante un reuso. */
    @Column(name = "replaced_by_id")
    private Long replacedById;

    @Enumerated(EnumType.STRING)
    @Column(name = "client_type", nullable = false, length = 10)
    private ClientType clientType;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    public boolean isRevoked() {
        return revokedAt != null;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public boolean isUsable() {
        return !isRevoked() && !isExpired();
    }
}
```

**Atención:** `ClientType` se persiste con `EnumType.STRING`, pero la columna tiene `CHECK (client_type IN ('web','mobile'))` en minúsculas mientras el enum serializa `WEB`/`MOBILE`. Hay que resolverlo con un converter para que el CHECK no rechace la inserción. Añadir en el mismo paquete:

```java
package pe.edu.pucp.hesperides.modules.auth.entity;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Traduce el enum a los valores en minúscula que exige el CHECK de V002. */
@Converter(autoApply = false)
public class ClientTypeConverter implements AttributeConverter<ClientType, String> {

    @Override
    public String convertToDatabaseColumn(ClientType attribute) {
        return attribute == null ? null : attribute.getValue();
    }

    @Override
    public ClientType convertToEntityAttribute(String dbData) {
        return dbData == null ? null : ClientType.fromHeader(dbData);
    }
}
```

Y en `RefreshToken`, sustituir `@Enumerated(EnumType.STRING)` por `@Convert(converter = ClientTypeConverter.class)` (importando `jakarta.persistence.Convert`).

- [ ] **Step 4: Implementar los repositorios**

`backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/repository/UsersRepository.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

import java.util.Optional;

public interface UsersRepository extends JpaRepository<User, Long> {

    /**
     * Busca entre las cuentas vigentes (no dadas de baja lógica). No filtra
     * por is_active a propósito: el servicio de login necesita distinguir
     * "no existe" de "existe pero está desactivada" para decidir qué hacer,
     * aunque el mensaje que devuelva al cliente sea el mismo.
     */
    @Query("SELECT u FROM User u WHERE u.email = :email AND u.deletedAt IS NULL")
    Optional<User> findActiveByEmail(@Param("email") String email);

    @Query("SELECT COUNT(u) FROM User u WHERE u.roleItem.code = 'ADMIN' "
            + "AND u.active = TRUE AND u.deletedAt IS NULL AND u.id <> :excludedId")
    long countOtherActiveAdmins(@Param("excludedId") Long excludedId);
}
```

`backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/repository/RefreshTokensRepository.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.auth.entity.RefreshToken;

import java.time.Instant;
import java.util.Optional;

public interface RefreshTokensRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * Revocación masiva: la usa el logout, la desactivación de un usuario y la
     * detección de reuso de un token rotado.
     */
    @Modifying
    @Query("UPDATE RefreshToken rt SET rt.revokedAt = :now "
            + "WHERE rt.user.id = :userId AND rt.revokedAt IS NULL")
    int revokeAllForUser(@Param("userId") Long userId, @Param("now") Instant now);
}
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=UsersRepositoryTest
```

Esperado: `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/ \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/
git commit -m "feat(auth): agrega las entidades User y RefreshToken con sus repositorios

El rol de User es un ManyToOne a CatalogItem, cargado EAGER porque el filtro
JWT necesita el code en cada request y open-in-view esta desactivado.

RefreshToken guarda solo el hash SHA-256 del token y encadena la rotacion con
replaced_by_id, que es lo que permite revocar toda la cadena ante un reuso.

findActiveByEmail filtra por deleted_at pero no por is_active: quien decide
que hacer con una cuenta desactivada es el servicio de login.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: JwtTokenProvider

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/security/JwtTokenProvider.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/security/RoleCodes.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/shared/security/JwtTokenProviderTest.java`
- Modify: `backend/pom.xml` (jjwt), `backend/src/main/resources/application.yml`, `.env.example`

**Interfaces:**
- Consumes: nada
- Produces: `JwtTokenProvider.generateAccessToken(String email, String roleCode): String`, `validateToken(String): boolean`, `extractEmail(String): String`, `extractRoleCode(String): String`, `getAccessTokenValiditySeconds(): long`

- [ ] **Step 1: Añadir jjwt y la configuración**

En `backend/pom.xml`, junto a las dependencias de producción:

```xml
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>0.12.6</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>0.12.6</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>0.12.6</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
```

En `backend/src/main/resources/application.yml`, al final:

```yaml
hesperides:
  security:
    jwt:
      # Sin valor por defecto: si falta la variable, la aplicación no arranca
      # (fail fast). Una clave por defecto en el código es una puerta abierta.
      secret: ${JWT_SECRET}
      access-token-validity-seconds: 1800
      refresh-token-validity-days: 7
```

En `.env.example`, bajo la sección del backend:

```
# Clave de firma JWT: minimo 32 caracteres (HS256). Generar una distinta por
# entorno con: openssl rand -base64 48
JWT_SECRET=cambiar_por_una_clave_larga_y_aleatoria_de_al_menos_32_chars
```

Y en `docker-compose.yml`, dentro de `environment:` del servicio `backend`, añadir `JWT_SECRET: ${JWT_SECRET}`.

- [ ] **Step 2: Escribir el test que falla**

`backend/src/test/java/pe/edu/pucp/hesperides/shared/security/JwtTokenProviderTest.java`:

```java
package pe.edu.pucp.hesperides.shared.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenProviderTest {

    private static final String SECRET = "una-clave-de-prueba-suficientemente-larga-para-hs256!!";

    private JwtTokenProvider provider;

    @BeforeEach
    void setUp() {
        provider = new JwtTokenProvider(SECRET, 1800, 7);
    }

    @Test
    void generatesATokenThatValidatesAndCarriesEmailAndRole() {
        String token = provider.generateAccessToken("ana@pucp.edu.pe", "COORDINADOR");

        assertThat(provider.validateToken(token)).isTrue();
        assertThat(provider.extractEmail(token)).isEqualTo("ana@pucp.edu.pe");
        assertThat(provider.extractRoleCode(token)).isEqualTo("COORDINADOR");
    }

    @Test
    void rejectsATamperedToken() {
        String token = provider.generateAccessToken("ana@pucp.edu.pe", "ADMIN");
        String tampered = token.substring(0, token.length() - 4) + "AAAA";

        assertThat(provider.validateToken(tampered)).isFalse();
    }

    @Test
    void rejectsATokenSignedWithAnotherKey() {
        JwtTokenProvider otherProvider =
                new JwtTokenProvider("otra-clave-distinta-igual-de-larga-para-hs256!!!", 1800, 7);
        String foreignToken = otherProvider.generateAccessToken("ana@pucp.edu.pe", "ADMIN");

        assertThat(provider.validateToken(foreignToken)).isFalse();
    }

    @Test
    void rejectsAnExpiredToken() {
        JwtTokenProvider instantExpiry = new JwtTokenProvider(SECRET, -1, 7);
        String expired = instantExpiry.generateAccessToken("ana@pucp.edu.pe", "ADMIN");

        assertThat(provider.validateToken(expired)).isFalse();
    }

    @Test
    void rejectsGarbageInsteadOfThrowing() {
        assertThat(provider.validateToken("esto-no-es-un-jwt")).isFalse();
        assertThat(provider.validateToken("")).isFalse();
    }

    @Test
    void exposesTheConfiguredValidityForTheLoginResponse() {
        assertThat(provider.getAccessTokenValiditySeconds()).isEqualTo(1800);
    }
}
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=JwtTokenProviderTest
```

Esperado: FALLA, `cannot find symbol: class JwtTokenProvider`.

- [ ] **Step 4: Implementar RoleCodes y JwtTokenProvider**

`backend/src/main/java/pe/edu/pucp/hesperides/shared/security/RoleCodes.java`:

```java
package pe.edu.pucp.hesperides.shared.security;

/**
 * Los códigos de rol viven aquí y no como literales repetidos en cada
 * @PreAuthorize: una cadena mágica escrita veinte veces se escribe mal
 * alguna de ellas, y un rol mal escrito no da error de compilación, da un
 * endpoint que nadie puede usar.
 *
 * Coinciden exactamente con catalog_items.code del catálogo ROLE.
 */
public final class RoleCodes {

    public static final String ADMIN = "ADMIN";
    public static final String COORDINADOR = "COORDINADOR";
    public static final String SUPERVISOR = "SUPERVISOR";
    public static final String OPERARIO = "OPERARIO";

    private RoleCodes() {
    }
}
```

`backend/src/main/java/pe/edu/pucp/hesperides/shared/security/JwtTokenProvider.java`:

```java
package pe.edu.pucp.hesperides.shared.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/** Firma y valida el access token. No consulta la base de datos. */
@Slf4j
@Component
public class JwtTokenProvider {

    private static final String ROLE_CLAIM = "role";

    private final SecretKey signingKey;

    @Getter
    private final long accessTokenValiditySeconds;

    @Getter
    private final long refreshTokenValidityDays;

    public JwtTokenProvider(
            @Value("${hesperides.security.jwt.secret}") String secret,
            @Value("${hesperides.security.jwt.access-token-validity-seconds}") long accessTokenValiditySeconds,
            @Value("${hesperides.security.jwt.refresh-token-validity-days}") long refreshTokenValidityDays) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTokenValiditySeconds = accessTokenValiditySeconds;
        this.refreshTokenValidityDays = refreshTokenValidityDays;
    }

    public String generateAccessToken(String email, String roleCode) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email)
                .claim(ROLE_CLAIM, roleCode)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(accessTokenValiditySeconds)))
                .signWith(signingKey)
                .compact();
    }

    /** Devuelve false ante cualquier token inválido; nunca propaga la excepción. */
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Token rechazado: {}", ex.getMessage());
            return false;
        }
    }

    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    public String extractRoleCode(String token) {
        return parseClaims(token).get(ROLE_CLAIM, String.class);
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=JwtTokenProviderTest
```

Esperado: `Tests run: 6, Failures: 0, Errors: 0`.

- [ ] **Step 6: Commit**

```bash
git add backend/pom.xml backend/src/main/resources/application.yml .env.example docker-compose.yml \
        backend/src/main/java/pe/edu/pucp/hesperides/shared/security/ \
        backend/src/test/java/pe/edu/pucp/hesperides/shared/security/
git commit -m "feat(security): agrega JwtTokenProvider y las constantes de rol

El secreto JWT no tiene valor por defecto: si falta la variable de entorno la
aplicacion no arranca, en vez de firmar con una clave conocida.

validateToken devuelve false ante cualquier token invalido en vez de propagar
la excepcion, para que el filtro no tenga que distinguir entre firma rota,
token vencido y basura: en los tres casos la respuesta al cliente es la misma.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: CustomUserDetailsService, filtro JWT y SecurityConfig

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/security/CustomUserDetailsService.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/security/JwtAuthenticationFilter.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/security/RestAuthenticationEntryPoint.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/security/RestAccessDeniedHandler.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/security/SecurityConfig.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/shared/security/CustomUserDetailsServiceTest.java`

**Interfaces:**
- Consumes: `UsersRepository` (Task 3), `JwtTokenProvider` (Task 4)
- Produces: `SecurityFilterChain` configurada; `PasswordEncoder` como bean; authorities con el `code` del rol sin prefijo `ROLE_`

- [ ] **Step 1: Escribir el test que falla**

`backend/src/test/java/pe/edu/pucp/hesperides/shared/security/CustomUserDetailsServiceTest.java`:

```java
package pe.edu.pucp.hesperides.shared.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock
    private UsersRepository usersRepository;

    @InjectMocks
    private CustomUserDetailsService service;

    private User userWithRole(String roleCode, boolean active) {
        CatalogItem role = new CatalogItem();
        role.setCode(roleCode);
        role.setLabel(roleCode);

        User user = new User();
        user.setEmail("ana@pucp.edu.pe");
        user.setPasswordHash("$2a$10$hashficticio");
        user.setFirstName("Ana");
        user.setLastName("Torres");
        user.setRoleItem(role);
        user.setActive(active);
        return user;
    }

    @Test
    void exposesTheRoleCodeAsAuthorityWithoutRolePrefix() {
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe"))
                .thenReturn(Optional.of(userWithRole("COORDINADOR", true)));

        UserDetails details = service.loadUserByUsername("ana@pucp.edu.pe");

        assertThat(details.getAuthorities()).extracting("authority")
                .containsExactly("COORDINADOR");
    }

    @Test
    void marksADeactivatedUserAsDisabled() {
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe"))
                .thenReturn(Optional.of(userWithRole("OPERARIO", false)));

        UserDetails details = service.loadUserByUsername("ana@pucp.edu.pe");

        assertThat(details.isEnabled()).isFalse();
    }

    @Test
    void throwsWhenTheUserDoesNotExist() {
        when(usersRepository.findActiveByEmail("nadie@pucp.edu.pe"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.loadUserByUsername("nadie@pucp.edu.pe"))
                .isInstanceOf(UsernameNotFoundException.class);
    }

    @Test
    void neverExposesThePasswordHashThroughAnythingButGetPassword() {
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe"))
                .thenReturn(Optional.of(userWithRole("ADMIN", true)));

        UserDetails details = service.loadUserByUsername("ana@pucp.edu.pe");

        // getPassword es el único canal legítimo: lo consume el AuthenticationManager.
        assertThat(details.getPassword()).isEqualTo("$2a$10$hashficticio");
        assertThat(details.toString()).doesNotContain("$2a$10$hashficticio");
    }
}
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=CustomUserDetailsServiceTest
```

Esperado: FALLA, `cannot find symbol: class CustomUserDetailsService`.

- [ ] **Step 3: Implementar CustomUserDetailsService**

```java
package pe.edu.pucp.hesperides.shared.security;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;

import java.util.List;

/**
 * Carga el usuario en cada request. Consultar la base en cada llamada es
 * deliberado: es lo que hace que desactivar una cuenta surta efecto sin
 * esperar a que expire su access token (SPEC-001 §2.6).
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UsersRepository usersRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        User user = usersRepository.findActiveByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + email));

        // La authority es el code tal cual, sin prefijo ROLE_, para que coincida
        // exactamente con catalog_items.code y se use con hasAuthority.
        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPasswordHash())
                .authorities(List.of(new SimpleGrantedAuthority(user.getRoleCode())))
                .disabled(!user.isActive())
                .build();
    }
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=CustomUserDetailsServiceTest
```

Esperado: `Tests run: 4, Failures: 0, Errors: 0`.

- [ ] **Step 5: Implementar el filtro y los handlers**

`JwtAuthenticationFilter.java`:

```java
package pe.edu.pucp.hesperides.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/** Autentica cada request a partir del header Authorization: Bearer. */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtTokenProvider tokenProvider;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String token = extractToken(request);

        if (token != null && tokenProvider.validateToken(token)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            authenticate(request, token);
        }

        filterChain.doFilter(request, response);
    }

    private void authenticate(HttpServletRequest request, String token) {
        try {
            UserDetails userDetails = userDetailsService.loadUserByUsername(tokenProvider.extractEmail(token));

            // Un usuario desactivado tras la emisión del token llega hasta aquí
            // con firma válida; isEnabled() es lo que corta esa ventana.
            if (!userDetails.isEnabled()) {
                return;
            }

            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authentication);
        } catch (UsernameNotFoundException ex) {
            // Token válido de una cuenta ya borrada: se deja sin autenticar y
            // el entry point responde 401.
            SecurityContextHolder.clearContext();
        }
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        return header != null && header.startsWith(BEARER_PREFIX)
                ? header.substring(BEARER_PREFIX.length())
                : null;
    }
}
```

`RestAuthenticationEntryPoint.java`:

```java
package pe.edu.pucp.hesperides.shared.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.io.IOException;

/** 401 con el sobre estándar, nunca la página HTML por defecto de Spring. */
@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(),
                ApiResponse.error("Invalid or expired token"));
    }
}
```

`RestAccessDeniedHandler.java`:

```java
package pe.edu.pucp.hesperides.shared.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.io.IOException;

/** 403 con el sobre estándar cuando el rol no alcanza. */
@Component
@RequiredArgsConstructor
public class RestAccessDeniedHandler implements AccessDeniedHandler {

    private final ObjectMapper objectMapper;

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response,
                       AccessDeniedException accessDeniedException) throws IOException {
        response.setStatus(HttpStatus.FORBIDDEN.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(),
                ApiResponse.error("Insufficient permissions for this action"));
    }
}
```

`SecurityConfig.java`:

```java
package pe.edu.pucp.hesperides.shared.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final RestAccessDeniedHandler accessDeniedHandler;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // Sin sesión de servidor: toda la autenticación vive en el JWT
                // y en refresh_tokens. CSRF no aplica a una API stateless con
                // token en header; la cookie de refresh se protege con SameSite.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/refresh").permitAll()
                        .requestMatchers("/api/v1/health").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
            throws Exception {
        return configuration.getAuthenticationManager();
    }
}
```

- [ ] **Step 6: Verificar que la aplicación sigue arrancando**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test
```

Esperado: `BUILD SUCCESS`. El `HealthControllerTest` existente debe seguir pasando: `/api/v1/health` está en las rutas públicas.

Si `HealthControllerTest` falla con 401, es porque `@WebMvcTest` carga la configuración de seguridad; añadir `@AutoConfigureMockMvc(addFilters = false)` a ese test **no** es la solución correcta — la ruta debe ser pública de verdad. Verificar primero que `/api/v1/health` está en `permitAll()`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/shared/security/ \
        backend/src/test/java/pe/edu/pucp/hesperides/shared/security/
git commit -m "feat(security): agrega el filtro JWT, los handlers de error y SecurityConfig

CustomUserDetailsService consulta la base en cada request a proposito: es lo
que hace que desactivar una cuenta corte el acceso sin esperar a que expire
el access token, en vez de confiar en un claim congelado del JWT.

Las authorities son el code del rol sin prefijo ROLE_, para que coincidan
exactamente con catalog_items.code y se usen con hasAuthority.

401 y 403 responden con el sobre {ok,message,data}, nunca con la pagina HTML
por defecto de Spring Security.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: RefreshTokenService — emisión, rotación y detección de reuso

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/service/RefreshTokenService.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/service/RefreshTokenServiceTest.java`

**Interfaces:**
- Consumes: `RefreshTokensRepository`, `RefreshToken`, `User`, `ClientType` (Task 3); `JwtTokenProvider` (Task 4)
- Produces: `RefreshTokenService.issue(User, ClientType, String userAgent): String` (devuelve el token en claro, que solo existe en ese instante), `rotate(String rawToken, ClientType, String userAgent): RotationResult`, `revokeAll(Long userId): int`. `RotationResult` es un record con `user()` y `rawToken()`.

- [ ] **Step 1: Escribir el test que falla**

`backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/service/RefreshTokenServiceTest.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;
import pe.edu.pucp.hesperides.modules.auth.entity.RefreshToken;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.RefreshTokensRepository;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokensRepository refreshTokensRepository;

    private RefreshTokenService service;

    private User user;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        service = new RefreshTokenService(refreshTokensRepository, 7);
        user = new User();
        user.setEmail("ana@pucp.edu.pe");
    }

    @Test
    void issuedTokenIsNeverStoredInPlainText() {
        when(refreshTokensRepository.saveAndFlush(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        String rawToken = service.issue(user, ClientType.WEB, "Mozilla/5.0");

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokensRepository).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getTokenHash()).isNotEqualTo(rawToken);
        assertThat(saved.getValue().getTokenHash()).hasSize(64); // SHA-256 en hexadecimal
    }

    @Test
    void issuedTokenExpiresInTheConfiguredNumberOfDays() {
        when(refreshTokensRepository.saveAndFlush(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        service.issue(user, ClientType.MOBILE, "okhttp");

        ArgumentCaptor<RefreshToken> saved = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokensRepository).saveAndFlush(saved.capture());
        long days = ChronoUnit.DAYS.between(saved.getValue().getIssuedAt(), saved.getValue().getExpiresAt());
        assertThat(days).isEqualTo(7);
    }

    @Test
    void twoIssuedTokensAreDifferent() {
        when(refreshTokensRepository.saveAndFlush(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        String first = service.issue(user, ClientType.WEB, null);
        String second = service.issue(user, ClientType.WEB, null);

        assertThat(first).isNotEqualTo(second);
    }

    @Test
    void rotationRevokesTheOldTokenAndLinksTheChain() {
        RefreshToken existing = usableToken();
        when(refreshTokensRepository.findByTokenHash(any())).thenReturn(Optional.of(existing));
        // saveAndFlush devuelve la fila nueva ya con id, como haría la base.
        when(refreshTokensRepository.saveAndFlush(any(RefreshToken.class))).thenAnswer(inv -> {
            RefreshToken fresh = inv.getArgument(0);
            setId(fresh, 99L);
            return fresh;
        });
        when(refreshTokensRepository.save(any(RefreshToken.class))).thenAnswer(inv -> inv.getArgument(0));

        RefreshTokenService.RotationResult result =
                service.rotate("cualquier-token", ClientType.WEB, "Mozilla/5.0");

        assertThat(existing.getRevokedAt()).isNotNull();
        assertThat(existing.getReplacedById()).isEqualTo(99L);
        assertThat(result.rawToken()).isNotBlank();
        assertThat(result.user()).isEqualTo(existing.getUser());
    }

    @Test
    void reusingAnAlreadyRevokedTokenRevokesTheWholeChain() {
        RefreshToken revoked = usableToken();
        revoked.setRevokedAt(Instant.now().minusSeconds(60));
        when(refreshTokensRepository.findByTokenHash(any())).thenReturn(Optional.of(revoked));

        assertThatThrownBy(() -> service.rotate("token-robado", ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class);

        verify(refreshTokensRepository).revokeAllForUser(anyLong(), any(Instant.class));
        // Ante un reuso no se emite ningún token nuevo: la sesión se cierra.
        verify(refreshTokensRepository, never()).save(any(RefreshToken.class));
        verify(refreshTokensRepository, never()).saveAndFlush(any(RefreshToken.class));
    }

    @Test
    void rotatingAnExpiredTokenFailsWithoutRevokingTheChain() {
        RefreshToken expired = usableToken();
        expired.setExpiresAt(Instant.now().minusSeconds(60));
        when(refreshTokensRepository.findByTokenHash(any())).thenReturn(Optional.of(expired));

        assertThatThrownBy(() -> service.rotate("token-vencido", ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class);

        // Vencer no es sospechoso: no hay motivo para cerrar las demás sesiones.
        verify(refreshTokensRepository, never()).revokeAllForUser(anyLong(), any(Instant.class));
    }

    @Test
    void rotatingAnUnknownTokenFails() {
        when(refreshTokensRepository.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.rotate("inventado", ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class);
    }

    private RefreshToken usableToken() {
        User owner = new User();
        owner.setEmail("ana@pucp.edu.pe");
        setId(owner, 1L);

        RefreshToken token = new RefreshToken();
        setId(token, 10L);
        token.setUser(owner);
        token.setTokenHash("hash");
        token.setIssuedAt(Instant.now().minusSeconds(3600));
        token.setExpiresAt(Instant.now().plusSeconds(3600));
        token.setClientType(ClientType.WEB);
        return token;
    }

    private void setId(Object entity, Long id) {
        try {
            java.lang.reflect.Field field =
                    pe.edu.pucp.hesperides.shared.entity.BaseEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("No se pudo fijar el id en el test", ex);
        }
    }
}
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=RefreshTokenServiceTest
```

Esperado: FALLA, `cannot find symbol: class RefreshTokenService`.

- [ ] **Step 3: Implementar RefreshTokenService**

```java
package pe.edu.pucp.hesperides.modules.auth.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;
import pe.edu.pucp.hesperides.modules.auth.entity.RefreshToken;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.RefreshTokensRepository;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;

/**
 * Emite y rota refresh tokens. El token en claro existe solo el instante que
 * tarda en viajar al cliente: en base solo queda su hash SHA-256.
 */
@Slf4j
@Service
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 32;

    private final RefreshTokensRepository refreshTokensRepository;
    private final long validityDays;
    private final SecureRandom secureRandom = new SecureRandom();

    public RefreshTokenService(
            RefreshTokensRepository refreshTokensRepository,
            @Value("${hesperides.security.jwt.refresh-token-validity-days}") long validityDays) {
        this.refreshTokensRepository = refreshTokensRepository;
        this.validityDays = validityDays;
    }

    /** Devuelve el token en claro; el llamador es responsable de entregarlo y olvidarlo. */
    @Transactional
    public String issue(User user, ClientType clientType, String userAgent) {
        return issueEntity(user, clientType, userAgent).rawToken();
    }

    /**
     * Igual que issue(), pero devuelve también la fila persistida. La rotación
     * la necesita para encadenar replaced_by_id sin tener que volver a buscar
     * por hash, que dependería de que Hibernate ya hubiera hecho flush.
     */
    private IssuedToken issueEntity(User user, ClientType clientType, String userAgent) {
        byte[] randomBytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);

        Instant now = Instant.now();
        RefreshToken token = new RefreshToken();
        token.setUser(user);
        token.setTokenHash(hash(rawToken));
        token.setIssuedAt(now);
        token.setExpiresAt(now.plus(validityDays, ChronoUnit.DAYS));
        token.setClientType(clientType);
        token.setUserAgent(userAgent);

        return new IssuedToken(refreshTokensRepository.saveAndFlush(token), rawToken);
    }

    private record IssuedToken(RefreshToken entity, String rawToken) {
    }

    /**
     * Rota el token: emite uno nuevo y revoca el usado. Si el token recibido ya
     * estaba revocado, se interpreta como reuso de un token robado y se revoca
     * la cadena entera del usuario.
     */
    @Transactional
    public RotationResult rotate(String rawToken, ClientType clientType, String userAgent) {
        RefreshToken existing = refreshTokensRepository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired token"));

        if (existing.isRevoked()) {
            log.warn("Reuso de refresh token detectado para el usuario {}", existing.getUser().getId());
            refreshTokensRepository.revokeAllForUser(existing.getUser().getId(), Instant.now());
            throw new UnauthorizedException("Invalid or expired token");
        }

        if (existing.isExpired()) {
            throw new UnauthorizedException("Invalid or expired token");
        }

        User owner = existing.getUser();
        IssuedToken issued = issueEntity(owner, clientType, userAgent);

        existing.setRevokedAt(Instant.now());
        existing.setReplacedById(issued.entity().getId());
        refreshTokensRepository.save(existing);

        return new RotationResult(owner, issued.rawToken());
    }

    @Transactional
    public int revokeAll(Long userId) {
        return refreshTokensRepository.revokeAllForUser(userId, Instant.now());
    }

    @Transactional
    public void revokeByRawToken(String rawToken) {
        refreshTokensRepository.findByTokenHash(hash(rawToken)).ifPresent(token -> {
            token.setRevokedAt(Instant.now());
            refreshTokensRepository.save(token);
        });
    }

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 no disponible en esta JVM", ex);
        }
    }

    public record RotationResult(User user, String rawToken) {
    }
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=RefreshTokenServiceTest
```

Esperado: `Tests run: 7, Failures: 0, Errors: 0`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/service/ \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/service/
git commit -m "feat(auth): agrega RefreshTokenService con rotacion y deteccion de reuso

Cada refresh exitoso rota el token: emite uno nuevo y revoca el usado,
encadenandolos con replaced_by_id. Si llega un token ya revocado se interpreta
como robo y se revoca la cadena completa del usuario.

Un token vencido, en cambio, no revoca nada: vencer es normal, no sospechoso.

En base solo se guarda el hash SHA-256; el token en claro existe unicamente el
instante que tarda en viajar al cliente.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: LoginAttemptService — bloqueo por fuerza bruta

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/service/LoginAttemptService.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/service/LoginAttemptServiceTest.java`

**Interfaces:**
- Consumes: nada
- Produces: `LoginAttemptService.isBlocked(String email): boolean`, `recordFailure(String email): void`, `reset(String email): void`

**Contexto:** SPEC-001 §9.3 pide limitar intentos fallidos por correo. Se implementa en memoria (`ConcurrentHashMap` con ventana deslizante), no en base de datos: son decenas de usuarios y una sola instancia de backend. Si el despliegue creciera a varias instancias, esto se movería a Redis — está aislado en una clase precisamente para que ese cambio sea local.

- [ ] **Step 1: Escribir el test que falla**

```java
package pe.edu.pucp.hesperides.modules.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceTest {

    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        service = new LoginAttemptService(5, 15);
    }

    @Test
    void aFreshEmailIsNotBlocked() {
        assertThat(service.isBlocked("ana@pucp.edu.pe")).isFalse();
    }

    @Test
    void blocksAfterReachingTheThreshold() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("ana@pucp.edu.pe");
        }

        assertThat(service.isBlocked("ana@pucp.edu.pe")).isTrue();
    }

    @Test
    void doesNotBlockBelowTheThreshold() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure("ana@pucp.edu.pe");
        }

        assertThat(service.isBlocked("ana@pucp.edu.pe")).isFalse();
    }

    @Test
    void blocksEachEmailIndependently() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("ana@pucp.edu.pe");
        }

        assertThat(service.isBlocked("otra@pucp.edu.pe")).isFalse();
    }

    @Test
    void aSuccessfulLoginClearsTheCounter() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure("ana@pucp.edu.pe");
        }

        service.reset("ana@pucp.edu.pe");
        service.recordFailure("ana@pucp.edu.pe");

        assertThat(service.isBlocked("ana@pucp.edu.pe")).isFalse();
    }

    @Test
    void attemptsOutsideTheWindowDoNotCount() {
        LoginAttemptService instantWindow = new LoginAttemptService(5, 0);
        for (int i = 0; i < 10; i++) {
            instantWindow.recordFailure("ana@pucp.edu.pe");
        }

        // Con ventana de 0 minutos, todo intento previo ya quedó fuera.
        assertThat(instantWindow.isBlocked("ana@pucp.edu.pe")).isFalse();
    }

    @Test
    void normalizesTheEmailSoCaseDoesNotBypassTheBlock() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("Ana@PUCP.edu.pe");
        }

        assertThat(service.isBlocked("ana@pucp.edu.pe")).isTrue();
    }
}
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=LoginAttemptServiceTest
```

Esperado: FALLA, `cannot find symbol: class LoginAttemptService`.

- [ ] **Step 3: Implementar LoginAttemptService**

```java
package pe.edu.pucp.hesperides.modules.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Limita los intentos fallidos de login por correo (SPEC-001 §9.3).
 *
 * El estado vive en memoria: son decenas de usuarios y una sola instancia de
 * backend. Si el despliegue creciera a varias réplicas habría que moverlo a
 * Redis — está aislado aquí para que ese cambio no toque AuthService.
 */
@Service
public class LoginAttemptService {

    private final int maxAttempts;
    private final long windowMinutes;
    private final Map<String, List<Instant>> failuresByEmail = new ConcurrentHashMap<>();

    public LoginAttemptService(
            @Value("${hesperides.security.login.max-attempts:5}") int maxAttempts,
            @Value("${hesperides.security.login.window-minutes:15}") long windowMinutes) {
        this.maxAttempts = maxAttempts;
        this.windowMinutes = windowMinutes;
    }

    public boolean isBlocked(String email) {
        return recentFailures(normalize(email)).size() >= maxAttempts;
    }

    public void recordFailure(String email) {
        String key = normalize(email);
        failuresByEmail.compute(key, (ignored, previous) -> {
            List<Instant> updated = previous == null ? new ArrayList<>() : new ArrayList<>(previous);
            updated.add(Instant.now());
            return updated;
        });
    }

    public void reset(String email) {
        failuresByEmail.remove(normalize(email));
    }

    private List<Instant> recentFailures(String key) {
        List<Instant> all = failuresByEmail.get(key);
        if (all == null) {
            return List.of();
        }
        Instant cutoff = Instant.now().minus(windowMinutes, ChronoUnit.MINUTES);
        return all.stream().filter(attempt -> attempt.isAfter(cutoff)).toList();
    }

    /** Sin normalizar, alternar mayúsculas bastaría para esquivar el bloqueo. */
    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=LoginAttemptServiceTest
```

Esperado: `Tests run: 7, Failures: 0, Errors: 0`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/service/LoginAttemptService.java \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/service/LoginAttemptServiceTest.java
git commit -m "feat(auth): agrega el bloqueo de login por fuerza bruta

Cinco intentos fallidos del mismo correo en 15 minutos bloquean el siguiente.
El correo se normaliza a minusculas: sin eso, alternar mayusculas bastaria
para esquivar el contador.

El estado vive en memoria porque hay una sola instancia de backend y decenas
de usuarios. Queda aislado en su propia clase para que mover esto a Redis, si
algun dia hay varias replicas, no toque AuthService.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: AuthService y los DTO

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/dto/LoginRequest.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/dto/LoginResponse.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/dto/UserResponse.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/dto/RoleResponse.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/service/AuthService.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/service/AuthServiceImpl.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/shared/exception/TooManyAttemptsException.java`
- Modify: `backend/src/main/java/pe/edu/pucp/hesperides/shared/exception/GlobalExceptionHandler.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/service/AuthServiceImplTest.java`

**Interfaces:**
- Consumes: `UsersRepository` (Task 3), `JwtTokenProvider` (Task 4), `RefreshTokenService` (Task 6), `LoginAttemptService` (Task 7), `PasswordEncoder` (Task 5)
- Produces: `AuthService.login(LoginRequest, ClientType, String userAgent): LoginResult`, `refresh(String rawToken, ClientType, String userAgent): LoginResult`, `logout(String rawToken): void`, `currentUser(String email): UserResponse`. `LoginResult` es un record con `accessToken()`, `refreshToken()`, `expiresIn()`, `user()`.

- [ ] **Step 1: Crear los DTO**

`LoginRequest.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "Debe ser un correo electrónico válido")
        @Size(max = 255, message = "El correo no puede superar los 255 caracteres")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        @Size(max = 72, message = "La contraseña no puede superar los 72 caracteres")
        String password) {
}
```

`RoleResponse.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.dto;

public record RoleResponse(Long id, String code, String label) {
}
```

`UserResponse.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.dto;

import java.time.Instant;

/**
 * Nótese que no existe ningún campo para el hash de la contraseña. No es un
 * descuido: es la garantía de que no puede salir por esta vía ni siquiera por
 * accidente (SPEC-001 §9.1).
 */
public record UserResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String fullName,
        RoleResponse role,
        boolean isActive,
        Instant lastLogin) {
}
```

`LoginResponse.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * refreshToken se omite del JSON cuando es null, que es el caso de web: allí
 * viaja en una cookie httpOnly y no debe ser legible por JavaScript.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
        String accessToken,
        String refreshToken,
        long expiresIn,
        UserResponse user) {
}
```

- [ ] **Step 2: Escribir el test que falla**

`backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/service/AuthServiceImplTest.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import pe.edu.pucp.hesperides.modules.auth.dto.LoginRequest;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.shared.exception.TooManyAttemptsException;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock private UsersRepository usersRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private JwtTokenProvider tokenProvider;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private LoginAttemptService loginAttemptService;

    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new AuthServiceImpl(usersRepository, passwordEncoder, tokenProvider,
                refreshTokenService, loginAttemptService);
    }

    private User activeUser() {
        CatalogItem role = new CatalogItem();
        role.setCode("COORDINADOR");
        role.setLabel("Coordinador");

        User user = new User();
        user.setEmail("ana@pucp.edu.pe");
        user.setPasswordHash("$2a$10$hash");
        user.setFirstName("Ana");
        user.setLastName("Torres");
        user.setRoleItem(role);
        user.setActive(true);
        return user;
    }

    @Test
    void successfulLoginReturnsTokensAndTheUser() {
        User user = activeUser();
        when(loginAttemptService.isBlocked(anyString())).thenReturn(false);
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("secreta123", "$2a$10$hash")).thenReturn(true);
        when(tokenProvider.generateAccessToken("ana@pucp.edu.pe", "COORDINADOR")).thenReturn("access-token");
        when(tokenProvider.getAccessTokenValiditySeconds()).thenReturn(1800L);
        when(refreshTokenService.issue(any(), any(), any())).thenReturn("refresh-token");

        var result = service.login(new LoginRequest("ana@pucp.edu.pe", "secreta123"),
                ClientType.WEB, "Mozilla/5.0");

        assertThat(result.accessToken()).isEqualTo("access-token");
        assertThat(result.refreshToken()).isEqualTo("refresh-token");
        assertThat(result.expiresIn()).isEqualTo(1800L);
        assertThat(result.user().email()).isEqualTo("ana@pucp.edu.pe");
        assertThat(result.user().role().code()).isEqualTo("COORDINADOR");
    }

    @Test
    void successfulLoginStampsLastLoginAndClearsTheAttemptCounter() {
        User user = activeUser();
        when(loginAttemptService.isBlocked(anyString())).thenReturn(false);
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(true);
        when(tokenProvider.generateAccessToken(anyString(), anyString())).thenReturn("t");
        lenient().when(tokenProvider.getAccessTokenValiditySeconds()).thenReturn(1800L);
        when(refreshTokenService.issue(any(), any(), any())).thenReturn("r");

        service.login(new LoginRequest("ana@pucp.edu.pe", "secreta123"), ClientType.WEB, null);

        assertThat(user.getLastLogin()).isNotNull();
        verify(loginAttemptService).reset("ana@pucp.edu.pe");
        verify(usersRepository).save(user);
    }

    @Test
    void aWrongPasswordFailsAndCountsAsAnAttempt() {
        when(loginAttemptService.isBlocked(anyString())).thenReturn(false);
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.of(activeUser()));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);

        assertThatThrownBy(() -> service.login(
                new LoginRequest("ana@pucp.edu.pe", "equivocada"), ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid credentials");

        verify(loginAttemptService).recordFailure("ana@pucp.edu.pe");
    }

    @Test
    void anUnknownEmailFailsWithTheSameMessageAsAWrongPassword() {
        when(loginAttemptService.isBlocked(anyString())).thenReturn(false);
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.empty());

        // Mismo mensaje a propósito: distinguirlos le diría a un atacante qué
        // correos existen en el sistema.
        assertThatThrownBy(() -> service.login(
                new LoginRequest("nadie@pucp.edu.pe", "loquesea"), ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid credentials");
    }

    @Test
    void aDeactivatedUserCannotLogInAndGetsTheSameGenericMessage() {
        User inactive = activeUser();
        inactive.setActive(false);
        when(loginAttemptService.isBlocked(anyString())).thenReturn(false);
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.of(inactive));

        assertThatThrownBy(() -> service.login(
                new LoginRequest("ana@pucp.edu.pe", "secreta123"), ClientType.WEB, null))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage("Invalid credentials");
    }

    @Test
    void aBlockedEmailIsRejectedBeforeCheckingThePassword() {
        when(loginAttemptService.isBlocked("ana@pucp.edu.pe")).thenReturn(true);

        assertThatThrownBy(() -> service.login(
                new LoginRequest("ana@pucp.edu.pe", "secreta123"), ClientType.WEB, null))
                .isInstanceOf(TooManyAttemptsException.class);

        verify(usersRepository, org.mockito.Mockito.never()).findActiveByEmail(anyString());
    }

    @Test
    void logoutRevokesTheRefreshToken() {
        service.logout("refresh-token");

        verify(refreshTokenService).revokeByRawToken("refresh-token");
    }

    @Test
    void currentUserReturnsTheProfileWithoutAnyPasswordField() {
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe")).thenReturn(Optional.of(activeUser()));

        var response = service.currentUser("ana@pucp.edu.pe");

        assertThat(response.email()).isEqualTo("ana@pucp.edu.pe");
        assertThat(response.fullName()).isEqualTo("Ana Torres");
        assertThat(response.toString()).doesNotContain("$2a$10$hash");
    }
}
```

- [ ] **Step 3: Ejecutar el test y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=AuthServiceImplTest
```

Esperado: FALLA, `cannot find symbol: class AuthServiceImpl`.

- [ ] **Step 4: Crear la excepción de bloqueo y registrarla en el handler**

`TooManyAttemptsException.java`:

```java
package pe.edu.pucp.hesperides.shared.exception;

/** Demasiados intentos de login fallidos en la ventana configurada. */
public class TooManyAttemptsException extends RuntimeException {

    public TooManyAttemptsException(String message) {
        super(message);
    }
}
```

En `GlobalExceptionHandler.java`, añadir antes del handler genérico de `Exception`:

```java
    @ExceptionHandler(TooManyAttemptsException.class)
    public ResponseEntity<ApiResponse<Void>> handleTooManyAttempts(TooManyAttemptsException ex) {
        log.warn("Login bloqueado por exceso de intentos: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(ApiResponse.error(ex.getMessage()));
    }
```

- [ ] **Step 5: Implementar AuthService y AuthServiceImpl**

`AuthService.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.service;

import pe.edu.pucp.hesperides.modules.auth.dto.LoginRequest;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;

public interface AuthService {

    LoginResult login(LoginRequest request, ClientType clientType, String userAgent);

    LoginResult refresh(String rawRefreshToken, ClientType clientType, String userAgent);

    void logout(String rawRefreshToken);

    UserResponse currentUser(String email);

    record LoginResult(String accessToken, String refreshToken, long expiresIn, UserResponse user) {
    }
}
```

`AuthServiceImpl.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.dto.LoginRequest;
import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.shared.exception.TooManyAttemptsException;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;

import java.time.Instant;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    /**
     * Un solo mensaje para credenciales inválidas, correo inexistente y cuenta
     * desactivada: cualquier diferencia le confirmaría a un atacante qué correos
     * existen (SPEC-001 §9).
     */
    private static final String GENERIC_FAILURE = "Invalid credentials";

    private final UsersRepository usersRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenService refreshTokenService;
    private final LoginAttemptService loginAttemptService;

    @Override
    @Transactional
    public LoginResult login(LoginRequest request, ClientType clientType, String userAgent) {
        String email = normalize(request.email());

        if (loginAttemptService.isBlocked(email)) {
            throw new TooManyAttemptsException("Too many failed attempts. Try again later");
        }

        User user = usersRepository.findActiveByEmail(email)
                .orElseThrow(() -> failure(email));

        if (!user.isActive() || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw failure(email);
        }

        loginAttemptService.reset(email);
        user.setLastLogin(Instant.now());
        usersRepository.save(user);

        return buildResult(user, clientType, userAgent);
    }

    @Override
    @Transactional
    public LoginResult refresh(String rawRefreshToken, ClientType clientType, String userAgent) {
        if (rawRefreshToken == null || rawRefreshToken.isBlank()) {
            throw new UnauthorizedException("Invalid or expired token");
        }

        RefreshTokenService.RotationResult rotation =
                refreshTokenService.rotate(rawRefreshToken, clientType, userAgent);
        User user = rotation.user();

        if (!user.isActive()) {
            throw new UnauthorizedException("Invalid or expired token");
        }

        return new LoginResult(
                tokenProvider.generateAccessToken(user.getEmail(), user.getRoleCode()),
                rotation.rawToken(),
                tokenProvider.getAccessTokenValiditySeconds(),
                toResponse(user));
    }

    @Override
    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken != null && !rawRefreshToken.isBlank()) {
            refreshTokenService.revokeByRawToken(rawRefreshToken);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse currentUser(String email) {
        return usersRepository.findActiveByEmail(normalize(email))
                .map(this::toResponse)
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired token"));
    }

    private LoginResult buildResult(User user, ClientType clientType, String userAgent) {
        return new LoginResult(
                tokenProvider.generateAccessToken(user.getEmail(), user.getRoleCode()),
                refreshTokenService.issue(user, clientType, userAgent),
                tokenProvider.getAccessTokenValiditySeconds(),
                toResponse(user));
    }

    private UnauthorizedException failure(String email) {
        loginAttemptService.recordFailure(email);
        log.warn("Login fallido para {}", email);
        return new UnauthorizedException(GENERIC_FAILURE);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getFullName(),
                new RoleResponse(user.getRoleItem().getId(), user.getRoleItem().getCode(),
                        user.getRoleItem().getLabel()),
                user.isActive(),
                user.getLastLogin());
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
```

- [ ] **Step 6: Ejecutar el test y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=AuthServiceImplTest
```

Esperado: `Tests run: 8, Failures: 0, Errors: 0`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/ \
        backend/src/main/java/pe/edu/pucp/hesperides/shared/exception/ \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/service/AuthServiceImplTest.java
git commit -m "feat(auth): agrega AuthService con login, refresh, logout y perfil

Credenciales invalidas, correo inexistente y cuenta desactivada devuelven
exactamente el mismo mensaje: cualquier diferencia le confirmaria a un
atacante que correos existen en el sistema.

UserResponse no tiene ningun campo para el hash de la contrasena. No es un
descuido: es lo que garantiza que no pueda salir por esa via ni por accidente.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: AuthController y los cuatro endpoints

**Files:**
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/controller/AuthController.java`
- Create: `backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/controller/RefreshTokenCookieFactory.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/controller/AuthControllerTest.java`

**Interfaces:**
- Consumes: `AuthService` (Task 8), `ClientType` (Task 3)
- Produces: `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`, `GET /api/v1/auth/me`

**Regla clave:** web recibe el refresh token en cookie httpOnly y **no** en el body; móvil lo recibe en el body y no en cookie. Lo decide el header `X-Client-Type`.

- [ ] **Step 1: Escribir el test que falla**

`backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/controller/AuthControllerTest.java`:

```java
package pe.edu.pucp.hesperides.modules.auth.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.pucp.hesperides.modules.auth.dto.LoginRequest;
import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.service.AuthService;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;
import pe.edu.pucp.hesperides.shared.security.CustomUserDetailsService;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;
import pe.edu.pucp.hesperides.shared.security.SecurityConfig;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import(SecurityConfig.class)
@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean private AuthService authService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    private AuthService.LoginResult sampleResult() {
        UserResponse user = new UserResponse(1L, "ana@pucp.edu.pe", "Ana", "Torres", "Ana Torres",
                new RoleResponse(2L, "COORDINADOR", "Coordinador"), true, null);
        return new AuthService.LoginResult("access-token", "refresh-token", 1800L, user);
    }

    @Test
    void webLoginPutsTheRefreshTokenInAnHttpOnlyCookieAndNotInTheBody() throws Exception {
        when(authService.login(any(), any(), any())).thenReturn(sampleResult());

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("ana@pucp.edu.pe", "secreta123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("access-token"))
                .andExpect(jsonPath("$.data.refreshToken").doesNotExist())
                .andExpect(cookie().exists("refresh_token"))
                .andExpect(cookie().httpOnly("refresh_token", true));
    }

    @Test
    void mobileLoginReturnsTheRefreshTokenInTheBodyAndSetsNoCookie() throws Exception {
        when(authService.login(any(), any(), any())).thenReturn(sampleResult());

        mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("ana@pucp.edu.pe", "secreta123"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.refreshToken").value("refresh-token"))
                .andExpect(cookie().doesNotExist("refresh_token"));
    }

    @Test
    void invalidCredentialsReturn401WithTheStandardEnvelope() throws Exception {
        when(authService.login(any(), any(), any()))
                .thenThrow(new UnauthorizedException("Invalid credentials"));

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("ana@pucp.edu.pe", "mala"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.ok").value(false))
                .andExpect(jsonPath("$.message").value("Invalid credentials"))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void aMalformedEmailIsRejectedBeforeReachingTheService() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("no-es-un-correo", "secreta123"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data.errors[0].field").value("email"));
    }

    @Test
    void logoutClearsTheCookieAndReturns204() throws Exception {
        mockMvc.perform(post("/api/v1/auth/logout")
                        .cookie(new jakarta.servlet.http.Cookie("refresh_token", "refresh-token")))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("refresh_token", 0));
    }

    @Test
    void refreshWithoutAnyTokenReturns401() throws Exception {
        when(authService.refresh(any(), any(), any()))
                .thenThrow(new UnauthorizedException("Invalid or expired token"));

        mockMvc.perform(post("/api/v1/auth/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }
}
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=AuthControllerTest
```

Esperado: FALLA, `cannot find symbol: class AuthController`.

- [ ] **Step 3: Implementar la fábrica de cookies**

```java
package pe.edu.pucp.hesperides.modules.auth.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * La cookie del refresh token: httpOnly para que JavaScript no pueda leerla
 * (ni siquiera un XSS), SameSite=Strict como defensa CSRF, y Path acotado a
 * las rutas que realmente la necesitan.
 */
@Component
public class RefreshTokenCookieFactory {

    public static final String COOKIE_NAME = "refresh_token";
    private static final String COOKIE_PATH = "/api/v1/auth";

    private final boolean secure;
    private final long validityDays;

    public RefreshTokenCookieFactory(
            @Value("${hesperides.security.cookie.secure:true}") boolean secure,
            @Value("${hesperides.security.jwt.refresh-token-validity-days}") long validityDays) {
        this.secure = secure;
        this.validityDays = validityDays;
    }

    public ResponseCookie create(String rawToken) {
        return baseCookie(rawToken).maxAge(Duration.ofDays(validityDays)).build();
    }

    /** Cookie de borrado: mismo nombre y path, maxAge 0. */
    public ResponseCookie expire() {
        return baseCookie("").maxAge(0).build();
    }

    private ResponseCookie.ResponseCookieBuilder baseCookie(String value) {
        return ResponseCookie.from(COOKIE_NAME, value)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Strict")
                .path(COOKIE_PATH);
    }
}
```

En `application.yml`, añadir bajo `hesperides.security`:

```yaml
    cookie:
      # En desarrollo local no hay HTTPS, así que la cookie no puede ser Secure
      # o el navegador la descarta. En producción se sobreescribe a true.
      secure: ${COOKIE_SECURE:false}
```

- [ ] **Step 4: Implementar AuthController**

```java
package pe.edu.pucp.hesperides.modules.auth.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.auth.dto.LoginRequest;
import pe.edu.pucp.hesperides.modules.auth.dto.LoginResponse;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.ClientType;
import pe.edu.pucp.hesperides.modules.auth.service.AuthService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookieFactory cookieFactory;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
            @Valid @RequestBody LoginRequest request,
            @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader,
            @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent) {

        ClientType clientType = ClientType.fromHeader(clientTypeHeader);
        AuthService.LoginResult result = authService.login(request, clientType, userAgent);

        return respondWithSession(result, clientType, "Login successful");
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<LoginResponse>> refresh(
            @CookieValue(value = RefreshTokenCookieFactory.COOKIE_NAME, required = false) String cookieToken,
            @RequestBody(required = false) RefreshRequest body,
            @RequestHeader(value = "X-Client-Type", required = false) String clientTypeHeader,
            @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent) {

        ClientType clientType = ClientType.fromHeader(clientTypeHeader);
        String rawToken = clientType == ClientType.MOBILE && body != null ? body.refreshToken() : cookieToken;
        AuthService.LoginResult result = authService.refresh(rawToken, clientType, userAgent);

        return respondWithSession(result, clientType, "Token refreshed successfully");
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(value = RefreshTokenCookieFactory.COOKIE_NAME, required = false) String cookieToken,
            @RequestBody(required = false) RefreshRequest body) {

        authService.logout(body != null && body.refreshToken() != null ? body.refreshToken() : cookieToken);

        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, cookieFactory.expire().toString())
                .build();
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserResponse>> me(@AuthenticationPrincipal UserDetails principal) {
        UserResponse user = authService.currentUser(principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Current user retrieved successfully", user));
    }

    /**
     * Web recibe el refresh token en cookie httpOnly y nunca en el cuerpo;
     * móvil al revés, porque una app nativa no tiene almacén de cookies del
     * navegador y guarda el token en SecureStore.
     */
    private ResponseEntity<ApiResponse<LoginResponse>> respondWithSession(
            AuthService.LoginResult result, ClientType clientType, String message) {

        if (clientType == ClientType.MOBILE) {
            LoginResponse payload = new LoginResponse(
                    result.accessToken(), result.refreshToken(), result.expiresIn(), result.user());
            return ResponseEntity.ok(ApiResponse.ok(message, payload));
        }

        LoginResponse payload = new LoginResponse(
                result.accessToken(), null, result.expiresIn(), result.user());
        ResponseCookie cookie = cookieFactory.create(result.refreshToken());
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok(message, payload));
    }

    public record RefreshRequest(String refreshToken) {
    }
}
```

- [ ] **Step 5: Ejecutar el test y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=AuthControllerTest
```

Esperado: `Tests run: 6, Failures: 0, Errors: 0`.

Si falla por `@MockitoBean` no encontrado, verificar que Spring Boot 4 usa `org.springframework.test.context.bean.override.mockito.MockitoBean` (`@MockBean` está eliminado en esta versión).

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/controller/ \
        backend/src/main/resources/application.yml \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/controller/
git commit -m "feat(auth): expone los cuatro endpoints de sesion

Web recibe el refresh token en una cookie httpOnly, Secure y SameSite=Strict,
y nunca en el cuerpo de la respuesta: asi ningun JavaScript puede leerlo, ni
siquiera ante un XSS. Movil lo recibe en el body porque una app nativa no
tiene el almacen de cookies del navegador.

Lo decide el header X-Client-Type, con web como valor por defecto: si alguien
omite el header, cae en la opcion mas segura de las dos.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: Test de integración end-to-end y usuario administrador semilla

**Files:**
- Create: `backend/src/main/resources/db/migration/V004__seed_admin_user.sql`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/AuthIntegrationTest.java`

**Interfaces:**
- Consumes: todo lo anterior
- Produces: una cuenta ADMIN inicial con la que entrar por primera vez

**Contexto:** sin un usuario inicial, el sistema es inaccesible: no hay autorregistro y crear usuarios exige ser ADMIN. Es el problema del huevo y la gallina que toda aplicación con alta cerrada tiene que resolver en la migración.

- [ ] **Step 1: Escribir el test de integración que falla**

```java
package pe.edu.pucp.hesperides.modules.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Recorre el flujo completo contra PostgreSQL real, sin mocks. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class AuthIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("hesperides.security.jwt.secret",
                () -> "clave-de-prueba-suficientemente-larga-para-hs256-ok!");
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    private static final String LOGIN_BODY = """
            {"email": "admin@pucp.edu.pe", "password": "Hesperides2026"}
            """;

    @Test
    void theSeededAdminCanLogInAndReadItsOwnProfile() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(LOGIN_BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.user.role.code").value("ADMIN"))
                .andReturn();

        String accessToken = readAccessToken(login);

        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value("admin@pucp.edu.pe"));
    }

    @Test
    void aProtectedEndpointWithoutATokenReturns401WithTheStandardEnvelope() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.ok").value(false))
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    void noResponseEverContainsThePasswordHash() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(LOGIN_BODY))
                .andReturn();

        String body = login.getResponse().getContentAsString();
        assertThat(body).doesNotContain("passwordHash").doesNotContain("password_hash").doesNotContain("$2a$");
    }

    @Test
    void aRotatedRefreshTokenCannotBeUsedTwice() throws Exception {
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON).content(LOGIN_BODY))
                .andReturn();

        String refreshToken = objectMapper.readTree(login.getResponse().getContentAsString())
                .path("data").path("refreshToken").asText();
        String refreshBody = objectMapper.writeValueAsString(
                java.util.Map.of("refreshToken", refreshToken));

        // Primer uso: válido, rota el token.
        mockMvc.perform(post("/api/v1/auth/refresh").header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON).content(refreshBody))
                .andExpect(status().isOk());

        // Segundo uso del mismo token: reuso detectado, sesión cerrada.
        mockMvc.perform(post("/api/v1/auth/refresh").header("X-Client-Type", "mobile")
                        .contentType(MediaType.APPLICATION_JSON).content(refreshBody))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void sixFailedAttemptsInARowGet429NotAnother401() throws Exception {
        String wrongPassword = """
                {"email": "bloqueo@pucp.edu.pe", "password": "incorrecta"}
                """;

        for (int i = 0; i < 5; i++) {
            mockMvc.perform(post("/api/v1/auth/login")
                            .contentType(MediaType.APPLICATION_JSON).content(wrongPassword))
                    .andExpect(status().isUnauthorized());
        }

        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON).content(wrongPassword))
                .andExpect(status().isTooManyRequests());
    }

    private String readAccessToken(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("accessToken").asText();
    }
}
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=AuthIntegrationTest
```

Esperado: FALLA con 401 en el login — el usuario administrador todavía no existe.

- [ ] **Step 3: Crear la migración del usuario semilla**

`backend/src/main/resources/db/migration/V004__seed_admin_user.sql`:

```sql
-- Sin autorregistro y con el alta reservada a un ADMIN, el sistema sería
-- inaccesible sin una cuenta inicial. Este es el punto de entrada.
--
-- El hash corresponde a la contraseña 'Hesperides2026', generada con BCrypt
-- (fuerza 10). DEBE cambiarse en el primer ingreso de cualquier despliegue
-- real: es pública en el repositorio y no es un secreto.

INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, is_active)
SELECT
    'admin@pucp.edu.pe',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Administrador',
    'Hesperides',
    (SELECT ci.id FROM catalog_items ci
     JOIN catalog_types ct ON ct.id = ci.catalog_type_id
     WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'),
    TRUE
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE email = 'admin@pucp.edu.pe' AND deleted_at IS NULL
);
```

**Verificación obligatoria del hash:** el hash de arriba es un valor de ejemplo conocido. Antes de dar por buena esta migración, generarlo de verdad y sustituirlo:

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B -q compile exec:java \
  -Dexec.mainClass=org.springframework.security.crypto.bcrypt.BCrypt 2>/dev/null || \
  echo "Generar con un test temporal: new BCryptPasswordEncoder().encode(\"Hesperides2026\")"
```

Si el login del test falla con 401 pese a la contraseña correcta, es que el hash no corresponde: generarlo con un test desechable que imprima `new BCryptPasswordEncoder().encode("Hesperides2026")` y pegar el resultado en la migración.

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=AuthIntegrationTest
```

Esperado: `Tests run: 5, Failures: 0, Errors: 0`.

- [ ] **Step 5: Ejecutar la suite completa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test
```

Esperado: `BUILD SUCCESS` con todos los tests verdes (8 previos + los de las tareas 1 a 10).

- [ ] **Step 6: Verificar a mano contra el entorno real**

```bash
docker compose down -v && docker compose up -d --build
sleep 40
curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pucp.edu.pe","password":"Hesperides2026"}' -i | head -20
```

Esperado: `200`, un header `Set-Cookie: refresh_token=...; HttpOnly`, y un cuerpo con `accessToken` pero **sin** `refreshToken`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/resources/db/migration/V004__seed_admin_user.sql \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/auth/AuthIntegrationTest.java
git commit -m "feat(auth): agrega el usuario administrador semilla y el test de integracion

Sin autorregistro y con el alta reservada a un ADMIN, el sistema seria
inaccesible sin una cuenta inicial: V004 la crea, y es idempotente para que
reaplicarla sobre una base que ya la tiene no falle.

La contrasena del semilla es publica en el repositorio y debe cambiarse en el
primer ingreso de cualquier despliegue real.

El test de integracion recorre el flujo completo contra PostgreSQL real:
login, perfil, 401 sin token, ausencia del hash en toda respuesta, reuso de
refresh token y bloqueo por fuerza bruta.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 11: Cliente web — refresh encolado y contexto de sesión

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/auth-context.tsx`
- Create: `frontend/src/hooks/useAuth.ts`
- Test: `frontend/src/lib/__tests__/api-refresh.test.ts`

**Interfaces:**
- Consumes: los endpoints de la Task 9
- Produces: `apiClient` con refresh transparente; `useAuth()` con `{ user, login, logout, isLoading }`

**El problema que resuelve:** si tres componentes llaman a la API a la vez con el access token vencido, sin coordinación se dispararían tres `POST /auth/refresh` en paralelo. El primero rota el token y los otros dos llegan con uno ya revocado, que el backend interpreta como reuso y **cierra la sesión**. La cola no es una optimización: es lo que evita ese auto-bloqueo (SPEC-001 Anexo C).

- [ ] **Step 1: Escribir el test que falla**

`frontend/src/lib/__tests__/api-refresh.test.ts`:

```typescript
import { apiClient, ApiError } from '../api';

describe('refresh encolado', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  function envelope(ok: boolean, data: unknown, message = '') {
    return {
      ok: true,
      status: ok ? 200 : 401,
      json: async () => ({ ok, message, data }),
    } as Response;
  }

  function unauthorized() {
    return {
      ok: false,
      status: 401,
      json: async () => ({ ok: false, message: 'Invalid or expired token', data: null }),
    } as Response;
  }

  it('dispara un unico refresh aunque tres peticiones fallen a la vez', async () => {
    let refreshCalls = 0;
    const fetchMock = jest.fn(async (url: string) => {
      if (String(url).includes('/auth/refresh')) {
        refreshCalls += 1;
        return envelope(true, { accessToken: 'nuevo' });
      }
      // La primera vez cada endpoint da 401; tras el refresh, responde bien.
      return refreshCalls === 0 ? unauthorized() : envelope(true, { id: 1 });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await Promise.all([
      apiClient.get('/users'),
      apiClient.get('/zones'),
      apiClient.get('/incidents'),
    ]);

    expect(refreshCalls).toBe(1);
  });

  it('reintenta la peticion original una sola vez tras un refresh exitoso', async () => {
    let attempts = 0;
    global.fetch = jest.fn(async (url: string) => {
      if (String(url).includes('/auth/refresh')) return envelope(true, {});
      attempts += 1;
      return attempts === 1 ? unauthorized() : envelope(true, { id: 7 });
    }) as unknown as typeof fetch;

    const result = await apiClient.get<{ id: number }>('/users/7');

    expect(result).toEqual({ id: 7 });
    expect(attempts).toBe(2);
  });

  it('propaga el 401 sin reintentar en bucle si el refresh falla', async () => {
    global.fetch = jest.fn(async (url: string) => {
      if (String(url).includes('/auth/refresh')) return unauthorized();
      return unauthorized();
    }) as unknown as typeof fetch;

    await expect(apiClient.get('/users')).rejects.toBeInstanceOf(ApiError);
  });

  it('no intenta refrescar cuando el que falla es el propio login', async () => {
    const fetchMock = jest.fn(async () => unauthorized());
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(apiClient.post('/auth/login', {})).rejects.toBeInstanceOf(ApiError);

    // Una sola llamada: la del login. Nunca un refresh.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Ejecutar el test y verificar que falla**

```bash
cd frontend && npm test -- api-refresh
```

Esperado: FALLA — hoy `request` lanza el `ApiError` sin intentar refrescar.

- [ ] **Step 3: Implementar el refresh encolado en api.ts**

Reemplazar la función `request` de `frontend/src/lib/api.ts` por:

```typescript
/**
 * Promesa compartida del refresh en curso. Si tres peticiones fallan con 401
 * a la vez, solo la primera dispara POST /auth/refresh y las otras dos esperan
 * a esa misma promesa. Sin esto, las dos rezagadas llegarían con un refresh
 * token ya rotado, el backend lo interpretaría como reuso y cerraría la
 * sesión (SPEC-001 §4.2).
 */
let refreshPromise: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  if (refreshPromise === null) {
    refreshPromise = fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    })
      .then(async (response) => {
        if (!response.ok) throw new ApiError(response.status, 'Session expired');
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const NO_REFRESH_PATHS = ['/auth/login', '/auth/refresh', '/auth/logout'];

async function doFetch(method: HttpMethod, path: string, body?: unknown): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  let response: Response;

  try {
    response = await doFetch(method, path, body);
  } catch {
    throw new ApiError(0, 'Sin conexión. Verifique su red.');
  }

  if (response.status === 401 && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
    try {
      await refreshSession();
    } catch {
      const envelope = (await response.json()) as ApiResponse<T>;
      throw new ApiError(401, envelope.message ?? 'Session expired', envelope.data);
    }

    // Un único reintento: si el token nuevo tampoco sirve, se propaga el error
    // en vez de encolar otro refresh y entrar en bucle.
    try {
      response = await doFetch(method, path, body);
    } catch {
      throw new ApiError(0, 'Sin conexión. Verifique su red.');
    }
  }

  const envelope = (await response.json()) as ApiResponse<T>;

  if (!response.ok || !envelope.ok) {
    throw new ApiError(response.status, envelope.message ?? 'Unexpected error', envelope.data);
  }

  return envelope.data as T;
}
```

- [ ] **Step 4: Ejecutar el test y verificar que pasa**

```bash
cd frontend && npm test -- api-refresh
```

Esperado: 4 tests en verde.

- [ ] **Step 5: Crear el contexto de sesión**

`frontend/src/lib/auth-context.tsx`:

```tsx
'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { apiClient, ApiError } from './api';

export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: { id: number; code: string; label: string };
  isActive: boolean;
  lastLogin: string | null;
}

interface LoginPayload {
  accessToken: string;
  expiresIn: number;
  user: SessionUser;
}

interface AuthContextValue {
  user: SessionUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Al montar, se pregunta por la sesión: la cookie httpOnly viaja sola, así
  // que recargar la página no obliga a volver a iniciar sesión.
  useEffect(() => {
    apiClient
      .get<SessionUser>('/auth/me')
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const payload = await apiClient.post<LoginPayload>('/auth/login', { email, password });
    setUser(payload.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      // Si el logout falla en el servidor, la sesión local se cierra igual:
      // dejar al usuario "dentro" tras pulsar salir sería peor.
      if (!(error instanceof ApiError)) throw error;
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, isLoading, login, logout }), [user, isLoading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuthContext debe usarse dentro de un AuthProvider');
  }
  return context;
}
```

`frontend/src/hooks/useAuth.ts`:

```typescript
import { useAuthContext } from '@/lib/auth-context';

/** Punto de entrada único a la sesión para los componentes. */
export function useAuth() {
  return useAuthContext();
}
```

- [ ] **Step 6: Ejecutar la suite del frontend**

```bash
cd frontend && npm test
```

Esperado: todos los tests en verde, incluidos los previos de `api.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/lib/ frontend/src/hooks/
git commit -m "feat(frontend): implementa el refresh de sesion encolado

Si tres componentes llaman a la API a la vez con el access token vencido, sin
coordinacion se dispararian tres POST /auth/refresh: el primero rota el token
y los otros dos llegan con uno ya revocado, que el backend interpreta como
reuso y cierra la sesion. La cola evita ese autobloqueo.

El reintento se limita a uno por peticion para no entrar en bucle si el token
nuevo tampoco sirve.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 12: Cierre — actualizar el registro de specs

**Files:**
- Modify: `specs/REGISTRO.md`

- [ ] **Step 1: Marcar SPEC-001 como completado y cerrar su decisión abierta**

En `specs/REGISTRO.md`, cambiar la fila de SPEC-001 a `✅ Completado` con la fecha de cierre, y en la tabla de decisiones abiertas actualizar la fila "Almacenamiento del token en web vs. móvil" indicando que la cierra esta implementación: cookie httpOnly con `SameSite=Strict` en web, body más SecureStore en móvil, y refresh encolado en `api.ts`.

- [ ] **Step 2: Verificación final completa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test
cd ../frontend && npm test
cd .. && docker compose down -v && docker compose up -d --build && sleep 40
curl -s http://localhost:8080/api/v1/health
curl -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@pucp.edu.pe","password":"Hesperides2026"}' -i | head -15
```

Los tres deben pasar antes de dar el spec por cerrado. Si algo falla, se corrige antes del commit final.

- [ ] **Step 3: Commit**

```bash
git add specs/REGISTRO.md
git commit -m "docs(specs): marca SPEC-001 como completado

Cierra tambien la decision abierta sobre el almacenamiento del token: cookie
httpOnly con SameSite=Strict en web, body mas SecureStore en movil, y refresh
encolado en api.ts para que varias peticiones concurrentes no se autobloqueen.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Verificación de cobertura del spec

Qué tarea implementa cada parte de SPEC-001:

| Sección de SPEC-001 | Tarea |
|---|---|
| §2.5 Alta cerrada, sin autorregistro | Task 10 (usuario semilla; no se expone endpoint de registro) |
| §2.6 Sesión de un usuario desactivado | Task 5 (`isEnabled()` en el filtro), Task 6 (`revokeAll`) |
| §3 `POST /auth/login` | Task 9 |
| §3 `POST /auth/refresh` | Task 9 |
| §3 `POST /auth/logout` | Task 9 |
| §3 `GET /auth/me` | Task 9 |
| §4.1 Migración V002 | Task 2 |
| §4.2 Rotación y detección de reuso | Task 6 |
| §5.1 Cookie web vs. header móvil | Task 9 |
| §9.1 `password_hash` nunca sale | Task 8 (`UserResponse` sin el campo), verificado en Task 10 |
| §9.2 Qué se registra en logs | Tasks 4, 6, 8 |
| §9.3 Fuerza bruta | Task 7 |
| Anexo A Matriz de permisos | Task 4 (`RoleCodes`), Task 5 (authorities); la aplican los SPEC-1XX |
| Anexo B Spring Security | Task 5 |
| Anexo C Refresh encolado | Task 11 |
| Catálogo `ROLE` con 4 roles | Task 2 (V003) |

**Fuera de alcance de este plan, por decisión explícita:**

- El job de limpieza de refresh tokens vencidos (SPEC-001 §4.1 lo declara fuera de alcance).
- La app móvil: el spec de móvil es fase 2. El backend ya la atiende con `X-Client-Type: mobile`.
- `UsersService.deactivate()`, que SPEC-001 §2.6 menciona: pertenece a SPEC-100, y llamará a `RefreshTokenService.revokeAll()`, que este plan deja listo.
