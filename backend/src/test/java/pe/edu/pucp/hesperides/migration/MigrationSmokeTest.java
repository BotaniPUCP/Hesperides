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
}
