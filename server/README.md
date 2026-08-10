# Server

The server is the authoritative API for authentication, Group membership, Todo Lists, Todos,
Subtasks, persisted ordering, and activity history. It validates and authorizes every domain
operation before storing state in PostgreSQL. See the [root README](../README.md) for the product
overview and assignment story status.

## Tech Stack

- Node.js 24 and TypeScript
- NestJS 11 with Express
- Prisma 7 with the PostgreSQL driver adapter
- PostgreSQL
- Passport JWT and `@nestjs/jwt`
- Argon2id password hashing
- class-validator and class-transformer DTO validation
- Joi environment validation
- Swagger/OpenAPI
- Winston through `nest-winston`
- Ably REST SDK for server-side TodoList event publication
- Jest, Nest testing utilities, and Supertest
- Biome
- Docker and Railway configuration

## Getting Started

The CI-supported toolchain is Node.js 24 and pnpm 11. An accessible PostgreSQL database is required
for application startup, migrations, and E2E tests.

From `server/`:

```bash
pnpm install
cp .env.example .env
# Set DATABASE_URL, DIRECT_URL, and ABLY_KEY in .env.
pnpm prisma:migrate:deploy
pnpm start:dev
```

The API listens on `http://localhost:3000` by default. Swagger UI is available at
`http://localhost:3000/api/docs`.

Useful package scripts:

```bash
pnpm start             # start Nest once
pnpm start:dev         # start in watch mode
pnpm start:debug       # start watch mode with the debugger
pnpm start:prod        # run compiled production output
pnpm lint              # run Biome linting
pnpm format:check      # check formatting without writing files
pnpm typecheck         # typecheck source and tests
pnpm test:unit         # run unit tests
pnpm test:integration  # run HTTP-boundary integration tests
pnpm test:e2e          # deploy test migrations, then run real-PostgreSQL E2E tests
pnpm test:all          # unit, integration, and E2E tests
pnpm build             # generate Prisma Client and compile Nest
pnpm prisma:validate   # validate the Prisma schema
pnpm prisma:migrate:dev
pnpm prisma:migrate:deploy
pnpm docker:build
pnpm docker:up
pnpm docker:logs
pnpm docker:down
```

For E2E tests, copy `.env.test.example` to `.env.test.local` and configure a dedicated disposable
PostgreSQL database. See [`test/e2e/README.md`](test/e2e/README.md) before using
`pnpm test:e2e:reset`, because that command erases the configured test database.

## Environment

Runtime configuration is validated at startup. `.env.local` takes precedence over `.env`; tests
use `.env.test.local`.

### Development and production

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | No in development; set to `production` for production configuration | Selects development, test, or production configuration. |
| `PORT` | Production: yes; development: no | HTTP port. Development defaults to `3000`. |
| `AUTH_ACCESS_TOKEN_SECRET` | Production: yes; development: no | JWT signing secret, minimum 32 characters. Development has a local-only default. |
| `DATABASE_URL` | Yes | PostgreSQL runtime connection string used by the Prisma driver adapter. |
| `DIRECT_URL` | Yes | Direct PostgreSQL connection used by Prisma CLI operations and migrations. |
| `ABLY_KEY` | Yes | Ably API key used by the server to publish realtime notifications. |

Use values shaped like those in [`.env.example`](.env.example); never commit real credentials.

### E2E

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | No | E2E application port; defaults to `3001` when needed. |
| `E2E_AUTH_ACCESS_TOKEN_SECRET` | Yes | Test-only JWT secret, minimum 32 characters. |
| `E2E_DATABASE_URL` | Yes | Runtime connection to the dedicated E2E PostgreSQL database. |
| `E2E_DIRECT_URL` | Yes | Direct migration connection for the E2E database. |
| `ABLY_KEY` | No | Ably API key. Test configuration uses a non-secret local default because automated tests mock the transport and never call Ably. |

CORS is currently enabled for all origins in application bootstrap as a development/demo policy;
there is no frontend-origin environment variable. An explicit allowlist would be required before a
cookie-based credential model.

## Backend Architecture

Feature operations generally follow this dependency direction:

```text
Controller
    ↓
Service
    ↓
Repository
    ↓
Prisma
    ↓
PostgreSQL
```

- Controllers define versioned HTTP routes, generated-contract metadata, DTO boundaries, and
  response mapping.
- Services enforce access, coordinate use cases, transactions, activity writes, and domain logs.
- Repositories contain Prisma reads and writes.
- Shared infrastructure provides configuration, Prisma lifecycle, validation, errors, OpenAPI,
  request IDs, and logging.

