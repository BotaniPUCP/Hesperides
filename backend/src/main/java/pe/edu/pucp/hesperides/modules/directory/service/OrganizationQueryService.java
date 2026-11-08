package pe.edu.pucp.hesperides.modules.directory.service;

import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.CodeLabel;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationDetail;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSuggestion;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.OrganizationSummary;
import pe.edu.pucp.hesperides.modules.directory.dto.DirectoryResponses.Page;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationReadRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository;
import pe.edu.pucp.hesperides.modules.directory.repository.OrganizationRepository.OrganizationRow;
import pe.edu.pucp.hesperides.shared.persistence.LikePattern;

/** Lista, parecidos y ficha de organizaciones. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizationQueryService {

    private final OrganizationRepository organizations;
    private final OrganizationReadRepository reads;

    public Page<OrganizationSummary> list(String q, String typeCode, int page, int size) {
        String search = LikePattern.contains(DirectoryText.optional(q));
        String type = DirectoryText.optional(typeCode);
        return new Page<>(page, size, reads.count(search, type), reads.page(search, type, page, size));
    }

    public List<OrganizationSuggestion> similar(String name) {
        String text = DirectoryText.optional(name);
        if (text == null) {
            return List.of();
        }
        return reads.similar(text, DirectoryText.SIMILARITY_THRESHOLD, DirectoryText.MAX_SUGGESTIONS);
    }

    public OrganizationDetail detail(String code) {
        OrganizationRow row = organizations.byCode(code);
        CodeLabel type = new CodeLabel(row.typeCode(), row.typeLabel());
        return new OrganizationDetail(row.code(), row.name(), type, row.ruc(), row.phone(),
                organizations.aliases(row.id()), row.active(), reads.contacts(row.id()));
    }
}
