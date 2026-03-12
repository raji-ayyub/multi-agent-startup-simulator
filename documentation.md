# Deveda Platform Documentation

This document describes the current Deveda platform as implemented in this repository.

Use it as:
- a feature inventory
- a UX and layout reference
- an integration brief for a similar platform
- a prompt context source for Codex on another repo

The goal is not to clone file-for-file implementation details. The goal is to reproduce the product shape, role flows, data responsibilities, and agentic behavior with minimal unnecessary complexity.

## 1. Product Summary

Deveda is a coding learning platform focused on:
- Frontend Development
- Backend Development
- Systems Design

It supports three account roles:
- `Student`
- `Instructor`
- `Admin`

The platform combines:
- public marketing and browsing pages
- learner enrollment and progress tracking
- instructor course authoring and lesson operations
- admin governance and analytics
- Cloudinary-backed image uploads
- milestone celebrations and course completion certificates
- a role-aware multi-agent system with admin approval

## 2. Tech Stack

### Frontend

- Next.js App Router
- React 18
- TypeScript
- Tailwind CSS
- Lucide icons
- Recharts / Chart.js for dashboards

### Backend

- FastAPI
- Motor / MongoDB
- JWT authentication
- Passlib PBKDF2 password hashing
- Cloudinary signed uploads

### Runtime / Infra

- Docker Compose
- MongoDB 7
- Frontend talks to backend over HTTP

## 3. Core Roles and Access Model

### Student

Student accounts are learner-facing accounts.

They can:
- register publicly
- log in publicly
- browse courses
- enroll in courses
- learn inside lesson pages
- take quizzes
- track progress
- receive achievements and certificates
- request approved agents like lesson tutor or platform support

They cannot:
- access instructor dashboard
- access admin dashboard
- author curriculum or question bank content

### Instructor

Instructor accounts are teaching and content-operation accounts.

They can:
- register publicly
- log in
- access instructor dashboard
- manage course catalog entries
- manage curriculum
- manage quizzes and question bank content
- use instructor profile and settings
- request approved agents like course builder, progress analyst, lesson tutor, and platform support

They do not behave like learners.

Important constraints:
- they are not treated as enrolled students
- they do not use learner progress flows
- they do not use learner profile structure
- learner-only endpoints are blocked for non-students

### Admin

Admin accounts are private/internal.

They can:
- log in through admin sign-in
- access admin dashboard
- manage users
- create users
- manage catalog, curriculum, questions, quizzes, analytics
- approve or reject agent requests

Admin creation is private and protected by `ADMIN_SETUP_SECRET`.

## 4. Authentication and Account Flows

### Public Registration

Public `/register` supports:
- `Student`
- `Instructor`

Registration collects:
- first name
- last name
- email
- password
- role

Behavior:
- student registration redirects to learner profile
- instructor registration redirects to instructor profile/workspace

### Login

Public `/login` routes based on role:
- `Student` -> `/profile`
- `Instructor` -> `/instructor/dashboard`
- `Admin` -> `/admin/dashboard`

### Private Admin Setup

Private admin setup exists at:
- frontend: `/admin/setup`
- backend: `/auth/private-admin/register`

Requires:
- `ADMIN_SETUP_SECRET`

### Auth Session

Backend session endpoint:
- `/auth/me`

Password change endpoint:
- `/auth/change-password`

## 5. Layouts and Navigation

## 5.1 Global Layout

Frontend root layout:
- wraps all pages in `AuthProvider`
- renders a global header

Global header behavior:
- public navigation to home, courses, quizzes, lessons, about
- authenticated user dropdown
- role-aware profile link
- link to Agent Hub
- settings and logout

## 5.2 Student Layout Shape

Students mostly use:
- global marketing/browsing header
- learner profile page
- course catalog
- course detail page
- lesson player
- quiz pages
- settings

There is no separate student dashboard shell yet. The learner experience is centered around `/profile` and course pages.

## 5.3 Instructor Layout

Instructor shell is separate and enforced.

Primary route:
- `/instructor/dashboard`

Instructor side navigation:
- Dashboard
- Courses
- Quizzes
- Questions
- Curriculum
- Analytics
- Agents
- Settings

Instructor profile exists separately at:
- `/instructor/profile`

This profile is not a learner profile clone.

