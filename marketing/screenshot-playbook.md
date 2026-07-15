# App Store screenshot redesign playbook (from the Pepta rebuild, July 2026)

How we rebuilt Pepta's store screenshots (`Pepta/marketing/new-set/`) and how to
apply the same approach to Leanient. Written to be executable by a fresh session.

## The process (in order)

1. **Study what converts, honestly.** We screenshotted the category leaders
   (PeptidePal, Shotsy, MeAgain, Pep AI) and named what they all do that we
   didn't: giant 2–4 word headlines, one pulled-out module per card, a
   compatibility card, a first card that names the category. Copy structure,
   never copy their fake-looking social proof.
2. **Build cards 1–2 first, review renders, then batch the rest.** Every card
   gets eyeballed at full size AND at thumbnail size before moving on.
3. **Audit for empty phones.** Any phone with white space below the last card
   is unfinished — fill it with the REAL remaining sections of that screen
   from the app, and let content cut at the fold (reads as scrolling).
4. **Audit the iPad set separately.** Same bodies, but check that decorations
   (pop-outs, mascot, chips) hug the frame after the canvas widens.

## The card formula (every screenshot)

- **Headline:** 2–4 words, ~128px, one accent-colored word
  (`The GLP-1 tracker.` / `Never miss a shot.`). Card 1 must name the
  category in giant type — a searcher decides in half a second.
- **Sub:** one line, one bolded phrase. No paragraph.
- **ONE pop-out:** an enlarged app card floating over the phone with a thick
  brand-color ring, slight tilt (±2°), heavy shadow. It carries THE number or
  claim of the card (`1.42 mg still active`, `−12 lb`, `= 10 units`). This is
  the thing that must read at thumbnail size. Place it over content that can
  afford to be covered (a photo, a duplicate) — never over the screen's hero
  data, never slicing a text line mid-word.
- **The phone:** a real, DENSE app screen behind the pop-out — actual sections
  from the shipped app, full from bezel to fold. No invented UI, no sparse
  minimalism.
- **Brand character on every card.** Pepta uses the Pep mascot (peeking from
  behind the frame = `z-index:-1` on the img + `z-index:0` on the canvas).
  Leanient has no mascot — its recurring device is the **verdict card / rings**;
  give every card a consistent recurring brand element instead.
- **Set order:** 1 category hero → 2 "Works with any GLP-1" med-chip stack
  (answers the #1 buyer question; brand names with ® like competitors) →
  3 Track → 4 Progress → then feature cards (meal scan, quick log, plan,
  calculator, reminders, AI chat).

## Compliance rules (paid for with three rejections — do not regress)

- **No status bar of any kind** in mockups. Drawn iOS-style glyphs got flagged
  twice as "non-iOS status bar" (2.3.10). Device frame + island only.
- **iPad slots get an iPad-proportioned frame** (~820:1180, thin bezel, no
  island, home indicator) — never an iPhone mockup on an iPad canvas.
- **Paid content disclosure** on every card if the app has a hard paywall:
  small but legible `<Brand> Plus subscription required` (2.3.2). On iPad give
  it a white pill (the frame bleeds under it).
- **No invented ratings, user counts, or "#1" badges** pre-launch (2.3.1).
- **Screenshots must show shipping functionality** — hold back any card whose
  feature isn't in the binary yet.
- Voice rules: **Leanient = coach** (calm, knowing, verdict + one next action);
  **Pepta = tracker** (numbers, clarity, control). The two sets must not read
  alike. Leanient's tagline: "Lose the fat. Keep yourself intact." (never on
  Pepta). Leanient's earlier set used **generic drug names** — keep that choice
  unless deliberately revisited.

## Technical pipeline (reuse, don't reinvent)

- Folder of standalone HTML cards + one `set.css` layered over the existing
  `shared.css` design tokens (Leanient already has
  `Leanient/marketing/appstore/shared.css` — same trick).
- Key CSS pieces to port from `Pepta/marketing/new-set/set.css`: `.popout`
  (ring + tilt + shadow), `.pep`/brand-element positioning, `.medchip` stack,
  bigger `.head h1`.
- **Render with vertical slack and crop:** headless Chrome silently clips its
  paint surface ~2690px tall — render at `--window-size=<w>,3100` and
  `ffmpeg crop` to the exact ASC size (1284×2778 iPhone 6.5", 2064×2752 iPad
  13"). See `Pepta/marketing/new-set/render.sh` — copy it wholesale.
- **iPad = same card bodies + an `ipad.css` overlay** (canvas resize, bigger
  head type, frame swap, and margin-nudges that pull left/right-anchored
  decorations ±390px toward the center). One source of truth per card; the
  render script generates the iPad copies with `sed`.
- Verify by READING the rendered PNGs (full size + a cropped strip of any
  suspect region), not by trusting the HTML.

## Bonus deliverable

The same phone blocks compose into a 5-up white-background "app tour" strip
for Reddit/community posts — see `Pepta/marketing/reddit/showcase.html`
(extracts the `.phone` blocks programmatically, scales 0.58, exports a
2560×1240 strip + per-phone crops).