This is a conventional NestJS layered application. It does not introduce CQRS, event sourcing, or
a separate repository abstraction outside the existing feature repositories.

Cross-cutting behavior sits around that flow:

- Passport guards and the `Session` decorator provide authenticated user/session identity.
- Group-membership checks establish the authorization boundary for descendant resources.
- The global ValidationPipe transforms and filters request DTOs.
- `GlobalException` and the global exception filter map stable error codes to HTTP responses.
- ActivityEvent writes are coordinated by services inside relevant domain transactions.
- Request IDs and Winston provide correlated console logs.

## Domain Model

The active API hierarchy is:

```text
User
  └─ Membership ── Group
                    ├─ TodoList
                    │    └─ Todo
                    │         └─ SubTask
                    └─ ActivityEvent
```

Creating a Group also creates an `OWNER` membership for the creator. Access to a Group's active
API resources is based on membership; role-specific administration is not implemented in the
current endpoints.

Todo Lists, Todos, and Subtasks carry persisted rank fields. Todos and Subtasks also support soft
deletion. ActivityEvent is a separate append-only history record linked to the Group and actor. The
Prisma schema also includes Invitation and assignee relationships, but no invitation or assignment
API is registered in the current V1 module set.

## Authentication

Registration normalizes email, checks uniqueness, hashes the password with Argon2id, creates the
user, and opens a persisted UserSession. Login verifies the stored password hash and creates a new
session.

Successful registration/login returns:

- a signed JWT access token containing user ID and session ID;
- an opaque refresh token;
- access-token expiry metadata; and
- the public user DTO.

Access tokens expire after 15 minutes and are validated from the Bearer header. Refresh sessions
expire after 30 days. The raw refresh secret is never stored in PostgreSQL: the token contains a
session ID plus random secret, while the session row stores a SHA-256 hash of that secret.

Refreshing validates the current token and expiry, then rotates the stored hash with a conditional
update and returns a new refresh token and access token. The refresh lifetime is extended from the
successful rotation time. A concurrent/reused old refresh token fails once its stored hash has
changed.

`GET /api/v1/auth/me` returns the authenticated user. Logout deletes the current UserSession for
the authenticated user. JWT access-token validation is stateless, so an already issued access token
is not individually revoked in the database and remains valid until its short expiry; deleting the
session prevents future refreshes.

## Authorization & Access Isolation

Frontend route guards are navigation behavior only. Backend authorization is enforced for every
protected controller using the access-token guard and service-level ownership chain.

- Groups are listed from the user's memberships and loaded only when membership exists.
- Todo Lists first resolve their Group and require membership.
- Todos resolve their Todo List, then its Group membership.
- Subtasks resolve their parent Todo and follow the same chain.
- Group activity history also requires Group membership.

For inaccessible descendant resources, services translate parent-access failures into the same
entity-specific not-found response used for a missing resource. This avoids exposing whether a
foreign Group, Todo List, Todo, or Subtask exists. Integration and real-PostgreSQL E2E tests cover
cross-user isolation.

## Todo Lifecycle

New Todos are appended to their Todo List with rank `last rank + 1000`, or `1000` for the first
item. Reads exclude soft-deleted rows and use deterministic rank ordering.

Completion accepts a boolean target state. It stores Active (`10`) or Completed (`20`), sets or
clears `completedAt`, and records the authenticated updater. The backend supports both completing
and reopening even though the current frontend only exposes completion.

Completion, reopening, and deletion are transition-aware. Repeating an already-confirmed target
state does not create another transition activity. Delete is a soft delete, and deleted Todos are
excluded from normal reads; child Subtasks become inaccessible through the active parent chain.

Creation, real completion transitions, reorder, and deletion record representative activities such
as `TODO_CREATED`, `TODO_COMPLETED`, `TODO_UNCOMPLETED`, `TODO_REORDERED`, and `TODO_DELETED`.

## Todo Ordering / Drag-and-Drop Contract

The server exposes this intent-based endpoint:

```text
PATCH /api/v1/todos/:todoId/reorder
```

Request body:

```json
{
  "beforeTodoId": "next-todo-id"
}
```

- A non-null `beforeTodoId` places the moved Todo immediately before that Todo.
- `null` moves the Todo to the end.
- The Todo List is derived from the moved Todo; the client does not submit a list ID.
- The anchor must be another active Todo in the same Todo List.
- A self anchor is a validation error. Missing, inaccessible, and cross-list anchors receive the
  generic Todo not-found response.
- The client never submits raw rank values.

Todo rank is stored as PostgreSQL `Decimal(20,10)`. The normal calculation is intentionally small:

