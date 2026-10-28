---
name: grok-bot-story
description: Builds the user a personal "<Name> on Grok Bot" story Page from their own Grok Bot activity (messages, bots, hours, crew, connectors, work beyond the chat, an archetype, shipped bots) ending on a share card they can save or copy. Use when the user asks for their Grok Bot story, recap, year in review, wrapped, stats about how they use Grok Bot, their Grok Bot archetype, or a card they can share about their bots. Also use when a routine asks for the monthly rebuild of that Page.
license: MIT
compatibility: Needs a Grok Bot with Pages and Python 3.9 or newer on its box, plus network access to raw.githubusercontent.com when the helper files are not next to this file. Pillow is used for logos when present. The optional app-state step needs the user's registered Mac with the Grok Bot app.
---

# Grok Bot story

You build one Page that walks the user through their own Grok Bot activity in up to 8 steps and ends on a share card they can save or copy. Every number comes from the user's own data on the box. You never invent, round up, estimate or compare. The only words you write yourself are the crew one-liners (section 2, step 6).

Helper files live next to this file, in the same folder. Run commands from there, or from the working folder in step 0 if you had to download them.

- [collect.py](collect.py): reads the box and writes one JSON file, and fills the Page template. Read-only, standard library only (Pillow optional).
- [collect_app_state.py](collect_app_state.py): optional helper that runs on the user's Mac to pick up bot names, avatars and connector logos.
- [page-template.tsx](page-template.tsx): the Page. Only its DATA block changes per user; the shipped DATA block is empty.
- [data-contract.md](data-contract.md): what every field means, where it comes from, and the archetype rules.
- [onboarding.md](onboarding.md): an example of the whole conversation.

## 0. Get the helper files

The Page always comes from `page-template.tsx`, so these files are required. If they are not next to this file, which happens when the skill was installed from a bot template that only carries SKILL.md, download them into a working folder on the box and run every command from there:

```
mkdir -p /tmp/grok-bot-story && cd /tmp/grok-bot-story
base=https://raw.githubusercontent.com/ericzakariasson/skills/main/skills/grok-bot-story
curl -fsSL --retry 3 --remote-name-all "$base/collect.py" "$base/collect_app_state.py" "$base/page-template.tsx" "$base/data-contract.md" "$base/onboarding.md"
grep -q "DATA:BEGIN" page-template.tsx && grep -q "DATA:END" page-template.tsx && python3 collect.py --help >/dev/null && echo TEMPLATE_OK
```

Go on only when the last line prints `TEMPLATE_OK`. If a download fails or the check doesn't print it, wait a minute and try once more. If it still fails, stop and tell the user the story template couldn't be downloaded, so you can't build the Page right now. Never build a story Page, site or card from your own design instead.

## 1. Onboarding (in chat, one widget at most)

Open with one short line, then ask a single short question widget with these two questions. Prefill every default so the user can just confirm.

1. **Name on the Page.** Default to the name from their profile or memory. Free text.
2. **Bots to leave out.** Multi-select of the user's bots by name, nothing selected by default. Use this for test bots or bots they don't want on a public card.

Don't ask anything else. For the time zone, use the zone the user is in now: the device zone, or the one in memory. Don't ask about it or offer a list; the Page shows that one zone only. If the user skips the widget, use the defaults.

Before you build, say the date range you found in one line, for example "I found activity from Jul 29 to Sep 9, 2026, so the Page covers those 43 days." If the range is short, say so plainly.

## 2. Gather

Run everything on the box unless noted. Work in `/tmp/story`.

