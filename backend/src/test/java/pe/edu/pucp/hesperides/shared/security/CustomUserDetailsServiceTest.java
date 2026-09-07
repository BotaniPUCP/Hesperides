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
