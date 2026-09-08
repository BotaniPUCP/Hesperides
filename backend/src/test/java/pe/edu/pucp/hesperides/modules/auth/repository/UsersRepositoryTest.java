package pe.edu.pucp.hesperides.modules.auth.repository;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Verifica el listado real contra PostgreSQL: la búsqueda insensible a
 * mayúsculas y tildes (unaccent, SPEC-100 CA-06), el filtro por rol y el
 * defecto "solo activos".
 */
@Testcontainers
@SpringBootTest
class UsersRepositoryTest {

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired private UsersRepository usersRepository;
    @Autowired private CatalogItemsRepository catalogItemsRepository;

    private static final Pageable PAGE = PageRequest.of(0, 20);

    private User user(String firstName, String lastName, String email, boolean active, CatalogItem role) {
        User user = new User();
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setEmail(email);
        user.setPasswordHash("$2a$10$irrelevante");
        user.setRoleItem(role);
        user.setActive(active);
        return usersRepository.save(user);
    }

    @Test
    void searchIsAccentInsensitive() {
        CatalogItem role = catalogItemsRepository.findActiveRoleByCode("OPERARIO").orElseThrow();
        String email = "maria" + System.nanoTime() + "@pucp.edu.pe";
        user("María", "García", email, true, role);

        Page<User> page = usersRepository.searchUsers(
                true, null, null, null, "%garcia%", PAGE);

        assertThat(page.getContent())
                .anyMatch(u -> email.equals(u.getEmail()));
    }

    @Test
    void defaultQueryHidesInactiveUsersAndFiltersByRole() {
        CatalogItem role = catalogItemsRepository.findActiveRoleByCode("OPERARIO").orElseThrow();
        CatalogItem otherRole = catalogItemsRepository.findActiveRoleByCode("ADMIN").orElseThrow();
        String inactiveEmail = "inactivo" + System.nanoTime() + "@pucp.edu.pe";
        user("Pedro", "Rojas", inactiveEmail, false, role);

        Page<User> active = usersRepository.searchUsers(true, null, null, null, null, PAGE);
        Page<User> filtered = usersRepository.searchUsers(true, "OPERARIO", null, null, null, PAGE);

        assertThat(active.getContent())
                .noneMatch(u -> inactiveEmail.equals(u.getEmail()));
        assertThat(filtered.getContent())
                .noneMatch(u -> !"OPERARIO".equals(u.getRoleCode()));
        assertThat(catalogItemsRepository.findActiveRoleByCode("ADMIN")).isPresent();
        assertThat(otherRole).isNotNull();
    }
}