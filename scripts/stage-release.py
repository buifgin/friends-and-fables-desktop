#!/usr/bin/env python3
"""Stage verified CI binaries on an existing GitHub draft release."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


REPOSITORY = "buifgin/friends-and-fables-desktop"
WORKFLOW_PATH = ".github/workflows/build.yml"
ARTIFACTS = ("friends-and-fables-linux-x64", "friends-and-fables-windows-x64")
SEMVER = re.compile(
    r"^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)"
    r"(?:-(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)"
    r"(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)
SHA = re.compile(r"^[0-9a-fA-F]{40}$")


class StageError(Exception):
    pass


def expected_files(tag: str) -> dict[str, str]:
    match = SEMVER.fullmatch(tag)
    if not match:
        raise StageError("tag must be v-prefixed strict semantic version")
    package = json.loads((Path(__file__).resolve().parents[1] / "package.json").read_text(encoding="utf-8"))
    version = package.get("version")
    if not isinstance(version, str) or tag != f"v{version}":
        raise StageError("--tag must exactly match this checkout's package version")
    if version != ".".join(match.group(index) for index in (1, 2, 3)):
        raise StageError("package version must be a stable semantic version")
    return {
        "linux": f"friends-and-fables-desktop-{version}-linux-x86_64.AppImage",
        "windows": f"friends-and-fables-desktop-{version}-windows-x64.exe",
    }


def validate_run(run: dict[str, Any], run_id: str, source: str, repo: str) -> None:
    head_repository = run.get("head_repository")
    head_repo = head_repository.get("full_name") if isinstance(head_repository, dict) else None
    if str(run.get("id")) != run_id:
        raise StageError("CI API returned a different run ID")
    if run.get("path") != WORKFLOW_PATH:
        raise StageError(f"CI run is not from {WORKFLOW_PATH}")
    if run.get("status") != "completed" or run.get("conclusion") != "success":
        raise StageError("CI build run must be completed successfully")
    head_sha = run.get("head_sha")
    if not isinstance(head_sha, str) or head_sha.lower() != source.lower():
        raise StageError("CI build run source SHA does not match --source")
    if not isinstance(head_repo, str) or head_repo.casefold() != repo.casefold():
        raise StageError("CI build run must originate from the requested repository")


def validate_draft(release: dict[str, Any], tag: str, source: str) -> None:
    if release.get("draft") is not True:
        raise StageError("the existing release must still be a draft")
    if release.get("tag_name") != tag:
        raise StageError("draft release tag does not match --tag")
    target = release.get("target_commitish")
    if not isinstance(target, str) or target.lower() != source.lower():
        raise StageError("draft release target SHA does not match --source")
    assets = release.get("assets")
    if not isinstance(assets, list) or any(not isinstance(asset, dict) for asset in assets):
        raise StageError("draft release returned an invalid asset list")


def find_draft_release(repo: str, tag: str) -> dict[str, Any]:
    endpoint = f"repos/{repo}/releases?per_page=100"
    try:
        pages = json.loads(gh(["api", "--paginate", "--slurp", endpoint]))
    except json.JSONDecodeError as error:
        raise StageError("gh release listing returned invalid JSON") from error
    if not isinstance(pages, list):
        raise StageError("gh release listing returned an unexpected response")
    releases: list[dict[str, Any]] = []
    for page in pages:
        if isinstance(page, list):
            if any(not isinstance(release, dict) for release in page):
                raise StageError("gh release listing contained an invalid release entry")
            releases.extend(page)
        elif isinstance(page, dict):
            releases.append(page)
        else:
            raise StageError("gh release listing contained an invalid page")
    matches = [release for release in releases if release.get("tag_name") == tag]
    if len(matches) != 1:
        raise StageError(f"expected exactly one existing release for tag {tag}; found {len(matches)}")
    return matches[0]


def release_by_id(repo: str, release_id: Any) -> dict[str, Any]:
    if not isinstance(release_id, int) or release_id <= 0:
        raise StageError("draft release listing returned an invalid release ID")
    release = gh_json(["api", f"repos/{repo}/releases/{release_id}"])
    if release.get("id") != release_id:
        raise StageError("GitHub returned a different draft release ID")
    return release


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def find_file(directory: Path, name: str) -> Path:
    matches = [candidate for candidate in directory.rglob(name) if candidate.is_file() and not candidate.is_symlink()]
    if len(matches) != 1:
        raise StageError(f"expected exactly one {name} in {directory}; found {len(matches)}")
    return matches[0]


def validate_platform_sums(directory: Path, platform: str, name: str) -> tuple[Path, str]:
    sums = find_file(directory, f"SHA256SUMS-{platform}")
    binary = find_file(directory, name)
    try:
        lines = sums.read_text(encoding="ascii").splitlines()
    except (OSError, UnicodeError) as error:
        raise StageError(f"cannot read SHA256SUMS-{platform}: {error}") from error
    if len(lines) != 1:
        raise StageError(f"SHA256SUMS-{platform} must contain exactly one checksum entry")
    match = re.fullmatch(r"([0-9a-fA-F]{64})  (.+)", lines[0])
    if not match or match.group(2) != name:
        raise StageError(f"SHA256SUMS-{platform} must name exactly {name}")
    recorded = match.group(1).lower()
    actual = sha256(binary)
    if recorded != actual:
        raise StageError(f"checksum mismatch for {name}: CI sum does not match downloaded file")
    return binary, actual


def write_combined_sums(directory: Path, entries: list[tuple[str, str]]) -> Path:
    content = "".join(f"{digest}  {name}\n" for name, digest in sorted(entries))
    output = directory / "SHA256SUMS"
    output.write_text(content, encoding="ascii", newline="\n")
    return output


def matching_existing_assets(assets: list[dict[str, Any]], files: list[Path]) -> list[Path]:
    expected = {path.name: path for path in files}
    found: dict[str, dict[str, Any]] = {}
    for asset in assets:
        name = asset.get("name")
        if name not in expected:
            raise StageError(f"draft contains unexpected asset {name!r}")
        if name in found:
            raise StageError(f"draft contains duplicate asset {name}")
        found[name] = asset

    missing: list[Path] = []
    for name, path in expected.items():
        asset = found.get(name)
        if asset is None:
            missing.append(path)
            continue
        if asset.get("state") != "uploaded":
            raise StageError(f"existing draft asset {name} is not fully uploaded")
        digest = asset.get("digest")
        match = re.fullmatch(r"sha256:([0-9a-fA-F]{64})", digest or "")
        if not match:
            raise StageError(f"existing draft asset {name} has no verifiable SHA-256 digest")
        if asset.get("size") != path.stat().st_size or match.group(1).lower() != sha256(path):
            raise StageError(f"existing draft asset {name} has a size or digest mismatch")
    return missing


def gh(args: list[str]) -> str:
    result = subprocess.run(["gh", *args], text=True, capture_output=True, check=False)
    if result.returncode:
        detail = result.stderr.strip()
        for variable in ("GH_TOKEN", "GITHUB_TOKEN"):
            secret = os.environ.get(variable)
            if secret:
                detail = detail.replace(secret, "[redacted]")
        raise StageError(f"gh {' '.join(args[:2])} failed ({result.returncode}): {detail}")
    return result.stdout


def gh_json(args: list[str]) -> dict[str, Any]:
    try:
        value = json.loads(gh(args))
    except json.JSONDecodeError as error:
        raise StageError(f"gh {' '.join(args[:2])} returned invalid JSON") from error
    if not isinstance(value, dict):
        raise StageError(f"gh {' '.join(args[:2])} returned an unexpected response")
    return value


def repository() -> str:
    configured = os.environ.get("GH_REPO") or os.environ.get("GITHUB_REPOSITORY") or REPOSITORY
    if configured.casefold() != REPOSITORY.casefold():
        raise StageError(f"this release helper only accepts repository {REPOSITORY}")
    return REPOSITORY


def record(run_id: str, tag: str, source: str, repo: str, files: list[Path]) -> str:
    rows = [f"{sha256(path)}  {path.name} ({path.stat().st_size} bytes)" for path in files]
    return "\n".join([f"Repository: {repo}", f"CI run: {run_id}", f"Tag: {tag}", f"Source: {source}", *rows])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--tag", required=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--directory", required=True, type=Path)
    parser.add_argument("--verify-only", action="store_true")
    args = parser.parse_args()

    try:
        if not args.run_id.isdigit() or int(args.run_id) <= 0:
            raise StageError("--run-id must be a positive decimal integer")
        if not SHA.fullmatch(args.source):
            raise StageError("--source must be exactly 40 hexadecimal characters")
        names = expected_files(args.tag)
        repo = repository()

        run = gh_json(["api", f"repos/{repo}/actions/runs/{args.run_id}"])
        validate_run(run, args.run_id, args.source, repo)
        listed_release = find_draft_release(repo, args.tag)
        release_id = listed_release.get("id")
        release = release_by_id(repo, release_id)
        validate_draft(release, args.tag, args.source)

        directory = args.directory.expanduser()
        if args.verify_only:
            if not directory.is_dir():
                raise StageError("--verify-only requires an existing --directory")
        else:
            directory.mkdir(parents=True, exist_ok=True)
            for artifact in ARTIFACTS:
                gh(["run", "download", args.run_id, "--repo", repo, "--name", artifact, "--dir", str(directory)])

        binaries: list[Path] = []
        sums: list[tuple[str, str]] = []
        for platform, artifact_file in names.items():
            binary, digest = validate_platform_sums(directory, platform, artifact_file)
            binaries.append(binary)
            sums.append((artifact_file, digest))

        combined = write_combined_sums(directory, sums)
        desired = [*binaries, combined]
        missing = matching_existing_assets(release.get("assets", []), desired)
        if args.verify_only:
            if missing:
                raise StageError("verify-only found missing draft assets: " + ", ".join(path.name for path in missing))
        elif missing:
            gh(["release", "upload", args.tag, *(str(path) for path in missing), "--repo", repo])

        final_release = release_by_id(repo, release_id)
        validate_draft(final_release, args.tag, args.source)
        missing = matching_existing_assets(final_release.get("assets", []), desired)
        if missing:
            raise StageError("draft asset verification failed for: " + ", ".join(path.name for path in missing))

        summary = record(args.run_id, args.tag, args.source, repo, desired)
        print(summary)
        summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
        if summary_path:
            with open(summary_path, "a", encoding="utf-8") as stream:
                stream.write("## Verified release staging\n\n```text\n" + summary + "\n```\n")
        return 0
    except (StageError, OSError) as error:
        print(f"stage-release: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
