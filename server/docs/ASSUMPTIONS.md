# Project Assumptions

This document captures the assumptions made while implementing the assignment.

These assumptions intentionally reduce unnecessary complexity and keep the implementation focused on the required product scope.

---

# Product Scope

The application focuses on collaborative task management.

The primary goals are:

* Personal task management
* Shared task management
* Real-time collaboration
* Offline synchronization

Anything outside these goals has been intentionally left out.

---

# Users

* Every registered user automatically owns one Personal Group.
* Users may belong to multiple Groups.
* A Group may contain multiple users.
* Authentication is required for all operations.

Guest users are intentionally not supported.

---

# Groups

Groups represent the collaboration boundary.

Two group types exist:

* PERSONAL
* SHARED

Permissions, invitations, and collaboration are managed at the Group level.

---

# Todo Lists

Each Group may contain multiple Todo Lists.

Examples:

* Inbox
* Shopping
* Chores
* Vacation

Todo Lists exist to organize work.

Ownership always belongs to the parent Group.

---

# Todos

Every Todo belongs to exactly one Todo List.

Todos never directly reference:

* User
* Group

Ownership is resolved through:

Todo → TodoList → Group

---

# Permissions

Permissions are role-based.

Supported roles:

* OWNER
* ADMIN
* MEMBER

Permission rules are implemented in Policy classes.

Database-driven RBAC is intentionally out of scope.

---

# Ordering

Todos are ordered using a rank field.

The implementation assumes drag-and-drop is the primary ordering mechanism.

Rank values may contain gaps to minimize database updates during reordering.

---

# Collaboration

Real-time collaboration occurs inside a Group.

Users only receive updates for Groups they belong to.

Authorization is always verified before subscribing to collaboration events.

---

# Offline Synchronization

Offline support assumes eventual consistency.

The client may temporarily diverge from the server while offline.

Conflicts are resolved when synchronization occurs.

The implementation does not attempt to provide strong consistency while offline.

---

# Activity History

Important business events are stored as Activity Events.

Examples include:

* Todo created
* Todo completed
* Todo deleted
* Member invited
* Member joined

Activity Events are used for auditability rather than rebuilding application state.

---

# Security

Authentication is JWT-based.

Authorization is evaluated using Membership.

Clients are never trusted for authorization decisions.

All permission checks are performed on the server.

---

# Performance

The expected workload is collaborative task management rather than large-scale project management.

The implementation therefore prioritizes:

* predictable drag-and-drop
* simple synchronization
* clear business logic

over aggressive pagination or complex optimization strategies.

---

# Future Improvements

The following features are intentionally excluded from the current implementation:

* Custom roles
* Configurable permissions
* Guest accounts
* Recurring tasks
* Attachments
* Comments
* Labels
* Notifications
* Event sourcing
* CQRS
* Multi-tenancy
* Fine-grained sharing

These features can be introduced later without significantly changing the core domain model.
