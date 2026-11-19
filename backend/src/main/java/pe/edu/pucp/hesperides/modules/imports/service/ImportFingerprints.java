package pe.edu.pucp.hesperides.modules.imports.service;

import pe.edu.pucp.hesperides.modules.imports.repository.ImportBatchRepository.Batch;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * Huellas que atan un diálogo de confirmación al plan guardado y a las decisiones exactas de
 * duplicados: si el lote cambió (otro análisis, otra pestaña), la confirmación se rechaza.
 */
public final class ImportFingerprints {

    private ImportFingerprints() {
    }

    public static String planFingerprint(long batchId, String report) {
        return sha256(batchId + "\n" + report);
    }

    public static String confirmationFingerprint(Batch batch, Map<Integer, Boolean> decisions) {
        Map<Integer, Boolean> ordered = new TreeMap<>(decisions == null ? Map.of() : decisions);
        String decisionText = ordered.entrySet().stream()
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("&"));
        return sha256(planFingerprint(batch.id(), batch.report()) + "\n" + decisionText);
    }

    public static void verifyPlanFingerprint(Batch batch, String expected) {
        requireSame(planFingerprint(batch.id(), batch.report()), expected);
    }

    public static void verifyConfirmationFingerprint(Batch batch, Map<Integer, Boolean> decisions, String expected) {
        requireSame(confirmationFingerprint(batch, decisions), expected);
    }

    private static void requireSame(String actual, String expected) {
        if (expected == null || !MessageDigest.isEqual(actual.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8))) {
            throw new BusinessRuleException("This preview changed. Re-analyze the file before confirming");
        }
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable", impossible);
        }
    }
}
