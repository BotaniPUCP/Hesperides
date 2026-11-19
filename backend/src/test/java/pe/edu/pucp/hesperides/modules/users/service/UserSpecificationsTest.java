package pe.edu.pucp.hesperides.modules.users.service;

import pe.edu.pucp.hesperides.support.TestDatabase;
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
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Testcontainers
@SpringBootTest
@Transactional
class UserSpecificationsTest {

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

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

    private List<String> emailsVisibleTo(List<Long> scopeIds) {
        return usersRepository.findAll(UserSpecifications.visibleTo(scopeIds)).stream().map(User::getEmail).toList();
    }

    @Test
    void everyoneComesBackActiveOrNotToBeFilteredInTheBrowser() {
        // Buscar, filtrar por rol, estado o cuadrilla se hace en el navegador (SPEC-119).
        assertThat(emailsVisibleTo(null))
                .contains("perez@pucp.edu.pe", "nunez@pucp.edu.pe", "baja@pucp.edu.pe");
    }

    @Test
    void aScopeOfIdsRestrictsTheResult() {
        Long id = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'perez@pucp.edu.pe'", Long.class);

        assertThat(emailsVisibleTo(List.of(id))).containsExactly("perez@pucp.edu.pe");
    }

    @Test
    void anEmptyScopeYieldsNothing() {
        // Un supervisor sin cuadrilla no ve a todos: no ve a nadie.
        assertThat(emailsVisibleTo(List.of())).isEmpty();
    }

    @Test
    void softDeletedUsersNeverAppear() {
        jdbcTemplate.update("UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE email = ?",
                "perez@pucp.edu.pe");

        assertThat(emailsVisibleTo(null)).doesNotContain("perez@pucp.edu.pe");
    }
}
