package pe.edu.pucp.hesperides.modules.planning.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import pe.edu.pucp.hesperides.modules.maintenance.repository.MaintenanceFrequenciesRepository;

import java.util.List;

/** Las reglas que planifican (SPEC-203 D-10): vigentes, de personal propio y no reactivas. */
@Component
@RequiredArgsConstructor
public class PlanningRuleSource {

    private final MaintenanceFrequenciesRepository frequencies;

    public List<PlanningRule> current() {
        return frequencies.findCurrentInHouse().stream().map(f -> new PlanningRule(f.getActivityTypeItem().getId(),
                f.getActivityTypeItem().getLabel(), f.getGreenAreaSetId(), f.toRule())).toList();
    }
}
