package pe.edu.pucp.hesperides.shared.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.nio.file.Path;

/**
 * Elige el almacenamiento por variable de entorno. Sin configuración válida el
 * backend no arranca: guardar fotos en un lugar que se pierde es peor que no
 * arrancar.
 */
@Configuration
public class StorageConfig {

    @Bean
    public FileStorage fileStorage(
            @Value("${hesperides.storage.type}") String type,
            @Value("${hesperides.storage.local-dir:}") String localDir,
            @Value("${hesperides.storage.s3-bucket:}") String bucket,
            @Value("${hesperides.storage.s3-region:}") String region) {
        return switch (type) {
            case "local" -> new LocalFileStorage(Path.of(required(localDir, "STORAGE_LOCAL_DIR")));
            case "s3" -> {
                Region awsRegion = Region.of(required(region, "STORAGE_S3_REGION"));
                yield new S3FileStorage(S3Client.builder().region(awsRegion).build(),
                        S3Presigner.builder().region(awsRegion).build(), required(bucket, "STORAGE_S3_BUCKET"));
            }
            default -> throw new IllegalStateException("STORAGE_TYPE debe ser local o s3, no: " + type);
        };
    }

    private static String required(String value, String variable) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(variable + " es obligatoria para el almacenamiento elegido");
        }
        return value;
    }
}
