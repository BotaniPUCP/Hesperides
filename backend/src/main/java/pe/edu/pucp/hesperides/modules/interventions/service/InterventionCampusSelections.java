package pe.edu.pucp.hesperides.modules.interventions.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.JdbcTemplate;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionRequests.*;
import pe.edu.pucp.hesperides.modules.interventions.dto.InterventionZoneSelections.Zone;
import pe.edu.pucp.hesperides.modules.interventions.repository.*;
import pe.edu.pucp.hesperides.shared.exception.*;
import tools.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.*;
import java.util.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/** Live, independent targets. Areas never implicitly add their specimens. */
@Service @RequiredArgsConstructor @Transactional(readOnly=true)
public class InterventionCampusSelections {
    private final InterventionZoneSelectionsRepository spatial;
    private final InterventionReferencesRepository references;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    public record Specimen(long id,String code,String name,Point point,String typeCode,
            String scientificName,BigDecimal heightM,BigDecimal crownRadiusM,int quantity) { }
    public record Options(String selectionRevision,List<Zone> zones,List<Specimen> specimens) { }
    public record Preview(@NotBlank @Pattern(regexp="[0-9a-f]{64}") String selectionRevision,
            @NotNull @Size(max=1000) List<@NotNull @Positive Long> zoneIds,
            @NotNull @Size(max=5000) List<@NotNull @Positive Long> specimenIds) { }
    public record Surface(BigDecimal surfaceM2,int areaCount,int specimenCount) { }
    public record Resolved(List<Location> locations,Map<UUID,InterventionZoneSelectionsService.Resolved> zones) { }
    public Options options() {
        var zones=spatial.zones().stream().filter(z->z.geometryValid()&&z.areaM2()!=null&&z.areaM2().signum()>0).toList();
        var specimens=jdbc.query("""
            SELECT g.id,g.code,COALESCE(NULLIF(g.name,g.code),s.common_name,s.scientific_name,'Ejemplar') name,
              ST_Y(COALESCE(g.location,ST_PointOnSurface(g.area))) lat,
              ST_X(COALESCE(g.location,ST_PointOnSurface(g.area))) lon,
              COALESCE(t.code,'HERB') type,COALESCE(s.scientific_name,'') scientific,
              CASE WHEN g.data_source='MEASURED' THEN g.height_m END height_m,
              CASE WHEN g.data_source='MEASURED' THEN g.crown_radius_m END crown_radius_m,g.quantity
            FROM green_elements g LEFT JOIN species s ON s.id=g.species_id
            LEFT JOIN catalog_items t ON t.id=s.species_type_item_id
            WHERE g.is_active AND g.deleted_at IS NULL
              AND ST_IsValid(COALESCE(g.location,ST_PointOnSurface(g.area)))
              AND NOT ST_IsEmpty(COALESCE(g.location,ST_PointOnSurface(g.area))) ORDER BY g.id
            """,(r,n)->new Specimen(r.getLong("id"),r.getString("code"),r.getString("name"),
                new Point(r.getDouble("lat"),r.getDouble("lon")),r.getString("type"),r.getString("scientific"),
                r.getBigDecimal("height_m"),r.getBigDecimal("crown_radius_m"),r.getInt("quantity")));
        try {
            var token=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(
                json.writeValueAsString(List.of(zones,specimens)).getBytes(StandardCharsets.UTF_8)));
            return new Options(token,zones,specimens);
        } catch(java.security.NoSuchAlgorithmException e) {throw new IllegalStateException(e);}
    }
    private Options locked(String token) {
        spatial.lockInventory();jdbc.execute("LOCK TABLE green_elements, species IN SHARE MODE");
        var o=options();
        if(!Objects.equals(token,o.selectionRevision()))throw new ConflictException("Campus inventory changed; reload the selection");
        return o;
    }
    private void unique(List<Long> ids) {
        if(ids==null||ids.stream().anyMatch(Objects::isNull)||new HashSet<>(ids).size()!=ids.size())throw new ValidationException("Duplicate or invalid campus target");
    }
    private void validateTargets(Options o,List<Long> zones,List<Long> specimens) {
        unique(zones);unique(specimens);
        if(zones.isEmpty()&&specimens.isEmpty())throw new ValidationException("Select at least one campus target");
        if(!o.zones().stream().map(Zone::id).toList().containsAll(zones)
            ||!o.specimens().stream().map(Specimen::id).toList().containsAll(specimens))
            throw new BusinessRuleException("Selected campus target is no longer available");
    }
    @Transactional public Surface preview(Preview request) {
        var o=locked(request.selectionRevision());validateTargets(o,request.zoneIds(),request.specimenIds());
        return new Surface(request.zoneIds().isEmpty()?BigDecimal.ZERO:spatial.currentSurface(request.zoneIds()),
            request.zoneIds().size(),request.specimenIds().size());
    }
    @Transactional public Resolved resolve(List<Location> requests,String token) {
        var o=locked(token);var zoneIds=new ArrayList<Long>();var specimenIds=new ArrayList<Long>();
        var rows=new ArrayList<Location>();var mapped=new HashMap<UUID,InterventionZoneSelectionsService.Resolved>();
        Long unit=references.codeId("MEASUREMENT_UNIT","M2");
        for(var r:requests) {
            if(r.placeId()!=null||r.location()!=null||r.unitItemId()!=null||r.requestedQuantity()!=null
                ||(r.elementCodes()!=null&&!r.elementCodes().isEmpty()))throw new ValidationException("Campus selection derives its location and quantities");
            if(r.zoneId()!=null) {
                if(!r.elementIds().isEmpty()||!Objects.equals(token,r.zoneSelectionRevision()))throw new ValidationException("Invalid campus area selection");
                var z=o.zones().stream().filter(v->v.id()==r.zoneId()).findFirst().orElseThrow(()->new BusinessRuleException("Selected campus target is no longer available"));
                if(unit==null)throw new BusinessRuleException("Square-meter measurement unit is unavailable");
                if(z.areaM2().compareTo(new BigDecimal("999999999.999"))>0)throw new BusinessRuleException("Zone area exceeds the supported quantity");
                zoneIds.add(z.id());rows.add(r);mapped.put(r.clientReference(),new InterventionZoneSelectionsService.Resolved(z,unit));
            } else {
                if(r.elementIds().size()!=1||r.zoneSelectionRevision()!=null)throw new ValidationException("Select one specimen per execution target");
                long id=r.elementIds().get(0);var s=o.specimens().stream().filter(v->v.id()==id).findFirst().orElseThrow(()->new BusinessRuleException("Selected campus target is no longer available"));
                specimenIds.add(id);rows.add(new Location(r.id(),r.clientReference(),null,null,s.point(),List.of(id),r.description(),null,null,List.of(),null));
            }
        }
        validateTargets(o,zoneIds,specimenIds);return new Resolved(rows,mapped);
    }
}
