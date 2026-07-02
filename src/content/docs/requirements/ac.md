---
title: Acceptance Criteria
description: Given/When/Then acceptance criteria for Gillytech's functional requirements.
---

This document provides Given/When/Then (Gherkin-style) acceptance criteria
for the functional requirements defined in Section 4 of the
[Gillytech SRS](/requirements/srs/). Each criterion is traceable to its
source functional requirement ID (`F-<MODULE>-<NN>`).

---

## 4.1 Session Lifecycle Management

### AC-SES-01 — Create a draft session (F-SES-01)

```gherkin
Given I am authenticated as a teacher who owns class "Form 3 Biology"
When I submit a new session with title "Photosynthesis & Cell Respiration",
  class_id referencing "Form 3 Biology", and a list of 3 questions
Then the system creates a session with status "draft"
And the session is associated with exactly the class I specified
And the 3 questions are persisted in the order I provided
```

### AC-SES-02 — Auto-form groups on activation (F-SES-03)

```gherkin
Given a draft session exists for a class with 8 enrolled students
And the session currently has no groups
When the teacher transitions the session status to "active"
Then the system creates groups of at most 4 students each
And every enrolled student is assigned to exactly one group
And the session's started_at timestamp is set to the current time
```

### AC-SES-03 — Valid status transitions only (F-SES-02)

```gherkin
Given a session with status "draft"
When the teacher requests a transition directly to status "completed"
Then the system rejects the request
And the session status remains "draft"

Given a session with status "active"
When the teacher requests a transition to status "completed"
Then the system accepts the request
And the session's ended_at timestamp is set to the current time
And no further submissions are accepted for any question in this session
```

### AC-SES-04 — Add question from question bank (F-SES-04)

```gherkin
Given I am a teacher with a saved question "Q-101" in my question bank
And I have a draft session "S-1"
When I add question "Q-101" from my question bank to session "S-1"
Then the question is appended to session "S-1" with the next order_index
And the question's content, options, marks, and correct_answer
  are copied from the question bank entry
```

### AC-SES-05 — Advance current question broadcasts to participants (F-SES-05)

```gherkin
Given session "S-1" is active with current_question_index = 0
And 3 students have active WebSocket connections to session "S-1"
When the teacher advances the session to current_question_index = 1
Then the system updates the stored current_question_index to 1
And all 3 connected students receive a "question_advance" event
  with index = 1 within 5 seconds
```

### AC-SES-06 — Ending a session blocks further submissions (F-SES-06)

```gherkin
Given session "S-1" has status "active"
When the teacher ends session "S-1"
And a student then attempts to submit an answer for a question in "S-1"
Then the submission is rejected
And the session status is "completed"
```

---

## 4.2 Reasoning-First Question Submission

### AC-SUB-01 — Answer options hidden until reasoning threshold met (F-SUB-01)

```gherkin
Given I am a student viewing the current question of an active session
And I have typed 12 characters of reasoning text
When the client checks whether to display answer options
Then the answer options are NOT shown
And a hint indicates the remaining characters needed (8 more)

Given I have typed 21 characters of reasoning text
When the client checks whether to display answer options
Then the answer options ARE shown
```

### AC-SUB-02 — One submission per student per question (F-SUB-02)

```gherkin
Given I am a student who has already submitted an answer
  for question "Q-1" in session "S-1"
When I attempt to submit another answer for question "Q-1"
Then the system rejects the request with an "already submitted" error
And the original submission is unchanged
```

### AC-SUB-03 — Server-side correctness determination (F-SUB-03)

```gherkin
Given question "Q-1" has correct_answer = "2"
When a student submits answer = "2"
Then the system marks the submission is_correct = true

When a different student submits answer = "1"
Then the system marks that submission is_correct = false
```

### AC-SUB-04 — First-correct flag (F-SUB-04)

```gherkin
Given question "Q-1" has correct_answer = "2"
And no prior submission for "Q-1" has is_correct = true
When student A submits the correct answer "2"
Then student A's submission is flagged is_first_correct = true

When student B subsequently also submits the correct answer "2"
Then student B's submission is flagged is_first_correct = false
```

