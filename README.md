# Millennium Falcon API

Back-end service that computes the fastest route for the Millennium Falcon to reach its destination
(Endor), taking its limited autonomy and refuel stops into account.

> **Status:** the HTTP layer, configuration, data access, observability and packaging are done.
> The route computation (`RouteFinderService.findFastestRoute`) is still to be implemented
> (it currently answers `501 Not Implemented`).

## Quick start

### With Docker (recommended)

```bash
docker compose up --build
curl -X POST localhost:3000/compute -H 'content-type: application/json' -d '{"arrival":"Endor"}'
```

Or without Compose:

```bash
docker build -t millennium-falcon-api .
docker run --rm -p 3000:3000 millennium-falcon-api
```

The image ships with the example mission. To use another one, mount a directory containing your
`millennium-falcon.json` and routes database on `/app/config`:

```bash
docker run --rm -p 3000:3000 -v "$PWD/my-mission:/app/config:ro" millennium-falcon-api
```

`routes_db` can be absolute, or relative to the directory of `millennium-falcon.json`.

### Local development

Requires Node.js >= 22.13 and [pnpm](https://pnpm.io) (`corepack enable`).

```bash
cp .env.example .env
pnpm install
pnpm dev
```

## API

Interactive documentation lives in the [`bruno/`](./bruno) collection (open the folder in
[Bruno](https://www.usebruno.com) and select the `local` environment). Each request carries its own
assertions and documentation.

| Method | Path            | Description                                   |
| ------ | --------------- | --------------------------------------------- |
| POST   | `/compute`      | Fastest route from the departure to `arrival` |
| GET    | `/health/live`  | Liveness probe                                |
| GET    | `/health/ready` | Readiness probe (routes database reachable)   |

### `POST /compute`

```json
{ "arrival": "Endor" }
```

```json
{ "duration": 8, "route": ["Tatooine", "Hoth", "Endor"] }
```

Errors share one envelope: `{ "error": { "code": "...", "message": "...", "details": [...] } }`.

| Status | Code                | When                                      |
| ------ | ------------------- | ----------------------------------------- |
| 400    | `VALIDATION_ERROR`  | Invalid payload (details list the issues) |
| 400    | `BAD_REQUEST`       | Malformed JSON                            |
| 404    | `NO_ROUTE_FOUND`    | Arrival unknown or unreachable            |
| 413    | `PAYLOAD_TOO_LARGE` | Body larger than 10 kB                    |
| 429    | `RATE_LIMITED`      | Too many requests                         |
| 501    | `NOT_IMPLEMENTED`   | Computation not implemented yet           |

## Configuration

Mission file (`FALCON_CONFIG_PATH`, default `./config/millennium-falcon.json`):

```json
{ "autonomy": 6, "departure": "Tatooine", "routes_db": "universe.db" }
```

Environment variables (validated at startup, the process refuses to boot on invalid values):

| Variable               | Default                           | Description                        |
| ---------------------- | --------------------------------- | ---------------------------------- |
| `PORT` / `HOST`        | `3000` / `0.0.0.0`                | Listen address                     |
| `LOG_LEVEL`            | `info`                            | pino level (`silent` to `trace`)   |
| `FALCON_CONFIG_PATH`   | `./config/millennium-falcon.json` | Mission file                       |
| `CORS_ORIGINS`         | _(empty = CORS disabled)_         | Comma-separated allowed origins    |
| `RATE_LIMIT_WINDOW_MS` | `60000`                           | Rate-limit window                  |
| `RATE_LIMIT_MAX`       | `100`                             | Max requests per client and window |

## Project structure

```
src/
  main.ts                 composition root, graceful shutdown
  app.ts                  Express app factory (no I/O, easy to test)
  config/                 env + mission file loading and validation (Zod)
  routes/                 URL -> controller wiring
  controllers/            HTTP <-> service translation
  services/               business logic (route computation)
  repositories/           data access (SQLite, read-only)
  domain/                 shared types and pure algorithms
  schemas/                request validation schemas
  middlewares/            error handling, 404
  lib/                    logger, helpers
tests/                    Vitest suites (unit + HTTP integration with supertest)
bruno/                    API collection
config/                   example mission file + universe database
```

Dependencies point inwards: `routes -> controllers -> services -> repositories`. Controllers and
services depend on interfaces (`RouteFinder`, `RoutesRepository`), concrete classes are wired only in
`main.ts`.

## Quality

```bash
pnpm lint            # ESLint (typescript-eslint strict, type-checked) + Prettier compatibility
pnpm format:check    # Prettier
pnpm typecheck       # tsc --noEmit
pnpm test            # Vitest
pnpm test:coverage   # with coverage report
```

GitHub Actions (`.github/workflows/ci.yml`) runs format, lint, typecheck, tests with coverage, build
and a dependency audit, then builds the Docker image and smoke-tests the running container.
Dependabot keeps npm, Docker and Actions dependencies up to date.

## Security and production readiness

- `helmet` headers, `x-powered-by` removed, CORS disabled unless origins are explicitly allowed
- Rate limiting, 10 kB body limit, strict request schemas (unknown fields rejected)
- Errors never leak internals (generic 500), request ids propagated (`x-request-id`)
- Structured JSON logs (pino) with sensitive headers redacted
- Read-only database connection; container runs as non-root, read-only filesystem, all Linux
  capabilities dropped, memory limit set
- Multi-stage image on `node:slim`, production dependencies only, `HEALTHCHECK`, `init` process
- Graceful shutdown on `SIGTERM`/`SIGINT` with a forced-exit timeout
- Reproducible builds: lockfile enforced (`--frozen-lockfile`), pnpm version pinned

## Design decisions

- **SQLite via the built-in `node:sqlite` module** instead of a native driver or an ORM: the routes
  database is a provided, read-only file whose path is only known at runtime. A built-in module means
  nothing to compile in the image. Trade-off: the module is still flagged experimental in Node, which is
  why access is isolated behind `RoutesRepository` (swapping the driver is a one-file change).
- **Routes loaded once at startup** and validated: the dataset is small and read-only, so the request
  path does no I/O and bad data fails fast at boot instead of at request time.
- **Layered architecture** (routes, controllers, services, repositories): the right size for this
  scope, with dependency injection to keep every layer testable in isolation.
- **No authentication**: not part of the requirements, and it would add surface area without value here.

### Route computation

The algorithm is a Dijkstra shortest-path search over an augmented state space where each node
represents _(planet, remaining\_fuel)_ rather than just a planet. This is necessary because the
optimal decision at a given planet depends not only on where the Falcon is, but on how much fuel it
has left — the same planet reached with different fuel levels is a fundamentally different state.

Two types of transitions are explored from each state:

- **Travel**: jump to a neighbouring planet if `travelTime ≤ remaining_fuel`. Cost: `travelTime`
  days; new fuel level: `remaining_fuel − travelTime`.
- **Refuel**: stay at the current planet for 1 day, restoring fuel to `autonomy`. Only considered
  when `remaining_fuel < autonomy` (refueling a full tank is never useful).

Routes whose `travelTime > autonomy` are filtered out before the search begins — the Falcon can
never make such a jump regardless of how much it refuels — which also keeps the graph small.

**Complexity:** `O((V·A + E) · log(V·A))` where `V` is the number of planets, `A` the autonomy,
and `E` the number of routes. In practice the input is tiny and the computation is instantaneous.

**Assumptions:**

- Planet names are compared with strict equality (case-sensitive), consistent with SQLite `TEXT`
  semantics.
- If several routes of equal total duration exist, the one returned is implementation-defined
  (whichever state is dequeued first by Dijkstra).
- The Falcon can refuel an unlimited number of times on any planet along its path.
- A route with `travelTime = 0` is considered invalid and is rejected at the repository layer.

## AI-assisted development

An AI coding assistant was leveraged across three main areas of the project:

### 1 · Bootstrapping from the personal boilerplate

Rather than starting from scratch, I adapted an existing TypeScript/Express boilerplate that I have
refined over the years. The boilerplate already covers the full production ring: structured logging
(pino), Zod-validated environment, layered architecture, ESLint/Prettier, Vitest, Docker multi-stage
build, GitHub Actions CI.

The AI's job was to translate the project-specific requirements into that established skeleton:

- **Reading the Falcon config** — wiring `FALCON_CONFIG_PATH` into the config layer, Zod-validating
  `autonomy`, `departure`, and `routes_db`, and resolving `routes_db` relative to the config file
  when the path is not absolute.
- **SQLite repository** — adapting the boilerplate data-access layer to use the built-in
  `node:sqlite` module (no extra driver to compile) and loading the routes once at startup.
- **`RouteFinderService` stub** — plugging the service interface into the controller with a
  `501 Not Implemented` response while the algorithm was still being developed.

This kept the scaffolding work minimal and let me focus immediately on the problem that actually
matters: the route computation.

### 2 · Algorithm review & cost control

The **Dijkstra-over-augmented-state-space** algorithm is the computational core of the project, and
getting it wrong — or letting it blow up in cost — would be the most consequential mistake. The AI
reviewed the implementation with two concerns in mind:

- **Correctness** — verifying that the _(planet, remaining\_fuel)_ state space correctly models
  refuel decisions, that `bestArrivals` is populated on first visit (guaranteeing optimal cost from
  Dijkstra), and that route reconstruction walks `previous` links faithfully.
- **Cost control** — the state count is `V × A` (planets × autonomy + 1). With a naïve autonomy
  value the space can grow unboundedly. The review introduced two guards:
  - **`effectiveAutonomy` cap** — autonomy is silently capped to the sum of all edge weights in the
    usable graph. Beyond that threshold every reachable planet is already reachable at full tank,
    so extra fuel levels are redundant states.
  - **`MAX_STATES` hard limit** — if the capped state count still exceeds 1 000 000 the constructor
    throws early with an explicit message rather than silently hammering the event loop.

These changes were then unit-tested and verified against the original statement example before being
merged.

### 3 · Testing & Documentation (time-saving on non-sensitive parts)

Writing thorough test suites and comprehensive technical documentation is critical for production
quality, but it is also repetitive and time-consuming. Because these areas are not sensitive business
logic, AI was heavily utilized to speed up delivery:

- **Test suite generation** — drafting repetitive edge cases, integration tests with `supertest`,
  mock route datasets, and regression tests (bidirectional routing, insufficient fuel, unreachable planets,
  autonomy validation).
- **Documentation** — structuring and refining the README, documenting setup steps, Docker instructions,
  HTTP status codes, and design rationale.
