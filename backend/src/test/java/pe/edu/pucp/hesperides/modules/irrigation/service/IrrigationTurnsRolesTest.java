package pe.edu.pucp.hesperides.modules.irrigation.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.irrigation.dto.CreateIrrigationTurnRequest;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationTurnResponse;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationZoneResponse;
import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationTurn;
import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationTurnSection;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationTurnSectionsRepository;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationTurnsRepository;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationZoneQueries;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.util.ReflectionTestUtils.setField;

@ExtendWith(MockitoExtension.class)
class IrrigationTurnsRolesTest {
    private static final LocalDate DATE = LocalDate.of(2026, 11, 5);
    private static final LocalTime START = LocalTime.of(7, 30);
    private static final LocalTime FINISH = LocalTime.of(8, 0);
    private static final IrrigationZoneResponse SECTOR_A = new IrrigationZoneResponse(1L, "A", "Sector A");
    private static final IrrigationZoneResponse SECTOR_B = new IrrigationZoneResponse(2L, "B", "Sector B");
    private static final IrrigationZoneResponse SECTION_A = new IrrigationZoneResponse(11L, "A-1", "Sección A-1");
    private static final IrrigationZoneResponse OTHER_SECTION_A = new IrrigationZoneResponse(12L, "A-2", "Sección A-2");
    private static final IrrigationZoneResponse SECTION_B = new IrrigationZoneResponse(21L, "B-1", "Sección B-1");

    @Mock IrrigationTurnsRepository turns;
    @Mock IrrigationTurnSectionsRepository turnSections;
    @Mock IrrigationZoneQueries zones;
    @Mock UsersRepository users;

