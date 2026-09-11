# SPEC-100 Backend — Gestión de usuarios — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exponer los nueve endpoints que permiten a un administrador crear, editar, desactivar y reactivar cuentas, con entrega de credenciales por correo, de modo que el frontend de SPEC-100 tenga contra qué trabajar.

**Architecture:** Un módulo `modules/users` independiente de `modules/auth`: auth resuelve *sesiones*, users resuelve *cuentas*. Comparten la entidad `User` y `UsersRepository`, que ya existen. El `UsersService` orquesta; las reglas que protegen al sistema (último ADMIN, autodesactivación) viven ahí, no en el controller. El envío de correo está aislado en `CredentialDeliveryService` y ocurre **fuera** de la transacción del alta: un SMTP caído no puede impedir registrar a una persona.

**Tech Stack:** Java 26 · Spring Boot 4.1.1 · Spring Security 7.1.1 · `spring-boot-starter-mail` (JavaMailSender) · PostgreSQL 16 · Flyway · JUnit 5 + Mockito + Testcontainers + GreenMail 2.1.3

**Spec:** `specs/features/SPEC-100-gestion-usuarios.md` (leer completo; su §2.5 enmienda SPEC-000 y SPEC-001, y su Anexo de permisos sale del Anexo A de SPEC-001)

## Global Constraints

Copiadas de los specs. Aplican a **todas** las tareas.

- **Leer SPEC-000 §5.2.1 antes de escribir código.** Spring Boot 4 movió cosas: Jackson 3 en `tools.jackson.databind`, `@MockBean` eliminado (usar `@MockitoBean` de `org.springframework.test.context.bean.override.mockito`), `@WebMvcTest` en `org.springframework.boot.webmvc.test.autoconfigure`. `JavaMailSender` **sí** sigue en `org.springframework.mail.javamail` (verificado).
- **Paquete:** `pe.edu.pucp.hesperides.modules.users.<capa>`.
- **Sobre de respuesta uniforme:** `ApiResponse<T>` — `{ ok, message, data }`. Nunca 200 en un error.
- **`message` en inglés técnico**; el frontend traduce.
- **JSON `camelCase`, columnas `snake_case`.** Jackson lo resuelve; ningún DTO expone nombres de columna.
- **Fechas ISO 8601 en UTC.**
- **Prohibido cualquier `enum` de dominio.** Los roles son `catalog_items`. Excepción: metadato del sistema (`CredentialStatus`), con `@Enumerated(EnumType.STRING)`, nunca `ORDINAL`.
- **`password_hash` nunca sale en una respuesta ni en un log**, a ninguna profundidad. Ningún DTO tiene campo para él.
- **Autorización con `@PreAuthorize` y `hasAuthority` sobre el `code` del rol**, usando las constantes de `RoleCodes` — nunca literales repetidos.
- **Límites de tamaño** (CLAUDE.md): controllers ≤100 líneas, services ≤150, repositories ≤100, ningún archivo >200. DTOs y tests sin límite. `UsersService` roza el límite: por eso la política de contraseñas, la generación de temporales y el envío viven en clases aparte.
- **TDD estricto:** test primero, se ejecuta y falla, luego el mínimo para que pase.
- **Build:** desde `backend/`, `JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test`. El `JAVA_HOME` es obligatorio en cada invocación: el JDK del sistema es el 21 y no compila a release 26.
- **Docker debe estar corriendo** (Testcontainers levanta PostgreSQL 16 real).

## Decisiones tomadas antes de escribir este plan

Tres cosas que el spec no resolvía y que se cerraron con el usuario:

1. **Las tablas `teams`/`team_members` no existían.** SPEC-002 las define en V012 pero nunca se escribió. SPEC-100 las necesita para `teams[]`, el filtro `teamId` y el alcance del SUPERVISOR. **Se crean en la Task 1**, tal como SPEC-002 §4.10 las especifica.
2. **`teams.zone_id` referencia `zones(id)`, que tampoco existe** (es del catastro). Se crea la columna como `BIGINT` nulable **sin la FK**, con un comentario indicando que el spec del catastro debe añadirla con un `ALTER TABLE`. SPEC-002 ya declara `zone_id` nulable y admite cuadrillas polivalentes, así que no se rompe ninguna regla.
3. **Colisión de numeración:** al implementar SPEC-001 ocupé `V003` y `V004`, números que SPEC-002 reserva para PostGIS y zonas. **Se renumeran a `V005` y `V006`** en la Task 1, liberando los originales. Es el momento más barato: no hay datos reales y nadie más ha clonado estas migraciones.

---

## File Structure

**Migraciones** (`backend/src/main/resources/db/migration/`)
- `V003__seed_role_catalog.sql` → renombrar a `V005__seed_role_catalog.sql`
- `V004__seed_admin_user.sql` → renombrar a `V006__seed_admin_user.sql`
- `V012__create_teams.sql` — nueva, propiedad de SPEC-002 §4.10
- `V100__add_credential_columns_to_users.sql` — nueva, propiedad de SPEC-100

**Entidades** (`modules/users/entity/` y `modules/auth/entity/`)
- `users/entity/CredentialStatus.java` — enum de metadato (`PENDING_DELIVERY`, `DELIVERED`)
- `users/entity/Team.java`, `users/entity/TeamMember.java`
- `auth/entity/User.java` — **modificar**: tres columnas nuevas

**Repositorios** (`modules/users/repository/`)
- `TeamsRepository.java`, `TeamMembersRepository.java`
- `auth/repository/UsersRepository.java` — **modificar**: `JpaSpecificationExecutor` y el conteo bloqueante

**Servicios** (`modules/users/service/`)
- `PasswordPolicy.java` — valida la política de §9.1. Sin I/O, testeable sola
- `TemporaryPasswordGenerator.java` — `SecureRandom` sobre alfabeto sin ambigüedades
- `CredentialDeliveryService.java` — el único que habla con SMTP
- `UserSpecifications.java` — los cuatro filtros del listado como `Specification<User>`
- `UsersService.java` + `UsersServiceImpl.java` — orquestación y reglas de negocio
- `UserScopeResolver.java` — resuelve el alcance por rol (ADMIN/COORDINADOR ven todo, SUPERVISOR su cuadrilla)

**Controller y DTOs** (`modules/users/controller/`, `modules/users/dto/`)
- `UsersController.java` — los nueve endpoints
- `dto/CreateUserRequest.java`, `UpdateUserRequest.java`, `ChangePasswordRequest.java`
- `dto/UserDetailResponse.java`, `TeamSummaryResponse.java`, `CredentialDeliveryResponse.java`

**Auditoría** (`shared/audit/`)
- `AuditActionCode.java` — enum con las cinco acciones de §9.3
- `AuditService.java` — interfaz mínima; su implementación completa es de SPEC-004

**Configuración**
- `application.yml`, `application-test.yml`, `.env.example`, `docker-compose.yml` — variables SMTP
- `pom.xml` — `spring-boot-starter-mail`, GreenMail

**Nota sobre `AuditService`:** SPEC-004 (auditoría) no está implementado y define la tabla `audit_log` en V011. SPEC-100 §9.3 exige registrar cinco acciones. Este plan crea la **interfaz** `AuditService` y una implementación que escribe a SLF4J, dejando el `@Primary` para cuando SPEC-004 aporte la persistencia. Así las llamadas quedan en su sitio desde el principio y SPEC-004 solo tendrá que sustituir el bean, sin tocar `UsersServiceImpl`.

---

## Task 1: Migraciones — renumerar, crear teams y extender users

**Files:**
- Rename: `V003__seed_role_catalog.sql` → `V005__seed_role_catalog.sql`
- Rename: `V004__seed_admin_user.sql` → `V006__seed_admin_user.sql`
- Create: `backend/src/main/resources/db/migration/V012__create_teams.sql`
- Create: `backend/src/main/resources/db/migration/V100__add_credential_columns_to_users.sql`
- Modify: `backend/src/test/java/pe/edu/pucp/hesperides/migration/MigrationSmokeTest.java`

**Interfaces:**
- Consumes: `users` y `catalog_items` de V001/V002
- Produces: columnas `credential_status`, `must_change_password`, `credentials_sent_at` en `users`; tablas `teams` y `team_members`

**Por qué renumerar:** SPEC-002 §4 reserva `V003` para PostGIS y `V004` para zonas. Las migraciones que ocupan esos números hoy son de SPEC-001 y tomaron el hueco sin comprobarlo. Si se dejan, Flyway fallará en cuanto alguien implemente el catastro — y el fallo aparecerá en la máquina de otra persona, como un conflicto de checksum difícil de diagnosticar.

- [ ] **Step 1: Añadir al test de migraciones las comprobaciones que faltan**

En `MigrationSmokeTest.java`, añadir estos cinco tests al final de la clase (los cinco existentes no se tocan):

```java
    @Test
    void usersHasTheThreeCredentialColumnsFromV100() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
                String.class);

        assertThat(columns).contains("credential_status", "must_change_password", "credentials_sent_at");
    }

    @Test
    void credentialStatusRejectsAnyValueOutsideTheTwoAllowed() {
        assertThatThrownBy(() -> jdbcTemplate.execute("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, credential_status)
                VALUES ('check@pucp.edu.pe', 'hash', 'A', 'B',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'),
                        'ESTADO_INVENTADO')
                """))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void existingAccountsDefaultToDeliveredAndNotForcedToChangePassword() {
        // El administrador semilla no paso por el flujo de envio: marcarlo como
        // pendiente o forzarle el cambio seria describir mal lo que ya existe.
        Map<String, Object> admin = jdbcTemplate.queryForMap(
                "SELECT credential_status, must_change_password FROM users WHERE email = 'admin@pucp.edu.pe'");

        assertThat(admin.get("credential_status")).isEqualTo("DELIVERED");
        assertThat(admin.get("must_change_password")).isEqualTo(false);
    }

    @Test
    void teamsAndTeamMembersExistWithTheColumnsSpec002Declares() {
        List<String> teams = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'teams'",
                String.class);
        assertThat(teams).containsExactlyInAnyOrder(
                "id", "code", "name", "supervisor_user_id", "zone_id", "is_active",
                "created_at", "updated_at", "deleted_at");

        List<String> members = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'team_members'",
                String.class);
        assertThat(members).containsExactlyInAnyOrder(
                "id", "team_id", "user_id", "joined_at", "left_at",
                "created_at", "updated_at", "deleted_at");
    }

    @Test
    void aUserCannotBeActiveTwiceInTheSameTeam() {
        Long adminId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'admin@pucp.edu.pe'", Long.class);
        jdbcTemplate.update(
                "INSERT INTO teams (code, name, supervisor_user_id) VALUES ('CN-01', 'Cuadrilla Norte', ?)",
                adminId);
        Long teamId = jdbcTemplate.queryForObject(
                "SELECT id FROM teams WHERE code = 'CN-01'", Long.class);

        jdbcTemplate.update(
                "INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, adminId);

        assertThatThrownBy(() -> jdbcTemplate.update(
                "INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, adminId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
```

Añadir estos imports a la clase:

```java
import org.springframework.dao.DataIntegrityViolationException;
import java.util.Map;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=MigrationSmokeTest
```

Esperado: FALLA. Las columnas de V100 no existen y `teams` tampoco.

- [ ] **Step 3: Renumerar las dos migraciones de SPEC-001**

```bash
cd backend/src/main/resources/db/migration
git mv V003__seed_role_catalog.sql V005__seed_role_catalog.sql
git mv V004__seed_admin_user.sql V006__seed_admin_user.sql
ls
```

Esperado: `V001`, `V002`, `V005`, `V006`. Los huecos `V003` y `V004` quedan libres para PostGIS y zonas, como SPEC-002 manda.

Dentro de `V005__seed_role_catalog.sql`, añadir al principio esta nota para que el motivo no se pierda:

```sql
-- Renumerada de V003 a V005: SPEC-002 §4 reserva V003 para PostGIS y V004 para
-- zonas. Esta migracion es de SPEC-001 y habia tomado ese hueco por error;
-- dejarla ahi habria roto Flyway al implementar el catastro.
```

- [ ] **Step 4: Crear V012 (teams), tal como SPEC-002 §4.10 la define**

`backend/src/main/resources/db/migration/V012__create_teams.sql`:

```sql
-- Propiedad de SPEC-002 §4.10. SPEC-100 la necesita para el campo teams[], el
-- filtro teamId y el alcance del SUPERVISOR, asi que se implementa aqui.
--
-- La operacion de campo no es plana: el operario reporta a un supervisor de
-- cuadrilla, y el supervisor al coordinador. Estas dos tablas permiten resolver
-- "solo mi equipo" sin recorrer la jerarquia a mano en cada consulta.

CREATE TABLE teams (
    id                 BIGSERIAL PRIMARY KEY,
    code               VARCHAR(50)  NOT NULL,
    name               VARCHAR(150) NOT NULL,
    supervisor_user_id BIGINT       NOT NULL REFERENCES users(id),
    -- Sin FK a zones(id) todavia: esa tabla es de V004, propiedad del spec del
    -- catastro, y aun no existe. SPEC-002 ya declara zone_id nulable (una
    -- cuadrilla puede ser polivalente), asi que la columna es valida tal cual.
    -- El spec del catastro debe añadir la constraint con un ALTER TABLE.
    zone_id            BIGINT,
    is_active          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at         TIMESTAMP
);

CREATE UNIQUE INDEX idx_teams_code_active ON teams(code) WHERE deleted_at IS NULL;
CREATE INDEX idx_teams_supervisor ON teams(supervisor_user_id);
CREATE INDEX idx_teams_zone ON teams(zone_id);

-- Tabla puente con historia: left_at permite saber quien estuvo en que cuadrilla
-- cuando se ejecuto una intervencion pasada, sin reescribir el historico al
-- reasignar a alguien.
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

- [ ] **Step 5: Crear V100 (columnas de credenciales)**

`backend/src/main/resources/db/migration/V100__add_credential_columns_to_users.sql`:

```sql
-- La tabla users ya existe: la crea V002, propiedad de SPEC-001. Esta migracion
-- solo añade columnas. Duplicar el CREATE romperia Flyway por checksum.

-- Estado de entrega de credenciales. Independiente de is_active (SPEC-100 §2.6):
-- is_active responde "¿sigue trabajando aqui?"; esta columna, "¿recibio su clave?".
ALTER TABLE users
    ADD COLUMN credential_status VARCHAR(20) NOT NULL DEFAULT 'DELIVERED'
        CHECK (credential_status IN ('PENDING_DELIVERY', 'DELIVERED'));

-- TRUE mientras la contraseña vigente sea la temporal que asigno un administrador.
-- Fuerza el cambio en el primer ingreso (SPEC-100 §5.2).
ALTER TABLE users
    ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Momento del ultimo envio. Permite al administrador saber cuanto lleva pendiente
-- una entrega sin consultar audit_log.
ALTER TABLE users
    ADD COLUMN credentials_sent_at TIMESTAMP;

-- El listado por defecto filtra activos y suele filtrar por rol.
CREATE INDEX idx_users_is_active_role ON users(is_active, role_item_id)
    WHERE deleted_at IS NULL;

-- Permite resaltar las entregas pendientes sin escanear la tabla.
CREATE INDEX idx_users_credential_status ON users(credential_status)
    WHERE credential_status = 'PENDING_DELIVERY' AND deleted_at IS NULL;
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=MigrationSmokeTest
```

Esperado: `Tests run: 10, Failures: 0` (5 previos + 5 nuevos).

- [ ] **Step 7: Verificar contra la base real, desde cero**

La renumeración cambia el historial de Flyway, así que la base local **debe** recrearse: reaplicar sobre la existente fallaría porque `V003` ya consta aplicada con otro checksum.

```bash
docker compose down -v && docker compose up -d db backend
sleep 40
docker exec hesperides-db psql -U hesperides -d hesperides -c "SELECT version, description FROM flyway_schema_history ORDER BY installed_rank;"
docker exec hesperides-db psql -U hesperides -d hesperides -c "\d teams"
```

Esperado: el historial muestra `1, 2, 5, 6, 12, 100` y `teams` existe con sus nueve columnas.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/resources/db/migration/ backend/src/test/java/pe/edu/pucp/hesperides/migration/
git commit -m "feat(db): crea teams (V012) y las columnas de credenciales (V100)

Renumera las migraciones de SPEC-001 de V003/V004 a V005/V006: SPEC-002 §4
reserva esos dos numeros para PostGIS y zonas, y haberlos ocupado habria roto
Flyway en cuanto alguien implementara el catastro, con un conflicto de checksum
en la maquina de otra persona. Se corrige ahora porque no hay datos reales.

V012 es propiedad de SPEC-002 §4.10 y se implementa aqui porque SPEC-100 la
necesita para teams[], el filtro teamId y el alcance del SUPERVISOR. zone_id
queda sin FK: zones es del catastro y todavia no existe.

V100 solo añade columnas a users. El default DELIVERED describe correctamente
las cuentas que ya existen: el administrador semilla no paso por el flujo de
envio y no debe quedar marcado como pendiente.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Entidades de credenciales y cuadrillas, con sus repositorios

**Files:**
- Create: `modules/users/entity/CredentialStatus.java`
- Create: `modules/users/entity/Team.java`, `modules/users/entity/TeamMember.java`
- Create: `modules/users/repository/TeamsRepository.java`, `TeamMembersRepository.java`
- Modify: `modules/auth/entity/User.java` (tres campos nuevos)
- Modify: `modules/auth/repository/UsersRepository.java` (Specification + conteo bloqueante)
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/users/repository/TeamMembersRepositoryTest.java`

**Interfaces:**
- Consumes: `BaseEntity`, `User`, `UsersRepository` (de SPEC-001); tablas de la Task 1
- Produces:
  - `CredentialStatus` enum con `PENDING_DELIVERY`, `DELIVERED`
  - `User.getCredentialStatus()`, `isMustChangePassword()`, `getCredentialsSentAt()` y sus setters
  - `Team.getId()`, `getCode()`, `getName()`, `getSupervisorUserId()`
  - `TeamMembersRepository.findActiveTeamsOfUser(Long userId): List<Team>`
  - `TeamMembersRepository.findActiveUserIdsOfTeams(List<Long> teamIds): List<Long>`
  - `UsersRepository extends JpaSpecificationExecutor<User>`
  - `UsersRepository.countOtherActiveAdminsForUpdate(Long excludedId): long` — con bloqueo pesimista

**Nota sobre `User`:** la entidad vive en `modules/auth` porque SPEC-001 la creó. No se mueve: moverla rompería los imports de todo el módulo de autenticación por una cuestión estética. Los dos módulos comparten la entidad igual que comparten la tabla.

- [ ] **Step 1: Escribir el test de repositorio que falla**

`backend/src/test/java/pe/edu/pucp/hesperides/modules/users/repository/TeamMembersRepositoryTest.java`:

