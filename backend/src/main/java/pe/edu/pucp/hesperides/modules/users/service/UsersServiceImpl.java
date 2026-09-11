package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.auth.service.RefreshTokenService;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CredentialDeliveryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;
import pe.edu.pucp.hesperides.modules.users.repository.TeamMembersRepository;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UsersServiceImpl implements UsersService {

    private static final String NOT_FOUND = "User not found";
    private static final String ENTITY = "User";

    private final UsersRepository usersRepository;
    private final CatalogItemsRepository catalogItemsRepository;
    private final TeamMembersRepository teamMembersRepository;
    private final UserCreationFlow creationFlow;
    private final UserCredentialOperations credentialOperations;
    private final RefreshTokenService refreshTokenService;
    private final AuditService auditService;
    private final UserScopeResolver scopeResolver;
    private final AdminProtectionRules adminRules;
    private final UserMapper mapper;

    @Override
    @Transactional(readOnly = true)
    public Page<UserDetailResponse> findAll(String search, String roleCode, Boolean isActive,
                                            Long teamId, Pageable pageable, String viewerEmail) {
        UserScopeResolver.Scope scope = scopeResolver.resolve(viewerEmail);
        var spec = UserSpecifications.withFilters(search, roleCode, isActive, teamId,
                scope.seesEveryone() ? null : scope.visibleUserIds());

        return usersRepository.findAll(spec, pageable).map(this::withTeams);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetailResponse findById(Long id, String viewerEmail) {
        UserScopeResolver.Scope scope = scopeResolver.resolve(viewerEmail);
        User user = requireLiveUser(id);

        // 404 y no 403: un 403 confirmaría que el id existe y permitiría enumerar
        // la plantilla iterando ids (SPEC-100 §9.2).
        if (!scope.seesEveryone() && !scope.visibleUserIds().contains(id)) {
            throw new ResourceNotFoundException(NOT_FOUND);
        }
        return withTeams(user);
    }

    @Override
    @Transactional
    public CreationResult create(CreateUserRequest request) {
        String email = normalize(request.email());
        CatalogItem role = resolveRole(request.roleCode());

        UserCreationFlow.Result result = creationFlow.execute(request, email, role);
        return new CreationResult(withTeams(result.user()), result.delivered());
    }

    @Override
    @Transactional
    public UserDetailResponse update(Long id, UpdateUserRequest request) {
        User user = requireLiveUser(id);
        String email = normalize(request.email());
        CatalogItem newRole = resolveRole(request.roleCode());

        if (usersRepository.countByEmailExcluding(email, id) > 0) {
            throw new DuplicateResourceException("Email already registered");
        }

        String previousRole = user.getRoleCode();
        boolean roleChanges = !previousRole.equals(newRole.getCode());
        if (roleChanges) {
            adminRules.refuseRemovingLastAdmin(user,
                    "Cannot change the role of the last active administrator");
        }

        user.setEmail(email);
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setRoleItem(newRole);
        usersRepository.save(user);

        if (roleChanges) {
            auditService.record(AuditActionCode.USER_ROLE_CHANGED, ENTITY, id,
                    Map.of("roleCode", Map.of("before", previousRole, "after", newRole.getCode())));
        }
        return withTeams(user);
    }

    @Override
    @Transactional
    public UserDetailResponse deactivate(Long id, String actorEmail) {
        User target = requireLiveUser(id);
        User actor = usersRepository.findActiveByEmail(normalize(actorEmail))
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));

        adminRules.refuseSelfDeactivation(target, actor);

        // Idempotente: desactivar a quien ya lo está no falla ni vuelve a auditar
        // un cambio que no ocurrió (SPEC-100 §5.5).
        if (!target.isActive()) {
            return withTeams(target);
        }

        adminRules.refuseRemovingLastAdmin(target, "Cannot deactivate the last active administrator");

        target.setActive(false);
        usersRepository.save(target);
        // Sin revocar, la persona sigue dentro hasta 7 días con su refresh token.
        refreshTokenService.revokeAll(id);

        auditService.record(AuditActionCode.USER_DEACTIVATED, ENTITY, id,
                Map.of("isActive", Map.of("before", true, "after", false)));
        return withTeams(target);
    }

    @Override
    @Transactional
    public UserDetailResponse reactivate(Long id) {
        User target = requireLiveUser(id);
        if (target.isActive()) {
            return withTeams(target);
        }

        target.setActive(true);
        usersRepository.save(target);
        auditService.record(AuditActionCode.USER_REACTIVATED, ENTITY, id,
                Map.of("isActive", Map.of("before", false, "after", true)));
        return withTeams(target);
    }

    @Override
    @Transactional
    public CredentialDeliveryResponse resendCredentials(Long id) {
        return credentialOperations.resend(requireLiveUser(id));
    }

    @Override
    @Transactional
    public UserDetailResponse markCredentialsDelivered(Long id) {
        User target = requireLiveUser(id);
        credentialOperations.markDelivered(target);
        return withTeams(target);
    }

    @Override
    @Transactional
    public void changeOwnPassword(String email, ChangePasswordRequest request) {
        User user = usersRepository.findActiveByEmail(normalize(email))
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));

        credentialOperations.changeOwn(user, request);
    }

    private User requireLiveUser(Long id) {
        return usersRepository.findById(id)
                .filter(u -> u.getDeletedAt() == null)
                .orElseThrow(() -> new ResourceNotFoundException(NOT_FOUND));
    }

    private CatalogItem resolveRole(String roleCode) {
        return catalogItemsRepository.findActiveRoleByCode(roleCode)
                .orElseThrow(() -> new BusinessRuleException(
                        "Role '" + roleCode + "' does not exist or is not active"));
    }

    private UserDetailResponse withTeams(User user) {
        return mapper.toResponse(user, teamMembersRepository.findActiveTeamsOfUser(user.getId()));
    }

    /**
     * "Juan@PUCP.edu.pe " y "juan@pucp.edu.pe" son la misma cuenta. Sin
     * normalizar, el índice único las admitiría como dos y el login fallaría de
     * forma inexplicable (SPEC-100 §5.5).
     */
    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}
