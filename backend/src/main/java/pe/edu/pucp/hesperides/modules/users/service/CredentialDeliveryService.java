package pe.edu.pucp.hesperides.modules.users.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

import java.nio.charset.StandardCharsets;
import java.util.Map;

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

    /** Identificador en el HTML -> recurso incrustado. El orden no importa. */
    private static final Map<String, String> INLINE_IMAGES = Map.of(
            "logo-botanipucp", "static/mail/logo-botanipucp.png",
            "campus-areas-verdes", "static/mail/campus-areas-verdes.jpg");

    private final JavaMailSender mailSender;
    private final CredentialEmailTemplate emailTemplate;
    private final String from;
    private final String appPublicUrl;

    public CredentialDeliveryService(
            JavaMailSender mailSender,
            CredentialEmailTemplate emailTemplate,
            @Value("${hesperides.mail.from}") String from,
            @Value("${hesperides.mail.app-public-url}") String appPublicUrl) {
        this.mailSender = mailSender;
        this.emailTemplate = emailTemplate;
        this.from = from;
        this.appPublicUrl = appPublicUrl;
    }

    /**
     * @return true si el correo salió; false si el SMTP falló. El llamador marca
     *         la cuenta como PENDING_DELIVERY en ese caso, sin revertir el alta.
     */
    public boolean deliver(User user, String rawPassword) {
        try {
            mailSender.send(compose(user, rawPassword));
            log.info("Credenciales enviadas a userId={}", user.getId());
            return true;
        } catch (MailException | MessagingException ex) {
            // Solo el motivo técnico: el cuerpo del mensaje lleva la contraseña
            // y no puede acabar en un log (SPEC-100 §9.4).
            log.warn("Fallo al enviar credenciales a userId={}: {}", user.getId(), ex.getMessage());
            return false;
        }
    }

    /**
     * Multipart alternativo: los clientes modernos muestran la versión maquetada
     * y los que bloquean HTML siguen leyendo la contraseña en texto plano, en vez
     * de recibir un correo vacío.
     *
     * La contraseña viaja en el cuerpo. Es una debilidad aceptada y mitigada por
     * must_change_password: deja de ser válida en cuanto la persona entra una vez
     * (SPEC-100 §5.3).
     */
    private MimeMessage compose(User user, String rawPassword) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(
                message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                StandardCharsets.UTF_8.name());

        helper.setFrom(from);
        helper.setTo(user.getEmail());
        helper.setSubject(SUBJECT);
        helper.setText(
                emailTemplate.renderText(user, rawPassword, appPublicUrl),
                emailTemplate.renderHtml(user, rawPassword, appPublicUrl));
        addInlineImages(helper);
        return message;
    }

    /**
     * Las imágenes viajan dentro del correo, no como URL remota: así se ven
     * aunque el cliente bloquee la carga externa, que es el comportamiento por
     * defecto de Outlook y Gmail para un remitente desconocido.
     *
     * Van después de setText porque MimeMessageHelper exige que el cuerpo ya
     * exista para poder relacionarlas con él.
     */
    private void addInlineImages(MimeMessageHelper helper) throws MessagingException {
        for (Map.Entry<String, String> image : INLINE_IMAGES.entrySet()) {
            helper.addInline(image.getKey(), new ClassPathResource(image.getValue()));
        }
    }
}
