#!/usr/bin/env python3
"""collect_app_state.py: read-only helper that runs on the user's Mac.

It copies the few pieces of Grok Bot desktop app state that the box can't see
(bot names and avatars, connector logos, connected app count) into one folder in
~/Downloads, so the bot can pull it to the box with CopyToBox and pass it to
collect.py --app-state.

Run it only after the user approves. It never writes anywhere except the output
folder, never deletes anything, and skips every file that looks like a secret.

  python3 collect_app_state.py            # list what it would copy (default, prints key names only)
  python3 collect_app_state.py --write    # write ~/Downloads/grok-bot-story-app-state/

Stdlib only. On macOS it shrinks logos with `sips` when available.
"""
import argparse, base64, json, os, re, shutil, subprocess, sys
from pathlib import Path

APP = Path.home() / "Library" / "Application Support" / "Grok Bot"
PERSIST = APP / "sand-client-persistence"
CACHES = ["plugin-logo-cache", "link-favicon-cache"]
SECRETISH = re.compile(r"secret|cookie|token|credential|password|passwd|keychain|seed|session|auth|\.pem$|\.key$|\.p12$", re.I)
WANT = {
    "roster": re.compile(r"roster", re.I),
    "logos": re.compile(r"connect-?logos", re.I),
    "count": re.compile(r"connected-?app-?count", re.I),
}


def secretish(name):
    return bool(SECRETISH.search(name)) or name.startswith("._") or name.startswith(".")


def decode_name(fname):
    """File names are base32 of the storage key. Try a few spellings; fall back to the raw name."""
    stem = fname.rsplit(".", 1)[0] if re.search(r"\.(json|txt|dat)$", fname) else fname
    for cand in (stem, stem.upper()):
        c = cand.rstrip("=")
        c += "=" * (-len(c) % 8)
        for fn in (base64.b32decode, getattr(base64, "b32hexdecode", None)):
            if not fn:
                continue
            try:
                out = fn(c).decode("utf-8")
                if out.isprintable():
                    return out
            except Exception:
                pass
    return stem


def load_value(path):
    raw = path.read_text("utf-8", errors="replace")
    try:
        v = json.loads(raw)
    except Exception:
        return raw
    # Unwrap common storage envelopes like {"value": ...} or {"data": ...}, including JSON-in-a-string.
    for _ in range(3):
        if isinstance(v, dict) and len(v) <= 3 and any(k in v for k in ("value", "data", "state")):
            v = v.get("value", v.get("data", v.get("state")))
        if isinstance(v, str):
            try:
                v = json.loads(v)
                continue
            except Exception:
                pass
        break
    return v


def find_lists(v, test):
    """Yield lists of dicts anywhere in v where test(dict) holds for the first item."""
    if isinstance(v, list):
        if v and isinstance(v[0], dict) and test(v[0]):
            yield v
        for x in v:
            yield from find_lists(x, test)
    elif isinstance(v, dict):
        for x in v.values():
            yield from find_lists(x, test)


def find_int(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, str) and v.strip().isdigit():
        return int(v.strip())
    if isinstance(v, dict):
        for k in ("count", "value", "connectedAppCount"):
            if k in v:
                return find_int(v[k])
    return None


BOT_KEYS = ("id", "name", "avatarShape", "avatarColor", "description", "createdAt", "lastActivityAt")


def shrink(path, px=48):
    if sys.platform == "darwin" and shutil.which("sips"):
        subprocess.run(["sips", "-Z", str(px), str(path)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="actually write the output folder")
    ap.add_argument("--out", default=str(Path.home() / "Downloads" / "grok-bot-story-app-state"))
    ap.add_argument("--app-dir", default=str(APP))
    a = ap.parse_args()
    app = Path(a.app_dir)
    persist = app / "sand-client-persistence"
    if not persist.is_dir():
        print(f"not found: {persist}")
        return 1

    hits = {"roster": [], "logos": [], "count": []}
    for f in sorted(persist.iterdir()):
        if not f.is_file() or secretish(f.name):
            continue
        key = decode_name(f.name)
        if secretish(key):
            continue
        for kind, rx in WANT.items():
            if rx.search(key):
                hits[kind].append((key, f))

    if not a.write:
        print("Would read these app state keys (contents not printed):")
        for kind, items in hits.items():
            for key, f in items:
                print(f"  {kind:7s} {key}  ({f.stat().st_size} bytes)")
        for c in CACHES:
            d = app / c
            n = sum(1 for x in d.iterdir() if x.is_file() and not secretish(x.name)) if d.is_dir() else 0
            print(f"  cache   {c}  ({n} files)")
        print("Nothing written. Re-run with --write to create", a.out)
        return 0

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    bots, logos, count = {}, [], None
    for key, f in hits["roster"]:
        for lst in find_lists(load_value(f), lambda d: "name" in d and ("id" in d or "avatarShape" in d)):
            for b in lst:
                bid = b.get("id") or b.get("name")
                bots[bid] = {k: b.get(k) for k in BOT_KEYS if k in b}
    for key, f in hits["logos"]:
        for lst in find_lists(load_value(f), lambda d: "name" in d and any(k in d for k in ("logo", "dataUrl", "iconUrl"))):
            for l in lst:
                logo = l.get("logo") or l.get("dataUrl")
                if isinstance(logo, str) and logo.startswith("data:image/"):
                    logos.append({"name": l.get("name"), "logo": logo})
    for key, f in hits["count"]:
        count = find_int(load_value(f)) if count is None else count

    (out / "app-state.json").write_text(json.dumps(
        {"bots": list(bots.values()), "logos": logos, "connectedAppCount": count}, indent=1))

    for c in CACHES:
        src, dst = app / c, out / c
        if not src.is_dir():
            continue
        dst.mkdir(exist_ok=True)
        for f in src.iterdir():
            if f.is_file() and not secretish(f.name) and f.stat().st_size < 2_000_000:
                shutil.copy2(f, dst / f.name)
                if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
                    shrink(dst / f.name)

    print(f"Wrote {out}: {len(bots)} bots, {len(logos)} logos, connectedAppCount={count}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
