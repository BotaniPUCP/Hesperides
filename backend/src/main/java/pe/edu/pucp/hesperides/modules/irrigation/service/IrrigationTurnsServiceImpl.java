package pe.edu.pucp.hesperides.modules.irrigation.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.auth.entity.User;
import pe.edu.pucp.hesperides.modules.auth.repository.UsersRepository;
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
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class IrrigationTurnsServiceImpl implements IrrigationTurnsService {
    private final IrrigationTurnsRepository turns;
    private final IrrigationTurnSectionsRepository turnSections;
    private final IrrigationZoneQueries zones;
    private final UsersRepository users;

    private User currentUser(String email) {
        return users.findActiveByEmail(email)
            .filter(User::isActive)
            .orElseThrow(() -> new AccessDeniedException("Sin sesión válida"));
    }

    private boolean isManager(User user) {
        return "ADMIN".equals(user.getRoleCode()) || "COORDINADOR".equals(user.getRoleCode());
    }

    private Set<Long> accessibleSectorIds(User user) {
        if (isManager(user)) {
            return sectorsIds();
        }
        if ("SUPERVISOR".equals(user.getRoleCode())) {
            Set<Long> assigned = new HashSet<>(zones.activeSectorsOfSupervisor(user.getId()));
            assigned.retainAll(sectorsIds());
            return assigned;
        }
        return Set.of();
    }

    private Set<Long> sectorsIds() {
        return zones.sectors().stream().map(IrrigationZoneResponse::id)
            .collect(java.util.stream.Collectors.toSet());
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
        Set<Long> allowed = accessibleSectorIds(currentUser(email));
        return zones.sectors().stream().filter(z -> allowed.contains(z.id())).toList();
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
        validateTurn(request, user);
        return persistTurn(request, user);
    }

    /** Prevalida TODOS los sectores y los guarda en una sola transaccion. */
    @Override
    @Transactional
    public List<IrrigationTurnResponse> createBatch(List<CreateIrrigationTurnRequest> requests, String email) {
        User user = writer(email);
        IrrigationBatchRules.check(requests);
        requests.forEach(request -> validateTurn(request, user));
        return requests.stream().map(request -> persistTurn(request, user)).toList();
    }

    private User writer(String email) {
        User user = currentUser(email);
        if (!"SUPERVISOR".equals(user.getRoleCode())) {
            throw new AccessDeniedException("Solo el supervisor registra turnos");
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
            .collect(java.util.stream.Collectors.toSet());
        if (!availableSections.containsAll(request.sectionZoneIds())) {
            throw new ValidationException("Una o mas secciones no pertenecen al sector seleccionado");
        }
    }

    private IrrigationTurnResponse persistTurn(CreateIrrigationTurnRequest request, User user) {
        IrrigationTurn turn = new IrrigationTurn();
        turn.setSectorZoneId(request.sectorZoneId());
        turn.setSupervisorUserId(user.getId());
        turn.setIrrigationDate(request.irrigationDate());
        turn.setStartedAt(request.startedAt());
        turn.setFinishedAt(request.finishedAt());
        turn.setNotes(request.notes() == null ? null : request.notes().trim());
        turns.save(turn);

        List<IrrigationTurnSection> details = request.sectionZoneIds().stream().map(sectionId -> {
            IrrigationTurnSection detail = new IrrigationTurnSection();
            detail.setTurnId(turn.getId());
            detail.setSectionZoneId(sectionId);
            return detail;
        }).toList();
        turnSections.saveAll(details);
        return toResponse(turn);
    }

    private IrrigationTurnResponse toResponse(IrrigationTurn turn) {
        List<IrrigationZoneResponse> sectors = zones.sectors();
        String sectorName = sectors.stream()
            .filter(z -> z.id().equals(turn.getSectorZoneId()))
            .map(IrrigationZoneResponse::name).findFirst().orElse("Sector sin nombre");
        Set<Long> wateredIds = turnSections.findByTurnIdAndDeletedAtIsNullOrderById(turn.getId())
            .stream().map(IrrigationTurnSection::getSectionZoneId)
            .collect(java.util.stream.Collectors.toSet());
        List<IrrigationZoneResponse> wateredSections = zones.sectionsOf(turn.getSectorZoneId())
            .stream().filter(s -> wateredIds.contains(s.id())).toList();
        return new IrrigationTurnResponse(turn.getId(), turn.getSectorZoneId(), sectorName,
            turn.getSupervisorUserId(), turn.getIrrigationDate(), turn.getStartedAt(),
            turn.getFinishedAt(), wateredSections, turn.getNotes());
    }
}
