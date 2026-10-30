package pe.edu.pucp.hesperides.modules.imports.csv;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.Locale;
import java.util.regex.Pattern;

/**
 * Lectura de celdas según el estándar (SPEC-103 §6.1). Cada método lanza
 * {@link CellException} con un mensaje para la persona que corrige el archivo.
 */
public final class Cells {

    private static final Pattern DECIMAL_COMMA = Pattern.compile("^-?\\d+,\\d+$");

    private Cells() {
    }

    /** Las hojas del cliente usan coma decimal: se acepta y la vista previa lo avisa. */
    public static boolean usesDecimalComma(String text) {
        return DECIMAL_COMMA.matcher(text.trim()).matches();
    }

    public static double decimal(String text) {
        try {
            double value = Double.parseDouble(text.trim().replace(',', '.'));
            if (Double.isNaN(value) || Double.isInfinite(value)) {
                throw new CellException("«" + text + "» is not a number");
            }
            return value;
        } catch (NumberFormatException e) {
            throw new CellException("«" + text + "» is not a number");
        }
    }

    public static double positiveDecimal(String text, double maxExclusive) {
        double value = decimal(text);
        if (value <= 0) {
            throw new CellException("must be greater than 0");
        }
        if (value >= maxExclusive) {
            throw new CellException("must be less than " + (int) maxExclusive);
        }
        return value;
    }

    public static double nonNegativeDecimal(String text, double maxExclusive) {
        double value = decimal(text);
        if (value < 0) {
            throw new CellException("must be 0 or more");
        }
        if (value >= maxExclusive) {
            throw new CellException("must be less than " + (int) maxExclusive);
        }
        return value;
    }

    public static String maxLength(String text, int max) {
        String trimmed = text.trim();
        if (trimmed.length() > max) {
            throw new CellException("must be at most " + max + " characters");
        }
        return trimmed;
    }

    public static int positiveInteger(String text) {
        try {
            int value = Integer.parseInt(text.trim());
            if (value < 1) {
                throw new CellException("must be 1 or more");
            }
            return value;
        } catch (NumberFormatException e) {
            throw new CellException("«" + text + "» is not a whole number");
        }
    }

    public static LocalDate date(String text) {
        try {
            return LocalDate.parse(text.trim());
        } catch (DateTimeParseException e) {
            throw new CellException("«" + text + "» is not a date YYYY-MM-DD");
        }
    }

    /** si / no; vacío es «no evaluado» y se lee como nulo. */
    public static Boolean yesNo(String text) {
        return switch (text.trim().toLowerCase(Locale.ROOT)) {
            case "" -> null;
            case "si", "sí" -> Boolean.TRUE;
            case "no" -> Boolean.FALSE;
            default -> throw new CellException("«" + text + "» must be si or no");
        };
    }

    /** Un error de una celda; quien lo atrapa le añade fila y columna. */
    public static class CellException extends RuntimeException {
        public CellException(String message) {
            super(message);
        }
    }
}
