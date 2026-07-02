---
title: Case Study
description: The problem Gillytech solves and who it solves it for.
---

## The problem

Kenyan secondary schools are transitioning to the **CBC (Competency-Based
Curriculum)** framework, which emphasises reasoning and demonstrated
competency over rote recall. Existing quiz platforms let students pick an
answer without ever articulating *why*, and offer little support for
real-time group discussion during an assessment.

Gillytech (internally the **Collaborative STEM Reasoning Platform**, or
CSRP) closes that gap with a **reasoning-first** interaction pattern:
students must write their reasoning before the answer options even
appear, they discuss with a small group in live chat, and teachers can
watch the whole class think in real time — not just see a final score.

## Who uses it

| User Class | Characteristics |
|---|---|
| **Student** | Grades 7–12 learners, variable digital literacy. The interface must be simple and require minimal typing beyond the reasoning text box. |
| **Teacher** | Subject teachers who author sessions, run them live, and review analytics. Limited prep time — a reusable question bank reduces authoring overhead. |
| **Administrator** | School or platform staff overseeing multiple teachers, classes, and schools. Needs aggregate visibility, not session-level detail. |

## What the platform does

**For students (session delivery):**
- Join a live session with a class join code
- View questions one at a time, in lock-step with the class
- Submit written reasoning before selecting an answer (the reasoning-first gate)
- Collaborate in real-time group chat scoped to their assigned group
- Track live leaderboards and earn badges

**For teachers (authoring and monitoring):**
- Create classes, generate join codes, manage rosters
- Build sessions from scratch or from a reusable question bank
- Launch, advance, and end live sessions
- Monitor live submission progress, group status, and reasoning text as it comes in
- Review post-session analytics: leaderboards, per-question accuracy, and CBC competency indicators

**For administrators (platform oversight):**
- View platform-wide statistics: schools, teachers, students, sessions, accuracy, badges
- Review teacher activity summaries

## Why this is architecturally interesting

Three forces shape the system more than any others, and they pull in
different directions:

1. **Real-time, scoped delivery** — chat, presence, and question-advance
   events must reach the *right* subset of connected clients (a group, or
   a whole session) within seconds, across potentially many concurrent
   sessions.
2. **Tight, predictable submission latency** — the single most frequent
   write (a student's reasoning-first submission) must stay fast and must
   never expose the answer key prematurely.
3. **Future-proofing without over-building now** — the data store will
   likely change, question types will grow, and analytics needs will
   deepen, but v1 is a single-school pilot with no formal SLA.

See [ASR Mapping](/requirements/asr/) for how these forces become
concrete, measurable requirements, and
[Architectural Style](/architecture/as/) for how the architecture answers
them.

## Constraints

- The reasoning-first pattern is a fixed product requirement and must not
  be bypassable from the client.
- Real-time features must use WebSockets, not polling, as the primary
  update path.
- All scoring logic is computed and verified **server-side** — the client
  is never a trusted source of correctness or scores.
- The initial data layer (lowdb/JSON) must not leak into the API
  contract, to ease a future PostgreSQL migration.
- Because all student users are minors, only name and school-issued email
  are collected — no public-facing profile or messaging outside group
  chat.
