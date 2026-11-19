package pe.edu.pucp.hesperides.modules.incidents;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.junit.jupiter.Testcontainers;
import pe.edu.pucp.hesperides.modules.incidents.dto.IncidentContracts.*;
import pe.edu.pucp.hesperides.modules.incidents.service.IncidentMapService;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** SPEC-201 §3.10 y aceptación 9; búsqueda desde Intervenciones (§3.8). */
@SpringBootTest @Testcontainers @Transactional
class IncidentMapIntegrationTest extends IncidentTestSupport {

    @Autowired IncidentMapService map;
    @Autowired jakarta.persistence.EntityManager entities;

    private MapMarkerResponse marker(long id, String email) {
        return map.map(email).markers().stream().filter(m -> m.id() == id).findFirst().orElse(null);
    }

    @Test
    void gpsWinsOverTheSection() {
        var sent = capture.create(new CreateIncidentRequest("Fuga de agua", "HIGH", null, -12.0690, -77.0790,
                anyZoneId(), null, null, null, null, null, null), UUID.randomUUID(), coordinator).detail();

        var m = marker(sent.incident().id(), coordinator);

        assertThat(m.latitude()).isEqualTo(-12.0690);
        assertThat(m.longitude()).isEqualTo(-77.0790);
        assertThat(m.deadlineStatus()).isEqualTo("ON_TIME");
    }

    @Test
    void withoutGpsTheMarkerFallsInsideItsSection() {
        long zone = anyZoneId();
        long id = activeIncident().incident().id();

        var m = marker(id, coordinator);

        Boolean inside = jdbc.queryForObject("SELECT ST_Covers(boundary, ST_SetSRID(ST_MakePoint(?,?),4326)) FROM zones WHERE id=?",
                Boolean.class, m.longitude(), m.latitude(), zone);
        assertThat(inside).isTrue();
    }

    @Test
    void overdueIncidentsArePaintedRed() {
        long id = activeIncident().incident().id();
        jdbc.update("UPDATE incidents SET created_at = created_at - interval '3 days' WHERE id=?", id);
        entities.clear();

        assertThat(marker(id, coordinator).deadlineStatus()).isEqualTo("OVERDUE");
    }

    @Test
    void activeIncidentsWithoutLocationAreOnlyCounted() {
        long before = map.map(coordinator).withoutLocation();
        reportAs(coordinator);

        assertThat(map.map(coordinator).withoutLocation()).isEqualTo(before + 1);
    }

    @Test
    void inactiveAndClosedIncidentsAreNotOnTheMap() {
        long inactive = reportAs(foreman).incident().id();
        assertThat(marker(inactive, coordinator)).isNull();
    }

    @Test
    void foremanSeesOnlyTheirTeamIncidents() {
        long id = activeIncident().incident().id();

        assertThat(marker(id, foreman)).isNotNull();
        assertThat(marker(id, outsider)).isNull();
    }

    @Test
    void searchListsEveryActiveOpenIncidentWithItsSearchKeyForCoordinationOnly() {
        var active = activeIncident().incident();
        long notActive = reportAs(foreman).incident().id();

        var found = map.search(coordinator);
        assertThat(found).extracting(IncidentRefResponse::id).contains(active.id()).doesNotContain(notActive);
        assertThat(found).filteredOn(i -> i.id().equals(active.id())).singleElement()
                .satisfies(i -> assertThat(i.searchKey()).startsWith(active.code().toLowerCase()));
        assertThatThrownBy(() -> map.search(foreman)).isInstanceOf(AccessDeniedException.class);
    }
}
