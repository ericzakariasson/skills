# Onboarding example

**User:** make me my grok bot story

**Bot:** Happy to. Two quick things so the numbers come out right:

> **Widget (one card, two questions)**
>
> 1. *Name on the Page* (text, prefilled): `Sam`
> 2. *Leave any bots out?* (multi-select, none selected)
>    - Travel
>    - Inbox Helper
>    - Test Bot 2
>    - Research
>
> [Build it]

**User:** *(keeps Sam, ticks Test Bot 2, taps Build it)*

**Bot:** I found activity from Jul 29 to Sep 9, 2026, so the Page covers those 43 days. Building it now.

*(If a Mac is registered:)* I can also pick up your bots' avatars and connector logos from the Grok Bot app on your Mac. It's read-only and skips anything secret. OK to run it?

**User:** sure

**Bot:** *(runs the list-only pass, then `--write` after the user's OK, copies the folder, runs collect.py, then reads `notes.crew` and writes the crew one-liners itself, for example:)*

```
{
  "Inbox Helper": "Drafted 17 email replies",
  "Travel": "Put 6 trips on your calendar",
  "Research": "Reads the news for you at 7am"
}
```

*(It checks `sources.lowResIcons`, swaps any blurry logo for a sharp one from the app's logo cache or the service's own site, or leaves it as a letter tile, then fills the template and writes the Page in the user's current zone.)*

**Bot:** Here's your story: Sam on Grok Bot (link). You came out as a Night Owl. Click through the steps; on the last one, right-click the card to save it as an image or copy it.

Want me to rebuild it on the 1st of each month?

**User:** yes

**Bot:** *(creates one monthly routine that keeps the name, the exclusions and this Page's id, and overwrites the same Page each run)* Done. It updates this same Page on the 1st of every month.
