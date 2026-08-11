# Client

The client is the browser application for authentication and the Groups → Todo Lists → Todos →
Subtasks workflow. It owns presentation and interaction state while treating the API as the source
of truth for authenticated users and domain data. See the [root README](../README.md) for the
product overview and assignment story status.

## Tech Stack

- React 19 and TypeScript
- Vite 8
- React Router 7
- TanStack Query 5
- Ably JavaScript SDK and React provider
- Zustand 5 (vanilla token store with persistence middleware)
- Axios
- Tailwind CSS 4
- shadcn-style components built on Base UI
- Base UI Toast for notifications
- dnd-kit for Todo sorting
- Vitest, jsdom, React Testing Library, and `user-event`
- Biome for formatting and linting
- OpenAPI Generator (`typescript-axios`)

## Getting Started

The CI-supported toolchain is Node.js 24 and pnpm 11. From `client/`:

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The development server uses Vite and normally runs at `http://localhost:5173`.

Useful package scripts:

```bash
pnpm dev             # start the Vite development server
pnpm lint            # run Biome linting
pnpm format:check    # check formatting without writing files
pnpm typecheck       # run the TypeScript project checks
pnpm test            # run the Vitest suite once
pnpm test:watch      # run Vitest in watch mode
pnpm build           # typecheck and create a production build
pnpm preview         # serve the production build locally
pnpm api:generate    # regenerate the OpenAPI Axios client
pnpm check:all       # lint/format CI check, typecheck, tests, and build
```

## Environment

The checked-in template is [`.env.example`](.env.example).

| Variable | Required | Purpose | Example |
| --- | --- | --- | --- |
| `VITE_API_BASE_URL` | Production: yes; development: no | Base URL used by Axios and the generated APIs. Development falls back to `http://localhost:3000`. | `http://localhost:3000` |
| `VITE_API_TIMEOUT_MS` | No | Positive integer request timeout in milliseconds. Defaults to `10000`. | `10000` |
| `ABLY_KEY` | Yes for the complete application | Browser credential used to subscribe to Group and TodoList channels. Production configuration rejects a missing value; this assignment expects its Ably capability to be subscribe-only. | `app.key:replace-me` |

Vite exposes both `VITE_*` variables and `ABLY_*` variables to the browser bundle. `ABLY_KEY` is an
intentional assignment simplification and must use a key whose Ably-side capability is
subscribe-only. Never hardcode or log its actual value.

## Frontend Architecture

The main dependency direction is:

```text
Pages / feature components
        ↓
Feature hooks
        ↓
TanStack Query hooks and mutations
        ↓
Generated OpenAPI API classes and DTOs
        ↓
Shared authenticated Axios client
        ↓
Backend
```

Important boundaries:

- `src/app/` composes application-wide providers for TanStack Query, routing, toasts, and
  tooltips.
- `src/router/` owns route declarations and public/protected route guards.
- `src/features/` contains product-facing pages, dialogs, controls, and thin feature hooks.
- `src/api/` owns query keys, query/mutation hooks, API error normalization, Axios transport, and
  generated-client wiring.
- `src/api/generated/` contains generated APIs and DTOs. It is not handwritten application code.
- `src/store/` contains the authentication token store only.
- `src/shared/components/` contains shared loading, error, async-action, and UI primitives.
- `test/` mirrors behavior at the API, router, store, shared-component, and feature boundaries.

## Routing & Navigation

Public-only routes:

- `/login`
- `/register`

Authenticated routes under the shared application layout:

- `/groups`
- `/groups/:groupId`
- `/groups/:groupId/lists/:todoListId`

The index route redirects to `/groups`. Unknown paths redirect through `/` and then to the
appropriate authenticated or public destination.

Protected routes wait for the current-user query before rendering. Unauthenticated users are sent
to `/login` with their attempted location in router state; authenticated users visiting login or
registration are sent to `/groups`.

Group and Todo List pages use semantic breadcrumbs. A Todo List deep link first loads the list and
checks that its `groupId` matches the `groupId` in the URL. A mismatched parent/child URL redirects
to `/groups` rather than rendering a false hierarchy. Backend membership checks remain the actual
authorization boundary.

## State Ownership

| State | Owner |
| --- | --- |
| Current user | TanStack Query: `['auth', 'me']` |
| Groups | TanStack Query |
| Todo Lists | TanStack Query |
| Todos | TanStack Query |
| Subtasks | TanStack Query |
| Query and mutation pending/error state | TanStack Query |
| Access and refresh tokens | Zustand vanilla store |
| Current route and navigation state | React Router |
| Dialog visibility, form values, and transient UI state | Local React components and native forms |

