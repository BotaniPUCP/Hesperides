package pe.edu.pucp.hesperides.modules.inventory.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DrivePhotoLinksTest {

    @Test
    void aDriveViewLinkBecomesItsThumbnail() {
        assertThat(DrivePhotoLinks.thumbnail(
                "https://drive.google.com/file/d/1-NeMHz57fE9OH8iZRXDXDjqDAeoIghyi/view?usp=drivesdk"))
                .isEqualTo("https://drive.google.com/thumbnail?id=1-NeMHz57fE9OH8iZRXDXDjqDAeoIghyi&sz=w1000");
    }

    @Test
    void anOpenLinkWithAnIdParameterAlsoWorks() {
        assertThat(DrivePhotoLinks.thumbnail("https://drive.google.com/open?id=abc_DEF-123"))
                .isEqualTo("https://drive.google.com/thumbnail?id=abc_DEF-123&sz=w1000");
    }

    @Test
    void aLinkFromAnotherSiteIsKeptAsIs() {
        // Cuando las fotos pasen a nuestro almacenamiento, sus enlaces ya serán directos.
        assertThat(DrivePhotoLinks.thumbnail("https://cdn.example.org/foto.jpg"))
                .isEqualTo("https://cdn.example.org/foto.jpg");
    }

    @Test
    void noLinkMeansNoThumbnail() {
        assertThat(DrivePhotoLinks.thumbnail(null)).isNull();
        assertThat(DrivePhotoLinks.thumbnail("  ")).isNull();
    }
}
