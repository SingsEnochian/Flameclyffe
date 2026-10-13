"""Regression checks for the observed quotation drift and fail-closed preservation."""
import unittest
import argparse
from humanizer import add_command, canonicalize_literals, check_preservation, protect_quotes, restore_quotes


class PreservationTests(unittest.TestCase):
    def test_observed_quotation_drift(self):
        self.assertIn('quotations-changed', check_preservation(
            'Mara said, "Keep the blue seal intact."', 'Mara said, "Blue seal intact!"', ['Mara']))

    def test_numbers_cannot_hide_inside_larger_numbers(self):
        self.assertIn('numbers-changed', check_preservation('8 crates', '18 crates', []))
        self.assertIn('numbers-changed', check_preservation('Count: 8.', 'Count: 18.', []))

    def test_embedded_numeric_identifiers_and_units(self):
        for before, after in [('2kg', '3kg'), ('Model X1', 'Model X2'),
                              ('rack9', 'rack8'), ('lot12B', 'lot13B')]:
            with self.subTest(before=before):
                self.assertIn('numbers-changed', check_preservation(before, after, []))

    def test_multiline_quotation_preservation(self):
        original = 'Neri wrote, "Keep the blue\\nseal intact."'
        changed = 'Neri wrote, "Keep the red\\nseal intact."'
        self.assertIn('quotations-changed', check_preservation(original, changed, []))
        masked, tokens = protect_quotes(original)
        self.assertNotIn('blue', masked)
        self.assertEqual(restore_quotes(masked, tokens), (original, []))

    def test_duplicate_numbers_and_new_numbers_fail(self):
        self.assertTrue(check_preservation('8 crates', '8 crates and 8 boxes', []))
        self.assertTrue(check_preservation('8 crates', '8 crates and 3 boxes', []))

    def test_quotation_round_trip(self):
        original = 'Mara said, “Keep the blue seal intact.” Then "Wait."'
        masked, protected = protect_quotes(original)
        self.assertNotIn('Keep the blue seal intact.', masked)
        restored, errors = restore_quotes(masked, protected)
        self.assertEqual((restored, errors), (original, []))

    def test_missing_duplicate_or_changed_markers_fail(self):
        masked, protected = protect_quotes('Mara said, "Wait."')
        marker = next(iter(protected))
        for output in [masked.replace(marker, ''), masked + marker, masked.lower()]:
            self.assertTrue(restore_quotes(output, protected)[1])

    def test_literals_preserve_multiplicity(self):
        self.assertTrue(check_preservation('Mara and Mara', 'Mara', ['Mara']))
        with self.assertRaises(ValueError):
            check_preservation('Mara', 'Mara', ['Unknown'])

    def test_preserved_candidate_is_clean(self):
        self.assertEqual(check_preservation('Mara carried 8 crates, each 3 kg.',
                                            'Each 3 kg crate was carried by Mara: 8 crates.', ['Mara', '3 kg']), [])

    def test_trainer_protects_quotations_by_default(self):
        parser = argparse.ArgumentParser()
        add_command(parser.add_subparsers(dest='command'))
        command = ['humanize', '--model-file', 'model', '--runtime', 'runtime', '--input', 'draft']
        self.assertTrue(parser.parse_args(command).protect_quotes)
        self.assertFalse(parser.parse_args(command).protect_literals)
        self.assertFalse(parser.parse_args(command + ['--no-protect-quotes']).protect_quotes)

    def test_overlapping_dates_names_and_quote_literals_restore_once(self):
        draft = '14 October 2026: Ilya said, “Ilya carried 6 lanterns.”'
        masked, protected = protect_quotes(draft, ['14 October 2026', 'Ilya', '6 lanterns'])
        self.assertNotIn('14 October 2026', masked)
        self.assertNotIn('6 lanterns', masked)
        self.assertEqual(restore_quotes(masked, protected), (draft, []))

    def test_required_literal_protection_without_quotes(self):
        draft = 'Ilya moved 6 lanterns to West Hall.'
        masked, protected = protect_quotes(draft, ['Ilya', '6 lanterns', 'West Hall'])
        self.assertEqual(len(protected), 3)
        self.assertEqual(restore_quotes(masked, protected), (draft, []))

    def test_exact_formatting_repair_keeps_entities_visible(self):
        result, changes = canonicalize_literals('14.10.2026: Ilya moved lanterns from east hall to west hall. 2kg each.',
            ['14 October 2026', 'Ilya', 'East Hall', 'West Hall', '2 kg'])
        self.assertEqual(result, '14 October 2026: Ilya moved lanterns from East Hall to West Hall. 2 kg each.')
        self.assertEqual(len(changes), 4)

    def test_formatting_does_not_repair_different_facts_or_touch_quotes(self):
        result, changes = canonicalize_literals('15.10.2026: Ilya moved 3kg. "east hall"',
            ['14 October 2026', '2 kg', 'East Hall'])
        self.assertEqual(result, '15.10.2026: Ilya moved 3kg. "east hall"')
        self.assertEqual(changes, [])

    def test_case_ambiguous_identities_fail_without_guessing(self):
        with self.assertRaises(ValueError):
            canonicalize_literals('ANN spoke to Ann.', ['ANN', 'Ann'])

    def test_same_date_ordinal_and_abbreviation_can_be_restored(self):
        result, changes = canonicalize_literals('Neri signed on 15th Oct 2026.', ['15 October 2026'])
        self.assertEqual(result, 'Neri signed on 15 October 2026.')
        self.assertEqual(len(changes), 1)


if __name__ == '__main__':
    unittest.main()
