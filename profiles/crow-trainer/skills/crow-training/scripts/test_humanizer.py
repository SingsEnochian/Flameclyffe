"""Regression checks for the observed quotation drift and fail-closed preservation."""
import unittest
import argparse
import contextlib
import hashlib
import io
import json
import os
import sys
import shutil
import subprocess
import tempfile
from pathlib import Path
from unittest.mock import patch
import humanizer
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
        original = 'Neri wrote, "Keep the blue\nseal intact."'
        changed = 'Neri wrote, "Keep the red\nseal intact."'
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

    def test_inch_mark_does_not_swallow_later_quotation(self):
        original = 'Use the 5" pipe.\nMara said "Keep the seal."'
        altered = 'Use the 5" pipe.\nMara said "Discard it."'
        self.assertIn('quotations-changed', check_preservation(original, altered, []))
        masked, spans = protect_quotes(original)
        self.assertNotIn('5"', masked)
        self.assertIn(' pipe.', masked)
        self.assertNotIn('Keep the seal.', masked)
        self.assertEqual(restore_quotes(masked, spans), (original, []))

    def test_spaced_inch_mark_does_not_swallow_dialogue(self):
        original = 'Use the 5 " pipe.\nMara said "Keep the seal."'
        changed = 'Use the 5 " pipe.\nMara said "Discard it."'
        self.assertIn('quotations-changed', check_preservation(original, changed, []))
        masked, tokens = protect_quotes(original)
        self.assertNotIn('5 "', masked)
        self.assertIn(' pipe.', masked)
        self.assertNotIn('Keep the seal.', masked)
        self.assertEqual(restore_quotes(masked, tokens), (original, []))

    def test_unbalanced_nonnumeric_marks_fail_closed(self):
        original = 'A stray " mark.\nMara said "Keep the seal."'
        self.assertIn('quotations-unbalanced', check_preservation(original, original, []))

    def test_quoted_numeric_text_remains_protected(self):
        original = 'Read "22" aloud, then say "Hold."'
        masked, tokens = protect_quotes(original)
        self.assertNotIn('"22"', masked)
        self.assertEqual(restore_quotes(masked, tokens), (original, []))

    def test_stray_marks_cannot_pair_across_real_dialogue(self):
        original = 'A stray " mark.\nMara said "...Keep the seal."\nAnother stray " mark.'
        altered = original.replace('Keep the seal.', 'Discard it.')
        self.assertIn('quotations-changed', check_preservation(original, altered, []))
        masked, tokens = protect_quotes(original)
        self.assertNotIn('Keep the seal.', masked)
        self.assertEqual(restore_quotes(masked, tokens), (original, []))

    def test_multiline_stray_marks_cannot_expose_dialogue(self):
        original = 'A stray " mark.\nMara said "...Keep the blue\nseal intact."\nAnother stray " mark.'
        altered = original.replace('Keep the blue', 'Discard the blue')
        self.assertIn('quotations-changed', check_preservation(original, altered, []))
        masked, tokens = protect_quotes(original)
        self.assertNotIn('Keep the blue', masked)
        self.assertEqual(restore_quotes(masked, tokens), (original, []))

    def test_multiple_quote_paragraphs_remain_safe(self):
        original = 'Mara said "First."\nA gap between scenes.\nNeri said "Second."'
        masked, protected = protect_quotes(original)
        self.assertNotIn('gap between scenes', masked)
        self.assertIn('quotations-changed', check_preservation(
            original, original.replace('gap between scenes', 'changed scene'), []))
        self.assertEqual(restore_quotes(masked, protected), (original, []))

    def test_numeric_inch_marks_cannot_disappear_while_numbers_remain(self):
        for original, changed in [
            ('Use the 5" pipe.\nMara said "Keep the seal."', 'Use the 5 pipe.\nMara said "Keep the seal."'),
            ('Use the 5 " pipe.\nMara said "Keep the seal."', 'Use the 5 pipe.\nMara said "Keep the seal."'),
            ('Use the 5" pipe.', 'Use the 5 pipe.'),
        ]:
            with self.subTest(original=original):
                self.assertIn('numeric-unit-quote-marks-changed',
                              check_preservation(original, changed, []))
                masked, spans = protect_quotes(original)
                self.assertNotIn('5"', masked) if '5"' in original else self.assertNotIn('5 "', masked)
                self.assertEqual(restore_quotes(masked, spans), (original, []))

    def test_typographic_apostrophes_are_not_unmatched_quotes(self):
        original = 'Mara’s note says “Keep the seal.” James’ report agrees.'
        self.assertEqual(check_preservation(original, original, []), [])
        masked, spans = protect_quotes(original)
        self.assertNotIn('Keep the seal.', masked)
        self.assertEqual(restore_quotes(masked, spans), (original, []))
        changed = original.replace('Keep the seal.', 'Discard the seal.')
        self.assertIn('quotations-changed', check_preservation(original, changed, []))

    @unittest.skipUnless(sys.platform.startswith('linux') and Path('/bin/true').is_file(),
                         'Linux ELF dependency probe requires Linux')
    def test_dynamic_elf_dependencies_are_rejected(self):
        with self.assertRaisesRegex(OSError, 'dynamic libraries'):
            humanizer.verify_runtime_dependency_mode(Path('/bin/true'))

    @unittest.skipUnless(sys.platform.startswith('linux') and shutil.which('cc'),
                         'Static ELF compilation needs Linux C toolchain')
    def test_static_elf_dependency_mode_is_verified(self):
        with tempfile.TemporaryDirectory() as temp:
            binary = Path(temp) / 'static-runner'
            result = subprocess.run(
                ['cc', '-static', '-o', str(binary), '-x', 'c', '-'],
                input=b'int main(void){return 0;}',
                capture_output=True, timeout=60)
            if result.returncode != 0:
                self.skipTest('Static C toolchain unavailable: ' + result.stderr.decode()[:120])
            self.assertEqual(humanizer.verify_runtime_dependency_mode(binary),
                             'linux-static-elf-no-pt-dynamic-or-interp')
            command, fd, options, mode, digest = humanizer.bind_runtime_artifact(binary)
            try:
                binary.write_bytes(b'replaced-path-after-attestation')
                self.assertEqual(subprocess.run([command], check=False, timeout=10, **options).returncode, 0)
                self.assertEqual(humanizer.sha256_fd(fd), digest)
                self.assertEqual(mode, 'linux-sealed-memfd')
            finally:
                os.close(fd)

    def test_missing_runtime_creates_failed_receipt(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            model = root / 'model.gguf'
            model.write_bytes(b'pinned-test-checkpoint')
            draft = root / 'draft.txt'
            draft.write_text('Keep 2kg intact.')
            spec = {'checkpoint_bytes': model.stat().st_size,
                    'checkpoint_sha256': hashlib.sha256(model.read_bytes()).hexdigest(),
                    'instr': 'Instruction', 'sep': '<end>',
                    'fingerprint': hashlib.sha256(b'Instruction\n\nX<end>').hexdigest()[:16],
                    'source': 'test', 'revision': 'test'}
            reference = root / 'spec.json'
            reference.write_text(json.dumps(spec))
            args = argparse.Namespace(model_file=str(model),
                runtime=str(root / 'missing-llama-completion'), input=str(draft),
                tokens=32, require_literal=[], protect_span=[],
                protect_literals=False, protect_quotes=True)
            with patch.object(humanizer, 'REFERENCE', reference), patch('os.getcwd', return_value=temp):
                with patch('pathlib.Path.cwd', return_value=root):
                    with contextlib.redirect_stdout(io.StringIO()):
                        with self.assertRaises(SystemExit) as exc:
                            humanizer.run(args)
            self.assertEqual(exc.exception.code, 1)
            receipts = list((root / '.crow-trainer' / 'humanizer').glob('*/receipt.json'))
            self.assertEqual(len(receipts), 1)
            result = json.loads(receipts[0].read_text())
            self.assertEqual(result['returncode'], 127)
            self.assertIsNone(result['runtime_sha256'])
            self.assertIn('FileNotFoundError', result['runtime_error'])
            self.assertEqual(result['verdict'], 'failed')

    def test_runtime_digest_failure_forces_failed_verdict(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            model = root / 'model.gguf'
            model.write_bytes(b'pinned-test-checkpoint')
            runtime = root / 'runtime'
            runtime.write_text('dummy')
            draft = root / 'draft.txt'
            draft.write_text('Keep the 2kg unit.')
            spec = {'checkpoint_bytes': model.stat().st_size,
                    'checkpoint_sha256': hashlib.sha256(model.read_bytes()).hexdigest(),
                    'instr': 'Instruction', 'sep': '<end>',
                    'fingerprint': hashlib.sha256(b'Instruction\n\nX<end>').hexdigest()[:16],
                    'source': 'test', 'revision': 'test'}
            reference = root / 'spec.json'
            reference.write_text(json.dumps(spec))
            args = argparse.Namespace(model_file=str(model),
                runtime=str(runtime), input=str(draft),
                tokens=32, require_literal=[], protect_span=[],
                protect_literals=False, protect_quotes=True)
            def completed_command(cmd, stdout, stderr, timeout, env, **kwargs):
                stdout.write('Keep the 2kg unit. [end of text]')
                # Simulate losing the opened artifact before the post-run digest.
                os.close(kwargs['pass_fds'][0])
                return argparse.Namespace(returncode=0)
            with patch.object(humanizer, 'REFERENCE', reference), patch('pathlib.Path.cwd', return_value=root):
                with patch.object(humanizer.subprocess, 'run', side_effect=completed_command), \
                     patch.object(humanizer, 'verify_runtime_dependency_mode', return_value='fixture-static'):
                    with contextlib.redirect_stdout(io.StringIO()):
                        with self.assertRaises(SystemExit) as exc:
                            humanizer.run(args)
            self.assertEqual(exc.exception.code, 1)
            receipts = list((root / '.crow-trainer' / 'humanizer').glob('*/receipt.json'))
            result = json.loads(receipts[0].read_text())
            self.assertEqual(result['runtime_sha256'],
                             hashlib.sha256(b'dummy').hexdigest())
            self.assertIsNone(result['runtime_sha256_after'])
            self.assertFalse(result['runtime_integrity_verified'])
            self.assertIsNotNone(result['runtime_error'])
            self.assertEqual(result['verdict'], 'failed')

    def test_runtime_replacement_during_execution_fails(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            model = root / 'model.gguf'
            model.write_bytes(b'pinned-test-checkpoint')
            runtime = root / 'runtime'
            runtime.write_bytes(b'original-runtime')
            draft = root / 'draft.txt'
            draft.write_text('Keep the 2kg unit.')
            spec = {'checkpoint_bytes': model.stat().st_size,
                    'checkpoint_sha256': hashlib.sha256(model.read_bytes()).hexdigest(),
                    'instr': 'Instruction', 'sep': '<end>',
                    'fingerprint': hashlib.sha256(b'Instruction\n\nX<end>').hexdigest()[:16],
                    'source': 'test', 'revision': 'test'}
            reference = root / 'spec.json'
            reference.write_text(json.dumps(spec))
            args = argparse.Namespace(model_file=str(model),
                runtime=str(runtime), input=str(draft),
                tokens=32, require_literal=[], protect_span=[],
                protect_literals=False, protect_quotes=True)
            def replace_while_running(cmd, stdout, stderr, timeout, env, **kwargs):
                self.assertTrue(cmd[0].startswith('/proc/self/fd/'))
                with self.assertRaises(PermissionError):
                    Path(cmd[0]).write_bytes(b'replacement-runtime')
                stdout.write('Keep the 2kg unit. [end of text]')
                return argparse.Namespace(returncode=0)
            with patch.object(humanizer, 'REFERENCE', reference), patch('pathlib.Path.cwd', return_value=root):
                with patch.object(humanizer.subprocess, 'run', side_effect=replace_while_running), \
                     patch.object(humanizer, 'verify_runtime_dependency_mode', return_value='fixture-static'):
                    with contextlib.redirect_stdout(io.StringIO()):
                        humanizer.run(args)
            receipts = list((root / '.crow-trainer' / 'humanizer').glob('*/receipt.json'))
            result = json.loads(receipts[0].read_text())
            self.assertEqual(result['returncode'], 0)
            self.assertEqual(result['runtime_sha256'], result['runtime_sha256_after'])
            self.assertTrue(result['runtime_integrity_verified'])
            self.assertEqual(result['runtime_execution_binding'], 'linux-sealed-memfd')
            self.assertEqual(result['verdict'], 'held-for-review')

    def test_original_path_swap_cannot_change_executed_snapshot(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            model = root / 'model.gguf'
            model.write_bytes(b'pinned-test-checkpoint')
            runtime = root / 'runtime'
            runtime.write_bytes(b'original-runtime')
            draft = root / 'draft.txt'
            draft.write_text('Keep the 2kg unit.')
            spec = {'checkpoint_bytes': model.stat().st_size,
                    'checkpoint_sha256': hashlib.sha256(model.read_bytes()).hexdigest(),
                    'instr': 'Instruction', 'sep': '<end>',
                    'fingerprint': hashlib.sha256(b'Instruction\n\nX<end>').hexdigest()[:16],
                    'source': 'test', 'revision': 'test'}
            reference = root / 'spec.json'
            reference.write_text(json.dumps(spec))
            args = argparse.Namespace(model_file=str(model),
                runtime=str(runtime), input=str(draft),
                tokens=32, require_literal=[], protect_span=[],
                protect_literals=False, protect_quotes=True)
            def attempted_swap(cmd, stdout, stderr, timeout, env, **kwargs):
                self.assertNotEqual(Path(cmd[0]), runtime)
                self.assertEqual(Path(cmd[0]).read_bytes(), b'original-runtime')
                runtime.write_bytes(b'evil-runtime')
                runtime.write_bytes(b'original-runtime')
                # Also replace the mutable retained snapshot pathname.
                snapshot = next((root / '.crow-trainer' / 'humanizer').glob('*/runtime-snapshot'))
                snapshot.write_bytes(b'evil-snapshot')
                self.assertEqual(Path(cmd[0]).read_bytes(), b'original-runtime')
                stdout.write('Keep the 2kg unit. [end of text]')
                return argparse.Namespace(returncode=0)
            with patch.object(humanizer, 'REFERENCE', reference), patch('pathlib.Path.cwd', return_value=root):
                with patch.object(humanizer.subprocess, 'run', side_effect=attempted_swap), \
                     patch.object(humanizer, 'verify_runtime_dependency_mode', return_value='fixture-static'):
                    with contextlib.redirect_stdout(io.StringIO()):
                        humanizer.run(args)
            receipts = list((root / '.crow-trainer' / 'humanizer').glob('*/receipt.json'))
            result = json.loads(receipts[0].read_text())
            self.assertEqual(result['runtime_sha256'], result['runtime_sha256_after'])
            self.assertTrue(result['runtime_integrity_verified'])
            self.assertEqual(result['verdict'], 'held-for-review')
            self.assertNotEqual(result['runtime_snapshot'], str(runtime))
            self.assertEqual(result['runtime_execution_binding'], 'linux-sealed-memfd')

    @unittest.skipUnless(sys.platform.startswith('linux') and Path('/bin/true').is_file(),
                         'Kernel-sealed executable integration proof requires Linux')
    def test_kernel_sealed_artifact_executes_the_original_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            runtime = Path(temp) / 'runner'
            shutil.copy2('/bin/true', runtime)
            original_digest = hashlib.sha256(runtime.read_bytes()).hexdigest()
            executable, fd, options, binding, captured_hash = humanizer.bind_runtime_artifact(runtime)
            try:
                self.assertEqual(binding, 'linux-sealed-memfd')
                self.assertEqual(captured_hash, original_digest)
                runtime.write_bytes(b'hostile pathname replacement')
                self.assertEqual(subprocess.run([executable], check=False, timeout=10, **options).returncode, 0)
                self.assertEqual(humanizer.sha256_fd(fd), original_digest)
            finally:
                os.close(fd)

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
