package pe.edu.pucp.hesperides.modules.users.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentMatchers;
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
        // AdminProtectionRules, CredentialDeliverer y UserCreationFlow se
        // construyen de verdad, no se simulan: las reglas del ultimo
        // administrador y el efecto de un envio fallido sobre la cuenta deben
        // ejercitarse de verdad, no contra un mock que siempre dice lo correcto.
        CredentialDeliverer deliverer =
                new CredentialDeliverer(credentialDeliveryService, usersRepository, auditService);
        UserCreationFlow creationFlow = new UserCreationFlow(
                usersRepository, passwordEncoder, passwordPolicy, auditService, deliverer);
        UserCredentialOperations credentialOperations = new UserCredentialOperations(
                usersRepository, passwordEncoder, passwordPolicy, temporaryPasswordGenerator,
                deliverer, refreshTokenService);

        service = new UsersServiceImpl(usersRepository, catalogItemsRepository, teamMembersRepository,
                creationFlow, credentialOperations, refreshTokenService, auditService,
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
        return new CreateUserRequest("Nueva@PUCP.edu.pe ", "María", "García", "OPERARIO",
                "ClaveValida123");
    }

    // ---------- create ----------

    @Test
    void createPersistsWithMustChangePasswordAndSendsTheEmail() {
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO"))
                .thenReturn(Optional.of(role("OPERARIO", 3L)));
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
        when(catalogItemsRepository.findActiveRoleByCode(anyString()))
                .thenReturn(Optional.of(role("OPERARIO", 3L)));
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
        when(catalogItemsRepository.findActiveRoleByCode(anyString()))
                .thenReturn(Optional.of(role("OPERARIO", 3L)));
        when(usersRepository.findActiveByEmail(anyString())).thenReturn(Optional.empty());
        when(usersRepository.saveAndFlush(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        service.create(createRequest());

        verify(passwordPolicy).validate(eq("ClaveValida123"), eq("nueva@pucp.edu.pe"),
                eq("María"), eq("García"));
    }

    @Test
    void createWithADuplicateEmailFails() {
        when(catalogItemsRepository.findActiveRoleByCode(anyString()))
                .thenReturn(Optional.of(role("OPERARIO", 3L)));
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
        when(catalogItemsRepository.findActiveRoleByCode(anyString()))
                .thenReturn(Optional.of(role("OPERARIO", 3L)));
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
        when(catalogItemsRepository.findActiveRoleByCode(anyString()))
                .thenReturn(Optional.of(role("OPERARIO", 3L)));
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
                ArgumentMatchers.argThat(changes ->
                        !changes.toString().contains("ClaveValida123")
                                && !changes.toString().contains("hash")));
    }

    // ---------- update ----------

    @Test
    void updateChangesTheEditableFields() {
        User existing = existingUser(5L, "OPERARIO", true);
        when(usersRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO"))
                .thenReturn(Optional.of(role("OPERARIO", 1L)));
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
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO"))
                .thenReturn(Optional.of(role("OPERARIO", 1L)));
        when(usersRepository.countByEmailExcluding(anyString(), anyLong())).thenReturn(0L);
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(5L, new UpdateUserRequest("ana@pucp.edu.pe", "Ana", "Torres", "OPERARIO"));

        verify(auditService, never()).record(eq(AuditActionCode.USER_ROLE_CHANGED), anyString(),
                anyLong(), any());
    }

    @Test
    void updateAuditsTheRoleChangeWithBeforeAndAfter() {
        User existing = existingUser(5L, "OPERARIO", true);
        when(usersRepository.findById(5L)).thenReturn(Optional.of(existing));
        when(catalogItemsRepository.findActiveRoleByCode("COORDINADOR"))
                .thenReturn(Optional.of(role("COORDINADOR", 2L)));
        when(usersRepository.countByEmailExcluding(anyString(), anyLong())).thenReturn(0L);
        when(usersRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        service.update(5L, new UpdateUserRequest("ana@pucp.edu.pe", "Ana", "Torres", "COORDINADOR"));

        verify(auditService).record(eq(AuditActionCode.USER_ROLE_CHANGED), eq("User"), eq(5L),
                ArgumentMatchers.argThat(changes ->
                        changes.toString().contains("OPERARIO")
                                && changes.toString().contains("COORDINADOR")));
    }

    @Test
    void updateRefusesToDemoteTheLastActiveAdmin() {
        User lastAdmin = existingUser(5L, "ADMIN", true);
        when(usersRepository.findById(5L)).thenReturn(Optional.of(lastAdmin));
        when(catalogItemsRepository.findActiveRoleByCode("OPERARIO"))
                .thenReturn(Optional.of(role("OPERARIO", 3L)));
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
        when(catalogItemsRepository.findActiveRoleByCode(anyString()))
                .thenReturn(Optional.of(role("OPERARIO", 1L)));
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
        verify(auditService, never()).record(eq(AuditActionCode.USER_DEACTIVATED), anyString(),
                anyLong(), any());
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

        verify(passwordPolicy).validate(eq("Nueva1234567"), eq("ana@pucp.edu.pe"), eq("Ana"),
                eq("Torres"));
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
