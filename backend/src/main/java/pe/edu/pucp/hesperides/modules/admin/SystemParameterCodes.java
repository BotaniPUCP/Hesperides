package pe.edu.pucp.hesperides.modules.admin;

/**
 * Códigos de los parámetros de sistema. Son los valores estables que la lógica
 * de negocio usa para leerlos (SPEC-002 §4.9): un renombrado de la fila rompería
 * cada consumidor, así que no se comparan cadenas sueltas desde los servicios.
 */
public final class SystemParameterCodes {

    private SystemParameterCodes() {
    }

    public static final String PASSWORD_MIN_LENGTH = "PASSWORD_MIN_LENGTH";
    public static final String LOGIN_MAX_ATTEMPTS = "LOGIN_MAX_ATTEMPTS";
    public static final String CAMPUS_TOTAL_HECTARES = "CAMPUS_TOTAL_HECTARES";

    // No hay MAIL_FROM, y no debe volver: el remitente de correo solo es valido
    // si el proveedor lo tiene verificado, y esta aplicacion no puede
    // comprobarlo. Uno sin verificar recibe «250 OK» y se descarta en silencio,
    // asi que ofrecerlo como parametro prometia un control inexistente. Vive en
    // SMTP_FROM, junto al host y las credenciales del mismo proveedor, y se
    // muestra en solo lectura con el codigo de abajo.

    // Restringidos: se muestran pero no viven en la tabla. Su valor se lee de
    // donde se aplica (entorno, application.yml o constantes del codigo).
    public static final String SMTP_FROM = "SMTP_FROM";
    public static final String SMTP_HOST = "SMTP_HOST";
    public static final String APP_PUBLIC_URL = "APP_PUBLIC_URL";
    public static final String PASSWORD_MAX_LENGTH = "PASSWORD_MAX_LENGTH";
    public static final String PASSWORD_MIN_LENGTH_RANGE = "PASSWORD_MIN_LENGTH_RANGE";
    public static final String LOGIN_LOCK_WINDOW_MINUTES = "LOGIN_LOCK_WINDOW_MINUTES";
    public static final String SESSION_DURATION_MINUTES = "SESSION_DURATION_MINUTES";
    public static final String SESSION_MAX_RENEWAL_DAYS = "SESSION_MAX_RENEWAL_DAYS";
}