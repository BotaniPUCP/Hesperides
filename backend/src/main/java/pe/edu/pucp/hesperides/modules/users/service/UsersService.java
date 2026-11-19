package pe.edu.pucp.hesperides.modules.users.service;

import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CreateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CredentialDeliveryResponse;
import pe.edu.pucp.hesperides.modules.users.dto.UpdateUserRequest;
import pe.edu.pucp.hesperides.modules.users.dto.UserDetailResponse;

import java.util.List;

public interface UsersService {

    /** Todos los que ve quien pregunta, activos e inactivos, por apellido: se filtran en el navegador (SPEC-119). */
    List<UserDetailResponse> all(String viewerEmail);

    UserDetailResponse findById(Long id, String viewerEmail);

    CreationResult create(CreateUserRequest request);

    UserDetailResponse update(Long id, UpdateUserRequest request);

    UserDetailResponse deactivate(Long id, String actorEmail);

    UserDetailResponse reactivate(Long id);

    CredentialDeliveryResponse resendCredentials(Long id, String actorEmail);

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
