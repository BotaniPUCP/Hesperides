package pe.edu.pucp.hesperides.modules.maintenance.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.maintenance.dto.CreateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.dto.MaintenanceFrequencyResponse;
import pe.edu.pucp.hesperides.modules.maintenance.dto.SeasonalIntervalPayload;
import pe.edu.pucp.hesperides.modules.maintenance.dto.UpdateMaintenanceFrequencyRequest;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequency;
import pe.edu.pucp.hesperides.modules.maintenance.entity.MaintenanceFrequencySeason;
import pe.edu.pucp.hesperides.modules.maintenance.repository.MaintenanceFrequenciesRepository;
import pe.edu.pucp.hesperides.shared.entity.BaseEntity;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class MaintenanceFrequenciesServiceImplTest {

    @Mock
    private MaintenanceFrequenciesRepository frequenciesRepository;

    @Mock
    private CatalogItemsRepository catalogItemsRepository;

    @Mock
    private ComplianceReader complianceReader;

    private MaintenanceFrequenciesServiceImpl service;

    private CatalogItem activityItem;
    private CatalogItem intervalDaysRuleItem;
    private CatalogItem seasonalRuleItem;
    private CatalogItem onDemandRuleItem;

    @BeforeEach
    void setUp() throws Exception {
        service = new MaintenanceFrequenciesServiceImpl(
                frequenciesRepository, catalogItemsRepository, complianceReader);

        activityItem = catalogItem(10L, "CORTE_CESPED", "Corte de césped");
        intervalDaysRuleItem = catalogItem(101L, "INTERVAL_DAYS", "Intervalo por rango de días");
        seasonalRuleItem = catalogItem(102L, "SEASONAL_PERIOD", "Periodicidad estacional");
        onDemandRuleItem = catalogItem(105L, "ON_DEMAND", "A demanda");

        when(catalogItemsRepository.findById(10L)).thenReturn(Optional.of(activityItem));
        when(catalogItemsRepository.findActiveItemByTypeAndCode("FREQUENCY_RULE_TYPE", "INTERVAL_DAYS"))
                .thenReturn(Optional.of(intervalDaysRuleItem));
        when(catalogItemsRepository.findActiveItemByTypeAndCode("FREQUENCY_RULE_TYPE", "SEASONAL_PERIOD"))
                .thenReturn(Optional.of(seasonalRuleItem));
        when(catalogItemsRepository.findActiveItemByTypeAndCode("FREQUENCY_RULE_TYPE", "ON_DEMAND"))
                .thenReturn(Optional.of(onDemandRuleItem));
        when(frequenciesRepository.findDuplicateCurrent(any(), any(), any(), any(), any()))
                .thenReturn(Optional.empty());
        when(frequenciesRepository.save(any(MaintenanceFrequency.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        when(frequenciesRepository.saveAndFlush(any(MaintenanceFrequency.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private CatalogItem catalogItem(Long id, String code, String label) throws Exception {
        CatalogItem item = new CatalogItem();
        setId(item, id);
        item.setCode(code);
        item.setLabel(label);
        item.setActive(true);
        return item;
    }

    private void setId(BaseEntity entity, Long id) throws Exception {
        Field idField = BaseEntity.class.getDeclaredField("id");
        idField.setAccessible(true);
        idField.set(entity, id);
    }

    private static CreateMaintenanceFrequencyRequest crear(String ruleCode, Integer min, Integer max,
                                                           Integer annual, Integer coverage,
                                                           List<SeasonalIntervalPayload> seasons) {
        return new CreateMaintenanceFrequencyRequest(
                10L, "IN_HOUSE", ruleCode, "CAMPUS_WIDE", null,
                null, min, max, annual, coverage, null, null, null, seasons, null);
    }

    private static UpdateMaintenanceFrequencyRequest editar(Integer min, Integer max,
                                                            List<SeasonalIntervalPayload> seasons,
                                                            String notes) {
        return new UpdateMaintenanceFrequencyRequest(null, null, null, null,
                null, min, max, null, null, null, null, null, seasons, notes, null);
    }

    /** Una frecuencia vigente creada hace dias, como la que ya lleva tiempo en uso. */
    private MaintenanceFrequency vigenteAntigua() throws Exception {
        MaintenanceFrequency f = new MaintenanceFrequency();
        setId(f, 500L);
        f.setActivityTypeItem(activityItem);
        f.setFrequencyRuleTypeItem(intervalDaysRuleItem);
        f.setRegime("IN_HOUSE");
        f.setScope("CAMPUS_WIDE");
        f.setMinDaysInterval(30);
        f.setMaxDaysInterval(45);
        f.setValidFrom(LocalDate.now().minusDays(30));
        return f;
    }

    private static MaintenanceFrequencySeason verano() {
        MaintenanceFrequencySeason s = new MaintenanceFrequencySeason();
        s.setSeason("VERANO");
        s.setStartMonth((short) 1);
        s.setEndMonth((short) 3);
        s.setMinDaysInterval(30);
        s.setMaxDaysInterval(35);
        return s;
    }

    @Nested
    @DisplayName("Creacion")
    class Creacion {

        @Test
        @DisplayName("un intervalo valido se persiste con vigencia abierta")
        void intervaloValido() {
            var res = service.create(crear("INTERVAL_DAYS", 30, 45, null, null, null));

            assertThat(res.minDaysInterval()).isEqualTo(30);
            assertThat(res.validFrom()).isEqualTo(LocalDate.now());
            assertThat(res.validTo()).isNull();
            assertThat(res.current()).isTrue();
        }

        @Test
        @DisplayName("las estaciones se persisten como filas, no como texto")
        void conEstaciones() {
            var seasons = List.of(
                    new SeasonalIntervalPayload("VERANO", 1, 3, 30, 35, 21),
                    new SeasonalIntervalPayload("INVIERNO", 7, 9, 40, 45, 21));

            var res = service.create(crear("INTERVAL_DAYS", 30, 45, null, null, seasons));

            assertThat(res.seasons()).hasSize(2);
            assertThat(res.seasons()).extracting(SeasonalIntervalPayload::season)
                    .containsExactlyInAnyOrder("VERANO", "INVIERNO");
        }

        @Test
        @DisplayName("un intervalo sin min ni max se rechaza")
        void intervaloIncompleto() {
            assertThatThrownBy(() -> service.create(crear("INTERVAL_DAYS", null, null, null, null, null)))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("intervalo mínimo y máximo");
        }

        @Test
        @DisplayName("min mayor que max se rechaza")
        void rangoInvertido() {
            assertThatThrownBy(() -> service.create(crear("INTERVAL_DAYS", 45, 30, null, null, null)))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("no puede superar");
        }

        @Test
        @DisplayName("el intervalo general puede faltar si las estaciones lo cubren")
        void soloEstaciones() {
            var seasons = List.of(new SeasonalIntervalPayload("VERANO", 1, 3, 30, 35, null));
            var res = service.create(crear("INTERVAL_DAYS", null, null, null, null, seasons));

            assertThat(res.seasons()).hasSize(1);
        }

        @Test
        @DisplayName("una cuota anual ausente se rechaza")
        void cuotaAusente() {
            assertThatThrownBy(() -> service.create(crear("SEASONAL_PERIOD", null, null, null, null, null)))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("cuota anual");
        }

        @Test
        @DisplayName("ON_DEMAND con parametros se rechaza en vez de ignorarlos")
        void aDemandaConParametros() {
            // Contradiccion: declara no tener periodicidad y a la vez la describe.
            assertThatThrownBy(() -> service.create(crear("ON_DEMAND", 30, 45, null, null, null)))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("a demanda");
        }

        @Test
        @DisplayName("una estacion repetida se rechaza")
        void estacionRepetida() {
            var seasons = List.of(
                    new SeasonalIntervalPayload("VERANO", 1, 3, 30, 35, null),
                    new SeasonalIntervalPayload("VERANO", 1, 2, 25, 30, null));

            assertThatThrownBy(() -> service.create(crear("INTERVAL_DAYS", 30, 45, null, null, seasons)))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("más de una vez");
        }

        @Test
        @DisplayName("un duplicado vigente se rechaza")
        void duplicado() throws Exception {
            when(frequenciesRepository.findDuplicateCurrent(eq(10L), eq("IN_HOUSE"), eq("CAMPUS_WIDE"), any(), any()))
                    .thenReturn(Optional.of(vigenteAntigua()));

            assertThatThrownBy(() -> service.create(crear("INTERVAL_DAYS", 30, 45, null, null, null)))
                    .isInstanceOf(DuplicateResourceException.class);
        }

        @Test
        @DisplayName("una actividad inactiva se rechaza")
        void actividadInactiva() {
            activityItem.setActive(false);

            assertThatThrownBy(() -> service.create(crear("INTERVAL_DAYS", 30, 45, null, null, null)))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("no está activo");
        }
    }

    @Nested
    @DisplayName("Versionado")
    class Versionado {

        @Test
        @DisplayName("editar una vigente antigua cierra la anterior y crea otra")
        void versiona() throws Exception {
            MaintenanceFrequency actual = vigenteAntigua();
            when(frequenciesRepository.findByIdWithDetails(500L)).thenReturn(Optional.of(actual));

            var res = service.update(500L, editar(30, 60, null, null));

            // La anterior queda cerrada ayer: nunca hay dos vigentes ni un dia sin ninguna.
            assertThat(actual.getValidTo()).isEqualTo(LocalDate.now().minusDays(1));
            // La nueva es otra fila, con los valores nuevos y vigencia abierta.
            assertThat(res.validFrom()).isEqualTo(LocalDate.now());
            assertThat(res.validTo()).isNull();
            assertThat(res.maxDaysInterval()).isEqualTo(60);
            verify(frequenciesRepository).saveAndFlush(actual);
        }

        @Test
        @DisplayName("editar una creada hoy actualiza en sitio, sin versionar")
        void actualizaEnSitio() throws Exception {
            // Cerrarla con valid_to = ayer violaria la constraint de vigencia, y no
            // hay ningun periodo evaluado bajo esa configuracion que proteger.
            MaintenanceFrequency hoy = vigenteAntigua();
            hoy.setValidFrom(LocalDate.now());
            when(frequenciesRepository.findByIdWithDetails(500L)).thenReturn(Optional.of(hoy));

            var res = service.update(500L, editar(30, 60, null, null));

            assertThat(hoy.getValidTo()).isNull();
            assertThat(res.maxDaysInterval()).isEqualTo(60);
            verify(frequenciesRepository, never()).saveAndFlush(any());
        }

        @Test
        @DisplayName("las estaciones se copian a la version nueva")
        void copiaEstaciones() throws Exception {
            MaintenanceFrequency actual = vigenteAntigua();
            actual.addSeason(verano());
            when(frequenciesRepository.findByIdWithDetails(500L)).thenReturn(Optional.of(actual));

            var res = service.update(500L, editar(null, null, null, "Nota nueva"));

            // La nueva las hereda y la antigua conserva las suyas: su periodo
            // sigue siendo explicable.
            assertThat(res.seasons()).hasSize(1);
            assertThat(actual.getSeasons()).hasSize(1);
        }

        @Test
        @DisplayName("una lista vacia de estaciones las elimina")
        void eliminaEstaciones() throws Exception {
            MaintenanceFrequency actual = vigenteAntigua();
            actual.addSeason(verano());
            when(frequenciesRepository.findByIdWithDetails(500L)).thenReturn(Optional.of(actual));

            var res = service.update(500L, editar(null, null, List.of(), null));

            assertThat(res.seasons()).isEmpty();
        }

        @Test
        @DisplayName("editar una version historica se rechaza")
        void historicaNoSeEdita() throws Exception {
            MaintenanceFrequency cerrada = vigenteAntigua();
            cerrada.setValidTo(LocalDate.now().minusDays(5));
            when(frequenciesRepository.findByIdWithDetails(500L)).thenReturn(Optional.of(cerrada));

            assertThatThrownBy(() -> service.update(500L, editar(30, 60, null, null)))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("histórica");
        }

        @Test
        @DisplayName("la edicion tambien valida coherencia")
        void validaAlEditar() throws Exception {
            when(frequenciesRepository.findByIdWithDetails(500L)).thenReturn(Optional.of(vigenteAntigua()));

            assertThatThrownBy(() -> service.update(500L, editar(90, 40, null, null)))
                    .isInstanceOf(BusinessRuleException.class)
                    .hasMessageContaining("no puede superar");
        }
    }

    @Nested
    @DisplayName("Baja")
    class Baja {

        @Test
        @DisplayName("el borrado es logico y cierra la vigencia")
        void borradoLogico() throws Exception {
            MaintenanceFrequency f = vigenteAntigua();
            when(frequenciesRepository.findById(500L)).thenReturn(Optional.of(f));

            service.delete(500L);

            assertThat(f.isDeleted()).isTrue();
            assertThat(f.isActive()).isFalse();
            // Una frecuencia retirada no sigue rigiendo.
            assertThat(f.getValidTo()).isEqualTo(LocalDate.now());

            ArgumentCaptor<MaintenanceFrequency> captor =
                    ArgumentCaptor.forClass(MaintenanceFrequency.class);
            verify(frequenciesRepository).save(captor.capture());
            assertThat(captor.getValue().getId()).isEqualTo(500L);
        }

        @Test
        @DisplayName("borrar una inexistente da 404")
        void inexistente() {
            when(frequenciesRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> service.delete(999L))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    @Nested
    @DisplayName("Consultas")
    class Consultas {

        @Test
        @DisplayName("el listado pide solo lo vigente")
        void listadoVigente() throws Exception {
            when(frequenciesRepository.searchCurrent(null, null, null))
                    .thenReturn(List.of(vigenteAntigua()));

            List<MaintenanceFrequencyResponse> res = service.findAll(null, null, null);

            assertThat(res).hasSize(1);
            assertThat(res.get(0).current()).isTrue();
            verify(frequenciesRepository).searchCurrent(null, null, null);
        }

        @Test
        @DisplayName("el historial incluye las versiones cerradas")
        void historial() throws Exception {
            MaintenanceFrequency cerrada = vigenteAntigua();
            cerrada.setValidTo(LocalDate.now().minusDays(1));
            when(frequenciesRepository.findHistory(10L, null)).thenReturn(List.of(cerrada));

            List<MaintenanceFrequencyResponse> res = service.findHistory(10L, null);

            assertThat(res).hasSize(1);
            assertThat(res.get(0).current()).isFalse();
            assertThat(res.get(0).validTo()).isNotNull();
        }
    }
}
