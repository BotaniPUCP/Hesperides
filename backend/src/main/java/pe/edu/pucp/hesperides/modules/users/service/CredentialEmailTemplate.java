package pe.edu.pucp.hesperides.modules.users.service;

import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.auth.entity.User;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

/**
 * Arma las dos versiones del correo de credenciales: la maquetada y la de texto
 * plano. Vive aparte de {@link CredentialDeliveryService} porque redactar la
 * carta y hablar con el SMTP cambian por razones distintas.
 *
 * La plantilla se lee una vez al arrancar: un fichero ausente rompe el contexto
 * en el arranque y no en el primer alta de usuario (fail fast).
 */
@Component
public class CredentialEmailTemplate {

    private static final String TEMPLATE_PATH = "templates/mail/credentials.html";

    private final String template;

    public CredentialEmailTemplate() {
        this.template = readTemplate();
    }

    public String renderHtml(User user, String rawPassword, String appPublicUrl) {
        return template
                .replace("{{firstName}}", escape(user.getFirstName()))
                .replace("{{email}}", escape(user.getEmail()))
                .replace("{{password}}", escape(rawPassword))
                .replace("{{appUrl}}", escape(appPublicUrl));
    }

    /**
     * La alternativa para clientes que no muestran HTML. Dice exactamente lo
     * mismo: si divergen, la mitad de las personas recibe otras instrucciones.
     */
    public String renderText(User user, String rawPassword, String appPublicUrl) {
        return """
                Hola %s,

                Se ha creado tu cuenta en Hesperides, el sistema con el que se gestionan
                las áreas verdes del campus. Desde ahí podrás consultar y registrar el
                trabajo que corresponda a tu rol.

                Tus credenciales de acceso:

                  Correo de acceso:     %s
                  Contraseña temporal:  %s

                Ingresa en %s

                Esta contraseña es temporal: el sistema te pedirá reemplazarla la primera
                vez que ingreses y, hasta que lo hagas, no podrás usar el resto de
                funciones. No la compartas con nadie; nadie del equipo te la va a pedir.

                Si no esperabas este correo, avísale al administrador del sistema.

                --
                BotaniPUCP · Gestión de Áreas Verdes
                Av. Universitaria 1801, San Miguel, Lima 32, Perú

                Este mensaje se envió a %s porque se creó una cuenta a su nombre. Es un
                correo automático del sistema: no respondas a esta dirección.
                """
                .formatted(user.getFirstName(), user.getEmail(), rawPassword, appPublicUrl,
                        user.getEmail());
    }

    /**
     * Un nombre o una contraseña con &lt; o &amp; romperían la maqueta, y el nombre
     * llega desde un formulario: nada interpolado entra crudo en el HTML.
     */
    private String escape(String value) {
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;");
    }

    private String readTemplate() {
        try {
            return new ClassPathResource(TEMPLATE_PATH)
                    .getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new UncheckedIOException(
                    "No se encontró la plantilla del correo de credenciales: " + TEMPLATE_PATH, ex);
        }
    }
}
