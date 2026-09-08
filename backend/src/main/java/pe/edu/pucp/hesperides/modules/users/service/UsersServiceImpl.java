package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.CredentialStatus;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.RefreshTokensRepository;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.teams.entity.Team;
import pe.edu.pucp.hesperides.modules.teams.repository.TeamMembersRepository;
import pe.edu.pucp.hesperides.modules.teams.repository.TeamsRepository;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UsersPage;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.service.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BadRequestException;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.FieldValidationException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Implementación de los casos de uso de SPEC-100. La contraseña nunca sale de
 * aquí en claro hacia las respuestas: viaja por SMTP o recocida por BCrypt.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UsersServiceImpl implements UsersService {

    private static final String ENTITY_TYPE = "USER";

    private final UsersRepository usersRepository;
    private final TeamsRepository teamsRepository;
    private final TeamMembersRepository teamMembersRepository;
    private final CatalogItemsRepository catalogItemsRepository;
    private final RefreshTokensRepository refreshTokensRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final TemporaryPasswordGenerator passwordGenerator;
    private final CredentialDeliveryService credentialDeliveryService;
    private final UserResponseMapper userMapper;
    private final AuditService auditService;

    @Override
    @Transactional(readOnly = true)
    public UsersPage<UserResponse> list(String search, String roleCode, Boolean isActive, Long teamId,
                                        Pageable pageable, User actor) {
        Set<Long> scope = scopeFor(actor);
        String folded = null;
        if (search != null && !search.isBlank()) {
            String clipped = search.length() > 100 ? search.substring(0, 100) : search;
            folded = "%" + PasswordPolicy.fold(clipped) + "%";
        }

        Page<User> page = usersRepository.searchUsers(
                isActive == null || isActive, roleCode, teamId, scope, folded, pageable);

        return UsersPage.from(page.map(userMapper::toResponse));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse get(Long id, User actor) {
        User user = requireById(id);
        if (!canSee(actor, user)) {
            throw new ResourceNotFoundException("User not found");
        }
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse create(CreateUserRequest request) {
        String email = normalize(request.email());
        if (usersRepository.findActiveByEmail(email).isPresent()) {
            throw new DuplicateResourceException("Email already registered");
        }
        CatalogItem role = requireActiveRole(request.roleCode());
        String violation = passwordPolicy.evaluate(request.initialPassword(), email,
                request.firstName(), request.lastName());
        if (violation != null) {
            throw new FieldValidationException(List.of(Map.of("field", "initialPassword", "message", violation)));
        }

        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.initialPassword()));
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setRoleItem(role);
        user.setActive(true);
        user.setMustChangePassword(true);
        user.setCredentialStatus(CredentialStatus.PENDING_DELIVERY);
        usersRepository.save(user);

        log.info("Alta de usuario {} rol {} por {}", email, role.getCode(), "ADMIN");
        auditService.record(AuditActionCode.USER_CREATED, ENTITY_TYPE, user.getId(),
                Map.of("email", email, "roleCode", role.getCode(),
                        "firstName", user.getFirstName(), "lastName", user.getLastName()));

        return userMapper.toResponse(user);
    }

    @Override
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public DeliveryOutcome deliverCredentials(Long id, String plainPassword) {
        User user = requireById(id);
        try {
            credentialDeliveryService.deliver(user, plainPassword);
            user.setCredentialStatus(CredentialStatus.DELIVERED);
            user.setCredentialsSentAt(Instant.now());
            usersRepository.save(user);
            return new DeliveryOutcome(true, userMapper.toResponse(user));
        } catch (CredentialDeliveryException ex) {
            auditService.record(AuditActionCode.USER_CREDENTIALS_DELIVERY_FAILED, ENTITY_TYPE, id,
                    Map.of("cause", ex.getMessage()));
            return new DeliveryOutcome(false, userMapper.toResponse(user));
        }
    }

    @Override
    @Transactional
    public UserResponse update(Long id, UpdateUserRequest request) {
        User user = requireById(id);
        String email = normalize(request.email());

        if (!email.equalsIgnoreCase(user.getEmail())
                && usersRepository.findActiveByEmail(email).isPresent()) {
            throw new DuplicateResourceException("Email already registered");
        }
        CatalogItem role = requireActiveRole(request.roleCode());

        String oldRole = user.getRoleItem().getCode();
        if (!oldRole.equals(role.getCode())) {
            if ("ADMIN".equals(oldRole) && usersRepository.countOtherActiveAdmins(id) == 0) {
                throw new BusinessRuleException("Cannot change the role of the last active administrator");
            }
            auditService.record(AuditActionCode.USER_ROLE_CHANGED, ENTITY_TYPE, id,
                    Map.of("from", oldRole, "to", role.getCode()));
        }

        user.setEmail(email);
        user.setFirstName(request.firstName().trim());
        user.setLastName(request.lastName().trim());
        user.setRoleItem(role);
        usersRepository.save(user);

        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse deactivate(Long id, User actor) {
        User user = requireById(id);
        if (user.getId().equals(actor.getId())) {
            throw new BusinessRuleException("You cannot deactivate your own account");
        }
        if (!user.isActive()) {
            return userMapper.toResponse(user);
        }
        if ("ADMIN".equals(user.getRoleCode()) && usersRepository.countOtherActiveAdmins(id) == 0) {
            throw new BusinessRuleException("Cannot deactivate the last active administrator");
        }

        user.setActive(false);
        refreshTokensRepository.revokeAllForUser(id, Instant.now());
        auditService.record(AuditActionCode.USER_DEACTIVATED, ENTITY_TYPE, id,
                Map.of("lastLogin", String.valueOf(user.getLastLogin())));
        usersRepository.save(user);

        log.info("Usuario {} desactivado", id);
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse reactivate(Long id) {
        User user = requireById(id);
        if (user.isActive()) {
            return userMapper.toResponse(user);
        }
        user.setActive(true);
        auditService.record(AuditActionCode.USER_REACTIVATED, ENTITY_TYPE, id, Map.of());
        usersRepository.save(user);

        log.info("Usuario {} reactivado", id);
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public ResendResult resendCredentials(Long id) {
        User user = requireById(id);
        if (!user.isActive()) {
            throw new BusinessRuleException("Cannot send credentials to an inactive user");
        }

        String temporary = passwordGenerator.generate();
        user.setPasswordHash(passwordEncoder.encode(temporary));
        user.setMustChangePassword(true);
        user.setCredentialStatus(CredentialStatus.PENDING_DELIVERY);
        refreshTokensRepository.revokeAllForUser(id, Instant.now());
        auditService.record(AuditActionCode.USER_CREDENTIALS_RESENT, ENTITY_TYPE, id,
                Map.of("email", user.getEmail()));
        usersRepository.save(user);

        log.info("Credenciales regeneradas para el usuario {}", id);
        return new ResendResult(id, temporary);
    }

    @Override
    @Transactional
    public UserResponse markCredentialsDelivered(Long id) {
        User user = requireById(id);
        if (user.getCredentialStatus() != CredentialStatus.PENDING_DELIVERY) {
            throw new BusinessRuleException("User credentials are not pending delivery");
        }
        user.setCredentialStatus(CredentialStatus.DELIVERED);
        auditService.record(AuditActionCode.USER_CREDENTIALS_MARKED_DELIVERED, ENTITY_TYPE, id, Map.of());
        usersRepository.save(user);
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public void changeOwnPassword(Long actorId, ChangePasswordRequest request) {
        User user = requireById(actorId);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new BusinessRuleException("New password must be different from the current one");
        }
        String violation = passwordPolicy.evaluate(request.newPassword(), user.getEmail(),
                user.getFirstName(), user.getLastName());
        if (violation != null) {
            throw new FieldValidationException(List.of(Map.of("field", "newPassword", "message", violation)));
        }

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        refreshTokensRepository.revokeAllExceptLatest(actorId, Instant.now());
        auditService.record(AuditActionCode.USER_PASSWORD_CHANGED, ENTITY_TYPE, actorId, Map.of());
        usersRepository.save(user);
    }

    private Set<Long> scopeFor(User actor) {
        String role = actor.getRoleCode();
        if (!"SUPERVISOR".equals(role)) {
            return null;
        }
        Set<Long> scope = new HashSet<>();
        scope.add(actor.getId());
        List<Long> supervisedTeamIds = teamsRepository
                .findBySupervisorUserIdAndActiveTrueAndDeletedAtIsNull(actor.getId())
                .stream().map(Team::getId).toList();
        if (!supervisedTeamIds.isEmpty()) {
            teamMembersRepository.findByTeamIdInAndLeftAtIsNull(supervisedTeamIds)
                    .stream().map(member -> member.getUser().getId()).forEach(scope::add);
        }
        return scope;
    }

    private boolean canSee(User actor, User target) {
        if (actor.getId().equals(target.getId())) {
            return true;
        }
        String role = actor.getRoleCode();
        return switch (role) {
            case "ADMIN", "COORDINADOR" -> true;
            case "SUPERVISOR" -> {
                Set<Long> scope = scopeFor(actor);
                yield scope != null && scope.contains(target.getId());
            }
            default -> false;
        };
    }

    private User requireById(Long id) {
        return usersRepository.findByIdAndDeletedAtIsNull(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private CatalogItem requireActiveRole(String roleCode) {
        return catalogItemsRepository.findActiveRoleByCode(roleCode)
                .orElseThrow(() -> new BusinessRuleException(
                        "Role '" + roleCode + "' does not exist or is not active"));
    }

    private String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }
}