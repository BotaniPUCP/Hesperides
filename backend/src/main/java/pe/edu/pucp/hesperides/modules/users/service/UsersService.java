package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CredentialDeliveryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;

public interface UsersService {

    Page<UserDetailResponse> findAll(String search, String roleCode, Boolean isActive, Long teamId,
                                     Pageable pageable, String viewerEmail);

    UserDetailResponse findById(Long id, String viewerEmail);

    CreationResult create(CreateUserRequest request);

    UserDetailResponse update(Long id, UpdateUserRequest request);

    UserDetailResponse deactivate(Long id, String actorEmail);

    UserDetailResponse reactivate(Long id);

    CredentialDeliveryResponse resendCredentials(Long id);

    UserDetailResponse markCredentialsDelivered(Long id);

    void changeOwnPassword(String email, ChangePasswordRequest request);

    /**
     * El alta devuelve dos cosas: la cuenta creada y si el correo salió. El
     * controller las necesita separadas porque el `message` de la respuesta
     * cambia según la entrega, aunque el código HTTP siga siendo 201.
     */
    record CreationResult(UserDetailResponse user, boolean delivered) {
    }
}
