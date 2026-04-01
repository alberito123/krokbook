# Battle Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a `Battle` MVP with separate battle identity, online lobby, live synchronous matches, and server-controlled scoring using the existing main-mode folders and questions.

**Architecture:** Add a parallel `Battle` module under `app/battle` that reuses existing `folders` and `questions` as read-only content while moving all battle state into new Supabase tables and Next API routes. Keep study-mode notes, progress, errors, and UI flows isolated from battle state by giving battle its own server routes, client hooks, storage keys, and components.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, `@supabase/supabase-js`, current `shadcn/ui` components, `shadcnblocks` layout patterns, localStorage, cookie-based lightweight battle sessions, polling + heartbeat, existing `npm run lint`, `npm run type-check`, and `npm run build` verification.

---

### Task 1: Add Battle Backend Prerequisites

**Files:**
- Create: `supabase/migrations/20260401_001_battle_mode.sql`
- Modify: `.env.example`
- Create: `lib/server/supabase-admin.ts`
- Create: `lib/server/battle-env.ts`

**Step 1: Add missing server env documentation**

Add these keys to `.env.example`:

```env
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
BATTLE_SESSION_SECRET=replace-with-long-random-secret
```

Keep the current public Supabase keys unchanged.

**Step 2: Create the battle SQL migration**

Add a migration that creates:

- `battle_profiles`
- `battle_presence`
- `battle_challenges`
- `battle_matches`
- `battle_match_players`
- `battle_match_questions`
- `battle_match_answers`

Include:

- unique index on `battle_profiles.nickname`
- foreign keys into `folders` and `questions`
- foreign keys between challenge/match/player/answer tables
- indexes on `battle_presence.last_seen_at`, `battle_challenges.status`, `battle_matches.status`

Use explicit status checks or enum-style text constraints for:

```sql
check (status in ('pending', 'accepted', 'declined', 'expired', 'cancelled'))
```

and

```sql
check (status in ('countdown', 'in_progress', 'finished', 'cancelled'))
```

**Step 3: Add a server-only Supabase admin client**

Create `lib/server/supabase-admin.ts`:

```ts
import { createClient } from '@supabase/supabase-js'

export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}
```

**Step 4: Add strict env access for battle server code**

Create `lib/server/battle-env.ts`:

```ts
export function getBattleEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const sessionSecret = process.env.BATTLE_SESSION_SECRET

  if (!url || !serviceRoleKey || !sessionSecret) {
    throw new Error('Battle server env is not configured')
  }

  return { url, serviceRoleKey, sessionSecret }
}
```

**Step 5: Verify the repo still builds**

Run:

```bash
npm run lint
npm run type-check
npm run build
```

Expected: all commands pass with no new warnings or errors.

**Step 6: Commit**

```bash
git add .env.example supabase/migrations/20260401_001_battle_mode.sql lib/server/supabase-admin.ts lib/server/battle-env.ts
git commit -m "feat: add battle backend prerequisites"
```

### Task 2: Add Battle Domain Types, Constants, and Pure Logic

**Files:**
- Create: `lib/battle/types.ts`
- Create: `lib/battle/constants.ts`
- Create: `lib/battle/scoring.ts`
- Create: `lib/battle/question-selection.ts`
- Create: `lib/battle/serialization.ts`

**Step 1: Define all battle domain types in one place**

Create types for:

- `BattleProfile`
- `BattlePresence`
- `BattleChallenge`
- `BattleMatch`
- `BattleMatchPlayer`
- `BattleLobbyState`
- `BattleQuestionView`
- `BattleResultView`

**Step 2: Define battle constants**

Use explicit constants for MVP behavior:

```ts
export const BATTLE_PRESENCE_TTL_MS = 45_000
export const BATTLE_HEARTBEAT_INTERVAL_MS = 15_000
export const BATTLE_CHALLENGE_TTL_MS = 60_000
export const BATTLE_COUNTDOWN_SECONDS = 5
```

**Step 3: Add pure scoring logic**

Create `lib/battle/scoring.ts`:

