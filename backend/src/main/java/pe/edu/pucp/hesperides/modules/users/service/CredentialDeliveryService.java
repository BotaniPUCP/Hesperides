package pe.edu.pucp.hesperides.modules.users.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

/**
 * Envía las credenciales por correo y solo eso (SPEC-100 §5.3).
 *
 * El correo viaja en texto plano: la contraseña debe poder copiarse a mano, y
 * deja de ser válida en cuanto la persona entra una vez (must_change_password).
 * El envío nunca forma parte de la transacción del alta: quien coordina el
 * flujo (UsersService) persiste primero y llama aquí después del commit.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CredentialDeliveryService {

    private static final String SUBJECT = "Acceso al sistema Hesperides - Gestion de Areas Verdes PUCP";

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from}")
    private String from;

    @Value("${hesperides.app.public-url}")
    private String publicUrl;

    public void deliver(User user, String plainPassword) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(user.getEmail());
        message.setSubject(SUBJECT);
        message.setText(body(user, plainPassword));

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            log.warn("Fallo el envio de credenciales a {}: {}", user.getEmail(), ex.getMessage());
            throw new CredentialDeliveryException(ex.getMessage(), ex);
        }
        log.info("Credenciales enviadas a {}", user.getEmail());
    }

    private String body(User user, String plainPassword) {
        return String.format(
                "Hola %s,\n\n" +
                        "Se ha creado tu cuenta en el sistema de gestion de areas verdes del campus.\n\n" +
                        "Correo de acceso: %s\n" +
                        "Contrasena temporal: %s\n\n" +
                        "Ingresa en %s y cambia tu contrasena. El sistema te la pedira\n" +
                        "apenas entres; hasta que la cambies no podras usar el resto de funciones.\n\n" +
                        "Si no esperabas este correo, avisa al administrador del sistema.\n",
                user.getFirstName(), user.getEmail(), plainPassword, publicUrl);
    }
}