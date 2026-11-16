package pe.edu.pucp.hesperides.modules.campusevents.service;

import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.CampusEventRequest;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.CampusEventResponse;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.Occurrence;
import pe.edu.pucp.hesperides.modules.campusevents.dto.CampusEventDtos.Warning;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** El calendario del campus (SPEC-114 §3). */
public interface CampusEventsService {

    /** Las ocurrencias del rango, de a lo más 62 días; {@code typeCode} nulo = todos los tipos. */
    List<Occurrence> occurrences(LocalDate from, LocalDate to, String typeCode);

    CampusEventResponse get(long id);

    CampusEventResponse create(CampusEventRequest request, String email);

    CampusEventResponse update(long id, CampusEventRequest request, String email);

    void delete(long id, String email);

    /** Los avisos para un trabajo o una reserva en esas fechas y lugares (§5.4); nunca bloquean. */
    List<Warning> check(List<LocalDate> dates, List<Long> zoneIds, List<Long> placeIds,
                        LocalTime startTime, LocalTime endTime);
}
