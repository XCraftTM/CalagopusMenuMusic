#!/usr/bin/env python3
"""Builds dist/dev_xcrafttm_menumusic.c7s.zip in the layout `panel-rs extensions export` produces.

Archive layout:
  Metadata.toml
  backend/Cargo.toml, backend/src/...
  frontend/package.json, frontend/src/...
"""

import tomllib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKIP_DIRS = {"node_modules", "target", ".git"}


def entries_under(base: Path):
    for path in sorted(base.rglob("*")):
        if not SKIP_DIRS.intersection(path.relative_to(ROOT).parts):
            yield path


def add(zf: zipfile.ZipFile, path: Path, name: str) -> None:
    # the panel requires explicit directory entries (`backend/`, `frontend/src/`, ...)
    if path.is_dir():
        zf.writestr(zipfile.ZipInfo(name.rstrip("/") + "/"), b"")
    else:
        zf.write(path, name)


def main() -> None:
    metadata = tomllib.loads((ROOT / "Metadata.toml").read_text())
    identifier = metadata["package_name"].replace(".", "_")

    out = ROOT / "dist" / f"{identifier}.c7s.zip"
    out.parent.mkdir(exist_ok=True)

    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
        frontend = ROOT / "frontend"

        add(zf, ROOT / "Metadata.toml", "Metadata.toml")
        add(zf, ROOT, "backend/")
        add(zf, ROOT / "Cargo.toml", "backend/Cargo.toml")
        add(zf, ROOT / "src", "backend/src/")
        for path in entries_under(ROOT / "src"):
            add(zf, path, f"backend/{path.relative_to(ROOT).as_posix()}")

        add(zf, frontend, "frontend/")
        add(zf, frontend / "package.json", "frontend/package.json")
        for sub in ("src", "public"):
            if (frontend / sub).is_dir():
                add(zf, frontend / sub, f"frontend/{sub}/")
                for path in entries_under(frontend / sub):
                    add(zf, path, f"frontend/{path.relative_to(frontend).as_posix()}")

    print(f"wrote {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
