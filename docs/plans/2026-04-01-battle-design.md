# Battle Mode Design

## Goal

Add a new `Battle` mode where one student can challenge another student to a live, synchronous match using questions from an existing folder in the main study mode.

## Product Constraints

- `Battle` must live in its own top-level tab so it does not interfere with the main dashboard flow.
- `Battle` must reuse the existing visual language, using the same `shadcn/ui` and `shadcnblocks` component patterns as the rest of the product.
- `Battle` must read folders and questions from the existing main-mode data.
- Existing notes, error notes, progress, and current folder state must remain untouched.
- First release is MVP only: no rating, no leaderboard, no history, no rematch, no spectator mode, no chat.

## Core Decisions

### Identity

- `Battle` gets its own lightweight profile model.
- A student creates a `battle profile` once using `nickname + PIN`.
- This is separate from the current study-mode local state and does not require a full account system.
- The browser stores only a local battle session token or session marker for that profile.

### Online Presence

- A student is considered online while the site is open, not only while the `Battle` tab is visible.
- The `Battle` lobby shows only students who are currently online.
- Online presence is maintained by a lightweight heartbeat to the server.

### Match Creation

- One student challenges another online student from the `Battle` tab.
- The challenger selects:
  - an existing folder from the main mode;
  - question count `N`;
  - match time limit.
- The system validates that the selected folder contains at least `N` questions.

### Match Rules

- Matches are synchronous.
- Both players get the exact same randomly selected `N` questions from the chosen folder.
- The server locks the question set when the challenge is accepted.
- Both players get the same question order and the same answer-option order for fairness.
- Winner is the player with the higher count of correct answers.
- Equal correct answers result in a draw.

## User Experience

### Entry

- A new `Battle` tab appears alongside the existing product navigation.
- If no battle profile exists, the user sees a focused `Create Battle Profile` screen.
- If a profile already exists, the user enters the `Battle` lobby.

### Battle Lobby

- Shows the current student identity.
- Shows only currently online students.
- Shows incoming challenges.
- Allows creating a new challenge by selecting opponent, folder, `N`, and time limit.

### Challenge Flow

1. Challenger creates a challenge.
2. Opponent sees an incoming challenge in the `Battle` tab.
3. Opponent can `Accept` or `Decline`.
4. On accept, the server creates a match and sets a shared `start_at`.
5. Both users see a short countdown.
6. Both users enter the same live match.

### Match Screen

- Large question area.
- Multiple choice answers.
- Match timer.
- Progress indicator such as `Question 3 of 20`.
- Minimal opponent status only, for example `in match` or `finished`.
- No reveal of opponent answers during the match.
- No integration with notebook or error tracking in this flow.

### Result Screen

- Shows `You won`, `Draw`, or `You lost`.
- Shows both final scores.
- Offers a return to the lobby.

## Data Boundaries

### Existing Tables Used Read-Only

- `folders`
- `questions`

These stay as the source of truth for battle question banks.

### New Battle Tables

- `battle_profiles`
  - `id`
  - `nickname` unique
  - `pin_hash`
  - `created_at`
  - `last_login_at`

- `battle_presence`
  - `profile_id`
  - `last_seen_at`
  - `status`

- `battle_challenges`
  - `id`
  - `challenger_profile_id`
  - `opponent_profile_id`
  - `folder_id`
  - `question_count`
  - `time_limit_seconds`
  - `status` (`pending`, `accepted`, `declined`, `expired`, `cancelled`)
  - `created_at`
  - `accepted_at`
  - `expires_at`

- `battle_matches`
  - `id`
  - `challenge_id`
  - `folder_id`
  - `question_count`
  - `time_limit_seconds`
  - `status` (`countdown`, `in_progress`, `finished`, `cancelled`)
  - `start_at`
  - `end_at`
  - `winner_profile_id` nullable
  - `created_at`

- `battle_match_players`
  - `id`
  - `match_id`
  - `profile_id`
  - `status` (`ready`, `in_progress`, `finished`, `timed_out`, `abandoned`)
  - `score`
  - `finished_at`

- `battle_match_questions`
  - `id`
  - `match_id`
  - `question_id`
  - `position`
  - `answer_order`

- `battle_match_answers`
  - `id`
  - `match_id`
  - `profile_id`
  - `question_id`
  - `selected_index`
  - `is_correct`
  - `answered_at`

## Server Responsibilities

- Create and authenticate battle profiles.
- Maintain online presence.
- Validate challenge creation.
- Select and freeze the random question set.
- Hide correct answers from the client during the match.
- Record answers.
- Decide the final result.

Clients must not determine fairness-critical data such as:

- chosen battle questions;
- correct answer validation;
- winner calculation.

## API Shape

Expected server endpoints or equivalent server actions:

- create battle profile
- sign in to battle profile
- restore current battle session
- update heartbeat
- list online battle profiles
- create challenge
- list incoming/outgoing challenges
- accept challenge
- decline challenge
- fetch current lobby state
- fetch current match state
- submit match answer
- fetch final result

## Isolation From Existing Study Mode

- Current `StoreProvider` state for folders, notes, notebook, progress, and errors remains intact.
- Battle state gets separate client-side state and separate storage keys.
- No current localStorage keys are reused for battle.
- Battle failures must not break the main dashboard.

## Edge Cases

- If a user closes the site, presence expires automatically after a short timeout window.
- If a challenge is not accepted before expiry, it becomes `expired`.
- If the selected folder has fewer than `N` questions, challenge creation is rejected.
- A battle profile can have only one active challenge or active match at a time in MVP.
- If a player disconnects during a match, the match timer keeps running.
- If the player does not return before the timer ends, the result is based on the answers recorded so far.

## Rollout Plan

1. Add battle database tables and server routes behind the new `Battle` tab.
2. Add battle profile creation and sign-in.
3. Add lobby and online presence.
4. Add challenge creation and accept/decline flow.
5. Add live match screen and scoring.
6. Test locally with multiple profiles.
7. Roll out to a small subset of students before wider usage.
