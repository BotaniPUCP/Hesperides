package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import pe.edu.pucp.hesperides.shared.storage.FileStorage;

@Component @Slf4j @RequiredArgsConstructor
public class IncidentFiles {
    public static final long MAX_BYTES = 5 * 1024 * 1024;
    private static final String PREFIX = "incidents/";
    private final FileStorage storage;

    public String contentType(byte[] bytes) {
        if (bytes.length == 0 || bytes.length > MAX_BYTES) throw new ValidationException("Invalid photo size");
        String prefix = HexFormat.of().formatHex(bytes, 0, Math.min(12, bytes.length));
        if (prefix.startsWith("ffd8ff")) return "image/jpeg";
        if (prefix.startsWith("89504e470d0a1a0a")) return "image/png";
        if (bytes.length >= 12 && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                && new String(bytes, 8, 4, StandardCharsets.US_ASCII).equals("WEBP")) return "image/webp";
        throw new ValidationException("Unsupported photo format");
    }

    public String write(byte[] bytes, String contentType) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            throw new IllegalStateException("Incident photos must be stored within a transaction");
        }
        String key = PREFIX + UUID.randomUUID();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) removeIncomplete(key);
            }
        });
        try {
            storage.put(key, bytes, contentType);
        } catch (RuntimeException ex) {
            removeIncomplete(key);
            throw ex;
        }
        return key;
    }

    public byte[] read(String key) {
        if (!key.startsWith(PREFIX)) throw new IllegalArgumentException("Invalid storage key");
        String name = key.substring(PREFIX.length());
        if (!UUID.fromString(name).toString().equals(name)) throw new IllegalArgumentException("Invalid storage key");
        return storage.read(key);
    }

    private void removeIncomplete(String key) {
        try { storage.delete(key); }
        catch (RuntimeException ex) { log.error("Could not remove an uncommitted photo", ex); }
    }
}
