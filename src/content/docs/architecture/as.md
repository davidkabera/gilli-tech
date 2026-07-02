---
title: Architectural Style
description: Modular Monolith with a Layered Core and an Event-Driven Real-Time Overlay.
---

Gillytech's architecture combines two complementary styles:

1. A **layered, modular monolith** for the REST API and data access
   (presentation → routes → repositories → data store).
2. An **event-driven overlay** for real-time collaboration, implemented as
   an in-process WebSocket broadcast layer scoped by session and group.

This document explains *why* this combination was chosen, how well it fits
Gillytech's requirements, and the trade-offs accepted along the way. It
should be read alongside [ASR Mapping](/requirements/asr/) and the ADRs.

## 1. Why this style?

### The shape of the problem

Looking at the [Architecturally Significant Requirements](/requirements/asr/),
three forces dominate:

**Force A — Real-time, scoped delivery (ASR-02, ASR-06, ASR-07)**
Chat, presence, and question-advance events must reach the *right*
subset of connected clients (a group, or a whole session) within 5
seconds, across potentially many concurrent sessions.

**Force B — Tight, predictable submission latency (ASR-01, ASR-03)**
The single most frequent write — a student's reasoning-first
submission — must stay under 500 ms (p90) and must never expose the
answer key prematurely.

**Force C — Future-proofing without over-building now (ASR-04, ASR-08,
ASR-10)**
The data store will likely change (lowdb → PostgreSQL), question types
will grow, and analytics needs will deepen — but the v1 system is a
single-school pilot with no formal SLA (SRS §5.4 Availability).

None of these forces, on their own, demand microservices, event sourcing,
or a message broker. Force A demands *some* form of publish/subscribe, but
at the scale described (≈400 concurrent connections across 10 sessions),
an in-process broadcast registry is sufficient and dramatically simpler
than introducing Redis, Kafka, or a separate real-time service.

### The chosen combination

**Layered modular monolith** ([ADR-001](/adrs/adr-001/)) for everything that is naturally
request/response: authentication, session/question CRUD, submissions, and
analytics. Layers are:

```
HTTP request
  → Express route handler (routes/teacher.js, routes/student.js, ...)
  → shared auth/role middleware (ADR-002)
  → repository module (db/database.js, ADR-004)
  → lowdb JSON store (PostgreSQL in future)
```

**Event-driven overlay** ([ADR-003](/adrs/adr-003/)) for chat, presence, and broadcast
notifications, implemented as:

```
WebSocket message / REST-triggered broadcast
  → in-process connection registry (sessionId → groupId → connections)
  → broadcastGroup() / broadcastToSession()
  → connected clients
```

The two halves share the same process ([ADR-001](/adrs/adr-001/)) and the same
authentication identity ([ADR-002](/adrs/adr-002/)), so a REST action (teacher advances a
question) can directly trigger a broadcast without crossing a network
boundary — keeping Force A's latency budget easy to meet.

## 2. Fit: how this style satisfies the ASRs

| ASR | How the style addresses it |
|-----|------------------------------|
| **ASR-01** (server-side correctness, no answer-key leakage) | The layered structure puts a clear boundary between the "question for client" shape and the "submission result" shape, both produced by the same repository data but serialised differently by the route handler — see [ADR-002](/adrs/adr-002/) and AC-NF-SEC-05. |
| **ASR-02** (5s real-time delivery) | In-process broadcast ([ADR-003](/adrs/adr-003/)) means delivering an event is a synchronous function call plus WebSocket `send()` — no queue, no second process, no serialization-over-network overhead. |
| **ASR-03** (500ms submission p90) | The submission route does only what F-SUB-01–06 require; analytics aggregation is explicitly *not* on this path ([ADR-005](/adrs/adr-005/)). Layering keeps this path short: route → repository → response. |
| **ASR-04** (replaceable data store) | The repository layer ([ADR-004](/adrs/adr-004/)) is the seam. Because the architecture is already layered, this seam already exists — it didn't need to be retrofitted. |
| **ASR-05 / ASR-06** (auth & group-scoping enforced server-side) | Shared middleware ([ADR-002](/adrs/adr-002/)) and a server-populated connection registry ([ADR-003](/adrs/adr-003/)) mean both the REST and event-driven halves enforce the same rules from the same source of truth (the repository layer). |
| **ASR-07** (multiple concurrent sessions) | The connection registry is partitioned by `sessionId` ([ADR-003](/adrs/adr-003/)), so the cost of a broadcast is bounded by that session's connection count, not the platform-wide total. |
| **ASR-08** (new question types without contract changes) | The generic `content_json`/`type` question schema ([ADR-004](/adrs/adr-004/)) is a data-layer concern; because routes are thin and delegate to repositories, adding a `type` branch in one scoring function doesn't ripple through the layers. |
| **ASR-09** (hashed passwords) | A standard concern of the auth layer ([ADR-002](/adrs/adr-002/)); the layered style doesn't complicate this, it just gives it one obvious home. |
| **ASR-10** (2s analytics p90) | Analytics is its own route/handler that aggregates from the repository on demand ([ADR-005](/adrs/adr-005/)) — isolated from the submission path by the same layering that protects ASR-03. |

