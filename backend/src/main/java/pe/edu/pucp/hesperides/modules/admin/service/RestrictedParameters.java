package pe.edu.pucp.hesperides.modules.admin.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes;
import pe.edu.pucp.hesperides.modules.admin.dto.SystemParameterResponse;
import pe.edu.pucp.hesperides.modules.users.service.PasswordPolicy;

import java.util.List;
import java.util.Objects;

/**
 * Parámetros que el administrador ve pero no cambia: se fijan en el despliegue
 * o en el código, y cambiarlos exige algo que el rol ADMIN no da.
 *
 * <p>No se siembran en {@code system_parameters} a propósito. Una copia en la
 * tabla se desincronizaría del valor que de verdad se aplica —el remitente ya
 * mostró cómo: la pantalla decía una cosa y el correo salía con otra—. Aquí se
 * leen de la misma propiedad que consume quien los aplica.
 *
 * <p>Nunca se añaden credenciales (usuario/clave SMTP, secreto JWT, clave de
 * la base): esta lista viaja al navegador.
 */
@Component
public class RestrictedParameters {

    private static final long SECONDS_PER_MINUTE = 60;
    private static final String STRING = "STRING";
    private static final String INTEGER = "INTEGER";

    private final List<SystemParameterResponse> parameters;

    public RestrictedParameters(
            @Value("${hesperides.mail.from:no-reply@hesperides.local}") String mailFrom,
            @Value("${spring.mail.host:localhost}") String mailHost,
            @Value("${hesperides.mail.app-public-url}") String appPublicUrl,
            @Value("${hesperides.security.login.window-minutes:15}") long lockWindowMinutes,
            @Value("${hesperides.security.jwt.access-token-validity-seconds}") long accessTokenSeconds,
            @Value("${hesperides.security.jwt.refresh-token-validity-days}") long refreshTokenDays) {
        this.parameters = List.of(
                locked(SystemParameterCodes.SMTP_FROM, "Correo remitente", mailFrom, STRING,
                        "Dirección desde la que se envían los correos. Debe estar verificada en el proveedor de correo"),
                locked(SystemParameterCodes.SMTP_HOST, "Servidor de correo", mailHost, STRING,
                        "Servidor SMTP por el que salen los correos del sistema"),
                locked(SystemParameterCodes.APP_PUBLIC_URL, "URL pública de la aplicación", appPublicUrl, STRING,
                        "Enlace que reciben los usuarios en el correo de credenciales"),
                locked(SystemParameterCodes.PASSWORD_MAX_LENGTH, "Longitud máxima de contraseña",
                        String.valueOf(PasswordPolicy.MAX_LENGTH), INTEGER,
                        "Límite técnico del algoritmo de cifrado: más allá, los caracteres se ignoran"),
                locked(SystemParameterCodes.PASSWORD_MIN_LENGTH_RANGE, "Rango de la longitud mínima",
                        PasswordMinLengthRange.FLOOR + " – " + PasswordMinLengthRange.CEILING, STRING,
                        "Valores entre los que se puede fijar la longitud mínima de contraseña"),
                locked(SystemParameterCodes.LOGIN_LOCK_WINDOW_MINUTES, "Ventana de bloqueo de acceso (minutos)",
                        String.valueOf(lockWindowMinutes), INTEGER,
                        "Periodo en el que se cuentan los intentos fallidos. El bloqueo dura como máximo este tiempo"),
                locked(SystemParameterCodes.SESSION_DURATION_MINUTES, "Duración de la sesión (minutos)",
                        String.valueOf(accessTokenSeconds / SECONDS_PER_MINUTE), INTEGER,
                        "Tiempo de vigencia de cada acceso antes de renovarse automáticamente"),
                locked(SystemParameterCodes.SESSION_MAX_RENEWAL_DAYS, "Duración máxima de sesión renovada (días)",
                        String.valueOf(refreshTokenDays), INTEGER,
                        "Pasado este plazo, el usuario debe volver a iniciar sesión"));
    }

    public List<SystemParameterResponse> all() {
        return parameters;
    }

    public boolean contains(String code) {
        return parameters.stream().anyMatch(parameter -> Objects.equals(parameter.code(), code));
    }

    private static SystemParameterResponse locked(
            String code, String label, String value, String valueType, String description) {
        return new SystemParameterResponse(code, label, value, valueType, description, false);
    }
}
