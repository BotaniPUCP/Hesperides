package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.users.entity.CredentialStatus;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;

import java.time.Instant;
import java.util.Map;

/**
 * Entrega credenciales y refleja el resultado en la cuenta. Lo usan el alta y el
 * reenvío, que necesitan exactamente el mismo comportamiento: si se duplicara en
 * ambos, uno de los dos acabaría olvidando auditar el fallo.
 *
 * El envío ocurre después de persistir y su fallo no revierte nada: registrar a
 * una persona no puede depender de que un servicio externo esté disponible
 * (SPEC-100 §5.3).
 */
@Component
@RequiredArgsConstructor
public class CredentialDeliverer {

    private static final String ENTITY = "User";

    private final CredentialDeliveryService credentialDeliveryService;
    private final UsersRepository usersRepository;
    private final AuditService auditService;

    /** @return true si el correo salió; false si falló, dejando la cuenta pendiente. */
    public boolean deliverAndRecord(User user, String rawPassword) {
        boolean delivered = credentialDeliveryService.deliver(user, rawPassword);

        user.setCredentialStatus(
                delivered ? CredentialStatus.DELIVERED : CredentialStatus.PENDING_DELIVERY);
        if (delivered) {
            user.setCredentialsSentAt(Instant.now());
        } else {
            // Un correo que nunca llegó explica meses después por qué esta persona
            // no pudo entrar: eso no puede vivir solo en un log rotado.
            auditService.record(AuditActionCode.USER_CREDENTIALS_DELIVERY_FAILED, ENTITY,
                    user.getId(), Map.of("email", user.getEmail()));
        }
        usersRepository.save(user);
        return delivered;
    }
}