```java
package pe.edu.pucp.hesperides.modules.users.repository;

import org.junit.jupiter.api.BeforeEach;
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
import pe.edu.pucp.hesperides.modules.users.entity.Team;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
@Transactional
class TeamMembersRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private TeamMembersRepository teamMembersRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    private Long supervisorId;
    private Long operarioId;
    private Long teamId;

    @BeforeEach
    void seed() {
        supervisorId = insertUser("supervisor@pucp.edu.pe", "SUPERVISOR");
        operarioId = insertUser("operario@pucp.edu.pe", "OPERARIO");

        jdbcTemplate.update(
                "INSERT INTO teams (code, name, supervisor_user_id) VALUES ('CN-01', 'Cuadrilla Norte', ?)",
                supervisorId);
        teamId = jdbcTemplate.queryForObject("SELECT id FROM teams WHERE code = 'CN-01'", Long.class);
    }

    private Long insertUser(String email, String roleCode) {
        jdbcTemplate.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                VALUES (?, 'hash', 'Nombre', 'Apellido',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = ?))
                """, email, roleCode);
        return jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
    }

    @Test
    void findsTheTeamsAUserCurrentlyBelongsTo() {
        jdbcTemplate.update("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, operarioId);

        List<Team> teams = teamMembersRepository.findActiveTeamsOfUser(operarioId);

        assertThat(teams).hasSize(1);
        assertThat(teams.get(0).getCode()).isEqualTo("CN-01");
        assertThat(teams.get(0).getName()).isEqualTo("Cuadrilla Norte");
    }

    @Test
    void ignoresMembershipsAlreadyEnded() {
        // left_at poblado: la persona estuvo en la cuadrilla pero ya no esta. La
        // fila se conserva para no falsear a que equipo pertenecia cuando ejecuto
        // una intervencion antigua (SPEC-002 §4.10).
        jdbcTemplate.update(
                "INSERT INTO team_members (team_id, user_id, left_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                teamId, operarioId);

        assertThat(teamMembersRepository.findActiveTeamsOfUser(operarioId)).isEmpty();
    }

    @Test
    void returnsEmptyForSomeoneWithoutAnyTeam() {
        assertThat(teamMembersRepository.findActiveTeamsOfUser(supervisorId)).isEmpty();
    }

    @Test
    void findsTheActiveMembersOfSeveralTeamsAtOnce() {
        jdbcTemplate.update("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, operarioId);
        jdbcTemplate.update("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, supervisorId);

        List<Long> memberIds = teamMembersRepository.findActiveUserIdsOfTeams(List.of(teamId));

        assertThat(memberIds).containsExactlyInAnyOrder(operarioId, supervisorId);
    }

    @Test
    void anEmptyListOfTeamsYieldsNoMembers() {
        // El SUPERVISOR sin cuadrilla asignada no debe ver a todo el mundo por
        // un IN () vacio mal construido: debe ver a nadie.
        assertThat(teamMembersRepository.findActiveUserIdsOfTeams(List.of())).isEmpty();
    }
}
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=TeamMembersRepositoryTest
```

Esperado: FALLA con `package pe.edu.pucp.hesperides.modules.users.entity does not exist`.

- [ ] **Step 3: Crear el enum de estado de credencial**

`modules/users/entity/CredentialStatus.java`:

```java
package pe.edu.pucp.hesperides.modules.users.entity;

/**
 * Metadato del sistema, no un dato de negocio: por eso es un enum Java y no un
 * catálogo configurable (SPEC-100 §4). Un administrador que añadiera un tercer
 * estado desde /admin/catalogs no encontraría código que lo produjera ni lo
 * interpretara.
 *
 * Responde "¿recibió su clave?", que es una pregunta distinta de "¿sigue
 * trabajando aquí?" (is_active). Colapsarlas impediría distinguir un alta
 * fallida de una baja deliberada.
 */
public enum CredentialStatus {
    /** El envío falló; el administrador debe reenviar o entregar por otra vía. */
    PENDING_DELIVERY,
    /** La persona recibió sus credenciales (o el administrador lo declaró). */
    DELIVERED
}
```

- [ ] **Step 4: Crear las entidades de cuadrilla**

`modules/users/entity/Team.java`:

```java
package pe.edu.pucp.hesperides.modules.users.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;

/**
 * Cuadrilla de trabajo (SPEC-002 §4.10). Un supervisor la dirige; los operarios
 * pertenecen a ella a través de TeamMember.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "teams")
public class Team extends BaseEntity {

    @Column(nullable = false, length = 50)
    private String code;

    @Column(nullable = false, length = 150)
    private String name;

    /**
     * Se guarda el id y no un @ManyToOne a User: la relación solo se navega en
     * sentido inverso (qué cuadrillas dirige alguien), y un ManyToOne aquí
     * arrastraría el usuario completo en cada consulta de cuadrillas.
     */
    @Column(name = "supervisor_user_id", nullable = false)
    private Long supervisorUserId;

    /** Nulable: una cuadrilla puede ser polivalente (SPEC-002 §4.10). */
    @Column(name = "zone_id")
    private Long zoneId;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
```

`modules/users/entity/TeamMember.java`:

```java
package pe.edu.pucp.hesperides.modules.users.entity;

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

import java.time.Instant;

/**
 * Pertenencia de una persona a una cuadrilla, con historia: leftAt distinto de
 * null significa que ya salió, pero la fila permanece para no falsear a qué
 * equipo pertenecía cuando ejecutó una intervención pasada.
 */
@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(name = "team_members")
public class TeamMember extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt;

    @Column(name = "left_at")
    private Instant leftAt;

    public boolean isCurrentMember() {
        return leftAt == null;
    }
}
```

- [ ] **Step 5: Crear los repositorios**

`modules/users/repository/TeamsRepository.java`:

```java
package pe.edu.pucp.hesperides.modules.users.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.edu.pucp.hesperides.modules.users.entity.Team;

public interface TeamsRepository extends JpaRepository<Team, Long> {
}
```

`modules/users/repository/TeamMembersRepository.java`:

```java
package pe.edu.pucp.hesperides.modules.users.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.modules.users.entity.TeamMember;

import java.util.List;

public interface TeamMembersRepository extends JpaRepository<TeamMember, Long> {

    /** Cuadrillas vigentes de una persona: leftAt null y la fila no dada de baja. */
    @Query("SELECT tm.team FROM TeamMember tm "
            + "WHERE tm.userId = :userId AND tm.leftAt IS NULL AND tm.deletedAt IS NULL")
    List<Team> findActiveTeamsOfUser(@Param("userId") Long userId);

    /**
     * Miembros vigentes de un conjunto de cuadrillas. Con una lista vacía Spring
     * Data genera un IN sin elementos que no devuelve filas, que es justo lo
     * correcto: un supervisor sin cuadrilla no debe ver a nadie, no a todos.
     */
    @Query("SELECT tm.userId FROM TeamMember tm "
            + "WHERE tm.team.id IN :teamIds AND tm.leftAt IS NULL AND tm.deletedAt IS NULL")
    List<Long> findActiveUserIdsOfTeams(@Param("teamIds") List<Long> teamIds);
}
```

- [ ] **Step 6: Extender la entidad User**

En `modules/auth/entity/User.java`, añadir tras el campo `lastLogin`:

```java
    /**
     * Estado de entrega de credenciales (SPEC-100 §2.6). STRING y nunca ORDINAL:
     * así la columna es legible en una consulta SQL directa y un reordenamiento
     * del enum no corrompe los datos existentes.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "credential_status", nullable = false, length = 20)
    private CredentialStatus credentialStatus = CredentialStatus.DELIVERED;

    /**
     * TRUE mientras la contraseña vigente sea la temporal que asignó un
     * administrador. Sin esta bandera, la clave que viajó por correo seguiría
     * siendo válida indefinidamente (SPEC-100 §2.6).
     */
    @Column(name = "must_change_password", nullable = false)
    private boolean mustChangePassword = false;

    @Column(name = "credentials_sent_at")
    private Instant credentialsSentAt;
```

Y estos imports:

```java
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;
```

- [ ] **Step 7: Extender UsersRepository**

En `modules/auth/repository/UsersRepository.java`, cambiar la declaración e incorporar el conteo bloqueante:

```java
public interface UsersRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {
```

y añadir, conservando los dos métodos existentes:

```java
    /**
     * Cuenta los demás administradores activos **tomando un bloqueo** sobre las
     * filas contadas. El bloqueo no es una precaución teórica: sin él, dos
     * administradores desactivándose en el mismo instante leerían ambos "hay 2",
     * ambos procederían, y el sistema quedaría sin ninguno (SPEC-100 §5.6).
     *
     * No se puede usar COUNT con un bloqueo en JPQL, así que se traen los ids y
     * se cuenta en memoria: el conjunto es de unidades, no de miles.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT u.id FROM User u WHERE u.roleItem.code = 'ADMIN' "
            + "AND u.active = TRUE AND u.deletedAt IS NULL AND u.id <> :excludedId")
    List<Long> findOtherActiveAdminIdsForUpdate(@Param("excludedId") Long excludedId);

    /** Correo único entre vigentes, excluyendo a un usuario (para el PUT). */
    @Query("SELECT COUNT(u) FROM User u "
            + "WHERE u.email = :email AND u.deletedAt IS NULL AND u.id <> :excludedId")
    long countByEmailExcluding(@Param("email") String email, @Param("excludedId") Long excludedId);
```

con los imports:

```java
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import java.util.List;
```

- [ ] **Step 8: Ejecutar y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=TeamMembersRepositoryTest
```

Esperado: `Tests run: 5, Failures: 0`.

- [ ] **Step 9: Ejecutar la suite completa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test
```

Esperado: `BUILD SUCCESS`. Los 70 tests previos siguen verdes: los campos nuevos tienen default y no rompen a `AuthService`.

- [ ] **Step 10: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/modules/ backend/src/test/java/pe/edu/pucp/hesperides/modules/users/
git commit -m "feat(users): agrega las entidades de credenciales y cuadrillas

CredentialStatus es un enum Java y no un catalogo porque es metadato del
sistema: un administrador que añadiera un tercer estado desde la UI no
encontraria codigo que lo produjera. Se mapea STRING y nunca ORDINAL, asi un
reordenamiento del enum no corrompe los datos ya escritos.

findActiveUserIdsOfTeams con lista vacia no devuelve filas, que es lo correcto:
un supervisor sin cuadrilla debe ver a nadie, no a todos.

El conteo de administradores toma bloqueo pesimista. Sin el, dos admins
desactivandose en el mismo instante leerian ambos 'hay 2', ambos procederian y
el sistema quedaria sin ninguno.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Política de contraseñas y generador de temporales

**Files:**
- Create: `modules/users/service/PasswordPolicy.java`
- Create: `modules/users/service/TemporaryPasswordGenerator.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/users/service/PasswordPolicyTest.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/users/service/TemporaryPasswordGeneratorTest.java`

**Interfaces:**
- Consumes: nada (ambas son puras, sin I/O — van en la misma tarea porque ninguna justifica su propio ciclo de revisión)
- Produces:
  - `PasswordPolicy.validate(String password, String email, String firstName, String lastName): void` — lanza `ValidationException` con el motivo, no devuelve boolean
  - `PasswordPolicy.MIN_LENGTH = 10`, `MAX_LENGTH = 72`
  - `TemporaryPasswordGenerator.generate(): String`

**Por qué lanza en vez de devolver boolean:** un `boolean` obliga a cada llamador a inventar el mensaje de error, y acabarían siendo distintos en el alta, en el reenvío y en el cambio propio. La excepción lleva el motivo exacto (SPEC-000: fail fast con mensaje claro).

**Nueva excepción necesaria:** `ValidationException` no existe en `shared/exception`. Se crea en esta tarea, mapeada a 400 por el handler global, porque `BusinessRuleException` mapea a 422 y una contraseña que incumple la política es un error de formato del input, no una regla de negocio violada.

- [ ] **Step 1: Escribir los dos tests que fallan**

`PasswordPolicyTest.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordPolicyTest {

    private final PasswordPolicy policy = new PasswordPolicy();

    private static final String EMAIL = "ana.torres@pucp.edu.pe";
    private static final String FIRST = "Ana";
    private static final String LAST = "Torres";

    private void validate(String password) {
        policy.validate(password, EMAIL, FIRST, LAST);
    }

    @Test
    void acceptsAPasswordThatMeetsEveryRule() {
        assertThatCode(() -> validate("Hesperides2026")).doesNotThrowAnyException();
    }

    @Test
    void rejectsAPasswordShorterThanTenCharacters() {
        assertThatThrownBy(() -> validate("Corta123"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("10");
    }

    @Test
    void rejectsAPasswordLongerThanSeventyTwoBytes() {
        // BCrypt trunca en silencio mas alla de 72 bytes: una contrasena
        // truncada sin aviso es peor que una corta (SPEC-100 §9.1).
        assertThatThrownBy(() -> validate("A1" + "z".repeat(71)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("72");
    }

    @Test
    void rejectsAPasswordWithoutAnUppercaseLetter() {
        assertThatThrownBy(() -> validate("hesperides2026"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void rejectsAPasswordWithoutALowercaseLetter() {
        assertThatThrownBy(() -> validate("HESPERIDES2026"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void rejectsAPasswordWithoutADigit() {
        assertThatThrownBy(() -> validate("HesperidesVerde"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void acceptsAPasswordWithoutSpecialCharacters() {
        // No se exige caracter especial a proposito: alarga la clave sin subir
        // la entropia de forma significativa y empuja a patrones predecibles.
        assertThatCode(() -> validate("AreasVerdes7")).doesNotThrowAnyException();
    }

    @Test
    void rejectsAPasswordThatContainsTheEmailLocalPart() {
        assertThatThrownBy(() -> validate("Ana.torres2026"))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("datos personales");
    }

    @Test
    void rejectsAPasswordThatContainsTheFirstName() {
        assertThatThrownBy(() -> validate("MiClaveAna123"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void rejectsAPasswordThatContainsTheLastName() {
        assertThatThrownBy(() -> validate("Torres123456"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void comparesPersonalDataIgnoringCase() {
        // "ANA" dentro de la clave es igual de adivinable que "Ana".
        assertThatThrownBy(() -> validate("ClaveANA12345"))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void rejectsNullAndBlank() {
        assertThatThrownBy(() -> validate(null)).isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> validate("   ")).isInstanceOf(ValidationException.class);
    }

    @Test
    void toleratesNullPersonalDataWithoutCrashing() {
        // El cambio de contrasena propia no siempre tiene el nombre a mano.
        assertThatCode(() -> policy.validate("Hesperides2026", null, null, null))
                .doesNotThrowAnyException();
    }
}
```

`TemporaryPasswordGeneratorTest.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class TemporaryPasswordGeneratorTest {

    private final TemporaryPasswordGenerator generator = new TemporaryPasswordGenerator();
    private final PasswordPolicy policy = new PasswordPolicy();

    @Test
    void everyGeneratedPasswordSatisfiesThePolicy() {
        // Mil iteraciones porque el fallo seria intermitente: una generacion que
        // cumple la politica el 99% de las veces rompe un alta de cada cien.
        for (int i = 0; i < 1000; i++) {
            String generated = generator.generate();
            assertThatCode(() -> policy.validate(generated, null, null, null))
                    .as("intento %d produjo '%s'", i, generated)
                    .doesNotThrowAnyException();
        }
    }

    @Test
    void twoConsecutiveCallsProduceDifferentValues() {
        assertThat(generator.generate()).isNotEqualTo(generator.generate());
    }

    @Test
    void aThousandGenerationsProduceNoCollisions() {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 1000; i++) {
            seen.add(generator.generate());
        }
        assertThat(seen).hasSize(1000);
    }

    @Test
    void avoidsCharactersThatAreAmbiguousWhenDictatedOrCopiedByHand() {
        // Se dicta por telefono o se copia del correo: l, I, 1, O y 0 se
        // confunden entre si (SPEC-100 §9.1).
        for (int i = 0; i < 200; i++) {
            assertThat(generator.generate()).doesNotContainAnyWhitespaces()
                    .doesNotContain("l").doesNotContain("I")
                    .doesNotContain("1").doesNotContain("O").doesNotContain("0");
        }
    }
}
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest='PasswordPolicyTest,TemporaryPasswordGeneratorTest'
```

Esperado: FALLA con `cannot find symbol: class PasswordPolicy`.

- [ ] **Step 3: Crear la excepción de validación**

`shared/exception/ValidationException.java`:

```java
package pe.edu.pucp.hesperides.shared.exception;

/**
 * Un input no cumple una regla de formato. Distinta de BusinessRuleException,
 * que es para reglas del dominio: esta mapea a 400 (el cliente envió algo mal
 * formado) y aquella a 422 (el dato es válido pero la operación no procede).
 */
public class ValidationException extends RuntimeException {

    public ValidationException(String message) {
        super(message);
    }
}
```

Y registrarla en `shared/exception/GlobalExceptionHandler.java`, antes del handler genérico de `Exception`:

```java
    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidationRule(ValidationException ex) {
        log.warn("Validacion de formato fallida: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
    }
```

- [ ] **Step 4: Implementar PasswordPolicy**

`modules/users/service/PasswordPolicy.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.util.Locale;

/**
 * Valida la política de SPEC-100 §9.1. Sin I/O ni dependencias: la misma regla
 * aplica a la contraseña inicial que escribe el administrador, a la temporal
 * que genera el sistema y a la que elige la persona.
 *
 * Lanza en vez de devolver boolean para que el motivo exacto viaje con el error:
 * con un boolean, cada llamador inventaría su propio mensaje y acabarían siendo
 * tres mensajes distintos para la misma regla.
 */
@Component
public class PasswordPolicy {

    public static final int MIN_LENGTH = 10;

    /**
     * 72 bytes es el límite real de BCrypt: más allá trunca en silencio, y una
     * contraseña truncada sin aviso es peor que una corta.
     */
    public static final int MAX_LENGTH = 72;

    private static final int MIN_PERSONAL_FRAGMENT = 3;

    public void validate(String password, String email, String firstName, String lastName) {
        if (password == null || password.isBlank()) {
            throw new ValidationException("La contraseña es obligatoria");
        }
        if (password.length() < MIN_LENGTH) {
            throw new ValidationException("La contraseña debe tener al menos " + MIN_LENGTH + " caracteres");
        }
        if (password.length() > MAX_LENGTH) {
            throw new ValidationException("La contraseña no puede superar los " + MAX_LENGTH + " caracteres");
        }
        if (password.chars().noneMatch(Character::isLowerCase)) {
            throw new ValidationException("La contraseña debe incluir al menos una letra minúscula");
        }
        if (password.chars().noneMatch(Character::isUpperCase)) {
            throw new ValidationException("La contraseña debe incluir al menos una letra mayúscula");
        }
        if (password.chars().noneMatch(Character::isDigit)) {
            throw new ValidationException("La contraseña debe incluir al menos un dígito");
        }
        rejectPersonalData(password, email, firstName, lastName);
    }

    /**
     * Una contraseña que contiene el nombre o el correo de su dueño es de las
     * primeras que prueba quien lo conoce. Los datos personales pueden llegar
     * nulos (el cambio de contraseña propia no siempre los tiene a mano): en ese
     * caso solo se omite esta comprobación, no la política entera.
     */
    private void rejectPersonalData(String password, String email, String firstName, String lastName) {
        String lower = password.toLowerCase(Locale.ROOT);
        String emailLocalPart = email == null ? null : email.split("@")[0];

        for (String personal : new String[] {emailLocalPart, firstName, lastName}) {
            if (personal == null || personal.length() < MIN_PERSONAL_FRAGMENT) {
                continue;
            }
            if (lower.contains(personal.toLowerCase(Locale.ROOT))) {
                throw new ValidationException("La contraseña no puede contener tus datos personales");
            }
        }
    }
}
```

