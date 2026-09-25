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
    public static final String MAIL_FROM = "MAIL_FROM";
    public static final String CAMPUS_TOTAL_HECTARES = "CAMPUS_TOTAL_HECTARES";
}