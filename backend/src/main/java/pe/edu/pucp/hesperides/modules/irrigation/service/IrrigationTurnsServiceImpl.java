package pe.edu.pucp.hesperides.modules.irrigation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.admin.SystemParameterCodes;
import pe.edu.pucp.hesperides.modules.admin.service.SystemParameterReader;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
import pe.edu.pucp.hesperides.modules.catalogs.entity.CatalogItem;
import pe.edu.pucp.hesperides.modules.catalogs.repository.CatalogItemsRepository;
import pe.edu.pucp.hesperides.modules.irrigation.dto.CreateIrrigationTurnRequest;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationTurnResponse;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationWaterDetailsRequest;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationWaterDetailsResponse;
import pe.edu.pucp.hesperides.modules.irrigation.dto.IrrigationZoneResponse;
import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationTurn;
import pe.edu.pucp.hesperides.modules.irrigation.entity.IrrigationTurnSection;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationTurnSectionsRepository;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationTurnsRepository;
import pe.edu.pucp.hesperides.modules.irrigation.repository.IrrigationZoneQueries;
import pe.edu.pucp.hesperides.shared.exception.ResourceNotFoundException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;
import pe.edu.pucp.hesperides.shared.security.RoleCodes;
import pe.edu.pucp.hesperides.shared.time.DailyTimeWindow;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IrrigationTurnsServiceImpl implements IrrigationTurnsService {
    private static final String WATER_SOURCE = "IRRIGATION_WATER_SOURCE";
    private static final String IRRIGATION_METHOD = "IRRIGATION_METHOD";
    private static final String WINDOW_EXCEPTION = "IRRIGATION_WINDOW_EXCEPTION";
    private static final String TANKER = "TANKER";
    private static final BigDecimal VOLUME_LIMIT = new BigDecimal("1000000000");
    private static final DailyTimeWindow DEFAULT_WINDOW =
        new DailyTimeWindow(LocalTime.of(6, 30), LocalTime.of(11, 30));

    private final IrrigationTurnsRepository turns;
    private final IrrigationTurnSectionsRepository turnSections;
    private final IrrigationZoneQueries zones;
    private final UsersRepository users;
    private final CatalogItemsRepository catalogItems;
    private final SystemParameterReader parameters;

    private record PreparedTurn(IrrigationTurn turn, List<Long> sectionIds) {}

    @Override
    @Transactional(readOnly = true)
    public DailyTimeWindow operatingWindow() {
        return parameters.read(SystemParameterCodes.IRRIGATION_OPERATING_WINDOW)
            .flatMap(DailyTimeWindow::parse).orElse(DEFAULT_WINDOW);
    }

    private User currentUser(String email) {
        return users.findActiveByEmail(email)
            .filter(User::isActive)
            .orElseThrow(() -> new AccessDeniedException("Sin sesión válida"));
    }

    /** Irrigation access to active sectors is independent of team assignments. */
    private boolean canManageIrrigation(User user) {
        String role = user.getRoleCode();
        return RoleCodes.ADMIN.equals(role) || RoleCodes.COORDINADOR.equals(role) || RoleCodes.SUPERVISOR.equals(role);
    }

    private Set<Long> accessibleSectorIds(User user) {
        if (!canManageIrrigation(user)) {
            return Set.of();
        }
        return zones.sectors().stream().map(IrrigationZoneResponse::id)
            .collect(Collectors.toSet());
    }

    private void assertAccess(Long sectorId, User user) {
        if (!accessibleSectorIds(user).contains(sectorId)) {
            // No revelar si el sector existe a quien no tiene acceso.
            throw new ResourceNotFoundException("Sector no disponible");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<IrrigationZoneResponse> sectors(String email) {
        return canManageIrrigation(currentUser(email)) ? zones.sectors() : List.of();
    }

    @Override
    @Transactional(readOnly = true)
    public List<IrrigationZoneResponse> sections(Long sectorId, String email) {
        assertAccess(sectorId, currentUser(email));
        return zones.sectionsOf(sectorId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<IrrigationTurnResponse> list(LocalDate from, LocalDate to, Long sectorId, String email) {
        if (from == null || to == null || from.isAfter(to)) {
            throw new ValidationException("El rango de fechas no es válido");
        }
        User user = currentUser(email);
        Set<Long> allowed = accessibleSectorIds(user);
        if (sectorId != null && !allowed.contains(sectorId)) {
            throw new ResourceNotFoundException("Sector no disponible");
        }
        return turns.findByIrrigationDateBetweenAndDeletedAtIsNullOrderByIrrigationDateDescIdDesc(from, to)
            .stream()
            .filter(t -> allowed.contains(t.getSectorZoneId()))
            .filter(t -> sectorId == null || sectorId.equals(t.getSectorZoneId()))
            .map(this::toResponse)
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public IrrigationTurnResponse findOne(Long id, String email) {
        IrrigationTurn turn = turns.findById(id)
            .filter(t -> !t.isDeleted())
            .orElseThrow(() -> new ResourceNotFoundException("Turno no encontrado"));
        assertAccess(turn.getSectorZoneId(), currentUser(email));
        return toResponse(turn);
    }

    @Override
    @Transactional
    public IrrigationTurnResponse create(CreateIrrigationTurnRequest request, String email) {
        User user = writer(email);
        return persistTurn(prepareTurn(request, user, operatingWindow()));
    }

    /** Prevalida TODOS los sectores y los guarda en una sola transaccion. */
    @Override
    @Transactional
    public List<IrrigationTurnResponse> createBatch(List<CreateIrrigationTurnRequest> requests, String email) {
        User user = writer(email);
        IrrigationBatchRules.check(requests);
        DailyTimeWindow window = operatingWindow();
        List<PreparedTurn> prepared = requests.stream().map(request -> prepareTurn(request, user, window)).toList();
        return prepared.stream().map(this::persistTurn).toList();
    }

    private User writer(String email) {
        User user = currentUser(email);
        if (!canManageIrrigation(user)) {
            throw new AccessDeniedException("No autorizado para registrar turnos de riego");
        }
        return user;
    }

    private void validateTurn(CreateIrrigationTurnRequest request, User user) {
        if (request == null || request.sectorZoneId() == null || request.irrigationDate() == null) {
            throw new ValidationException("Sector y fecha son obligatorios");
        }
        IrrigationTurnRules.check(request.startedAt(), request.finishedAt(), request.sectionZoneIds());
        assertAccess(request.sectorZoneId(), user);
        Set<Long> availableSections = zones.sectionsOf(request.sectorZoneId()).stream()
            .map(IrrigationZoneResponse::id)
            .collect(Collectors.toSet());
        if (!availableSections.containsAll(request.sectionZoneIds())) {
            throw new ValidationException("Una o mas secciones no pertenecen al sector seleccionado");
        }
    }

    private PreparedTurn prepareTurn(CreateIrrigationTurnRequest request, User user, DailyTimeWindow window) {
        validateTurn(request, user);
        IrrigationTurn turn = new IrrigationTurn();
        turn.setSectorZoneId(request.sectorZoneId());
        // The legacy column stores the user who recorded the turn, regardless of role.
        turn.setSupervisorUserId(user.getId());
        turn.setIrrigationDate(request.irrigationDate());
        turn.setStartedAt(request.startedAt());
        turn.setFinishedAt(request.finishedAt());
        turn.setNotes(request.notes() == null ? null : request.notes().trim());
        turn.setWindowExceptionItemId(validateWindowException(request, window));
        applyWaterDetails(turn, request.waterDetails());
        return new PreparedTurn(turn, request.sectionZoneIds());
    }

    private Long validateWindowException(CreateIrrigationTurnRequest request, DailyTimeWindow window) {
        String reason = request.windowExceptionCode();
        if (!window.excludes(request.startedAt()) && !window.excludes(request.finishedAt())) {
            if (reason != null) {
                throw new ValidationException("El motivo de excepción solo corresponde a un turno fuera del horario");
            }
            return null;
        }
        return catalogItems.findActiveItemByTypeAndCode(WINDOW_EXCEPTION, reason)
            .map(CatalogItem::getId)
            .orElseThrow(() -> new ValidationException("El turno queda fuera de la ventana de riego ("
                + window.start() + "–" + window.end() + "). Indica si fue una emergencia o una autorización especial"));
    }

    private void applyWaterDetails(IrrigationTurn turn, IrrigationWaterDetailsRequest details) {
        if (details == null) {
            return;
        }
        CatalogItem source = catalogItems.findActiveItemByTypeAndCode(WATER_SOURCE, details.sourceCode())
            .orElseThrow(() -> new ValidationException("Selecciona una fuente de agua válida"));
        CatalogItem method = catalogItems.findActiveItemByTypeAndCode(IRRIGATION_METHOD, details.methodCode())
            .orElseThrow(() -> new ValidationException("Selecciona un método de riego válido"));
        BigDecimal trips = details.tankerTrips();
        BigDecimal volume = details.tankerVolumeM3();
        boolean hasTankerData = trips != null || volume != null;
        if (TANKER.equals(source.getCode()) && !hasTankerData) {
            throw new ValidationException("Para cisterna, indica el número de viajes o el volumen aproximado");
        }
        if (!TANKER.equals(source.getCode()) && hasTankerData) {
            throw new ValidationException("Los viajes y el volumen solo corresponden a riego con cisterna");
        }
        if (trips != null) {
            try {
                int count = trips.intValueExact();
                if (count <= 0) {
                    throw new ValidationException("El número de viajes debe ser un entero positivo");
                }
                turn.setTankerTrips(count);
            } catch (ArithmeticException ex) {
                throw new ValidationException("El número de viajes debe ser un entero positivo");
            }
        }
        if (volume != null && (volume.signum() <= 0 || volume.compareTo(VOLUME_LIMIT) >= 0
                || volume.stripTrailingZeros().scale() > 3)) {
            throw new ValidationException("El volumen debe ser positivo, menor que 1000 millones y con hasta tres decimales");
        }
        turn.setWaterSourceItemId(source.getId());
        turn.setIrrigationMethodItemId(method.getId());
        turn.setTankerVolumeM3(volume);
    }

    private IrrigationTurnResponse persistTurn(PreparedTurn prepared) {
        IrrigationTurn turn = prepared.turn();
        turns.save(turn);

        List<IrrigationTurnSection> details = prepared.sectionIds().stream().map(sectionId -> {
            IrrigationTurnSection detail = new IrrigationTurnSection();
            detail.setTurnId(turn.getId());
            detail.setSectionZoneId(sectionId);
            return detail;
        }).toList();
        // Flush the links before the JDBC read used to build the response.
        turnSections.saveAllAndFlush(details);
        return toResponse(turn);
    }

    private IrrigationTurnResponse toResponse(IrrigationTurn turn) {
        List<IrrigationZoneResponse> sectors = zones.sectors();
        String sectorName = sectors.stream()
            .filter(z -> z.id().equals(turn.getSectorZoneId()))
            .map(IrrigationZoneResponse::name).findFirst().orElse("Sector sin nombre");
        List<IrrigationZoneResponse> wateredSections = zones.recordedSections(turn.getId());
        String exceptionLabel = turn.getWindowExceptionItemId() == null ? null
            : catalogItems.findById(turn.getWindowExceptionItemId()).map(CatalogItem::getLabel).orElse(null);
        return new IrrigationTurnResponse(turn.getId(), turn.getSectorZoneId(), sectorName,
            turn.getSupervisorUserId(), turn.getIrrigationDate(), turn.getStartedAt(),
            turn.getFinishedAt(), wateredSections, turn.getNotes(), waterDetails(turn), exceptionLabel);
    }

    private IrrigationWaterDetailsResponse waterDetails(IrrigationTurn turn) {
        if (turn.getWaterSourceItemId() == null) {
            return null;
        }
        var labels = catalogItems.findAllById(List.of(turn.getWaterSourceItemId(), turn.getIrrigationMethodItemId()))
            .stream().collect(Collectors.toMap(CatalogItem::getId, CatalogItem::getLabel));
        return new IrrigationWaterDetailsResponse(labels.get(turn.getWaterSourceItemId()),
            labels.get(turn.getIrrigationMethodItemId()), turn.getTankerTrips(), turn.getTankerVolumeM3());
    }
}
