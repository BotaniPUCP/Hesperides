package pe.edu.pucp.hesperides.shared.storage;

import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Almacenamiento de fotos (SPEC-002 §5.4, SPEC-103 D-07 y D-09), sin red ni base de datos. */
class StorageTest {

    static byte[] png(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "png", out);
        return out.toByteArray();
    }

    static BufferedImage read(byte[] bytes) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(bytes));
    }

    @Nested
    class LocalStorage {

        @TempDir
        Path root;

        @Test
        void savesReadsAndDeletesAFile() {
            LocalFileStorage storage = new LocalFileStorage(root);
            storage.put("green-elements/EV-000001/a.jpg", new byte[] {1, 2, 3}, "image/jpeg");

            assertThat(storage.read("green-elements/EV-000001/a.jpg")).containsExactly(1, 2, 3);
            assertThat(Files.exists(root.resolve("green-elements/EV-000001/a.jpg"))).isTrue();

            storage.delete("green-elements/EV-000001/a.jpg");
            assertThat(Files.exists(root.resolve("green-elements/EV-000001/a.jpg"))).isFalse();
        }

        @Test
        void aKeyCannotEscapeTheStorageDirectory() {
            LocalFileStorage storage = new LocalFileStorage(root);

            assertThatThrownBy(() -> storage.put("../fuera.jpg", new byte[] {1}, "image/jpeg"))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        @Test
        void aMissingFileFailsClearly() {
            assertThatThrownBy(() -> new LocalFileStorage(root).read("no/existe.jpg"))
                    .isInstanceOf(StoredFileNotFoundException.class);
        }

        @Test
        void localFilesHaveNoDirectUrl() {
            // El backend los sirve tras verificar el permiso; en S3 sería una URL prefirmada.
            assertThat(new LocalFileStorage(root).directUrl("a.jpg")).isEmpty();
        }
    }

    @Nested
    class Processing {

        @Test
        void aLargePhotoIsReducedAndGetsAThumbnail() throws IOException {
            ProcessedPhoto photo = PhotoProcessor.process(png(4000, 3000));

            BufferedImage full = read(photo.full());
            BufferedImage thumb = read(photo.thumbnail());
            assertThat(full.getWidth()).isEqualTo(1600);
            assertThat(full.getHeight()).isEqualTo(1200);
            assertThat(thumb.getWidth()).isEqualTo(400);
            assertThat(photo.contentType()).isEqualTo("image/jpeg");
        }

        @Test
        void aSmallPhotoIsNotEnlarged() throws IOException {
            ProcessedPhoto photo = PhotoProcessor.process(png(800, 600));

            assertThat(read(photo.full()).getWidth()).isEqualTo(800);
            assertThat(read(photo.thumbnail()).getWidth()).isEqualTo(400);
        }

        @Test
        void somethingThatIsNotAnImageIsRejected() {
            assertThatThrownBy(() -> PhotoProcessor.process("<html>no es foto</html>".getBytes()))
                    .isInstanceOf(ValidationException.class);
        }
    }

    @Nested
    class DownloadRules {

        @Test
        void aDriveViewLinkIsDownloadedThroughItsImageEndpoint() {
            assertThat(PhotoDownloader.downloadUrl("https://drive.google.com/file/d/abc_DEF-1/view?usp=sharing"))
                    .isEqualTo("https://drive.google.com/thumbnail?id=abc_DEF-1&sz=w1600");
        }

        @Test
        void onlyGoogleDriveHostsAreAllowed() {
            assertThat(PhotoDownloader.isAllowedHost("https://drive.google.com/x")).isTrue();
            assertThat(PhotoDownloader.isAllowedHost("https://lh3.googleusercontent.com/x")).isTrue();
            // Evita que un CSV haga que el servidor pida direcciones internas (D-09).
            assertThat(PhotoDownloader.isAllowedHost("http://localhost:8080/api/v1/users")).isFalse();
            assertThat(PhotoDownloader.isAllowedHost("http://169.254.169.254/latest/meta-data")).isFalse();
            assertThat(PhotoDownloader.isAllowedHost("https://drive.google.com.evil.example/x")).isFalse();
            assertThat(PhotoDownloader.isAllowedHost("ftp://drive.google.com/x")).isFalse();
        }

        @Test
        void aForeignLinkIsAFormatError() {
            assertThatThrownBy(() -> new PhotoDownloader().download("http://localhost:8080/x"))
                    .isInstanceOf(ValidationException.class);
        }
    }
}
