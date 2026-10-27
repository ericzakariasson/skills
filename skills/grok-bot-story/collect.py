#!/usr/bin/env python3
r"""Collect a Grok Bot user's own activity from the box into one JSON file.

Standard library only. Read-only: opens every store.db with mode=ro and never
touches secrets, cookies or tokens. The JSON matches data-contract.md and is
pasted as DATA at the top of page-template.tsx.

Usage:
  python3 collect.py --tz America/New_York --name "Sam" --pages 12 \
      [--app-state DIR] [--exclude-bots "Name,Other"] \
      [--does FILE] [--published FILE] [--icons FILE] [--out data.json] [--tsx page-template.tsx --tsx-out page.tsx]
"""
import argparse
import base64
import datetime as dt
import glob
import hashlib
import json
import os
import re
import sqlite3
import sys
from collections import Counter, defaultdict
from zoneinfo import ZoneInfo

AGENT_DATA = os.environ.get("GROK_BOT_AGENT_DATA", "/home/box/agent-data")
WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
KNOWN_SHAPES = {"circle", "blob", "squircle", "star", "cloud", "pebble", "flower", "teardrop",
                "tablet", "wedge", "house", "splat", "hex"}
KNOWN_COLORS = {"black", "brown", "red", "orange", "yellow", "green", "cyan", "blue", "violet", "magenta", "gray"}
# Never opened, even if a glob would match them.
SECRET_HINTS = ("secret", "cookie", "token", "credential", "password", "keychain", "seed", ".pem", ".key")

# Connector server identifiers look like "<scope>-<service>[--<account>]". Scope prefixes are stripped.
SCOPE_RE = re.compile(r"^(dashboard-[a-z]+-\d+-|user-)", re.I)
DROP_WORDS = {"read", "only", "readonly", "console", "sql", "mcp", "server", "api", "safe"}
# Hosts to try in the app's link-favicon-cache (named sha256(host).json). name.com, www. and app. are always tried too.
HOSTS = {
    "slack": ["app.slack.com", "slack.com"], "notion": ["www.notion.so", "notion.so", "www.notion.com"],
    "google sheets": ["sheets.google.com"],
    "google calendar": ["calendar.google.com"], "google drive": ["drive.google.com"],
    "x": ["x.com", "twitter.com"], "statsig": ["console.statsig.com"],
    "datadog": ["app.datadoghq.com", "www.datadoghq.com"], "github": ["github.com"],
    "linear": ["linear.app"], "navan": ["app.navan.com"], "hex": ["app.hex.tech"], "figma": ["www.figma.com"],
    "pangram": ["www.pangram.com"], "jira": ["atlassian.net"], "hubspot": ["app.hubspot.com"],
}
TITLE_FIX = {"x": "X", "github": "GitHub", "hubspot": "HubSpot", "openai": "OpenAI"}


def is_secretish(path):
    low = os.path.basename(path).lower()
    return any(h in low for h in SECRET_HINTS)


def read_json(path, default=None):
    if is_secretish(path):
        return default
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return default