```ts
export function resolveWinner(aScore: number, bScore: number) {
  if (aScore === bScore) return null
  return aScore > bScore ? 'a' : 'b'
}
```

**Step 4: Add pure question snapshot helpers**

Create `lib/battle/question-selection.ts` with:

- random question picking without duplicates;
- stable answer-order shuffling;
- deterministic snapshot shape returned to both players.

**Step 5: Add API-safe serializers**

Create a serializer that strips correctness information before sending questions to the client.

**Step 6: Verify**

Run:

```bash
npm run type-check
```

Expected: new domain modules compile cleanly.

**Step 7: Commit**

```bash
git add lib/battle/types.ts lib/battle/constants.ts lib/battle/scoring.ts lib/battle/question-selection.ts lib/battle/serialization.ts
git commit -m "feat: add battle domain modules"
```

### Task 3: Add Battle Session and Identity Handling

**Files:**
- Create: `lib/server/battle-session.ts`
- Create: `lib/server/battle-auth.ts`
- Create: `app/api/battle/profile/create/route.ts`
- Create: `app/api/battle/profile/login/route.ts`
- Create: `app/api/battle/profile/session/route.ts`
- Create: `app/api/battle/profile/logout/route.ts`

**Step 1: Add lightweight cookie-based battle sessions**

Use an HTTP-only cookie, for example `krokbook-battle-session`, signed with `BATTLE_SESSION_SECRET`.

Create helpers:

- `createBattleSession(profileId: string)`
- `readBattleSession()`
- `clearBattleSession()`

**Step 2: Add battle profile creation route**

`POST /api/battle/profile/create` should:

- validate `nickname` and `pin`;
- normalize nickname;
- reject duplicate nickname;
- hash the PIN;
- insert `battle_profiles`;
- set the battle session cookie.

**Step 3: Add battle login route**

`POST /api/battle/profile/login` should:

- look up nickname;
- compare supplied PIN with stored hash;
- set the battle session cookie;
- update `last_login_at`.

**Step 4: Add current-session route**

`GET /api/battle/profile/session` should return the active battle profile from the session cookie or `401` if missing.

**Step 5: Add logout route**

`POST /api/battle/profile/logout` clears the cookie and returns `{ ok: true }`.

**Step 6: Verify**

Run:

```bash
npm run lint
npm run type-check
```

Manual check:

- create a battle profile;
- reload;
- confirm session restore works.

**Step 7: Commit**

```bash
git add lib/server/battle-session.ts lib/server/battle-auth.ts app/api/battle/profile
git commit -m "feat: add battle profile session flow"
```

### Task 4: Add Presence and Lobby API

**Files:**
- Create: `app/api/battle/presence/route.ts`
- Create: `app/api/battle/lobby/route.ts`
- Create: `lib/server/battle-repository.ts`

**Step 1: Centralize battle data access**

Create `lib/server/battle-repository.ts` with functions such as:

- `upsertPresence(profileId)`
- `listOnlineProfiles(now)`
- `getActiveChallenges(profileId, now)`
- `getActiveMatch(profileId, now)`

**Step 2: Add presence heartbeat route**

`POST /api/battle/presence` should:

- require a valid battle session;
- upsert `battle_presence.last_seen_at`;
- return `{ ok: true }`.

**Step 3: Add lobby state route**

`GET /api/battle/lobby` should return:

- current profile;
- online profiles except self;
- incoming pending challenges;
- outgoing pending challenges;
- active match summary if one exists.

**Step 4: Add expiry handling**

When reading lobby data, treat presence older than TTL as offline and pending challenges past TTL as expired.

**Step 5: Verify**

Manual check with two browser contexts:

- both profiles appear online while the site is open;
- closing one browser removes it from the online list after TTL.

**Step 6: Commit**

```bash
git add app/api/battle/presence/route.ts app/api/battle/lobby/route.ts lib/server/battle-repository.ts
git commit -m "feat: add battle lobby presence api"
```

### Task 5: Add Challenge Creation and Acceptance

