package pe.edu.pucp.hesperides.shared.entity;

import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class BaseEntityTest {

    /** Entidad mínima concreta: BaseEntity es abstracta y no se instancia sola. */
    private static class SampleEntity extends BaseEntity {
    }

    @Test
    void newEntityIsNotDeleted() {
        SampleEntity entity = new SampleEntity();

        assertThat(entity.getDeletedAt()).isNull();
        assertThat(entity.isDeleted()).isFalse();
    }

    @Test
    void softDeleteStampsDeletedAt() {
        SampleEntity entity = new SampleEntity();

        entity.softDelete();

        assertThat(entity.getDeletedAt()).isNotNull();
        assertThat(entity.isDeleted()).isTrue();
    }

    @Test
    void onCreateSetsBothTimestamps() {
        SampleEntity entity = new SampleEntity();

        entity.onCreate();

        assertThat(entity.getCreatedAt()).isNotNull();
        assertThat(entity.getUpdatedAt()).isNotNull();
        assertThat(entity.getCreatedAt()).isEqualTo(entity.getUpdatedAt());
    }

    @Test
    void onUpdateMovesUpdatedAtForward() throws InterruptedException {
        SampleEntity entity = new SampleEntity();
        entity.onCreate();
        Instant originalCreatedAt = entity.getCreatedAt();
        Thread.sleep(5);

        entity.onUpdate();

        assertThat(entity.getCreatedAt()).isEqualTo(originalCreatedAt);
        assertThat(entity.getUpdatedAt()).isAfter(originalCreatedAt);
    }
}