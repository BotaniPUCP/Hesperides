package pe.edu.pucp.hesperides.modules.maintenance.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import pe.edu.pucp.hesperides.modules.maintenance.service.ExecutionHistoryProvider;

import java.util.List;

@Configuration
public class MaintenanceConfig {

    /**
     * Sin historial de ejecuciones: es lo que hay mientras la tabla
     * {@code interventions} no exista.
     *
     * <p>Devolver una lista vacia no es un atajo silencioso. El Engine traduce la
     * ausencia de ejecuciones a {@code NOT_APPLICABLE} con el motivo "nunca se
     * registro una ejecucion", que es <em>exactamente la verdad</em>: el sistema
     * no tiene con que juzgar. Lo que no hace, y es lo que importa, es reportar
     * {@code OVERDUE} y acusar al equipo de campo de un incumplimiento inventado
     * por un vacio de datos.
     *
     * <p>{@code @ConditionalOnMissingBean} va aqui y no sobre un {@code @Component}:
     * en un componente escaneado la condicion se evalua antes de que el resto de
     * beans se registre, asi que nunca cede el puesto. Sobre un {@code @Bean} de
     * configuracion si funciona, y el modulo de intervenciones lo sustituye con
     * solo publicar su propia implementacion.
     */
    @Bean
    @ConditionalOnMissingBean(ExecutionHistoryProvider.class)
    public ExecutionHistoryProvider emptyExecutionHistoryProvider() {
        return (activityTypeItemId, regime, from, to) -> List.of();
    }
}