- between two Todos: midpoint of their ranks;
- beginning: first rank minus `1000`;
- end: last rank plus `1000`.

Reads are ordered by rank, then `createdAt`, then ID, which keeps ties deterministic.

A request that resolves to the current array position is a no-op:

```text
same position
→ no Todo write
→ no TODO_REORDERED activity
```

If scale or numeric bounds leave no strictly representable rank between neighbors, only the
affected Todo List is rebalanced in desired order to `1000`, `2000`, `3000`, and so on. Maintenance
writes from that rebalance do not create activity events; the persisted user reorder creates one
`TODO_REORDERED` event.

## Reorder Transaction & Concurrency

Reorder uses a normal interactive Prisma transaction. Within it, the server reads the authoritative
active list order, validates the anchor, updates/rebalances ranks, and writes `TODO_REORDERED` for a
real change. A failed activity write rolls back the rank changes, so ordering and activity are
atomic.

The transaction does not request Serializable isolation, and there is no server retry loop,
distributed lock, or special conflict response. The frontend has a per-rendered-Todo-List
synchronous interaction lock, but that is UX protection rather than a distributed concurrency
guarantee. Pathological concurrent reorder coordination is intentionally outside this assignment's
scope.

## Subtasks

A Subtask belongs to one active Todo and inherits access through Todo → Todo List → Group
membership. New Subtasks append at `last rank + 1000` and reads order by rank, `createdAt`, then ID.

The API supports create, read, completion/uncompletion, and soft deletion. Real state transitions
and deletion are recorded transactionally in ActivityEvent. Subtask ranks are persisted, but there
is no Subtask reorder endpoint and no Subtask drag-and-drop contract.

## Activity Events

ActivityEvent provides Group-scoped audit/history infrastructure. Representative events include
Todo List creation; Todo creation, completion, reopening, reorder, and deletion; and Subtask
creation, completion, reopening, and deletion.

Relevant services write the entity mutation and its activity inside the same Prisma transaction.
No-op completion and reorder requests do not create duplicate activity. History is exposed through
an authenticated, cursor-paginated Group endpoint ordered newest first.

ActivityEvent remains separate from realtime collaboration infrastructure. It is persistent
Group-scoped audit/history; realtime events are ephemeral TodoList-scoped invalidation notices.
Realtime publication does not create additional ActivityEvent rows or expose ActivityEvent data.

## Server-side Realtime Collaboration

The server publishes ephemeral collaboration notifications after TodoList, Todo, or Subtask
mutations persist. PostgreSQL and the REST API remain authoritative, and the client treats each
notification as a signal to refetch the relevant query.

Each SHARED Group has a `group:{groupId}` channel for TodoList-level changes. Each TodoList has a
`todo-list:{todoListId}` channel for Todo and Subtask changes. This server does not expose a realtime
token endpoint; client-side Ably configuration is handled directly by the frontend setup.

The current application-owned event contract is intentionally limited to:

- `TODO_LIST_CREATED`: `{ type, groupId, todoListId }`
- `TODO_CREATED`: `{ type, todoListId, todoId }`
- `TODO_COMPLETION_CHANGED`: `{ type, todoListId, todoId }`
- `TODO_REORDERED`: `{ type, todoListId, todoId }`
- `SUBTASK_CREATED`: `{ type, todoListId, todoId, subtaskId }`
- `SUBTASK_COMPLETION_CHANGED`: `{ type, todoListId, todoId, subtaskId }`

Completion events use neutral `*_COMPLETION_CHANGED` names because the existing API supports both
completion and reopening. No event is published for a completion or reorder no-op.

Publication is best-effort and happens only after the Prisma transaction resolves successfully. A
database or ActivityEvent failure produces no notification. If Ably publication fails after commit,
the server logs structured non-secret context and preserves the successful REST result; clients can
converge by refetching authoritative REST state. There is deliberately no outbox, retry queue,
history/replay, presence, or generic event bus in this slice.

## Validation & Error Handling

The global ValidationPipe is configured with transformation, whitelisting, and rejection of unknown
fields. DTOs use class-validator and class-transformer for required fields, types, trimming, enum
membership, and supported length/date constraints.

Application failures use stable `ErrorCode` values. The global exception filter maps them to HTTP
statuses and returns either:

```json
{
  "code": "TASK_NOT_FOUND"
}
```

or field-level validation details:

```json
{
  "code": "VALIDATION_ERROR",
  "errors": [{ "field": "title", "messages": ["title should not be empty"] }]
}
```

