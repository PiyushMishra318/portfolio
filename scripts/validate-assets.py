#!/usr/bin/env python3
"""Validate local and optional remote portfolio asset paths."""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
D_PATH = ROOT / "d"
LOCAL_DOT = re.compile(r"\./([a-zA-Z0-9_.-]+\.(?:png|jpe?g|gif|svg|webp|woff2?|ico|pdf))")
LOCAL_ROOT = re.compile(r"/([a-zA-Z0-9_.-]+\.(?:png|jpe?g|gif|svg|webp|woff2?|ico|pdf))")
HTTP_EXT = re.compile(r"https://[^\s\"'<>\\]+")


def collect_refs(data: dict) -> tuple[set[str], set[str]]:
    local: set[str] = set()
    remote: set[str] = set()

    for entry in data.get("medias", []):
        if isinstance(entry, str):
            if entry.startswith("http"):
                remote.add(entry)
            elif entry.startswith("./"):
                local.add(entry[2:].split()[0])

    blob = json.dumps(data.get("pages", {}))

    for m in LOCAL_DOT.finditer(blob):
        local.add(m.group(1))
    for m in HTTP_EXT.finditer(blob):
        remote.add(m.group(0).rstrip("\\"))
    for m in LOCAL_ROOT.finditer(blob):
        local.add(m.group(1))

    for hf in ROOT.glob("*.html"):
        text = hf.read_text(encoding="utf-8", errors="replace")
        for m in LOCAL_DOT.finditer(text):
            local.add(m.group(1))
        for m in LOCAL_ROOT.finditer(text):
            local.add(m.group(1))

    manifest = ROOT / "site.webmanifest"
    if manifest.exists():
        man = json.loads(manifest.read_text(encoding="utf-8"))
        for icon in man.get("icons", []):
            src = (icon.get("src") or "").lstrip("/")
            if src:
                local.add(src)

    sw = ROOT / "service-worker.js"
    if sw.exists():
        for m in re.finditer(r'["\']([^"\']+\.(?:html|png|js|css))["\']', sw.read_text()):
            local.add(m.group(1).lstrip("/"))

    for m in (ROOT / "main.css").read_text(encoding="utf-8", errors="replace"):
        pass
    css = (ROOT / "main.css").read_text(encoding="utf-8", errors="replace")
    for m in re.finditer(r"url\(([^)]+)\)", css):
        u = m.group(1).strip("\"'")
        if u.endswith(".woff2"):
            local.add(u)

    return local, remote


def check_local(paths: set[str]) -> list[str]:
    missing = []
    for p in sorted(paths):
        if not (ROOT / p).is_file():
            missing.append(p)
    return missing


def check_remote(urls: set[str], limit: int = 20) -> list[tuple[str, int]]:
    bad: list[tuple[str, int]] = []
    for i, url in enumerate(sorted(urls)):
        if i >= limit:
            break
        try:
            req = urllib.request.Request(url, method="HEAD")
            urllib.request.urlopen(req, timeout=12)
        except urllib.error.HTTPError as e:
            bad.append((url, e.code))
    return bad


def check_remote_site(base: str, local_paths: set[str]) -> list[tuple[str, int]]:
    bad: list[tuple[str, int]] = []
    base = base if base.endswith("/") else base + "/"
    for p in sorted(local_paths):
        url = base + p
        try:
            req = urllib.request.Request(url, method="HEAD")
            urllib.request.urlopen(req, timeout=12)
        except urllib.error.HTTPError as e:
            bad.append((p, e.code))
    return bad


def main() -> int:
    data = json.loads(D_PATH.read_text(encoding="utf-8"))
    local, remote = collect_refs(data)

    print(f"Local refs: {len(local)}")
    missing = check_local(local)
    if missing:
        print(f"MISSING ON DISK ({len(missing)}):")
        for p in missing:
            print(f"  {p}")
    else:
        print("All local refs exist on disk.")

    corrupt = [m for m in data.get("medias", []) if isinstance(m, str) and (" alt=" in m or not m.startswith(("http", "./")))]
    if corrupt:
        print(f"Corrupt medias entries ({len(corrupt)}):")
        for m in corrupt:
            print(f"  {m!r}")

    dm = data.get("data", {}).get("media")
    medias = data.get("medias", [])
    print(f"medias: {len(medias)} | data.media in medias: {dm in medias}")
    print(f"data.media: {dm}")

    if len(sys.argv) > 1:
        base = sys.argv[1]
        print(f"\nRemote check {base}")
        bad = check_remote_site(base, local)
        if bad:
            for p, code in bad:
                print(f"  {code} {p}")
        else:
            print("  All local refs OK on remote.")

    return 1 if missing or corrupt else 0


if __name__ == "__main__":
    raise SystemExit(main())
