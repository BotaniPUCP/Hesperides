package pe.edu.pucp.hesperides.engine.proximity;

import java.util.Set;
import java.util.regex.Pattern;

/**
 * Qué referencias pueden prestar su nombre a un edificio que no lo tiene.
 *
 * Un área verde, un camino o un estacionamiento están junto a un edificio, pero
 * no son el edificio: nombrarlo así confundiría. Lo mismo una descripción
 * relativa («Frente a Gelarti»), que nombra a otro lugar.
 */
public final class NamingPlaces {

    private static final Set<String> EXCLUDED_CATEGORIES =
            Set.of("Área verde", "Camino", "Entrada", "Estacionamiento", "Externo");

    private static final Pattern RELATIVE_PHRASE = Pattern.compile(
            "^\\s*(dentro|al costado|a un costado|espalda|frente|entre|detr[aá]s|cerca|al lado|junto|costado)\\b",
            Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);

    /** Plus code de Google al inicio de algunos nombres: «WWJ9+5XJ Centro de…». */
    private static final Pattern PLUS_CODE = Pattern.compile(
            "^[23456789CFGHJMPQRVWX]{4,8}\\+[23456789CFGHJMPQRVWX]{2,3}\\s+", Pattern.CASE_INSENSITIVE);

    private NamingPlaces() {
    }

    public static boolean canNameBuilding(String name, String categoryLabel) {
        return !EXCLUDED_CATEGORIES.contains(categoryLabel) && !RELATIVE_PHRASE.matcher(name).find();
    }

    public static String clean(String name) {
        return PLUS_CODE.matcher(name).replaceFirst("");
    }
}
