package pe.edu.pucp.hesperides.modules.planning.sets.service;

import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetRequest;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.Detail;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.ElementRef;
import pe.edu.pucp.hesperides.modules.planning.sets.dto.GreenAreaSetResponses.Summary;

import java.util.List;

public interface GreenAreaSetsService {

    List<Summary> list();

    Detail get(long id);

    Detail create(GreenAreaSetRequest request, String email);

    Detail update(long id, GreenAreaSetRequest request, String email);

    void delete(long id);

    /** Los ejemplares del catastro que se pueden agregar a un conjunto, con su sector. */
    List<ElementRef> elementOptions();
}
