package pe.edu.pucp.hesperides.shared.security;

/**
 * Los códigos de rol viven aquí y no como literales repetidos en cada
 * PreAuthorize: una cadena mágica escrita veinte veces se escribe mal alguna
 * de ellas, y un rol mal escrito no da error de compilación, da un endpoint
 * que nadie puede usar.
 *
 * Coinciden exactamente con catalog_items.code del catálogo ROLE.
 */
public final class RoleCodes {

    public static final String ADMIN = "ADMIN";
    public static final String COORDINADOR = "COORDINADOR";
    public static final String SUPERVISOR = "SUPERVISOR";
    public static final String OPERARIO = "OPERARIO";

    private RoleCodes() {
    }
}