## 5.4 Admin Layout

Admin shell is separate and admin-only.

Primary route:
- `/admin/dashboard`

Admin side navigation:
- Dashboard
- Users
- Courses
- Quizzes
- Questions
- Curriculum
- Analytics
- Agents
- Settings

## 6. Frontend Route Inventory

### Public / Shared

- `/`
- `/about`
- `/courses`
- `/courses/[slug]`
- `/courses/[slug]/learn`
- `/quiz`
- `/quiz/[id]`
- `/lessons`
- `/lessons/async-api`
- `/lessons/flexbox`
- `/lessons/quiz`
- `/login`
- `/register`
- `/settings`
- `/agents`

### Student

- `/profile`

### Instructor

- `/instructor/profile`
- `/instructor/dashboard`
- `/instructor/dashboard/courses`
- `/instructor/dashboard/quizzes`
- `/instructor/dashboard/questions`
- `/instructor/dashboard/cms`
- `/instructor/dashboard/analytics`
- `/instructor/dashboard/settings`

### Admin

- `/admin/login`
- `/admin/setup`
- `/admin/dashboard`
- `/admin/dashboard/users`
- `/admin/dashboard/courses`
- `/admin/dashboard/quizzes`
- `/admin/dashboard/questions`
- `/admin/dashboard/cms`
- `/admin/dashboard/analytics`
- `/admin/dashboard/agents`
- `/admin/dashboard/settings`

## 7. Core Product Features

## 7.1 Course Catalog

The platform has a coding-only course catalog.

Each course includes:
- slug
- title
- description
- category
- difficulty
- duration
- total quizzes
- total lessons
- instructor
- prerequisites
- tags
- thumbnail
- thumbnail public id

Catalog supports:
- listing
- filtering
- search
- detail page
- course creation
- course update
- course deletion
- course statistics
- enrollments view per course

Categories:
- Frontend Development
- Backend Development
- Systems Design

Difficulties:
- Beginner
- Intermediate
- Advanced
- Mastery

## 7.2 Curriculum Management

Each course can have a curriculum document.

Curriculum includes:
- overview
- modules
- lessons per module
- milestone projects
- assessment titles and quiz IDs
- updated by / updated at
- scaffold flag

If no curriculum exists, the backend can scaffold one automatically from the course.

Curriculum management is available to:
- Admin
- Instructor

## 7.3 Learner Enrollment and Progress

Student-only course flows:
- enroll in course
- list enrolled courses
- get progress for one course
- update progress

Progress updates can trigger:
- milestone awards
- course completion certificate generation

Important:
- instructors and admins are blocked from learner-only course progress behavior

## 7.4 Quizzes and Question Bank

Quiz system includes:
- quizzes list
- quiz questions by quiz
- learner quiz attempt submission
- user quiz attempt history
- full question bank listing
- question create/update/delete

Question model includes:
- question
- options
- correct answer
- explanation
- points
- question type
- difficulty
- time limit
- created by
- active state

Question management is available to:
- Admin
- Instructor

Quiz attempts are student-only learning records.

## 7.5 Achievements and Certificates

Achievement system supports:
- milestone awards
- course completion awards
- styled celebration moments
- parent/guardian-friendly summary text
- certificate metadata

Achievement data includes:
- title
- description
- celebration message
- badge label
- badge tone
- trigger progress
- skills
- deliverables
- parent summary
- award date

Certificate includes:
- code
- label
- issued at
- issuer
- skills
- share note

Frontend learner experience includes:
- celebration modal after qualifying progress changes
- achievement showcase on learner profile

## 7.6 Cloudinary Media Uploads

Cloudinary is used for image uploads through signed browser uploads.

Supported asset types:
- profile
- course

Current usage:
- user avatar/profile photo
- course thumbnails

The backend generates signed upload payloads. The frontend uploads directly to Cloudinary.

## 7.7 Settings

Shared account settings page:
- first name
- last name
- email
- avatar upload
- role display
- password change

Settings text changes based on role so the experience feels role-aware.

## 7.8 Analytics

Analytics endpoints and screens provide:
- total users
- total courses
- total quizzes/questions
- active users
- recent registrations
- average progress
- recent activity
- chart data

Used mainly in:
- admin dashboard
- instructor dashboard snapshot