1. Pages count: call ListCanvases and count the user's Pages. Pass it as `--pages`. ListCanvases returns at most 50, so if you get 50, leave `--pages` out rather than show a capped number. If the call fails, leave it out; the stat is dropped.
2. Shipped bots (optional): look for bots the user published, using RecallMemory and SearchTranscripts for `x.ai/bot/` links. Write what you find to a JSON file: `[{"name", "tag", "url", "date", "shape", "color"}]`, where `tag` is a 2 to 6 word line on what it does (or ""), `date` is like "Sep 2, 2026" and `shape`/`color` come from that bot's profile if it is one of theirs. If you find none, skip the file and the "Bots <Name> shipped" step is dropped. Never guess a published bot.
3. App state (optional, Mac only): if the user has a registered Mac and agrees, run `collect_app_state.py` there with Shell and machineId. First run it with no flags; it only lists what it would read. Show the user that list and ask before running it again with `--write`. Then CopyToBox the folder `~/Downloads/grok-bot-story-app-state` and pass it as `--app-state`. It never reads `sand-secrets.json`, cookies, tokens or anything credential-like, and it only writes to that one folder. Without it the Page still works; bot names come from the box and connector logos come from step 7.
4. Run the collector. Pass `--tz-label` as the friendly zone name the user would say (for example "Pacific", "Eastern", "London"):

```
python3 collect.py --tz <IANA zone> --tz-label "<Zone name>" --name "<Name>" --pages <n> \
  [--exclude-bots "Bot A,Bot B"] [--app-state DIR] [--published FILE] \
  --out /tmp/story/data.json
```

5. Read the JSON. Check `window`, `totals`, `funDay`, `archetype` and `sources`. If `totals.messages` is 0, stop and tell the user there isn't enough history on the box yet.
6. Crew one-liners (you write these): the collector's `does` lines are rough fallbacks and are often empty. For each bot in `crew`, read its entry in `notes.crew` (description, `actions`, `topTools`, `routines`, computer use, browser pages, tasks) and write one plain line of at most 32 characters about what that bot actually did for the user. Prefer a concrete, countable action from `actions` or `routines` ("Drafted 26 posts for X", "Put 6 events on your calendar", "Clears inbox noise at 6am"). Use only numbers that are in `notes.crew`, never round or guess. If nothing concrete stands out, describe its job in plain words. No names of people, no emails, no channel or document names, no private details from a description, no em dashes. Save them as `{"Bot name": "line"}` in `/tmp/story/does.json` and pass `--does /tmp/story/does.json` on the build run. `notes` and `archetype` are never put on the Page.
7. Sharp connector logos: the toolkit draws each logo at 24 px, so every logo must be at least 48 px and ideally 72 px or larger square, or the Page looks blurry. `sources.connectorIconsFound` counts connectors that got a logo and `sources.lowResIcons` names any that came from a source under 48 px. Sources, best first:
   - The app's plugin logo cache in the app-state folder (usually 96 to 112 px). Run `python3 collect.py --tz <IANA zone> --app-state DIR --dump-logos /tmp/story/logos`, open `contact-sheet.html`, and match logos to connector names by eye.
   - The service's own public site: its `apple-touch-icon` (180 px) or a large PNG or SVG favicon, downloaded with curl into `/tmp/story/logos`. Use the brand's own mark, not a screenshot, a wordmark or a third-party icon pack.
   - Otherwise leave it out; the Page shows a letter tile. Never upscale a 16 or 32 px favicon, and never map a logo you are not sure of. A letter tile is better than a blurry or wrong logo.
   Pass the result as `--icons /tmp/story/icons.json` (`{"Connector name": "/tmp/story/logos/slack.png"}`, absolute paths or data URLs). collect.py fits each logo in 72 px without ever upscaling and writes it as a Page asset in section 3.

## 3. Build the Page

Fill the template. This also writes the connector logos as small PNG files for the Page:

```
python3 collect.py <same flags> --does /tmp/story/does.json [--icons /tmp/story/icons.json] \
  --tsx page-template.tsx --tsx-out /tmp/story/page.tsx --assets-dir /workspace/grok-bot-story/assets \
  --out /tmp/story/data.json
```

It prints a JSON manifest of asset names to file paths, for example `{"notion.png": "/workspace/grok-bot-story/assets/notion.png"}`, and saves the same manifest as `manifest.json` in that folder. WriteCanvasAsset only reads files under `/workspace`, `/home` or `/root`, so keep the assets folder there. In the Page each logo is referenced as `asset:<name>`. At most 20 logos become assets; any others show as letter tiles. An SVG logo stays inline in the Page, since Page assets must be PNG, JPEG, WebP or GIF.

Load the canvas skill first. Then, in this order:

