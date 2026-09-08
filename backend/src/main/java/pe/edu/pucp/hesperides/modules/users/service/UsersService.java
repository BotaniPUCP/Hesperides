package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.data.domain.Pageable;
import pe.edu.pucp.hesperides.modules.auth.dto.UserResponse;
import pe.edu.pucp.hesperides.modules.auth.entity.CredentialStatus;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UsersPage;

/**
 * Casos de uso de SPEC-100. Las reglas de rol (quién puede crear, ver, leer)
 * se reparten entre el controlador (@PreAuthorize para lo declarativo) y este
 * servicio (lo que depende del dato: alcance de cuadrilla, último ADMIN, etc.).
 */
public interface UsersService {

    UsersPage<UserResponse> list(String search, String roleCode, Boolean isActive, Long teamId,
                                 Pageable pageable, User actor);

    /** Permite la propia ficha a cualquier autenticado; fuera de alcance = 404. */
    UserResponse get(Long id, User actor);

    UserResponse create(CreateUserRequest request);

    /**
     * Se invoca después del commit del alta: intenta el SMTP y ajusta
     * credential_status en su propia transacción (SPEC-100 §5.1 pasos 4-5).
     */
    DeliveryOutcome deliverCredentials(Long id, String plainPassword);

    UserResponse update(Long id, UpdateUserRequest request);

    UserResponse deactivate(Long id, User actor);

    UserResponse reactivate(Long id);

    /** Regenera la clave y revoca sesiones; la entrega la coordina el controller. */
    ResendResult resendCredentials(Long id);

    UserResponse markCredentialsDelivered(Long id);

    void changeOwnPassword(Long actorId, ChangePasswordRequest request);

    record DeliveryOutcome(boolean delivered, UserResponse user) {
    }

    record ResendResult(Long id, String temporaryPassword) {
    }

    record CredentialsDeliveryResult(Long id, String email, CredentialStatus credentialStatus) {
    }
}