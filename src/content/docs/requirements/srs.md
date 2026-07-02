---
title: SRS
description: Software Requirements Specification for Gillytech (Collaborative STEM Reasoning Platform).
---

## Revision History

| **Name** | **Date** | **Reason for Changes** | **Version** |
| --- | --- | --- | --- |
| Initial Version | 2026-06-11 | Initial draft of the Gillytech SRS, derived from platform planning documentation and database schema. | 0.1.0 |

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) describes the requirements for the first version of the Gillytech platform — a collaborative, real-time STEM reasoning tool for Kenyan CBC (Competency-Based Curriculum) classrooms, Grades 7–12. This SRS covers the entire system: backend services, real-time communication layer, and web frontend for all user roles.

### 1.2 Document Conventions

This document introduces the following terminology:

- System: The Gillytech application described in this document.

- Session: A single timed classroom activity consisting of an ordered sequence of questions, run by a teacher for one class.

- Group: A small team of students (typically 2–4) who collaborate via chat during a session.

- Reasoning-first submission: The core interaction pattern in which a student must submit written reasoning before selecting a multiple-choice answer.

- CBC: Competency-Based Curriculum, the Kenyan secondary education curriculum framework.

Functional requirements are labelled F-<MODULE>-<NN>. Non-functional requirements are labelled NF-<CATEGORY>-<NN>.

### 1.3 Intended Audience and Reading Suggestions

This SRS is intended for the development team, quality assurance engineers, school administrators evaluating the platform, and teachers participating in pilot programmes. Sections 1–3 provide context; Section 4 details functional requirements by feature area; Section 5 details non-functional requirements and quality attributes; Section 6 covers other requirements.

### 1.4 Product Scope

Kenyan secondary schools transitioning to the CBC framework require formative assessment tools that emphasise reasoning and collaboration over rote recall. Existing quiz platforms allow students to select answers without articulating their thinking, and provide little support for real-time group discussion during assessment. Gillytech addresses this gap with a platform where students must explain their reasoning before answering, collaborate with groupmates via live chat, and where teachers can monitor live progress, view detailed analytics, and obtain CBC competency indicators for every learner.

### 1.5 References

- Kenya Institute of Curriculum Development (KICD) — Competency-Based Curriculum Framework, Biology/STEM subjects, Grades 7–12.

- arc42 Quality Model — https://quality.arc42.org/

- Gillytech Database Schema Specification (internal, v1).

- Gillytech API Reference (internal, v1).

## 2. Overall Description

### 2.1 Product Perspective

Gillytech is a new, greenfield project. It is a self-contained full-stack web application comprising a Node.js/Express REST API and WebSocket server, and a React single-page frontend. The system is not an extension of any existing school information system in this version, although future integration with school management systems (SMS) is anticipated (see Section 2.7).

### 2.2 Product Functions

Gillytech provides users with the following functionality:

#### Session delivery (students):

- Join a live session using a class join code.

- View questions one at a time, in lock-step with the class.

- Submit written reasoning before selecting an answer (reasoning-first gate).

- Participate in real-time group chat scoped to their assigned group.

- View live leaderboards (individual and group).

- Earn badges for correctness, speed, and participation.

#### Session authoring and monitoring (teachers):

- Create classes, generate join codes, and manage rosters.

- Build sessions from scratch or from a reusable question bank.

- Launch, advance, and end live sessions.

- Monitor live submission progress, group status, and reasoning text in real time.

- View post-session analytics: leaderboards, question-level accuracy, and CBC competency indicators.

#### Platform administration (admins):

- View platform-wide statistics: schools, teachers, students, sessions, accuracy, badges.

- View teacher activity summaries.

### 2.3 User Classes and Characteristics

| **User Class** | **Characteristics** |
| --- | --- |
| **Student** | Grades 7–12 learners using the platform during class time, typically on shared or personal devices. Variable digital literacy; interface must be simple and require minimal typing beyond the reasoning text box. |
| **Teacher** | Subject teachers who author sessions, run them live, and review analytics. May have limited time to prepare; question bank and reusable sessions reduce authoring overhead. |
| **Administrator** | School or platform staff with oversight of multiple teachers, classes, and schools. Familiar with the system; require aggregate visibility rather than session-level detail. |