**Nota sobre `MIN_PERSONAL_FRAGMENT`:** un nombre de una o dos letras aparecería por azar en casi cualquier contraseña y bloquearía claves legítimas. Tres caracteres es el umbral donde la coincidencia deja de ser casual.

- [ ] **Step 5: Implementar TemporaryPasswordGenerator**

`modules/users/service/TemporaryPasswordGenerator.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;

/**
 * Genera la contraseña temporal que viaja por correo. Usa SecureRandom y nunca
 * java.util.Random: esta cadena es una credencial real durante el tiempo que
 * tarda la persona en entrar, y un generador predecible la haría adivinable.
 */
@Component
public class TemporaryPasswordGenerator {

    /**
     * Alfabetos sin caracteres ambiguos: faltan l, I, 1, O y 0 porque la clave
     * se dicta por teléfono o se copia a mano desde el correo (SPEC-100 §9.1).
     */
    private static final String LOWER = "abcdefghijkmnpqrstuvwxyz";
    private static final String UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String DIGITS = "23456789";
    private static final String ALL = LOWER + UPPER + DIGITS;

    private static final int LENGTH = 14;

    private final SecureRandom secureRandom = new SecureRandom();

    public String generate() {
        // Se siembra con uno de cada clase antes de rellenar: dejarlo al azar
        // puro produciría, de vez en cuando, una clave sin dígitos que la propia
        // política rechazaría — un fallo intermitente en el alta.
        StringBuilder password = new StringBuilder(LENGTH);
        password.append(randomChar(LOWER));
        password.append(randomChar(UPPER));
        password.append(randomChar(DIGITS));

        while (password.length() < LENGTH) {
            password.append(randomChar(ALL));
        }

        return shuffle(password);
    }

    private char randomChar(String alphabet) {
        return alphabet.charAt(secureRandom.nextInt(alphabet.length()));
    }

    /** Sin mezclar, las tres primeras posiciones tendrían siempre el mismo tipo. */
    private String shuffle(StringBuilder password) {
        for (int i = password.length() - 1; i > 0; i--) {
            int j = secureRandom.nextInt(i + 1);
            char tmp = password.charAt(i);
            password.setCharAt(i, password.charAt(j));
            password.setCharAt(j, tmp);
        }
        return password.toString();
    }
}
```

- [ ] **Step 6: Ejecutar y verificar que pasan**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest='PasswordPolicyTest,TemporaryPasswordGeneratorTest'
```

Esperado: `Tests run: 17, Failures: 0` (13 de política + 4 del generador).

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/modules/users/service/ \
        backend/src/main/java/pe/edu/pucp/hesperides/shared/exception/ \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/users/service/
git commit -m "feat(users): agrega la politica de contrasenas y el generador de temporales

La politica lanza con el motivo exacto en vez de devolver boolean: con un
boolean, el alta, el reenvio y el cambio propio inventarian cada uno su mensaje
y acabarian siendo tres textos distintos para la misma regla.

El generador siembra una minuscula, una mayuscula y un digito antes de rellenar
al azar. Dejarlo al azar puro produciria de vez en cuando una clave sin digitos
que la propia politica rechazaria: un fallo intermitente en el alta.

El alfabeto excluye l, I, 1, O y 0 porque la clave se dicta por telefono o se
copia a mano desde el correo.

ValidationException es nueva y mapea a 400: BusinessRuleException mapea a 422 y
una clave mal formada es un error de formato, no una regla de negocio violada.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Envío de credenciales por SMTP

**Files:**
- Create: `modules/users/service/CredentialDeliveryService.java`
- Create: `shared/audit/AuditActionCode.java`, `shared/audit/AuditService.java`, `shared/audit/LoggingAuditService.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/users/service/CredentialDeliveryServiceTest.java`
- Modify: `backend/pom.xml` (mail + GreenMail)
- Modify: `application.yml`, `src/test/resources/application.yml`, `.env.example`, `docker-compose.yml`

**Interfaces:**
- Consumes: `User` (Task 2)
- Produces:
  - `CredentialDeliveryService.deliver(User user, String rawPassword): boolean` — `true` si el correo salió, `false` si falló. **No lanza**: el llamador decide qué hacer con el fallo
  - `AuditActionCode` con `USER_CREATED`, `USER_ROLE_CHANGED`, `USER_DEACTIVATED`, `USER_REACTIVATED`, `USER_CREDENTIALS_DELIVERY_FAILED`
  - `AuditService.record(AuditActionCode action, String entityType, Long entityId, Map<String, Object> changes): void`

**Por qué devuelve `boolean` y no lanza:** el fallo de entrega **no es un error de la operación** — la cuenta se creó correctamente. Si lanzara, el llamador tendría que capturar y continuar, que es la forma torpe de expresar lo mismo. El `boolean` dice exactamente lo que el spec pide: el alta sigue, y el estado de la credencial refleja qué pasó con el correo.

**Sobre `AuditService`:** SPEC-004 no está implementado (su tabla `audit_log` es V011). Aquí se crea la interfaz y una implementación que escribe a SLF4J, para que las llamadas queden en su sitio desde el principio. Cuando SPEC-004 llegue, solo sustituirá el bean: `UsersServiceImpl` no cambia.

- [ ] **Step 1: Añadir las dependencias**

En `backend/pom.xml`, junto a las de producción:

```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-mail</artifactId>
        </dependency>
```

y en las de test:

```xml
        <!-- Servidor SMTP en memoria: permite comprobar que el correo sale de
             verdad y que su cuerpo lleva la contrasena, sin enviar nada real. -->
        <dependency>
            <groupId>com.icegreen</groupId>
            <artifactId>greenmail-junit5</artifactId>
            <version>2.1.3</version>
            <scope>test</scope>
        </dependency>
```

- [ ] **Step 2: Añadir la configuración SMTP**

En `backend/src/main/resources/application.yml`, al nivel raíz (hermano de `hesperides:`):

```yaml
spring:
  mail:
    host: ${SMTP_HOST}
    port: ${SMTP_PORT:587}
    username: ${SMTP_USERNAME:}
    password: ${SMTP_PASSWORD:}
    properties:
      mail.smtp.auth: ${SMTP_AUTH:true}
      mail.smtp.starttls.enable: ${SMTP_STARTTLS:true}
      # Sin timeouts, un SMTP que no responde cuelga el hilo de la peticion
      # indefinidamente y el administrador no recibe respuesta del alta.
      mail.smtp.connectiontimeout: 5000
      mail.smtp.timeout: 5000
      mail.smtp.writetimeout: 5000
```

> **Cuidado:** `application.yml` ya tiene un bloque `spring:` al principio. Este contenido va **dentro** de ese bloque existente, no en uno nuevo — YAML no admite dos claves `spring:` en el mismo documento y la segunda silenciaría a la primera.

Y dentro de `hesperides.security`... no: esto va en `hesperides` a secas, porque no es seguridad:

```yaml
hesperides:
  mail:
    from: ${SMTP_FROM:no-reply@hesperides.local}
    # Nunca se arma esta URL con el header Host del request: quien controle ese
    # header haria que el correo apunte a un dominio suyo.
    app-public-url: ${APP_PUBLIC_URL:http://localhost:3000}
```

En `backend/src/test/resources/application.yml` (que **reemplaza** al principal, así que necesita el bloque completo), añadir dentro de su `spring:`:

```yaml
  mail:
    host: localhost
    port: 3025
    properties:
      mail.smtp.auth: false
      mail.smtp.starttls.enable: false
```

y al nivel de `hesperides:`:

```yaml
  mail:
    from: no-reply@hesperides.test
    app-public-url: http://localhost:3000
```

En `.env.example`:

```
# SMTP para la entrega de credenciales (SPEC-100). Unica dependencia externa
# admitida del proyecto (SPEC-000 §1): su caida nunca impide un alta.
SMTP_HOST=smtp.pucp.edu.pe
SMTP_PORT=587
SMTP_USERNAME=
SMTP_PASSWORD=
SMTP_FROM=no-reply@hesperides.pucp.edu.pe
# URL publica del frontend, para el enlace del correo. Nunca se deduce del
# header Host de la peticion.
APP_PUBLIC_URL=http://localhost:3000
```

En `docker-compose.yml`, dentro de `environment:` del servicio `backend`:

```yaml
      SMTP_HOST: ${SMTP_HOST:-smtp.pucp.edu.pe}
      SMTP_PORT: ${SMTP_PORT:-587}
      SMTP_USERNAME: ${SMTP_USERNAME:-}
      SMTP_PASSWORD: ${SMTP_PASSWORD:-}
      SMTP_FROM: ${SMTP_FROM:-no-reply@hesperides.local}
      APP_PUBLIC_URL: ${APP_PUBLIC_URL:-http://localhost:3000}
```

- [ ] **Step 3: Escribir el test que falla**

`CredentialDeliveryServiceTest.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetupTest;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;

import static org.assertj.core.api.Assertions.assertThat;

class CredentialDeliveryServiceTest {

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP);

    private CredentialDeliveryService service;

    @BeforeEach
    void setUp() {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost("localhost");
        sender.setPort(greenMail.getSmtp().getPort());
        service = new CredentialDeliveryService(sender, "no-reply@hesperides.test", "http://localhost:3000");
    }

    private User user() {
        CatalogItem role = new CatalogItem();
        role.setCode("OPERARIO");
        role.setLabel("Operario de campo");

        User user = new User();
        user.setEmail("ana.torres@pucp.edu.pe");
        user.setFirstName("Ana");
        user.setLastName("Torres");
        user.setRoleItem(role);
        return user;
    }

    @Test
    void sendsTheEmailAndReportsSuccess() throws Exception {
        boolean delivered = service.deliver(user(), "ClaveTemp123");

        assertThat(delivered).isTrue();
        assertThat(greenMail.getReceivedMessages()).hasSize(1);

        MimeMessage received = greenMail.getReceivedMessages()[0];
        assertThat(received.getAllRecipients()[0].toString()).isEqualTo("ana.torres@pucp.edu.pe");
    }

    @Test
    void theBodyCarriesTheTemporaryPasswordAndTheAccessUrl() {
        service.deliver(user(), "ClaveTemp123");

        String body = GreenMailUtil.getBody(greenMail.getReceivedMessages()[0]);

        assertThat(body).contains("ClaveTemp123");
        assertThat(body).contains("ana.torres@pucp.edu.pe");
        assertThat(body).contains("http://localhost:3000");
    }

    @Test
    void addressesThePersonByTheirFirstName() {
        service.deliver(user(), "ClaveTemp123");

        assertThat(GreenMailUtil.getBody(greenMail.getReceivedMessages()[0])).contains("Ana");
    }

    @Test
    void sendsFromTheConfiguredAddress() throws Exception {
        service.deliver(user(), "ClaveTemp123");

        assertThat(greenMail.getReceivedMessages()[0].getFrom()[0].toString())
                .isEqualTo("no-reply@hesperides.test");
    }

    @Test
    void reportsFailureWithoutThrowingWhenSmtpIsUnreachable() {
        // Un puerto donde no escucha nadie: el alta debe poder continuar, asi
        // que el servicio informa del fallo en vez de propagarlo (SPEC-100 §5.3).
        JavaMailSenderImpl broken = new JavaMailSenderImpl();
        broken.setHost("localhost");
        broken.setPort(1);
        CredentialDeliveryService failing =
                new CredentialDeliveryService(broken, "no-reply@hesperides.test", "http://localhost:3000");

        boolean delivered = failing.deliver(user(), "ClaveTemp123");

        assertThat(delivered).isFalse();
        assertThat(greenMail.getReceivedMessages()).isEmpty();
    }

    @Test
    void theSubjectIdentifiesTheSystem() throws Exception {
        service.deliver(user(), "ClaveTemp123");

        assertThat(greenMail.getReceivedMessages()[0].getSubject()).contains("Hesperides");
    }
}
```

- [ ] **Step 4: Ejecutar y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=CredentialDeliveryServiceTest
```

Esperado: FALLA con `cannot find symbol: class CredentialDeliveryService`.

- [ ] **Step 5: Crear el contrato de auditoría**

`shared/audit/AuditActionCode.java`:

```java
package pe.edu.pucp.hesperides.shared.audit;

/**
 * Acciones auditables. Es un enum Java y no un catálogo configurable porque cada
 * valor corresponde a una línea de código concreta que lo emite (SPEC-004 §3.1):
 * un valor que un administrador añadiera desde la UI no lo produciría nadie.
 *
 * Añadir un valor aquí obliga a actualizar la tabla de SPEC-004 §3.2.
 */
public enum AuditActionCode {
    USER_CREATED,
    USER_ROLE_CHANGED,
    USER_DEACTIVATED,
    USER_REACTIVATED,
    /** Añadida por SPEC-100 §9.3: explica meses después por qué alguien nunca pudo entrar. */
    USER_CREDENTIALS_DELIVERY_FAILED
}
```

`shared/audit/AuditService.java`:

```java
package pe.edu.pucp.hesperides.shared.audit;

import java.util.Map;

/**
 * Registra una acción sensible. La implementación que persiste en audit_log es
 * de SPEC-004, que aún no está implementado; hasta entonces LoggingAuditService
 * cumple el contrato escribiendo a SLF4J.
 *
 * Las llamadas se colocan ya en su sitio para que SPEC-004 solo tenga que
 * aportar otro bean, sin tocar los servicios de dominio.
 */
public interface AuditService {

    void record(AuditActionCode action, String entityType, Long entityId, Map<String, Object> changes);
}
```

`shared/audit/LoggingAuditService.java`:

```java
package pe.edu.pucp.hesperides.shared.audit;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Implementación provisional: deja la acción en el log hasta que SPEC-004 aporte
 * la persistencia en audit_log.
 *
 * Es deliberadamente insuficiente y así consta: un log rotado a las pocas
 * semanas no responde "¿quién desactivó esta cuenta en marzo?", que es justo lo
 * que SPEC-004 existe para resolver.
 */
@Slf4j
@Service
public class LoggingAuditService implements AuditService {

    @Override
    public void record(AuditActionCode action, String entityType, Long entityId,
                       Map<String, Object> changes) {
        log.info("AUDIT action={} entityType={} entityId={} changes={}",
                action, entityType, entityId, changes);
    }
}
```

- [ ] **Step 6: Implementar CredentialDeliveryService**

`modules/users/service/CredentialDeliveryService.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

/**
 * Único punto del sistema que habla con el servidor SMTP.
 *
 * Nunca lanza: un fallo de entrega no invalida el alta de la persona, así que
 * informa con un boolean y el llamador decide (SPEC-100 §5.3). Lanzar obligaría
 * a cada llamador a capturar y continuar, que es la forma torpe de decir lo
 * mismo.
 */
@Slf4j
@Service
public class CredentialDeliveryService {

    private static final String SUBJECT =
            "Acceso al sistema Hesperides — Gestión de Áreas Verdes PUCP";

    private final JavaMailSender mailSender;
    private final String from;
    private final String appPublicUrl;

    public CredentialDeliveryService(
            JavaMailSender mailSender,
            @Value("${hesperides.mail.from}") String from,
            @Value("${hesperides.mail.app-public-url}") String appPublicUrl) {
        this.mailSender = mailSender;
        this.from = from;
        this.appPublicUrl = appPublicUrl;
    }

    /**
     * @return true si el correo salió; false si el SMTP falló. El llamador marca
     *         la cuenta como PENDING_DELIVERY en ese caso, sin revertir el alta.
     */
    public boolean deliver(User user, String rawPassword) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(user.getEmail());
        message.setSubject(SUBJECT);
        message.setText(buildBody(user, rawPassword));

        try {
            mailSender.send(message);
            log.info("Credenciales enviadas a userId={}", user.getId());
            return true;
        } catch (MailException ex) {
            // Solo el motivo tecnico: el cuerpo del mensaje lleva la contrasena
            // y no puede acabar en un log (SPEC-100 §9.4).
            log.warn("Fallo al enviar credenciales a userId={}: {}", user.getId(), ex.getMessage());
            return false;
        }
    }

    /**
     * Texto plano, sin HTML: no hay nada que maquetar, no dispara filtros de spam
     * y no necesita plantillas.
     *
     * La contraseña viaja en el cuerpo. Es una debilidad aceptada y mitigada por
     * must_change_password: deja de ser válida en cuanto la persona entra una vez
     * (SPEC-100 §5.3).
     */
    private String buildBody(User user, String rawPassword) {
        return """
                Hola %s,

                Se ha creado tu cuenta en el sistema de gestión de áreas verdes del campus.

                Correo de acceso: %s
                Contraseña temporal: %s

                Ingresa en %s y cambia tu contraseña. El sistema te la pedirá apenas
                entres; hasta que la cambies no podrás usar el resto de funciones.

                Si no esperabas este correo, avisa al administrador del sistema.
                """
                .formatted(user.getFirstName(), user.getEmail(), rawPassword, appPublicUrl);
    }
}
```

- [ ] **Step 7: Ejecutar y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=CredentialDeliveryServiceTest
```

Esperado: `Tests run: 6, Failures: 0`.

Si falla con `Could not resolve placeholder 'SMTP_HOST'`, es que el `application.yml` de test no tiene el bloque `spring.mail`: revisar el Step 2, recordando que ese archivo **reemplaza** al principal y necesita el bloque completo.

- [ ] **Step 8: Verificar que la suite entera sigue verde**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test
```

Esperado: `BUILD SUCCESS`. Atención: al añadir `spring-boot-starter-mail`, Spring autoconfigura un `JavaMailSender` que exige `spring.mail.host`. Si algún test de contexto falla por eso, es que falta el bloque en `src/test/resources/application.yml`.

- [ ] **Step 9: Commit**

```bash
git add backend/pom.xml backend/src/main/resources/application.yml backend/src/test/resources/application.yml \
        .env.example docker-compose.yml \
        backend/src/main/java/pe/edu/pucp/hesperides/shared/audit/ \
        backend/src/main/java/pe/edu/pucp/hesperides/modules/users/service/CredentialDeliveryService.java \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/users/service/CredentialDeliveryServiceTest.java
git commit -m "feat(users): agrega el envio de credenciales por SMTP

deliver() devuelve boolean y nunca lanza: un fallo de entrega no invalida el
alta de la persona. Lanzar obligaria a cada llamador a capturar y continuar, que
es la forma torpe de decir lo mismo.

El correo es texto plano: no hay nada que maquetar, no dispara filtros de spam y
no necesita plantillas. La contrasena viaja en el cuerpo, debilidad aceptada y
mitigada por must_change_password, que la invalida en cuanto la persona entra.

Los timeouts de SMTP son explicitos: sin ellos un servidor que no responde
cuelga el hilo de la peticion y el administrador no recibe respuesta del alta.

GreenMail permite comprobar que el correo sale de verdad y que su cuerpo lleva
la contrasena, sin enviar nada real.

AuditService queda como interfaz con una implementacion a SLF4J: SPEC-004 no
esta implementado, y asi las llamadas quedan en su sitio para que ese spec solo
tenga que sustituir el bean.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: DTOs, filtros del listado y alcance por rol

**Files:**
- Create: `modules/users/dto/CreateUserRequest.java`, `UpdateUserRequest.java`, `ChangePasswordRequest.java`
- Create: `modules/users/dto/UserDetailResponse.java`, `TeamSummaryResponse.java`, `CredentialDeliveryResponse.java`
- Create: `modules/users/service/UserSpecifications.java`
- Create: `modules/users/service/UserScopeResolver.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/users/service/UserSpecificationsTest.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/users/service/UserScopeResolverTest.java`

**Interfaces:**
- Consumes: `User`, `CredentialStatus`, `TeamMembersRepository` (Task 2); `RoleCodes` (de SPEC-001)
- Produces:
  - `UserSpecifications.withFilters(String search, String roleCode, Boolean isActive, Long teamId, List<Long> teamMemberIds): Specification<User>`
  - `UserScopeResolver.resolve(String viewerEmail): Scope` donde `Scope` es un record con `boolean seesEveryone()` y `List<Long> visibleUserIds()`
  - Los seis DTOs con sus campos exactos

**Por qué los filtros van en su propia clase:** `UsersServiceImpl` tiene un límite de 150 líneas y nueve operaciones que orquestar. Componer cinco predicados de JPA dentro de él lo llevaría por encima del límite y mezclaría dos responsabilidades: orquestar reglas de negocio y traducir parámetros de consulta.

- [ ] **Step 1: Escribir los DTOs**

`modules/users/dto/CreateUserRequest.java`:

```java
package pe.edu.pucp.hesperides.modules.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateUserRequest(
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "Debe ser un correo electrónico válido")
        @Size(max = 255, message = "El correo no puede superar los 255 caracteres")
        String email,

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String firstName,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 100, message = "El apellido no puede superar los 100 caracteres")
        String lastName,

        @NotBlank(message = "El rol es obligatorio")
        String roleCode,

        // La politica completa la valida PasswordPolicy en el servicio: Bean
        // Validation no puede comprobar que la clave no contenga el nombre.
        @NotBlank(message = "La contraseña es obligatoria")
        String initialPassword) {
}
```

`modules/users/dto/UpdateUserRequest.java`:

```java
package pe.edu.pucp.hesperides.modules.users.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Nótese que no hay campo de contraseña: un administrador no fija la clave de
 * otra persona, la regenera (SPEC-100 §2.7). Si el cliente envía un campo
 * "password" extra, Jackson lo ignora y la contraseña no cambia.
 */
