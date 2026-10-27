# Grok Bot story: data contract

Every field comes from the user's own bot: the box, the user's Pages and memory, and optionally their Mac's Grok Bot app state. No warehouse data, no team data, no cross-user comparisons. `collect.py` writes this as one JSON file; `page-template.tsx` reads it as DATA.

## Time zone rule

All hour, date, weekday, week, streak and window values are computed in the zone the user picked in onboarding (`--tz`, an IANA id), with real DST rules. Weeks start on Monday; "Week of Aug 24" means the week starting Monday Aug 24. Extra zones for the hour chart switcher come only from `--compare-zones`; the switcher is hidden when there is one zone.

## Box sources

Root is `/home/box/agent-data` (override with `GROK_BOT_AGENT_DATA`). Every SQLite file is opened read-only (`mode=ro`).

| Field | Source | How to compute | Window |
|---|---|---|---|
| bots | `agents/*/profile.json` | distinct bots with at least 1 counted message, after exclusions | data window |
| messages | `agents/*/store.db` table `transcript_entries`, column `entry` (JSON) | `kind=message`, `role=user`, no `fromAgent`, `timestampMs > 0`, string content without `SAND_HIDDEN` | data window |
| crew | same, grouped by bot | top 6 by messages; name, `does` line, avatar shape and color | data window |
| active days | same | distinct local dates | data window |
| streak | same | longest run of consecutive local dates | data window |
| best day / weekday / week | same | max messages per local date, weekday, Monday week | data window |
| hourly / peak hour | same | 24 local-hour buckets; peak is the max | data window |
| daily | same | messages per local date from window start to end, for the calendar | data window |
| connectors | `agents/*/audit.jsonl` rows `type=mcp_tool_call`, key `serverIdentifier` | strip `^(dashboard-[a-z]+-\d+-\|user-)`, keep the part before `--`, drop trailing words read, only, readonly, console, sql, mcp, server, api, safe; group case-insensitive; top 12 | data window |
| beyond | audit.jsonl `computer_use_session`, `browser_navigation`, `shell_command` | counts | data window |
| skills | `workflows/*/SKILL.md` | count | as of today |
| routines | `agents/*/automations/*/automation.json` under kept bots | count with `enabled: true`; `routinesSetUp` counts all | as of today |
| Pages | ListCanvases | count of the user's Pages (`--pages`) | as of today |
| published | memory and chat links to `x.ai/bot/` (bot fills `--published`) | `[{name, tag, url, date, shape, color}]` | lifetime, as found |
| window | message timestamps | first to last active local date, with day count and a label like "Jul 29 to Sep 9, 2026" | |

Excluded bots (`--exclude-bots`, names or ids) are dropped by directory and by `agentId` where present, before any count.

## Mac app-state sources (optional)

Written by `collect_app_state.py` to `~/Downloads/grok-bot-story-app-state/`, copied to the box with CopyToBox, passed as `--app-state`. Read from `~/Library/Application Support/Grok Bot/`. Files in `sand-client-persistence/` are named by the base32 of their storage key.

| Output | Source key or folder | Used for |
|---|---|---|
| `app-state.json` `bots[]`: `{id, name, avatarShape, avatarColor, description}` | `roster.last-roster` | bot display names, avatar shape and color when profile.json lacks them |
| `app-state.json` `logos[]`: `{name, logo}` | `mcp.connect-logos` | connector icons matched by name |
| `app-state.json` `connectedAppCount` | `connected-app-count` | `totals.appConnectedCount` (kept in JSON, not shown by default) |
| `plugin-logo-cache/` | same folder name | logos keyed by a hash that can't be mapped to a name; only usable through `--dump-logos` plus manual `--icons` |
| `link-favicon-cache/<sha256(host)>.json` `{expiresAt, dataUrl}` | same folder name | connector icons by known service hosts |

Never read: `sand-secrets.json`, cookies, tokens, session or credential files, keychains, key files. Both scripts skip any file whose name or decoded key looks like one.

## Avatar fields

`shape` is one of the 13 app shapes (`blob`, `circle`, `teardrop`, and the rest in `SHAPES` in the template); unknown or empty becomes `blob`. `color` is one of 11 swatch names; unknown or empty becomes `gray`. The template maps names to its own swatch, so no color value is ever emitted by the collector. Avatar photos (`avatarPhoto`) are not rendered.

## Icon priority

1. App-state `logos` by connector name. 2. `link-favicon-cache` by sha256 of known hosts (alias table plus `name.com`, `www.`, `app.`, `.so`, `.io`). 3. `--icons` overrides (data URL or absolute file path) win over both. 4. A one or two letter tile. Icons are shrunk to 24px when Pillow is installed.

## Caveats

- `createdAt` on bots is unreliable (it can reflect a copy or migration, not when the user made the bot). Don't use it for "member since" or bot age.
- The box copy of transcripts and audit logs covers a limited stretch, often weeks. The window is always shown as found.
- `requestIds` in store.db kv and `runs.json` per routine are capped, so they aren't used for totals.
- Connector counts are from usage (tool calls), not from connection status.
- Dropped on purpose: rank, percentile, total user counts, token counts, work-type mix, cloud agents and voice turns.

## Product gaps

1. A longer history or a per-bot stats API (message counts and timestamps), so a story can cover a full year.
2. A published-bots list for the user, with dates and share links.
3. Page download and clipboard access, so the poster can offer real Save and Copy buttons instead of right-click.
4. Avatar rendering in Pages (photos and the app's own shape art).
5. A name mapping for the plugin logo cache, or logos keyed by connector name.
