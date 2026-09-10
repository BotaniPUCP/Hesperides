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

    @Test
    void teamIdFiltersByCurrentMembership() {
        Long supervisorId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'nunez@pucp.edu.pe'", Long.class);
        Long memberId = jdbcTemplate.queryForObject(
                "SELECT id FROM users WHERE email = 'perez@pucp.edu.pe'", Long.class);
        jdbcTemplate.update(
                "INSERT INTO teams (code, name, supervisor_user_id) VALUES ('CS-01', 'Cuadrilla Sur', ?)",
                supervisorId);
        Long teamId = jdbcTemplate.queryForObject(
                "SELECT id FROM teams WHERE code = 'CS-01'", Long.class);
        jdbcTemplate.update("INSERT INTO team_members (team_id, user_id) VALUES (?, ?)",
                teamId, memberId);

        assertThat(emailsMatching(null, null, null, teamId, null))
                .containsExactly("perez@pucp.edu.pe");
    }
}