    private IrrigationTurnsServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new IrrigationTurnsServiceImpl(turns, turnSections, zones, users);
    }

    private String login(String role, long id) {
        User user = new User();
        setField(user, "id", id);
        CatalogItem catalogItem = new CatalogItem();
        catalogItem.setCode(role);
        user.setRoleItem(catalogItem);
        user.setActive(true);
        String email = role + "@example.test";
        when(users.findActiveByEmail(email)).thenReturn(Optional.of(user));
        return email;
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPERVISOR", "COORDINADOR", "ADMIN"})
    void listsActiveSectorsAndSectionsWithoutTeamAssignment(String role) {
        String email = login(role, 47L);
        when(zones.sectors()).thenReturn(List.of(SECTOR_A, SECTOR_B));
        when(zones.sectionsOf(SECTOR_B.id())).thenReturn(List.of(SECTION_B));

        assertThat(service.sectors(email)).containsExactly(SECTOR_A, SECTOR_B);
        assertThat(service.sections(SECTOR_B.id(), email)).containsExactly(SECTION_B);
        assertThatThrownBy(() -> service.sections(3L, email)).isInstanceOf(ResourceNotFoundException.class);
        verify(zones, never()).activeSectorsOfSupervisor(anyLong());
    }

    @ParameterizedTest
    @CsvSource({"SUPERVISOR,41", "COORDINADOR,42", "ADMIN,43"})
    void recordsOnlySelectedSectionsWithRegistrantIdentity(String role, long userId) {
        String email = login(role, userId);
        when(zones.sectors()).thenReturn(List.of(SECTOR_A, SECTOR_B));
        when(zones.sectionsOf(SECTOR_A.id())).thenReturn(List.of(SECTION_A, OTHER_SECTION_A));
        when(zones.recordedSections(101L)).thenReturn(List.of(SECTION_A));
        simulateTurnIds();

        IrrigationTurnResponse result = service.create(request(SECTOR_A.id(), SECTION_A.id()), email);

        assertThat(result).isEqualTo(new IrrigationTurnResponse(101L, SECTOR_A.id(), SECTOR_A.name(), userId,
            DATE, START, FINISH, List.of(SECTION_A), "Riego ejecutado"));
        verify(turns).save(argThat(turn -> turn.getSupervisorUserId().equals(userId)
            && turn.getSectorZoneId().equals(SECTOR_A.id()) && turn.getIrrigationDate().equals(DATE)
            && turn.getStartedAt().equals(START) && turn.getFinishedAt().equals(FINISH)
            && turn.getNotes().equals("Riego ejecutado")));
        verify(turnSections).saveAllAndFlush(argThat(details -> onlySection(details, 101L, SECTION_A.id())));
    }

    @ParameterizedTest
    @ValueSource(strings = {"SUPERVISOR", "COORDINADOR", "ADMIN"})
    void listsActiveSectorHistoryAndFiltersBySectorAndDate(String role) {
        String email = login(role, 47L);
        LocalDate from = DATE.minusDays(2);
        LocalDate to = DATE.plusDays(2);
        when(zones.sectors()).thenReturn(List.of(SECTOR_A, SECTOR_B));
        when(zones.recordedSections(101L)).thenReturn(List.of(SECTION_A));
        when(zones.recordedSections(102L)).thenReturn(List.of(SECTION_B));
        when(turns.findByIrrigationDateBetweenAndDeletedAtIsNullOrderByIrrigationDateDescIdDesc(from, to))
            .thenReturn(List.of(existingTurn(103L, 3L), existingTurn(102L, SECTOR_B.id()),
                existingTurn(101L, SECTOR_A.id())));

        assertThat(service.list(from, to, null, email)).extracting(IrrigationTurnResponse::id)
            .containsExactly(102L, 101L);
        assertThat(service.list(from, to, SECTOR_A.id(), email)).singleElement()
            .satisfies(turn -> {
                assertThat(turn.id()).isEqualTo(101L);
                assertThat(turn.supervisorUserId()).isEqualTo(19L);
                assertThat(turn.sections()).containsExactly(SECTION_A);
            });
        assertThatThrownBy(() -> service.list(from, to, 3L, email)).isInstanceOf(ResourceNotFoundException.class);
        assertThatThrownBy(() -> service.list(to, from, null, email)).isInstanceOf(ValidationException.class);
    }

    @Test
    void recordsEachSectorWithItsOwnSectionsInBatch() {
        String email = login("COORDINADOR", 42L);
        when(zones.sectors()).thenReturn(List.of(SECTOR_A, SECTOR_B));
        when(zones.sectionsOf(SECTOR_A.id())).thenReturn(List.of(SECTION_A));
        when(zones.sectionsOf(SECTOR_B.id())).thenReturn(List.of(SECTION_B));
        when(zones.recordedSections(101L)).thenReturn(List.of(SECTION_A));
        when(zones.recordedSections(102L)).thenReturn(List.of(SECTION_B));
        simulateTurnIds();

        List<IrrigationTurnResponse> batch = service.createBatch(List.of(
            request(SECTOR_A.id(), SECTION_A.id()), request(SECTOR_B.id(), SECTION_B.id())), email);

        assertThat(batch).extracting(IrrigationTurnResponse::sectorZoneId).containsExactly(SECTOR_A.id(), SECTOR_B.id());
        assertThat(batch).extracting(IrrigationTurnResponse::sections)
            .containsExactly(List.of(SECTION_A), List.of(SECTION_B));
        assertThat(batch).extracting(IrrigationTurnResponse::supervisorUserId).containsOnly(42L);
        verify(turnSections).saveAllAndFlush(argThat(details -> onlySection(details, 101L, SECTION_A.id())));
        verify(turnSections).saveAllAndFlush(argThat(details -> onlySection(details, 102L, SECTION_B.id())));
    }

    @Test
    void rejectsEntireBatchWhenSectionBelongsToAnotherSector() {
        String email = login("ADMIN", 43L);
        when(zones.sectors()).thenReturn(List.of(SECTOR_A, SECTOR_B));
        when(zones.sectionsOf(SECTOR_A.id())).thenReturn(List.of(SECTION_A));
        when(zones.sectionsOf(SECTOR_B.id())).thenReturn(List.of(SECTION_B));

        assertThatThrownBy(() -> service.createBatch(List.of(
            request(SECTOR_A.id(), SECTION_A.id()), request(SECTOR_B.id(), SECTION_A.id())), email))
            .isInstanceOf(ValidationException.class);
        verifyNoInteractions(turns, turnSections);
    }

    @ParameterizedTest
    @ValueSource(strings = {"OPERARIO", "OTRO"})
    void deniesSingleAndBatchCreationForUnauthorizedRoles(String role) {
        String email = login(role, 49L);
        CreateIrrigationTurnRequest request = request(SECTOR_A.id(), SECTION_A.id());
        assertThatThrownBy(() -> service.create(request, email)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.createBatch(List.of(request), email))
            .isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(zones, turns, turnSections);
    }

    private static CreateIrrigationTurnRequest request(Long sectorId, Long sectionId) {
        return new CreateIrrigationTurnRequest(sectorId, DATE, START, FINISH, List.of(sectionId), " Riego ejecutado ");
    }

    private static IrrigationTurn existingTurn(long turnId, long sectorId) {
        IrrigationTurn turn = new IrrigationTurn();
        setField(turn, "id", turnId);
        turn.setSectorZoneId(sectorId);
        turn.setIrrigationDate(DATE);
        turn.setSupervisorUserId(19L);
        return turn;
    }

    private void simulateTurnIds() {
        when(turns.save(any(IrrigationTurn.class))).thenAnswer(invocation -> {
            IrrigationTurn turn = invocation.getArgument(0);
            setField(turn, "id", 100L + turn.getSectorZoneId());
            return turn;
        });
    }

    private static boolean onlySection(Iterable<IrrigationTurnSection> details, long turnId, long sectionId) {
        var iterator = details.iterator();
        if (!iterator.hasNext()) {
            return false;
        }
        IrrigationTurnSection section = iterator.next();
        return section.getTurnId().equals(turnId) && section.getSectionZoneId().equals(sectionId) && !iterator.hasNext();
    }
}