Domain entities are not copied into Zustand. TanStack Query already owns their cache, freshness,
request lifecycle, and invalidation, so duplicating them would create competing sources of truth.
Zustand is limited to token access because Axios needs to read and update tokens outside React.

## Authentication

Login and registration follow this path:

```text
login/register
→ receive access token, refresh token, and user
→ store the token pair
→ seed the current-user query
→ enter the protected application
```

The access token is memory-only. The Zustand persistence layer writes only the refresh token to
`localStorage` under `ubiquity.auth-token-state`. On a browser reload, the current-user query sees
the persisted refresh token; its request can then refresh the session if the access token is no
longer in memory.

Authenticated Axios requests attach the access token as a Bearer token. A `401` from a protected
request follows this path:

```text
authenticated request
→ 401
→ rotate the refresh token through the public refresh client
→ store the new token pair
→ retry the original request once
```

A shared in-memory `refreshPromise` deduplicates concurrent refresh attempts. Refresh endpoints and
other public auth endpoints are never recursively refreshed. If refresh fails, or a retried request
is still unauthorized, tokens are cleared, the current-user cache becomes `null`, and non-auth
queries are removed. Logout revokes the current backend session when an access token exists, then
clears local tokens and protected query data even if that request fails.

Because one persisted refresh-token key is used per browser profile, the storage model assumes one
active account per profile. The refresh token is available to JavaScript; this is not an HttpOnly
cookie design.

## OpenAPI Integration

The frontend contract source is [`openapi/openapi.yml`](openapi/openapi.yml). Running:

```bash
pnpm api:generate
```

deletes and regenerates `src/api/generated/` using the `typescript-axios` generator configuration
in [`openapi-generator.config.json`](openapi-generator.config.json).

The application currently wires generated `AuthApi`, `GroupsApi`, `TodoListsApi`, `TodosApi`, and
`SubtasksApi` classes through the shared Axios client. Request and response DTOs, enums, and method
signatures come from the same generated contract.

The contract flow is:

```text
backend OpenAPI document
→ client OpenAPI source
→ generated DTOs and API classes
→ feature query/mutation hooks
```

Generated files must not be edited manually. Update the backend contract, refresh the client copy
of the OpenAPI document, and run the generation command instead.

## TanStack Query & Cache Strategy

Query keys describe the smallest authoritative resource boundary:

```text
current user               ['auth', 'me']
all groups                 ['groups']
group detail               ['groups', groupId]
lists for a group          ['groups', groupId, 'todo-lists']
todo-list detail           ['todo-lists', todoListId]
todos for a list           ['todo-lists', todoListId, 'todos']
subtasks for a todo        ['todos', todoId, 'subtasks']
```

Normal mutation handling uses the server response to update the relevant cache immediately where
useful, then invalidates the narrow authoritative query so it converges with backend state. For
example:

- Create Todo and Complete Todo update, then invalidate only that Todo List's Todos query.
- Create or Complete Subtask affects only that Todo's Subtasks query.
- Todo reorder affects only the exact Todos query for its Todo List.

Groups, unrelated lists, and unrelated Todo/Subtask caches are not broadly invalidated.

## Async Actions & User Feedback

`SafeButton` wraps the existing shadcn Button API for promise-returning actions. It combines:

- a synchronous `useRef` lock acquired before calling the action;
- local and external pending state;
- disabled and `aria-busy` presentation;
- a default spinner with `Please wait...`;
- `pendingText` and fully custom `pendingContent` overrides; and
- lock release in `finally`, so success and failure both allow a later retry.

The shared `FormDialog` has a separate synchronous submit lock around the form's `onSubmit`
handler. This protects mouse submission and native Enter/keyboard submission during the small
window before React renders mutation pending state. It also prevents closing a form while its
submission is in progress.

Creation success and action success use toasts. Create-form mutation errors remain inline in the
dialog; completion and reorder errors use normalized error toasts. These guards prevent accidental
rapid duplicate interaction in the frontend. They are not backend idempotency guarantees.

## Todo Completion UX

An active Todo exposes a server-confirmed **Complete** action. The UI does not change status
optimistically: the mutation response updates the exact Todos cache, followed by a scoped
invalidation. A completed Todo is rendered with a completion icon, screen-reader text, muted text,
and a line-through treatment.

The current frontend deliberately does not display a Reopen action for completed Todos, although
the generated completion endpoint accepts either completion state. Subtasks follow the same UI
pattern: active items expose Complete, while completed items have an accessible completed state and
no reopen control.

## Subtasks

Each Todo card renders its own `TodoSubtasks` section. Subtasks support creation and completion and
are visually nested under their parent Todo. Progress is derived from authoritative Subtask query
data as `completed count / total count`; it is not stored as separate client state.

The current API exposes Subtasks per Todo, so the request pattern is:

