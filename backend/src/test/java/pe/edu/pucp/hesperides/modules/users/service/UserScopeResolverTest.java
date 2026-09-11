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
