package pe.edu.pucp.hesperides.modules.interventions.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.edu.pucp.hesperides.engine.neighborhood.ZoneNeighborhood;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionZoneSelections.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.Location;
import pe.edu.pucp.hesperides.modules.interventions.repository.*;
import pe.edu.pucp.hesperides.shared.exception.*;
import tools.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly=true)
public class InterventionZoneSelectionsServiceImpl implements InterventionZoneSelectionsService {
    private final InterventionZoneSelectionsRepository repository;
    private final InterventionReferencesRepository references;
    private final ObjectMapper json;
    private record Inventory(List<Place> places, List<Zone> zones, String revision) {
        Place place(long id) {
            return places.stream().filter(p->p.id()==id).findFirst()
                .orElseThrow(()->new ResourceNotFoundException("Place not found"));
        }
    }
    private String hash(String input) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    private Inventory inventory() {
        var places=repository.places(); var zones=repository.zones();
        return new Inventory(places,zones,hash(json.writeValueAsString(List.of(places,zones))));
    }
    private Options options(Inventory inventory,long place,boolean candidates) {
        var p=inventory.place(place);
        var review=repository.review(place).orElse(null);
        boolean current=review!=null && p.geometryValid() && review.revision().equals(inventory.revision());
        Set<Long> ids=review==null?Set.of():repository.associated(review.id());
        var allowed=current?inventory.zones().stream().filter(z->ids.contains(z.id())).toList():List.<Zone>of();
        String token=current?hash(inventory.revision()+":"+review.id()+":"+review.version()+":"+ids):null;
        return new Options(p,inventory.revision(),review==null?0:review.version(),review!=null,current,token,
            allowed,candidates?inventory.zones():List.of(),review==null?null:review.at(),review==null?null:review.actor());
    }
    @Override public Options options(long placeId,boolean includeCandidates) {
        return options(inventory(),placeId,includeCandidates);
    }
    @Override @Transactional public Options review(long placeId,Review request,long actorId) {
        repository.lockInventory();
        var inventory=inventory(); var place=inventory.place(placeId);
        if(!place.geometryValid())throw new BusinessRuleException("Place requires a valid polygon before reviewing its zones");
        if(!inventory.revision().equals(request.datasetRevision()))throw new ConflictException("Spatial inventory changed; reload before reviewing");
        var previous=repository.review(placeId).orElse(null);
        long version=previous==null?0:previous.version();
        if(request.version()!=version)throw new ConflictException("Zone review changed; reload before reviewing");
        var selected=new HashSet<>(request.zoneIds());
        if(selected.size()!=request.zoneIds().size())throw new ValidationException("Duplicate associated zone");
        var known=new HashMap<Long,Zone>();inventory.zones().forEach(z->known.put(z.id(),z));
        var multipart=request.multipartAcknowledged()==null?Set.<Long>of():new HashSet<>(request.multipartAcknowledged());
        if(!selected.containsAll(multipart))throw new ValidationException("Multipart acknowledgment must refer to a selected zone");
        for(long id:selected) {
            var zone=known.get(id);
            if(zone==null || !zone.geometryValid() || zone.areaM2()==null || zone.areaM2().signum()<=0)
                throw new BusinessRuleException("Associated zone requires an active valid green-area polygon");
            if(zone.polygonCount()>1 && !multipart.contains(id))throw new BusinessRuleException("Review the complete multipart zone before associating it");
        }
        repository.replace(placeId,version+1,inventory.revision(),actorId,request.reason(),new TreeSet<>(selected),multipart);
        return options(inventory,placeId,true);
    }
    @Override @Transactional public Map<UUID,Resolved> resolve(List<Location> locations) {
        var mapped=locations.stream().filter(l->l.zoneSelectionRevision()!=null).toList();
        if(mapped.isEmpty())return Map.of();
        repository.lockInventory();
        var inventory=inventory(); var result=new HashMap<UUID,Resolved>();
        var options=new HashMap<Long,Options>(); var seen=new HashSet<Long>();
        Long unit=references.codeId("MEASUREMENT_UNIT","M2");
        if(unit==null)throw new BusinessRuleException("Square-meter measurement unit is unavailable");
        for(var location:mapped) {
            if(location.placeId()==null || location.zoneId()==null)throw new ValidationException("Zone selection requires a place and a zone");
            if(!seen.add(location.zoneId()) || locations.stream().filter(l->Objects.equals(l.zoneId(),location.zoneId())).count()>1)
                throw new ValidationException("A zone cannot be planned twice in the same activity");
            if(location.location()!=null || location.unitItemId()!=null || location.requestedQuantity()!=null
                || !location.elementIds().isEmpty() || (location.elementCodes()!=null&&!location.elementCodes().isEmpty()))
                throw new ValidationException("Zone selection derives geometry and square meters; manual values and specimen links are not accepted");
            var o=options.computeIfAbsent(location.placeId(),p->options(inventory,p,false));
            if(!o.current() || !Objects.equals(location.zoneSelectionRevision(),o.selectionRevision()))
                throw new ConflictException("Place-zone review is missing or changed; reload the available zones");
            var ids=new HashSet<Long>();o.zones().forEach(z->ids.add(z.id()));
            var graph=new ZoneNeighborhood(inventory.revision(),inventory.revision(),
                new HashSet<>(inventory.zones().stream().map(Zone::id).toList()),Map.of(location.placeId(),ids));
            try { graph.requireAllowed(location.placeId(),List.of(location.zoneId())); }
            catch(IllegalArgumentException ex) { throw new BusinessRuleException("Zone is not directly associated with this place"); }
            Zone zone=o.zones().stream().filter(z->z.id()==location.zoneId()).findFirst().orElseThrow();
            if(zone.areaM2().compareTo(new BigDecimal("999999999.999"))>0)throw new BusinessRuleException("Zone area exceeds the supported quantity");
            result.put(location.clientReference(),new Resolved(zone,unit));
        }
        return result;
    }
    @Override public BigDecimal plannedSurface(long interventionId) { return repository.plannedSurface(interventionId); }
    @Override @Transactional public PreviewResponse preview(Preview request) {
        var locations=request.selections().stream().map(s->new Location(null,UUID.randomUUID(),s.zoneId(),s.placeId(),
            null,List.of(),null,null,null,List.of(),s.zoneSelectionRevision())).toList();
        var resolved=resolve(locations);
        var zones=resolved.values().stream().map(Resolved::zone).sorted(Comparator.comparingLong(Zone::id)).toList();
        return new PreviewResponse(repository.currentSurface(zones.stream().map(Zone::id).toList()),zones);
    }
}