**Files:**
- Create: `app/api/battle/challenges/route.ts`
- Create: `app/api/battle/challenges/[challengeId]/accept/route.ts`
- Create: `app/api/battle/challenges/[challengeId]/decline/route.ts`
- Modify: `lib/server/battle-repository.ts`

**Step 1: Add challenge creation**

`POST /api/battle/challenges` should:

- require battle session;
- validate opponent, folder, `questionCount`, and `timeLimitSeconds`;
- reject if either player already has an active challenge or match;
- verify the folder exists and has at least `N` questions;
- insert a `pending` challenge with expiry.

**Step 2: Add challenge acceptance**

`POST /api/battle/challenges/[challengeId]/accept` should:

- verify the current user is the target;
- verify the challenge is still pending;
- fetch all questions for the folder;
- randomly choose `N`;
- create `battle_matches`;
- create `battle_match_players`;
- create `battle_match_questions`;
- set shared `start_at = now + 5 seconds`;
- mark the challenge `accepted`.

**Step 3: Add challenge decline**

`POST /api/battle/challenges/[challengeId]/decline` marks the challenge declined.

**Step 4: Keep fairness logic server-side**

Never send `correctAnswerIndex` to the client from these routes.

**Step 5: Verify**

Manual check with two profiles:

- create challenge;
- accept challenge;
- confirm both players get the same countdown;
- confirm only one active challenge/match per profile is allowed.

**Step 6: Commit**

```bash
git add app/api/battle/challenges lib/server/battle-repository.ts
git commit -m "feat: add battle challenge flow"
```

### Task 6: Add Match Read and Answer Submission API

**Files:**
- Create: `app/api/battle/match/current/route.ts`
- Create: `app/api/battle/match/[matchId]/answer/route.ts`
- Create: `app/api/battle/match/[matchId]/result/route.ts`
- Modify: `lib/server/battle-repository.ts`
- Modify: `lib/battle/scoring.ts`

**Step 1: Add current-match route**

`GET /api/battle/match/current` should return:

- active match metadata;
- countdown or in-progress status;
- current question list without correct answers;
- player progress summaries;
- opponent status summary.

**Step 2: Add answer submission route**

`POST /api/battle/match/[matchId]/answer` should:

- require session;
- reject answers before `start_at` or after match end;
- reject duplicate answers for the same player/question;
- validate selected index against the frozen answer order;
- compute correctness on the server;
- insert `battle_match_answers`.

**Step 3: Add result finalization**

When both players finish or the timer ends:

- compute both scores from recorded answers;
- update `battle_match_players.score`;
- set match status to `finished`;
- set `winner_profile_id` or `null` for draw.

**Step 4: Add result route**

`GET /api/battle/match/[matchId]/result` returns:

- self score;
- opponent score;
- outcome `won | lost | draw`.

**Step 5: Verify**

Manual check with two profiles:

- answer different numbers of questions;
- confirm score is correct;
- confirm equal scores return draw;
- confirm disconnecting one player still ends the match on timer expiry.

**Step 6: Commit**

```bash
git add app/api/battle/match lib/server/battle-repository.ts lib/battle/scoring.ts
git commit -m "feat: add battle match api"
```

### Task 7: Add Client Battle Hooks and Storage Isolation

**Files:**
- Create: `lib/hooks/useBattleSession.ts`
- Create: `lib/hooks/useBattleLobby.ts`
- Create: `lib/hooks/useBattleMatch.ts`
- Modify: `lib/constants.ts`

**Step 1: Add battle-specific storage keys**

Extend `lib/constants.ts`:

```ts
export const STORAGE_KEYS = {
  // existing keys...
  BATTLE_PROFILE_HINT: 'krokbook-battle-profile-hint',
}
```

Do not reuse notebook, progress, or error keys.

**Step 2: Add `useBattleSession`**

Handle:

- session bootstrap;
- create profile;
- login;
- logout;
- lightweight remembered nickname hint only.

**Step 3: Add `useBattleLobby`**

Handle:

- lobby polling every few seconds;
- create challenge;
- accept/decline challenge;
- heartbeat interval while the site is open.

**Step 4: Add `useBattleMatch`**

Handle:

