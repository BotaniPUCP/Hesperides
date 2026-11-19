package pe.edu.pucp.hesperides.modules.directory.service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Supplier;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.directory.RucRule;
import pe.edu.pucp.hesperides.modules.directory.dto.OrganizationRequest;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.Created;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository.OrganizationRow;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository.OrganizationValues;
import pe.edu.pucp.hesperides.shared.audit.AuditActionCode;
import pe.edu.pucp.hesperides.shared.audit.AuditService;
import pe.edu.pucp.hesperides.shared.exception.BusinessRuleException;
import pe.edu.pucp.hesperides.shared.exception.DuplicateResourceException;
import pe.edu.pucp.hesperides.shared.exception.ValidationException;

/** Altas, cambios y bajas de organizaciones, con la unicidad de nombre, alias y RUC. */
@Service
@RequiredArgsConstructor
public class OrganizationService {

    static final String PUCP_UNIT = "PUCP_UNIT";
    private static final String ENTITY = "Organization";

    private final OrganizationRepository organizations;
    private final ActiveRecords active;
    private final AuditService audit;

    @Transactional
    public String create(OrganizationRequest request) {
        OrganizationValues values = resolve(request, null);
        List<String> aliases = aliases(request, values.name());
        checkNamesFree(values.name(), aliases, null);
        Created created = saveUnique(() -> organizations.insert(values), values.name());
        organizations.replaceAliases(created.id(), aliases);
        audit.record(AuditActionCode.ORGANIZATION_CREATED, ENTITY, created.id(), Map.of("name", values.name()));
        return created.code();
    }

    @Transactional
    public void update(String code, OrganizationRequest request) {
        OrganizationRow current = active.organization(code);
        OrganizationValues values = resolve(request, current.id());
        List<String> aliases = aliases(request, values.name());
        checkNamesFree(values.name(), aliases, current.id());
        List<String> changed = changedFields(current, request, values);
        DirectoryText.addIfChanged(changed, "aliases", DirectoryText.sortedKeys(organizations.aliases(current.id())),
                DirectoryText.sortedKeys(aliases));
        saveUnique(() -> {
            organizations.update(current.id(), values);
            return null;
        }, values.name());
        organizations.replaceAliases(current.id(), aliases);
        audit.record(AuditActionCode.ORGANIZATION_UPDATED, ENTITY, current.id(), Map.of("fields", changed));
    }

    @Transactional
    public void deactivate(String code) {
        OrganizationRow organization = active.organization(code);
        organizations.softDelete(organization.id());
        audit.record(AuditActionCode.ORGANIZATION_DEACTIVATED, ENTITY, organization.id(),
                Map.of("name", organization.name()));
    }

    private OrganizationValues resolve(OrganizationRequest request, Long exceptId) {
        long typeId = organizations.typeItemId(request.typeCode());
        String ruc = DirectoryText.optional(request.ruc());
        if (ruc != null) {
            checkRuc(ruc, request.typeCode(), exceptId);
        }
        return new OrganizationValues(request.name().strip(), typeId, ruc, DirectoryText.optional(request.phone()));
    }

    private void checkRuc(String ruc, String typeCode, Long exceptId) {
        if (PUCP_UNIT.equals(typeCode)) {
            throw new BusinessRuleException("A PUCP unit has no RUC; only external companies do");
        }
        if (!RucRule.isValid(ruc)) {
            throw new ValidationException("The RUC must have 11 digits and start with 10 or 20");
        }
        if (organizations.rucTaken(ruc, exceptId)) {
            throw new DuplicateResourceException("Another organization already has RUC " + ruc);
        }
    }

    /** Sin repetidos ni el propio nombre: «Derecho» y «derecho» son un solo alias. */
    private static List<String> aliases(OrganizationRequest request, String name) {
        Map<String, String> byKey = new LinkedHashMap<>();
        request.aliasesOrEmpty().stream().map(String::strip).filter(alias -> !alias.isEmpty())
                .filter(alias -> !alias.equalsIgnoreCase(name))
                .forEach(alias -> byKey.putIfAbsent(alias.toLowerCase(Locale.ROOT), alias));
        return new ArrayList<>(byKey.values());
    }

    private void checkNamesFree(String name, List<String> aliases, Long exceptId) {
        List<String> texts = new ArrayList<>(aliases);
        texts.addFirst(name);
        organizations.nameTakenBy(texts, exceptId).ifPresent(owner -> {
            throw new DuplicateResourceException("The name or an alias is already used by «" + owner + "»");
        });
    }

    private static List<String> changedFields(OrganizationRow current, OrganizationRequest request,
            OrganizationValues values) {
        List<String> changed = new ArrayList<>();
        DirectoryText.addIfChanged(changed, "name", current.name(), values.name());
        DirectoryText.addIfChanged(changed, "type", current.typeCode(), request.typeCode());
        DirectoryText.addIfChanged(changed, "ruc", current.ruc() == null ? null : current.ruc().strip(), values.ruc());
        DirectoryText.addIfChanged(changed, "phone", current.phone(), values.phone());
        return changed;
    }

    /** El índice único cierra la carrera entre dos altas simultáneas que pasaron la verificación. */
    private static <T> T saveUnique(Supplier<T> save, String name) {
        try {
            return save.get();
        } catch (DuplicateKeyException e) {
            throw new DuplicateResourceException("The name or an alias is already used by «" + name + "»");
        }
    }
}
