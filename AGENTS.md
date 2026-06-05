# Leanient - Codex Guidelines

## Project Context

**Leanient is the GLP-1 companion built for one promise: lose the fat, keep yourself intact.**

People on Ozempic, Wegovy, Mounjaro, and Zepbound lose weight successfully but quietly lose 25-39% of it as muscle. Every other app tracks injections and counts protein. None of them coach the actual outcome. Leanient is the calm, knowing coach in your pocket that tells you each week whether you are keeping your muscle, gives short workouts tuned to your shot-day energy, and turns the chaos of a GLP-1 journey into a clear weekly verdict with one next action.

The core feature is the **weekly verdict**: are you keeping your muscle, and what is the single most important thing to do next.

## Structure

```
Leanient/
├── leanient-backend/    # Node.js + Express + TypeScript + Mongoose (MongoDB)
│   └── src/
│       ├── config/      # env + db connection
│       ├── models/      # Mongoose schemas (User, WeeklyCheckin)
│       ├── middleware/  # auth (JWT)
│       ├── controllers/ # request handlers
│       ├── routes/      # express routers
│       ├── services/    # verdict engine, twilio, apple, workouts, push, scheduler
│       └── utils/       # jwt helpers
└── leanient-frontend/   # React Native + Expo + TypeScript (React Navigation + twrnc)
    └── src/
        ├── design/      # tailwind.ts (twrnc instance) + tokens
        ├── navigation/  # Root / Onboarding / MainTab navigators
        ├── screens/     # onboarding/ + main/ (Verdict, Workouts, Progress)
        ├── context/     # AuthContext (AsyncStorage-backed)
        ├── services/    # api.service.ts (axios)
        └── types/       # shared TS types
```

## Stack Decisions

- **Backend:** Express 5, Mongoose/MongoDB, JWT auth, Twilio Verify (phone OTP), Apple Sign-In, node-cron scheduler, Expo push, Postmark email. Mirrors the Foster app.
- **Frontend:** Expo (bare-workflow capable), React Navigation (native-stack + bottom-tabs), twrnc for Tailwind-style styling, AsyncStorage for session. Mirrors the Foster app.
- **Auth flow:** Phone OTP + Apple Sign-In, JWT bearer token stored in AsyncStorage.

## Code Style

- Functional components with TypeScript. Props interfaces above the component.
- Styling via the shared `tw` instance from `src/design/tailwind.ts`. Use tokens, do not hardcode hex unless dynamic.
- File naming: Components/Screens `PascalCase.tsx`, hooks `useCamelCase.ts`, utils `camelCase.ts`.
- No emojis in the app UI; use `@expo/vector-icons`.

## Writing Rules

- Prefer positive phrasing. State what something IS.
- Avoid "Not X, but Y" contrastive patterns.
- No em dashes; use commas or periods.

## The Verdict Engine

`leanient-backend/src/services/verdict.service.ts` estimates the share of weekly
weight loss that came from lean mass, starting from a GLP-1 baseline and rewarding
protein adherence and resistance training. It is a heuristic, not a DEXA scan.
When refining it, keep it explainable and conservative.
