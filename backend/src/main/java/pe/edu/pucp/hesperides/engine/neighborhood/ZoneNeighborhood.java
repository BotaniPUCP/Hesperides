package pe.edu.pucp.hesperides.engine.neighborhood;

import java.util.*;

/**
 * SPEC-200 R2: only reviewed direct place-zone associations, never transitive expansion.
 * Missing map entries mean unreviewed, whereas an empty set means reviewed with no neighbors.
 * This engine does not discover adjacency, access a database or grant resource permissions.
 */
public final class ZoneNeighborhood {
    private final Map<Long, Set<Long>> starts;

    public ZoneNeighborhood(String currentRevision, String reviewedRevision, Set<Long> availableZones,
                            Map<Long, Set<Long>> reviewedPlaceZones) {
        if (currentRevision == null || currentRevision.isBlank() || !currentRevision.equals(reviewedRevision)) {
            throw new IllegalArgumentException("Neighborhood review does not match the current dataset");
        }
        var zones = Set.copyOf(availableZones);
        zones.forEach(ZoneNeighborhood::positiveId);
        starts = copy(reviewedPlaceZones);
        starts.values().forEach(values -> requireKnown(values, zones));
    }

    public List<Long> eligible(long placeId) {
        positiveId(placeId);
        Set<Long> first = starts.get(placeId);
        if (first == null) throw new IllegalStateException("Place neighborhood has not been reviewed");
        return List.copyOf(first);
    }

    public void requireAllowed(long placeId, Collection<Long> selectedZones) {
        if (selectedZones == null || selectedZones.isEmpty()) {
            throw new IllegalArgumentException("Select at least one whole zone");
        }
        var eligible = new HashSet<>(eligible(placeId));
        var seen = new HashSet<Long>();
        for (Long zone : selectedZones) {
            positiveId(zone);
            if (!seen.add(zone)) throw new IllegalArgumentException("Duplicate selected zone");
            if (!eligible.contains(zone)) throw new IllegalArgumentException("Zone is outside the reviewed neighborhood");
        }
    }

    private static Map<Long, Set<Long>> copy(Map<Long, Set<Long>> input) {
        var result = new TreeMap<Long, Set<Long>>();
        input.forEach((id, values) -> {
            positiveId(id);
            var sorted = new TreeSet<Long>(values);
            sorted.forEach(ZoneNeighborhood::positiveId);
            result.put(id, Collections.unmodifiableSet(sorted));
        });
        return Collections.unmodifiableMap(result);
    }

    private static void positiveId(Long id) {
        if (id == null || id <= 0) throw new IllegalArgumentException("A positive identifier is required");
    }

    private static void requireKnown(Set<Long> ids, Set<Long> zones) {
        if (!zones.containsAll(ids)) throw new IllegalArgumentException("Review references an unavailable zone");
    }
}