### AC-SUB-05 — Scoring rule (F-SUB-05)

```gherkin
Given question "Q-1" has correct_answer = "2"
And no prior correct submission exists for "Q-1"

When a student submits answer = "2" with reasoning text of 30 characters
Then the submission score = 12
  (8 for correct + 2 for first-correct + 2 for reasoning > 20 chars)

When a different student (not first) submits answer = "2"
  with reasoning text of 10 characters
Then that submission score = 8
  (8 for correct + 0 for not first + 0 for reasoning <= 20 chars)

When a student submits an incorrect answer with reasoning text of 50 characters
Then that submission score = 2
  (0 for incorrect + 0 for first-correct + 2 for reasoning > 20 chars)
```

### AC-SUB-06 — Badge awarded for first correct (F-SUB-06)

```gherkin
Given a submission is flagged is_first_correct = true
When the submission is persisted
Then a badge of type "first_correct" is created for that student,
  associated with the session
```

---

## 4.3 Real-Time Group Collaboration

### AC-CHAT-01 — WebSocket requires valid JWT (F-CHAT-01)

```gherkin
Given I have a valid JWT for a student account
When I open a WebSocket connection to /ws?sessionId=S-1&token=<valid JWT>
Then the connection is accepted
And the server sends a "connected" event with my userId and groupId

Given I provide an invalid or expired token
When I attempt to open a WebSocket connection
Then the server closes the connection immediately
```

### AC-CHAT-02 — Messages scoped to sender's group (F-CHAT-02, F-CHAT-04)

```gherkin
Given student A is in group "G-1" of session "S-1"
And student B is in group "G-2" of session "S-1"
And both have active WebSocket connections
When student A sends a chat message
Then all connected members of group "G-1" receive the message
And student B (in group "G-2") does NOT receive the message
```

### AC-CHAT-03 — Chat messages persisted (F-CHAT-03)

```gherkin
Given student A sends a chat message "I think it's option C because..."
  for question "Q-1" while in group "G-1"
When the message is processed by the server
Then a chat_messages record is created with
  group_id = "G-1", question_id = "Q-1", sender_id = student A's id,
  message text, and a timestamp
And the message is retrievable via
  GET /api/student/session/:id/chat/:questionId
```

### AC-CHAT-04 — Presence events on connect/disconnect (F-CHAT-04)

```gherkin
Given student A and student B are both in group "G-1"
And student A is already connected via WebSocket
When student B connects via WebSocket
Then student A receives a "presence" event with event = "joined"
  and student B's userId and name

When student B's connection closes
Then student A receives a "presence" event with event = "left"
```

### AC-CHAT-05 — Teacher receives cross-group broadcasts (F-CHAT-05)

```gherkin
Given a teacher has an active WebSocket connection to session "S-1"
And students in groups "G-1" and "G-2" both send chat messages
When those messages are broadcast
Then the teacher's connection receives both messages,
  regardless of group
```

---

## 4.4 Live Session Monitoring

### AC-MON-01 — Live monitor returns current question status (F-MON-01)

```gherkin
Given session "S-1" is active with current_question_index = 0
And 8 students are enrolled, of whom 5 have submitted for question 0
And 3 of those submissions are correct
When the teacher requests GET /api/teacher/sessions/S-1/live
Then the response includes:
  - current_question (without correct_answer)
  - enrolled_count = 8
  - submitted_count = 5
  - correct_count = 3
  - per-group status showing submitted/total members and group score
```

### AC-MON-02 — Reasoning text visible to teacher (F-MON-02)

```gherkin
Given a student has submitted reasoning text "Light is needed for..."
  for the current question
When the teacher requests the live monitor for the session
Then the response includes that student's name, reasoning text,
  is_correct flag, and score
```

### AC-MON-03 — Live monitor reflects new submissions within 5 seconds (F-MON-03)

```gherkin
Given the teacher's live monitor view is open and polling/subscribed
And submitted_count = 5 for the current question
When a 6th student submits an answer
Then within 5 seconds, a subsequent live monitor request
  (or pushed update) reflects submitted_count = 6
```

