"""Focused tests for release identity and staging safety guards."""

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[2] / "scripts" / "stage-release.py"
spec = importlib.util.spec_from_file_location("stage_release", SCRIPT)
stage = importlib.util.module_from_spec(spec)
assert spec.loader is not None
spec.loader.exec_module(stage)


class ExpectedFilesTests(unittest.TestCase):
    def expected_files(self, tag, version, allow_prerelease=False):
        package_path = SCRIPT.parents[1] / "package.json"
        original_read_text = Path.read_text

        def read_text(path, *args, **kwargs):
            if path == package_path:
                return json.dumps({"version": version})
            return original_read_text(path, *args, **kwargs)

        with patch.object(Path, "read_text", read_text):
            return stage.expected_files(tag, allow_prerelease=allow_prerelease)

    def test_stable_version_remains_default(self):
        result = self.expected_files("v1.2.3", "1.2.3")
        self.assertEqual(result["linux"], "friends-and-fables-desktop-1.2.3-linux-x86_64.AppImage")
        self.assertEqual(result["windows"], "friends-and-fables-desktop-1.2.3-windows-x64.exe")

    def test_prerelease_is_rejected_by_default(self):
        with self.assertRaises(stage.StageError):
            self.expected_files("v0.7.2-7", "0.7.2-7")

    def test_prerelease_requires_explicit_opt_in(self):
        result = self.expected_files("v0.7.2-7", "0.7.2-7", allow_prerelease=True)
        self.assertIn("0.7.2-7", result["linux"])
        self.assertIn("0.7.2-7", result["windows"])

    def test_rejects_four_part_and_invalid_semver_tags(self):
        for tag, version in (("v0.7.2.7", "0.7.2.7"), ("v1.2.03", "1.2.03"), ("v1.2.3-01", "1.2.3-01")):
            with self.subTest(tag=tag), self.assertRaises(stage.StageError):
                self.expected_files(tag, version, allow_prerelease=True)

    def test_rejects_tag_package_mismatch_and_build_metadata(self):
        for tag, version in (("v0.7.2-7", "0.7.2-8"), ("v1.2.3+build.1", "1.2.3+build.1")):
            with self.subTest(tag=tag), self.assertRaises(stage.StageError):
                self.expected_files(tag, version, allow_prerelease=True)


class ExistingGuardsTests(unittest.TestCase):
    def test_run_identity_guards_remain(self):
        run = {"id": 12, "path": stage.WORKFLOW_PATH, "status": "completed", "conclusion": "success",
               "head_sha": "a" * 40, "head_repository": {"full_name": stage.REPOSITORY}}
        stage.validate_run(run, "12", "a" * 40, stage.REPOSITORY)
        run["head_sha"] = "b" * 40
        with self.assertRaises(stage.StageError):
            stage.validate_run(run, "12", "a" * 40, stage.REPOSITORY)

    def test_draft_identity_guard_remains(self):
        release = {"draft": True, "tag_name": "v1.2.3", "target_commitish": "a" * 40, "assets": []}
        stage.validate_draft(release, "v1.2.3", "a" * 40)
        release["draft"] = False
        with self.assertRaises(stage.StageError):
            stage.validate_draft(release, "v1.2.3", "a" * 40)

    def test_existing_asset_digest_guard_remains(self):
        with tempfile.TemporaryDirectory() as temp:
            binary = Path(temp) / "release.bin"
            binary.write_bytes(b"verified artifact")
            asset = {"name": binary.name, "state": "uploaded", "size": binary.stat().st_size,
                     "digest": "sha256:" + stage.sha256(binary)}
            self.assertEqual(stage.matching_existing_assets([asset], [binary]), [])
            asset["digest"] = "sha256:" + "0" * 64
            with self.assertRaises(stage.StageError):
                stage.matching_existing_assets([asset], [binary])


if __name__ == "__main__":
    unittest.main()
