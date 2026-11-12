"""Review readiness tests; all identifiers and geometries are synthetic."""
import copy
import unittest
from vecindad import prepare, validate


def row(identifier):
    return {"id": identifier, "code": str(identifier), "name": "Synthetic example", "geometryValid": True,
            "geometry": {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 0]]]}}


class ReviewTest(unittest.TestCase):
    def setUp(self):
        self.data = {"schemaVersion": 1, "places": [row(10)], "zones": [row(1), row(2)]}
        self.review = prepare(self.data)

    def ready(self):
        self.review.update(reviewedBy="Test reviewer", reviewedAt="2026-11-10T10:00:00-05:00")
        self.review["placeZones"]["10"] = [1]

    def test_draft_never_authorizes_a_place(self):
        result = validate(self.data, self.review)
        self.assertEqual(result["readyPlaces"], 0)
        self.assertEqual(result["pendingPlaces"], 1)

    def test_direct_associations_need_no_zone_neighbor_graph(self):
        self.ready()
        result = validate(self.data, self.review)["places"][0]
        self.assertTrue(result["ready"])
        self.assertEqual(result["eligibleZoneIds"], [1])
        self.assertNotIn("zoneNeighbors", self.review)

    def test_reviewed_associations_can_cover_one_place(self):
        self.ready()
        self.assertEqual(validate(self.data, self.review)["readyPlaces"], 1)

    def test_changed_place_outline_invalidates_review(self):
        self.ready()
        self.data["places"][0]["geometry"]["coordinates"][0][1] = [2, 0]
        with self.assertRaises(ValueError):
            validate(self.data, self.review)

    def test_ordering_does_not_invalidate_identical_dataset(self):
        self.ready()
        self.data["zones"].reverse()
        self.assertEqual(validate(self.data, self.review)["readyPlaces"], 1)

    def test_no_fabricated_place_from_a_building(self):
        self.ready()
        self.review["placeZones"]["99"] = [1]
        with self.assertRaises(ValueError):
            validate(self.data, self.review)

    def test_legacy_two_level_reviews_are_rejected(self):
        self.ready()
        self.review["schemaVersion"] = 1
        with self.assertRaises(ValueError):
            validate(self.data, self.review)
        self.review["schemaVersion"] = 2
        self.review["zoneNeighbors"] = {"1": [2]}
        with self.assertRaises(ValueError):
            validate(self.data, self.review)

    def test_duplicate_direct_associations_are_invalid(self):
        self.ready()
        self.review["placeZones"]["10"] = [1, 1]
        with self.assertRaises(ValueError):
            validate(self.data, self.review)

    def test_invalid_geometry_outside_the_association_does_not_expand_scope(self):
        self.data["zones"][1]["geometryValid"] = False
        self.review = prepare(self.data)
        self.ready()
        result = validate(self.data, self.review)["places"][0]
        self.assertTrue(result["ready"])
        self.assertEqual(result["eligibleZoneIds"], [1])

    def test_invalid_or_missing_geometry_blocks_readiness(self):
        self.data["zones"][0]["geometryValid"] = False
        self.review = prepare(self.data)
        self.ready()
        self.assertIn("zone_polygon_missing_or_invalid", validate(self.data, self.review)["places"][0]["reasons"])

    def test_multipart_zone_requires_explicit_review_as_a_whole(self):
        polygon = copy.deepcopy(self.data["zones"][0]["geometry"]["coordinates"])
        self.data["zones"][0]["geometry"] = {"type": "MultiPolygon", "coordinates": [polygon, polygon]}
        self.review = prepare(self.data)
        self.ready()
        self.assertIn("multipart_zone_meaning_pending", validate(self.data, self.review)["places"][0]["reasons"])
        self.review["multipartAcknowledged"] = [1]
        self.assertEqual(validate(self.data, self.review)["readyPlaces"], 1)

    def test_review_timestamp_needs_a_timezone(self):
        self.ready()
        self.review["reviewedAt"] = "2026-11-10T10:00:00"
        self.assertEqual(validate(self.data, self.review)["readyPlaces"], 0)


if __name__ == "__main__":
    unittest.main()
