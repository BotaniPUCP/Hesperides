package pe.edu.pucp.hesperides.engine.directory;

import java.util.regex.Pattern;

/** RUC peruano: 11 dígitos; 10 para persona natural, 20 para persona jurídica (SPEC-106 §5.4). */
public final class RucRule {

    private static final Pattern RUC = Pattern.compile("^(10|20)[0-9]{9}$");

    private RucRule() {
    }

    public static boolean isValid(String ruc) {
        return ruc != null && RUC.matcher(ruc).matches();
    }
}