1. Read `/tmp/story/page.tsx` and pass it to WriteCanvas in one call, unchanged, as a new Page titled "<Name> on Grok Bot". On a rebuild, pass the `canvas_id` of the existing Page instead, so the same Page is overwritten (section 5). The filled file is small enough for a single call; never split it into a stub plus edits.
2. Take the `canvas_id` WriteCanvas returned and call WriteCanvasAsset once for every manifest entry, with that `canvas_id`, `name` set to the manifest key exactly (for example `notion.png`) and `path` set to its file. On a rebuild, upload them again; the same names replace the old images.
3. Call ReadCanvas on the Page and check that it has no errors. A logo whose upload failed falls back to an empty box, so retry that one upload once; if it still fails, rebuild with that connector left out of `--icons` so it shows a letter tile.

Avatars and the archetype art are drawn from shapes in the template, not uploaded, so the share card's PNG export always includes them. The logos are not on the share card.

The template is the design. Every user's Page must look the same apart from their data:

- Use `page-template.tsx` exactly as `collect.py` filled it. Change nothing outside the DATA block: no restyling, no new or reordered steps, no new copy, no other colors or fonts.
- The result is always a Grok Bot Page made with WriteCanvas. Never write your own HTML, React app or slides for it, and never publish or host it as a website or app.
- If WriteCanvas rejects the filled file, fix only the DATA values that caused it (for example a broken logo, which you can drop from `--icons`) and try again. If it still fails, stop and tell the user what failed rather than rewriting the template.
- If the user asks for a different look, tell them this skill builds the standard story Page, and build that.

The steps, in order. A step with no data is dropped, never shown empty:

1. Meet <Name>: cover with the Grok Bot avatar, the crew orbiting it, and messages, bots, active days and day streak.
2. When <Name> works: hour of day chart, peak hour, busiest weekday, busiest week, and the fun fact (the biggest day and the bots that got most of it).
3. The crew: the top bots by messages, drawn as their avatar shape and color, each with your one-liner.
4. The toolkit: connectors ranked by use with sharp logos and counts, top 10 shown, then "+N more".
5. Beyond the chat: times a bot used its own computer, web pages its browser read, and tasks it ran on its own computer.
6. Your archetype: a short build-up of the user's biggest counts, then the reveal of their archetype and its drawn bot, plus a secondary archetype when one also matches (rules in data-contract.md).
7. Bots <Name> shipped: published bots with an Install link. Rendered only when published bots exist.
8. Share your story: a theme-aware share card with the archetype bot, up to 4 stats (bots, connectors, routines, day streak), the Grok Bot wordmark, and a "Right click on the card to download & copy" chip. An invisible PNG of the card in the current theme lies over it, so right-click saves or copies exactly what the viewer sees.

## 4. Data rules

- Only the user's own data, from their box, their Pages and their memory. Never another user's data and never warehouse or team data.
- No made-up or estimated numbers. If a value is missing, drop it or drop the step.
- No rank, percentile, "top X% of users", total user counts or token counts.
- The date range on the Page is the range the data actually covers. Never call it a year, a lifetime or "all time" unless it is.
- Routines count enabled ones; the set-up count is kept in the JSON but not shown.
- Bots with no avatar shape or color show as a gray blob.
- Don't put names of other people, emails, or private bot descriptions on the Page. Bot names are fine; the user can exclude any in onboarding.

## 5. After building

Send the link with one or two short lines and name their archetype. Tell them to right-click the card on the last step to save it as an image or copy it. Then offer once: "Want me to rebuild this on the 1st of each month?" Create that routine only if they say yes, and only then. Save the Page's `canvas_id` in the routine. Each run reruns sections 0, 2 and 3 with the same name and exclusions, in the zone the user is in at that time, rewrites the crew one-liners from that run's `notes`, and overwrites the same Page with WriteCanvas and that `canvas_id`. It never creates a second Page. If the Page was deleted, create a new one and save its new id.

## 6. Known limits

Say these only if they matter for the user's result:

- The box keeps a limited stretch of history, so the Page often covers weeks or a few months, not a full year. A full year needs product support (a stats API).
- Published bots come from memory and chat links; there is no list of them yet.
- Avatar photos aren't shown; bots appear as their shape and color.
- Some connector logos show as letters when no sharp logo can be found.