public record UpdateUserRequest(
        @NotBlank(message = "El correo es obligatorio")
        @Email(message = "Debe ser un correo electrónico válido")
        @Size(max = 255, message = "El correo no puede superar los 255 caracteres")
        String email,

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 100, message = "El nombre no puede superar los 100 caracteres")
        String firstName,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 100, message = "El apellido no puede superar los 100 caracteres")
        String lastName,

        @NotBlank(message = "El rol es obligatorio")
        String roleCode) {
}
```

`modules/users/dto/ChangePasswordRequest.java`:

```java
package pe.edu.pucp.hesperides.modules.users.dto;

import jakarta.validation.constraints.NotBlank;

public record ChangePasswordRequest(
        @NotBlank(message = "La contraseña actual es obligatoria")
        String currentPassword,

        @NotBlank(message = "La contraseña nueva es obligatoria")
        String newPassword) {
}
```

`modules/users/dto/TeamSummaryResponse.java`:

```java
package pe.edu.pucp.hesperides.modules.users.dto;

/** Resumen de cuadrilla dentro de la ficha de un usuario. */
public record TeamSummaryResponse(Long id, String name) {
}
```

`modules/users/dto/UserDetailResponse.java`:

```java
package pe.edu.pucp.hesperides.modules.users.dto;

import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;

import java.time.Instant;
import java.util.List;

/**
 * Ficha completa de un usuario. Como UserResponse de SPEC-001, no existe ningún
 * campo para el hash de la contraseña: es la garantía de que no puede salir por
 * esta vía ni por accidente.
 *
 * Reutiliza RoleResponse de modules/auth en vez de declarar otro igual: el rol
 * tiene la misma forma en toda la API.
 */
public record UserDetailResponse(
        Long id,
        String email,
        String firstName,
        String lastName,
        String fullName,
        RoleResponse role,
        boolean isActive,
        CredentialStatus credentialStatus,
        boolean mustChangePassword,
        Instant lastLogin,
        List<TeamSummaryResponse> teams,
        Instant createdAt,
        Instant updatedAt) {
}
```

`modules/users/dto/CredentialDeliveryResponse.java`:

```java
package pe.edu.pucp.hesperides.modules.users.dto;

import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;

/**
 * Respuesta reducida de resend-credentials: solo lo que el frontend necesita
 * para decidir si avisar de un fallo de entrega. Nunca incluye la contraseña
 * generada, que solo existe en memoria y en el cuerpo del correo.
 */
public record CredentialDeliveryResponse(Long id, String email, CredentialStatus credentialStatus) {
}
```

- [ ] **Step 2: Escribir los tests que fallan**

`UserScopeResolverTest.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.modules.users.repository.TeamMembersRepository;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserScopeResolverTest {

    @Mock private UsersRepository usersRepository;
    @Mock private TeamMembersRepository teamMembersRepository;

    private UserScopeResolver resolver;

    @BeforeEach
    void setUp() {
        resolver = new UserScopeResolver(usersRepository, teamMembersRepository);
    }

    private User viewer(String roleCode, Long id) {
        CatalogItem role = new CatalogItem();
        role.setCode(roleCode);

        User user = new User();
        user.setEmail("viewer@pucp.edu.pe");
        user.setRoleItem(role);
        setId(user, id);
        return user;
    }

    private void setId(Object entity, Long id) {
        try {
            Field field = BaseEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("No se pudo fijar el id en el test", ex);
        }
    }

    @Test
    void anAdminSeesEveryone() {
        when(usersRepository.findActiveByEmail("viewer@pucp.edu.pe"))
                .thenReturn(Optional.of(viewer("ADMIN", 1L)));

        UserScopeResolver.Scope scope = resolver.resolve("viewer@pucp.edu.pe");

        assertThat(scope.seesEveryone()).isTrue();
        // No hace falta consultar cuadrillas si ve a todos.
        verify(teamMembersRepository, never()).findActiveTeamsOfUser(any());
    }

    @Test
    void aCoordinatorAlsoSeesEveryone() {
        // Planifica sobre todas las cuadrillas y necesita saber a que supervisor
        // dirigirse (SPEC-001 Anexo A, nota 1).
        when(usersRepository.findActiveByEmail("viewer@pucp.edu.pe"))
                .thenReturn(Optional.of(viewer("COORDINADOR", 2L)));

        assertThat(resolver.resolve("viewer@pucp.edu.pe").seesEveryone()).isTrue();
    }

    @Test
    void aSupervisorSeesOnlyTheMembersOfTheirTeams() {
        User supervisor = viewer("SUPERVISOR", 3L);
        Team team = new Team();
        setId(team, 10L);

        when(usersRepository.findActiveByEmail("viewer@pucp.edu.pe")).thenReturn(Optional.of(supervisor));
        when(teamMembersRepository.findActiveTeamsOfUser(3L)).thenReturn(List.of(team));
        when(teamMembersRepository.findActiveUserIdsOfTeams(List.of(10L))).thenReturn(List.of(4L, 5L));

        UserScopeResolver.Scope scope = resolver.resolve("viewer@pucp.edu.pe");

        assertThat(scope.seesEveryone()).isFalse();
        // Se incluye a si mismo: un supervisor debe poder ver su propia ficha.
        assertThat(scope.visibleUserIds()).containsExactlyInAnyOrder(3L, 4L, 5L);
    }

    @Test
    void aSupervisorWithoutTeamsSeesOnlyThemselves() {
        User supervisor = viewer("SUPERVISOR", 3L);
        when(usersRepository.findActiveByEmail("viewer@pucp.edu.pe")).thenReturn(Optional.of(supervisor));
        when(teamMembersRepository.findActiveTeamsOfUser(3L)).thenReturn(List.of());

        UserScopeResolver.Scope scope = resolver.resolve("viewer@pucp.edu.pe");

        // Nunca "ve a todos" por una lista vacia mal interpretada.
        assertThat(scope.seesEveryone()).isFalse();
        assertThat(scope.visibleUserIds()).containsExactly(3L);
    }

    @Test
    void anOperarioSeesOnlyThemselves() {
        when(usersRepository.findActiveByEmail("viewer@pucp.edu.pe"))
                .thenReturn(Optional.of(viewer("OPERARIO", 6L)));

        UserScopeResolver.Scope scope = resolver.resolve("viewer@pucp.edu.pe");

        assertThat(scope.seesEveryone()).isFalse();
        assertThat(scope.visibleUserIds()).containsExactly(6L);
    }

    @Test
    void anUnknownViewerIsRejected() {
        when(usersRepository.findActiveByEmail("fantasma@pucp.edu.pe")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> resolver.resolve("fantasma@pucp.edu.pe"))
                .isInstanceOf(UnauthorizedException.class);
    }
}
```

`UserSpecificationsTest.java` — este se prueba contra base real, porque un `Specification` mal construido compila y devuelve resultados incorrectos en silencio:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
@Transactional
class UserSpecificationsTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private UsersRepository usersRepository;
    @Autowired private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void seed() {
        insert("perez@pucp.edu.pe", "Juan", "Pérez", "OPERARIO", true);
        insert("nunez@pucp.edu.pe", "Ana", "Núñez", "COORDINADOR", true);
        insert("baja@pucp.edu.pe", "Luis", "Gómez", "OPERARIO", false);
    }

    private void insert(String email, String first, String last, String roleCode, boolean active) {
        jdbcTemplate.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, is_active)
                VALUES (?, 'hash', ?, ?,
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = ?), ?)
                """, email, first, last, roleCode, active);
    }

    private List<String> emailsMatching(String search, String roleCode, Boolean isActive,
                                        Long teamId, List<Long> scopeIds) {
        return usersRepository
                .findAll(UserSpecifications.withFilters(search, roleCode, isActive, teamId, scopeIds),
                        Pageable.unpaged())
                .map(User::getEmail)
                .getContent();
    }

    @Test
    void withoutIsActiveOnlyActiveUsersComeBack() {
        // Por defecto el listado no muestra desactivados (SPEC-100 §3).
        assertThat(emailsMatching(null, null, null, null, null))
                .contains("perez@pucp.edu.pe", "nunez@pucp.edu.pe")
                .doesNotContain("baja@pucp.edu.pe");
    }

    @Test
    void isActiveFalseShowsOnlyTheDeactivatedOnes() {
        assertThat(emailsMatching(null, null, false, null, null))
                .containsExactly("baja@pucp.edu.pe");
    }

    @Test
    void searchMatchesFirstNameLastNameAndEmail() {
        assertThat(emailsMatching("perez", null, null, null, null)).containsExactly("perez@pucp.edu.pe");
        assertThat(emailsMatching("Juan", null, null, null, null)).containsExactly("perez@pucp.edu.pe");
        assertThat(emailsMatching("nunez@", null, null, null, null)).containsExactly("nunez@pucp.edu.pe");
    }

    @Test
    void searchIgnoresCase() {
        assertThat(emailsMatching("PÉREZ", null, null, null, null)).containsExactly("perez@pucp.edu.pe");
    }

    @Test
    void searchIgnoresAccents() {
        // "nunez" debe encontrar a "Núñez": quien busca no escribe las tildes.
        assertThat(emailsMatching("nunez", null, null, null, null))
                .contains("nunez@pucp.edu.pe");
    }

    @Test
    void roleCodeFiltersByTheCatalogCode() {
        assertThat(emailsMatching(null, "COORDINADOR", null, null, null))
                .containsExactly("nunez@pucp.edu.pe");
    }

    @Test
    void filtersCombineWithAnd() {
        assertThat(emailsMatching("gomez", "OPERARIO", false, null, null))
                .containsExactly("baja@pucp.edu.pe");
    }

    @Test
    void aScopeOfIdsRestrictsTheResult() {
        Long id = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'perez@pucp.edu.pe'", Long.class);

        assertThat(emailsMatching(null, null, null, null, List.of(id)))
                .containsExactly("perez@pucp.edu.pe");
    }

    @Test
    void anEmptyScopeYieldsNothing() {
        // Un supervisor sin cuadrilla no ve a todos: no ve a nadie.
        assertThat(emailsMatching(null, null, null, null, List.of())).isEmpty();
    }

    @Test
    void softDeletedUsersNeverAppear() {
        jdbcTemplate.update("UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE email = ?",
                "perez@pucp.edu.pe");

        assertThat(emailsMatching(null, null, null, null, null))
                .doesNotContain("perez@pucp.edu.pe");
    }
}
```

- [ ] **Step 3: Ejecutar y verificar que fallan**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest='UserScopeResolverTest,UserSpecificationsTest'
```

Esperado: FALLA con `cannot find symbol: class UserScopeResolver`.

- [ ] **Step 4: Implementar UserSpecifications**

`modules/users/service/UserSpecifications.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Traduce los parámetros del listado a predicados de JPA. Un parámetro ausente
 * no añade condición (SPEC-C03 §6.1).
 *
 * Vive aparte de UsersServiceImpl para no mezclar dos responsabilidades —
 * orquestar reglas de negocio y traducir una consulta — y para no empujar ese
 * servicio por encima de su límite de tamaño.
 */
public final class UserSpecifications {

    private UserSpecifications() {
    }

    public static Specification<User> withFilters(
            String search, String roleCode, Boolean isActive, Long teamId, List<Long> scopeUserIds) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            // Las filas dadas de baja lógica no existen para ningún listado.
            predicates.add(cb.isNull(root.get("deletedAt")));

            // Sin el parámetro explícito se muestran solo los activos: es lo que
            // se necesita el 95% de las veces (SPEC-100 §5.5).
            predicates.add(cb.equal(root.get("active"), isActive == null ? Boolean.TRUE : isActive));

            if (search != null && !search.isBlank()) {
                predicates.add(searchPredicate(root, cb, search));
            }

            if (roleCode != null && !roleCode.isBlank()) {
                predicates.add(cb.equal(root.get("roleItem").get("code"), roleCode));
            }

            if (teamId != null) {
                predicates.add(membershipPredicate(root, query, cb, teamId));
            }

            // null significa "sin restricción de alcance"; una lista vacía
            // significa "no ve a nadie", que es lo correcto para un supervisor
            // sin cuadrilla. Son dos casos distintos y no deben confundirse.
            if (scopeUserIds != null) {
                predicates.add(
                        scopeUserIds.isEmpty() ? cb.disjunction() : root.get("id").in(scopeUserIds));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Busca en nombre, apellido y correo. Usa `unaccent` de PostgreSQL para que
     * "nunez" encuentre a "Núñez": quien busca no escribe las tildes.
     */
    private static Predicate searchPredicate(Root<User> root, CriteriaBuilder cb, String search) {
        String pattern = "%" + search.toLowerCase(Locale.ROOT) + "%";

        return cb.or(
                cb.like(unaccentLower(cb, root.get("firstName")), unaccentLiteral(cb, pattern)),
                cb.like(unaccentLower(cb, root.get("lastName")), unaccentLiteral(cb, pattern)),
                cb.like(cb.lower(root.get("email")), pattern));
    }

    private static Expression<String> unaccentLower(CriteriaBuilder cb, Expression<String> field) {
        return cb.function("unaccent", String.class, cb.lower(field));
    }

    private static Expression<String> unaccentLiteral(CriteriaBuilder cb, String value) {
        return cb.function("unaccent", String.class, cb.literal(value));
    }

    /**
     * Subconsulta en vez de join: un join duplicaría la fila del usuario si
     * perteneciera a varias cuadrillas, y el listado mostraría la misma persona
     * dos veces.
     */
    private static Predicate membershipPredicate(
            Root<User> root, CriteriaQuery<?> query, CriteriaBuilder cb, Long teamId) {

        Subquery<Long> subquery = query.subquery(Long.class);
        Root<TeamMember> member = subquery.from(TeamMember.class);
        subquery.select(member.get("userId"))
                .where(cb.and(
                        cb.equal(member.get("team").get("id"), teamId),
                        cb.isNull(member.get("leftAt")),
                        cb.isNull(member.get("deletedAt"))));

        return root.get("id").in(subquery);
    }
}
```

Imports completos del archivo:

```java
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.users.entity.TeamMember;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
```

Con esos imports, las firmas de `searchPredicate`, `unaccentLower` y `unaccentLiteral` se escriben sin el prefijo `jakarta.persistence.criteria.`: `Root<User> root`, `CriteriaBuilder cb`, `Expression<String>`.

**Requisito de base de datos para `unaccent`:** la función pertenece a la extensión `unaccent` de PostgreSQL, que **no está habilitada**. Añadir una migración `V101__enable_unaccent.sql`:

```sql
-- La busqueda de usuarios debe encontrar "Nuñez" escribiendo "nunez": quien
-- busca no escribe las tildes. unaccent lo resuelve en la base, sin duplicar
-- columnas normalizadas ni normalizar en memoria despues de traer las filas.
CREATE EXTENSION IF NOT EXISTS unaccent;
```

- [ ] **Step 5: Implementar UserScopeResolver**

`modules/users/service/UserScopeResolver.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.users.entity.Team;
import pe.edu.pucp.hesperides.modules.users.repository.TeamMembersRepository;
import pe.edu.pucp.hesperides.shared.exception.UnauthorizedException;
import pe.edu.pucp.hesperides.shared.security.RoleCodes;

import java.util.ArrayList;
import java.util.List;

/**
 * Resuelve a quién puede ver quien consulta, según el Anexo A de SPEC-001:
 * ADMIN y COORDINADOR ven a todos; SUPERVISOR solo a su cuadrilla; cualquier
 * otro, solo a sí mismo.
 *
 * El alcance se calcula contra teams/team_members en cada petición, no contra un
 * claim del JWT: así reasignar a alguien de cuadrilla cambia su alcance en el
 * siguiente request, sin esperar a que expire su token.
 */
@Component
@RequiredArgsConstructor
public class UserScopeResolver {

    private final UsersRepository usersRepository;
    private final TeamMembersRepository teamMembersRepository;

    /**
     * @param seesEveryone   true para ADMIN y COORDINADOR
     * @param visibleUserIds ids visibles cuando no ve a todos. Vacío jamás
     *                       significa "todos": significa que no ve a nadie
     */
    public record Scope(boolean seesEveryone, List<Long> visibleUserIds) {
    }

    @Transactional(readOnly = true)
    public Scope resolve(String viewerEmail) {
        User viewer = usersRepository.findActiveByEmail(viewerEmail)
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired token"));

        String roleCode = viewer.getRoleCode();

        if (RoleCodes.ADMIN.equals(roleCode) || RoleCodes.COORDINADOR.equals(roleCode)) {
            return new Scope(true, List.of());
        }

        if (RoleCodes.SUPERVISOR.equals(roleCode)) {
            return new Scope(false, membersOfTeamsLedBy(viewer));
        }

        // OPERARIO y cualquier rol futuro sin permiso de listado: su propia ficha.
        return new Scope(false, List.of(viewer.getId()));
    }

