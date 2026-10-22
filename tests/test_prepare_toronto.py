"""Offline tests for the development-time City data normalizer."""
import sys
from pathlib import Path
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
from prepare_toronto_pipeline import classify_type, geometry_point, normalize_address, number, prepare, stage  # noqa: E402


class PreparationTests(unittest.TestCase):
    def row(self, **values):
        return {
            "Application Number": "26 100001 STE 01 OZ", "Pipeline Status": "Active",
            "Address": "10 TEST ST   ", "Proposed Residential Units": "0",
            "Proposed Residential Gross Floor Area": "0",
            "Proposed Non-Residential Gross Floor Area": "1,200",
            "Application Information Centre Link": None, **values,
        }

    def test_numbers_preserve_missing_and_zero(self):
        self.assertIsNone(number(None))
        self.assertIsNone(number(""))
        self.assertIsNone(number("bad"))
        self.assertEqual(number("0"), 0)
        self.assertEqual(number("1,200"), 1200)

    def test_unknowns_are_not_guessed(self):
        self.assertEqual(stage("Active"), "unknown")
        self.assertEqual(stage("Under Review"), "proposed")
        self.assertEqual(classify_type(self.row()), "unknown")
        self.assertEqual(classify_type(self.row(**{"Proposed Residential Units": "10"})), "mixed_use")

    def test_address_join_and_duplicate_handling(self):
        row = self.row()
        key = normalize_address(row["Address"])
        records, duplicates = prepare([row, row.copy()], {key: {(43.64, -79.38)}})
        self.assertEqual((len(records), duplicates), (1, 1))
        self.assertEqual(records[0]["latitude"], 43.64)
        self.assertEqual(records[0]["residentialUnits"], 0)
        records, _ = prepare([row], {key: {(43.64, -79.38), (43.65, -79.38)}})
        self.assertIsNone(records[0]["latitude"])
        with self.assertRaises(ValueError):
            prepare([row, {**row, "Pipeline Status": "Built"}], {})

    def test_geometry_must_be_one_valid_point(self):
        self.assertEqual(geometry_point('{"type":"MultiPoint","coordinates":[[-79.38,43.64]]}'), (43.64, -79.38))
        self.assertIsNone(geometry_point('{"type":"MultiPoint","coordinates":[[-79.38,43.64],[-79.39,43.65]]}'))
        self.assertIsNone(geometry_point('{"type":"Point","coordinates":[0,0]}'))


if __name__ == "__main__":
    unittest.main()
