# Backend Design Decisions

## Purpose

This document captures the architectural decisions made for the backend implementation, the reasoning behind them, and the trade-offs that were intentionally accepted.

The goal is to optimize for maintainability, simplicity, and clear ownership boundaries rather than implementing every possible future feature.

---

# Decision 1 — Group as the Collaboration Boundary

## Decision

The system introduces a **Group** as the ownership boundary for collaboration.

Every Todo belongs to exactly one Group.

Groups can be:

* Personal
* Shared

A newly registered user automatically receives one Personal Group.

## Why

The assignment requires both:

* personal task management
* collaborative task management

Instead of having two different ownership models, both scenarios use the same abstraction.

Examples:

Personal

```
User
    ↓
Personal Group
    ↓
Todo
```

Shared

```
User A
      \
       Membership
        \
         Group
        /
       Membership
      /
User B
```

## Benefits

* One permission model
* One ownership model
* No duplicated business logic
* Easy future expansion for collaboration

## Trade-offs

The domain introduces one extra entity (Group), but eliminates conditional logic throughout the application.

---

# Decision 2 — Membership Models Authorization

## Decision

Permissions are relationship-based rather than user-based.

A Membership connects a User with a Group.

```
Membership

- groupId
- userId
- role
```

## Why

A user may have different permissions in different groups.

Example:

```
John

Personal Group
OWNER

Family
MEMBER
```

Keeping permissions inside Membership naturally supports this scenario.

## Benefits

* Clear permission boundary
* No role duplication
* Simple authorization checks

---

# Decision 3 — Fixed Roles

## Decision

Roles are implemented as an enum.

```
OWNER
ADMIN
MEMBER
```

Permission rules are implemented in Policy classes.

## Why

The current product contains only a small, fixed set of roles.

A database-driven RBAC solution would introduce unnecessary complexity.

## Trade-offs

Permissions cannot be configured dynamically.

If future requirements require customizable permissions, the Policy layer can be replaced without changing controllers or services.

---

# Decision 4 — TodoList Organizes Work

## Decision

A Group may contain multiple Todo Lists.

```
Group

├── Shopping
├── Chores
└── Vacation
```

Todos belong to a TodoList.

```
Todo

- todoListId
```

## Why

TodoList represents organization.

Group represents ownership.

Todo represents executable work.

Each entity has one responsibility.

---

# Decision 5 — Todo is Ownership-Agnostic

## Decision

Todo does not reference User or Group directly.

```
Todo

↓

TodoList

↓

Group
```

## Why

Ownership and authorization belong to Group.

Todo only contains business data.

This separation makes future extensions such as:

* subtasks
* comments
* attachments
* labels

much easier.

---

# Decision 6 — Position-Based Ordering

## Decision

Todos are ordered using a rank field.

Example:

```
1000
2000
3000
```

Reordering updates only the moved Todo.

## Why

This avoids rewriting the entire list after every drag-and-drop operation.

## Future

If ordering density becomes high, a rebalance strategy or fractional ranking algorithm can be introduced.

---

# Decision 7 — Authorization Pipeline

Every request follows the same authorization pipeline.

```
Request

↓

Authentication

↓

Membership lookup

↓

Policy evaluation

↓

Business validation

↓

Repository

↓

Database
```

Business rules remain inside the domain layer rather than controllers.

---

# Decision 8 — Activity Logging

Important domain events are stored separately from business entities.

Examples:

* Todo created
* Todo completed
* Member invited
* Member joined

The ActivityEvent table provides an audit trail without polluting domain entities.

---

# Decision 9 — API Simplicity

REST resources follow aggregate boundaries.

Examples:

```
GET    /groups

GET    /groups/:id

GET    /groups/:id/lists

GET    /lists/:id/todos

POST   /lists/:id/todos

PATCH  /todos/:id

PATCH  /todos/:id/reorder
```

---

# Decision 10 — Explicit Trade-offs

The implementation intentionally avoids:

* database-driven RBAC
* generic permission engine
* event sourcing
* CQRS
* polymorphic ownership
* microservices

These decisions keep the implementation focused on the assignment while leaving clear extension points for future iterations.

---

# Guiding Principles

* Prefer explicit business models over technical abstractions.
* Keep one responsibility per entity.
* Authorization belongs to Membership.
* Ownership belongs to Group.
* Organization belongs to TodoList.
* Execution belongs to Todo.
* Optimize for readability before optimization.
* Introduce complexity only when the product requires it.
