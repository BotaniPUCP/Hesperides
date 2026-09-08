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
import java.util.Map;

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

        assertThat(columns).containsAll(List.of(
                "id", "email", "password_hash", "first_name", "last_name",
                "role_item_id", "is_active", "last_login",
                "created_at", "updated_at", "deleted_at"));
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
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = 'ADMIN'),
                        CURRENT_TIMESTAMP)
                """);

        // El mismo correo vuelve a estar libre porque la fila anterior está dada de baja.
        jdbcTemplate.execute("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id)
                VALUES ('repetido@pucp.edu.pe', 'hash', 'A', 'B',
                        (SELECT ci.id FROM catalog_items ci
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

    @Test
    void teamsTableHasEveryColumnTheSpecDeclares() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'teams'",
                String.class);

        assertThat(columns).containsExactlyInAnyOrder(
                "id", "code", "name", "supervisor_user_id", "zone_id", "is_active",
                "created_at", "updated_at", "deleted_at");
    }

    @Test
    void teamMembersTableHasEveryColumnTheSpecDeclares() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'team_members'",
                String.class);

        assertThat(columns).containsExactlyInAnyOrder(
                "id", "team_id", "user_id", "joined_at", "left_at",
                "created_at", "updated_at", "deleted_at");
    }

    @Test
    void auditLogTableIsAppendOnlyWithoutUpdatedAtOrDeletedAt() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'audit_log'",
                String.class);

        assertThat(columns).containsExactlyInAnyOrder(
                "id", "action", "entity_type", "entity_id", "user_id", "ip_address", "changes", "created_at");
    }

    @Test
    void aUserCannotBeMemberTwiceInTheSameTeamWhileActive() {
        Long supervisor = insertUser("sup.smoke@pucp.edu.pe", "SUPERVISOR", true, false);
        Long operario = insertUser("op.smoke@pucp.edu.pe", "OPERARIO", true, false);
        jdbcTemplate.update("""
                INSERT INTO teams (code, name, supervisor_user_id) VALUES ('T-SMOKE', 'Smoke', ?)
                """, supervisor);
        Long teamId = jdbcTemplate.queryForObject(
                "SELECT id FROM teams WHERE code = 'T-SMOKE'", Long.class);
        Long memberId = insertTeamMember(teamId, operario);

        // Dejar la primera membresía: debería violar el índice parcial único.
        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                        insertTeamMember(teamId, operario))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);

        // Al cerrar la primera (left_at), el mismo usuario vuelve a ser asignable.
        jdbcTemplate.update("UPDATE team_members SET left_at = CURRENT_TIMESTAMP WHERE id = ?", memberId);
        insertTeamMember(teamId, operario);
    }

    @Test
    void usersTableHasCredentialColumnsFromV100() {
        List<String> columns = jdbcTemplate.queryForList(
                "SELECT column_name FROM information_schema.columns WHERE table_name = 'users'",
                String.class);

        assertThat(columns).contains(
                "credential_status", "must_change_password", "credentials_sent_at");
    }

    @Test
    void seedAdminKeepsDeliveredDefaultsAfterV100() {
        Map<String, Object> row = jdbcTemplate.queryForMap("""
                SELECT credential_status, must_change_password
                FROM users WHERE email = 'admin@pucp.edu.pe'
                """);

        assertThat(row.get("credential_status")).isEqualTo("DELIVERED");
        assertThat(row.get("must_change_password")).isEqualTo(false);
    }

    private Long insertUser(String email, String role, boolean active, boolean deleted) {
        jdbcTemplate.update("""
                INSERT INTO users (email, password_hash, first_name, last_name, role_item_id, is_active, deleted_at)
                VALUES (?, 'hash', 'Juan', 'Perez',
                        (SELECT ci.id FROM catalog_items ci
                         JOIN catalog_types ct ON ct.id = ci.catalog_type_id
                         WHERE ct.code = 'ROLE' AND ci.code = ?),
                        ?, ?)
                """, email, role, active, deleted ? java.sql.Timestamp.from(java.time.Instant.now()) : null);
        return jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = ?", Long.class, email);
    }

    private Long insertTeamMember(Long teamId, Long userId) {
        jdbcTemplate.update(
                "INSERT INTO team_members (team_id, user_id) VALUES (?, ?)", teamId, userId);
        return jdbcTemplate.queryForObject(
                "SELECT id FROM team_members WHERE team_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1",
                Long.class, teamId, userId);
    }
}