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
    final LocalDate from=LocalDate.of(2026,10,1),to=LocalDate.of(2026,10,31);
    @BeforeEach void setup() {
        repository=mock(MaintenanceFrequenciesRepository.class);history=mock(ExecutionHistoryProvider.class);
        frequency=mock(MaintenanceFrequency.class);var activity=mock(CatalogItem.class);var type=mock(CatalogItem.class);
        when(activity.getId()).thenReturn(10L);when(activity.getLabel()).thenReturn("Activity");when(type.getCode()).thenReturn("SEASONAL_PERIOD");
        when(frequency.getId()).thenReturn(1L);when(frequency.getActivityTypeItem()).thenReturn(activity);
        when(frequency.getFrequencyRuleTypeItem()).thenReturn(type);when(frequency.getRegime()).thenReturn("IN_HOUSE");
        when(frequency.getScope()).thenReturn("CAMPUS_WIDE");
        when(frequency.toRule()).thenReturn(new FrequencyRule(1L,"SEASONAL_PERIOD",null,null,null,2,null,null,null,List.of(),LocalDate.of(2026,1,1),null));
        when(repository.findAllCurrent()).thenReturn(List.of(frequency));
        when(repository.findVersionsOverlapping(10L,from,to)).thenReturn(List.of(frequency));
        when(history.supportsLocationHistory()).thenReturn(true);
        reader=new ComplianceReader(repository,history);
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
    @Test void zoneRuleDoesNotUseExecutionsFromAnotherZone() {
        when(frequency.getScope()).thenReturn("BY_ZONE");when(frequency.getZoneId()).thenReturn(7L);
        when(history.locationExecutions(10L,"IN_HOUSE",from,to)).thenReturn(List.of(fact(1,1,7,19),fact(2,2,8,20)));
        var report=reader.evaluate(from,to,null).get(0);
        assertThat(report.locations()).hasSize(1);assertThat(report.locations().get(0).targetId()).isEqualTo(7);
    }
    @Test void sectorRuleDoesNotGuessHistoricalMembershipOrClaimGlobalCoverage() {
        when(frequency.getScope()).thenReturn("BY_SECTOR");when(frequency.getZoneId()).thenReturn(99L);
        when(history.locationExecutions(10L,"IN_HOUSE",from,to)).thenReturn(List.of(fact(1,1,7,19)));
        var report=reader.evaluate(from,to,null).get(0);
        assertThat(report.locations()).isEmpty();assertThat(report.segments().get(0).explanation()).contains("territorial histórica");
    }
    @Test void calendarOnlyProvidersRetainCompatibility() {
        when(history.supportsLocationHistory()).thenReturn(false);
        when(history.executionDates(10L,"IN_HOUSE",from,to)).thenReturn(List.of(LocalDate.of(2026,10,19),LocalDate.of(2026,10,19)));
        var report=reader.evaluate(from,to,null).get(0);
        assertThat(report.locations()).isEmpty();assertThat(report.segments().get(0).observedValue()).isEqualTo(2);
    }
}
