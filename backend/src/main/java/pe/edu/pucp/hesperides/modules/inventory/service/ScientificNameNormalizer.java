package pe.edu.pucp.hesperides.modules.inventory.service;

import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.text.SpeciesNameKey;

import java.util.Locale;
import java.util.Set;

/** Canonical spelling and format-only validation for scientific names. */
public final class ScientificNameNormalizer {

    private static final Set<String> MARKERS = Set.of("sp.", "spp.", "subsp.", "var.");

    private ScientificNameNormalizer() {
    }

    public static String normalize(String input) {
        String cleaned = SpeciesNameKey.normalizedText(input);
        if (cleaned.isEmpty()) {
            throw new ValidationException("El nombre científico es obligatorio");
        }
        validateCharactersAndTokens(cleaned);

        String[] tokens = cleaned.split(" ");
        int firstWord = tokens[0].equals("×") ? 1 : 0;
        if (firstWord == tokens.length) {
            throw invalidCharacters();
        }

        for (int i = 0; i < tokens.length; i++) {
            if (tokens[i].equals("×") || isMarker(tokens[i])) {
                tokens[i] = tokens[i].toLowerCase(Locale.ROOT);
            } else if (isCultivarToken(tokens[i])) {
                tokens[i] = normalizeCultivar(tokens[i]);
            } else if (i == firstWord) {
                tokens[i] = capitalizeFirstLetter(tokens[i]);
            } else {
                tokens[i] = tokens[i].toLowerCase(Locale.ROOT);
            }
        }

        String result = String.join(" ", tokens);
        int length = result.codePointCount(0, result.length());
        if (length < 2) {
            throw new ValidationException("El nombre científico debe tener al menos 2 caracteres");
        }
        if (length > 150) {
            throw new ValidationException("El nombre científico no puede exceder 150 caracteres");
        }
        return result;
    }

    public static void validate(String input) {
        normalize(input);
    }

    /** Compatibility wrapper; new matching code should use the shared key directly. */
    @Deprecated
    public static String key(String input) {
        return SpeciesNameKey.key(input);
    }

    private static void validateCharactersAndTokens(String cleaned) {
        int length = cleaned.codePointCount(0, cleaned.length());
        if (length < 2) {
            throw new ValidationException("El nombre científico debe tener al menos 2 caracteres");
        }
        if (length > 150) {
            throw new ValidationException("El nombre científico no puede exceder 150 caracteres");
        }

        String[] tokens = cleaned.split(" ");
        int multiplicationSigns = 0;
        int cultivarNames = 0;
        for (int i = 0; i < tokens.length; i++) {
            String token = tokens[i];
            if (token.equals("×")) {
                multiplicationSigns++;
                if (i == tokens.length - 1) throw invalidCharacters();
                continue;
            }
            if (token.indexOf('×') >= 0) throw invalidCharacters();
            if (isMarker(token)) continue;
            if (isCultivarToken(token)) {
                if (i == 0 || i != tokens.length - 1 || ++cultivarNames > 1) throw invalidCharacters();
                continue;
            }
            if (!isWord(token)) throw invalidCharacters();
        }
        if (multiplicationSigns > 1) throw invalidCharacters();
    }

    private static boolean isMarker(String token) {
        return MARKERS.contains(token.toLowerCase(Locale.ROOT));
    }

    /** Cultivar epithets are conventionally quoted in the source catalog (e.g. 'Variegata'). */
    private static boolean isCultivarToken(String token) {
        if (token.length() < 3) return false;
        char opening = token.charAt(0);
        char closing = token.charAt(token.length() - 1);
        boolean paired = opening == '\'' && closing == '\'' || opening == '‘' && closing == '’';
        return paired && isWord(token.substring(1, token.length() - 1));
    }

    private static String normalizeCultivar(String token) {
        String opening = token.substring(0, 1);
        String closing = token.substring(token.length() - 1);
        String epithet = token.substring(1, token.length() - 1).toLowerCase(Locale.ROOT);
        return opening + capitalizeFirstLetter(epithet) + closing;
    }

    private static boolean isWord(String token) {
        boolean segmentHasLetter = false;
        boolean previousWasHyphen = false;
        for (int offset = 0; offset < token.length();) {
            int codePoint = token.codePointAt(offset);
            offset += Character.charCount(codePoint);
            if (Character.isLetter(codePoint)) {
                segmentHasLetter = true;
                previousWasHyphen = false;
            } else if (isCombiningMark(codePoint)) {
                if (!segmentHasLetter || previousWasHyphen) return false;
            } else if (codePoint == '-') {
                if (!segmentHasLetter || previousWasHyphen || offset == token.length()) return false;
                segmentHasLetter = false;
                previousWasHyphen = true;
            } else {
                return false;
            }
        }
        return segmentHasLetter && !previousWasHyphen;
    }

    private static boolean isCombiningMark(int codePoint) {
        int type = Character.getType(codePoint);
        return type == Character.NON_SPACING_MARK
                || type == Character.COMBINING_SPACING_MARK
                || type == Character.ENCLOSING_MARK;
    }

    private static String capitalizeFirstLetter(String token) {
        String lower = token.toLowerCase(Locale.ROOT);
        int offset = 0;
        while (offset < lower.length()) {
            int codePoint = lower.codePointAt(offset);
            if (Character.isLetter(codePoint)) {
                int end = offset + Character.charCount(codePoint);
                return lower.substring(0, offset)
                        + lower.substring(offset, end).toUpperCase(Locale.ROOT)
                        + lower.substring(end);
            }
            offset += Character.charCount(codePoint);
        }
        return lower;
    }

    private static ValidationException invalidCharacters() {
        return new ValidationException("El nombre científico contiene caracteres o puntuación no permitidos");
    }
}
