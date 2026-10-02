package pe.edu.pucp.hesperides.shared.storage;

import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Descarga la foto de un enlace del catastro (SPEC-103 D-09). Solo de Google
 * Drive, solo imágenes y con límites: así un CSV no puede hacer que el
 * servidor pida direcciones internas ni descargue algo enorme.
 */
@Component
public class PhotoDownloader {

    static final long MAX_BYTES = 15L * 1024 * 1024;
    private static final int MAX_REDIRECTS = 3;
    private static final Duration TIMEOUT = Duration.ofSeconds(20);
    private static final Set<String> ALLOWED_HOSTS =
            Set.of("drive.google.com", "docs.google.com", "lh3.googleusercontent.com");
    private static final Pattern DRIVE_ID = Pattern.compile("drive\\.google\\.com/(?:file/d/|open\\?id=|uc\\?.*id=)([\\w-]+)");

    private final HttpClient http = HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER)
            .connectTimeout(TIMEOUT)
            .build();

    /** Un enlace «ver» de Drive no devuelve la imagen: se pide su versión imagen. */
    public static String downloadUrl(String link) {
        Matcher m = DRIVE_ID.matcher(link);
        return m.find() ? "https://drive.google.com/thumbnail?id=" + m.group(1) + "&sz=w1600" : link;
    }

    public static boolean isAllowedHost(String url) {
        try {
            URI uri = URI.create(url);
            return "https".equals(uri.getScheme()) && uri.getHost() != null && ALLOWED_HOSTS.contains(uri.getHost());
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    public byte[] download(String link) {
        String url = downloadUrl(link.trim());
        if (!isAllowedHost(url)) {
            throw new ValidationException("Photo links must be public Google Drive links");
        }
        // Cada salto de una redirección se vuelve a revisar: el cliente no las sigue solo.
        for (int hop = 0; hop <= MAX_REDIRECTS; hop++) {
            HttpResponse<InputStream> response = send(url);
            int status = response.statusCode();
            if (status >= 300 && status < 400) {
                url = response.headers().firstValue("Location").orElseThrow(() -> new PhotoNotDownloadedException("redirect without location"));
                if (!isAllowedHost(url)) {
                    throw new PhotoNotDownloadedException("redirect outside Google Drive");
                }
                continue;
            }
            if (status != 200) {
                throw new PhotoNotDownloadedException("HTTP " + status + " (is the file shared publicly?)");
            }
            String type = response.headers().firstValue("Content-Type").orElse("");
            if (!type.startsWith("image/")) {
                throw new PhotoNotDownloadedException("not an image (is the file shared publicly?)");
            }
            return readLimited(response.body());
        }
        throw new PhotoNotDownloadedException("too many redirects");
    }

    private HttpResponse<InputStream> send(String url) {
        try {
            return http.send(HttpRequest.newBuilder(URI.create(url)).timeout(TIMEOUT).GET().build(),
                    HttpResponse.BodyHandlers.ofInputStream());
        } catch (IOException e) {
            throw new PhotoNotDownloadedException("network error: " + e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new PhotoNotDownloadedException("interrupted");
        }
    }

    private static byte[] readLimited(InputStream body) {
        try (body) {
            byte[] bytes = body.readNBytes((int) MAX_BYTES + 1);
            if (bytes.length > MAX_BYTES) {
                throw new PhotoNotDownloadedException("larger than 15 MB");
            }
            return bytes;
        } catch (IOException e) {
            throw new PhotoNotDownloadedException("network error: " + e.getMessage());
        }
    }
}
