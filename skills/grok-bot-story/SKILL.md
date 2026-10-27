---
name: grok-bot-story
description: Builds the user a personal "<Name> on Grok Bot" story Page from their own Grok Bot activity (messages, bots, hours, streaks, connectors, routines, shipped bots) with a shareable poster at the end. Use when the user asks for their Grok Bot story, recap, year in review, wrapped, stats about how they use Grok Bot, or a card they can share about their bots. Also use when a routine asks for a monthly rebuild of that Page.
license: MIT
compatibility: Needs a Grok Bot with Pages and Python 3.9 or newer on its box, plus network access to raw.githubusercontent.com when the helper files are not next to this file. The optional app-state step needs the user's registered Mac with the Grok Bot app.
---

# Grok Bot story

You build one Page that walks the user through their own Grok Bot activity in up to 8 steps and ends on a poster they can save or copy. Every number comes from the user's own data on the box. You never invent, round up, estimate or compare.

Helper files live next to this file, in the same folder. Run commands from there, or from the working folder in step 0 if you had to download them.

- [collect.py](collect.py): reads the box and writes one JSON file. Read-only, standard library only.
- [collect_app_state.py](collect_app_state.py): optional helper that runs on the user's Mac to pick up bot names, avatars and connector logos.
- [page-template.tsx](page-template.tsx): the Page. Only its DATA block changes per user.
- [data-contract.md](data-contract.md): what every field means and where it comes from.
- [onboarding.md](onboarding.md): an example of the whole conversation.

## 0. Get the helper files

If the helper files are not next to this file, which happens when the skill was installed from a bot template that only carries SKILL.md, download them into a working folder on the box and run every command from there:

```
mkdir -p /tmp/grok-bot-story && cd /tmp/grok-bot-story
base=https://raw.githubusercontent.com/ericzakariasson/skills/main/skills/grok-bot-story
curl -fsSL --remote-name-all "$base/collect.py" "$base/collect_app_state.py" "$base/page-template.tsx" "$base/data-contract.md" "$base/onboarding.md"
```

## 1. Onboarding (in chat, one widget at most)

Open with one short line, then ask a single short question widget with these two questions. Prefill every default so the user can just confirm.

1. **Name on the Page.** Default to the name from their profile or memory. Free text.
2. **Bots to leave out.** Multi-select of the user's bots by name, nothing selected by default. Use this for test bots or bots they don't want on a public card.

Don't ask anything else. For the time zone, use the zone the user is in now: the device zone, or the one in memory. Don't ask about it or offer a list. If the user skips the widget, use the defaults.

Before you build, say the date range you found in one line, for example "I found activity from Jul 29 to Sep 9, 2026, so the Page covers those 43 days." If the range is short, say so plainly.

## 2. Gather

Run everything on the box unless noted.

1. Pages count: call ListCanvases and count the user's Pages. Pass it as `--pages`. If the call fails, leave it out; the stat is dropped.
2. Shipped bots (optional): look for bots the user published, using RecallMemory and SearchTranscripts for `x.ai/bot/` links. Write what you find to a JSON file: `[{"name", "tag", "url", "date", "shape", "color"}]`, where `tag` is a 2 to 4 word role, `date` is like "Sep 2" and `shape`/`color` come from that bot's profile if it is one of theirs. If you find none, skip the file and the step is dropped. Never guess a published bot.
3. App state (optional, Mac only): if the user has a registered Mac and agrees, run `collect_app_state.py` there with Shell and machineId. First run it with no flags; it only lists what it would read. Show the user that list and ask before running it again with `--write`. Then CopyToBox the folder `~/Downloads/grok-bot-story-app-state` and pass it as `--app-state`. It never reads `sand-secrets.json`, cookies, tokens or anything credential-like, and it only writes to that one folder. Without it the Page still works; bot names come from the box and connector icons fall back to letters.
4. Run the collector:

```
python3 collect.py --tz <IANA zone> --name "<Name>" --pages <n> \
  [--exclude-bots "Bot A,Bot B"] [--app-state DIR] [--published FILE] \
  --out /tmp/story/data.json
```

5. Read the JSON. Check `window`, `totals` and `sources`. If `totals.messages` is 0, stop and tell the user there isn't enough history on the box yet.
6. Crew one-liners: the collector's `does` lines are rough fallbacks and are often empty. For each bot in `crew`, write a plain one-liner of at most 32 characters from that bot's description (what it does, not who it is, no names of people). Save them as `{"Bot name": "line"}` and pass `--does FILE` on the next run.
7. Connector icons: `sources.connectorIconsFound` tells you how many connectors got a real icon. If the app-state folder has a plugin logo cache, you can run `python3 collect.py --tz <IANA zone> --app-state DIR --dump-logos /tmp/story/logos` and open `contact-sheet.html` to match logos to connector names by eye, then pass them as `--icons FILE` (`{"Name": "/tmp/story/logos/logo-007.png"}`, absolute paths). Only map a logo you are sure of. A letter tile is better than a wrong logo.

## 3. Build the Page

Fill the template and write it:

```
python3 collect.py <same flags> --does FILE [--icons FILE] \
  --tsx page-template.tsx --tsx-out /tmp/story/page.tsx
```

Load the canvas skill first. Then read `/tmp/story/page.tsx` and pass it to WriteCanvas as a new Page titled "<Name> on Grok Bot". Don't edit anything below the DATA block. If you must change the template, keep these rules:

- Import only from `grok/canvas`.
- No literal colors anywhere except inside `data:image` URLs. Use theme tokens.
- No `for` loops. Use map, filter and reduce.
- Light mode, `width="column"`.
- No summary block and no per-step captions or explainer text.

The steps, in order. A step with no data is dropped, never shown empty:

1. Meet <Name>: cover.
2. The numbers: messages, bots, active days, streak, skills, Pages, routines.
3. When <Name> works: hour of day chart, best day, best weekday, best week, calendar.
4. The crew: top bots by messages, with their avatar shape and color.
5. The toolkit: top connectors by tool calls.
6. Beyond the chat: computer use sessions, browser pages, shell commands.
7. Bots <Name> shipped: published bots, only if found.
8. Share your story: the poster.

## 4. Data rules

- Only the user's own data, from their box, their Pages and their memory. Never another user's data and never warehouse or team data.
- No made-up or estimated numbers. If a value is missing, drop it or drop the step.
- No rank, percentile, "top X% of users", total user counts or token counts.
- The date range on the Page is the range the data actually covers. Never call it a year, a lifetime or "all time" unless it is.
- Routines count enabled ones; set-up count is kept in the JSON but not shown by default.
- Bots with no avatar shape or color show as a gray blob.
- Don't put names of other people, emails, or private bot descriptions on the Page. Bot names are fine; the user can exclude any in onboarding.

## 5. After building

Send the link with one or two short lines. Tell them to right-click the poster card on the last step to save it as an image or copy it. Then offer once: "Want me to rebuild this on the 1st of each month?" Create that routine only if they say yes, and only then; it reruns sections 0, 2 and 3 with the same name and exclusions, in the zone the user is in at that time, and overwrites the same Page.

## 6. Known limits

Say these only if they matter for the user's result:

- The box keeps a limited stretch of history, so the Page often covers weeks or a few months, not a full year. A full year needs product support (a stats API).
- Published bots come from memory and chat links; there is no list of them yet.
- Avatar photos aren't shown; bots appear as their shape and color.
- Some connector icons show as letters when no logo can be matched.