The headline fit argument: **every ASR is satisfiable by a seam that the
layered-monolith-plus-broadcast-overlay style already provides "for free"**
— route/repository separation, shared middleware, and a partitioned
in-process registry. No ASR required reaching for a heavier style
(microservices, CQRS with separate read/write stores, message queues) to
be satisfied at the v1 scale.

## 3. Trade-offs accepted

No architectural style is free. The trade-offs below are accepted
deliberately, with explicit revisit triggers recorded in the relevant
ADRs.

### 3.1 Single point of horizontal scaling

Because the connection registry ([ADR-003](/adrs/adr-003/)) and the in-process broadcast
mechanism ([ADR-001](/adrs/adr-001/)) live in one process, **today the system cannot be
horizontally scaled across multiple Node.js instances without further
work** — a broadcast triggered on instance A would not reach a client
connected to instance B.

- *Why accepted*: SRS §5.4 explicitly states "no formal SLA is defined for
  version 1 (single-school pilot)". The realistic load (≈400 concurrent
  connections, ASR-07) is well within a single Node.js process's
  capability.
- *Mitigated by*: ADR-001 and ADR-003 both record this as an explicit
  revisit trigger — moving to a shared registry (e.g. Redis pub/sub) is a
  contained change *because* the registry is already an isolated module,
  not scattered through route handlers.

### 3.2 lowdb has no transactions

The repository layer ([ADR-004](/adrs/adr-004/)) currently sits on top of lowdb, which
provides no transactional guarantees. The "first correct" check-and-award
sequence (F-SUB-04, F-SUB-06) is *not* atomic at the database level; it
relies on Node's single-threaded event loop and the absence of `await`
between the check and the write.

- *Why accepted*: At pilot scale (40 students per session), the window for
  a race condition is small, and the consequence (two students both
  marked first-correct) is low-severity (a minor scoring discrepancy, not
  a security or data-integrity issue).
- *Mitigated by*: ADR-004 and ADR-005 both flag this explicitly as a
  required fix when migrating to PostgreSQL, where the same
  check-and-award sequence should be wrapped in a database transaction.

### 3.3 Analytics cost is paid at read time, and can grow

Because analytics aggregates "on read" ([ADR-005](/adrs/adr-005/)) over up to 800 submission
records (40 students × 20 questions), the 2-second budget (ASR-10) is not
guaranteed to hold indefinitely as session sizes grow.

- *Why accepted*: This trade-off **protects the more critical and more
  frequent submission path** (ASR-03) at the cost of the less frequent,
  teacher-only analytics path. Optimising the wrong path first would have
  been the larger architectural risk.
- *Mitigated by*: ADR-005 specifies load testing at the target scale
  before release, with a documented fallback (incremental aggregate
  tables once PostgreSQL transactions are available).

### 3.4 Generic question schema sacrifices schema-level validation

The `content_json`/`type` question schema ([ADR-004](/adrs/adr-004/)), chosen to satisfy
ASR-08, means the database schema cannot enforce "a multiple-choice
question must have between 2 and 6 options" — this validation is pushed
into application code.

- *Why accepted*: The alternative — a separate table or strict schema per
  question type — would directly contradict ASR-08's goal of adding
  question types without contract changes, and was judged a worse
  trade-off given the SRS's emphasis on extensibility (SRS §5.4
  Modifiability scenario).
- *Mitigated by*: Validation lives in the session-builder route handler, a
  single, well-tested location, rather than scattered across multiple
  type-specific tables/endpoints.

## 4. What this style deliberately avoids, and why

- **Microservices**: would introduce network latency and operational
  complexity (service discovery, distributed auth) that none of the
  ASRs require at pilot scale, and would directly work against ASR-02's
  in-process broadcast advantage.
- **Event sourcing / CQRS**: the system's state (sessions, submissions,
  scores) is naturally CRUD-shaped and small in volume for v1; the
  "read model vs write model" split that CQRS provides is approximated
  cheaply by ADR-005 (analytics-on-read) without the operational overhead
  of maintaining separate read stores.
- **A separate real-time service** (e.g. a dedicated Socket.IO/Pusher-style
  service): would re-introduce the cross-process broadcast problem that
  ADR-003 specifically avoids by keeping the registry in-process with the
  REST layer.

## 5. Summary

Gillytech's architecture is a **layered modular monolith** for
request/response concerns, with an **in-process, session/group-scoped
event-driven overlay** for real-time collaboration. This combination was
chosen because it satisfies all ten ASRs derived from the SRS's
non-functional requirements using seams (route/repository separation,
shared middleware, a partitioned connection registry) that the style
provides naturally — without adopting the operational complexity of
microservices, message brokers, or CQRS, none of which are justified by
the v1 pilot's scale (SRS §5.4). The explicit trade-offs — single-process
scaling, non-transactional first-correct checks, read-time analytics cost,
and schema-level validation pushed to application code — are each recorded
with a concrete revisit trigger in the corresponding ADR, so the
architecture can evolve deliberately as Gillytech grows beyond a
single-school pilot.
