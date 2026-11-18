package pe.edu.pucp.hesperides.modules.directory.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.CodeLabel;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationDetail;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSummary;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationReadRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository.OrganizationRow;

/** Lista completa y ficha de organizaciones. Buscar, filtrar y los parecidos van en el navegador (SPEC-119). */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationQueryService {

    private final OrganizationRepository organizations;
    private final OrganizationReadRepository reads;

    public List<OrganizationSummary> all() {
        return reads.all();
    }

    public OrganizationDetail detail(String code) {
        OrganizationRow row = organizations.byCode(code);
        CodeLabel type = new CodeLabel(row.typeCode(), row.typeLabel());
        return new OrganizationDetail(row.code(), row.name(), type, row.ruc(), row.phone(),
                organizations.aliases(row.id()), row.active(), reads.contacts(row.id()));
    }
}
