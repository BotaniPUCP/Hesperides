package pe.edu.pucp.hesperides.modules.campusevents.dto;

import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Contratos de SPEC-114 §3. */
public final class CampusEventDtos {

    /** Las horas viajan como «14:00», sin segundos: así las escribe la persona. */
    static final String HOUR = "HH:mm";

    private CampusEventDtos() {
    }

    /** {@code weekdays}: ISO, 1 = lunes; vacío o nulo = todos los días. {@code version} solo al editar. */
    public record CampusEventRequest(String name, String description, String typeCode, String scope, Long zoneId,
                                     LocalDate startDate, LocalDate endDate, LocalTime startTime, LocalTime endTime,
                                     List<Integer> weekdays, Long version) {
    }

    public record CampusEventResponse(long id, String name, String description, String typeCode, String typeLabel,
                                      String scope, Long zoneId, String zoneName, LocalDate startDate,
                                      LocalDate endDate, @JsonFormat(pattern = HOUR) LocalTime startTime,
                                      @JsonFormat(pattern = HOUR) LocalTime endTime,
                                      List<Integer> weekdays, long version) {
    }

    /** Un día en que ocurre un evento. {@code zoneActive} es falso si su zona se dio de baja. */
    public record Occurrence(long eventId, String name, String typeCode, String typeLabel, String scope, Long zoneId,
                             String zoneName, boolean zoneActive, LocalDate date,
                             @JsonFormat(pattern = HOUR) LocalTime startTime, @JsonFormat(pattern = HOUR) LocalTime endTime) {
    }

    /** Misma forma que los avisos de reservas (SPEC-107), para mostrarlos juntos. */
    public record Warning(String kind, String severity, String text, long eventId) {
    }
}