## 7.9 Multi-Agent System

This is a major feature.

Current agent types:
- `course_builder`
- `progress_analyst`
- `lesson_tutor`
- `platform_support`

### Agent Request Model

Agents are not auto-enabled for users.

Flow:
1. instructor or student requests agent
2. request is stored
3. admin approves or rejects
4. approved assignment can open chat threads

### Agent Capabilities

#### Course Builder

For instructors.

Can:
- scan real course catalog and curriculum
- answer course-specific questions using real platform data
- summarize actual course content
- evaluate likely course effectiveness
- create persisted curriculum draft artifacts

Safe write capability:
- creates `curriculum_draft` artifact
- does not directly overwrite live curriculum

#### Progress Analyst

For instructors.

Can:
- inspect learner progress
- inspect learner quiz performance
- inspect learner achievements
- summarize strengths and friction points
- suggest lesson planning adjustments

Safe write capability:
- creates `lesson_plan_note` artifact
- does not directly mutate learner records

#### Lesson Tutor

For students and instructors.

Can:
- teach lesson material in side chat
- explain with examples
- explain with step-by-step reasoning
- explain with simpler wording
- use story or analogy style
- use course and lesson context

UI:
- side drawer inside lesson player
- toggleable on/off

#### Platform Support

For students and instructors.

Can:
- scan known platform areas
- answer navigation questions
- return route-aware CTA metadata
- guide users after platform updates without relying only on hardcoded UI assumptions

### Agent Persistence

Mongo collections:
- `agent_assignments`
- `agent_threads`
- `agent_messages`
- `agent_artifacts`

### Agent Artifacts

Persisted agent outputs:
- curriculum drafts
- lesson planning notes

These are intentional safe intermediate outputs.

This means the current system supports:
- read/scan platform context
- chat with role-aware agents
- generate saved work products

It does not yet support:
- direct apply-to-live-curriculum from artifact
- fully automated mutation of core platform data

That would be the next safe workflow step.

## 8. UX Intent and Product Design Rules

Important product principles already visible in the implementation:

- role separation should be structural, not cosmetic
- instructors must not inherit learner assumptions
- admin, instructor, and student workflows should stay distinct
- screens should stay compact and functional
- avoid overwhelming young users with bulky interfaces
- agent features should feel helpful, not noisy
- lesson tutor should be available on demand, not forced
- admin approval should gate agent power
- safe writes should create drafts/notes first before mutating live data

## 9. Backend API Domains

The backend OpenAPI is intentionally grouped into these domains:
- System
- Authentication
- Users
- Course Enrollment
- Course Catalog
- Curriculum
- Quizzes
- Question Bank
- Analytics
- Media
- Achievements
- Agents

This organization should be preserved in similar projects.

## 10. Main Data Shapes

### User

- id
- email
- firstName
- lastName
- role
- isActive
- avatarUrl
- avatarPublicId
- createdAt
- lastLogin

### Course

- slug
- title
- description
- category
- difficulty
- duration
- totalLessons
- totalQuizzes
- instructor
- prerequisites
- tags
- thumbnail

### Curriculum

- courseSlug
- overview
- modules[]
- milestoneProjects[]
- updatedAt
- updatedBy

### User Course

- userId
- courseSlug
- category
- difficulty
- progress
- completed
- lastAccessed
- enrolledAt

### Quiz Attempt

- userId
- quizId
- courseSlug
- score
- passed
- attemptedAt

### Achievement

- userId
- courseSlug
- courseTitle
- kind
- key
- title
- description
- celebrationMessage
- badgeLabel
- badgeTone
- progressTrigger
- skills
- deliverables
- parentSummary
- awardedAt
- certificate

### Agent Assignment

- userId
- requestedBy
- targetUserId
- agentType
- displayName
- notes
- courseSlug
- lessonSlug
- status
- adminNotes
- approvedBy
- approvedAt
- createdAt
- updatedAt

### Agent Thread

- assignmentId
- userId
- title
- agentType
- context
- lastMessagePreview
- createdAt
- updatedAt

### Agent Message

- threadId
- role
- content
- metadata
- createdAt

### Agent Artifact

- assignmentId
- threadId
- userId
- agentType
- artifactType
- title
- summary
- status
- route
- payload
- createdAt

