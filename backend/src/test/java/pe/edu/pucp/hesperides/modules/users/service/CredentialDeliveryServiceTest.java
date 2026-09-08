package pe.edu.pucp.hesperides.modules.users.service;

import com.icegreen.greenmail.util.GreenMail;
import com.icegreen.greenmail.util.ServerSetup;
import jakarta.mail.internet.MimeMessage;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Testcontainers
@SpringBootTest
class CredentialDeliveryServiceTest {

    private static final ServerSetup SMTP = new ServerSetup(0, "127.0.0.1", ServerSetup.PROTOCOL_SMTP);

    @Container
    @SuppressWarnings("resource")
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    private static GreenMail greenMail;

    @BeforeAll
    static void startMailServer() {
        greenMail = new GreenMail(SMTP);
        greenMail.start();
    }

    @AfterAll
    static void stopMailServer() {
        greenMail.stop();
    }

    @DynamicPropertySource
    static void datasourceProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.mail.host", () -> "127.0.0.1");
        registry.add("spring.mail.port", () -> String.valueOf(greenMail.getSmtp().getServerSetup().getPort()));
    }

    @Autowired
    private CredentialDeliveryService deliveryService;

    @Test
    void deliversTheTemporaryPasswordAsPlainTextToTheUserEmail() throws Exception {
        User user = new User();
        user.setFirstName("Maria");
        user.setEmail("mgarcia@pucp.edu.pe");

        deliveryService.deliver(user, "TemporalXyz2026");

        MimeMessage[] received = greenMail.getReceivedMessages();
        assertThat(received).hasSize(1);
        assertThat(received[0].getAllRecipients()[0].toString()).isEqualTo("mgarcia@pucp.edu.pe");
        assertThat(received[0].getSubject()).contains("Hesperides");

        String body = (String) received[0].getContent();
        assertThat(body).contains("Hola Maria");
        assertThat(body).contains("mgarcia@pucp.edu.pe");
        assertThat(body).contains("TemporalXyz2026");
        assertThat(body).contains("http://localhost:3000");
    }

    @Test
    void failsWithTheseCredentialDeliveryExceptionWhenSmtpIsUnreachable() throws Exception {
        ServerSetup dead = new ServerSetup(0, "127.0.0.1", ServerSetup.PROTOCOL_SMTP);
        GreenMail closed = new GreenMail(dead);
        closed.start();
        int port = closed.getSmtp().getServerSetup().getPort();
        closed.stop(); // el puerto queda libre: un SMTP "caído"

        org.springframework.mail.javamail.JavaMailSenderImpl sender = new org.springframework.mail.javamail.JavaMailSenderImpl();
        sender.setHost("127.0.0.1");
        sender.setPort(port);

        CredentialDeliveryService service = withFields(new CredentialDeliveryService(sender));
        User user = new User();
        user.setFirstName("Ana");
        user.setEmail("ana@pucp.edu.pe");

        assertThatThrownBy(() -> service.deliver(user, "TemporalXyz2026"))
                .isInstanceOf(CredentialDeliveryException.class);
    }

    private CredentialDeliveryService withFields(CredentialDeliveryService service) throws Exception {
        java.lang.reflect.Field from =
                CredentialDeliveryService.class.getDeclaredField("from");
        from.setAccessible(true);
        from.set(service, "no-reply@hesperides.test");
        java.lang.reflect.Field url =
                CredentialDeliveryService.class.getDeclaredField("publicUrl");
        url.setAccessible(true);
        url.set(service, "http://localhost:3000");
        return service;
    }
}