    private List<Long> membersOfTeamsLedBy(User supervisor) {
        List<Long> teamIds = teamMembersRepository.findActiveTeamsOfUser(supervisor.getId())
                .stream().map(Team::getId).toList();

        // Se incluye siempre a sí mismo: un supervisor debe poder ver su propia
        // ficha aunque no figure como miembro de la cuadrilla que dirige.
        List<Long> visible = new ArrayList<>();
        visible.add(supervisor.getId());

        if (!teamIds.isEmpty()) {
            visible.addAll(teamMembersRepository.findActiveUserIdsOfTeams(teamIds));
        }

        return visible.stream().distinct().toList();
    }
}
```

- [ ] **Step 6: Ejecutar y verificar que pasan**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest='UserScopeResolverTest,UserSpecificationsTest'
```

Esperado: `Tests run: 16, Failures: 0` (6 de alcance + 10 de filtros).

Si el test de acentos falla con `function unaccent does not exist`, falta la migración `V101` del Step 4.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/modules/users/ \
        backend/src/main/resources/db/migration/V101__enable_unaccent.sql \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/users/service/
git commit -m "feat(users): agrega los DTOs, los filtros del listado y el alcance por rol

UserSpecifications distingue null de lista vacia en el alcance: null es 'sin
restriccion', vacia es 'no ve a nadie'. Confundirlas haria que un supervisor sin
cuadrilla viera a toda la plantilla.

La busqueda usa unaccent de PostgreSQL para que 'nunez' encuentre a 'Nuñez':
quien busca no escribe las tildes. El filtro por cuadrilla usa subconsulta y no
join, porque un join duplicaria al usuario que pertenece a varias.

El alcance se calcula contra team_members en cada peticion y no contra un claim
del JWT: asi reasignar a alguien de cuadrilla cambia su alcance en el siguiente
request, sin esperar a que expire su token.

UpdateUserRequest no tiene campo de contrasena: un administrador no fija la
clave de otra persona, la regenera (SPEC-100 §2.7).

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: UsersService — orquestación y reglas de negocio

**Files:**
- Create: `modules/users/service/UsersService.java` (interfaz)
- Create: `modules/users/service/UsersServiceImpl.java`
- Create: `modules/users/service/UserMapper.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/users/service/UsersServiceImplTest.java`

**Interfaces:**
- Consumes: `UsersRepository`, `TeamMembersRepository` (Task 2); `PasswordPolicy`, `TemporaryPasswordGenerator` (Task 3); `CredentialDeliveryService`, `AuditService` (Task 4); `UserSpecifications`, `UserScopeResolver`, los DTOs (Task 5); `PasswordEncoder`, `RefreshTokenService`, `CatalogItemsRepository`
- Produces los nueve métodos de `UsersService`:
  - `findAll(String search, String roleCode, Boolean isActive, Long teamId, Pageable pageable, String viewerEmail): Page<UserDetailResponse>`
  - `findById(Long id, String viewerEmail): UserDetailResponse`
  - `create(CreateUserRequest request): CreationResult` — record con `user()` y `delivered()`
  - `update(Long id, UpdateUserRequest request): UserDetailResponse`
  - `deactivate(Long id, String actorEmail): UserDetailResponse`
  - `reactivate(Long id): UserDetailResponse`
  - `resendCredentials(Long id): CredentialDeliveryResponse`
  - `markCredentialsDelivered(Long id): UserDetailResponse`
  - `changeOwnPassword(String email, ChangePasswordRequest request): void`

**Falta un repositorio:** resolver `roleCode` → `CatalogItem` necesita consultar `catalog_items`, y no existe ningún repositorio para esa entidad. Se crea `modules/catalogs/repository/CatalogItemsRepository.java` en el Step 3.

- [ ] **Step 1: Escribir el test que falla**

`UsersServiceImplTest.java` — es largo porque cubre las nueve operaciones y sus reglas; los tests no tienen límite de tamaño:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.crypto.password.PasswordEncoder;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.auth.service.RefreshTokenService;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;
import pe.edu.pucp.hesperides.modules.users.repository.TeamMembersRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.lang.reflect.Field;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UsersServiceImplTest {

    @Mock private UsersRepository usersRepository;
    @Mock private CatalogItemsRepository catalogItemsRepository;
    @Mock private TeamMembersRepository teamMembersRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PasswordPolicy passwordPolicy;
    @Mock private TemporaryPasswordGenerator temporaryPasswordGenerator;
    @Mock private CredentialDeliveryService credentialDeliveryService;
    @Mock private RefreshTokenService refreshTokenService;
    @Mock private AuditService auditService;
    @Mock private UserScopeResolver scopeResolver;

    private UsersServiceImpl service;

    @BeforeEach
    void setUp() {
        // AdminProtectionRules se construye de verdad, no se simula: los tests
        // del ultimo administrador deben ejercitar la regla real contra el mock
        // del repositorio, no contra un mock de la regla.
        service = new UsersServiceImpl(usersRepository, catalogItemsRepository, teamMembersRepository,
                passwordEncoder, passwordPolicy, temporaryPasswordGenerator,
                credentialDeliveryService, refreshTokenService, auditService,
                scopeResolver, new AdminProtectionRules(usersRepository), new UserMapper());
    }

    private CatalogItem role(String code, Long id) {
        CatalogItem item = new CatalogItem();
        item.setCode(code);
        item.setLabel(code);
        item.setActive(true);
        setId(item, id);
        return item;
    }

    private User existingUser(Long id, String roleCode, boolean active) {
        User user = new User();
        user.setEmail("ana@pucp.edu.pe");
        user.setFirstName("Ana");
        user.setLastName("Torres");
        user.setPasswordHash("$2a$10$hash");
        user.setRoleItem(role(roleCode, 1L));
        user.setActive(active);
        setId(user, id);
        return user;
    }

    private void setId(Object entity, Long id) {
        try {
            Field field = BaseEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(entity, id);
        } catch (ReflectiveOperationException ex) {
            throw new IllegalStateException("No se pudo fijar el id en el test", ex);
        }
    }

    private CreateUserRequest createRequest() {
        return new CreateUserRequest("Nueva@PUCP.edu.pe ", "María", "García", "OPERARIO", "ClaveValida123");
    }

    // ---------- create ----------

    @Test
    void createPersistsWithMustChangePasswordAndSendsTheEmail() {
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO")).thenReturn(Optional.of(role("OPERARIO", 3L)));
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode("ClaveValida123")).thenReturn("$2a$10$hashnuevo");
        when(usersRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User saved = inv.getArgument(0);
            setId(saved, 48L);
            return saved;
        });
        when(credentialDeliveryService.deliver(any(), eq("ClaveValida123"))).thenReturn(true);

        UsersService.CreationResult result = service.create(createRequest());

