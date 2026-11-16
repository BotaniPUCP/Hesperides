package pe.edu.pucp.hesperides.modules.incidents.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.ConflictException;
import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** Huella de una petición: misma clave con otro contenido es un 409 (SPEC-201 §2.6). */
@Component @RequiredArgsConstructor
public class RequestFingerprint {
    private final ObjectMapper mapper;

    public String of(Object request) {
        return digest(mapper.writeValueAsString(request).getBytes(StandardCharsets.UTF_8));
    }

    public String digest(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }

    public void requireSame(String previous, String current) {
        if (!previous.equals(current)) throw new ConflictException("Request reference already used with different content");
    }
}
