package pe.edu.pucp.hesperides.modules.imports.specimens;

import org.junit.jupiter.api.Test;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.storage.UploadLimits;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** Los límites del ZIP de fotos (SPEC-104 D-07): 25 MB por foto. */
class PhotoFilesTest {

    private static byte[] zipWith(String name, int size) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            zip.putNextEntry(new ZipEntry(name));
            zip.write(new byte[size]);
            zip.closeEntry();
        }
        return out.toByteArray();
    }

    private static byte[] zipWithNames(String... names) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(out)) {
            for (String name : names) {
                zip.putNextEntry(new ZipEntry(name));
                zip.write(1);
                zip.closeEntry();
            }
        }
        return out.toByteArray();
    }

    @Test
    void aPhotoOfExactly25MbFits() throws IOException {
        int limit = (int) UploadLimits.MAX_PHOTO_BYTES;

        assertThat(PhotoFiles.read(zipWith("a.jpg", limit))).containsKey("a.jpg");
    }

    @Test
    void aPhotoOneByteOver25MbIsRejected() throws IOException {
        int over = (int) UploadLimits.MAX_PHOTO_BYTES + 1;

        assertThatThrownBy(() -> PhotoFiles.read(zipWith("a.jpg", over)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("25 MB");
    }

    @Test
    void strictImportModeRejectsCorruptArchivesButAcceptsAValidEmptyZip() throws IOException {
        assertThatThrownBy(() -> PhotoFiles.readStrict("not a zip".getBytes(StandardCharsets.UTF_8)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("valid ZIP");

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (ZipOutputStream ignored = new ZipOutputStream(out)) {
            // A ZIP containing no files is still a valid optional photo bundle.
        }
        assertThat(PhotoFiles.readStrict(out.toByteArray())).isEmpty();
    }

    @Test
    void strictImportModeRejectsBasenamesThatWouldMakePhotoResolutionAmbiguous() throws IOException {
        byte[] zip = zipWithNames("first/tree.jpg", "second/tree.jpg");

        assertThatThrownBy(() -> PhotoFiles.readStrict(zip))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("more than one file named");
        assertThat(PhotoFiles.read(zip)).containsOnlyKeys("tree.jpg");
    }

    @Test
    void strictImportModeStillAcceptsTheConfiguredPhotoAndUncompressedLimits() throws IOException {
        assertThat(PhotoFiles.readStrict(zipWith("a.jpg", (int) UploadLimits.MAX_PHOTO_BYTES)))
                .containsKey("a.jpg");
        assertThatThrownBy(() -> PhotoFiles.readStrict(zipWith("a.jpg", (int) UploadLimits.MAX_PHOTO_BYTES + 1)))
                .isInstanceOf(ValidationException.class)
                .hasMessageContaining("25 MB");
    }

    @Test
    void theLimitsAreTheAgreedOnes() {
        assertThat(UploadLimits.MAX_PHOTO_BYTES).isEqualTo(25L * 1024 * 1024);
        assertThat(UploadLimits.MAX_ZIP_UNCOMPRESSED_BYTES).isEqualTo(500L * 1024 * 1024);
    }
}
