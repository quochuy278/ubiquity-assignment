# DOMAIN.md

# Domain Model

This document describes the business domain and the responsibility of each entity.

The goal is to make ownership boundaries explicit and establish a common vocabulary across the backend implementation.

---

# Domain Overview

```text
User
 │
 ├───────────────┐
 │               │
 ▼               ▼
UserSession   Membership
                  │
                  ▼
               Group
        (Personal / Shared)
                  │
     ┌────────────┼────────────┐
     ▼            ▼            ▼
 TodoList   Invitation   ActivityEvent
     │
     ▼
    Todo
     │
     ▼
   SubTask
```

---

# User

Represents an authenticated person using the application.

A User owns identity but does not own tasks directly.

Responsibilities:

* Authentication
* Profile information
* Account lifecycle

A User may belong to multiple Groups.

---

# UserSession

Represents an authenticated login session.

Responsibilities:

* Refresh token lifecycle
* Device tracking
* Session expiration

Sessions are independent from authorization.

---

# Group

Represents the collaboration boundary.

Every Todo ultimately belongs to exactly one Group.

Groups define:

* ownership
* collaboration
* permissions
* visibility

Two group types currently exist:

* PERSONAL
* SHARED

Examples:

Personal

```text
My Tasks
```

Shared

```text
Family

Roommates

Friends
```

A Group may contain multiple Todo Lists.

---

# Membership

Represents the relationship between a User and a Group.

Responsibilities:

* authorization
* role assignment
* membership lifecycle

Supported roles:

* OWNER
* ADMIN
* MEMBER

The current application creates OWNER Memberships for Group creators. Authorization is evaluated
through Membership existence; invitation onboarding and role-specific administration are not
implemented in the current API.

---

# TodoList

Represents a logical collection of Todos inside a Group.

Responsibilities:

* organization
* ordering
* categorization

Examples:

```text
Shopping

Chores

Vacation

Wishlist
```

TodoLists do not own permissions.

Permissions are inherited from the parent Group.

---

# Todo

Represents executable work.

Responsibilities:

* task information
* completion state
* ordering
* assignment

A Todo never owns permissions.

A Todo only belongs to one Todo List.

Ownership is resolved through:

```text
Todo

↓

TodoList

↓

Group
```

---

# SubTask

Represents smaller units of work inside a Todo.

Responsibilities:

* task decomposition
* independent completion

SubTasks never exist outside a Todo.

---

# Invitation

Represents a pending request to join a Group.

The schema reserves this entity for future onboarding and Membership creation, but the current API
does not expose invitation creation or acceptance. There is therefore no product path from an
Invitation record to Membership creation.

Intended responsibilities:

* onboarding
* membership creation

---

# ActivityEvent

Represents important business events.

Examples:

* Todo created
* Todo completed
* Todo deleted
* Todo reordered
* Subtask created or completed

ActivityEvents provide an audit trail and activity history.

They are not the source of truth for business state.

---

# Ownership Hierarchy

```text
Group
    │
    ├── TodoList
    │      └── Todo
    │              └── SubTask
    │
    ├── Membership
    │
    ├── Invitation
    │
    └── ActivityEvent
```

---

# Authorization Hierarchy

```text
User

↓

Membership

↓

Group

↓

TodoList

↓

Todo
```

Authorization always starts from Membership.

Business entities never perform authorization themselves.

---

# Design Principles

The domain follows the following principles:

* One responsibility per entity.
* Ownership is explicit.
* Authorization is relationship-based.
* Business entities are independent from authentication.
* Collaboration is modeled at the Group level.
* Todo Lists organize work.
* Todos represent executable work.
* Complexity is introduced only when required by business requirements.
