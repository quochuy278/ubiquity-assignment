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

Offline editing and synchronization are intentionally outside the current product scope.

---

# Users

* Users explicitly create Groups; the frontend defaults new Groups to PERSONAL.
* Every Group creator receives an OWNER Membership.
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

Authorization and collaboration are scoped at the Group level. A SHARED Group OWNER can invite an
existing registered user, who joins as MEMBER after authenticated acceptance. Broader
member-management flows are not exposed.

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

Membership stores one of these roles:

* OWNER
* ADMIN
* MEMBER

The application creates OWNER Memberships for Group creators and MEMBER Memberships through
accepted invitations. OWNER-only invitation creation is the sole role-specific rule; role changes,
member removal, leaving, and ownership transfer are not exposed.

---

# Ordering

Todos are ordered using a rank field.

The implementation assumes drag-and-drop is the primary ordering mechanism.

Rank values may contain gaps to minimize database updates during reordering.

---

# Collaboration

Real-time notifications are published and subscribed to only for SHARED Groups. The client reaches
those pages through membership-protected REST resources, then uses a subscribe-only Ably browser
credential. The current implementation has no server-issued, per-user realtime token endpoint.

---

# Offline Synchronization

Offline editing and synchronization are not implemented. The client has no offline mutation queue
or conflict-resolution protocol; REST and PostgreSQL remain authoritative.

---

# Activity History

Important business events are stored as Activity Events.

Examples include:

* Todo created
* Todo completed
* Todo deleted
* Todo reordered
* Subtask created or completed

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
