package pe.edu.pucp.hesperides.modules.irrigation.service;

import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParameterReader;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.irrigation.dto.CreateIrrigationTurnRequest;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationZoneResponse;
import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationTurn;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationTurnSectionsRepository;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationTurnsRepository;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationZoneQueries;

import javax.sql.DataSource;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.util.ReflectionTestUtils.setField;

@SpringJUnitConfig(IrrigationBatchTransactionTest.JpaConfig.class)
class IrrigationBatchTransactionTest {
    @Autowired DataSource dataSource;
    @Autowired IrrigationTurnsService service;
    @Autowired IrrigationTurnsRepository turns;
    @Autowired IrrigationTurnSectionsRepository turnSections;
    @MockitoBean IrrigationZoneQueries zones;
    @MockitoBean UsersRepository users;
    @MockitoBean CatalogItemsRepository catalogItems;
    @MockitoBean SystemParameterReader parameters;

    @Test
    void rollsBackFirstTurnWhenDatabaseRejectsSecondTurn() {
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        jdbc.execute("ALTER TABLE irrigation_turn_sections ADD CONSTRAINT reject_second CHECK (section_zone_id <> 21)");

        User user = new User();
        setField(user, "id", 41L);
        user.setActive(true);
        CatalogItem role = new CatalogItem();
        role.setCode("SUPERVISOR");
        user.setRoleItem(role);
        String email = "registrador@example.test";
        when(users.findActiveByEmail(email)).thenReturn(Optional.of(user));
        when(zones.sectors()).thenReturn(List.of(new IrrigationZoneResponse(1L, "A", "Sector A"),
            new IrrigationZoneResponse(2L, "B", "Sector B")));
        IrrigationZoneResponse firstSection = new IrrigationZoneResponse(11L, "A-1", "Sección A-1");
        when(zones.sectionsOf(1L)).thenReturn(List.of(firstSection));
        when(zones.sectionsOf(2L)).thenReturn(List.of(new IrrigationZoneResponse(21L, "B-1", "Sección B-1")));
        when(zones.recordedSections(anyLong())).thenAnswer(invocation -> {
            assertThat(jdbc.queryForList("SELECT section_zone_id FROM irrigation_turn_sections WHERE turn_id = ?",
                Long.class, invocation.<Long>getArgument(0))).containsExactly(firstSection.id());
            return List.of(firstSection);
        });

        LocalDate date = LocalDate.of(2026, 11, 5);
        var first = new CreateIrrigationTurnRequest(1L, date, null, null, List.of(11L), null, null, null);
        var second = new CreateIrrigationTurnRequest(2L, date, null, null, List.of(21L), null, null, null);
        assertThatThrownBy(() -> service.createBatch(List.of(first, second), email))
            .isInstanceOf(DataIntegrityViolationException.class);
        verify(zones).recordedSections(anyLong());
        assertThat(turns.count()).isZero();
        assertThat(turnSections.count()).isZero();
    }

    @TestConfiguration(proxyBeanMethods = false)
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackageClasses = IrrigationTurnsRepository.class)
    @Import(IrrigationTurnsServiceImpl.class)
    static class JpaConfig {
        @Bean(destroyMethod = "shutdown")
        EmbeddedDatabase dataSource() {
            return new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2).generateUniqueName(true).build();
        }

        @Bean
        LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan(IrrigationTurn.class.getPackageName());
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop"));
            return factory;
        }

        @Bean
        JpaTransactionManager transactionManager(EntityManagerFactory entityManagerFactory) {
            return new JpaTransactionManager(entityManagerFactory);
        }
    }
}
