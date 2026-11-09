package pe.edu.pucp.hesperides.modules.maintenance.service;

import org.junit.jupiter.api.*;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;
import pe.edu.pucp.hesperides.modules.maintenance.repository.MaintenanceFrequenciesRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.engine.frequency.FrequencyRule;
import java.time.*;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class LocationComplianceReaderTest {
    MaintenanceFrequenciesRepository repository;
    ExecutionHistoryProvider history;
    MaintenanceFrequency frequency;
    ComplianceReader reader;
    pe.edu.pucp.hesperides.modules.maintenance.repository.GreenAreaSetLookup sets;
    final LocalDate from=LocalDate.of(2026,10,1),to=LocalDate.of(2026,10,31);
    @BeforeEach void setup() {
        repository=mock(MaintenanceFrequenciesRepository.class);history=mock(ExecutionHistoryProvider.class);
        frequency=mock(MaintenanceFrequency.class);var activity=mock(CatalogItem.class);var type=mock(CatalogItem.class);
        when(activity.getId()).thenReturn(10L);when(activity.getLabel()).thenReturn("Activity");when(type.getCode()).thenReturn("SEASONAL_PERIOD");
        when(frequency.getId()).thenReturn(1L);when(frequency.getActivityTypeItem()).thenReturn(activity);
        when(frequency.getFrequencyRuleTypeItem()).thenReturn(type);when(frequency.getRegime()).thenReturn("IN_HOUSE");
        when(frequency.getScope()).thenReturn("CAMPUS_WIDE");
        when(frequency.toRule()).thenReturn(new FrequencyRule(1L,"SEASONAL_PERIOD",null,null,2,null,null,null,List.of(),LocalDate.of(2026,1,1),null));
        when(repository.findAllCurrent()).thenReturn(List.of(frequency));
        when(repository.findVersionsOverlapping(10L,from,to)).thenReturn(List.of(frequency));
        when(history.supportsLocationHistory()).thenReturn(true);
        sets=mock(pe.edu.pucp.hesperides.modules.maintenance.repository.GreenAreaSetLookup.class);
        reader=new ComplianceReader(repository,history,sets);
    }
    LocationExecution fact(long work,long location,long zone,int day) {
        var date=LocalDate.of(2026,10,day);var physical=date.atTime(12,0).toInstant(ZoneOffset.UTC);
        var approved=Instant.parse("2026-10-29T12:00:00Z");
        return new LocationExecution(work,"INT-"+work,location,1,"ZONE",zone,"Garden "+zone,zone,null,physical,approved,approved,date,LocalDate.of(2026,10,29));
    }
    @Test void countsOncePerWorkAndTargetButKeepsDifferentWorksOnSameDateAndBothDates() {
        when(history.locationExecutions(10L,"IN_HOUSE",from,to)).thenReturn(List.of(fact(1,1,7,19),fact(1,2,7,20),fact(2,3,7,20),fact(3,4,8,21)));
        var report=reader.evaluate(from,to,null).get(0);
        assertThat(report.locations()).hasSize(2);
        assertThat(report.locations().get(0).segments().get(0).observedValue()).isEqualTo(2);
        assertThat(report.locations().get(1).segments().get(0).observedValue()).isEqualTo(1);
        assertThat(report.locations().get(0).executions()).hasSize(3).allSatisfy(f->assertThat(f.approvalDate()).isEqualTo(LocalDate.of(2026,10,29)));
        assertThat(report.segments().get(0).status()).isEqualTo("NOT_APPLICABLE");
        verify(history,never()).executionDates(any(),any(),any(),any());
    }
    @Test void setRuleOnlyUsesExecutionsInsideItsSet() {
        when(frequency.getScope()).thenReturn("BY_SET");when(frequency.getGreenAreaSetId()).thenReturn(5L);
        when(sets.setsContaining(any())).thenReturn(java.util.Map.of(7L,java.util.Set.of(5L)));
        when(history.locationExecutions(10L,"IN_HOUSE",from,to)).thenReturn(List.of(fact(1,1,7,19),fact(2,2,8,20)));
        var report=reader.evaluate(from,to,null).get(0);
        assertThat(report.locations()).hasSize(1);assertThat(report.locations().get(0).targetId()).isEqualTo(7);
    }
    /** SPEC-203 §5.8: a garden in a set with its own rule is judged only by that rule. */
    @Test void eachGardenIsJudgedOnceByItsEffectiveRule() {
        var activity=frequency.getActivityTypeItem();var type=mock(CatalogItem.class);when(type.getCode()).thenReturn("INTERVAL_DAYS");
        var general=mock(MaintenanceFrequency.class);var own=mock(MaintenanceFrequency.class);
        when(general.getId()).thenReturn(20L);when(general.getActivityTypeItem()).thenReturn(activity);when(general.getRegime()).thenReturn("IN_HOUSE");
        when(general.getFrequencyRuleTypeItem()).thenReturn(type);when(general.getScope()).thenReturn("CAMPUS_WIDE");
        when(general.toRule()).thenReturn(new FrequencyRule(20L,"INTERVAL_DAYS",30,35,null,null,null,null,List.of(),LocalDate.of(2026,1,1),null));
        when(own.getId()).thenReturn(21L);when(own.getActivityTypeItem()).thenReturn(activity);when(own.getRegime()).thenReturn("IN_HOUSE");
        when(own.getFrequencyRuleTypeItem()).thenReturn(type);when(own.getScope()).thenReturn("BY_SET");when(own.getGreenAreaSetId()).thenReturn(5L);
        when(own.toRule()).thenReturn(new FrequencyRule(21L,"INTERVAL_DAYS",20,25,null,null,null,null,List.of(),LocalDate.of(2026,1,1),null));
        when(repository.findAllCurrent()).thenReturn(List.of(general,own));
        when(repository.findVersionsOverlapping(10L,from,to)).thenReturn(List.of(general,own));
        when(sets.setsContaining(any())).thenReturn(java.util.Map.of(7L,java.util.Set.of(5L)));
        when(history.locationExecutions(10L,"IN_HOUSE",from,to)).thenReturn(List.of(fact(1,1,7,1),fact(2,2,7,23),fact(3,3,8,1),fact(4,4,8,23)));

        var reports=reader.evaluate(from,to,null);

        assertThat(reports).hasSize(1);
        var locations=reports.get(0).locations();
        assertThat(locations).extracting(l->l.targetId()).containsExactlyInAnyOrder(7L,8L);
        var inSet=locations.stream().filter(l->l.targetId()==7L).findFirst().orElseThrow();
        assertThat(inSet.segments().get(0).status()).isEqualTo("ON_TARGET");
        assertThat(inSet.segments().get(0).evaluatedWithConfigId()).isEqualTo(21L);
        var outside=locations.stream().filter(l->l.targetId()==8L).findFirst().orElseThrow();
        assertThat(outside.segments().get(0).status()).isEqualTo("EARLY");
    }
    @Test void calendarOnlyProvidersRetainCompatibility() {
        when(history.supportsLocationHistory()).thenReturn(false);
        when(history.executionDates(10L,"IN_HOUSE",from,to)).thenReturn(List.of(LocalDate.of(2026,10,19),LocalDate.of(2026,10,19)));
        var report=reader.evaluate(from,to,null).get(0);
        assertThat(report.locations()).isEmpty();assertThat(report.segments().get(0).observedValue()).isEqualTo(2);
    }
}
