# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: Each page component in `frontend/src/components` only renders state. A shared client in `frontend/src/api/client.ts` owns `fetch` calls against a base of `VITE_API_BASE_URL` or the relative `/api`. Each page shows one of four states: a `role="status"` loading message, a page-specific empty message ("No activities", "No teams", "No leaderboard entries", "No workout suggestions"), a `role="alert"` error message ("Unable to load ..."), or the data.
- Logic tier decision: Express routes in `routes/api.ts` stay thin. Business rules live in `services/octofitService.ts`. Invalid ObjectIds and missing required fields return `400`. References to users or teams that do not exist return `404`. Unexpected errors go to the existing Express error handler and are never returned as a cast error.
- Data tier decision: Each Mongoose model declares its contract as required fields. `User` needs `name`, `email`, and `fitnessGoal`. `Team` needs `name` and `mascot`, and `members` defaults to an empty array. `Activity` needs `user`, `team`, `type`, `minutes`, `points`, and `occurredAt`. `Workout` needs `title`, `focus`, `minutes`, and `difficulty`. Seed remains an idempotent upsert that does not clear data.
- Activity tracking approach: Points are computed as one point per active minute, `points = minutes`. This matches the seed data (40-minute run = 40 points) and the test fixtures. `occurredAt` defaults to the request time when not supplied. The POST handler checks that `userId` and `teamId` are valid ObjectIds and that both documents exist. It stores `user`, `team`, `type`, `minutes`, `points`, and `occurredAt`, then returns `201`.
- Team management approach: `POST /api/teams` requires a non-empty `name` (`400` otherwise) and a `mascot`. It accepts an optional `members` array of existing user IDs, validates each one, and returns `201`. `GET /api/teams` returns the stored `name`, `mascot`, and `members`.
- Leaderboard approach: `getLeaderboard()` aggregates `Activity.points` by `team`, joins each team's name, sorts by `totalPoints` descending, and breaks ties by `teamName` ascending. `rank` is 1-based and follows the sort order.
- Workout suggestions approach: The service looks up the user by email and returns `404` if none matches. It derives a focus from the user's `fitnessGoal` and from the most-minutes activity type in their history (`run`/`cycle` map to `endurance`, `strength` maps to `strength`). Workouts whose `focus` matches come first, each with a `reason` that names the goal or activity (for example, "Matches your endurance goal and recent run activity").

## Test plan

Run the tests in tier order, and only move to the next tier when the current one passes. Each failure below means the matching behavior is missing or wrong.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`. Failure in the validation tests means a model is missing a required field. Failure in the seed test means seed is not idempotent or does not preserve unrelated records.
- API command: `npm run test:api --prefix octofit-tracker/backend`. A `501` means a stub is still in place. A `500` on invalid input means an unhandled cast error. A leaderboard mismatch means aggregation or sorting is wrong. A workout mismatch means the focus or reason logic is wrong, or an unknown email did not return `4xx`.
- Frontend command: `npm test --prefix octofit-tracker/frontend`. A missing `role="status"` or `role="alert"` means the state is not announced. A missing empty message means the empty-state copy does not match the test regex. A failing `fetch` assertion means the request URL is wrong.
- Backend build command: `npm run build --prefix octofit-tracker/backend`. Type errors here usually mean a service signature does not match its route.
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`. Type errors here usually mean a component or client signature is wrong.
- Full check before committing: run all five commands above. Run the frontend and backend builds last. Only the learner commits and pushes after the tests pass.
