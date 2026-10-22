package pe.edu.pucp.hesperides.modules.incidents.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.HexFormat;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;

@Component @Slf4j
public class IncidentFiles {
    public static final long MAX_BYTES = 5 * 1024 * 1024;
    private final Path root;

    public IncidentFiles(@Value("${hesperides.incidents.upload-dir}") String directory) {
        root = Path.of(directory).toAbsolutePath().normalize();
    }

    public String contentType(byte[] bytes) {
        if (bytes.length == 0 || bytes.length > MAX_BYTES) throw new ValidationException("Invalid photo size");
        String prefix = HexFormat.of().formatHex(bytes, 0, Math.min(12, bytes.length));
        if (prefix.startsWith("ffd8ff")) return "image/jpeg";
        if (prefix.startsWith("89504e470d0a1a0a")) return "image/png";
        if (bytes.length >= 12 && new String(bytes, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                && new String(bytes, 8, 4, StandardCharsets.US_ASCII).equals("WEBP")) return "image/webp";
        throw new ValidationException("Unsupported photo format");
    }

    public String write(byte[] bytes) {
        String key = UUID.randomUUID().toString();
        Path path = root.resolve(key);
        try {
            Files.createDirectories(root);
            Files.write(path, bytes, StandardOpenOption.CREATE_NEW);
        } catch (IOException ex) {
            removeIncomplete(path);
            throw new UncheckedIOException(ex);
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) removeIncomplete(path);
            }
        });
        return key;
    }

    public byte[] read(String key) {
        Path path = root.resolve(key).normalize();
        if (!path.getParent().equals(root)) throw new IllegalStateException("Invalid storage key");
        try { return Files.readAllBytes(path); }
        catch (IOException ex) { throw new UncheckedIOException(ex); }
    }

    private void removeIncomplete(Path path) {
        try { Files.deleteIfExists(path); }
        catch (IOException ex) { log.error("Could not remove an uncommitted photo", ex); }
    }
}
