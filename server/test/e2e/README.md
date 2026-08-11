# Server E2E tests

The E2E suite starts the real Nest application in the Jest process, sends real HTTP requests with
Supertest, and persists data through Prisma to a dedicated PostgreSQL database.

The E2E bootstrap replaces `RealtimePublisher` with a no-op implementation, so these tests never
connect to Ably. Realtime publishing behavior is covered by focused unit tests instead.

## Local setup

1. Copy `.env.test.example` to `.env.test.local`.
2. Set `E2E_DATABASE_URL` and `E2E_DIRECT_URL` to the dedicated disposable test database.
3. Set a test-only `E2E_AUTH_ACCESS_TOKEN_SECRET` containing at least 32 characters.
4. Run `pnpm test:e2e` from `server/`.

`pnpm test:e2e` deploys the real Prisma migrations before running the stories. It never truncates,
resets, or deletes existing database data.

## Shutdown and manual reset

Every E2E suite closes its Nest application in `afterAll`. Nest then invokes the Prisma shutdown
hook, which disconnects the database client and closes its connection pool. This resource cleanup
does not delete persisted story data.

To manually erase all E2E data and reapply every migration, run:

```bash
pnpm test:e2e:reset
```

The command resolves only `E2E_DIRECT_URL` from the test environment and asks for confirmation
before resetting. Because local and GitHub Actions use the same database, confirming the command
erases E2E data created by both environments. Do not run it while an E2E workflow is active.

## Story conventions

- Structure each story with visible `Given`, `When`, and `Then` sections.
- Generate unique emails, names, and other unique values for every story run.
- Create every prerequisite through the public HTTP API inside the current story.
- When no public API exists for a prerequisite, seed only that boundary directly and document why
  in the story. The shared-member story uses this exception for its membership fixture because the
  server does not expose invitation or member-management endpoints.
- Assert using IDs returned by the current story.
- Never depend on another story, global database contents, or Jest execution order.

## GitHub Actions secrets

Configure these repository or environment secrets:

- `E2E_DATABASE_URL`
- `E2E_DIRECT_URL`
- `E2E_AUTH_ACCESS_TOKEN_SECRET`

Local and GitHub Actions use the same variable names. The values come from `.env.test.local`
locally and GitHub Secrets in CI. GitHub Actions deploys migrations and then runs the same E2E suite
against the in-process Nest application and configured test database.