### 2.4 Operating Environment

- Server: Node.js 18+ runtime; Express HTTP server; ws WebSocket server. Deployable to any standard Linux container host.

- Database: lowdb (JSON file) for the initial release; designed for migration to PostgreSQL without changes to the API contract.

- Client: Modern evergreen browsers (Chrome, Firefox, Edge, Safari) on desktop and tablet. No native mobile application in this version.

- Network: Standard internet connectivity. The platform assumes school-grade bandwidth (shared connections of 5–20 Mbps for a class of ~40 students).

### 2.5 Design and Implementation Constraints

- The reasoning-first interaction pattern (reasoning before answer selection) is a fixed product requirement and must not be bypassable from the client.

- Real-time features (chat, live monitor, question advance) must use WebSockets, not polling, for the primary update path; polling may be used as a fallback.

- All scoring logic must be computed and verified server-side; the client is not a trusted source of correctness or scores.

- The initial data layer (lowdb/JSON) must not leak into the API contract — all data access goes through a repository-style module boundary to ease a future PostgreSQL migration.

### 2.6 User Documentation

An in-app "How to Use" guide will be provided for teachers (session creation and live monitoring) and a short onboarding screen for students (reasoning-first flow). No separate user manual is planned for version 1.

### 2.7 Assumptions and Dependencies

- Each school has at least one administrator account provisioned by the platform operator.

- Students join sessions using a class-level join code distributed by the teacher; individual student accounts are pre-provisioned (no public self-registration in v1).

- Future versions may integrate with school management systems (SMS) for roster synchronisation; this is out of scope for v1 but informs the module boundary design (Section 2.5).

## 3. External Interface Requirements

### 3.1 User Interfaces

The system provides the following user interfaces, all delivered as a single React web application with role-based routing:

- Student session interface — full-screen, reasoning-first question flow with group chat sidebar and live leaderboard. Optimised for desktop and tablet.

- Teacher dashboard — session list, session builder/question editor, live monitor, and analytics views. Desktop-first; usable on tablets.

- Admin console — platform overview with aggregate statistics and teacher activity tables. Desktop only.

- Login screen — shared across all roles, with role-based redirect after authentication.

### 3.2 Hardware Interfaces

There are no dedicated hardware components. The system runs entirely on standard server infrastructure and is accessed via student/teacher devices (desktops, laptops, tablets) with a modern web browser.

### 3.3 Software Interfaces

- Database: lowdb (JSON document store) in v1; PostgreSQL-compatible repository interface for future migration.

- Authentication: JSON Web Tokens (JWT), issued by the backend auth module, validated on every protected REST and WebSocket request.

- Real-time transport: WebSocket (ws library) for group chat, presence events, and teacher-driven session/question advancement.

- Future integration point: AI reasoning evaluator via the Anthropic API (model claude-sonnet-4-6) for automated qualitative feedback on student reasoning text — planned for a later release (see ADR-004).

### 3.4 Communications Interfaces

- Client–server REST API: HTTPS/JSON, namespaced under /api/{auth,teacher,student,admin}.

- Real-time channel: WebSocket over WSS, one connection per active session participant, scoped by sessionId and authenticated via JWT passed as a query parameter.

- No email, SMS, or third-party messaging integrations are required for version 1.

## 4. System Features

### 4.1 Session Lifecycle Management

#### Description and Priority

**High Priority. Teachers create sessions (draft), populate them with questions either authored inline or drawn from a reusable question bank, then transition sessions through draft → active → completed states. Activating a session auto-forms student groups ****from the class roster.**

#### Stimulus/Response Sequences

- Teacher creates a session with a title, target class, and an ordered list of questions → system persists the session in draft state and auto-creates groups of up to 4 students from the class roster.

- Teacher activates a session → system sets status to active, records the start time, and broadcasts a session_update event to connected clients.

