# Ubiquiti Full-Stack Assignment

This repository contains a small collaborative todo application built for the Ubiquiti full-stack
assignment. I focused on a coherent, working journey: organize work into groups and lists, create
todos and subtasks, track completion, reorder priorities, and keep the result persisted.

## What I Built

The implemented product flow is:

**Register or log in → create a Group → create a Todo List → add Todos → add and complete
Subtasks → complete Todos → drag Todos to reorder them → refresh and keep the same
state and order.**

At a glance:

- Groups and Todo Lists organize a user's work.
- Todos support descriptions, completion, and drag-and-drop ordering.
- Subtasks can be added and completed, with visible progress for each Todo.
- Data is stored durably in PostgreSQL rather than in application memory.

## Assignment User Stories

The assignment allows candidates to select a subset of stories. This submission implements the
following set and leaves the remaining stories explicit:

**Status:** ✅ Implemented · ❌ Not implemented

| User story | Status | Notes |
| --- | --- | --- |
| ⭐ Create todo items | ✅ | Todos can be created inside a Todo List and are visible immediately. |
| Realtime collaboration | ✅ | Existing members of a SHARED Group receive the supported creation, completion, and reorder notifications and refetch authoritative API state. |
| Persistence after restart | ✅ | Groups, lists, Todos, Subtasks, completion, and Todo order are stored durably in PostgreSQL. |
| Offline editing and sync | ❌ | The application is online and server-authoritative. |
| Mark todo as done | ✅ | Active Todos can be marked as completed. |
| Drag and drop ordering | ✅ | Top-level Todos can be reordered with a pointer or keyboard and retain their order after refresh. |
| Subtasks and progress | ✅ | Users can add and complete Subtasks and see a completed count for each Todo. |
| Cost / price | ❌ | No cost or pricing fields are exposed in the product. |
| Markdown descriptions | ❌ | Todo descriptions are displayed as plain text. |
| Share via unique link | ❌ | Deep links require authentication and valid group access; public sharing was not selected. |

## Try It

- **Frontend demo:** [https://ubiquity-assignment.vercel.app](https://ubiquity-assignment.vercel.app)
- **Local API documentation:**
  [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

The complete application can also be tried locally using the steps below. The frontend runs at
[http://localhost:5173](http://localhost:5173) by default.

## How to Use It

1. Register a new account or log in.
2. Create a Group from the Groups page.
3. Open the Group and create a Todo List.
4. Open the list and add several Todos.
5. Add Subtasks and complete them to see the progress count change.
6. Complete a Todo and confirm its completed state.
7. Drag Todos by their handles to change their order. Keyboard sorting is also supported.
8. Refresh the page to verify that completion and ordering are persisted.

## Additional Features

Beyond the selected assignment stories, the application includes:

- Registration, login, logout, protected data, and refresh-token rotation.
- Groups and Todo Lists, so Todos have a usable organizational context.
- Membership-based access isolation between users.
- Realtime synchronization for existing members of SHARED Groups.
- Breadcrumb navigation and validation of directly opened Group and Todo List URLs.
- Activity records for relevant Group, Todo List, Todo, and Subtask changes, exposed through the
  API.
- Interactive OpenAPI documentation and a generated frontend API client.

## Run Locally

Prerequisites: Node.js 24, pnpm 11, and an accessible PostgreSQL database.

First, configure and start the API:

```bash
cd server
cp .env.example .env
# Set DATABASE_URL, DIRECT_URL, and ABLY_KEY in .env.
pnpm install
pnpm prisma:migrate:deploy
pnpm start:dev
```

Then start the frontend in a second terminal:

```bash
cd client
cp .env.example .env
# Set ABLY_KEY to a valid subscribe-only browser credential.
pnpm install
pnpm dev
```

The supplied client environment example already points to the local API on port 3000.

## Testing

The frontend has focused component and user-flow tests. The backend has unit and integration tests,
plus end-to-end stories that run against a real PostgreSQL database. CI checks both projects with
linting, type checking, and production builds, and also runs the backend test suites.

See the project-specific documentation for the complete commands and test setup.

## Production Releases

Production deployments are explicit and tag-driven:

```bash
git tag release/client-v1.0.0
git push origin release/client-v1.0.0
```

```bash
git tag release/server-v1.0.0
git push origin release/server-v1.0.0
```

```bash
git tag release/v1.0.0
git push origin release/v1.0.0
```

Client tags verify and deploy only the Vercel frontend, server tags verify and deploy only the
Railway backend, and generic release tags verify both applications before deploying both.

## Project Structure

- [`client/`](client/) — React frontend; see the [client documentation](client/README.md).
- [`server/`](server/) — NestJS API; see the [server documentation](server/README.md).

## Known Limitations and Trade-offs

This time-boxed assignment implements the core server-authoritative workflow while deliberately
keeping collaboration administration and production hardening narrow.

- **Collaboration and membership:** Users can create `PERSONAL` and `SHARED` Groups, and every
  Group creator receives an `OWNER` membership. The data model also defines `ADMIN`, `MEMBER`, and
  invitations, but there are no invitation, onboarding, or member-management API/UI flows. The
  current authorization path checks membership rather than role-specific permissions, so users
  cannot promote or demote members, change roles, remove members, or transfer ownership through the
  application. SHARED realtime therefore synchronizes existing members only.
- **Realtime and offline behavior:** A valid Ably key is required to run the complete application.
  Only `SHARED` Groups publish and subscribe to notifications for Todo List creation, Todo creation,
  Todo completion/reorder, and Subtask creation/completion; `PERSONAL` Groups do not use
  collaboration channels. Messages are best-effort change notifications that invalidate TanStack
  Query data, after which clients refetch PostgreSQL-backed REST state as the source of truth. There
  is no offline mutation queue, conflict-resolution protocol, outbox, event replay, or presence
  system.
- **Concurrent ordering:** Todo reorder operations use persisted fractional Decimal ranks and a
  list-local rebalance when rank space is exhausted. Normal reorder persistence is covered by tests,
  but concurrent operations do not use Serializable isolation, a distributed lock, or a retry and
  conflict-resolution protocol. A higher-contention production system would require stronger
  concurrency control.
- **Authentication:** The browser keeps the access token in memory and the refresh token in
  JavaScript-accessible `localStorage`, with one active account assumed per browser profile. Logout
  deletes the persisted refresh session, preventing further refreshes, but an already-issued access
  token remains valid until its 15-minute expiry.
- **Persistence and test coverage:** PostgreSQL provides durable persistence. Backend E2E tests use
  the real application module and a real PostgreSQL database in-process, but they do not restart the
  application process; browser-level full-stack E2E is also outside this assignment's test scope.
- **Intentionally omitted stories:** Offline editing/synchronization, Markdown rendering for Todo
  descriptions, cost/price tracking, and unauthenticated sharing through a public unique link were
  not selected. Drag-and-drop applies to top-level Todos within one list; Subtasks retain their
  persisted creation order.
- **Production hardening:** A larger system would replace the browser-exposed subscribe-only Ably
  key with server-issued, user-scoped capabilities and add stronger operational monitoring. These
  controls, broader member administration, and high-contention reorder coordination are outside the
  assignment scope.
