package pe.edu.pucp.hesperides.shared.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.support.TestDatabase;

/** La limpieza de archivos de fotos dadas de baja hace más de cuatro meses. */
@Testcontainers
@SpringBootTest
@Transactional
class DeletedPhotoPurgeIntegrationTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 10, 3, 3, 30);

    @Container
    static PostgreSQLContainer<?> postgres = TestDatabase.newContainer();

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired
    private DeletedPhotoPurger purger;

    @Autowired
    private FileStorage storage;

    @Autowired
    private JdbcTemplate jdbc;

    private long placeId;
    private long userId;

    @BeforeEach
    void place() {
        userId = jdbc.queryForObject("SELECT id FROM users WHERE email = 'admin@pucp.edu.pe'", Long.class);
        placeId = jdbc.queryForObject("""
                INSERT INTO places (name, kind_item_id, category_item_id, own_geometry)
                VALUES ('Prueba de limpieza', (SELECT id FROM catalog_items WHERE code = 'OUTDOOR'),
                        (SELECT ci.id FROM catalog_items ci JOIN catalog_types t ON t.id = ci.catalog_type_id
                          WHERE t.code = 'REFERENCE_CATEGORY' AND ci.code = 'EDIFICIO'),
                        ST_SetSRID(ST_MakePoint(-77.08, -12.07), 4326)) RETURNING id""", Long.class);
    }

    /** Una foto con sus dos archivos guardados; {@code deletedAt} null si sigue vigente. */
    private String photo(String name, LocalDateTime deletedAt, int order) {
        String full = "places/purge-test/" + name + ".jpg", thumb = "places/purge-test/" + name + "-thumb.jpg";
        storage.put(full, new byte[] {1, 2, 3}, "image/jpeg");
        storage.put(thumb, new byte[] {1}, "image/jpeg");
        jdbc.update("""
                INSERT INTO place_photos (place_id, storage_key, thumbnail_storage_key, content_type, size_bytes, sort_order,
                    uploaded_by_user_id, deleted_at) VALUES (?, ?, ?, 'image/jpeg', 3, ?, ?, ?)""",
                placeId, full, thumb, order, userId, deletedAt);
        return full;
    }

    private boolean exists(String key) {
        try {
            storage.read(key);
            return true;
        } catch (StoredFileNotFoundException e) {
            return false;
        }
    }

    @Test
    void deletesBothFilesOfAPhotoDeletedMoreThanFourMonthsAgo() {
        String old = photo("vieja", NOW.minusMonths(4).minusDays(1), 1);

        assertThat(purger.purge(NOW)).isEqualTo(1);

        assertThat(exists(old)).isFalse();
        assertThat(exists(old.replace(".jpg", "-thumb.jpg"))).isFalse();
        assertThat(jdbc.queryForObject("SELECT files_purged_at FROM place_photos WHERE storage_key = ?", LocalDateTime.class, old))
                .isEqualTo(NOW);
    }

    @Test
    void keepsAPhotoDeletedLessThanFourMonthsAgo() {
        String recent = photo("reciente", NOW.minusMonths(4).plusDays(1), 1);

        assertThat(purger.purge(NOW)).isZero();
        assertThat(exists(recent)).isTrue();
    }

    @Test
    void neverTouchesAPhotoInUse() {
        String active = photo("vigente", null, 1);

        purger.purge(NOW);

        assertThat(exists(active)).isTrue();
    }

    @Test
    void aFileStillUsedByAnActivePhotoIsKept() {
        String shared = photo("compartida", NOW.minusYears(1), 1);
        jdbc.update("""
                INSERT INTO place_photos (place_id, storage_key, thumbnail_storage_key, content_type, size_bytes, sort_order,
                    uploaded_by_user_id) VALUES (?, ?, ?, 'image/jpeg', 3, 2, ?)""",
                placeId, shared, shared.replace(".jpg", "-thumb.jpg"), userId);

        assertThat(purger.purge(NOW)).isZero();
        assertThat(exists(shared)).isTrue();
    }

    @Test
    void aSecondRunFindsNothingLeft() {
        photo("vieja", NOW.minusMonths(6), 1);
        purger.purge(NOW);

        assertThat(purger.purge(NOW)).isZero();
    }

    @Test
    void aFileAlreadyGoneDoesNotStopTheCleanup() {
        String gone = photo("sin-archivo", NOW.minusMonths(5), 1);
        storage.delete(gone);

        assertThat(purger.purge(NOW)).isEqualTo(1);
        assertThatThrownBy(() -> storage.read(gone)).isInstanceOf(StoredFileNotFoundException.class);
    }
}
