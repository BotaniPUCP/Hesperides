package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.auth.service.RefreshTokenService;
import pe.edu.pucp.hesperides.modules.users.dto.ChangePasswordRequest;
import pe.edu.pucp.hesperides.modules.users.dto.CredentialDeliveryResponse;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/**
 * Las tres operaciones que tocan credenciales: regenerarlas, declarar su entrega
 * manual y el cambio que hace la propia persona.
 *
 * Viven aparte de UsersServiceImpl porque son un bloque cohesivo que no comparte
 * nada con el CRUD — y porque juntas empujaban ese servicio por encima de su
 * límite de 150 líneas.
 */
@Component
@RequiredArgsConstructor
public class UserCredentialOperations {

    private final UsersRepository usersRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;
    private final TemporaryPasswordGenerator temporaryPasswordGenerator;
    private final CredentialDeliverer credentialDeliverer;
    private final RefreshTokenService refreshTokenService;

    public CredentialDeliveryResponse resend(User target) {
        if (!target.isActive()) {
            throw new BusinessRuleException("Cannot send credentials to an inactive user");
        }

        String temporary = temporaryPasswordGenerator.generate();
        target.setPasswordHash(passwordEncoder.encode(temporary));
        target.setMustChangePassword(true);
        // Si se regenera por sospecha de robo, dejar sesiones vivas lo anularía.
        refreshTokenService.revokeAll(target.getId());

        credentialDeliverer.deliverAndRecord(target, temporary);
        return new CredentialDeliveryResponse(
                target.getId(), target.getEmail(), target.getCredentialStatus());
    }

    public void markDelivered(User target) {
        if (target.getCredentialStatus() != CredentialStatus.PENDING_DELIVERY) {
            throw new BusinessRuleException("User credentials are not pending delivery");
        }

        target.setCredentialStatus(CredentialStatus.DELIVERED);
        usersRepository.save(target);
    }

    public void changeOwn(User user, ChangePasswordRequest request) {
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            // ValidationException y no Unauthorized: el token es valido y la
            // sesion existe, lo que falla es un dato del formulario. Un 401 haria
            // que el cliente disparara el flujo de refresh sin motivo.
            throw new ValidationException("Current password is incorrect");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPasswordHash())) {
            throw new BusinessRuleException("New password must be different from the current one");
        }
        passwordPolicy.validate(request.newPassword(), user.getEmail(),
                user.getFirstName(), user.getLastName());

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setMustChangePassword(false);
        usersRepository.save(user);
    }
}