def open_out(path):
    """Open an output file for writing, creating its folder first if it doesn't exist yet."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    return open(path, "w", encoding="utf-8")


def agent_dirs():
    return sorted(d for d in glob.glob(os.path.join(AGENT_DATA, "agents", "*")) if os.path.isdir(d))


def user_messages(db_path):
    """Yield epoch-ms timestamps of messages the user typed: kind=message, role=user, not from another agent,
    with a timestamp, and not hidden system content."""
    try:
        con = sqlite3.connect("file:" + db_path + "?mode=ro", uri=True)
        rows = con.execute("select entry from transcript_entries").fetchall()
        con.close()
    except Exception:
        return
    for (raw,) in rows:
        try:
            e = json.loads(raw)
        except Exception:
            continue
        if e.get("kind") != "message" or e.get("role") != "user" or e.get("fromAgent"):
            continue
        ts = e.get("timestampMs")
        if not isinstance(ts, (int, float)) or ts <= 0:
            continue
        content = e.get("content")
        if isinstance(content, str) and "SAND_HIDDEN" in content:
            continue
        yield int(ts)


def connector_service(ident):
    if not isinstance(ident, str) or not SCOPE_RE.match(ident):
        return None  # built-ins, internal tools and malformed rows
    base = SCOPE_RE.sub("", ident).split("--")[0]
    words = [w for w in re.split(r"[\s_\-]+", base.strip()) if w]
    while len(words) > 1 and words[-1].lower() in DROP_WORDS:
        words.pop()
    if not words or (len(words) == 1 and words[0].lower() in DROP_WORDS):
        return None
    key = " ".join(w.lower() for w in words)
    return key


def display_name(key):
    if key in TITLE_FIX:
        return TITLE_FIX[key]
    return " ".join(w[:1].upper() + w[1:] for w in key.split(" "))


def mono(name):
    parts = [p for p in re.split(r"\s+", name) if p]
    if len(parts) >= 2:
        return (parts[0][0] + parts[1][0]).upper()
    return name[:1].upper()


def fmt_day(d, with_year=False):
    s = d.strftime("%b ") + str(d.day)
    return s + (", " + str(d.year) if with_year else "")


def window_label(a, b):
    if a == b:
        return fmt_day(a, True)
    if a.year == b.year:
        return fmt_day(a) + " to " + fmt_day(b, True)
    return fmt_day(a, True) + " to " + fmt_day(b, True)


def zone_label(tzid):
    if tzid.upper() in ("UTC", "ETC/UTC", "GMT"):
        return "UTC"
    return tzid.split("/")[-1].replace("_", " ")


def zone_stats(stamps, tzid, label, start, end):
    tz = ZoneInfo(tzid)
    hourly = [0] * 24
    by_day = Counter()
    for t in stamps:
        x = dt.datetime.fromtimestamp(t / 1000, tz)
        hourly[x.hour] += 1
        by_day[x.date()] += 1
    n_days = (end - start).days + 1
    days = [start + dt.timedelta(days=i) for i in range(n_days)]
    daily = [by_day.get(d, 0) for d in days]
    wd = [0] * 7
    weeks = Counter()
    for d, v in zip(days, daily):
        wd[d.weekday()] += v
        weeks[d - dt.timedelta(days=d.weekday())] += v
    peak = max(range(24), key=lambda h: (hourly[h], -h))
    bi = max(range(n_days), key=lambda i: (daily[i], -i)) if n_days else 0
    bw = max(range(7), key=lambda i: (wd[i], -i))
    wk = max(sorted(weeks), key=lambda k: weeks[k]) if weeks else start
    return {
        "name": (label + " time") if label != "UTC" else "UTC",
        "hourly": hourly, "daily": daily, "peakHour": peak,
        "bestDay": {"label": fmt_day(days[bi]) if days else "", "count": daily[bi] if days else 0},
        "bestWeekday": {"label": WEEKDAYS[bw], "count": wd[bw]},
        "bestWeek": {"label": "Week of " + fmt_day(wk), "count": weeks.get(wk, 0)},
    }


def longest_streak(dates):
    best = run = 0
    prev = None
    for d in sorted(dates):
        run = run + 1 if prev is not None and (d - prev).days == 1 else 1
        best = max(best, run)
        prev = d
    return best


def load_app_state(folder):
    """Read a bundle written by collect_app_state.py (app-state.json plus logo caches)."""
    out = {"bots": {}, "logos": {}, "favicons": {}, "connectedAppCount": None}
    if not folder:
        return out
    st = read_json(os.path.join(folder, "app-state.json"), {}) or {}
    for b in st.get("bots") or []:
        if isinstance(b, dict) and b.get("id"):
            out["bots"][b["id"]] = b
    for lg in st.get("logos") or []:
        if isinstance(lg, dict) and lg.get("name") and str(lg.get("logo", "")).startswith("data:image/"):
            out["logos"][lg["name"].lower()] = lg["logo"]
    if isinstance(st.get("connectedAppCount"), int):
        out["connectedAppCount"] = st["connectedAppCount"]
    fav = os.path.join(folder, "link-favicon-cache")
    for p in glob.glob(os.path.join(fav, "*.json")):
        if os.path.basename(p).startswith("._"):
            continue
        j = read_json(p, {}) or {}
        if str(j.get("dataUrl", "")).startswith("data:image/"):
            out["favicons"][os.path.basename(p)[:-5]] = j["dataUrl"]
    return out


def find_icon(key, name, app):
    hit = app["logos"].get(name.lower()) or app["logos"].get(key)
    if hit:
        return hit
    flat = key.replace(" ", "")
    hosts = HOSTS.get(key, []) + [flat + ".com", "www." + flat + ".com", "app." + flat + ".com", flat + ".so", flat + ".io"]
    for h in hosts:
        u = app["favicons"].get(hashlib.sha256(h.encode()).hexdigest())
        if u:
            return u
    return ""


def shrink_icon(url, px=24):
    """Make an icon small enough to paste inline: 24px palette PNG. Needs Pillow; without it the icon is kept as is."""
    try:
        import io
        from PIL import Image
    except Exception:
        return url
    try:
        raw = base64.b64decode(url.split(",", 1)[1])
        im = Image.open(io.BytesIO(raw)).convert("RGBA")
        im.thumbnail((px, px), Image.LANCZOS)
        buf = io.BytesIO()
        im.quantize(colors=64, method=Image.FASTOCTREE).save(buf, "PNG", optimize=True)
        small = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode()
        return small if len(small) < len(url) else url
    except Exception:
        return url


def icon_value(v):
    """--icons values may be a data URL or a path to a PNG, JPEG or SVG file."""
    if not isinstance(v, str) or not v:
        return ""
    if v.startswith("data:image/"):
        return v
    if os.path.isfile(v) and not is_secretish(v):
        ext = os.path.splitext(v)[1].lower()
        mime = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp"}.get(ext)
        if mime:
            return "data:" + mime + ";base64," + base64.b64encode(open(v, "rb").read()).decode()
    return ""


def dump_logos(folder, dest):
    """Write every distinct logo in the bundle's plugin-logo-cache as a PNG plus a contact sheet, so the bot can
    look at them and map the right one to each connector with --icons. The cache is keyed by a hash we can't
    reverse, so this is the only way to name them."""
    os.makedirs(dest, exist_ok=True)
    seen = {}
    for p in sorted(glob.glob(os.path.join(folder, "plugin-logo-cache", "*"))):
        b = os.path.basename(p)
        if b.startswith("._") or not os.path.isfile(p):
            continue
        with open(p, encoding="utf-8", errors="replace") as fh:
            url = fh.readline().strip()
        if not url.startswith("data:image/") or url in seen:
            continue
        name = "logo-%03d.png" % len(seen)
        try:
            open(os.path.join(dest, name), "wb").write(base64.b64decode(url.split(",", 1)[1]))
        except Exception:
            continue
        seen[url] = name
    cells = "".join('<figure><img src="%s"><figcaption>%s</figcaption></figure>' % (n, n[5:8]) for n in seen.values())
    html = ("<!doctype html><meta charset=utf-8><style>body{font:11px sans-serif;display:flex;flex-wrap:wrap;gap:6px}"
            "figure{margin:0;width:56px;text-align:center}img{width:40px;height:40px;object-fit:contain}</style>" + cells)
    open(os.path.join(dest, "contact-sheet.html"), "w").write(html)
    return len(seen)


def short_does(text, bot_name, limit=34):
    """A rough one-liner from the bot's description. The bot should replace these with --does; this is only a fallback.
    Returns "" rather than a cut-off sentence, so the Page shows nothing instead of something odd."""
    t = re.sub(r"\s+", " ", (text or "")).strip()
    t = re.sub(r"^" + re.escape(bot_name) + r"\s*[-:\u2013\u2014]\s*", "", t, flags=re.I)
    t = re.sub(r"^You (are|own) [^.]*?\.\s*", "", t)
    m = re.match(r"(.+?)([.!?;:]|\s[-\u2013\u2014]\s|,\s|$)", t)
    s = (m.group(1) if m else t).strip().rstrip(".")
    if not s or len(s) > limit:
        s2 = re.split(r"\s+(with|using|via|from|for|so|and)\s+", s)[0] if s else ""
        s = s2 if s2 and len(s2) <= limit else ""
    return s


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--tz", required=True, help="IANA timezone for every hour, day and streak stat")
    ap.add_argument("--tz-label", default="", help="Display label for --tz (default: city from the id)")
    ap.add_argument("--name", default="", help="Display name for the Page")
    ap.add_argument("--pages", type=int, default=None, help="Pages count from ListCanvases")
    ap.add_argument("--app-state", default="", help="Folder written by collect_app_state.py")
    ap.add_argument("--exclude-bots", default="", help="Comma-separated bot names or ids to leave out")
    ap.add_argument("--does", default="", help="JSON file {botName: one-liner} to override crew descriptions")
    ap.add_argument("--published", default="", help="JSON file with published bots (see data-contract.md)")
    ap.add_argument("--icons", default="", help="JSON file {connectorName: dataUrl} to override icons")
    ap.add_argument("--dump-logos", default="", help="Write the bundle's plugin logos as PNGs plus contact-sheet.html here, then exit")
    ap.add_argument("--crew", type=int, default=6)
    ap.add_argument("--connectors", type=int, default=12)
    ap.add_argument("--out", default="-")
    ap.add_argument("--tsx", default="", help="Template to fill: replaces the DATA block between the markers")
    ap.add_argument("--tsx-out", default="")
    a = ap.parse_args()

    ZoneInfo(a.tz)  # fail fast on a bad zone
    if a.dump_logos:
        n = dump_logos(a.app_state, a.dump_logos)
        print("wrote %d logos to %s" % (n, a.dump_logos))
        return
    app = load_app_state(a.app_state)
    excl = {x.strip().lower() for x in a.exclude_bots.split(",") if x.strip()}

    bots = {}
    for d in agent_dirs():
        bid = os.path.basename(d)
        prof = read_json(os.path.join(d, "profile.json"), {}) or {}
        ro = app["bots"].get(bid, {})
        name = (ro.get("name") or prof.get("name") or "").strip() or "Untitled bot"
        bots[bid] = {
            "id": bid, "dir": d, "name": name,
            "shape": (ro.get("avatarShape") or prof.get("avatarShape") or "").lower(),
            "color": (ro.get("avatarColor") or prof.get("avatarColor") or "").lower(),
            "description": ro.get("description") or prof.get("description") or prof.get("title") or "",
            "excluded": bid.lower() in excl or name.lower() in excl,
        }
    kept = {k: v for k, v in bots.items() if not v["excluded"]}

    per_bot = Counter()
    stamps = []
    for bid, b in kept.items():
        db = os.path.join(b["dir"], "store.db")
        if os.path.exists(db):
            for ts in user_messages(db):
                per_bot[bid] += 1
                stamps.append(ts)

    tz = ZoneInfo(a.tz)
    out = {"version": 1, "generatedAt": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
           "user": {"name": a.name or "You"},
           "timezone": {"id": a.tz, "label": a.tz_label or zone_label(a.tz)}}
    if stamps:
        dates = sorted({dt.datetime.fromtimestamp(t / 1000, tz).date() for t in stamps})
        start, end = dates[0], dates[-1]
        out["window"] = {"start": start.isoformat(), "end": end.isoformat(), "days": (end - start).days + 1,
                         "label": window_label(start, end)}
        out["zone"] = zone_stats(stamps, a.tz, a.tz_label or zone_label(a.tz), start, end)
        active, streak = len(dates), longest_streak(dates)
    else:
        out["window"] = None
        out["zone"] = None
        active = streak = 0

    # Connectors and work beyond the chat, from each kept bot's audit.jsonl.
    calls = Counter()
    beyond = Counter()
    for bid, b in kept.items():
        p = os.path.join(b["dir"], "audit.jsonl")
        if not os.path.exists(p):
            continue
        with open(p, encoding="utf-8", errors="replace") as fh:
            for line in fh:
                try:
                    e = json.loads(line)
                except Exception:
                    continue
                if e.get("agentId") and e["agentId"] in bots and bots[e["agentId"]]["excluded"]:
                    continue
                ty = e.get("type")
                if ty == "mcp_tool_call":
                    k = connector_service(e.get("serverIdentifier"))
                    if k:
                        calls[k] += 1
                elif ty in ("computer_use_session", "browser_navigation", "shell_command"):
                    beyond[ty] += 1

    icon_over = read_json(a.icons, {}) if a.icons else {}
    conns = []
    for k, v in calls.most_common(a.connectors):
        nm = display_name(k)
        icon = icon_value(icon_over.get(nm)) or find_icon(k, nm, app)
        icon = shrink_icon(icon) if icon else ""
        conns.append({"name": nm, "icon": icon, "mono": mono(nm), "value": v})

    # Routines: enabled automation.json files under kept bots. Paused ones are reported separately.
    r_on = r_all = 0
    for bid, b in kept.items():
        for p in glob.glob(os.path.join(b["dir"], "automations", "*", "automation.json")):
            j = read_json(p, {}) or {}
            r_all += 1
            r_on += 1 if j.get("enabled") is True else 0

    skills = len([d for d in glob.glob(os.path.join(AGENT_DATA, "workflows", "*")) if os.path.isfile(os.path.join(d, "SKILL.md"))])

    does = read_json(a.does, {}) if a.does else {}
    crew = []
    for bid, n in per_bot.most_common(a.crew):
        b = kept[bid]
        crew.append({
            "key": "b" + str(len(crew)), "name": b["name"],
            "does": does.get(b["name"]) or short_does(b["description"], b["name"]),
            "msgs": n,
            "shape": b["shape"] if b["shape"] in KNOWN_SHAPES else "blob",
            "color": b["color"] if b["color"] in KNOWN_COLORS else "gray",
        })

    published = read_json(a.published, []) if a.published else []
    out["totals"] = {
        "messages": len(stamps), "bots": len(per_bot), "activeDays": active, "streak": streak,
        "skills": skills, "pages": a.pages, "routines": r_on, "routinesSetUp": r_all,
        "connectors": len(calls), "appConnectedCount": app["connectedAppCount"],
    }
    out["crew"] = crew
    out["connectors"] = conns
    out["beyond"] = {"computerUse": beyond["computer_use_session"], "browserPages": beyond["browser_navigation"],
                     "shell": beyond["shell_command"]}
    out["published"] = published or []
    out["sources"] = {
        "botsOnBox": len(bots), "botsExcluded": sorted(b["name"] for b in bots.values() if b["excluded"]),
        "namesFromAppRoster": sum(1 for k in kept if k in app["bots"]),
        "connectorIconsFound": sum(1 for c in conns if c["icon"]),
        "appState": bool(a.app_state),
    }

    text = json.dumps(out, indent=1, ensure_ascii=False)
    if a.out == "-":
        sys.stdout.write(text + "\n")
    else:
        with open_out(a.out) as fh:
            fh.write(text + "\n")
    if a.tsx:
        src = open(a.tsx, encoding="utf-8").read()
        pat = re.compile(r"(// DATA:BEGIN\n).*?(\n// DATA:END)", re.S)
        if not pat.search(src):
            sys.exit("template has no // DATA:BEGIN ... // DATA:END block")
        src = pat.sub(lambda m: m.group(1) + "const DATA: Data = " + json.dumps(out, ensure_ascii=False) + ";" + m.group(2), src)
        with open_out(a.tsx_out or "page.tsx") as fh:
            fh.write(src)


if __name__ == "__main__":
    main()
