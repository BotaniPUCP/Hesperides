package pe.edu.pucp.hesperides.modules.maintenance.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pe.edu.pucp.hesperides.modules.maintenance.service.ExecutionHistoryProvider;

import java.util.List;

@Configuration
public class MaintenanceConfig {

    /**
     * Integration fallback when no execution provider has been configured.
     * SPEC-200 supplies the real scoped provider when its module is present.
     * An empty result does not prove that no work was performed;
     * it means this fallback supplies no execution history to the evaluator.
     *
     * <p>Keep the missing-bean condition on the configuration bean rather than
     * a scanned component, so an agreed real provider can replace this fallback.
     */
    @Bean
    @ConditionalOnMissingBean(ExecutionHistoryProvider.class)
    public ExecutionHistoryProvider emptyExecutionHistoryProvider() {
        return (activityTypeItemId, regime, from, to) -> List.of();
    }
}
