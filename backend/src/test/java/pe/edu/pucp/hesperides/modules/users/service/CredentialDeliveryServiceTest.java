package pe.edu.pucp.hesperides.modules.users.service;

import com.icegreen.greenmail.junit5.GreenMailExtension;
import com.icegreen.greenmail.util.GreenMailUtil;
import com.icegreen.greenmail.util.ServerSetupTest;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.RegisterExtension;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;

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
        service = new CredentialDeliveryService(sender, "no-reply@hesperides.test",
                "http://localhost:3000");
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
    void theBodyCarriesTheTemporaryPasswordAndTheAccessUrl() {
        service.deliver(user(), "ClaveTemp123");

        String body = GreenMailUtil.getBody(greenMail.getReceivedMessages()[0]);

        assertThat(body).contains("ClaveTemp123");
        assertThat(body).contains("ana.torres@pucp.edu.pe");
        assertThat(body).contains("http://localhost:3000");
    }

    @Test
    void addressesThePersonByTheirFirstName() {
        service.deliver(user(), "ClaveTemp123");

        assertThat(GreenMailUtil.getBody(greenMail.getReceivedMessages()[0])).contains("Ana");
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
                broken, "no-reply@hesperides.test", "http://localhost:3000");

        boolean delivered = failing.deliver(user(), "ClaveTemp123");

        assertThat(delivered).isFalse();
        assertThat(greenMail.getReceivedMessages()).isEmpty();
    }

    @Test
    void theSubjectIdentifiesTheSystem() throws Exception {
        service.deliver(user(), "ClaveTemp123");

        assertThat(greenMail.getReceivedMessages()[0].getSubject()).contains("Hesperides");
    }
}
