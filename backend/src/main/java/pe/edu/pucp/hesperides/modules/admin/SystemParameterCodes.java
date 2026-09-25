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
    // SMTP_FROM, junto al host y las credenciales del mismo proveedor.
}