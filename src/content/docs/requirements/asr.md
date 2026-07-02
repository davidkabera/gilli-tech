---
title: ASR Mapping
description: Architecturally Significant Requirements mapped to non-functional requirements.
---

This document maps Architecturally Significant Requirements (ASRs) to the
non-functional requirements (NFRs) defined in Section 5 of the
[Gillytech SRS](/requirements/srs/). An ASR is a requirement that has a
measurable, broad effect on the architecture — i.e. addressing it well
(or badly) shapes multiple components, not just one.

Each ASR is given an ID of the form `ASR-<NN>`, a one-line statement, the
source NFR(s), the affected quality attribute, and the architectural
elements/decisions it drives (cross-referenced to ADRs).

## ASR Table

| ASR ID | Statement | Source NFR(s) | Quality Attribute | Architectural Driver / Related ADR |
|--------|-----------|----------------|--------------------|--------------------------------------|
| ASR-01 | Submission scoring and correctness must be computed and verified entirely server-side; the client must never receive the answer key before submitting. | NF-SEC-05 | Security | Drives the split between "question" (client-safe, no `correct_answer`) and "submission result" (server-computed) payloads. See [ADR-002](/adrs/adr-002/) (Layered REST + WebSocket API). |
| ASR-02 | Real-time updates (chat, presence, question advance, live monitor) must be delivered to clients within 5 seconds (p90). | NF-PERF-02 | Timeliness / Real-time responsiveness | Requires a persistent push channel (WebSocket) rather than polling as the primary update mechanism. See [ADR-001](/adrs/adr-001/) (Modular Monolith), [ADR-003](/adrs/adr-003/) (WebSocket Broadcast Layer). |
| ASR-03 | Submission requests must respond within 500 ms (p90) under 40 concurrent students per session. | NF-PERF-01 | Performance | Constrains the submission code path to avoid synchronous heavy computation (e.g. full analytics recompute) on the hot path; analytics are computed on-demand for teacher views, not inline with student submission. See [ADR-001](/adrs/adr-001/), [ADR-005](/adrs/adr-005/) (Analytics-on-read). |
| ASR-04 | The data layer must be replaceable (lowdb → PostgreSQL) without changing the HTTP/WebSocket contracts. | Section 2.5 (constraint), supports NF-PERF-03 at scale | Modifiability / Portability | Requires a repository-pattern data access boundary, isolating `lowdb`-specific code from route and WebSocket handlers. See [ADR-004](/adrs/adr-004/) (Repository Pattern for Data Access). |
| ASR-05 | All non-auth endpoints (REST and WebSocket) must enforce JWT authentication and role-based authorisation server-side, regardless of client routing. | NF-SEC-02, NF-SEC-03 | Security | Requires a shared auth/authorisation middleware applied uniformly across REST routes and the WebSocket upgrade handshake. See [ADR-002](/adrs/adr-002/). |
| ASR-06 | Group chat messages must be scoped server-side so a student can never receive messages from a group they do not belong to. | NF-SEC-04 | Security / Confidentiality | Drives the WebSocket broadcast layer to maintain a `sessionId → groupId → [connections]` routing table rather than a single session-wide broadcast. See [ADR-003](/adrs/adr-003/). |
| ASR-07 | The system must support multiple concurrent live sessions (e.g. 10 sessions × 40 students = 400 concurrent WebSocket connections) without cross-session interference in broadcast latency. | NF-PERF-02 (scalability scenario) | Scalability | Drives connection-table partitioning by `sessionId`/`groupId` (ASR-06) and informs the single-process vs. multi-process boundary in [ADR-001](/adrs/adr-001/). |
| ASR-08 | Adding a new question type must not require changes to the submission API contract or the WebSocket protocol. | Modifiability scenario (5.4) | Modifiability / Extensibility | Drives a generic `content_json` question schema and a server-side scoring strategy keyed by `type`, rather than per-type endpoints. Related to [ADR-004](/adrs/adr-004/). |
| ASR-09 | Passwords must never be stored in plaintext; all credential storage must use salted one-way hashing. | NF-SEC-01 | Security | Drives the choice of `bcryptjs` in the auth module and excludes credential storage from any cache or analytics export. See [ADR-002](/adrs/adr-002/). |
| ASR-10 | Teacher analytics (leaderboards, per-question stats, CBC indicators) for a class of 40 students / 20 questions must return within 2 seconds (p90). | NF-PERF-03 | Performance | Drives "compute analytics on read, not on write" ([ADR-005](/adrs/adr-005/)), keeping the submission hot path (ASR-03) lightweight while accepting a bounded read-time cost for teacher-facing views. |
| ASR-11 | First-time students must be able to complete the reasoning-first flow (write reasoning, then select an answer) without external help. | Usability scenario (SRS §5.4) | Usability | Driven entirely by client-side UI: a visually distinct two-phase layout and a progress indicator showing the 20-character minimum (AC-SUB-01). No backend architectural driver currently addresses this — see [Notes on Usability & Interaction Telemetry](#notes-on-usability--interaction-telemetry) below. |
| ASR-12 | Aggregated, non-biometric interaction timing (e.g. time-to-first-keystroke, reasoning duration, revision count, decision latency after options unlock) may be captured per submission to support UX research into ASR-11. | Usability scenario (SRS §5.4), informed by SRS §5.5 Business Rules (minor-user data minimisation) | Usability / Privacy | Additive, aggregated fields on the existing submission record — **not** a raw event stream and **not** a new collection. See [ADR-004](/adrs/adr-004/) (Repository Pattern & Question Schema) and the notes below. |

## Coverage Check

Every non-functional requirement from SRS Section 5 maps to at least one ASR:

| NFR | Covered by |
|-----|------------|
| NF-PERF-01 | ASR-03 |
| NF-PERF-02 | ASR-02, ASR-07 |
| NF-PERF-03 | ASR-10 |
| NF-SEC-01  | ASR-09 |
| NF-SEC-02  | ASR-05 |
| NF-SEC-03  | ASR-05 |
| NF-SEC-04  | ASR-06 |
| NF-SEC-05  | ASR-01 |

The Modifiability/Extensibility and Scalability scenarios from Section 5.4
(not numbered as standalone NFRs in the SRS) are covered by ASR-04, ASR-07,
and ASR-08. The **Usability** scenario from Section 5.4 (90% first-time
task-completion rate) is covered by ASR-11, with ASR-12 as a supporting,
not-yet-committed measurement mechanism.

## Notes on Usability & Interaction Telemetry

The SRS defines one Usability quality-attribute scenario (§5.4):

> 90% of first-time student users successfully submit a reasoned answer
> without external help, based on pilot observation.

This scenario was present in the SRS from the start but had **no
corresponding ASR** until this revision — every other quality attribute in
§5.4 (Performance, Security, Modifiability, Scalability) had already been
translated into an ASR and traced to an ADR; Usability had not. ASR-11
closes that gap.

**Where ASR-11 actually lives architecturally:** nowhere in the backend.
It's satisfied entirely by the frontend's phase-separated UI (reasoning
box, then locked options, then a progress indicator) — a reminder that not
every ASR requires a server-side architectural decision. The `20`-character
threshold itself is already enforced twice: client-side for the UX gate
(AC-SUB-01), and implicitly reflected in scoring (`F-SUB-05`'s `>20 chars`
bonus), so the number is shared but the enforcement mechanisms are
independent.

**Measuring ASR-11 (ASR-12) — deliberately constrained scope.** To find
out *whether* ASR-11 is being met (rather than assert it once at
pilot-observation time), the natural approach is to capture interaction
timing per submission. This is scoped narrowly and deliberately:

- **Aggregated only** — e.g. `time_to_first_keystroke_ms`,
  `total_reasoning_duration_ms`, `backspace_count`,
  `time_to_first_click_after_unlock_ms`, `option_hover_count` — computed
  client-side and sent once per submission.
- **Never raw event streams.** Individual `keydown`/`mousemove` timestamps
  are not captured or transmitted. Raw keystroke/pointer cadence is a
  recognised behavioural biometric and, combined with SRS §5.5's rule that
  "no personally identifying information beyond name and school-issued
  email is collected" for a population of minors, storing it would sit in
  direct tension with an existing business rule — not just a vague privacy
  concern.
- **Data shape:** additive fields on the existing `submissions` record
  (see [ADR-004](/adrs/adr-004/)'s generic schema approach), not a new
  collection or a separate telemetry service. This keeps ASR-12 from
  requiring any new architectural seam — it rides on the same
  repository-pattern boundary already established for ASR-04/ASR-08.
- **Must not threaten ASR-03.** The aggregated payload is small and
  computed client-side before the single submission POST, so it adds
  negligible weight to the 500ms (p90) submission budget — unlike a
  streaming approach, which would not be free.

**Status:** ASR-12 is recorded here as a *candidate* measurement
mechanism, not yet a committed decision. Before implementation, it should
go through the same data-minimisation review implied by SRS §5.5 —
specifically, confirmation that aggregated timing data (even without raw
event capture) is acceptable for a minor-user population under Kenya's
Data Protection Act 2019. No ADR has been written for ASR-12 for this
reason; one should be added (proposing the specific field additions to the
submission schema) once that review is complete.

## Notes on Prioritisation

ASR-01, ASR-02, ASR-05, and ASR-06 are considered **must-have for v1** —
they directly protect the integrity of the reasoning-first assessment model
and the privacy of minors using the platform (see SRS §5.5 Business Rules).

ASR-04 and ASR-08 are **structural investments** — their cost is paid
up-front in the form of a repository abstraction and a generic question
schema, in exchange for avoiding a costly rewrite when the data store or
question types change.

ASR-03, ASR-07, and ASR-10 are **performance budgets** that should be
exercised by load tests before each release, using the concurrency profile
described (40 students/session, up to 10 concurrent sessions).
