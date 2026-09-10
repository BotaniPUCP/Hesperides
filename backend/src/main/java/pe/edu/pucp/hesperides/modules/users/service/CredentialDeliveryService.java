package pe.edu.pucp.hesperides.modules.users.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

/**
 * Único punto del sistema que habla con el servidor SMTP.
 *
 * Nunca lanza: un fallo de entrega no invalida el alta de la persona, así que
 * informa con un boolean y el llamador decide (SPEC-100 §5.3). Lanzar obligaría
 * a cada llamador a capturar y continuar, que es la forma torpe de decir lo
 * mismo.
 */
@Slf4j
@Service
public class CredentialDeliveryService {

    private static final String SUBJECT =
            "Acceso al sistema Hesperides — Gestión de Áreas Verdes PUCP";

    private final JavaMailSender mailSender;
    private final String from;
    private final String appPublicUrl;

    public CredentialDeliveryService(
            JavaMailSender mailSender,
            @Value("${hesperides.mail.from}") String from,
            @Value("${hesperides.mail.app-public-url}") String appPublicUrl) {
        this.mailSender = mailSender;
        this.from = from;
        this.appPublicUrl = appPublicUrl;
    }

    /**
     * @return true si el correo salió; false si el SMTP falló. El llamador marca
     *         la cuenta como PENDING_DELIVERY en ese caso, sin revertir el alta.
     */
    public boolean deliver(User user, String rawPassword) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(user.getEmail());
        message.setSubject(SUBJECT);
        message.setText(buildBody(user, rawPassword));

        try {
            mailSender.send(message);
            log.info("Credenciales enviadas a userId={}", user.getId());
            return true;
        } catch (MailException ex) {
            // Solo el motivo técnico: el cuerpo del mensaje lleva la contraseña
            // y no puede acabar en un log (SPEC-100 §9.4).
            log.warn("Fallo al enviar credenciales a userId={}: {}", user.getId(), ex.getMessage());
            return false;
        }
    }

    /**
     * Texto plano, sin HTML: no hay nada que maquetar, no dispara filtros de spam
     * y no necesita plantillas.
     *
     * La contraseña viaja en el cuerpo. Es una debilidad aceptada y mitigada por
     * must_change_password: deja de ser válida en cuanto la persona entra una vez
     * (SPEC-100 §5.3).
     */
    private String buildBody(User user, String rawPassword) {
        return """
                Hola %s,

                Se ha creado tu cuenta en el sistema de gestión de áreas verdes del campus.

                Correo de acceso: %s
                Contraseña temporal: %s

                Ingresa en %s y cambia tu contraseña. El sistema te la pedirá apenas
                entres; hasta que la cambies no podrás usar el resto de funciones.

                Si no esperabas este correo, avisa al administrador del sistema.
                """
                .formatted(user.getFirstName(), user.getEmail(), rawPassword, appPublicUrl);
    }
}