- Teacher advances to the next question → system increments the current question index and broadcasts question_advance to all session participants.

- Teacher ends a session → system sets status to completed, records the end time, and the session becomes available in analytics.

#### Functional Requirements

**F-SES-01  **The system shall allow a teacher to create a session associated with exactly one class, with a title and zero or more questions.

**F-SES-02  **The system shall support session statuses of draft, active, and completed, with transitions restricted to draft → active → completed.

**F-SES-03  **On activation of a session, the system shall automatically partition all students enrolled in the target class into groups of up to 4 members.

**F-SES-04  **The system shall allow a teacher to add questions to a session individually or by selecting from the question bank.

**F-SES-05  **The system shall allow a teacher to advance the current question index of an active session, broadcasting the change to all connected participants in real time.

**F-SES-06  **The system shall allow a teacher to end an active session, after which no further submissions are accepted for that session.

### 4.2 Reasoning-First Question Submission

#### Description and Priority

**High Priority. This is the core differentiating feature of Gillytech. A student must enter written reasoning of sufficient length before the answer-selection UI become****s available, and the system records both the reasoning text and the selected answer in a single submission.**

#### Stimulus/Response Sequences

- Student views the current question and types reasoning text → system enables answer selection only once the reasoning text exceeds a minimum length threshold (20 characters).

- Student selects an answer and submits → system records the submission, computes correctness, first-correct status, and score, and returns the result to the student.

- Student attempts to submit a second time for the same question → system rejects the request, since one submission per student per question is permitted.

#### Functional Requirements

**F-SUB-01  **The system shall not display answer-selection options to a student until the student has entered reasoning text of at least 20 characters for the current question.

**F-SUB-02  **The system shall accept exactly one submission per student per question, consisting of the reasoning text and the selected answer.

**F-SUB-03  **The system shall determine correctness by comparing the submitted answer to the question’s stored correct answer, server-side.

**F-SUB-04  **The system shall identify the first correct submission for each question and flag it as is_first_correct.

**F-SUB-05  **The system shall compute a submission score using the rule: +8 points for a correct answer, +2 bonus for being first correct, +2 for reasoning text exceeding 20 characters, capped at 12 points total.

**F-SUB-06  **The system shall award a "first correct" badge to a student whose submission is flagged is_first_correct.

### 4.3 Real-Time Group Collaboration

#### Description and Priority

**High Priority. Students assigned to the same group within a session can exchange chat messages in real time, scoped to the current questi****on.**

#### Stimulus/Response Sequences

- Student opens a session → client establishes a WebSocket connection authenticated via JWT, scoped to the session and the student’s group.

- Student sends a chat message → system persists the message and broadcasts it to all currently connected members of the same group (and to the teacher).

- A group member connects or disconnects → system broadcasts a presence event to the rest of the group.

#### Functional Requirements

**F-CHAT-01  **The system shall establish a WebSocket connection per active participant, authenticated using the same JWT used for REST requests.

**F-CHAT-02  **The system shall scope chat messages to the sender’s group within the current session; students shall not receive messages from other groups.

**F-CHAT-03  **The system shall persist all chat messages with sender, group, question, and timestamp for later review.

**F-CHAT-04  **The system shall broadcast presence (joined/left) events to other members of the same group.

**F-CHAT-05  **Teachers shall be able to receive broadcast messages across all groups within a session for moderation/monitoring purposes.

### 4.4 Live Session Monitoring

#### Description and Priority

**High Priority. Teachers require a real-time**** view of class progress during an active session: who has submitted, group-by-group status, and the content of submitted reasoning.**

#### Stimulus/Response Sequences

- Teacher opens the live monitor for an active session → system returns the current question, submission counts, and per-group status, refreshed periodically and on relevant WebSocket events.

- A student submits an answer → the live monitor view updates to reflect the new submission count and group status without a full page reload.

#### Functional Requirements

**F-MON-01  **The system shall provide a live monitor endpoint returning, for the current question of an active session: total enrolled students, submission count, correct count, and per-group submission/correctness status.