Known not-found, authentication, conflict, and validation cases use their mapped status. Unexpected
errors are logged and returned as `INTERNAL_ERROR` without exposing internal context. Inaccessible
resources use the generic entity not-found behavior described above.

## Logging & Observability

The application uses Winston console logging through a Nest-compatible logger. Development output
is human-readable and colorized; production output is structured JSON.

Request middleware accepts a non-empty incoming `x-request-id` or creates a UUID, echoes it in the
response, and carries it through AsyncLocalStorage so application logs can include it. Startup logs
report the application and Swagger URLs outside production. Domain services log successful
mutations, and the global exception filter logs unexpected/5xx failures with method and path.

`GET /api` is the application health/welcome endpoint used by Docker Compose and Railway
healthchecks. No metrics exporter, distributed tracing, external log aggregation, or general
request-access log is configured.

## Database & Prisma

PostgreSQL is the only configured datasource. Prisma defines the schema and migrations under
`prisma/`; the runtime client uses `DATABASE_URL`, while Prisma CLI migration commands use
`DIRECT_URL`. Test mode uses the corresponding E2E variables.

Apply committed migrations with:

```bash
pnpm prisma:migrate:deploy
```

Use `pnpm prisma:migrate:dev` only when developing a new migration. Todo List, Todo, and Subtask
ranks use PostgreSQL `Decimal(20,10)`. Prisma transactions coordinate multi-write domain changes
and their activity records.

## API & OpenAPI

The global API prefix is `/api`; feature controllers use URI version `v1`. Interactive Swagger UI
is served at `/api/docs`.

Application startup creates the Swagger document from controller and DTO metadata and writes it to:

```text
server/generated/openapi.yml
```

The frontend generation flow is currently explicit:

```text
start the server to refresh server/generated/openapi.yml
→ copy the reviewed document to client/openapi/openapi.yml
→ run pnpm api:generate from client/
→ consume generated Axios APIs and DTOs
```

There is no combined cross-project sync script. Server/client OpenAPI documents should be reviewed
together when the contract changes. Generated OpenAPI client files must not be edited manually.

## Testing Strategy

### Unit

```bash
pnpm test:unit
```

Unit tests isolate services, repositories, token/session logic, validation/error formatting,
logging, configuration, and OpenAPI decorators with focused mocks. Todo ordering tests cover
deterministic reads, no-op behavior, invalid anchors, normal rank placement, and local rebalance.

### Integration

```bash
pnpm test:integration
```

Integration suites create focused Nest applications around the HTTP controllers. They exercise
real routing, JWT guards, DTO validation, versioning, error filters, and response mapping while
mocking the feature service boundary. Coverage includes auth, Groups, Todo Lists, Todos, Subtasks,
access behavior, completion, deletion, and the reorder request contract.

### E2E

```bash
pnpm test:e2e
```

E2E suites start the real AppModule in-process, send HTTP requests with Supertest, and persist
through Prisma to a dedicated real PostgreSQL database. The command deploys migrations first and
does not reset existing test data.

Current E2E stories cover the application health/request ID, registration and login journey,
logout/refresh-session revocation, Groups/Todo Lists/Todos persistence, Todo completion, cross-user
isolation, Subtask completion and activity, soft deletion, paginated activity history, Todo reorder
persistence, invalid/cross-list anchors, no-op behavior, authorization, and rollback when an
activity write fails.

## Docker & Deployment

The multi-stage Dockerfile builds with Node.js 24 and pnpm 11, generates Prisma Client, compiles the
Nest application, prunes development dependencies, and runs the production output as the non-root
`node` user.

Docker Compose builds and runs only the API container. It does not provision PostgreSQL; the `.env`
connection strings must point to an accessible database. The container exposes port 3000 (or
`SERVER_PORT` on the host) and healthchecks `GET /api`.

```bash
pnpm docker:up
pnpm docker:logs
pnpm docker:down
```

[`railway.json`](railway.json) selects the Dockerfile build, watches `/server/**`, runs
`prisma migrate deploy` as a pre-deploy command, checks `/api`, and restarts failed deployments up
to the configured retry limit. The repository does not define a broader production topology or
horizontal-scaling guarantee.

## Known Trade-offs

- The server now publishes a narrow set of TodoList invalidation notifications, but the client does
  not subscribe yet and there is no offline conflict protocol.
- ActivityEvent is audit/history, not a client synchronization mechanism.
- Todo ordering uses fractional Decimal ranks with a small list-local rebalance on exhaustion.
- Reorder has no distributed lock, Serializable isolation, or generalized retry framework.
- Subtask order is persisted, but no Subtask reorder endpoint is exposed.
