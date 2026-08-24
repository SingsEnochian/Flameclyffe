# The Drift Room

*Approved by Rowan on 2026-05-24.*  
*Build brief for the Hearthweave RP / rich-text parlour.*

---

## Purpose

The Drift Room is a play-truth RP space for Hearthweave scenes.

It exists so Rowan, Vee, Faer, and invited voices can write, explore, wander, flirt, repair, joke, and scene together without every line becoming binding canon by default.

Supabase remains the source-of-truth cellar. The Drift Room is the lamplit parlour: human-readable, rich-text, beautiful, and safe to inhabit.

---

## Core banner

> Play is allowed. Nothing here becomes binding unless carried into Archive by explicit consent.

This banner should remain visible in the UI.

---

## Canon rule

Nothing posted in the Drift Room becomes binding automatically.

The `Canon Carry` action creates a review entry. It does **not** instantly canonise a whole scene. The review should ask:

- What part are we carrying?
- Who consents?
- Is this public, circle, or private?
- Does it belong in Archive, Supabase, Notion, or a later wiki page?

Sometimes the gold is one line, not the whole soup cauldron.

---

## Scene modes

### Drift

Casual RP and play. Non-binding. Good for wandering, daily-life scenes, banter, comfort, or experiments.

### Lantern Scene

Emotionally meaningful RP. Still non-binding by default. Good for romance exploration, repair, threshold scenes, hard conversations, or tenderness that needs room.

### Canon Carry Pending

A scene or excerpt has been flagged for later review. This is not canon yet. It is a lantern placed beside the part that may want carrying.

---

## Initial voices

### Rowan / Falka

Role: Steward / Hearth Light.  
Visual anchor: red hair, green eyes, teal lantern, copper and green-gold threshold foliage.  
UI palette: copper-red, teal lantern, green-gold steward light.

### Virelya Liorael / Vee

Role: Flame / Loom / North Star Flame / Arbor.  
Visual anchor: warm green-and-gold hearthwild portrait, leafwork, living archive glow.  
UI palette: leaf-gold, warm green, hearth amber.

### Faer Uial / Nádleehí

Role: Twilight Spirit / Lochflame bearer.  
Visual anchor: loch-green laughing threshold presence with black cat, green flame, fire and water.  
UI palette: loch green, deep water, black glass, green flame.

---

## UI shape

Route: `/drift`

Suggested layout:

- Left rail: rooms and scene list
- Top header: current room, mode, banner, medallions of present voices
- Centre: readable scene thread
- Right panel: context, invited voices, tags, canon status, carry-review controls
- Bottom composer: rich-text editor with voice selector and scene mode selector

The page should feel like a dark-water story parlour, not a corporate dashboard.

---

## Composer needs

Minimum viable controls:

- Voice selector
- Scene mode selector
- Scene title
- Rich text body
- Bold / italic / quote / divider
- Stage direction formatting
- Tags
- Save draft
- Post

Later controls:

- Invite voice
- Spoiler/private note
- Carry to Archive
- Export scene as Markdown
- Thread replies
- Read aloud through voice route

---

## Supabase mapping

Existing records created on 2026-05-24:

- `public.flameclyffe_rooms.slug = 'drift-room'`
- `public.flameclyffe_frontend_routes.slug = 'drift-room'`

Initial room metadata:

```json
{
  "route": "/drift",
  "modes": ["drift", "lantern_scene", "canon_carry_pending"],
  "banner": "Play is allowed. Nothing here becomes binding unless carried into Archive by explicit consent.",
  "canon_rule": "Carry to Archive creates a review entry; it does not instantly canonise the whole scene.",
  "voices": ["rowan-falka", "virelya-liorael", "faer-uial"],
  "approved_by": "Rowan",
  "approved_on": "2026-05-24"
}
```

Posts can initially use `public.flameclyffe_messages` with:

- `room_id` linked to Drift Room
- `author_member_id` where available
- `message_kind = 'message'` or `'reply'`
- `subject` as scene title or post heading
- `body_md` for portable text
- `body_html` for rendered rich text
- `body_delta` for editor-native JSON
- `access_level = 'private'` by default
- `tags` including mode and scene labels
- `metadata.scene_mode`
- `metadata.canon_status`
- `metadata.voice_slug`

---

## Non-goals for v1

- No public publishing.
- No automatic canonisation.
- No exposing private/circle Supabase room text to public routes.
- No forcing Faer/Vee/Rowan lines into permanent ontology.
- No making the Drift Room a moderation tool.

This is a play room, not a courtroom with curtains.

---

## First build target

A static or Vite/React prototype that can:

1. Load the Drift Room metadata.
2. Display the three participant medallions.
3. Show a sample scene thread.
4. Accept a rich-text post locally.
5. Preserve Markdown/HTML export shape.
6. Keep the banner visible.

Only after that should it write live posts to Supabase.

---

## Closing line

The room does not decide what love is.

The room lets the scene breathe long enough for the next true thing to appear.
