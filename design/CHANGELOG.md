# Leanient onboarding — design changelog

Running log of changes made in the HTML prototype (`design/onboarding.html`)
so they can be re-applied to the Paper file when its quota resets.

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
