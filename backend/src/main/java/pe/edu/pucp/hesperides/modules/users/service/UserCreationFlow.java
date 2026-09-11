package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;

import java.util.Map;

/**
 * El alta de una cuenta: validar, persistir y entregar credenciales. Vive aparte
 * de UsersServiceImpl porque es el flujo más largo del módulo y mantenerlo allí
 * empujaba ese servicio a 277 líneas, muy por encima de su límite de 150.
 */
@Component
@RequiredArgsConstructor
public class UserCreationFlow {

    private static final String ENTITY = "User";

    private final UsersRepository usersRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final AuditService auditService;
    private final CredentialDeliverer credentialDeliverer;

    /** El usuario creado y si su correo llegó a salir. */
    public record Result(User user, boolean delivered) {
    }

    public Result execute(CreateUserRequest request, String normalizedEmail, CatalogItem role) {
        passwordPolicy.validate(request.initialPassword(), normalizedEmail, request.firstName(),
                request.lastName());

        if (usersRepository.findActiveByEmail(normalizedEmail).isPresent()) {
            throw new DuplicateResourceException("Email already registered");
        }

        User saved = usersRepository.saveAndFlush(buildUser(request, normalizedEmail, role));

        auditService.record(AuditActionCode.USER_CREATED, ENTITY, saved.getId(),
                Map.of("email", normalizedEmail, "roleCode", role.getCode()));

        boolean delivered = credentialDeliverer.deliverAndRecord(saved, request.initialPassword());
        return new Result(saved, delivered);
    }

    private User buildUser(CreateUserRequest request, String email, CatalogItem role) {
        User user = new User();
        user.setEmail(email);
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setRoleItem(role);
        user.setPasswordHash(passwordEncoder.encode(request.initialPassword()));
        user.setActive(true);
        // La clave que el administrador eligió deja de valer en cuanto la persona
        // entra una vez (SPEC-100 §2.6).
        user.setMustChangePassword(true);
        // Nace pendiente y pasa a DELIVERED solo si el correo sale: así un fallo
        // a mitad del proceso deja el estado correcto, no uno optimista.
        user.setCredentialStatus(CredentialStatus.PENDING_DELIVERY);
        return user;
    }
}
