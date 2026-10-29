package pe.edu.pucp.hesperides.modules.interventions.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Locale;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.UploadLimits;

/** Validates original bytes; immutable evidence is never recompressed. */
@Component
public class InterventionEvidenceFiles {
    public record Format(String contentType, String extension) {}

    public Format validate(byte[] bytes) {
        if (bytes == null || bytes.length == 0 || bytes.length > UploadLimits.MAX_PHOTO_BYTES) {
            throw new ValidationException("A nonempty photo up to " + UploadLimits.MAX_PHOTO_LABEL + " is required");
        }
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw invalid();
            ImageReader reader = readers.next();
            try {
                String format = reader.getFormatName().toLowerCase(Locale.ROOT);
                Format detected = switch (format) {
                    case "jpeg", "jpg" -> new Format("image/jpeg", "jpg");
                    case "png" -> new Format("image/png", "png");
                    case "webp" -> new Format("image/webp", "webp");
                    default -> throw invalid();
                };
                reader.setInput(input, true, true);
                int width = reader.getWidth(0), height = reader.getHeight(0);
                if (width <= 0 || height <= 0) throw invalid();
                var parameters = reader.getDefaultReadParam();
                // Bound decoder output memory without limiting the original photo dimensions.
                int step = (int)Math.max(1, (Math.max((long)width, height) + 2047) / 2048);
                parameters.setSourceSubsampling(step, step, 0, 0);
                if (reader.read(0, parameters) == null) throw invalid();
                return detected;
            } finally {
                reader.dispose();
            }
        } catch (IOException | IllegalArgumentException ex) {
            throw invalid();
        }
    }

    private ValidationException invalid() {
        return new ValidationException("The file must contain a readable JPEG, PNG or WebP photo");
    }
}