---

## 4.5 Analytics and CBC Competency Reporting

### AC-ANA-01 — Student leaderboard (F-ANA-01)

```gherkin
Given session "S-1" has submissions from 8 students with varying scores
When the teacher requests GET /api/teacher/sessions/S-1/analytics
Then the response includes a studentLeaderboard array
  sorted in descending order of total score
And each entry includes student name, group, total score,
  correct count, and submission count
```

### AC-ANA-02 — Group leaderboard (F-ANA-02)

```gherkin
Given session "S-1" has 4 groups with aggregate scores
  [44, 40, 42, 42] respectively
When the teacher requests session analytics
Then the groupLeaderboard array is sorted descending by total score
And ties are preserved in a stable, deterministic order
```

### AC-ANA-03 — Per-question accuracy and option distribution (F-ANA-03)

```gherkin
Given question "Q-1" has 8 submissions, 6 of which are correct,
  and answers distributed as {0: 1, 1: 1, 2: 6, 3: 0}
When the teacher requests session analytics
Then questionStats for "Q-1" includes:
  - total_attempts = 8
  - correct_count = 6
  - accuracy = 75 (rounded percentage)
  - option_distribution = {0: 1, 1: 1, 2: 6, 3: 0}
```

### AC-ANA-04 — CBC competency indicators derived (F-ANA-04)

```gherkin
Given a student answered 4 of 5 questions correctly
And submitted reasoning text averaging 60 characters per submission
And participated in 5 of 5 questions in the session
When the teacher requests session analytics
Then the cbcScores entry for that student includes:
  - critical_thinking ≈ 80 (4/5 correct, as a percentage)
  - reasoning ≈ 100 (capped; average length >= 50 chars threshold)
  - participation = 100 (5/5 questions answered)
```

### AC-ANA-05 — Admin platform overview (F-ANA-05)

```gherkin
Given the platform has 1 school, 2 teachers, 8 students,
  2 classes, 2 sessions (1 active), and 60 total submissions
  with overall accuracy 85% and 12 badges awarded
When an administrator requests GET /api/admin/overview
Then the response stats object reports exactly these counts
And includes a recentSessions list and a teachers summary list
```

---

## 4.6 Question Bank Management

### AC-QB-01 — Save a question to the bank (F-QB-01)

```gherkin
Given I am authenticated as a teacher
When I submit a new question bank entry with subject "Biology",
  topic "Photosynthesis", question text, 4 options, correct_answer = "1",
  and marks = 10
Then the system persists the question in my personal question bank
And the entry is associated with my teacher_id
```

### AC-QB-02 — Retrieve question bank for reuse (F-QB-02)

```gherkin
Given I have 5 saved questions in my question bank
When I request GET /api/teacher/question-bank
Then the response contains exactly my 5 questions
And does NOT include questions saved by other teachers
```

---

## Non-Functional Acceptance Criteria (Selected)

### AC-NF-PERF-01 — Submission latency budget (NF-PERF-01 / ASR-03)

```gherkin
Given 40 students are concurrently connected to an active session
When all 40 students submit an answer within a 10-second window
Then the p90 response time for POST /api/student/session/:id/submit
  is at most 500 ms
```

### AC-NF-PERF-02 — Real-time delivery budget (NF-PERF-02 / ASR-02, ASR-07)

```gherkin
Given 10 sessions are active concurrently, each with 40 connected students
  (400 total WebSocket connections)
When a chat message is sent in one session
Then the p90 delivery time to other members of the same group
  is at most 5 seconds
And delivery times in the other 9 sessions are unaffected
```

### AC-NF-SEC-05 — Answer key not leaked before submission (NF-SEC-05 / ASR-01)

```gherkin
Given a student has not yet submitted an answer for question "Q-1"
When the student requests the current session state
  (GET /api/student/session/:id/state)
Then the returned question object for "Q-1" does NOT include
  a correct_answer field

Given the same student then submits an answer for "Q-1"
When the submission response is returned
Then the response MAY include correct_answer,
  for the purpose of showing the result
```