```text
N visible Todos
→ N independent Subtask queries
```

This is intentionally documented as the current contract, not as a batched request. Each query and
mutation remains isolated by `queryKeys.subtasks.forTodo(todoId)`.

## Todo Drag and Drop

Top-level Todos are sortable with dnd-kit. Each card has a dedicated visible drag handle; the whole
card is not an activator, so completion and Subtask controls remain independently usable. Sorting
supports pointer and keyboard input.

Only Todos inside the current list are sortable. There is no cross-list drag and no Subtask
drag-and-drop.

On drag end:

```text
derive the new Todo array and beforeTodoId
→ cancel the exact Todos query
→ snapshot the previous cache
→ optimistically reorder that cache
→ call the generated reorder endpoint
→ reconcile the moved Todo with the server response
→ invalidate the exact Todos query
```

Moving to the end sends `beforeTodoId: null`. On failure, the previous cache snapshot is restored
and a normalized error toast is shown.

The frontend never calculates or sends raw rank values. Persisted ordering belongs to the backend.
A synchronous ref lock plus mutation pending state prevents another reorder for the same rendered
Todo List while one is in progress, without disabling completion or Subtask actions.

## Realtime Group and TodoList Synchronization

Realtime synchronization is part of the intended Group and TodoList flow when the Group has type
`SHARED`. A single application-level `AblyProvider` owns the shared realtime client. A valid Ably
key is required for the complete application, and production configuration rejects a missing key.

The Group page subscribes to `group:{groupId}` for TodoList creation. The TodoList page subscribes
to `todo-list:{todoListId}` for Todo and Subtask changes. Both features open a scoped
`ChannelProvider` only for `SHARED` Groups; `PERSONAL` Groups never attach a channel. Each server
event has an explicit `useChannel(channelName, eventName, handler)` subscription; Ably's React hooks
own subscription and channel lifecycle cleanup when the channel changes or unmounts. Presentation
components do not use Ably directly and the frontend never publishes messages.

Server messages are invalidation signals, not replicated state:

| Event | Exact TanStack Query invalidation |
| --- | --- |
| `TODO_LIST_CREATED` | `queryKeys.todoLists.forGroup(groupId)` |
| `TODO_CREATED` | `queryKeys.todos.forList(todoListId)` |
| `TODO_COMPLETION_CHANGED` | `queryKeys.todos.forList(todoListId)` |
| `TODO_REORDERED` | `queryKeys.todos.forList(todoListId)` |
| `SUBTASK_CREATED` | `queryKeys.subtasks.forTodo(todoId)` |
| `SUBTASK_COMPLETION_CHANGED` | `queryKeys.subtasks.forTodo(todoId)` |

The subsequent REST refetch remains authoritative for Todo ordering, completion, Subtasks, and
derived progress. TodoList, Todo, and Subtask collection queries always refetch when their feature
mounts, closing the gap for events emitted while that channel was not subscribed. Connection state
changes also invalidate the current list's Todos and the Subtask queries for currently rendered
Todos. Realtime connection or subscription failures do not clear query data, block mutations, or
replace the page with an error state.

## Error Handling

Axios failures are normalized into `ApiClientError`, preserving known backend error codes,
validation details, and HTTP status. Network, timeout, service, server, and unknown failures receive
stable user-facing messages.

- Authentication forms render normalized errors inline.
- Create dialogs render their mutation error inside the form.
- Completion and reorder actions use toast feedback.
- Page/resource queries render a retryable `ApiError` state.
- Authentication failure clears tokens and protected cached data before route guards redirect.

This covers the implemented application paths; it is not a claim that every possible browser or
network failure has a custom presentation.

## Testing

Vitest runs in jsdom with React Testing Library and `jest-dom` matchers. The suite focuses on
behavior rather than implementation details, including:

- token-store persistence and the Axios refresh lifecycle;
- login state, logout, protected/public route behavior, and auth failures;
- Group, Todo List, and Todo creation;
- breadcrumbs and direct deep-link parent/child validation;
- Todo and Subtask completion presentation;
- Subtask creation, progress, errors, pending behavior, and cache isolation;
- shared rapid-action and native form-submit locks;
- Todo reorder intent, keyboard parity, optimistic order, rollback, feedback, scoped invalidation,
  and pending protection.
- application-level Ably provider ownership, SHARED/PERSONAL channel eligibility, named event
  subscriptions, event-to-query invalidation, and reconnect convergence without the Ably network.

Run the suite with:

```bash
pnpm test
```

The drag-and-drop tests exercise the application's drag-end contract and cache behavior rather than
testing dnd-kit's internals.

## Generated Code

Do not edit `src/api/generated/` manually. Regenerate it from `openapi/openapi.yml` with:

```bash
pnpm api:generate
```