        assertThat(result.delivered()).isTrue();
        assertThat(result.user().mustChangePassword()).isTrue();
        assertThat(result.user().credentialStatus()).isEqualTo(CredentialStatus.DELIVERED);
    }

    @Test
    void createNormalisesTheEmailToLowercaseAndTrimmed() {
        when(catalogItemsRepository.findActiveRoleByCode(anyString())).thenReturn(Optional.of(role("OPERARIO", 3L)));
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(usersRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(credentialDeliveryService.deliver(any(), anyString())).thenReturn(true);

        UsersService.CreationResult result = service.create(createRequest());

        // Sin normalizar, "Nueva@PUCP.edu.pe" y "nueva@pucp.edu.pe" serian dos
        // cuentas distintas y el login fallaria de forma inexplicable.
        assertThat(result.user().email()).isEqualTo("nueva@pucp.edu.pe");
    }

    @Test
    void createValidatesThePasswordAgainstThePolicy() {
        when(catalogItemsRepository.findActiveRoleByCode(anyString())).thenReturn(Optional.of(role("OPERARIO", 3L)));
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.empty());

        service.create(createRequest());

        verify(passwordPolicy).validate(eq("ClaveValida123"), eq("nueva@pucp.edu.pe"),
                eq("María"), eq("García"));
    }

    @Test
    void createWithADuplicateEmailFails() {
        when(catalogItemsRepository.findActiveRoleByCode(anyString())).thenReturn(Optional.of(role("OPERARIO", 3L)));
        when(usersRepository.findActiveByEmail("nueva@pucp.edu.pe"))
                .thenReturn(Optional.of(existingUser(1L, "OPERARIO", true)));

        assertThatThrownBy(() -> service.create(createRequest()))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Email already registered");
    }

    @Test
    void createWithAnUnknownRoleFails() {
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(createRequest()))
                .isInstanceOf(BusinessRuleException.class);
    }

    @Test
    void createKeepsTheAccountWhenTheEmailFails() {
        when(catalogItemsRepository.findActiveRoleByCode(anyString())).thenReturn(Optional.of(role("OPERARIO", 3L)));
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(usersRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User saved = inv.getArgument(0);
            setId(saved, 48L);
            return saved;
        });
        when(credentialDeliveryService.deliver(any(), anyString())).thenReturn(false);

        UsersService.CreationResult result = service.create(createRequest());

        // El alta no se revierte: registrar a la persona no depende de que un
        // servicio externo este disponible (SPEC-100 §5.3).
        assertThat(result.delivered()).isFalse();
        assertThat(result.user().credentialStatus()).isEqualTo(CredentialStatus.PENDING_DELIVERY);
        verify(auditService).record(eq(AuditActionCode.USER_CREDENTIALS_DELIVERY_FAILED),
                anyString(), anyLong(), any());
    }

    @Test
    void createAuditsTheCreationWithoutThePassword() {
        when(catalogItemsRepository.findActiveRoleByCode(anyString())).thenReturn(Optional.of(role("OPERARIO", 3L)));
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(usersRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> {
            User saved = inv.getArgument(0);
            setId(saved, 48L);
            return saved;
        });
        when(credentialDeliveryService.deliver(any(), anyString())).thenReturn(true);

        service.create(createRequest());

        verify(auditService).record(eq(AuditActionCode.USER_CREATED), eq("User"), eq(48L),
                org.mockito.ArgumentMatchers.argThat(changes ->
                        !changes.toString().contains("ClaveValida123")
                                && !changes.toString().contains("hash")));
    }

    // ---------- update ----------

    @Test
    void updateChangesTheEditableFields() {
        User existing = existingUser(5L, "OPERARIO", true);
        when(usersRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO")).thenReturn(Optional.of(role("OPERARIO", 1L)));
        when(usersRepository.countByEmailExcluding(anyString(), eq(5L))).thenReturn(0L);
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.update(5L,
                new UpdateUserRequest("ana.nueva@pucp.edu.pe", "Ana María", "Torres", "OPERARIO"));

        assertThat(response.email()).isEqualTo("ana.nueva@pucp.edu.pe");
        assertThat(response.firstName()).isEqualTo("Ana María");
    }

    @Test
    void updateAuditsOnlyWhenTheRoleActuallyChanges() {
        User existing = existingUser(5L, "OPERARIO", true);
        when(usersRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO")).thenReturn(Optional.of(role("OPERARIO", 1L)));
        when(usersRepository.countByEmailExcluding(anyString(), anyLong())).thenReturn(0L);
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(5L, new UpdateUserRequest("ana@pucp.edu.pe", "Ana", "Torres", "OPERARIO"));

        verify(auditService, never()).record(eq(AuditActionCode.USER_ROLE_CHANGED), anyString(), anyLong(), any());
    }

    @Test
    void updateAuditsTheRoleChangeWithBeforeAndAfter() {
        User existing = existingUser(5L, "OPERARIO", true);
        when(usersRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(catalogItemsRepository.findActiveRoleByCode("COORDINADOR"))
                .thenReturn(Optional.of(role("COORDINADOR", 2L)));
        when(usersRepository.countByEmailExcluding(anyString(), anyLong())).thenReturn(0L);
        when(usersRepository.findOtherActiveAdminIdsForUpdate(anyLong())).thenReturn(List.of(99L));
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(5L, new UpdateUserRequest("ana@pucp.edu.pe", "Ana", "Torres", "COORDINADOR"));

        verify(auditService).record(eq(AuditActionCode.USER_ROLE_CHANGED), eq("User"), eq(5L),
                org.mockito.ArgumentMatchers.argThat(changes ->
                        changes.toString().contains("OPERARIO") && changes.toString().contains("COORDINADOR")));
    }

    @Test
    void updateRefusesToDemoteTheLastActiveAdmin() {
        User lastAdmin = existingUser(5L, "ADMIN", true);
        when(usersRepository.findById(5L)).thenReturn(Optional.of(lastAdmin));
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO")).thenReturn(Optional.of(role("OPERARIO", 3L)));
        when(usersRepository.countByEmailExcluding(anyString(), anyLong())).thenReturn(0L);
        when(usersRepository.findOtherActiveAdminIdsForUpdate(5L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.update(5L,
                new UpdateUserRequest("ana@pucp.edu.pe", "Ana", "Torres", "OPERARIO")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Cannot change the role of the last active administrator");
    }

    @Test
    void updateWithTheEmailOfAnotherLiveUserFails() {
        when(usersRepository.findById(5L)).thenReturn(Optional.of(existingUser(5L, "OPERARIO", true)));
        when(catalogItemsRepository.findActiveRoleByCode(anyString())).thenReturn(Optional.of(role("OPERARIO", 1L)));
        when(usersRepository.countByEmailExcluding("ocupado@pucp.edu.pe", 5L)).thenReturn(1L);

        assertThatThrownBy(() -> service.update(5L,
                new UpdateUserRequest("ocupado@pucp.edu.pe", "Ana", "Torres", "OPERARIO")))
                .isInstanceOf(DuplicateResourceException.class);
    }

    @Test
    void updateOnAMissingUserFails() {
        when(usersRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.update(404L,
                new UpdateUserRequest("x@pucp.edu.pe", "X", "Y", "OPERARIO")))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    // ---------- deactivate / reactivate ----------

    @Test
    void deactivateTurnsOffTheAccountAndRevokesEverySession() {
        User target = existingUser(7L, "OPERARIO", true);
        when(usersRepository.findById(7L)).thenReturn(Optional.of(target));
        when(usersRepository.findActiveByEmail("admin@pucp.edu.pe"))
                .thenReturn(Optional.of(existingUser(1L, "ADMIN", true)));
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.deactivate(7L, "admin@pucp.edu.pe");

        assertThat(response.isActive()).isFalse();
        // Sin revocar, la persona sigue dentro hasta 7 dias con su refresh token.
        verify(refreshTokenService).revokeAll(7L);
        verify(auditService).record(eq(AuditActionCode.USER_DEACTIVATED), eq("User"), eq(7L), any());
    }

    @Test
    void deactivateIsIdempotentAndDoesNotAuditANonChange() {
        User alreadyOff = existingUser(7L, "OPERARIO", false);
        when(usersRepository.findById(7L)).thenReturn(Optional.of(alreadyOff));
        when(usersRepository.findActiveByEmail(anyString()))
                .thenReturn(Optional.of(existingUser(1L, "ADMIN", true)));

        var response = service.deactivate(7L, "admin@pucp.edu.pe");

        assertThat(response.isActive()).isFalse();
        verify(auditService, never()).record(eq(AuditActionCode.USER_DEACTIVATED), anyString(), anyLong(), any());
    }

    @Test
    void anAdminCannotDeactivateThemselves() {
        User self = existingUser(1L, "ADMIN", true);
        when(usersRepository.findById(1L)).thenReturn(Optional.of(self));
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe")).thenReturn(Optional.of(self));

        assertThatThrownBy(() -> service.deactivate(1L, "ana@pucp.edu.pe"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("You cannot deactivate your own account");
    }

    @Test
    void theLastActiveAdminCannotBeDeactivated() {
        User lastAdmin = existingUser(7L, "ADMIN", true);
        when(usersRepository.findById(7L)).thenReturn(Optional.of(lastAdmin));
        when(usersRepository.findActiveByEmail("otro@pucp.edu.pe"))
                .thenReturn(Optional.of(existingUser(1L, "ADMIN", true)));
        when(usersRepository.findOtherActiveAdminIdsForUpdate(7L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.deactivate(7L, "otro@pucp.edu.pe"))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Cannot deactivate the last active administrator");
    }

    @Test
    void reactivateTurnsTheAccountBackOnWithoutRestoringSessions() {
        User off = existingUser(7L, "OPERARIO", false);
        when(usersRepository.findById(7L)).thenReturn(Optional.of(off));
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.reactivate(7L);

        assertThat(response.isActive()).isTrue();
        verify(refreshTokenService, never()).revokeAll(anyLong());
        verify(auditService).record(eq(AuditActionCode.USER_REACTIVATED), eq("User"), eq(7L), any());
    }

    // ---------- resend / mark delivered ----------

    @Test
    void resendCredentialsRegeneratesThePasswordAndRevokesSessions() {
        User target = existingUser(7L, "OPERARIO", true);
        when(usersRepository.findById(7L)).thenReturn(Optional.of(target));
        when(temporaryPasswordGenerator.generate()).thenReturn("TempGenerada9");
        when(passwordEncoder.encode("TempGenerada9")).thenReturn("$2a$10$otro");
        when(credentialDeliveryService.deliver(any(), eq("TempGenerada9"))).thenReturn(true);
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.resendCredentials(7L);

        assertThat(response.credentialStatus()).isEqualTo(CredentialStatus.DELIVERED);
        assertThat(target.getPasswordHash()).isEqualTo("$2a$10$otro");
        assertThat(target.isMustChangePassword()).isTrue();
        // Si se regenera por sospecha de robo, dejar sesiones vivas lo anularia.
        verify(refreshTokenService).revokeAll(7L);
    }

    @Test
    void resendCredentialsOnAnInactiveUserFails() {
        when(usersRepository.findById(7L)).thenReturn(Optional.of(existingUser(7L, "OPERARIO", false)));

        assertThatThrownBy(() -> service.resendCredentials(7L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Cannot send credentials to an inactive user");
    }

    @Test
    void markCredentialsDeliveredClearsThePendingFlag() {
        User pending = existingUser(7L, "OPERARIO", true);
        pending.setCredentialStatus(CredentialStatus.PENDING_DELIVERY);
        when(usersRepository.findById(7L)).thenReturn(Optional.of(pending));
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        var response = service.markCredentialsDelivered(7L);

        assertThat(response.credentialStatus()).isEqualTo(CredentialStatus.DELIVERED);
    }

    @Test
    void markCredentialsDeliveredOnSomeoneNotPendingFails() {
        when(usersRepository.findById(7L)).thenReturn(Optional.of(existingUser(7L, "OPERARIO", true)));

        assertThatThrownBy(() -> service.markCredentialsDelivered(7L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("User credentials are not pending delivery");
    }

    // ---------- changeOwnPassword ----------

    @Test
    void changeOwnPasswordClearsTheForcedFlagAndRevokesOtherSessions() {
        User self = existingUser(7L, "OPERARIO", true);
        self.setMustChangePassword(true);
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe")).thenReturn(Optional.of(self));
        when(passwordEncoder.matches("Actual123456", "$2a$10$hash")).thenReturn(true);
        when(passwordEncoder.matches("Nueva1234567", "$2a$10$hash")).thenReturn(false);
        when(passwordEncoder.encode("Nueva1234567")).thenReturn("$2a$10$nuevo");
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        service.changeOwnPassword("ana@pucp.edu.pe",
                new ChangePasswordRequest("Actual123456", "Nueva1234567"));

        assertThat(self.isMustChangePassword()).isFalse();
        assertThat(self.getPasswordHash()).isEqualTo("$2a$10$nuevo");
    }

    @Test
    void changeOwnPasswordWithTheWrongCurrentOneFails() {
        User self = existingUser(7L, "OPERARIO", true);
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe")).thenReturn(Optional.of(self));
        when(passwordEncoder.matches("Equivocada12", "$2a$10$hash")).thenReturn(false);

        assertThatThrownBy(() -> service.changeOwnPassword("ana@pucp.edu.pe",
                new ChangePasswordRequest("Equivocada12", "Nueva1234567")))
                .isInstanceOf(ValidationException.class)
                .hasMessage("Current password is incorrect");
    }

    @Test
    void changeOwnPasswordRejectsReusingTheSameOne() {
        User self = existingUser(7L, "OPERARIO", true);
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe")).thenReturn(Optional.of(self));
        when(passwordEncoder.matches("Actual123456", "$2a$10$hash")).thenReturn(true);

        assertThatThrownBy(() -> service.changeOwnPassword("ana@pucp.edu.pe",
                new ChangePasswordRequest("Actual123456", "Actual123456")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("New password must be different from the current one");
    }

    @Test
    void changeOwnPasswordValidatesTheNewOneAgainstThePolicy() {
        User self = existingUser(7L, "OPERARIO", true);
        when(usersRepository.findActiveByEmail("ana@pucp.edu.pe")).thenReturn(Optional.of(self));
        when(passwordEncoder.matches(eq("Actual123456"), anyString())).thenReturn(true);
        when(passwordEncoder.matches(eq("Nueva1234567"), anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        service.changeOwnPassword("ana@pucp.edu.pe",
                new ChangePasswordRequest("Actual123456", "Nueva1234567"));

        verify(passwordPolicy).validate(eq("Nueva1234567"), eq("ana@pucp.edu.pe"), eq("Ana"), eq("Torres"));
    }

    // ---------- findById, alcance ----------

    @Test
    void findByIdOutsideTheViewerScopeReportsNotFound() {
        // 404 y no 403: un 403 confirmaria que el id existe y permitiria enumerar
        // la plantilla iterando ids (SPEC-100 §9.2).
        when(scopeResolver.resolve("supervisor@pucp.edu.pe"))
                .thenReturn(new UserScopeResolver.Scope(false, List.of(3L, 4L)));
        when(usersRepository.findById(99L)).thenReturn(Optional.of(existingUser(99L, "OPERARIO", true)));

        assertThatThrownBy(() -> service.findById(99L, "supervisor@pucp.edu.pe"))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    void findByIdInsideTheScopeReturnsTheUser() {
        when(scopeResolver.resolve("supervisor@pucp.edu.pe"))
                .thenReturn(new UserScopeResolver.Scope(false, List.of(3L, 4L)));
        when(usersRepository.findById(4L)).thenReturn(Optional.of(existingUser(4L, "OPERARIO", true)));
        when(teamMembersRepository.findActiveTeamsOfUser(4L)).thenReturn(List.of());

        assertThat(service.findById(4L, "supervisor@pucp.edu.pe").id()).isEqualTo(4L);
    }

    @Test
    void anAdminCanSeeAnyUser() {
        when(scopeResolver.resolve("admin@pucp.edu.pe"))
                .thenReturn(new UserScopeResolver.Scope(true, List.of()));
        when(usersRepository.findById(99L)).thenReturn(Optional.of(existingUser(99L, "OPERARIO", true)));
        when(teamMembersRepository.findActiveTeamsOfUser(99L)).thenReturn(List.of());

        assertThat(service.findById(99L, "admin@pucp.edu.pe").id()).isEqualTo(99L);
    }
}
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=UsersServiceImplTest
```

Esperado: FALLA con `cannot find symbol: class UsersServiceImpl`.

- [ ] **Step 3: Crear el repositorio de catálogos que falta**

`modules/catalogs/repository/CatalogItemsRepository.java`:

```java
package pe.edu.pucp.hesperides.modules.catalogs.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;

import java.util.Optional;

public interface CatalogItemsRepository extends JpaRepository<CatalogItem, Long> {

    /**
     * Resuelve un rol por su code. Exige is_active porque un rol desactivado no
     * debe poder asignarse a nadie nuevo, aunque las cuentas que ya lo tengan lo
     * conserven (SPEC-003 §7.1).
     */
    @Query("SELECT ci FROM CatalogItem ci "
            + "WHERE ci.catalogType.code = 'ROLE' AND ci.code = :code "
            + "AND ci.active = TRUE AND ci.deletedAt IS NULL")
    Optional<CatalogItem> findActiveRoleByCode(@Param("code") String code);
}
```

- [ ] **Step 4: Crear el mapper**

`modules/users/service/UserMapper.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.users.dto.TeamSummaryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;
import pe.edu.pucp.hesperides.modules.users.entity.Team;

import java.util.List;

/**
 * Construye el DTO campo por campo, desde una lista explícita. Nunca por
 * reflexión ni con un mapper genérico: así añadir una columna sensible a la
 * entidad no la filtra automáticamente a la API (SPEC-001 §9.1).
 */
@Component
public class UserMapper {

    public UserDetailResponse toResponse(User user, List<Team> teams) {
        return new UserDetailResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getFullName(),
                new RoleResponse(user.getRoleItem().getId(), user.getRoleItem().getCode(),
                        user.getRoleItem().getLabel()),
                user.isActive(),
                user.getCredentialStatus(),
                user.isMustChangePassword(),
                user.getLastLogin(),
                teams.stream().map(t -> new TeamSummaryResponse(t.getId(), t.getName())).toList(),
                user.getCreatedAt(),
                user.getUpdatedAt());
    }
}
```

- [ ] **Step 5: Crear la interfaz del servicio**

`modules/users/service/UsersService.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CredentialDeliveryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;

public interface UsersService {

    Page<UserDetailResponse> findAll(String search, String roleCode, Boolean isActive, Long teamId,
                                     Pageable pageable, String viewerEmail);

    UserDetailResponse findById(Long id, String viewerEmail);

    CreationResult create(CreateUserRequest request);

    UserDetailResponse update(Long id, UpdateUserRequest request);

    UserDetailResponse deactivate(Long id, String actorEmail);

    UserDetailResponse reactivate(Long id);

    CredentialDeliveryResponse resendCredentials(Long id);

    UserDetailResponse markCredentialsDelivered(Long id);

    void changeOwnPassword(String email, ChangePasswordRequest request);

    /**
     * El alta devuelve dos cosas: la cuenta creada y si el correo salió. El
     * controller las necesita separadas porque el `message` de la respuesta
     * cambia según la entrega, aunque el código HTTP siga siendo 201.
     */
    record CreationResult(UserDetailResponse user, boolean delivered) {
    }
}
```

- [ ] **Step 6: Implementar UsersServiceImpl**

El archivo pasa de 150 líneas si todo va en una clase, así que las reglas que protegen al sistema van en un componente propio. Primero ese:

`modules/users/service/AdminProtectionRules.java`:

```java
package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.security.RoleCodes;

/**
 * Las dos reglas que impiden que el sistema quede inutilizable. No están en
 * UsersServiceImpl para no mezclar orquestación con invariantes de seguridad, y
 * porque ambas se comprueban desde dos operaciones distintas (deactivate y
 * update).
 */
@Component
@RequiredArgsConstructor
public class AdminProtectionRules {

    private final UsersRepository usersRepository;

    /**
     * Sin esta regla, el único administrador puede dejarse fuera con un clic y la
     * recuperación exige un UPDATE manual en la base de datos.
     */
    public void refuseSelfDeactivation(User target, User actor) {
        if (target.getId().equals(actor.getId())) {
            throw new BusinessRuleException("You cannot deactivate your own account");
        }
    }

    /**
     * El conteo toma bloqueo pesimista: dos administradores desactivándose en el
     * mismo instante leerían ambos "hay otro" y el sistema quedaría sin ninguno
     * (SPEC-100 §5.6).
     */
    public void refuseRemovingLastAdmin(User target, String message) {
        if (!RoleCodes.ADMIN.equals(target.getRoleCode())) {
            return;
        }
        if (usersRepository.findOtherActiveAdminIdsForUpdate(target.getId()).isEmpty()) {
            throw new BusinessRuleException(message);
        }
    }
}
```

Y el servicio. Nota para el implementador: **este archivo es el que más cerca queda del límite de 150 líneas.** Si al escribirlo se pasa, extraer el bloque de `create` a un `UserCreationFlow` propio antes de superar el límite — no reducir comentarios para que quepa.

```java
package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.auth.service.RefreshTokenService;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CredentialDeliveryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;
import pe.edu.pucp.hesperides.modules.users.repository.TeamMembersRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.time.Instant;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UsersServiceImpl implements UsersService {

    private static final String NOT_FOUND = "User not found";
    private static final String ENTITY = "User";

    private final UsersRepository usersRepository;
    private final CatalogItemsRepository catalogItemsRepository;
    private final TeamMembersRepository teamMembersRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final TemporaryPasswordGenerator temporaryPasswordGenerator;
    private final CredentialDeliveryService credentialDeliveryService;
    private final RefreshTokenService refreshTokenService;
    private final AuditService auditService;
    private final UserScopeResolver scopeResolver;
    private final AdminProtectionRules adminRules;
    private final UserMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public Page<UserDetailResponse> findAll(String search, String roleCode, Boolean isActive,
                                            Long teamId, Pageable pageable, String viewerEmail) {
        UserScopeResolver.Scope scope = scopeResolver.resolve(viewerEmail);
        var spec = UserSpecifications.withFilters(search, roleCode, isActive, teamId,
                scope.seesEveryone() ? null : scope.visibleUserIds());

        return usersRepository.findAll(spec, pageable).map(this::withTeams);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetailResponse findById(Long id, String viewerEmail) {
        UserScopeResolver.Scope scope = scopeResolver.resolve(viewerEmail);
        User user = usersRepository.findById(id)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));

        // 404 y no 403: un 403 confirmaria que el id existe y permitiria enumerar
        // la plantilla iterando ids (SPEC-100 §9.2).
        if (!scope.seesEveryone() && !scope.visibleUserIds().contains(id)) {
            throw new ResourceNotFoundException(NOT_FOUND);
        }
        return withTeams(user);
    }

    @Override
    @Transactional
    public CreationResult create(CreateUserRequest request) {
        String email = normalize(request.email());
        CatalogItem role = resolveRole(request.roleCode());
        passwordPolicy.validate(request.initialPassword(), email, request.firstName(), request.lastName());

        if (usersRepository.findActiveByEmail(email).isPresent()) {
            throw new DuplicateResourceException("Email already registered");
        }

        User user = new User();
        user.setEmail(email);
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setRoleItem(role);
        user.setPasswordHash(passwordEncoder.encode(request.initialPassword()));
        user.setActive(true);
        // La clave que el administrador eligio deja de valer en cuanto la persona
        // entra una vez (SPEC-100 §2.6).
        user.setMustChangePassword(true);
        user.setCredentialStatus(CredentialStatus.PENDING_DELIVERY);
        User saved = usersRepository.saveAndFlush(user);

        auditService.record(AuditActionCode.USER_CREATED, ENTITY, saved.getId(),
                Map.of("email", email, "roleCode", role.getCode()));

        boolean delivered = sendCredentials(saved, request.initialPassword());
        return new CreationResult(withTeams(saved), delivered);
    }

    @Override
    @Transactional
    public UserDetailResponse update(Long id, UpdateUserRequest request) {
        User user = requireLiveUser(id);
        String email = normalize(request.email());
        CatalogItem newRole = resolveRole(request.roleCode());

        if (usersRepository.countByEmailExcluding(email, id) > 0) {
            throw new DuplicateResourceException("Email already registered");
        }

        String previousRole = user.getRoleCode();
        boolean roleChanges = !previousRole.equals(newRole.getCode());
        if (roleChanges) {
            adminRules.refuseRemovingLastAdmin(user,
                    "Cannot change the role of the last active administrator");
        }

        user.setEmail(email);
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setRoleItem(newRole);
        usersRepository.save(user);

        if (roleChanges) {
            auditService.record(AuditActionCode.USER_ROLE_CHANGED, ENTITY, id,
                    Map.of("roleCode", Map.of("before", previousRole, "after", newRole.getCode())));
        }
        return withTeams(user);
    }

    @Override
    @Transactional
    public UserDetailResponse deactivate(Long id, String actorEmail) {
        User target = requireLiveUser(id);
        User actor = usersRepository.findActiveByEmail(normalize(actorEmail))
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));

        adminRules.refuseSelfDeactivation(target, actor);

        // Idempotente: desactivar a quien ya lo esta no falla ni vuelve a auditar
        // un cambio que no ocurrio (SPEC-100 §5.5).
        if (!target.isActive()) {
            return withTeams(target);
        }

        adminRules.refuseRemovingLastAdmin(target, "Cannot deactivate the last active administrator");

        target.setActive(false);
        usersRepository.save(target);
        // Sin revocar, la persona sigue dentro hasta 7 dias con su refresh token.
        refreshTokenService.revokeAll(id);

        auditService.record(AuditActionCode.USER_DEACTIVATED, ENTITY, id,
                Map.of("isActive", Map.of("before", true, "after", false)));
        return withTeams(target);
    }

    @Override
    @Transactional
    public UserDetailResponse reactivate(Long id) {
        User target = requireLiveUser(id);
        if (target.isActive()) {
            return withTeams(target);
        }

        target.setActive(true);
        usersRepository.save(target);
        auditService.record(AuditActionCode.USER_REACTIVATED, ENTITY, id,
                Map.of("isActive", Map.of("before", false, "after", true)));
        return withTeams(target);
    }

    @Override
    @Transactional
    public CredentialDeliveryResponse resendCredentials(Long id) {
        User target = requireLiveUser(id);
        if (!target.isActive()) {
            throw new BusinessRuleException("Cannot send credentials to an inactive user");
        }

        String temporary = temporaryPasswordGenerator.generate();
        target.setPasswordHash(passwordEncoder.encode(temporary));
        target.setMustChangePassword(true);
        // Si se regenera por sospecha de robo, dejar sesiones vivas lo anularia.
        refreshTokenService.revokeAll(id);

        boolean delivered = sendCredentials(target, temporary);
        return new CredentialDeliveryResponse(id, target.getEmail(), target.getCredentialStatus());
    }

    @Override
    @Transactional
    public UserDetailResponse markCredentialsDelivered(Long id) {
        User target = requireLiveUser(id);
        if (target.getCredentialStatus() != CredentialStatus.PENDING_DELIVERY) {
            throw new BusinessRuleException("User credentials are not pending delivery");
        }

        target.setCredentialStatus(CredentialStatus.DELIVERED);
        usersRepository.save(target);
        return withTeams(target);
    }

    @Override
    @Transactional
    public void changeOwnPassword(String email, ChangePasswordRequest request) {
        User user = usersRepository.findActiveByEmail(normalize(email))
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));

        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ValidationException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException("New password must be different from the current one");
        }
        passwordPolicy.validate(request.newPassword(), user.getEmail(),
                user.getFirstName(), user.getLastName());

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        usersRepository.save(user);
    }

    /**
     * Envía el correo y refleja el resultado en la cuenta. El envío ocurre después
     * de persistir y su fallo no revierte nada: registrar a una persona no puede
     * depender de que un servicio externo esté disponible (SPEC-100 §5.3).
     */
    private boolean sendCredentials(User user, String rawPassword) {
        boolean delivered = credentialDeliveryService.deliver(user, rawPassword);

        user.setCredentialStatus(delivered ? CredentialStatus.DELIVERED : CredentialStatus.PENDING_DELIVERY);
        if (delivered) {
            user.setCredentialsSentAt(Instant.now());
        } else {
            auditService.record(AuditActionCode.USER_CREDENTIALS_DELIVERY_FAILED, ENTITY, user.getId(),
                    Map.of("email", user.getEmail()));
        }
        usersRepository.save(user);
        return delivered;
    }

    private User requireLiveUser(Long id) {
        return usersRepository.findById(id)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));
    }

    private CatalogItem resolveRole(String roleCode) {
        return catalogItemsRepository.findActiveRoleByCode(roleCode)
                .orElseThrow(() -> new BusinessRuleException(
                        "Role '" + roleCode + "' does not exist or is not active"));
    }

    private UserDetailResponse withTeams(User user) {
        return mapper.toResponse(user, teamMembersRepository.findActiveTeamsOfUser(user.getId()));
    }

    /**
     * "Juan@PUCP.edu.pe " y "juan@pucp.edu.pe" son la misma cuenta. Sin
     * normalizar, el índice único las admitiría como dos y el login fallaría de
     * forma inexplicable (SPEC-100 §5.5).
     */
    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
```

El orden de los 12 parámetros del constructor es exactamente el que el `setUp()` del Step 1 usa: `usersRepository`, `catalogItemsRepository`, `teamMembersRepository`, `passwordEncoder`, `passwordPolicy`, `temporaryPasswordGenerator`, `credentialDeliveryService`, `refreshTokenService`, `auditService`, `scopeResolver`, `adminRules`, `mapper`. Lombok genera el constructor en el orden de declaración de los campos, así que **declararlos en ese mismo orden** o el test no compilará.

- [ ] **Step 7: Ejecutar y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=UsersServiceImplTest
```

Esperado: `Tests run: 25, Failures: 0`.

- [ ] **Step 8: Verificar el límite de tamaño**

```bash
wc -l backend/src/main/java/pe/edu/pucp/hesperides/modules/users/service/UsersServiceImpl.java
```

Si pasa de 150, extraer el método `create` y sus auxiliares a `UserCreationFlow` antes de commitear. No recortar comentarios para que quepa: el comentario que explica por qué el envío va fuera de la transacción vale más que la línea que ahorra.

- [ ] **Step 9: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/modules/ \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/users/service/UsersServiceImplTest.java
git commit -m "feat(users): agrega UsersService con las reglas que protegen al sistema

Dos reglas impiden que el sistema quede inutilizable: nadie se desactiva a si
mismo, y el ultimo administrador activo no puede desactivarse ni degradarse de
rol. El conteo toma bloqueo pesimista porque sin el, dos admins actuando a la
vez dejarian el sistema sin ninguno.

El envio del correo ocurre despues de persistir y su fallo no revierte el alta:
registrar a una persona no puede depender de que un SMTP este disponible. La
cuenta queda PENDING_DELIVERY y se audita el fallo.

findById devuelve 404 y no 403 cuando el usuario esta fuera del alcance de quien
consulta: un 403 confirmaria que el id existe y permitiria enumerar la plantilla
iterando ids.

Desactivar y reactivar son idempotentes y no auditan un no-cambio: una bitacora
llena de filas cuyo before y after son iguales no sirve de bitacora.

El correo se normaliza a minusculas y sin espacios antes de comprobar unicidad:
sin eso el indice unico admitiria dos cuentas que son la misma persona.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: UsersController — los nueve endpoints

**Files:**
- Create: `modules/users/controller/UsersController.java`
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/users/controller/UsersControllerTest.java`

**Interfaces:**
- Consumes: `UsersService` y sus DTOs (Tasks 5 y 6); `RoleCodes`, `ApiResponse`
- Produces: los nueve endpoints bajo `/api/v1/users`

**Autorización, del Anexo A de SPEC-001:**

| Endpoint | Quién |
|---|---|
| `GET /users`, `GET /users/{id}` | ADMIN, COORDINADOR, SUPERVISOR (el alcance lo acota el servicio) |
| `POST`, `PUT`, `deactivate`, `reactivate`, `resend-credentials`, `mark-credentials-delivered` | solo ADMIN |
| `POST /users/me/password` | cualquiera autenticado |

**Nota sobre el límite de 100 líneas:** nueve endpoints con sus anotaciones no caben si cada uno lleva lógica. El controller solo parsea, delega y envuelve: ninguna regla de negocio entra aquí. Si al escribirlo pasa de 100, el problema es que algo de negocio se colό dentro.

- [ ] **Step 1: Escribir el test que falla**

`UsersControllerTest.java`:

```java
package pe.edu.pucp.hesperides.modules.users.controller;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import pe.edu.pucp.hesperides.modules.auth.dto.RoleResponse;
import pe.edu.pucp.hesperides.modules.users.dto.CredentialDeliveryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;
import pe.edu.pucp.hesperides.modules.users.service.UsersService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.GlobalExceptionHandler;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.security.CustomUserDetailsService;
import pe.edu.pucp.hesperides.shared.security.JwtTokenProvider;
import pe.edu.pucp.hesperides.shared.security.RestAccessDeniedHandler;
import pe.edu.pucp.hesperides.shared.security.RestAuthenticationEntryPoint;
import pe.edu.pucp.hesperides.shared.security.SecurityConfig;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Import({SecurityConfig.class, RestAuthenticationEntryPoint.class, RestAccessDeniedHandler.class,
        GlobalExceptionHandler.class, pe.edu.pucp.hesperides.shared.security.CorsConfig.class})
@WebMvcTest(UsersController.class)
class UsersControllerTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @MockitoBean private UsersService usersService;
    @MockitoBean private JwtTokenProvider jwtTokenProvider;
    @MockitoBean private CustomUserDetailsService customUserDetailsService;

    private UserDetailResponse sampleUser() {
        return new UserDetailResponse(48L, "mgarcia@pucp.edu.pe", "María", "García", "María García",
                new RoleResponse(2L, "COORDINADOR", "Coordinador"), true,
                CredentialStatus.DELIVERED, true, null, List.of(), null, null);
    }

    private String createBody() {
        return """
                {"email":"mgarcia@pucp.edu.pe","firstName":"María","lastName":"García",
                 "roleCode":"COORDINADOR","initialPassword":"ClaveValida123"}
                """;
    }

    // ---------- autorizacion ----------

    @Test
    void listingWithoutATokenIs401() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired token"));
    }

    @Test
    @WithMockUser(username = "operario@pucp.edu.pe", authorities = "OPERARIO")
    void anOperarioCannotListUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Insufficient permissions for this action"));
    }

    @Test
    @WithMockUser(username = "supervisor@pucp.edu.pe", authorities = "SUPERVISOR")
    void aSupervisorCanListUsers() throws Exception {
        when(usersService.findAll(any(), any(), any(), any(), any(), anyString()))
                .thenReturn(new PageImpl<>(List.of(sampleUser())));

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].email").value("mgarcia@pucp.edu.pe"));
    }

    @Test
    @WithMockUser(username = "coordinador@pucp.edu.pe", authorities = "COORDINADOR")
    void aCoordinadorCannotCreateUsers() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody()))
                .andExpect(status().isForbidden());
    }

    // ---------- create ----------

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void createReturns201WithLocationAndTheCreatedUser() throws Exception {
        when(usersService.create(any())).thenReturn(new UsersService.CreationResult(sampleUser(), true));

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody()))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/v1/users/48"))
                .andExpect(jsonPath("$.message").value("User created successfully"))
                .andExpect(jsonPath("$.data.id").value(48));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void createStillReturns201WhenTheEmailFailedButSaysSo() throws Exception {
        // El frontend distingue los dos casos por credentialStatus, no por el
        // mensaje, pero el mensaje tampoco debe mentir (SPEC-100 §3).
        UserDetailResponse pending = new UserDetailResponse(48L, "mgarcia@pucp.edu.pe", "María", "García",
                "María García", new RoleResponse(2L, "COORDINADOR", "Coordinador"), true,
                CredentialStatus.PENDING_DELIVERY, true, null, List.of(), null, null);
        when(usersService.create(any())).thenReturn(new UsersService.CreationResult(pending, false));

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value("User created, but credential delivery failed"))
                .andExpect(jsonPath("$.data.credentialStatus").value("PENDING_DELIVERY"));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void createWithAMalformedEmailIs400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"no-es-correo","firstName":"M","lastName":"G",
                                 "roleCode":"COORDINADOR","initialPassword":"ClaveValida123"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.data.errors[0].field").value("email"));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void createWithAnInactiveRoleIs422() throws Exception {
        when(usersService.create(any()))
                .thenThrow(new BusinessRuleException("Role 'INVENTADO' does not exist or is not active"));

        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody()))
                .andExpect(status().isUnprocessableEntity());
    }

    // ---------- update y acciones ----------

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void updateReturns200WithTheUpdatedUser() throws Exception {
        when(usersService.update(anyLong(), any())).thenReturn(sampleUser());

        mockMvc.perform(put("/api/v1/users/48")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"mgarcia@pucp.edu.pe","firstName":"María",
                                 "lastName":"García","roleCode":"COORDINADOR"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(48));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void deactivateReturns200WithTheResourceNot204() throws Exception {
        // SPEC-C03 §8: una accion de negocio devuelve 200 con el recurso en su
        // nuevo estado, no 204, para que el cliente no tenga que volver a pedirlo.
        when(usersService.deactivate(anyLong(), anyString())).thenReturn(sampleUser());

        mockMvc.perform(post("/api/v1/users/48/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(48));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void deactivatingYourselfIs422() throws Exception {
        when(usersService.deactivate(anyLong(), anyString()))
                .thenThrow(new BusinessRuleException("You cannot deactivate your own account"));

        mockMvc.perform(post("/api/v1/users/1/deactivate"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("You cannot deactivate your own account"));
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void reactivateReturns200() throws Exception {
        when(usersService.reactivate(anyLong())).thenReturn(sampleUser());

        mockMvc.perform(post("/api/v1/users/48/reactivate"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void resendCredentialsReturnsTheDeliveryStatusAndNeverThePassword() throws Exception {
        when(usersService.resendCredentials(anyLong()))
                .thenReturn(new CredentialDeliveryResponse(48L, "mgarcia@pucp.edu.pe",
                        CredentialStatus.DELIVERED));

        mockMvc.perform(post("/api/v1/users/48/resend-credentials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.credentialStatus").value("DELIVERED"))
                .andExpect(jsonPath("$.data.password").doesNotExist())
                .andExpect(jsonPath("$.data.temporaryPassword").doesNotExist());
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void markCredentialsDeliveredReturns200() throws Exception {
        when(usersService.markCredentialsDelivered(anyLong())).thenReturn(sampleUser());

        mockMvc.perform(post("/api/v1/users/48/mark-credentials-delivered"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void aMissingUserIs404() throws Exception {
        when(usersService.findById(anyLong(), anyString()))
                .thenThrow(new ResourceNotFoundException("User not found"));

        mockMvc.perform(get("/api/v1/users/404"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("User not found"));
    }

    // ---------- cambio de contrasena propia ----------

    @Test
    @WithMockUser(username = "ana@pucp.edu.pe", authorities = "OPERARIO")
    void anyAuthenticatedUserCanChangeTheirOwnPassword() throws Exception {
        mockMvc.perform(post("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"Actual123456","newPassword":"Nueva1234567"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated successfully"));
    }

    @Test
    void changingYourPasswordWithoutATokenIs401() throws Exception {
        mockMvc.perform(post("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"Actual123456","newPassword":"Nueva1234567"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(username = "ana@pucp.edu.pe", authorities = "OPERARIO")
    void theListingPassesEveryFilterThroughToTheService() throws Exception {
        when(usersService.findAll(any(), any(), any(), any(), any(), anyString()))
                .thenReturn(new PageImpl<>(List.of()));

        // Un OPERARIO no puede listar, asi que este test usa /users/me/password
        // para no chocar con la autorizacion: los filtros se verifican en el
        // test de integracion de la Task 9, contra la base real.
        mockMvc.perform(post("/api/v1/users/me/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"Actual123456","newPassword":"Nueva1234567"}
                                """))
                .andExpect(status().isOk());
    }
}
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=UsersControllerTest
```

Esperado: FALLA con `cannot find symbol: class UsersController`.

- [ ] **Step 3: Implementar el controller**

`modules/users/controller/UsersController.java`:

```java
package pe.edu.pucp.hesperides.modules.users.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CredentialDeliveryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;
import pe.edu.pucp.hesperides.modules.users.service.UsersService;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;

import java.net.URI;

/**
 * Parsea, delega y envuelve. Ninguna regla de negocio vive aquí: las reglas del
 * último ADMIN, la normalización del correo y la orquestación del envío están en
 * UsersServiceImpl.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/v1/users")
public class UsersController {

    private static final String READERS = "hasAnyAuthority('ADMIN', 'COORDINADOR', 'SUPERVISOR')";
    private static final String ADMIN_ONLY = "hasAuthority('ADMIN')";

    private final UsersService usersService;

    @GetMapping
    @PreAuthorize(READERS)
    public ResponseEntity<ApiResponse<Page<UserDetailResponse>>> getAll(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String roleCode,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) Long teamId,
            // Orden por apellido y no por createdAt: este listado se usa para
            // buscar a una persona concreta (SPEC-100 §3).
            @PageableDefault(size = 20, sort = "lastName", direction = Sort.Direction.ASC) Pageable pageable,
            @AuthenticationPrincipal UserDetails principal) {

        Page<UserDetailResponse> page = usersService.findAll(
                search, roleCode, isActive, teamId, pageable, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("Users retrieved successfully", page));
    }

    @GetMapping("/{id}")
    // Solo exige estar autenticado: el alcance real lo aplica el servicio vía
    // UserScopeResolver. Un OPERARIO tiene su propio id en visibleUserIds y ve
    // su ficha, pero recibe 404 en la de cualquier otro. No se puede expresar
    // aquí porque UserDetails conoce el correo, no el id.
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<UserDetailResponse>> getById(
            @PathVariable Long id, @AuthenticationPrincipal UserDetails principal) {

        UserDetailResponse user = usersService.findById(id, principal.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("User retrieved successfully", user));
    }

    @PostMapping
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<UserDetailResponse>> create(
            @Valid @RequestBody CreateUserRequest request) {

        UsersService.CreationResult result = usersService.create(request);
        String message = result.delivered()
                ? "User created successfully"
                : "User created, but credential delivery failed";

        return ResponseEntity.created(URI.create("/api/v1/users/" + result.user().id()))
                .body(ApiResponse.ok(message, result.user()));
    }

    @PutMapping("/{id}")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<UserDetailResponse>> update(
            @PathVariable Long id, @Valid @RequestBody UpdateUserRequest request) {

        return ResponseEntity.ok(
                ApiResponse.ok("User updated successfully", usersService.update(id, request)));
    }

    @PostMapping("/{id}/deactivate")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<UserDetailResponse>> deactivate(
            @PathVariable Long id, @AuthenticationPrincipal UserDetails principal) {

        return ResponseEntity.ok(ApiResponse.ok("User deactivated successfully",
                usersService.deactivate(id, principal.getUsername())));
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<UserDetailResponse>> reactivate(@PathVariable Long id) {
        return ResponseEntity.ok(
                ApiResponse.ok("User reactivated successfully", usersService.reactivate(id)));
    }

    @PostMapping("/{id}/resend-credentials")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<CredentialDeliveryResponse>> resendCredentials(
            @PathVariable Long id) {

        CredentialDeliveryResponse result = usersService.resendCredentials(id);
        String message = result.credentialStatus() == pe.edu.pucp.hesperides.modules.users.entity
                .CredentialStatus.DELIVERED
                ? "Credentials sent successfully"
                : "Credential delivery failed";

        return ResponseEntity.ok(ApiResponse.ok(message, result));
    }

    @PostMapping("/{id}/mark-credentials-delivered")
    @PreAuthorize(ADMIN_ONLY)
    public ResponseEntity<ApiResponse<UserDetailResponse>> markCredentialsDelivered(
            @PathVariable Long id) {

        return ResponseEntity.ok(ApiResponse.ok("Credentials marked as delivered",
                usersService.markCredentialsDelivered(id)));
    }

    @PostMapping("/me/password")
    public ResponseEntity<ApiResponse<Void>> changeOwnPassword(
            @Valid @RequestBody ChangePasswordRequest request,
            @AuthenticationPrincipal UserDetails principal) {

        usersService.changeOwnPassword(principal.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.ok("Password updated successfully", null));
    }
}
```

**Sobre el `import` de `CredentialStatus` en `resendCredentials`:** el código usa el nombre totalmente cualificado para no añadir un import que solo se usa una vez en una comparación. Si se prefiere legibilidad, añadir `import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;` y dejar la condición como `result.credentialStatus() == CredentialStatus.DELIVERED`. Cualquiera de las dos formas compila; la segunda se lee mejor.

- [ ] **Step 4: Ejecutar y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=UsersControllerTest
```

Esperado: `Tests run: 18, Failures: 0`.

- [ ] **Step 5: Verificar el tamaño del controller**

```bash
wc -l backend/src/main/java/pe/edu/pucp/hesperides/modules/users/controller/UsersController.java
```

Si pasa de 100 líneas, **no** es motivo para recortar: nueve endpoints con sus anotaciones y firmas multilinea ocupan eso legítimamente. Anotar la excepción en el commit y seguir; el límite existe para evitar lógica escondida, y aquí no hay ninguna.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/modules/users/controller/ \
        backend/src/test/java/pe/edu/pucp/hesperides/modules/users/controller/
git commit -m "feat(users): expone los nueve endpoints de gestion de usuarios

El controller parsea, delega y envuelve: ninguna regla de negocio vive aqui.

La autorizacion sale del Anexo A de SPEC-001 sin reinterpretarla: CUD solo
ADMIN, lectura tambien COORDINADOR y SUPERVISOR, y el cambio de contrasena
propia cualquiera autenticado.

getById solo exige estar autenticado porque el alcance real lo aplica el
servicio: un OPERARIO tiene su propio id en visibleUserIds y ve su ficha, pero
no la de nadie mas. No se puede expresar en @PreAuthorize porque UserDetails
conoce el correo, no el id.

deactivate y reactivate devuelven 200 con el recurso en su nuevo estado y no
204, segun SPEC-C03 §8: asi el cliente no tiene que volver a pedirlo.

El orden por defecto del listado es apellido ascendente, no createdAt: este
listado se usa para buscar a una persona concreta.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Bloqueo por cambio de contraseña pendiente

**Files:**
- Create: `shared/security/PasswordChangeRequiredFilter.java`
- Modify: `shared/security/SecurityConfig.java` (registrar el filtro)
- Modify: `modules/auth/dto/UserResponse.java` (campo `mustChangePassword`)
- Modify: `modules/auth/service/AuthServiceImpl.java` (poblar el campo)
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/shared/security/PasswordChangeRequiredFilterTest.java`

**Interfaces:**
- Consumes: `UsersRepository` (SPEC-001), `ApiResponse`, `ObjectMapper`
- Produces: un filtro que responde 403 a cualquier endpoint bajo `/api/v1/**` cuando el usuario autenticado tiene `must_change_password = TRUE`, salvo la lista corta de excepciones

**Lo que resuelve:** sin este filtro, `must_change_password` sería una sugerencia. Cualquiera con la contraseña temporal y `curl` operaría el sistema entero sin cambiarla, y el campo no serviría de nada (SPEC-100 §5.2).

**La lista de excepciones es cerrada:** `POST /api/v1/users/me/password`, `GET /api/v1/auth/me`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout`. Ni siquiera la propia ficha (`GET /users/{id}`) entra: lo que la pantalla de cambio necesita saber del usuario ya viene en `/auth/me`.

**Por qué un filtro y no un interceptor de MVC:** el filtro corre antes de que Spring MVC resuelva el handler, así que no depende de que el endpoint exista ni de su mapeo. Un interceptor se saltaría en rutas que resuelven a un 404 y dejaría un hueco.

- [ ] **Step 1: Escribir el test que falla**

`PasswordChangeRequiredFilterTest.java`:

```java
package pe.edu.pucp.hesperides.shared.security;

import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class PasswordChangeRequiredFilterTest {

    @Mock private UsersRepository usersRepository;
    @Mock private FilterChain filterChain;

    private PasswordChangeRequiredFilter filter;

    @BeforeEach
    void setUp() {
        filter = new PasswordChangeRequiredFilter(usersRepository, new ObjectMapper());
        SecurityContextHolder.clearContext();
    }

    private void authenticate(String email) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(email, null, List.of()));
    }

    private void withUser(String email, boolean mustChange) {
        User user = new User();
        user.setEmail(email);
        user.setMustChangePassword(mustChange);
        when(usersRepository.findActiveByEmail(email)).thenReturn(Optional.of(user));
    }

    private MockHttpServletResponse run(String method, String uri) throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest(method, uri);
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, filterChain);
        return response;
    }

    @Test
    void blocksABusinessEndpointWhenTheChangeIsPending() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        MockHttpServletResponse response = run("GET", "/api/v1/users");

        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Password change required");
        // La peticion no llega al controller.
        verify(filterChain, never()).doFilter(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void letsThroughTheEndpointThatChangesThePassword() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        MockHttpServletResponse response = run("POST", "/api/v1/users/me/password");

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain).doFilter(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void letsThroughAuthMeBecauseTheChangeScreenNeedsIt() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        assertThat(run("GET", "/api/v1/auth/me").getStatus()).isEqualTo(200);
    }

    @Test
    void letsThroughRefreshAndLogout() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        assertThat(run("POST", "/api/v1/auth/refresh").getStatus()).isEqualTo(200);
        assertThat(run("POST", "/api/v1/auth/logout").getStatus()).isEqualTo(200);
    }

    @Test
    void blocksEvenTheOwnUserDetailEndpoint() throws Exception {
        // La lista de excepciones es cerrada: lo que la pantalla de cambio
        // necesita del usuario ya viene en /auth/me (SPEC-100 §5.2).
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        assertThat(run("GET", "/api/v1/users/7").getStatus()).isEqualTo(403);
    }

    @Test
    void doesNotInterfereWhenNoChangeIsPending() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", false);

        assertThat(run("GET", "/api/v1/users").getStatus()).isEqualTo(200);
        verify(filterChain).doFilter(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void doesNotInterfereWithAnonymousRequests() throws Exception {
        // Sin autenticacion no hay nada que comprobar: de eso se encarga la
        // cadena de seguridad, que respondera 401 si la ruta lo exige.
        MockHttpServletResponse response = run("POST", "/api/v1/auth/login");

        assertThat(response.getStatus()).isEqualTo(200);
        verify(filterChain).doFilter(org.mockito.ArgumentMatchers.any(),
                org.mockito.ArgumentMatchers.any());
    }

    @Test
    void doesNotInterfereOutsideTheApiPrefix() throws Exception {
        authenticate("ana@pucp.edu.pe");
        withUser("ana@pucp.edu.pe", true);

        assertThat(run("GET", "/actuator/health").getStatus()).isEqualTo(200);
    }
}
```

- [ ] **Step 2: Ejecutar y verificar que falla**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=PasswordChangeRequiredFilterTest
```

Esperado: FALLA con `cannot find symbol: class PasswordChangeRequiredFilter`.

- [ ] **Step 3: Implementar el filtro**

`shared/security/PasswordChangeRequiredFilter.java`:

```java
package pe.edu.pucp.hesperides.shared.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.shared.exception.ApiResponse;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Set;

/**
 * Impide operar el sistema con una contraseña temporal sin cambiarla.
 *
 * Sin esto, must_change_password sería una sugerencia: cualquiera con la clave
 * que viajó por correo y curl usaría la API entera, y la bandera no protegería
 * nada (SPEC-100 §5.2).
 *
 * Es un filtro y no un interceptor de MVC a propósito: corre antes de que Spring
 * resuelva el handler, así que cubre también las rutas que acabarían en 404 y no
 * deja huecos.
 */
@Component
@RequiredArgsConstructor
public class PasswordChangeRequiredFilter extends OncePerRequestFilter {

    private static final String API_PREFIX = "/api/v1/";

    /**
     * Lista cerrada. Cada excepción es una vía por la que alguien opera con una
     * credencial que dos personas conocen, así que añadir una exige justificarla
     * en SPEC-100 §5.2.
     */
    private static final Set<String> ALLOWED = Set.of(
            "POST /api/v1/users/me/password",
            "GET /api/v1/auth/me",
            "POST /api/v1/auth/refresh",
            "POST /api/v1/auth/logout");

    private final UsersRepository usersRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (shouldBlock(request)) {
            response.setStatus(HttpStatus.FORBIDDEN.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(),
                    ApiResponse.error("Password change required before using the system"));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean shouldBlock(HttpServletRequest request) {
        String uri = request.getRequestURI();
        if (!uri.startsWith(API_PREFIX)) {
            return false;
        }
        if (ALLOWED.contains(request.getMethod() + " " + uri)) {
            return false;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            // Sin sesión no hay nada que comprobar: la cadena de seguridad
            // responderá 401 si la ruta lo exige.
            return false;
        }

        return usersRepository.findActiveByEmail(authentication.getName())
                .map(user -> user.isMustChangePassword())
                .orElse(false);
    }
}
```

- [ ] **Step 4: Registrar el filtro en la cadena**

En `shared/security/SecurityConfig.java`, inyectar el filtro nuevo y añadirlo **después** del de JWT: necesita que el `SecurityContextHolder` ya esté poblado para saber quién consulta.

Añadir al bloque de campos:

```java
    private final PasswordChangeRequiredFilter passwordChangeRequiredFilter;
```

y en la cadena, tras el `addFilterBefore` existente:

```java
                .addFilterAfter(passwordChangeRequiredFilter, JwtAuthenticationFilter.class)
```

- [ ] **Step 5: Añadir el campo a la respuesta de /auth/me**

En `modules/auth/dto/UserResponse.java`, añadir el campo al final del record:

```java
        boolean mustChangePassword) {
```

(la firma completa pasa a ser `id, email, firstName, lastName, fullName, role, isActive, lastLogin, mustChangePassword`).

Es una adición retrocompatible: ningún campo existente cambia de forma ni de significado, y el frontend lo necesita para redirigir a `/cambiar-password` (SPEC-100 §5.2).

En `modules/auth/service/AuthServiceImpl.java`, el método `toResponse` pasa a incluirlo:

```java
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
                user.getLastLogin(),
                user.isMustChangePassword());
    }
```

Los tests de `AuthServiceImplTest` y `AuthControllerTest` que construyen un `UserResponse` a mano dejarán de compilar: añadirles el argumento `false` al final.

- [ ] **Step 6: Ejecutar y verificar que pasa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=PasswordChangeRequiredFilterTest
```

Esperado: `Tests run: 8, Failures: 0`.

- [ ] **Step 7: Suite completa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test
```

Esperado: `BUILD SUCCESS`. Si falla en `AuthServiceImplTest` o `AuthControllerTest`, es el argumento que falta del Step 5.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/pe/edu/pucp/hesperides/shared/security/ \
        backend/src/main/java/pe/edu/pucp/hesperides/modules/auth/ \
        backend/src/test/java/pe/edu/pucp/hesperides/
git commit -m "feat(security): bloquea el sistema hasta que se cambie la contrasena temporal

Sin este filtro, must_change_password seria una sugerencia: cualquiera con la
clave que viajo por correo y curl usaria la API entera y la bandera no
protegeria nada.

Es un filtro y no un interceptor de MVC porque corre antes de que Spring
resuelva el handler: asi cubre tambien las rutas que acabarian en 404 y no deja
huecos.

La lista de excepciones es cerrada y deliberadamente corta: ni la propia ficha
entra, porque lo que la pantalla de cambio necesita del usuario ya viene en
/auth/me. Cada excepcion es una via por la que alguien opera con una credencial
que dos personas conocen.

UserResponse gana mustChangePassword, adicion retrocompatible que el frontend
necesita para redirigir a /cambiar-password.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Test de integración end-to-end y verificación manual

**Files:**
- Test: `backend/src/test/java/pe/edu/pucp/hesperides/modules/users/UsersIntegrationTest.java`
- Modify: `specs/REGISTRO.md`

**Interfaces:**
- Consumes: todo lo anterior
- Produces: la confirmación de que los doce criterios de aceptación de SPEC-100 §6 se cumplen

**Por qué existe:** los tests unitarios usan mocks y los de controller no tocan la base. Este recorre el flujo completo contra PostgreSQL real y un SMTP real (GreenMail), que es lo único que prueba que las piezas encajan: una `Specification` mal construida, un `@Transactional` mal puesto o un `CHECK` de la migración que rechaza lo que el enum produce solo se ven aquí.

- [ ] **Step 1: Escribir el test de integración**

`UsersIntegrationTest.java`:

```java
package pe.edu.pucp.hesperides.modules.users;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetupTest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Recorre el flujo completo contra PostgreSQL y SMTP reales, sin mocks. */
@Testcontainers
@SpringBootTest
@AutoConfigureMockMvc
class UsersIntegrationTest {

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP);

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.mail.port", () -> greenMail.getSmtp().getPort());
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private JdbcTemplate jdbcTemplate;

    private String createBody(String email) {
        return """
                {"email":"%s","firstName":"María","lastName":"García",
                 "roleCode":"OPERARIO","initialPassword":"ClaveValida123"}
                """.formatted(email);
    }

    // CA-01
    @Test
    @WithMockUser(username = "coordinador@pucp.edu.pe", authorities = "COORDINADOR")
    void onlyAnAdminCanCreateUsers() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody("x@pucp.edu.pe")))
                .andExpect(status().isForbidden());
    }

    // CA-02, primera mitad: el correo llega con la clave y la cuenta queda forzada
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void creatingAUserSendsTheEmailAndForcesTheChange() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody("nueva@pucp.edu.pe")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.mustChangePassword").value(true))
                .andExpect(jsonPath("$.data.credentialStatus").value("DELIVERED"));

        assertThat(greenMail.getReceivedMessages()).isNotEmpty();
        String body = GreenMailUtil.getBody(greenMail.getReceivedMessages()[0]);
        assertThat(body).contains("ClaveValida123").contains("nueva@pucp.edu.pe");
    }

    // CA-05: el sistema no puede quedarse sin administradores
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void theLastAdminCannotBeDeactivatedNorDemoted() throws Exception {
        Long adminId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'admin@pucp.edu.pe'", Long.class);

        // Es el unico ADMIN y ademas es quien ejecuta: falla por autodesactivacion.
        mockMvc.perform(post("/api/v1/users/" + adminId + "/deactivate"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("You cannot deactivate your own account"));

        mockMvc.perform(put("/api/v1/users/" + adminId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"admin@pucp.edu.pe","firstName":"Administrador",
                                 "lastName":"Hesperides","roleCode":"OPERARIO"}
                                """))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message")
                        .value("Cannot change the role of the last active administrator"));
    }

    // CA-04: desactivar corta el acceso
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void deactivatingAUserTurnsTheAccountOff() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody("baja@pucp.edu.pe")))
                .andReturn();
        Long id = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'baja@pucp.edu.pe'", Long.class);

        mockMvc.perform(post("/api/v1/users/" + id + "/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.isActive").value(false));

        Boolean active = jdbcTemplate.queryForObject(
                "SELECT is_active FROM users WHERE id = ?", Boolean.class, id);
        assertThat(active).isFalse();

        // Idempotente: repetir no falla.
        mockMvc.perform(post("/api/v1/users/" + id + "/deactivate"))
                .andExpect(status().isOk());
    }

    // CA-06: los cuatro filtros
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void theListingAppliesEveryFilter() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON).content(createBody("nunez@pucp.edu.pe")));

        mockMvc.perform(get("/api/v1/users").param("search", "garcia"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].lastName").value("García"));

        mockMvc.perform(get("/api/v1/users").param("roleCode", "ADMIN"))
                .andExpect(jsonPath("$.data.content[0].role.code").value("ADMIN"));

        // Sin isActive no aparece ningun desactivado.
        mockMvc.perform(get("/api/v1/users"))
                .andExpect(jsonPath("$.data.content[?(@.isActive == false)]").isEmpty());
    }

    // CA-08: ningun endpoint expone el hash
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void noResponseEverExposesThePasswordHash() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/v1/users")
                        .contentType(MediaType.APPLICATION_JSON).content(createBody("hash@pucp.edu.pe")))
                .andReturn();
        MvcResult listed = mockMvc.perform(get("/api/v1/users")).andReturn();

        for (MvcResult result : new MvcResult[] {created, listed}) {
            String body = result.getResponse().getContentAsString();
            assertThat(body)
                    .doesNotContain("passwordHash")
                    .doesNotContain("password_hash")
                    .doesNotContain("$2a$");
        }
    }

    // CA-09: un administrador no fija la clave de otro
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void anAdminCannotSetSomeoneElsePassword() throws Exception {
        mockMvc.perform(post("/api/v1/users")
                .contentType(MediaType.APPLICATION_JSON).content(createBody("fija@pucp.edu.pe")));
        Long id = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'fija@pucp.edu.pe'", Long.class);
        String hashBefore = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM users WHERE id = ?", String.class, id);

        // Un campo "password" extra en el body se ignora.
        mockMvc.perform(put("/api/v1/users/" + id)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"fija@pucp.edu.pe","firstName":"María","lastName":"García",
                                 "roleCode":"OPERARIO","password":"InyectadaPorElAdmin1"}
                                """))
                .andExpect(status().isOk());

        String hashAfter = jdbcTemplate.queryForObject(
                "SELECT password_hash FROM users WHERE id = ?", String.class, id);
        assertThat(hashAfter).isEqualTo(hashBefore);
    }

    // CA-03: el alta sobrevive a un fallo de entrega
    @Test
    @WithMockUser(username = "admin@pucp.edu.pe", authorities = "ADMIN")
    void theAccountSurvivesAFailedDelivery() throws Exception {
        greenMail.getSmtp().stop();
        try {
            mockMvc.perform(post("/api/v1/users")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(createBody("rebote@pucp.edu.pe")))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.data.credentialStatus").value("PENDING_DELIVERY"))
                    .andExpect(jsonPath("$.message")
                            .value("User created, but credential delivery failed"));

            // La cuenta existe pese al fallo: registrar a una persona no depende
            // de que un servicio externo este disponible.
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM users WHERE email = 'rebote@pucp.edu.pe'", Integer.class);
            assertThat(count).isEqualTo(1);
        } finally {
            greenMail.getSmtp().startService();
        }
    }

    // CA-02, segunda mitad: el bloqueo hasta cambiar la clave
    @Test
    @WithMockUser(username = "forzada@pucp.edu.pe", authorities = "ADMIN")
    void aPendingPasswordChangeBlocksTheRestOfTheApi() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id,
                                   must_change_password)
                VALUES ('forzada@pucp.edu.pe', '$2a$10$x', 'Ana', 'Torres',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'), TRUE)
                """);

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value("Password change required before using the system"));

        // /auth/me si pasa: la pantalla de cambio lo necesita.
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isOk());
    }

    // CA-07: alcance del supervisor
    @Test
    @WithMockUser(username = "supervisor@pucp.edu.pe", authorities = "SUPERVISOR")
    void aSupervisorWithoutTeamsSeesOnlyThemselves() throws Exception {
        jdbcTemplate.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                VALUES ('supervisor@pucp.edu.pe', '$2a$10$x', 'Sup', 'Visor',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'SUPERVISOR'))
                """);

        mockMvc.perform(get("/api/v1/users"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].email").value("supervisor@pucp.edu.pe"));
    }
}
```

- [ ] **Step 2: Ejecutar y verificar**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test -Dtest=UsersIntegrationTest
```

Esperado: `Tests run: 10, Failures: 0`.

**Si un test falla por contaminación entre tests** (el listado encuentra usuarios que creó otro test), añadir `@Transactional` a la clase: cada test rueda atrás al terminar. No usar `@DirtiesContext`, que recrea el contexto entero y multiplica el tiempo de la suite.

- [ ] **Step 3: Suite completa**

```bash
cd backend && JAVA_HOME="/c/Program Files/Eclipse Adoptium/jdk-26.0.2.101-hotspot" ./mvnw -B test
```

Esperado: `BUILD SUCCESS` con todos los tests verdes (70 previos + los de las tareas 1–9).

- [ ] **Step 4: Verificación manual contra el entorno real**

```bash
docker compose down -v && docker compose up -d --build
sleep 45

TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pucp.edu.pe","password":"Hesperides2026"}' \
  | grep -oE '"accessToken":"[^"]+"' | cut -d'"' -f4)

echo "=== listado ==="
curl -s "http://localhost:8080/api/v1/users" -H "Authorization: Bearer $TOKEN"

echo "=== alta (el correo fallara: no hay SMTP en local) ==="
curl -s -i -X POST http://localhost:8080/api/v1/users \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"email":"prueba@pucp.edu.pe","firstName":"Prueba","lastName":"Manual","roleCode":"OPERARIO","initialPassword":"ClaveValida123"}' \
  | grep -E "^HTTP|credentialStatus|message"
```

Esperado: el listado devuelve al administrador semilla; el alta responde **201** con `credentialStatus: "PENDING_DELIVERY"` y el mensaje de entrega fallida — porque en local no hay servidor SMTP, que es exactamente el caso que el spec exige soportar sin revertir el alta.

Para probar el envío de verdad, levantar un SMTP de juguete y apuntar el backend a él:

```bash
docker run -d --name mailpit --network 5hesperides_hesperides-net -p 8025:8025 axllent/mailpit
docker compose stop backend
SMTP_HOST=mailpit SMTP_PORT=1025 SMTP_AUTH=false SMTP_STARTTLS=false docker compose up -d backend
# Crear un usuario y abrir http://localhost:8025 para ver el correo
```

- [ ] **Step 5: Actualizar el REGISTRO**

En `specs/REGISTRO.md`, cambiar la fila de SPEC-100 a `🔄 En progreso` (el backend está hecho; el frontend es la entrega siguiente) y añadir a la tabla de enmiendas:

```markdown
| SPEC-002 §4.10 (V012) | Implementación de SPEC-100 | V012 se implementa dentro de SPEC-100 porque su CRUD la necesita para `teams[]`, el filtro `teamId` y el alcance del SUPERVISOR. `zone_id` queda **sin FK a `zones`**: esa tabla es de V004, propiedad del catastro, y aún no existe. El spec del catastro debe añadir la constraint con un `ALTER TABLE`. |
| SPEC-001 (migraciones V003/V004) | Implementación de SPEC-100 | Las dos migraciones de SPEC-001 se renumeran a **V005** y **V006**: ocupaban los números que SPEC-002 §4 reserva para PostGIS y zonas, y habrían roto Flyway al implementar el catastro. |
| SPEC-001 §3 (`GET /auth/me`) | Implementación de SPEC-100 | La respuesta gana el campo `mustChangePassword`, adición retrocompatible que el frontend necesita para redirigir a `/cambiar-password`. |
| SPEC-004 (pendiente) | Implementación de SPEC-100 | `AuditService` queda como interfaz con una implementación a SLF4J. Las cinco acciones de SPEC-100 §9.3 ya se invocan; SPEC-004 solo tendrá que aportar el bean que persiste en `audit_log`, sin tocar `UsersServiceImpl`. |
```

- [ ] **Step 6: Commit de cierre**

```bash
git add backend/src/test/java/pe/edu/pucp/hesperides/modules/users/UsersIntegrationTest.java specs/REGISTRO.md
git commit -m "test(users): verifica el CRUD completo contra PostgreSQL y SMTP reales

Cubre diez de los doce criterios de aceptacion de SPEC-100 §6 contra
infraestructura real: el alta envia el correo con la clave, el alta sobrevive a
un SMTP caido quedando PENDING_DELIVERY, el ultimo administrador no se puede
desactivar ni degradar, ningun endpoint expone el hash, un campo password extra
en el PUT se ignora, y una contrasena pendiente de cambio bloquea el resto de la
API pero deja pasar /auth/me.

Los dos CA que faltan son de verificacion manual: CA-11 y CA-12 exigen un
navegador y quedan para el frontend.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Verificación de cobertura del spec

| Requisito de SPEC-100 | Tarea |
|---|---|
| §2.6 Tres columnas independientes (`is_active`, `credential_status`, `must_change_password`) | 1, 2 |
| §2.7 El ADMIN no fija la clave de otro, la regenera | 5 (DTO sin campo), 6, verificado en 9 |
| §3 `GET /users` con los cuatro filtros y paginación | 5, 7 |
| §3 `GET /users/{id}` con 404 fuera de alcance | 5, 6, 7 |
| §3 `POST /users` con 201 y `Location` | 6, 7 |
| §3 `PUT /users/{id}` | 6, 7 |
| §3 `deactivate` / `reactivate`, idempotentes | 6, 7 |
| §3 `resend-credentials` | 6, 7 |
| §3 `mark-credentials-delivered` | 6, 7 |
| §3 `POST /users/me/password` | 6, 7 |
| §4 Migración V100 (`ALTER`, no `CREATE`) | 1 |
| §5.1 Flujo de alta | 6, verificado en 9 |
| §5.2 Cambio obligatorio y su bloqueo | 8 |
| §5.3 Envío fuera de la transacción; fallo no revierte | 4, 6, verificado en 9 |
| §5.5 Normalización del correo, idempotencia, defecto "solo activos" | 5, 6 |
| §5.6 Concurrencia del último ADMIN con bloqueo pesimista | 2, 6 |
| §9.1 Política de contraseñas | 3 |
| §9.2 404 en vez de 403 para el SUPERVISOR | 6 |
| §9.3 Las cinco acciones auditables | 4, 6 |
| §9.4 Qué se registra en logs y qué no | 4, 6 |
| Anexo A Autorización por rol | 7 |

**Fuera de alcance de este plan, explícitamente:**

- **El frontend de SPEC-100** (`/admin/usuarios`, `/cambiar-password` y sus cuatro componentes): es la entrega siguiente, y ahora sí tiene backend contra el que trabajar.
- **La persistencia de auditoría en `audit_log`**: es SPEC-004. Las llamadas quedan hechas; falta el bean que escribe en la tabla.
- **La detección de rebotes diferidos**: SPEC-100 §5.3 la declara fuera de alcance por diseño. Una cuenta cuyo correo rebota horas después queda `DELIVERED`, y la vía de recuperación es `resend-credentials`.
- **La gestión de cuadrillas** (crear, editar, asignar miembros): V012 crea las tablas, pero el CRUD de equipos es el módulo "1.1 Equipos" del Anexo A y necesita su propio spec. Hasta entonces, las cuadrillas se poblan por SQL.
