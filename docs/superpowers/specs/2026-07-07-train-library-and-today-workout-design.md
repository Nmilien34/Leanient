# Train Library And Today Workout Design

## Context

Leanient's Train screen currently has one featured session, a weekly sessions card, and a plain workout library list. The catalog is small, the library has no browsing controls, and Home's Today workout can diverge from Train because Home picks from the legacy recommended workouts pool while Train uses `/training/today`.

The new direction is to make Train feel like a real curated workout library while keeping Leanient's core promise: lose the fat, keep yourself intact. The app should choose one right workout for the day from the backend, then show that same workout in Home and Train.

## Goals

- Make `/training/today` the single backend source of truth for the daily workout.
- Use the same featured workout in Home Today, the Today plan workout CTA, the Home workout player, and Train's today card.
- Expand the workout catalog to 48 active curated workouts.
- Add horizontal multi-select filter pills to Train.
- Make `All workouts` the default selected pill.
- Use AND matching for multiple selected filters.
- Keep recommendations explainable and conservative for GLP-1 users.

## Non-Goals

- Build a 500-workout generic fitness catalog.
- Add social workout features, favorites, search, or program scheduling.
- Replace the workout player.
- Make workout recommendation dependent on opaque AI output.

## Backend Design

`/training/today` will own the daily featured workout decision. The service should gather:

- Today protein grams and calories logged.
- Daily protein and calorie targets.
- Week-to-date protein and calorie adherence.
- Sessions completed this week and weekly workout target.
- Recent workout history, including workout IDs and recorded dates.
- Shot-day context and derived energy.
- User equipment access.

The recommendation engine should stay deterministic and explainable. It should bias toward:

- Recovery or mobility on shot day or shot day plus one when energy or intake is low.
- Shorter easy strength when protein or calories are light but the user still needs a muscle signal.
- Strength sessions when the user is behind the weekly training target and intake is adequate.
- Harder strength rotation only when energy is good and the user is at or near target.
- Less recently completed patterns to avoid repeating the same session.

The response will include a structured reason that the frontend can render in plain language. Extend `selectionReason` with `low_intake`, `protein_gap`, `calorie_gap`, and `weekly_training_gap`. The service keeps `coachCopy` as an enhancement, with deterministic reason copy as the fallback.

## Frontend Home Design

Home should stop using `pickWorkout(recommendedWorkouts, ...)` for the daily workout. Instead:

- `trainingToday.featuredWorkout?.workout` becomes the daily plan workout.
- The Today plan card, Today plan sheet, workout player, and completion handler all use that same workout.
- If `/training/today` returns no workout, Home renders the Today plan with no Move step.
- The existing Today plan nutrition copy can continue to use local daily meal data, but the workout choice itself comes from the backend.

This removes disagreement between Home and Train.

## Train UI Design

Train keeps the current screen structure but upgrades the library area:

- Header: existing Train title and weekly session count.
- Today card: stronger featured session card powered by `/training/today`.
- Reason line: deterministic copy such as "Chosen because protein is light today" or "Chosen because you are 1 session behind."
- Weekly sessions card: keep the existing history entry point.
- Filter carousel: horizontal multi-select pills above the library.
- Library count: show the filtered count, for example "18 workouts."
- Workout list: update the existing `WorkoutCard` so it can show better tags and meta.

Filter pills:

- `All workouts`
- `Outdoor`
- `Indoor`
- `Abs & core`
- `Full body`
- `Upper body`
- `Lower body`
- `Mobility`
- `Low energy`
- `Dumbbells`
- `Bodyweight`

Behavior:

- `All workouts` is selected by default.
- Selecting `All workouts` clears every other filter.
- Selecting any other pill deselects `All workouts`.
- Multiple selected pills use AND matching.
- Empty state: "No workouts match those filters yet."

## Catalog Design

The catalog will expand to 48 active workouts. Workouts are curated for GLP-1 users:

- Short strength sessions for low appetite or limited energy.
- Full-body, upper-body, lower-body, and abs/core strength.
- Indoor and outdoor options.
- Bodyweight, dumbbell, gentle, and gym-compatible options based on existing equipment access.
- Mobility and recovery options around shot day.
- Clear tags that make filters dependable.

Tags are consistent and machine-friendly:

- `indoor`
- `outdoor`
- `abs-core`
- `full-body`
- `upper-body`
- `lower-body`
- `mobility`
- `low-energy`
- `dumbbells`
- `bodyweight`
- `gym`

Existing active workouts will be retagged to match the taxonomy. Legacy inactive workouts remain inactive for historical logs.

## Data Flow

1. `LeanientDataContext.refreshHomeData()` loads `/training/today`.
2. Home reads `trainingToday.featuredWorkout?.workout` for the daily workout.
3. `TrainScreen` reads the same `trainingToday.featuredWorkout?.workout` for its Today card.
4. Train reads `workouts` for the full library.
5. Filter state is local to `TrainScreen`.
6. Workout completion continues to write `WorkoutLog` through the existing `createWorkoutLog` path.
7. After completion, refresh Home and Train data so session counts and recommendations update.

## Error Handling

- If `/training/today` fails, Home keeps its existing degraded state and Train shows the existing error/retry state.
- If AI coach copy fails, render deterministic reason copy.
- If no eligible workout exists for a user's equipment, show no featured workout and let the library empty state explain that workouts are unavailable.
- If filters return zero workouts, keep selected pills visible and show the filtered empty state.

## Testing

Backend:

- Add recommendation tests for low intake, protein gap, calorie gap, training gap, shot-day recovery, and recent workout avoidance.
- Add `training.service` tests proving meal logs and calorie/protein totals are passed into recommendation input.
- Keep route tests for `/training/today` response shape.

Frontend:

- Add Train filter utility tests for default `All workouts`, AND matching, clear behavior, and empty state count.
- Update Home tests so Today workout comes from `trainingToday.featuredWorkout`.
- Keep existing Today plan tests for nutrition copy.
- Add API schema tests if response fields are extended.

## Open Decisions Resolved

- Home and Train use the same backend recommendation logic.
- Multiple filter pills match with AND behavior.
- `All workouts` is the default selected pill.
