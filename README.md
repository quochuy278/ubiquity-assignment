# Ubiquiti Full-Stack Assignment

This repository contains a collaborative todo application built for the Ubiquiti full-stack
assignment. Users organize Lists inside personal or shared Workspaces, create Todos and Subtasks,
track completion, and persist Todo priority through drag-and-drop ordering. Shared Workspaces add
in-app invitations and realtime collaboration.

The frontend uses **Workspace** and **List** as the product terminology. The backend and API retain
the domain names `Group` and `TodoList`.

## Product Flows

### Personal first use

**Register or log in → create a first List through guided onboarding → arrive directly in the List
→ Quick Add Todos with Enter → complete Todos and Subtasks → reorder Todos.**

The onboarding action creates a `PERSONAL` Workspace named `Personal` behind the scenes, then
creates the named List and opens it. After onboarding, Lists remain organized inside Workspaces.
Quick Add is the normal fast path for creating a Todo; a secondary dialog also accepts a
description.

### Shared collaboration

**OWNER creates a `SHARED` Workspace → invites an existing registered user → invitee sees the
pending invitation in-app → invitee accepts → invitee joins as `MEMBER` → both users collaborate.**

Supported List, Todo, and Subtask changes propagate to other clients viewing the same shared
Workspace without a manual refresh. Invitation delivery itself is not realtime and no email is
sent.

## What Is Implemented

- Registration, login, logout, protected resources, and persisted refresh-token rotation.
- `PERSONAL` and `SHARED` Workspaces containing Lists, Todos, and Subtasks.
- Quick Add Todo, description-capable Todo creation, completion, Subtask progress, and dynamic
  document titles.
- Pointer and keyboard Todo reordering with deterministic, persisted database ranks.
- OWNER-created invitations for existing users and authenticated in-app acceptance as `MEMBER`.
- Membership-based authorization and not-found isolation for inaccessible Workspace resources.
- Realtime synchronization of supported changes in `SHARED` Workspaces through Ably.
- Persistent activity records for relevant Workspace, List, Todo, and Subtask changes.
- Structured application logging, request IDs, DTO validation, and stable application errors.
- Interactive OpenAPI documentation and an OpenAPI-generated frontend API client.
- PostgreSQL migrations, automated tests, CI, and tag-driven production deployment.

The Todo and Subtask completion APIs support completion and reopening. The current frontend
exposes completion but does not show a Reopen action.

## Assignment Story Coverage

| User story | Status | Notes |
| --- | --- | --- |
| Create todo items | Implemented | Quick Add creates Todos immediately; the detailed dialog also accepts a description. |
| Realtime collaboration | Implemented | Supported changes in `SHARED` Workspaces notify subscribed clients, which refetch authoritative REST state. |
| Persistence after restart | Implemented | Workspaces, Lists, Todos, Subtasks, completion state, and Todo order are stored in PostgreSQL. |
| Offline editing and sync | Not implemented | The application is online and server-authoritative. |
| Mark todo as done | Implemented | Active Todos and Subtasks can be completed. |
| Drag-and-drop ordering | Implemented | Top-level Todos support pointer and keyboard sorting, and their order survives reloads. |
| Subtasks and progress | Implemented | Subtasks can be added and completed, with a completed/total count per Todo. |
| Cost / price | Not implemented | No cost or pricing fields are exposed. |
| Markdown descriptions | Not implemented | Todo descriptions are plain text. |
| Share via unique link | Not implemented | Deep links require authentication and Workspace membership; there is no public sharing. |

## Realtime, REST, and Persistence

PostgreSQL-backed REST responses are the source of truth. For a supported mutation in a `SHARED`
Workspace, the server commits the authoritative REST/database change and then publishes an Ably
event. Subscribed clients invalidate the relevant TanStack Query entry and refetch it through REST.
This keeps collaborators converged without treating realtime messages as replicated state.

`PERSONAL` Workspaces neither publish nor subscribe to collaboration channels. Reloading is not
part of the collaboration workflow; it is simply another fresh read, and persisted Todo state and
ordering survive it. The application does not provide offline synchronization.

## Roles and Access

| Role | Product behavior |
| --- | --- |
| `OWNER` | Can collaborate and invite existing registered users to a `SHARED` Workspace. |
| `MEMBER` | Can collaborate but cannot invite. |
| Outsider | Cannot access the Workspace or its descendant resources. |

`ADMIN` exists in the domain/OpenAPI enum but has no product creation or management flow and cannot
invite. This is a narrow membership model, not a complete RBAC system.

## Try It

