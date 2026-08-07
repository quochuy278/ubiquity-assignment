# Engineering Guidelines

This document defines the engineering conventions that should be followed when making changes to this repository.

The goal is to keep the codebase consistent, maintainable, type-safe, and operationally clear. Prefer existing patterns and simple solutions over introducing unnecessary abstractions.

## TypeScript

* TypeScript strictness must be preserved.
* Do not use explicit `any`, including `as any`, to bypass type errors.
* Prefer `unknown` for untrusted or externally sourced values and narrow the type explicitly before use.
* Do not weaken existing types to make code compile.
* Prefer explicit domain types over loosely typed objects when the structure is known.
* Fix the underlying type problem rather than suppressing TypeScript errors.

## Imports

Import only what is required.

Prefer named imports:

```ts
import { defaultTo, groupBy } from 'lodash';
```

Do not use wildcard imports:

```ts
import * as lodash from 'lodash';
```

Avoid importing an entire module when only a small subset of its functionality is required.

Keep imports explicit so dependencies remain easy to understand and bundlers can eliminate unused code where applicable.

## Service Boundaries

Services communicate with other domains through their corresponding services.

For example, if `TaskService` needs group-related behaviour, it should communicate through `GroupService` rather than directly accessing `GroupRepository`.

Avoid reaching into another domain's repository, persistence implementation, or internal details.

Keep ownership boundaries explicit:

```text
Controller
    ↓
Service
    ↓
Repository
```

Cross-domain interaction should happen through service boundaries:

```text
TaskService
    ↓
GroupService
    ↓
GroupRepository
```

Repositories are persistence concerns of their owning service/domain.

## Database Reads

Every database read that can return multiple records must define an explicit, deterministic sort order before the records are returned.

Specify the ordering in the database query whenever the persistence API supports it. Either ascending or descending order is acceptable, but relying on a database's implicit or insertion order is not.

Prefer:

```ts
prisma.task.findMany({
  orderBy: [
    { createdAt: 'desc' },
    { id: 'asc' },
  ],
});
```

Do not perform an unordered collection read:

```ts
prisma.task.findMany();
```

Paginated reads must include a stable, unique tie-breaker such as `id` when the primary sort field is not unique. This prevents records from moving unpredictably between pages.

Single-record lookups by a unique key, aggregate queries, and existence checks are exempt because ordering does not apply to their result shape.

## Reuse and DRY

Prefer reusable shared logic when the same behaviour has a clear possibility of being used in multiple places.

* Extract generic, stateless helpers into appropriate utility modules.
* Extract shared domain behaviour into the appropriate shared/domain location.
* Reuse existing utilities before implementing equivalent functionality.
* Avoid duplicating business rules across services or controllers.
* Keep reusable logic independent from unnecessary application state.

However, do not create abstractions solely for hypothetical future requirements.

Prefer a small amount of obvious code over a premature generic abstraction. Refactor when a reusable responsibility or pattern is clear.

## Date and Time

Do not use `new Date()` directly in application code.

Use `dayjs` consistently for date and time operations.

Prefer a shared time utility when the same operation is needed repeatedly. For example:

```ts
export const now = () => dayjs();
```

Time-dependent business logic must have explicit timezone context.

If an operation depends on local time, the timezone must be available from an authoritative source such as:

* the persisted domain/entity configuration;
* the request payload;
* the calling client or integration.

Do not silently assume the server timezone or the user's timezone.

If the required timezone is unavailable, do not execute timezone-dependent business logic. Require the caller to provide it or fail explicitly.

Store and transport timestamps in a consistent canonical representation where possible, and apply timezone-specific interpretation only where the business rule requires it.

## Logging

Prefer structured logging with meaningful context.

Important processes should provide enough context to understand both successful and failed execution.

Prefer:

```ts
logger.info('Task created', {
  taskId,
  groupId,
});
```

over:

```ts
logger.info(`Task ${taskId} created for group ${groupId}`);
```

Include identifiers and business context that are useful for debugging, but do not duplicate request metadata already supplied by global logging context.

Log at meaningful process boundaries rather than logging every internal operation.

Avoid duplicate error logs. When an error is propagated upward, prefer logging it once at the layer responsible for handling it.

Expected application outcomes such as validation failures or normal not-found responses should not be logged as errors unless they are operationally significant.

Never log secrets, credentials, tokens, or sensitive payloads.

## Error Handling

Use semantic application errors for expected failure cases.

Application and domain errors should not depend directly on HTTP concepts.

Prefer:

```ts
throw new AppError(ErrorCode.TASK_NOT_FOUND, {
  taskId,
});
```

rather than throwing transport-specific errors from application services.

Map application errors to HTTP status codes at the HTTP boundary.

Attach diagnostic context when it helps identify the affected resource or operation.

Internal diagnostic context, exception details, and stack traces must not be exposed directly to API consumers.

Unexpected errors should be logged with sufficient context and mapped to a safe generic API error.

## OpenAPI and Swagger

Document API operations through the shared `ApiEndpoint` decorator so operation metadata, request inputs, success responses, and common error responses remain consistent.

Every documented success or additional response must declare its DTO class through `type`. Request bodies must also declare their DTO class through `type`.

When documenting an array, declare the element DTO and set `isArray: true`:

```ts
{
  type: TaskResponseDto,
  isArray: true,
}
```

Do not wrap the DTO in an array:

```ts
{
  type: [TaskResponseDto],
}
```

Whenever a Swagger schema or parameter uses an enum, declare both `enum` and a stable `enumName`. Reusing a named enum schema prevents duplicate generated enum definitions.

Prefer:

```ts
{
  enum: TaskStatus,
  enumName: 'TaskStatus',
}
```

Do not declare an enum without `enumName`.

## Large Data Processing

When processing large or potentially unbounded datasets, prefer streaming or incremental processing over loading the entire dataset into memory.

Avoid unnecessary buffering when data can be:

* streamed;
* paginated;
* processed in batches;
* consumed incrementally.

Choose batch sizes and concurrency deliberately when external services or databases are involved.

For small and naturally bounded datasets, prefer the simpler implementation rather than introducing streaming complexity unnecessarily.

## Lodash

Use existing Lodash utilities when they make the implementation clearer and avoid unnecessary custom utility code.

For example, utilities such as:

```ts
defaultTo(...)
groupBy(...)
keyBy(...)
uniqBy(...)
```

may be preferred when they express the operation more clearly than custom implementations.

Do not use Lodash merely to replace simple, idiomatic JavaScript or TypeScript.

Import only the functions that are required. Never use wildcard Lodash imports.

## Architecture and Scope

Prefer the simplest implementation that correctly satisfies the current requirement.

* Follow existing project architecture and conventions.
* Reuse existing components and utilities before introducing new ones.
* Do not introduce abstractions for hypothetical requirements.
* Do not add dependencies without a concrete reason.
* Do not refactor unrelated code while implementing a task.
* Keep controllers focused on transport concerns.
* Keep business logic in services/domain logic.
* Keep persistence concerns behind the owning service/repository boundary.
* Prefer explicit and understandable code over clever abstractions.

When a requested change conflicts with an established architectural rule, identify the conflict rather than silently bypassing the rule.
