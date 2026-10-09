package pe.edu.pucp.hesperides.shared.storage;

import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.net.URI;
import java.time.Duration;
import java.util.Optional;

/**
 * Archivos en un bucket S3 privado (AWS). El navegador los lee con una URL
 * prefirmada de vida corta (SPEC-002 INV-06): el bucket nunca es público.
 */
public class S3FileStorage implements FileStorage {

    private static final Duration URL_VALIDITY = Duration.ofMinutes(10);

    private final S3Client client;
    private final S3Presigner presigner;
    private final String bucket;

    public S3FileStorage(S3Client client, S3Presigner presigner, String bucket) {
        this.client = client;
        this.presigner = presigner;
        this.bucket = bucket;
    }

    @Override
    public void put(String key, byte[] content, String contentType) {
        client.putObject(PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
                RequestBody.fromBytes(content));
    }

    @Override
    public byte[] read(String key) {
        try {
            return client.getObjectAsBytes(GetObjectRequest.builder().bucket(bucket).key(key).build()).asByteArray();
        } catch (NoSuchKeyException e) {
            throw new StoredFileNotFoundException(key);
        }
    }

    @Override
    public void delete(String key) {
        client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
    }

    @Override
    public Optional<URI> directUrl(String key) {
        GetObjectPresignRequest request = GetObjectPresignRequest.builder()
                .signatureDuration(URL_VALIDITY)
                .getObjectRequest(GetObjectRequest.builder().bucket(bucket).key(key).build())
                .build();
        try {
            return Optional.of(presigner.presignGetObject(request).url().toURI());
        } catch (java.net.URISyntaxException e) {
            throw new IllegalStateException("URL prefirmada inválida para " + key, e);
        }
    }
}
