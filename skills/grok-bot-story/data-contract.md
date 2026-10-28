# Grok Bot story: data contract

Every field comes from the user's own bot: the box, the user's Pages and memory, and optionally their Mac's Grok Bot app state. No warehouse data, no team data, no cross-user comparisons. `collect.py` writes this as one JSON file; `page-template.tsx` reads it as DATA. The JSON shape must match the template's `Data` type exactly, so `collect.py --tsx` leaves out the bot-only keys `notes` and `archetype` when it fills the template.

## Time zone rule

All hour, date, weekday, week, streak, fun fact and window values are computed in the zone the user is in now (`--tz`, an IANA id: the device zone, or the one in memory), with real DST rules. `--tz-label` sets the friendly name shown on the Page ("All times in Pacific"). Weeks start on Monday; "Week of Aug 24" means the week starting Monday Aug 24. This is the only zone: `zone` holds its hour, day, weekday and week stats (null when there are no messages), and the Page shows no other zone and no zone picker.

## Top-level shape

```
version: 2
user: {name}
timezone: {id, label}
window: {start, end, days, label} | null
zone: {name, hourly[24], daily[], peakHour, bestDay, bestWeekday, bestWeek} | null
funDay: {label, count, bots: [{name, count}]} | null
totals: {messages, bots, activeDays, streak, skills, pages, routines, routinesSetUp, connectors, appConnectedCount}
crew: [{key, name, does, msgs, shape, color}]
connectors: [{name, icon, mono, value}]      (icon is a data URL in data.json, asset:<file> in page.tsx)
beyond: {computerUse, browserPages, tasks}
published: [{name, tag, url, date, shape, color}]
archetype: {primary, secondary, scores}      (bot only, not on the Page)
notes: {crew: [...]}                         (bot only, not on the Page)
sources: {botsOnBox, botsExcluded, namesFromAppRoster, connectorIconsFound, lowResIcons, appState}
```

## Box sources

Root is `/home/box/agent-data` (override with `GROK_BOT_AGENT_DATA`). Every SQLite file is opened read-only (`mode=ro`).

| Field | Source | How to compute | Window |
|---|---|---|---|
| bots | `agents/*/profile.json` | distinct bots with at least 1 counted message, after exclusions | data window |
| messages | `agents/*/store.db` table `transcript_entries`, column `entry` (JSON) | `kind=message`, `role=user`, no `fromAgent`, `timestampMs > 0`, string content without `SAND_HIDDEN` | data window |
| crew | same, grouped by bot | top 6 by messages; name, `does` line (written by the bot, see below), avatar shape and color | data window |
| active days | same | distinct local dates | data window |
| streak | same | longest run of consecutive local dates | data window |
| best day / weekday / week | same | max messages per local date, weekday, Monday week | data window |
| hourly / peak hour | same | 24 local-hour buckets; peak is the max | data window |
| daily | same | messages per local date from window start to end | data window |
| funDay | same, per bot per local date | the local date with the most messages (earliest on a tie), labeled like "Monday, Aug 24", its count, and the top 2 bots that day with their counts | data window |
| connectors | `agents/*/audit.jsonl` rows `type=mcp_tool_call`, key `serverIdentifier` | strip a workspace or user scope prefix, keep the part before `--`, drop trailing words read, only, readonly, console, sql, mcp, server, api, safe; group case-insensitive; ranked by calls; top 12 in the list, `totals.connectors` counts all | data window |
| beyond | audit.jsonl `computer_use_session`, `browser_navigation`, `shell_command` | counts, as `computerUse`, `browserPages`, `tasks` | data window |
| skills | `workflows/*/SKILL.md` | count | as of today |
| routines | `agents/*/automations/*/automation.json` under kept bots | count with `enabled: true`; `routinesSetUp` counts all | as of today |
| Pages | ListCanvases | count of the user's Pages (`--pages`); left out when the call returns its cap of 50 | as of today |
| published | memory and chat links to `x.ai/bot/` (bot fills `--published`) | normalized to exactly `{name, tag, url, date, shape, color}`; entries without a name or an `https://` url are dropped | lifetime, as found |
| window | message timestamps | first to last active local date, with day count and a label like "Jul 29 to Sep 9, 2026" | |

Excluded bots (`--exclude-bots`, names or ids) are dropped by directory and by `agentId` where present, before any count.

## Crew one-liners and `notes.crew`

The Page shows one line under each crew bot (`crew[].does`, at most 32 characters). The collector's own guess from the bot description is only a fallback. The bot that builds the Page writes these lines itself from `notes.crew`, saves them as `{"Bot name": "line"}` and passes them with `--does`, which wins over the fallback.