## 11. Environment Variables and Settings

### Backend Required / Important

- `MONGO_URI`
- `DB_NAME`
- `JWT_SECRET`
- `ACCESS_TOKEN_EXPIRE_MINUTES`
- `ADMIN_SETUP_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

### Frontend

Currently the frontend API base is hardcoded to `http://localhost:8000`.

There is evidence the code was intended to support:
- `NEXT_PUBLIC_API_URL`

For a cleaner similar project, this should be restored and used consistently.

## 12. Container and Runtime Setup

Docker Compose services:
- `api`
- `mongo`

Default exposed ports:
- backend: `8000`
- mongo: `27017`

## 13. Known Architectural Decisions to Preserve

- use role-aware route redirection after login/register
- use separate instructor and admin shells
- keep learner experience outside admin/instructor shell complexity
- use backend authorization, not only frontend hiding
- keep Cloudinary upload direct-from-browser with signed backend payload
- keep achievement generation on progress milestones
- keep agent approval workflow admin-governed
- keep agent write actions safe and draft-oriented first
- let support agents scan current platform structure rather than rely on brittle static copy

## 14. What Should Be Integrated into a Similar Project

If another repo is meant to adopt this product direction, it should integrate:

- three-role auth model: student, instructor, admin
- private admin bootstrap
- separate admin and instructor dashboards
- learner profile with progress, achievements, and certificates
- course catalog with curriculum and milestone projects
- quiz/question bank authoring and learner attempts
- Cloudinary signed uploads for profile and course images
- achievements and certificate system
- agent request/approval/chat architecture
- lesson-side tutor drawer
- support agent with platform navigation awareness
- safe agent artifacts for curriculum drafts and lesson plan notes

## 15. What Codex Should Not Do in the Similar Repo

When implementing this in another project, Codex should avoid:

- mixing instructor and student profile structures
- giving instructors learner enrollment assumptions
- making agent access public and ungated
- letting agents directly mutate production course data without review
- bloating the UI with full-page chat products everywhere
- adding unnecessary microservices or excessive directories for this feature set

## 16. Recommended Integration Strategy for the Similar Project

Suggested order:

1. establish roles and route guards
2. establish separate admin and instructor layouts
3. add course/catalog/curriculum data structures
4. add learner progress and achievement layer
5. add Cloudinary upload flow
6. add agent request/approval/chat persistence
7. add lesson tutor drawer
8. add safe agent artifacts
9. only then consider direct apply-to-live workflows

## 17. Prompt-Ready Codex Brief

Use the text below as a starting prompt in another similar repo:

```md
Implement a Deveda-like coding learning platform structure in this repo.

Required product shape:
- three roles: Student, Instructor, Admin
- Student and Instructor can register publicly
- Admin creation must be private/secret-protected
- role-based login redirects
- Student experience must be learner-centered
- Instructor experience must be a separate teaching workspace, not a student clone
- Admin experience must be a separate governance workspace

Core features to implement or preserve:
- course catalog with coding categories and difficulty levels
- curriculum with modules, lessons, assessments, and milestone projects
- learner course enrollment and progress
- quiz system and question bank
- achievements, milestone celebrations, and completion certificates
- Cloudinary-backed profile/course image uploads
- shared settings page with role-aware copy
- analytics for admin/instructor

Agentics requirements:
- multi-agent system with at least course builder, progress analyst, lesson tutor, and platform support
- agent requests must require admin approval
- approved agents must support chat threads and stored messages
- agents must scan real platform data in their domain instead of answering generically
- lesson tutor must be available as a side chat drawer during lessons
- support agent must understand navigation and return actionable guidance
- safe write-actions must create persisted artifacts first, such as curriculum drafts or planning notes
- do not directly mutate live core content from agent chat without a review/apply step

UX requirements:
- keep the interface compact and not overwhelming
- functionality over bulky screens
- make role separation structural
- use minimal directories/files necessary
- keep code self-explanatory

Treat this as a product integration task, not just a UI feature.
```

## 18. Final Notes

This repository already contains the major product pillars:
- role-separated access
- course platform
- curriculum and assessments
- learner progress and recognition
- media uploads
- agentics with approval and safe write outputs

If another project is meant to match this direction, this document should be treated as the product contract.
