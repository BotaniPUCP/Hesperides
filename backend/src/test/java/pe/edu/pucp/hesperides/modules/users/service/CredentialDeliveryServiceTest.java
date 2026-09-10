package pe.edu.pucp.hesperides.modules.users.service;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.ServerSetupTest;
import jakarta.mail.BodyPart;
import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CredentialDeliveryServiceTest {

    @RegisterExtension
    static GreenMailExtension greenMail = new GreenMailExtension(ServerSetupTest.SMTP);

    private CredentialDeliveryService service;

    @BeforeEach
    void setUp() {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost("localhost");
        sender.setPort(greenMail.getSmtp().getPort());
        service = new CredentialDeliveryService(sender, new CredentialEmailTemplate(),
                "no-reply@hesperides.test", "https://hesperides.test");
    }

    private User user() {
        CatalogItem role = new CatalogItem();
        role.setCode("OPERARIO");
        role.setLabel("Operario de campo");

        User user = new User();
        user.setEmail("ana.torres@pucp.edu.pe");
        user.setFirstName("Ana");
        user.setLastName("Torres");
        user.setRoleItem(role);
        return user;
    }

    @Test
    void sendsTheEmailAndReportsSuccess() throws Exception {
        boolean delivered = service.deliver(user(), "ClaveTemp123");

        assertThat(delivered).isTrue();
        assertThat(greenMail.getReceivedMessages()).hasSize(1);

        MimeMessage received = greenMail.getReceivedMessages()[0];
        assertThat(received.getAllRecipients()[0].toString()).isEqualTo("ana.torres@pucp.edu.pe");
    }

    @Test
    void theBodyCarriesTheTemporaryPasswordAndTheAccessUrl() throws Exception {
        service.deliver(user(), "ClaveTemp123");

        assertThat(plainPart()).contains("ClaveTemp123", "ana.torres@pucp.edu.pe",
                "https://hesperides.test");
        assertThat(htmlPart()).contains("ClaveTemp123", "ana.torres@pucp.edu.pe",
                "https://hesperides.test");
    }

    @Test
    void addressesThePersonByTheirFirstName() throws Exception {
        service.deliver(user(), "ClaveTemp123");

        assertThat(plainPart()).contains("Ana");
        assertThat(htmlPart()).contains("Ana");
    }

    @Test
    void offersBothAnHtmlAndAPlainTextVersion() throws Exception {
        service.deliver(user(), "ClaveTemp123");

        MimeMessage received = greenMail.getReceivedMessages()[0];

        assertThat(received.getContentType()).contains("multipart/");
        assertThat(htmlPart()).contains("<html", "</html>");
        assertThat(plainPart()).doesNotContain("<html");
    }

    @Test
    void embedsTheBrandImagesSoTheyRenderWithoutARemoteFetch() throws Exception {
        service.deliver(user(), "ClaveTemp123");

        // El HTML las referencia por cid: si el adjunto no viaja, salen rotas.
        assertThat(htmlPart()).contains("cid:logo-botanipucp", "cid:campus-areas-verdes");
        assertThat(contentIds()).contains("logo-botanipucp", "campus-areas-verdes");
    }

    @Test
    void escapesTheDataItInterpolatesIntoTheHtml() throws Exception {
        User user = user();
        user.setFirstName("Ana <script>alert(1)</script>");

        service.deliver(user, "Clave&Temp<123>");

        assertThat(htmlPart()).doesNotContain("<script>");
        assertThat(htmlPart()).contains("&lt;script&gt;", "Clave&amp;Temp&lt;123&gt;");
    }

    @Test
    void sendsFromTheConfiguredAddress() throws Exception {
        service.deliver(user(), "ClaveTemp123");

        assertThat(greenMail.getReceivedMessages()[0].getFrom()[0].toString())
                .isEqualTo("no-reply@hesperides.test");
    }

    @Test
    void reportsFailureWithoutThrowingWhenSmtpIsUnreachable() {
        // Un puerto donde no escucha nadie: el alta debe poder continuar, asi
        // que el servicio informa del fallo en vez de propagarlo (SPEC-100 §5.3).
        JavaMailSenderImpl broken = new JavaMailSenderImpl();
        broken.setHost("localhost");
        broken.setPort(1);
        CredentialDeliveryService failing = new CredentialDeliveryService(
                broken, new CredentialEmailTemplate(), "no-reply@hesperides.test",
                "https://hesperides.test");

        boolean delivered = failing.deliver(user(), "ClaveTemp123");

        assertThat(delivered).isFalse();
        assertThat(greenMail.getReceivedMessages()).isEmpty();
    }

    /** El texto plano y el HTML son la misma carta: ambos deben decir lo mismo. */
    private String plainPart() throws Exception {
        return partWithType("text/plain");
    }

    private String htmlPart() throws Exception {
        return partWithType("text/html");
    }

    private String partWithType(String mimeType) throws Exception {
        MimeMessage received = greenMail.getReceivedMessages()[0];
        String found = findPart(received.getContent(), mimeType);
        if (found == null) {
            throw new AssertionError("El correo no trae una parte " + mimeType);
        }
        return found;
    }

    private List<String> contentIds() throws Exception {
        List<String> ids = new ArrayList<>();
        collectContentIds(greenMail.getReceivedMessages()[0].getContent(), ids);
        return ids;
    }

    private void collectContentIds(Object content, List<String> ids) throws Exception {
        if (!(content instanceof MimeMultipart multipart)) {
            return;
        }
        for (int i = 0; i < multipart.getCount(); i++) {
            BodyPart part = multipart.getBodyPart(i);
            if (part instanceof MimeBodyPart mimePart && mimePart.getContentID() != null) {
                ids.add(mimePart.getContentID().replaceAll("[<>]", ""));
            }
            collectContentIds(part.getContent(), ids);
        }
    }

    /** Las partes cuelgan de un multipart anidado, no del nivel superior. */
    private String findPart(Object content, String mimeType) throws Exception {
        if (!(content instanceof MimeMultipart multipart)) {
            return null;
        }
        for (int i = 0; i < multipart.getCount(); i++) {
            BodyPart part = multipart.getBodyPart(i);
            if (part.isMimeType(mimeType)) {
                // getContent() aplica el decodificado quoted-printable; el cuerpo
                // crudo parte las lineas largas y romperia las comparaciones.
                return part.getContent().toString();
            }
            String nested = findPart(part.getContent(), mimeType);
            if (nested != null) {
                return nested;
            }
        }
        return null;
    }

    @Test
    void theSubjectIdentifiesTheSystem() throws Exception {
        service.deliver(user(), "ClaveTemp123");

        assertThat(greenMail.getReceivedMessages()[0].getSubject()).contains("Hesperides");
    }
}