**F-MON-02  **The system shall display each student’s submitted reasoning text and correctness flag to the teacher in near real time.

**F-MON-03  **The live monitor shall reflect new submissions and chat activity within 5 seconds of occurrence (NF-PERF-02).

### 4.5 Analytics and CBC Competency Reporting

#### Description and Priority

**Medium-High Priority. After a session, teachers require leaderboards, per-question statistics, and CBC-aligned competency indicators derived from submission data.**

#### Stimulus/Response Sequences

- Teacher opens analytics for a completed (or active) session → system computes and returns student leaderboard, group leaderboard, per-question accuracy/option distribution, and CBC competency scores.

#### Functional Requirements

**F-ANA-01  **The system shall compute a student leaderboard ranking participants by total score for a session.

**F-ANA-02  **The system shall compute a group leaderboard ranking groups by aggregate member score and correct-answer count.

**F-ANA-03  **The system shall compute per-question accuracy and answer-option distribution across all submissions for that question.

**F-ANA-04  **The system shall derive CBC competency indicators per student: critical thinking (accuracy-derived), reasoning quality (reasoning-length-derived), and participation (completion-rate-derived).

**F-ANA-05  **The system shall provide a platform-level overview to administrators, including counts of schools, teachers, students, classes, sessions, active sessions, total submissions, overall accuracy, and badges awarded.

### 4.6 Question Bank Management

#### Description and Priority

**Medium Priority. Teachers can build and reuse a personal bank of questions across sessions, reducing per-session authoring time.**

#### Functional Requirements

**F-QB-01  **The system shall allow a teacher to save a question (text, options, correct answer, marks, subject, topic) to a personal question bank.

**F-QB-02  **The system shall allow a teacher to retrieve their question bank for reuse when authoring a session.

## 5. Other Nonfunctional Requirements

### 5.1 Performance Requirements

**NF-PERF-01  **The p90 latency for an answer submission request (POST /api/student/session/:id/submit), from receipt to response with score, shall be at most 500 ms under a load of 40 concurrent students per session.

**NF-PERF-02  **Real-time updates (chat messages, presence events, question advancement, live monitor refresh) shall be delivered to connected clients within 5 seconds (p90) of the triggering event.

**NF-PERF-03  **The teacher analytics endpoint (GET /api/teacher/sessions/:id/analytics) shall return results within 2 seconds (p90) for a class of up to 40 students and 20 questions.

### 5.2 Safety Requirements

There are no safety requirements in the conventional (physical harm) sense. However, the system handles data relating to minors (students aged 12–18) and therefore inherits the safeguarding requirements described under Security (5.3) and Business Rules (5.5).

### 5.3 Security Requirements

**NF-SEC-01  **All passwords shall be stored using a salted one-way hash (bcrypt), never in plaintext.

**NF-SEC-02  **All REST and WebSocket endpoints other than authentication shall require a valid JWT; requests with missing or invalid tokens shall be rejected with HTTP 401 / WebSocket connection close.

**NF-SEC-03  **Role-based authorisation shall be enforced server-side: teacher-only and admin-only endpoints shall reject requests from users of other roles with HTTP 403, regardless of client-side routing.

**NF-SEC-04  **Group chat messages shall be scoped server-side such that a student cannot receive messages addressed to a group they are not a member of, even if the client requests it.

**NF-SEC-05  **A correct answer key shall never be transmitted to a student client before that student has submitted their own answer for the corresponding question.

### 5.4 Software Quality Attributes

The following is a brief overview of the quality characteristics most relevant to Gillytech, expressed as scenarios in the arc42 style. These are mapped in detail to architecturally significant requirements (ASRs) in the accompanying ASR mapping document (asr-mapping.md).

#### Real-Time Responsiveness

*https://quality.arc42.org/qualities/timeliness*

Related non-functional requirements: NF-PERF-01, NF-PERF-02.

**Scenario: Live monitor reflects**** new submission.**

- Source: Student.

- Stimulus: Student submits an answer to the current question.

- Points of impact: Submission API, WebSocket broadcast layer, teacher live monitor view.