- **Frontend demo:** [https://ubiquity-assignment.vercel.app](https://ubiquity-assignment.vercel.app)
- **Backend API / healthcheck:**
  [https://ubiquity-assignment-production.up.railway.app/api](https://ubiquity-assignment-production.up.railway.app/api)
- **Production OpenAPI UI:**
  [https://ubiquity-assignment-production.up.railway.app/api/docs](https://ubiquity-assignment-production.up.railway.app/api/docs)
- **Local OpenAPI UI:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

The deployed URLs currently respond, but repository evidence does not establish that the deployed
builds match the current checkout.

## Run Locally

Prerequisites: Node.js 24, pnpm 11, and an accessible PostgreSQL database. A valid Ably API key is
required; the browser credential should have subscribe-only Ably capability.

Start the API:

```bash
cd server
cp .env.example .env
# Set DATABASE_URL, DIRECT_URL, and ABLY_KEY. CORS_ORIGIN defaults to * in development.
pnpm install
pnpm prisma:migrate:deploy
pnpm start:dev
```

The API defaults to [http://localhost:3000](http://localhost:3000), its health/welcome endpoint is
`GET /api`, and Swagger UI is at `/api/docs`. Development CORS defaults to `*`; production requires
an explicit `CORS_ORIGIN`.

In a second terminal, start the frontend:

```bash
cd client
cp .env.example .env
# Replace ABLY_KEY with a valid subscribe-only browser credential.
pnpm install
pnpm dev
```

The client defaults to [http://localhost:5173](http://localhost:5173), and the supplied environment
example points `VITE_API_BASE_URL` to the local API. Both applications require `ABLY_KEY`; it is not
an optional collaboration toggle. See the [client](client/README.md) and
[server](server/README.md) documentation for every environment variable and command.

## Architecture

- **Client:** React 19, React Router, TanStack Query, generated Axios APIs, Ably React, and dnd-kit.
- **Server:** NestJS 11, Prisma 7, PostgreSQL, JWT/refresh sessions, Ably REST publishing, and
  Swagger/OpenAPI.
- **Authorization:** controllers require authentication; services resolve Group membership before
  returning or mutating Workspace resources.
- **Ordering:** the client sends relative reorder intent; the server owns Decimal ranks and performs
  a list-local rebalance if rank space is exhausted.
- **Activity vs realtime:** activity events are durable audit/history records; Ably events are
  ephemeral invalidation notices sent after successful database mutations.

## Testing and CI

The client test suite covers authentication, routing, guided first-list onboarding, Quick Add,
Workspace/List/Todo/Subtask interactions, invitations, ordering, and realtime invalidation. The
server has unit and HTTP-boundary integration suites plus E2E suites against a real PostgreSQL
database.

The shared customer story exercises the production invitation API: an OWNER registers and creates a
`SHARED` Workspace, invites another registered user, the invitee accepts as `MEMBER` and
collaborates, the OWNER observes persisted changes, and an outsider remains isolated. Realtime
publication is covered separately with focused tests; server E2E replaces the publisher with a
no-op and does not connect to Ably.

```bash
cd client
pnpm check:all
```

```bash
cd server
# Configure .env.test.local as described in server/test/e2e/README.md first.
pnpm check:all
```

On normal pushes to `master`, GitHub Actions runs client typechecking, lint/format checks, tests,
and a production build when client paths change. Server CI runs typechecking, lint/format checks,
unit, integration, and real-PostgreSQL E2E tests, validates the Prisma schema, and builds the API
when server paths change.

## Production Deployment

- **Frontend:** Vercel builds the Vite application with `VITE_API_BASE_URL`, optional
  `VITE_API_TIMEOUT_MS`, and required `ABLY_KEY`. `client/vercel.json` disables automatic
  deployment from `master` and rewrites application routes to `index.html` for SPA fallback.
- **Backend:** Railway builds `server/Dockerfile`, runs `prisma migrate deploy` before deployment,
  and checks `GET /api`. Production startup requires `PORT`, `AUTH_ACCESS_TOKEN_SECRET`,
  `CORS_ORIGIN`, `DATABASE_URL`, `DIRECT_URL`, and `ABLY_KEY`. Configure `CORS_ORIGIN` as the
  deployed frontend origin in Railway runtime variables; the release workflow does not pass it.

Production releases are explicit and tag-driven. A full release deploys the selected, already
verified commit without rerunning the complete client and server suites. The release workflow does
not independently enforce that the tag commit belongs to `master` or that normal CI succeeded.

| Tag | Verification and deployment |
| --- | --- |
| `release/client-vX.Y.Z` | Runs client CI, then deploys only the Vercel frontend. |
| `release/server-vX.Y.Z` | Runs server CI, then deploys only the Railway backend. |
| `release/vX.Y.Z` | Deploys both the Vercel frontend and Railway backend from the tagged commit without rerunning the full suites. |

Operational prerequisite: create a full release tag only from the intended `master` commit after
Client CI and Server CI are green for the source being released.

Prerelease suffixes accepted by the workflow are also supported. A tag describes deployment
intent; it is not evidence that the current checkout has been released.

## Project Structure

- [`client/`](client/) — React frontend and generated OpenAPI client.
- [`server/`](server/) — NestJS API, Prisma schema/migrations, and server tests.

## Known Limitations and Trade-offs

- **Invitations and membership:** Invitees must already be registered. Invitations are shown and
  accepted in-app; there is no email delivery or decline/revoke control. The product has no member
  removal, role changes, leaving, ownership transfer, or `ADMIN` management flow.
- **Realtime:** Realtime covers supported List, Todo, and Subtask changes only in `SHARED`
  Workspaces. REST/database state remains authoritative. There is no offline mutation queue,
  conflict resolution, replay, or presence. The browser uses an exposed subscribe-only Ably key
  instead of server-issued per-user capabilities.
- **Personal Workspace presentation:** First-use onboarding hides the Workspace layer, while regular
  navigation exposes Workspaces for a consistent personal/shared hierarchy. A future UX could
  present personal Lists more directly and keep the default personal Workspace as an implementation
  detail.
- **Concurrent ordering:** Persisted fractional ranks and list-local rebalancing cover normal
  ordering. High-contention concurrent reorders have no distributed lock, Serializable transaction,
  or conflict-resolution protocol.
- **Authentication:** The access token is memory-only; the refresh token is stored in
  JavaScript-accessible `localStorage`. Logout prevents future refreshes, while an issued access
  token remains valid until its 15-minute expiry.
- **Test scope:** Backend E2E uses the real application module and PostgreSQL in-process but does not
  restart the application process. Browser-level full-stack E2E is outside the assignment scope.
- **Omitted stories:** No offline editing/sync, Markdown rendering, cost tracking, or public sharing.
  Drag-and-drop applies only to top-level Todos within one List; Subtasks keep creation order.
