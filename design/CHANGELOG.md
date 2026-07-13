# Leanient onboarding — design changelog

## 2026-07-12 — Onboarding v2: the conversion flow (`design/onboarding-v2.html`)

The hard-paywall funnel, AWAITING SIGN-OFF, 8 frames, linked in the hub.
Supersedes onboarding.html's flow feel (data collected is unchanged; feel
and order change). The psychological arc, PeptidePal-inspired typewriter
conversation adapted to the coach voice:
01 Hook: before asking anything, "You're not doing this alone" types
itself (implementation: per-character soft haptic tick, RN Haptics), then
1 in 8 + KFF citation + avatar row "+2,400 joined this week". Belonging
before questions. 02 Conversation: questions type themselves, previous
lines dim like dialogue; "No judgment here" under sensitive asks; answer
chips. 03 Belonging beat: every answer met before the next ask (4.1M on
semaglutide, IQVIA cite; their private symptoms named as normal and
plannable). 04 Stakes + fix in one breath: the up-to-39% muscle stat with
Lancet citation, reassurance in the same screen ("it's preventable...
people who plan for it keep what's theirs"), urgency without decel fear.
05 Crafting: their answers visibly become their plan (shot Saturdays,
120g, strong days, defense days) + credibility line "built on 40+
clinical sources, cited in-app". 06 Reveal, the lights come on: dark
conversation transitions to the paper app, goal-path graph drawn to THEIR
date, plan chips, coach promise. 07 Hard paywall (NO skip): value stack =
the app they watched get built, pricing matches the SHIPPED
PaywallScreen.tsx tiers exactly (annual $29.99/yr · "just $2.50/mo" ·
SAVE 69% badge; monthly $7.99 · billed monthly; footnote "Billed $29.99
yearly · cancel anytime"), peer testimonial (Martha · 58 · Zepbound).
Mock pricing was initially invented at $59.99 and corrected after
Nickson's review: always pull tiers from PaywallScreen.tsx /
subscriptionMetrics.ts (ANNUAL const), source of truth is RevenueCat.
Med chips on frame 02 corrected the same way: the full shipped catalog
(medicationSeed.service.ts) is semaglutide (Ozempic, Wegovy), tirzepatide
(Mounjaro, Zepbound), liraglutide (Saxenda, Victoza) + Other; the mock
now shows all six brands + Compounded + Something else (8 chips).
Compounded maps to the semaglutide/tirzepatide generic at protocol
creation; "Something else" maps to the catalog's "other" slug.
Full question set added (after gap analysis vs the shipped flow): the
board is now the COMPLETE 17-frame funnel. Order: 01 hook → 02 journey
stage (routes: "still considering" skips dose/shot-day) → 03 med →
04 dose + start date (two chip groups) → 05 shot day (day picker, "your
whole plan beats to it") → 06 belonging beat → 07 feeling/side-effects
multi-select ("a question only people like us ask... this stays between
us") → 08 the fear (dim line first meets their symptoms: "all normal,
all plannable") → 09 the truth as a RESPONSE to their named fear →
10 basics (sex/age/height/weight chips + the why) → 11 goal weight (big
number + slider, "the keeping-your-muscle way") → 12 pace (three cards,
steady pre-selected with their landing date; ambitious warns gently) →
13 training ("Last one. Be honest." + equipment chips; not-yet framed as
the perfect start) → 14 crafting → 15 reveal → 16 hard paywall →
17 review ask. Dim-line handoffs chain the conversation ("Wegovy. Got
it." → "1.0 mg, a few weeks in." → "Saturdays. Locked in."). Every
shipped onboarding question is now represented; nothing was dropped.

THE CONVERSATION RULES added (after Nickson's note that chip screens
must still feel like the app is texting them). Documented in the board
intro + frame 3b: 1. nothing pre-rendered (dim line types, then question
with haptic ticks, then chips stagger in one by one); 2. answers are
spoken (tap dissolves the other chips, the pick glides up as a SENT
MESSAGE bubble); 3. the coach types back (three-dot bubble → the
acknowledgment line); 4. single-select auto-advances after the
acknowledgment beat, Continue only for multi-select and sliders;
5. haptics grammar (tick per character, warm tap on select, thump on
acknowledgment); 6. acknowledgments respond instantly, next questions
take a thinking beat. Frame 3b mocks the mid-state: dimmed question,
emerald sent-bubble "Wegovy" (iMessage corner), coach typing dots.
This beat runs between EVERY question; it is the difference between
texting and a form.

Social-proof copy rule (after Nickson's review): never invent user
counts. "+2,400 joined this week" removed from frames 01 and 08; the
avatar bubbles stay but the caption is market truth: "15 million+ right
now" (KFF: ~6% of US adults currently on a GLP-1, same source as the
1-in-8 stat above it). Once real install numbers are meaningful, they
can replace the market stat, sourced from analytics, never made up. 08 Post-purchase
review ask at peak excitement, BEFORE the app opens: five stars, a recent
review mirroring their fear, and the frame "help the next person, the one
still searching Facebook groups at midnight", then Rate Leanient →
SKStoreReviewController. Numbers/citations in the mock are placeholders;
verify against docs/glp1-clinical-reference.md before shipping.

## 2026-07-12 — Settings redesign board (`design/settings.html`)

Coach-pivot settings, AWAITING SIGN-OFF, 3 frames, linked in the hub.
Reframe: admin list → control room. Frame 01, the hub: identity header
with journey chips (streak sprout, Day 50 · Wegovy, ↓14 lb, avatar edit
badge), then five groups. YOUR PLAN makes every onboarding choice editable
(Medication + schedule, Goal 185 by Jan 17, Daily targets, Photo day).
YOUR COACH is new: Coach style (Gentle), Check-in day, Reminders
(cycle-aware), Doctor report (NEW chip). PREFERENCES: Units, Apple Health,
Widgets (streak/plan on home screen). PRIVACY & DATA: privacy, Export my
data, Face analysis (Off). ACCOUNT: account, subscription, sign out.
Row anatomy = shipped SettingGroup (icon tile, label+sub, value, chevron).
COMMUNITY group added after feedback (right after YOUR COACH, before
PREFERENCES): glabel "COMMUNITY · JOIN OUR CHANNELS" with two rows,
Discord ("Daily wins, questions, the team" · Join) and WhatsApp
("Announcements and tips" · Join), each with the brand mark on a
brand-tinted icon tile (indigo #EEF0FE / green #E7F8EC), the only
non-palette colors in the app, reserved for external brands. Rationale:
the market lives in communities (the original Reddit research), so the
app hands users one of its own instead of losing them to Facebook groups.

PERMISSIONS group added after feedback (between PRIVACY & DATA and
ACCOUNT): Notifications ("Reminders and your Sunday verdict" · Allowed),
Camera ("Meal scan, barcodes, progress photos" · Allowed), Photo library
("Saving your progress photos" · Ask). Status chips read Allowed
(emerald) / Ask (muted); each row explains WHY the permission is needed,
and tapping deep-links to iOS Settings. If a permission that a feature
needs is off, the feature's own screen should surface the same row inline
(e.g. reminders screen shows the Notifications row when denied).
Frame 02, Doctor report: six weeks of logs as one prescriber-ready page
(weight 226→212, pace in safe band, muscle 84 trending up, 6/6 doses with
site rotation, protein 34/42 days, 11 sessions, side-effect pattern
"nausea ×3 mild day 1-2"), Share PDF button; disclaimer footer
("self-tracked summary"). Frame 03, Your coach: voice picker as two
preview cards (Gentle vs Straight, same plan either way, sample line in
each) + cycle-aware reminder toggles (shot morning, guard-day evening,
Sunday check-in, photo day) + quiet hours row.

## 2026-07-12 — Where achievements live (placement model)

Answer to "where do users see achievements without cluttering the main
screens": the standing footprint is ONLY the app-bar streak chip (tap →
Your streak screen, frame 10). Everything else is either a moment (frame
09 day-won sheet, badge unlocks riding it or the Sunday verdict reveal:
zero standing pixels) or reuse of surfaces that already existed (plan
footer week dots, 5-OF-LAST-7 chip, morning pill). The medal gallery
belongs to Progress: the existing milestones row gained a "MILESTONES ·
4 MEDALS / All medals ›" header linking to the full grid (progress.html
frame 02). No new sections were added to any main screen.

## 2026-07-12 — Streak + achievements (frames 09-10, Duolingo made kind)

The streak system, adapted for the coach voice and an older audience.
Mechanics: winning the day (plan complete) grows a day streak; a weekly
"steady pass" auto-covers one missed day ("Streaks bend, they don't
break"), and shot days are won lightly by design, so the streak never
punishes the medical journey. Ubiquity: a sprout streak chip
(rgba-emerald pill, sprout icon + count) sits in EVERY app bar (added to
the shared appbar() so all Home frames carry it, plus the Progress
header); tapping opens the achievements screen. Frame 09, the day-won
sheet: sprout medal, "Day won.", 12 days steady, week dots, next-badge
strip (Two steady weeks · 2 more days), coach line naming the hard part
("Day 5 was the hard one, and you took it. Rhythm, not perfection.").
Frame 10, Your streak: streak hero + "longest yet" / "1 pass left" chips,
dignified medal grid tied to real journey feats (First shot logged,
10 lb down, 4 weeks steady, Muscle kept · first verdict) with locked
medals showing exact progress bars (Two steady weeks 12/14, Photo month
3/4), and the steady-pass explainer row. No confetti, no mascot pressure:
recognition from the coach, not gamification noise.

## 2026-07-12 — Photo day: where progress photos get taken

Decision (home-coach.html frames 02/03): progress photos are CAPTURED on
Home, on one fixed day per cycle ("photo day" = shot day, the weekly
ritual), as an optional dashed card BELOW the plan footer: "PHOTO DAY ·
OPTIONAL / Week 7 photo / same mirror, same light / 20 seconds" with last
week's thumbnail for continuity and a chevron into the camera. It never
counts against the plan's N-of-N, and on the other six days it does not
appear at all. Cycle-anchoring keeps photos comparable (same day-of-cycle,
weekly spacing) and the Progress screen's photo timeline clean. Frame 03's
"Week 6 photo" plan card is replaced by a "Morning weigh-in" micro (day 2
reads truest); photos no longer appear inside the checklist. Implementation
note: capture flow should overlay a ghost of last week's photo for
alignment (progress-photo infra already exists).

## 2026-07-12 — Progress redesign board (`design/progress.html`)

Coach-pivot Progress screen, AWAITING SIGN-OFF, 3 frames, linked in the hub.
Charts restyled for the React Native graph kit direction (Skia smooth
monotone curves, gradient area fills, scrub cursor when implemented; exact
package to confirm with Nickson, likely react-native-graph). Frame 01: the
two graphs. Weight = the smoothed WEEKLY trend line with raw daily points
demoted to faint dots ("The line is your weekly trend. The faint dots are
daily noise, ignore them."). Goal path = actual line vs the dashed plan line
derived from onboarding goal weight + pace (projectedPath.ts already
computes this): TODAY marker, amber goal flag, "your pace · Jan 5" vs
"plan · Jan 17", headline chip "12 days ahead", never a judgment. Frame 02:
what your logging built: 30-day consistency heat (26 of 30) with meal/
session/check-in count chips, muscle retention trend (78→84), milestone
cards (First 10 lb, the check-in NSV, best protein week), photo timeline.
Frame 03 (day 4): the more-you-log mechanic: two weigh-ins already draw a
direction toward a ghosted "where you're headed" line, and locked reads
(Goal path, Muscle trend) name exactly which log unlocks them, with
progress dots. Reassurance rules applied throughout: no red, downward
weight drawn as calm emerald, behind-plan states would use amber + a next
step (never shown as failure).

## 2026-07-12 — Coach everywhere: voice guide + ask-anything chat

`design/coach-voice.html` (linked from the hub): the six voice rules for
EVERY string in the app (1 reassure first, 2 their data beats general
truths, 3 committed/the coach stays, 4 steady even when news is bad,
5 every dead end still coaches, 6 every question has a home) + before/after
rewrites of real surfaces (empty home, save error, day-5 push, bad-week
verdict, stall, check-in, paywall, loading, missed shot) + the NEVER list
(fear, shame, exclamation marks, emojis, system voice...). Scope when
implemented: all RN strings + coachContent.service.ts templates +
notifications. Clinical boundaries stay per COACH_CHAT_SYSTEM_PROMPT.

Frame 08 on home-coach.html (ask-anything chat, exact CoachChatScreen
anatomy): coach opens with today's context ("Day 5 tonight, Nick. Hunger
may knock. Ask me anything, I've got you"), answer models the voice
(normalize, then their data, then one emerald-bold action), and the
suggestion chips are REAL community phrasings under "PEOPLE ON YOUR MED
ASK": scale jump overnight, nothing sounds good, miss a shot, "Ozempic
face". Positioning: the app answers what people currently beg Facebook
groups for. Chips rotate with cycle day.

Running log of changes made in the HTML prototype (`design/onboarding.html`)
so they can be re-applied to the Paper file when its quota resets.

## 2026-07-12 — Design hub (`design/index.html`)

Single entry point for every board, served at the folder root so
`localhost:4321/` lists everything: Coach Home v2 (AWAITING SIGN-OFF),
store screenshots v2 + watch (AWAITING FEEDBACK), execution redesign
(IMPLEMENTED), onboarding (REFERENCE), app.html design lab (STALE · DO NOT
PORT). New boards must be added here with a status chip.

## 2026-07-12 — Coach Home v2: fewer words, tap-cards (`design/home-coach.html`)

REBUILT after feedback (older audience: less reading, more visuals). The plan
drops the expandable PlanTimeline for flat tap-cards, one per action: 44px
icon tile, 3-4 word extrabold title, chips instead of sub-sentences, and one
visual on the right (mini progress ring for protein/water, play button for
sessions, chevron otherwise). Focus card gets an emerald border; done cards
compress to a sage strip with line-through. Plan footer is a progress bar +
"1 OF 4" + week dots, no payoff sentence. Morning read shrinks to greeting +
one stat pill (no paragraph). Cycle hero loses both paragraphs: pill + 4-word
headline + ribbon + one-line pattern. Week hero replaces the wordy verdict
card with the RetentionHero gauge (84/100) + one-word status + delta chip +
three lever bars; NEXT WEEK directive is seven words. Week map caption cut to
one line; NSV sub to three words. Coach card reduced to a one-line ask strip.
v1 (timeline + prose) is superseded; same four frames, AWAITING SIGN-OFF.

Frame 05 added (card-tap behavior): tapping the protein card opens a one-tap
log sheet (QuickLogSheet chrome): the user's three meals as big rows with a
plus button (tap = logged, sheet closes), Scan a meal as the primary action,
"Type it instead" as the escape hatch. Interaction taxonomy for all plan
cards, "the tap never asks a question the card didn't already show":
(a) instant tick with undo for micro-actions (walk; water increments on the
card), (b) one-tap-choice sheet for logs (protein, shot), (c) full-screen
player for workouts. No inline expansion anywhere.

Frame 06 added (instant-tick state): the walk card just ticked. Card
compresses to the done strip ("just now" chip), plan footer advances to
2 OF 4 / 50% bar, and an ink glass toast floats above the tab bar:
emerald check dot + "Walk done. Two left today." + an Undo pill
(emerald-hi on ink). No sheet, no navigation for zero-decision actions.

Frame 07 added (below the fold): the scrolled Today order is sticky plan
chip (glass strip: TODAY'S PLAN + progress bar + 2 OF 4) → rings → the
coach's one-line ask strip ("Hunger tonight is normal") → QuickActionRow
shortcuts → the For-today shelf → the glass dose row → tab bar. The shelf
is the library-vs-history decision: 1-2 library reads picked by cycle day
(illustrated cards, read-time chips, "matches today"), full library on its
own screen via "Library ›". History was rejected for Home: the plan's done
strips + rings already show today, deep history belongs to Progress. The
standalone LOGGED TODAY list is retired.

Shot-day emphasis (Nickson: shot days are what users watch for). The cycle
ribbon's shot-day node now carries a small syringe badge (amber on cream,
16px, top-right corner) in every frame, so the shot is always locatable in
the mini calendar. Shot day's plan grew from 3 to 4 cards: the day still
includes eating, water, AND movement — Log your shot (primary), Water 2L,
Easy protein 90g (flexed target), Mobility 15 min ("gentle" / "still
counts"). Footer 0 OF 4. The reset-day framing stays: shot = day won, the
rest is bonus.

Coach's read upgraded (Nickson: keep the shipped CoachInsightCard look, make
the read better). The full card (COACH'S READ / FROM YOUR COACH header,
headline, body, Ask your coach) replaces the slimmed ask strip in frames 02
and 07. Copy recipe for the generated read: headline = a personal claim
pulled from THEIR data ("You've beaten day 5 before", "Six shots in, never
missed"), body = one reassurance ("tonight's hunger is the meds fading, and
it's normal") + one concrete action (emerald-bold: "protein by 2pm"), 25
words max, never generic. When implemented, this read should come from the
coachContent pipeline with cycle-day + pattern + streak context, replacing
the static buildDailyInsight templates.

## 2026-07-11 — Coach Home redesign board (`design/home-coach.html`)

Board for the coach pivot (reassurance-first, "the coach reads your day before
you do"), AWAITING SIGN-OFF (no app code yet). Built on the shipped RN
StyleSheets, same 1:1 porting rule as execution.html. Four frames:
01 Defense day (shot +5): morning read opens with yesterday's win, cycle hero
card with the 7-node med-level ribbon + YOUR PATTERN line ("day 5 is where
protein slipped"), plan card gets a day personality (DEFENSE DAY), the EAT
panel suggests the user's OWN logged meals ("from your own playbook"), amber
after-dinner-walk guard-rail step. 02 Reset day (shot day): shot as ritual,
site rotation remembered, water step, protein target flexes to 90g, "won
lightly" payoff. 03 Green light day (shot +2): strongest-window framing, big
protein + best lift slot per their logs, week-6 photo as the fresh third step.
04 This week: recap leads with what held, NEXT WEEK names the two guard days,
new week-on-cycle map (SHOT/EASY/MID/GUARD phases per weekday), NSV card
quoting the check-in win ("The 2019 jeans buttoned"), rings + glass dose row.
New components (still in the shipped design language): morning read header,
cycle ribbon (curve + nodes), YOUR PATTERN row, week map, NSV card. Everything
else is the existing VerdictCard/TodayPlanCard/PlanTimeline/MetricRing/
CoachInsightCard/TabBar anatomy. Copy follows the writing rules (no em dashes,
no fear framing, reassurance-first).

## 2026-07-05 — App Store screenshot set v2 (`design/store-screenshots.html`)

Seven panels at 1290×2796 for the execution-model release, Pep-AI formula:
two-line headline with one emerald word, one subhead, a repeating three-leaf
sprout-tick motif (our sparkle), one feature per angled device, floating
callout chips, consistent mint/deep washes. Device UI is ported 1:1 from the
implemented execution screens (directive hero, days-hit tiles, checkable plan,
LAST 7 DAYS strip, verdict report card). The vial logo-mark plays the mascot
on panels 1 and 7. Panels: 1 hook (Lose the fat / KEEP the muscle), 2 daily
plan, 3 protein consistency (are you HITTING it), 4 shot-cycle training,
5 verdict report card, 6 works with ANY GLP-1 (generic drug names only —
fixes the live set's trademark exposure), 7 reviews + 4.8 badge.
Export: open with `#p1`..`#p8` for a single unscaled panel and screenshot at
1290×2796 headlessly (same pipeline as `marketing/appstore/render.sh`).
`#p1i`..`#p8i` renders the iPad 13" variant (2064×2752, same recentering trick
as ipad.css). Panel 8 (added later): coach chat, "A coach that knows YOUR
week", bubbles/chips ported 1:1 from CoachChatScreen.tsx, answers grounded in
the user's own numbers. Watch set v2 lives in `design/store-screenshots-watch.html`
(5 execution faces at 410×502, `#w1`..`#w5` export, watch.css language).
Rendered PNGs in `design/store-screenshots-png/`: masters, `upload/`
(1284×2778), `1242x2688/`, `ipad/` (2064×2752), `watch/` (410×502), plus
`old-set/` re-renders of the kept legacy slides (03 meal scan, 06 workout,
09 science) at both accepted iPhone sizes.
AWAITING FEEDBACK; the live `marketing/appstore/` set is untouched.

## 2026-07-04 — Execution redesign board (`design/execution.html`)

Board for the teacher-to-execution-engine shift, AWAITING SIGN-OFF (no app
code yet). REBUILT after feedback ("build on what exists"): every element is
now a faithful HTML port of a shipped RN component's StyleSheet, with only
arrangement and copy changed. Ported 1:1: VerdictCard (compact variant, halo,
pill, 23px head), MetricRing/InfoTile tiles (46px ring, badge pill),
TodayPlanCard + PlanTimeline (34px squircle nodes, 2px rail, line-through done
rows, TODAY'S FOCUS eyebrow, 64% trailing, chevron pill, EatPanel suggestions
+ Scan a meal), CoachInsightCard (spark dot, FROM YOUR COACH), QuickActionRow,
glass dose row, QuickLogSheet chrome for the sheet, and the real 5-slot TabBar
(Home Train + Progress Profile). Three screens:

1. **Home · Today, rearranged.** Compact verdict hero becomes a directive
   (badge carries the shot-cycle why, one action line). Protein tile leads
   with days hit (5/7) using the existing badge pill for today's grams.
   Sessions co-equal. Plan card's payoff footer becomes the streak + "counts
   toward Sunday" line with week dots. Retention gauge moves off Today
   (lives on This week). Coach card body trimmed to a directive.
2. **Today's plan sheet.** Existing sheet chrome + PlanTimeline with the EAT
   stop expanded, plus a new THIS WEEK day strip (node/check language at day
   scale) and the streak footer.
3. **This week.** The existing fused verdictHero block (VerdictCard bare +
   divider + VerdictBreakdownCard bare); breakdown comps become execution
   stats (5/7 protein days, 2/3 sessions, 1.3 lb pace) + a NEXT WEEK
   directive row. Prose reduced to what happened and what to do.

New pieces (only 3): streak chip (from the badge-pill language), week
dots/strip (from the node/check language), NEXT WEEK directive row (from the
soft-emerald panel language).

## 2026-05-29 — "Living Sage" liquid-glass direction

Goal: make the flow feel alive / warm / dimensional (closer to GLP-1 incumbents
like MeAgain) WITHOUT adopting their purple or losing the calm, clinical-but-warm
brand. Sage stays the anchor; one luminous multi-hue moment per hero screen.

**New tokens**

- Alpine-meadow trio (the "alive" gradient): mint `#8FD29A`, glacier sky `#86BBD8`, bloom peach `#F0B088` / `#E48F6A`.
- Liquid-glass surface tokens: translucent white `rgba(255,255,255,.52)`, bright edge line `rgba(255,255,255,.75)`, layered glass shadow.

**Global system (lifts every screen)**

1. Ground: flat bone → soft gradient-mesh (sage + sky + peach radial blooms over `#F4F6EF`).
2. Option rows: glass (translucent + backdrop-blur + bright top highlight + soft shadow); hover lift.
3. Selected option / segment / persona: glossy forest **gradient** (`#56795A→#3E5E41→#33502F`) with specular highlight + colored drop shadow.
4. Multi-select tick badge: white with green glow.
5. Primary CTA: glossy dark-forest gradient, inset highlight, soft green-tinted shadow, slow animated sheen sweep.
6. Wheels: glass with inner shadow; highlight band → mint→sage gradient with glow.
7. Unit toggle: inset glass track, white selected pill with shadow.
8. Slider: thicker track w/ inner shadow; fill → mint→keep→forest gradient with glow; handle → pearl radial with green ring + shadow.
9. Coaching pill: mint→sage glass gradient.

**Hero screens (special build)**

- Screen 11 (Crafting): ring stroke → mint→sky→peach gradient, 16px, drop-shadow glow, gentle float; soft pulsing aurora behind. Steps → glass cards with dimensional "clay" icon chips (mint droplet / sky dumbbell / peach calendar / sage flag), staggered rise, check badges with glow, spinner on active.
- Screen 1 (Welcome): logo → gradient leaf with highlight + float; meadow aurora (mint+sky glow top-right, peach glow bottom-left).

## 2026-05-29 — green rebalance ("too green / herb-app" feedback)

Demoted green from a surface color to a true accent.

- Neutralized all greenish grays, ink, and lines → warm-neutral charcoal/gray.
- Ground: dropped the sage bloom; now neutral paper `#F4F3EF` with faint sky + peach only.
- Selected option / segment / persona: green gradient → **graphite/charcoal** gradient.
- Progress bar fill + slider handle ring: green → graphite.
- Slider fill: green → **sky-blue** gradient.
- Wheel highlight band & coaching pill: green tint → **sky** tint.
- Loading clay chips: were 2× green → now amber / sky / teal / one green.
- Accent text (helpers, eyebrows): green → neutral muted.
- Welcome aurora: mint-dominant → sky + peach.
- **Green retained only as accent**: selection checkmarks, the "+71% muscle retained" number, the ring's mint stop, the leaf logo, active spinner.

## 2026-05-29 — cohesive color pass ("colors messed up / dirty button")

Consolidated to ONE cohesive family. Fixed the muddy charcoal button.

- **System:** clean warm paper neutrals + ONE primary deep evergreen + emerald success + a single warm honey. No more scattered sky/teal/amber, no graphite.
- Tokens: `--forest #21513D` (primary evergreen), `--forest-hi #2E6249`, `--keep #3DA06B` (emerald success), `--honey #E3A65E`. Neutrals cleaned (`--ink #17191B`, paper `#F3F2ED`).
- Buttons + selected (option/segment/persona): muddy charcoal → glossy **deep evergreen** gradient.
- Progress, slider fill, slider handle ring: → evergreen / emerald (was sky/graphite).
- Wheel band + coaching pill: → faint emerald tint (was sky).
- Loading clay chips: → emerald / pine / honey / light-emerald (in-family).
- Ring gradient: → emerald-hi → emerald → honey (one warm kiss).
- Welcome aurora: → emerald + honey. Leaf logo + checks + stars + "+71%": emerald family.
- Green is the brand/action color again, but on CLEAN neutrals (not green-tinted) and as a deep evergreen (not herbal sage), so it reads premium, not "plant app."

## 2026-05-29 — added splash / launch screen

New screen 01 (before Welcome). The one full-brand moment:

- Full-bleed deep evergreen gradient ground, white status bar.
- Glowing dimensional leaf mark (float animation) + "Leanient" wordmark + "Keep yourself intact." tagline.
- Emerald+honey aura glow behind logo; faint grain; 3-dot pulsing loader at bottom.
- Flow is now 13 screens total (splash + 12 onboarding).

## 2026-05-29 — syringe logo + green demoted to accent

"Still too green / plant app" + logo should reference a syringe.

- **New logo mark** (`logoMark()` SVG): injection pen — barrel + 3 dose graduation ticks low on the body + needle hub + needle. Replaces the leaf everywhere (splash, welcome, toolbar). Emerald gradient + glow.
- **Splash ground:** evergreen → premium near-black ink; green now only in the glowing logo.
- **Primary CTA + selected rows/segments/personas:** evergreen → clean premium **ink/near-black** (matches GLP-1 incumbents' black CTAs; fixes the earlier "dirty" muddy-green charcoal by being a true neutral).
- **Progress bar:** → brighter **emerald** so the remaining green clearly reads as accent.
- **Green now appears only as accent:** logo, selection checkmarks, progress bar, ring gradient, slider fill, "+71%" payoff. Dominant palette = neutral paper + ink.

## 2026-05-29 — bright "game" green (from Lawnstack mark ref)

Direction: keep green but make it a light/vibrant emerald (energetic/game), drop the dark ink (read as "dark blue / weird").

- Brand green repointed: `--forest-hi #4ECF8B` (bright top), `--forest #239E64` (deep stop), `--keep #2FB87A` (accent), `--emerald-hi #6FE0A6`.
- **Splash:** dark ink → vibrant emerald gradient ground (`#46CF8B→#178E57`), WHITE logo + text + soft white glow.
- **CTA + selected rows/segments/personas:** ink → bright emerald gradient, white text/checks.
- Progress, slider, ring, chips, "+71%", aura: all up to the brighter emerald family (honey kept as the one warm note).
- `logoMark()` gained a white variant for use on the green splash.
- Net: vibrant/energetic green reads fitness/game, not herbal (sage) and not dark (ink).

## 2026-05-29 — splash v2: less green + GLP-1 bottles

- Splash ground: saturated emerald → **light mint** gradient (`#F4FAF6→#D4EBDE`); dark status bar; wordmark in ink, tagline muted.
- Added hero **GLP-1 illustration**: medicine vial (cap, label, emerald liquid) + **syringe** (plunger, thumb rest, finger flange, graduation marks, green medication, needle hub + needle). White glass bodies, emerald accents, soft shadow + float. (Replaced an earlier pen that read as a pregnancy test.)
- Soft emerald aura glow behind the illustration; emerald loader dots.
- Rest of flow unchanged (bright emerald accents on light/paper screens).

## 2026-05-29 — paywall refactor + locked pricing

- Plan card: dark ink → **light gray** gradient card with green accents (emerald dots, dark text). "+71% muscle retained" row highlighted in a green-tinted panel with deep-emerald value.
- **Locked pricing** as two selectable plans: **Annual $29.99/yr** (default, "SAVE 69%" badge, ≈ $2.50/mo) + **Monthly $7.99/mo**. Plans are tap-selectable.
- CTA: "Start my 7-day free trial"; note "7 days free, then $29.99/yr · cancel anytime"; "Not now" escape. Removed old "$10/mo · $60/yr · lifetime" copy.
- Social proof trimmed to stars + "4.8 ★ · Used by 40,000+ people on GLP-1".

## 2026-05-29 — in-app screens (design/app.html)

New file `app.html` (reuses onboarding tokens: paper ground, glass, bright emerald, Geist, ink text). Three phones:

- **Home (verdict-led):** slim header (wordmark + This week/Today toggle + avatar; no medical iconography). Verdict card is the hero (~largest element): context line, status pill, big headline, one-sentence reasoning, single action button + state-tinted halo. Evidence rings row (Protein 412/840g, Training 2/3, Weight ↓1.2) ~⅓ the card size + "Why this verdict?" link. One-item Today's Focus card. Demoted slim dose row. Body snapshot row (photo/weight/measurements). Tab bar: Home · Train · raised "+" · Profile.
- **Center "+" quick-log:** dimmed home + bottom sheet, 7 one-tap log types (Meal, Workout, Dose, Weight, Measurement, Progress photo, Side effect).
- **Verdict states board:** on track (emerald), drifting (amber), needs-a-reset (calm slate — never red), first-week empty (coaching, not apologizing).
- Honored cuts: no streaks, no mg readout, no injection-site diagram, no water widget, no AI bubble, no goal-weight bar.

## 2026-05-29 — in-app screens + balanced tab bar

- Merged the in-app screens into `onboarding.html` so the whole product is one scrollable page: 13 onboarding + 3 app (Home, center-"+" quick-log, verdict-states board), shown in the grid and walkable in the flow.
- **Home** built to spec: verdict card is the hero (calm tones — emerald/amber/slate, never red), demoted evidence rings + "Why this verdict?", single Today's Focus, slim demoted medication row, merged body snapshot, coaching empty states.
- **Tab bar rebalanced**: was Home·Train·+·Profile (lopsided). Added a 4th destination → **Home · Train · ⊕ · Progress · Profile** (two tabs each side of the raised emerald plus). Progress = the longitudinal view (verdict history, weight trend, photo timeline) that the Home body-snapshot taps into; Home stays "this week."

## 2026-05-29 — app screens sized to phone height

- Home (14) & states (16) were `height:auto` (super tall). Now all three app screens are fixed 844px phones, consistent with onboarding.
- Home: content lives in an absolute scroll layer (so the fixed-height flex column no longer squashes the cards); tab bar pinned absolute at the bottom; med row + body snapshot scroll below the fold (per spec).
- Quick-log (15): fixed the floating modal — device now wraps the screen (auto height) so the sheet sits flush at the bottom edge with matching rounded corners.
- Verdict states (16): reflowed from a tall single column into a compact 2×2 board (mini verdict cards, no buttons) that fits one screen.

## 2026-05-29 — Train / Progress / Profile tabs

Built the other three tab destinations (page now 19 phones). `navbar(active)` highlights the current tab; `appScreen()` wraps content + pinned tab bar at 844px.
- **Train**: shot-day-aware "Today" hero (Upper body · 22 min, muscle tags, Start workout), "2 of 3 sessions this week", workout library cards (gradient thumbnails, duration/equipment/intensity), incl. a gentle shot-day mobility option.
- **Progress**: muscle-retention trend (line + dots colored by weekly verdict state), weight trend (198→184→172 goal), progress-photo timeline with coaching "Add" tile.
- **Profile**: avatar + name + INTACT MEMBER badge; grouped settings — Account, Subscription ($29.99/yr), Medication & schedule (Wegovy · Sun); Preferences (Reminders, Units, Apple Health); Support (Privacy, Help, Sign out).

## 2026-05-29 — AI coach surfaces (3 of 5 behaviors)

Mapped AI behaviors to surfaces + designed the top 3. Shared "LEANIENT COACH" voice mark (emerald spark dot) flags AI-written copy for transparency. Page now 22 phones.
- **#1 Verdict Explanation** — sheet from Home's "Why this verdict?": coach mark + AI prose conditioned on the user's stated fear (Ozempic face) and their data, then the DETERMINISTIC factor breakdown (Protein 92%, Training 2/3, Pace) + engine-version note. Shows the architecture: reproducible score, AI prose on top.
- **#2 Meal scan w/ personality** — opens from Log → Meal: photo + AI macros (protein highlighted), coach callout ("only 11% of target… want a swap to 25g?"), swap suggestion (+17g). The log-modal → AI connection.
- **#3 Why am I stalling** — opens from a Progress entry card ("Stuck 18 days? Ask the coach why"): "You're not broken — your inputs slipped," data narrative, reassurance the drug still works, one fix, non-medical disclaimer.
- Not built (per spec): general chat coach, AI-generated workouts. Deferred w/ careful framing: #4 side-effect patterns, #5 shot-day prep.
- Architecture note carried into design: AI copy is generated once on verdict creation / on-demand for scan & diagnostic, cached, served from store (coachContent.service.ts seam).

## 2026-05-29 — meal-log camera + result polish

Screen 20 (meal scan) read weird (blank brown photo, no capture step). Fixed:
- Added **Log meal · camera** screen: dark viewfinder pointed at a top-down food illustration (oatmeal bowl), corner framing brackets, AI SCAN pill, flash/close, shutter + gallery + barcode controls, "Type it in instead". Shows the camera opening when logging food.
- Rebuilt **meal scan result**: real-looking food photo (foodBowl illustration on a wood ground) + "92% SURE" confidence badge, "Confirm meal" header w/ Retake, meal name + adjustable portion, macros (protein leading), coach swap nested in the callout, clear "Log as is" / "Add the swap & log" actions.
- Full flow now: Log → Meal → camera → confirm + coach → log. Page = 23 phones.

## 2026-05-29 — fix crafting-loader completion

Bug: the loading ring counted to 100% but the 4th step ("Locking your goal date") was hardcoded to spin forever; nothing tied steps to ring progress.
- Steps are now data-driven (`data-th` thresholds 22/46/70/96). `updateSteps(v)` flips each step done→check / active→spinner / upcoming→hollow as the ring fills.
- At 100% all four check off; after a ~1.1s beat it auto-advances to the paywall (flow mode only).
- Grid view shows a static 80% snapshot (3 done, 1 active) as the thumbnail.

**Still open / to decide**

- Pace personas use refined chevrons (› ›› ›››). Could swap to literal 3D walk/car/rocket-style icons if more "gamey" is wanted.
- Paywall plan card still flat-dark; could get a glass/gradient pass + glow on the "+71% muscle retained" line.
- Headline font is still Geist 800. Could explore a rounder display face for extra warmth.
