package pe.edu.pucp.hesperides.shared.text;

import java.text.Normalizer;
import java.util.Locale;

/** Canonical, punctuation-preserving key shared by scientific and alternative names. */
public final class SpeciesNameKey {

    private SpeciesNameKey() {
    }

    /** Compares text without changing its persisted spelling or validating its name type. */
    public static String key(String input) {
        return normalizedText(input).toLowerCase(Locale.ROOT);
    }

    /** NFC, trimmed, single-space text, before case folding. */
    public static String normalizedText(String input) {
        if (input == null) return "";
        String nfc = Normalizer.normalize(input, Normalizer.Form.NFC);
        StringBuilder result = new StringBuilder();
        boolean pendingSpace = false;
        for (int offset = 0; offset < nfc.length();) {
            int codePoint = nfc.codePointAt(offset);
            offset += Character.charCount(codePoint);
            if (Character.isWhitespace(codePoint) || Character.isSpaceChar(codePoint)) {
                pendingSpace = result.length() > 0;
            } else {
                if (pendingSpace) result.append(' ');
                result.appendCodePoint(codePoint);
                pendingSpace = false;
            }
        }
        return result.toString();
    }
}
