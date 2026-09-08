package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.CredentialStatus;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.RefreshTokensRepository;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.teams.entity.Team;
import pe.edu.pucp.hesperides.modules.teams.entity.TeamMember;
import pe.edu.pucp.hesperides.modules.teams.repository.TeamMembersRepository;
import pe.edu.pucp.hesperides.modules.teams.repository.TeamsRepository;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.service.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BadRequestException;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.FieldValidationException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UsersServiceImplTest {

    @Mock private UsersRepository usersRepository;
    @Mock private TeamsRepository teamsRepository;
    @Mock private TeamMembersRepository teamMembersRepository;
    @Mock private CatalogItemsRepository catalogItemsRepository;
    @Mock private RefreshTokensRepository refreshTokensRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private PasswordPolicy passwordPolicy;
    @Mock private TemporaryPasswordGenerator passwordGenerator;
    @Mock private CredentialDeliveryService credentialDeliveryService;
    @Mock private AuditService auditService;

    private UserResponseMapper userMapper;
    private UsersServiceImpl service;

    @BeforeEach
    void setUp() {
        userMapper = new UserResponseMapper(teamMembersRepository);
        lenient().when(teamMembersRepository.findByUserIdAndLeftAtIsNull(any())).thenReturn(List.of());
        lenient().when(teamMembersRepository.findByUserIdInAndLeftAtIsNull(any())).thenReturn(List.of());
        service = new UsersServiceImpl(
                usersRepository, teamsRepository, teamMembersRepository, catalogItemsRepository,
                refreshTokensRepository, passwordEncoder, passwordPolicy, passwordGenerator,
                credentialDeliveryService, userMapper, auditService);
        lenient().when(usersRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    private static void setId(Object entity, Long id) {
        ReflectionTestUtils.setField(entity, "id", id);
    }

    private CatalogItem role(String code) {
        CatalogItem role = new CatalogItem();
        setId(role, 1L);
        role.setCode(code);
        role.setLabel(code);
        return role;
    }

    private User user(Long id, String roleCode, String email) {
        User user = new User();
        if (id != null) {
            setId(user, id);
        }
        user.setEmail(email);
        user.setFirstName("Ana");
        user.setLastName("Torres");
        user.setRoleItem(role(roleCode));
        user.setActive(true);
        return user;
    }

    private User actor() {
        User user = user(99L, "ADMIN", "admin@pucp.edu.pe");
        return user;
    }

    @Test
    void createHashesThePasswordAndPersistsPendingDelivery() {
        when(usersRepository.findActiveByEmail("nueva@pucp.edu.pe")).thenReturn(Optional.empty());
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO")).thenReturn(Optional.of(role("OPERARIO")));
        when(passwordPolicy.evaluate(anyString(), anyString(), anyString(), anyString())).thenReturn(null);
        when(passwordEncoder.encode("Clave1234")).thenReturn("$2a$10$hash");

        UserResponse response = service.create(new CreateUserRequest(
                "nueva@pucp.edu.pe", "Ana", "Torres", "OPERARIO", "Clave1234"));

        assertThat(response.email()).isEqualTo("nueva@pucp.edu.pe");
        assertThat(response.mustChangePassword()).isTrue();
        assertThat(response.credentialStatus()).isEqualTo(CredentialStatus.PENDING_DELIVERY);
        verify(usersRepository).save(argHasPassword("$2a$10$hash"));
        verify(auditService).record(eq(AuditActionCode.USER_CREATED), eq("USER"), any(), any());
    }

    private User argHasPassword(String hash) {
        return org.mockito.ArgumentMatchers.argThat(user ->
                hash.equals(((User) user).getPasswordHash()));
    }

    @Test
    void createRejectsADuplicatedEmail() {
        when(usersRepository.findActiveByEmail("nueva@pucp.edu.pe")).thenReturn(Optional.of(user(1L, "OPERARIO", "nueva@pucp.edu.pe")));

        assertThatThrownBy(() -> service.create(new CreateUserRequest(
                "nueva@pucp.edu.pe", "Ana", "Torres", "OPERARIO", "Clave1234")))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Email already registered");
    }

    @Test
    void createRejectsAnUnexistingRole() {
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.empty());
        when(catalogItemsRepository.findActiveRoleByCode("SUPERVISOR_X")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(new CreateUserRequest(
                "nueva@pucp.edu.pe", "Ana", "Torres", "SUPERVISOR_X", "Clave1234")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Role 'SUPERVISOR_X' does not exist or is not active");
    }

    @Test
    void createRejectsAPasswordViolatingThePolicy() {
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.empty());
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO")).thenReturn(Optional.of(role("OPERARIO")));
        when(passwordPolicy.evaluate(anyString(), anyString(), anyString(), anyString()))
                .thenReturn("Debe tener al menos 10 caracteres");

        assertThatThrownBy(() -> service.create(new CreateUserRequest(
                "nueva@pucp.edu.pe", "Ana", "Torres", "OPERARIO", "corta")))
                .isInstanceOf(FieldValidationException.class);
    }

    @Test
    void deliverCredentialsMarksDeliveredOnSuccess() {
        User user = user(5L, "OPERARIO", "nueva@pucp.edu.pe");
        user.setCredentialStatus(CredentialStatus.PENDING_DELIVERY);
        when(usersRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(user));

        var outcome = service.deliverCredentials(5L, "Clave1234");

        assertThat(outcome.delivered()).isTrue();
        assertThat(outcome.user().credentialStatus()).isEqualTo(CredentialStatus.DELIVERED);
        assertThat(user.getCredentialsSentAt()).isNotNull();
    }

    @Test
    void deliverCredentialsKeepsPendingAndAuditsOnFailure() {
        User user = user(5L, "OPERARIO", "nueva@pucp.edu.pe");
        user.setCredentialStatus(CredentialStatus.PENDING_DELIVERY);
        when(usersRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(user));
        org.mockito.Mockito.doThrow(new CredentialDeliveryException("connection refused", new RuntimeException()))
                .when(credentialDeliveryService).deliver(eq(user), anyString());

        var outcome = service.deliverCredentials(5L, "Clave1234");

        assertThat(outcome.delivered()).isFalse();
        assertThat(outcome.user().credentialStatus()).isEqualTo(CredentialStatus.PENDING_DELIVERY);
        verify(auditService).record(eq(AuditActionCode.USER_CREDENTIALS_DELIVERY_FAILED), eq("USER"), eq(5L), any());
    }

    @Test
    void deactivatingYourselfIsRejected() {
        User admin = actor();
        when(usersRepository.findByIdAndDeletedAtIsNull(99L)).thenReturn(Optional.of(admin));

        assertThatThrownBy(() -> service.deactivate(99L, admin))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("You cannot deactivate your own account");
    }

    @Test
    void deactivatingTheLastAdminIsRejected() {
        User admin = actor();
        when(usersRepository.findByIdAndDeletedAtIsNull(99L)).thenReturn(Optional.of(admin));
        when(usersRepository.countOtherActiveAdmins(99L)).thenReturn(0L);

        assertThatThrownBy(() -> service.deactivate(99L, user(1L, "ADMIN", "otro@pucp.edu.pe")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Cannot deactivate the last active administrator");
    }

    @Test
    void deactivatingRevokesSessionsAndAudits() {
        User admin = actor();
        when(usersRepository.findByIdAndDeletedAtIsNull(99L)).thenReturn(Optional.of(admin));
        when(usersRepository.countOtherActiveAdmins(99L)).thenReturn(1L);

        var response = service.deactivate(99L, user(1L, "ADMIN", "otro@pucp.edu.pe"));

        assertThat(response.isActive()).isFalse();
        verify(refreshTokensRepository).revokeAllForUser(eq(99L), any());
        verify(auditService).record(eq(AuditActionCode.USER_DEACTIVATED), eq("USER"), eq(99L), any());
    }

    @Test
    void deactivatingAnInactiveUserIsIdempotentWithoutAudit() {
        User admin = actor();
        admin.setActive(false);
        when(usersRepository.findByIdAndDeletedAtIsNull(99L)).thenReturn(Optional.of(admin));

        service.deactivate(99L, user(1L, "ADMIN", "otro@pucp.edu.pe"));

        verify(auditService, never()).record(any(), any(), any(), any());
        verify(refreshTokensRepository, never()).revokeAllForUser(any(), any());
    }

    @Test
    void updatingTheLastAdminRoleIsRejected() {
        User admin = actor();
        when(usersRepository.findByIdAndDeletedAtIsNull(99L)).thenReturn(Optional.of(admin));
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO")).thenReturn(Optional.of(role("OPERARIO")));
        when(usersRepository.countOtherActiveAdmins(99L)).thenReturn(0L);

        assertThatThrownBy(() -> service.update(99L, new UpdateUserRequest(
                "admin@pucp.edu.pe", "Ana", "Torres", "OPERARIO")))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Cannot change the role of the last active administrator");
    }

    @Test
    void resendCredentialsRegeneratesAndRevokesEverySession() {
        User user = user(5L, "OPERARIO", "nueva@pucp.edu.pe");
        when(usersRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(user));
        when(passwordGenerator.generate()).thenReturn("Temporal2026");
        when(passwordEncoder.encode("Temporal2026")).thenReturn("$2a$10$temporal");

        var result = service.resendCredentials(5L);

        assertThat(result.temporaryPassword()).isEqualTo("Temporal2026");
        assertThat(user.isMustChangePassword()).isTrue();
        assertThat(user.getPasswordHash()).isEqualTo("$2a$10$temporal");
        verify(refreshTokensRepository).revokeAllForUser(eq(5L), any());
        verify(auditService).record(eq(AuditActionCode.USER_CREDENTIALS_RESENT), eq("USER"), eq(5L), any());
    }

    @Test
    void resendCredentialsRejectsInactiveUsers() {
        User user = user(5L, "OPERARIO", "nueva@pucp.edu.pe");
        user.setActive(false);
        when(usersRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.resendCredentials(5L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("Cannot send credentials to an inactive user");
    }

    @Test
    void markDeliveredRejectsAUserThatWasNotPending() {
        User user = user(5L, "OPERARIO", "nueva@pucp.edu.pe");
        user.setCredentialStatus(CredentialStatus.DELIVERED);
        when(usersRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.markCredentialsDelivered(5L))
                .isInstanceOf(BusinessRuleException.class)
                .hasMessage("User credentials are not pending delivery");
    }

    @Test
    void changingPasswordRequiresTheCorrectCurrentOne() {
        User user = user(5L, "OPERARIO", "nueva@pucp.edu.pe");
        lenient().when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
        when(usersRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> service.changeOwnPassword(5L,
                new ChangePasswordRequest("mal", "NuevaClave2026")))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("Current password is incorrect");
    }

    @Test
    void changingPasswordKeepsTheCurrentSessionAndClearsTheFlag() {
        User user = user(5L, "OPERARIO", "nueva@pucp.edu.pe");
        user.setMustChangePassword(true);
        when(usersRepository.findByIdAndDeletedAtIsNull(5L)).thenReturn(Optional.of(user));
        lenient().when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
        when(passwordEncoder.matches(eq("Anterior2026"), any())).thenReturn(true);
        when(passwordPolicy.evaluate(anyString(), anyString(), anyString(), anyString())).thenReturn(null);
        when(passwordEncoder.encode("NuevaClave2026")).thenReturn("$2a$10$nueva");

        service.changeOwnPassword(5L, new ChangePasswordRequest("Anterior2026", "NuevaClave2026"));

        assertThat(user.isMustChangePassword()).isFalse();
        assertThat(user.getPasswordHash()).isEqualTo("$2a$10$nueva");
        verify(refreshTokensRepository).revokeAllExceptLatest(eq(5L), any());
        verify(auditService).record(eq(AuditActionCode.USER_PASSWORD_CHANGED), eq("USER"), eq(5L), any());
    }

    @Test
    void supervisorListIsScopedToHisTeamMembers() {
        User supervisor = user(7L, "SUPERVISOR", "sup@pucp.edu.pe");
        Team team = new Team();
        setId(team, 2L);
        TeamMember member = new TeamMember();
        setId(member, 1L);
        member.setUser(user(3L, "OPERARIO", "oper@pucp.edu.pe"));
        lenient().when(teamsRepository.findBySupervisorUserIdAndActiveTrueAndDeletedAtIsNull(7L))
                .thenReturn(List.of(team));
        lenient().when(teamMembersRepository.findByTeamIdInAndLeftAtIsNull(List.of(2L)))
                .thenReturn(List.of(member));
        org.springframework.data.domain.Page<User> empty =
                org.springframework.data.domain.Page.empty();
        lenient().when(usersRepository.searchUsers(
                eq(true), eq("OPERARIO"), eq(2L), any(), eq("%perez%"), any())).thenReturn(empty);

        service.list("perez", "OPERARIO", true, 2L, PageRequest.of(0, 20), supervisor);

        verify(usersRepository).searchUsers(eq(true), eq("OPERARIO"), eq(2L),
                org.mockito.ArgumentMatchers.argThat(scope ->
                        scope.contains(3L) && scope.contains(7L)),
                eq("%perez%"), any());
    }

    @Test
    void supervisorCannotSeeUsersOutsideHisTeam() {
        User supervisor = user(7L, "SUPERVISOR", "sup@pucp.edu.pe");
        when(usersRepository.findByIdAndDeletedAtIsNull(4L)).thenReturn(Optional.of(user(4L, "OPERARIO", "otro@pucp.edu.pe")));
        when(teamsRepository.findBySupervisorUserIdAndActiveTrueAndDeletedAtIsNull(7L)).thenReturn(List.of());

        assertThatThrownBy(() -> service.get(4L, supervisor))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("User not found");
    }

    @Test
    void anyUserCanFetchHisOwnProfile() {
        User self = user(4L, "OPERARIO", "soy@pucp.edu.pe");
        when(usersRepository.findByIdAndDeletedAtIsNull(4L)).thenReturn(Optional.of(self));

        var response = service.get(4L, self);

        assertThat(response.id()).isEqualTo(4L);
        assertThat(response.email()).isEqualTo("soy@pucp.edu.pe");
    }
}