- Response: The teacher’s live monitor updates to reflect the new submission count and group status.

- Metrics: Update visible to the teacher within 5 seconds (p90) of submission.

#### Modifiability / Extensibility

*https://quality.arc42.org/qualities/modifiability*

**Scenario: Add a new question type.**

- Source: Developer.

- Stimulus: A request to support a new question type (e.g. true/false, numeric entry) in addition to multiple-choice.

- Points of impact: Question schema, session builder UI, student session UI, scoring logic.

- Response: The new question type is added without modifying the submission API contract or the WebSocket protocol.

- Metrics: Implementing and testing a new question type takes no more than two days for a developer familiar with the codebase, and requires no changes to the database migration strategy.

**Scenar****io: Migrate data layer from lowdb to PostgreSQL.**

- Source: Developer / operations.

- Stimulus: The platform outgrows the JSON-file data store and must move to PostgreSQL.

- Points of impact: Data access (repository) modules only.

- Response: Route handlers, WebSocket handlers, and the frontend require no changes; only repository module implementations change.

- Metrics: Migration is implementable and testable behind the existing repository interface without changing any HTTP or WebSocket contract.

#### Scalability

*https:/**/quality.arc42.org/qualities/scalability*

**Scenario: Concurrent sessions across multiple classes.**

- Source: Multiple teachers across a school.

- Stimulus: Several classes run live sessions simultaneously during the same period.

- Points of impact: WebSocket connection management, session/group broadcast routing.

- Response: The system maintains independent broadcast scopes per session and group; load on one session does not degrade real-time delivery for another.

- Metrics: With 10 concurrent sessions of 40 students each (400 concurrent WebSocket connections), p90 broadcast latency (NF-PERF-02) is maintained.

#### Security

*https://quality.arc42.org/qualities/security*

Related non-functional requirements: NF-SEC-01 through NF-SEC-05.

#### Usability

*https://quality.arc42.org/qualiti**es/usability*

**Scenario: Reasoning-first flow comprehension.**

- Source: Student (Grade 7, first-time user).

- Stimulus: Student opens their first question in a live session.

- Response: The two-phase flow (reason, then answer) is visually distinct, with a progress indicator showing the 20-character minimum.

- Metrics: 90% of first-time student users successfully submit a reasoned answer without external help, based on pilot observation.

#### Availability

*https://quality.arc42.org/qualities/availability*

No formal SLA is defined for version 1 (single-school pilot). The architecture should not preclude horizontal scaling and standard uptime monitoring in later versions.

#### Interoperability

*https://quality.arc42.org/qualities/interoperability*

The repository-module boundary (Section 2.5) and versioned REST API are designed to support future interoperability with school management systems and the planned AI reasoning evaluator (Section 3.3).

### 5.5 Business Rules

- A student account belongs to exactly one school and may be enrolled in multiple classes within that school.

- Only teachers may create classes and sessions for classes they own; administrators have read access across all teachers within their school.

- Group composition is fixed for the duration of a session once it is activated; groups are not reshuffled mid-session.

- Because all student users are minors, no personally identifying information beyond name and school-issued email is collected, and no public-facing profile or messaging outside of group chat is provided.

## 6. Other Requirements

Architecturally significant requirements (ASRs) derived from the non-functional requirements above, the resulting acceptance criteria, architectural decision records, the chosen architectural style and its trade-offs, and the LikeC4 system model are provided as companion documents to this SRS:

- asr-mapping.md — mapping of ASRs to the non-functional requirements in Section 5.

- acceptance-criteria.md — Given/When/Then acceptance criteria for the functional requirements in Section 4.

- adr/ — Architectural Decision Records (ADR-001 through ADR-005).

- architecture-style.mdx — chosen architectural style, rationale, fit, and trade-offs.

- model/ — LikeC4 model sources for the system context and container diagrams.

*Copyright © 2026 Gillytech Educational Publishers. This **document is derived in structure from the IEEE/Wiegers SRS template (Copyright © 1999 Karl E. Wiegers, used with permission for modification and distribution).*