- countdown state;
- answer submission;
- timer display;
- result polling until finished.

**Step 5: Verify**

Run:

```bash
npm run type-check
```

Manual check:

- main study notes and errors still behave exactly as before;
- battle sign-in state is isolated.

**Step 6: Commit**

```bash
git add lib/hooks/useBattleSession.ts lib/hooks/useBattleLobby.ts lib/hooks/useBattleMatch.ts lib/constants.ts
git commit -m "feat: add battle client hooks"
```

### Task 8: Build the Battle UI

**Files:**
- Create: `app/battle/page.tsx`
- Create: `components/battle/BattleProfileGate.tsx`
- Create: `components/battle/BattleLobby.tsx`
- Create: `components/battle/BattleChallengeDialog.tsx`
- Create: `components/battle/BattleIncomingChallenges.tsx`
- Create: `components/battle/BattleMatchView.tsx`
- Create: `components/battle/BattleResultCard.tsx`
- Create: `components/battle/index.ts`

**Step 1: Build the profile gate screen**

Use existing form, card, input, button, and dialog patterns from the current app. Keep typography, spacing, border radius, and colors aligned with the existing product.

**Step 2: Build the lobby**

Show:

- current profile;
- online users;
- incoming challenges;
- outgoing challenges;
- create challenge action.

Use existing `Button`, `Input`, `Label`, and `Tabs`/card conventions instead of inventing a separate design system.

**Step 3: Build the match screen**

Show:

- current question;
- options;
- timer;
- progress;
- opponent state;
- non-invasive result handoff.

**Step 4: Keep the UI visually aligned**

Reuse:

- current neutral palette;
- current card styling;
- current button hierarchy;
- existing spacing scale;
- `shadcnblocks` composition patterns already used in the app.

**Step 5: Verify**

Manual check:

- the battle flow looks like a natural continuation of the current product;
- there is no separate or clashing visual language.

**Step 6: Commit**

```bash
git add app/battle/page.tsx components/battle
git commit -m "feat: add battle interface"
```

### Task 9: Wire Battle Into Existing Navigation

**Files:**
- Modify: `components/Sidebar.tsx`
- Modify: `components/MobileHeader.tsx`
- Modify: `components/index.ts`

**Step 1: Add a top-level entry to the navigation**

Add a `Battle` entry that routes to `/battle`.

Desktop:

- add a button or nav item in the same action cluster as the other primary navigation actions.

Mobile:

- expose access to `/battle` from the existing mobile shell without disturbing the current tester/notebook bottom tabs.

**Step 2: Keep dashboard flow unchanged**

Do not move notebook, errors, or current folder interactions into battle. `/dashboard` remains the default study route.

**Step 3: Verify**

Manual check:

- navigation to `/battle` works on desktop and mobile;
- current dashboard interactions remain unchanged.

**Step 4: Commit**

```bash
git add components/Sidebar.tsx components/MobileHeader.tsx components/index.ts
git commit -m "feat: add battle navigation entry"
```

### Task 10: Final Verification and Controlled Rollout Prep

**Files:**
- Modify if needed: `docs/plans/2026-04-01-battle-design.md`
- Modify if needed: `docs/plans/2026-04-01-battle-implementation-plan.md`

**Step 1: Run full verification**

Run:

```bash
npm run lint
npm run type-check
npm run build
```

Expected: all pass.

**Step 2: Run manual two-user verification**

Use one regular browser window and one incognito window:

1. Create two battle profiles.
2. Keep both sessions online.
3. Challenge from one user to the other.
4. Accept.
5. Confirm identical question set and timer.
6. Confirm result on different scores.
7. Confirm draw on equal scores.
8. Confirm study notes remain unchanged.

**Step 3: Document rollout prerequisites**

Before releasing beyond local:

- apply the SQL migration in Supabase;
- add `SUPABASE_SERVICE_ROLE_KEY`;
- add `BATTLE_SESSION_SECRET`;
- smoke-test with a small student subset first.

**Step 4: Final commit**

```bash
git add .
git commit -m "feat: ship battle mode mvp"
```
