package pe.edu.pucp.hesperides.modules.admin.service;

/**
 * Rango que el administrador puede fijar como longitud mínima: 12 a 25. Vive
 * aparte porque lo leen dos piezas —la validación de la escritura y la ficha de
 * solo lectura que lo muestra— y ambas deben citar la misma cifra.
 *
 * <p>El techo NO es el límite técnico. BCrypt trunca a 72 bytes, y dejar que
 * el mínimo llegara hasta ahí producía una política imposible de cumplir: con
 * mínimo 72 y máximo 72, la única contraseña válida tendría exactamente esa
 * longitud. Se vio en la práctica al probar la pantalla.
 *
 * <p>25 es una decisión de producto, no una constante derivada: por encima de
 * eso la política deja de ser exigente y empieza a ser inusable, y la gente
 * termina apuntando la contraseña en un papel.
 */
public final class PasswordMinLengthRange {

    private PasswordMinLengthRange() {
    }

    public static final int FLOOR = 12;
    public static final int CEILING = 25;
}
