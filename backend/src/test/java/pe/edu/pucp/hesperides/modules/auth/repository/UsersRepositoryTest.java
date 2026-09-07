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
