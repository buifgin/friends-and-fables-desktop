"""Build-time only: assemble a pinned, self-contained Windows translation runtime."""
import hashlib
import json
from pathlib import Path, PurePosixPath
import shutil
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent.parent
LOCK = ROOT / "scripts/windows-translator-lock.json"
CACHE = ROOT / ".cache/windows-translator"
OUTPUT = ROOT / "build/translator"


def digest(file):
    with file.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def download(package):
    file = CACHE / (package["sha256"] + "-" + package["name"])
    if not file.exists() or digest(file) != package["sha256"]:
        print("Downloading", package["name"], package["version"], flush=True)
        temp = file.with_suffix(".tmp")
        try:
            with urllib.request.urlopen(package["url"], timeout=120) as source, temp.open("wb") as dest:
                shutil.copyfileobj(source, dest)
            if digest(temp) != package["sha256"]:
                raise ValueError("Checksum mismatch: " + package["name"])
            temp.replace(file)
        finally:
            temp.unlink(missing_ok=True)
    return file


def extract(file, target, kind):
    with zipfile.ZipFile(file) as archive:
        for entry in archive.infolist():
            parts = PurePosixPath(entry.filename).parts
            if entry.is_dir():
                continue
            if not parts or entry.filename.startswith("/") or ".." in parts or any(":" in part or "\\" in part for part in parts):
                raise ValueError("Unsafe archive path")
            if kind == "model":
                parts = parts[1:]
                # SentencePiece handles our already segmented text; Stanza is unused.
                if not parts or parts[0] not in ("model", "sentencepiece.model", "metadata.json", "README.md"):
                    continue
            dest = target.joinpath(*parts)
            dest.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(entry) as source, dest.open("wb") as stream:
                shutil.copyfileobj(source, stream)


def main():
    lock = json.loads(LOCK.read_text())
    service = ROOT / "translator/service.py"
    notice = ROOT / "translator/THIRD-PARTY-NOTICES.md"
    fingerprint = hashlib.sha256(LOCK.read_bytes() + service.read_bytes() + notice.read_bytes() + Path(__file__).read_bytes()).hexdigest()
    manifest = OUTPUT / "manifest.json"
    if manifest.exists():
        saved = json.loads(manifest.read_text())
        if saved.get("fingerprint") == fingerprint and all((OUTPUT / name).is_file() and digest(OUTPUT / name) == sha for name, sha in saved["files"].items()):
            print("Windows translator verified; using prepared runtime.")
            return
    CACHE.mkdir(parents=True, exist_ok=True)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="prepare-", dir=OUTPUT.parent) as temp:
        runtime = Path(temp)
        for package in lock["packages"]:
            file = download(package)
            kind = package["kind"]
            target = runtime / ("Lib/site-packages" if kind == "wheel" else "model" if kind == "model" else ".")
            if kind == "notice":
                shutil.copyfile(file, runtime / (package["name"].upper() + ".txt"))
            else:
                extract(file, target, kind)
        # NumPy ships the redistributable MSVC C++ library; CTranslate2 needs its standard name.
        msvcp = list((runtime / "Lib/site-packages/numpy.libs").glob("msvcp140-*.dll"))
        if len(msvcp) != 1:
            raise ValueError("Missing bundled MSVC runtime")
        shutil.copyfile(msvcp[0], runtime / "msvcp140.dll")
        (runtime / ("python" + lock["pythonAbi"] + "._pth")).write_text("python" + lock["pythonAbi"] + ".zip\n.\nLib/site-packages\nimport site\n", encoding="utf-8")
        shutil.copyfile(service, runtime / "service.py")
        shutil.copyfile(notice, runtime / "THIRD-PARTY-NOTICES.md")
        files = {file.relative_to(runtime).as_posix(): digest(file) for file in sorted(runtime.rglob("*")) if file.is_file()}
        (runtime / "manifest.json").write_text(json.dumps({"fingerprint": fingerprint, "packages": lock["packages"], "files": files}, indent=2), encoding="utf-8")
        shutil.rmtree(OUTPUT, ignore_errors=True)
        shutil.copytree(runtime, OUTPUT)
    print("Prepared Windows translator:", len(files), "files; no runtime downloads.")


if __name__ == "__main__":
    main()