Each `notes.crew` entry has: `name`, `msgs`, `activeDays`, `first`, `last` (local dates), `description` (the bot's own description, cut to 300 characters, never shown on the Page), `topTools` (top 8 `{connector, tool, count}` by successful calls), `actions` (top 8 write-style calls: create, send, post, draft, update, add, schedule, publish, reply, book, write, insert, append, label, archive, move, upload, comment, invite), `routines` (enabled `{name, schedule}`), and that bot's `computerUse`, `browserPages` and `tasks` counts.

Rules for a line: plain words, about what the bot did for the user, at most 32 characters; numbers only if they are in `notes.crew`, unrounded; no names of people, emails, channel, document or customer names, and nothing private from a description.

## Archetype rules

Computed the same way in `page-template.tsx` (`archetype()`) and in `collect.py` (`archetype_preview()`, so the bot can name it in chat). Inputs: `bots` = `totals.bots`, `msgs` = `totals.messages`, `routines` = `totals.routines`, `conns` = `totals.connectors`, and the share of messages by local hour from `zone.hourly`.

| Archetype | Score | Reason shown |
|---|---|---|
| Bot Factory | bots / 8 | bots made |
| Bot Artisan | only when bots is 1 to 4: (msgs / bots) / 50 | messages per bot |
| Night Owl | share of messages from 10pm to 4am (hours 22 to 3) / 0.3 | share of late-night messages |
| Early Bird | share of messages from 5am to 9am (hours 5 to 8) / 0.3 | share of early messages |
| Autopilot | min(routines / 5, routines / bots / 0.5) | routines running |
| Connector Collector | conns / 12 | connectors used |

A score of 1 or more matches. The highest score is the primary archetype; ties go to the rule higher in the table. The next matching rule, if any, is the secondary. With no match the archetype is Bot Explorer ("N messages and just getting started"). Each archetype has its own drawn bot, accent swatch and a short build-up of the user's real counts before the reveal.

## Mac app-state sources (optional)

Written by `collect_app_state.py` to `~/Downloads/grok-bot-story-app-state/`, copied to the box with CopyToBox, passed as `--app-state`. Read from `~/Library/Application Support/Grok Bot/`. Files in `sand-client-persistence/` are named by the base32 of their storage key.

| Output | Source key or folder | Used for |
|---|---|---|
| `app-state.json` `bots[]`: `{id, name, avatarShape, avatarColor, description}` | `roster.last-roster` | bot display names, avatar shape and color when profile.json lacks them |
| `app-state.json` `logos[]`: `{name, logo}` | `mcp.connect-logos` | connector logos matched by name (often small; check `sources.lowResIcons`) |
| `app-state.json` `connectedAppCount` | `connected-app-count` | `totals.appConnectedCount` (kept in JSON, not shown by default) |
| `plugin-logo-cache/` | same folder name | sharp logos (usually 96 to 112 px) keyed by a hash that can't be mapped to a name; use them through `--dump-logos` plus `--icons` |
| `link-favicon-cache/<sha256(host)>.json` `{expiresAt, dataUrl}` | same folder name | connector icons by known service hosts (often 16 to 32 px, so flagged as low-res) |

Never read: `sand-secrets.json`, cookies, tokens, session or credential files, keychains, key files. Both scripts skip any file whose name or decoded key looks like one.

## Avatar fields

`shape` is one of the 13 app shapes (`blob`, `circle`, `teardrop`, and the rest in `SHAPES` in the template); unknown or empty becomes `blob`. `color` is one of 11 swatch names; unknown or empty becomes `gray`. The template maps names to its own swatch, so no color value is ever emitted by the collector. Avatar photos (`avatarPhoto`) are not rendered.

## Icon priority and sharpness

1. `--icons` overrides (data URL or absolute file path) win over everything. 2. App-state `logos` by connector name. 3. `link-favicon-cache` by sha256 of known hosts (alias table plus `name.com`, `www.`, `app.`, `.so`, `.io`). 4. A one or two letter tile.

The Page draws logos at 24 px, so a source needs at least 48 px and ideally 72 px or more. collect.py fits each logo in 72 px when Pillow is installed, never upscales, keeps SVG as is, and lists any connector whose logo is under 48 px in `sources.lowResIcons`. For those, find a sharper one: the plugin logo cache through `--dump-logos`, or the service's public `apple-touch-icon` or large favicon. If none exists, drop that connector from `--icons` so it shows a letter tile. A blurry logo is worse than a letter tile.

## Logos as Page assets

`data.json` keeps each logo as a data URL. When `--tsx` fills the template, collect.py writes each logo to `--assets-dir` (default `/workspace/grok-bot-story/assets`; WriteCanvasAsset reads only under `/workspace`, `/home` or `/root`) as `<slug>.png` (72 px max, never upscaled; an SVG logo stays an inline data URL because Page assets must be PNG, JPEG, WebP or GIF), sets that connector's `icon` in the Page's DATA to `asset:<slug>.png`, and prints a manifest `{"<slug>.png": "/abs/path/<slug>.png"}` (also saved as `manifest.json` in that folder). At most 20 logos become assets, the Page asset limit; later connectors get `icon: ""` and show their `mono` letter tile. The bot uploads every manifest entry with WriteCanvasAsset after WriteCanvas, using the exact manifest key as the asset name. The template draws an `icon` that starts with `asset:` or `data:image/` with the Page's Image component at 24 px, and anything else as the letter tile.

The filled `page.tsx` is also compacted (indentation and whole-line comments removed), so it fits in a single WriteCanvas call.

## Caveats

- `createdAt` on bots is unreliable (it can reflect a copy or migration, not when the user made the bot). Don't use it for "member since" or bot age.
- The box copy of transcripts and audit logs covers a limited stretch, often weeks. The window is always shown as found.
- `requestIds` in store.db kv and `runs.json` per routine are capped, so they aren't used for totals.
- Connector counts are from usage (tool calls), not from connection status.
- Dropped on purpose: rank, percentile, total user counts, token counts, work-type mix, cloud agents, voice turns and multi-zone comparisons.

## Product gaps

1. A longer history or a per-bot stats API (message counts and timestamps), so a story can cover a full year.
2. A published-bots list for the user, with dates and share links.
3. Page download and clipboard access, so the share card can offer real Save and Copy buttons instead of right-click.
4. Avatar rendering in Pages (photos and the app's own shape art).
5. A name mapping for the plugin logo cache, or logos keyed by connector name.
