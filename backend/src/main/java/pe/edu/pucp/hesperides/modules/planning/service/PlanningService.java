package pe.edu.pucp.hesperides.modules.planning.service;

import pe.edu.pucp.hesperides.modules.planning.dto.PlanningRowResponse;
import pe.edu.pucp.hesperides.modules.planning.dto.RecentAttentionResponse;

import java.time.LocalDate;
import java.util.List;

public interface PlanningService {

    List<PlanningRowResponse> rows();

    List<RecentAttentionResponse> recentAttention(long activityTypeItemId, LocalDate scheduledDate, List<Long> zoneIds);
}
