# Multi-Agent Startup Simulator

Production-oriented startup simulation and management workspace platform.

## What This Project Does

### Simulation App
- AI intake chat captures startup brief details.
- Multi-agent simulation runs market/customer/investor analysis.
- Results are persisted and viewable in history.
- Revisit + edit + rerun from any saved simulation.
- Optional rerun as new version (`_v2`, `_v3`, ...).
- Delete simulation runs.

### Management App
- Separate dashboard shell from simulation mode.
- Create management workspaces with guided modal setup.
- Multi-step workspace modal: Configuration -> Team -> Review.
- CV upload per team member with backend parsing (`pdf/docx/txt/md/csv/json/rtf`).
- Auto-fill of team member `name`, `role`, and qualifications from parsed CV data.
- Team members persisted on backend and used in planning context.
- AI activity planning with persisted plan history.
- Persistent management memory and activity monitoring for behind-the-scenes agentics.

## Recent Major Updates

### AI Intake / Conversation Quality
- Removed rule-based extraction for geography/target audience/CAC/etc.
- Switched intake extraction to LLM-driven parsing.
- Added LLM intent classification (`STARTUP`, `SOCIAL`, `OFFTOPIC_PERSONAL`).
- Added explicit run-confirmation behavior:
  - assistant asks whether to run now or keep adding context
  - simulation runs only after explicit go-ahead

### Simulation Lifecycle
- Added rerun endpoint from existing simulation payload.
- Added "run as new version" naming strategy (`_vN`).
- Added delete endpoint for simulations.
- Added frontend edit-and-rerun modal in results view.

### UX / Notifications
- Added global external toast notifications (`sonner`).
- Replaced browser `alert`/`confirm` usage with toast-based interactions.

### Management Intelligence + Monitoring
- Added backend CV parsing endpoint with AI-assisted name/role extraction + heuristic fallback.
- Added persistent agent memory records (`management_agent_memory`) for:
  - team profile intelligence snapshots
  - plan run summaries
  - monitor signal updates
- Added persistent activity monitor records (`management_activity_monitor`) seeded from plan activities.
- Management planning now uses persisted memory context in prompt generation.

### Management UX + Navigation
- Added dedicated management routes:
  - `/management`
  - `/management/planner`
  - `/management/signals`
- Fixed sidebar active-state behavior so only one management tab is active at a time.
- Added animated Agent Activity Stream panel for background actions (load/save/plan/team updates).
- Added topbar live status indicator: `Agents Running` / `Agents Idle`.
- Improved management light-mode readability and aligned accent colors with simulation mode.

### Codebase Layout Cleanup
- Introduced backend modular folders:
  - `backend/modules/simulation/`
  - `backend/modules/management/`
- Kept compatibility wrapper files at old paths to avoid import breakage.

## Current Backend Structure

```text
backend/
  modules/
    simulation/
      routes.py
      schemas.py
      service.py
    management/
      cv_parser.py
      routes.py
      schemas.py
      service.py
  rag/
  main.py
  models.py
  routes.py            # auth + ingestion/rag routes
  auth.py
  database.py
```

## API Highlights

### Simulation
- `POST /api/v1/simulations/intake/turn`
- `POST /api/v1/simulations/run`
- `GET /api/v1/simulations`
- `GET /api/v1/simulations/{simulation_id}`
- `POST /api/v1/simulations/{simulation_id}/rerun`
- `DELETE /api/v1/simulations/{simulation_id}`

### Management
- `POST /api/v1/management/workspaces`
- `GET /api/v1/management/workspaces`
- `GET /api/v1/management/workspaces/{workspace_id}`
- `PATCH /api/v1/management/workspaces/{workspace_id}`
- `GET /api/v1/management/workspaces/{workspace_id}/team`
- `POST /api/v1/management/workspaces/{workspace_id}/team`
- `PATCH /api/v1/management/workspaces/{workspace_id}/team/{member_id}`
- `DELETE /api/v1/management/workspaces/{workspace_id}/team/{member_id}`
- `POST /api/v1/management/workspaces/{workspace_id}/plan`
- `GET /api/v1/management/workspaces/{workspace_id}/plans`
- `GET /api/v1/management/workspaces/{workspace_id}/memory`
- `GET /api/v1/management/workspaces/{workspace_id}/monitor`
- `PATCH /api/v1/management/workspaces/{workspace_id}/monitor/{item_id}`
- `POST /api/v1/management/cv/parse`

## What Is Still Left (Recommended Next)

1. Data migrations:
- Current startup table creation is automatic.
- Add proper migration tooling (Alembic) for schema versioning in deployed environments.

2. Persistent conversation memory:
- Chat history is currently passed per request from frontend.
- Add dedicated session/message tables for long-term conversational memory.

3. Authorization hardening:
- Several endpoints still rely on email scoping from request context.
- Enforce authenticated user scoping from validated JWT claims server-side.

4. Versioning metadata:
- Reruns currently create new run records; add explicit parent-child linkage fields in DB.

5. Testing:
- Add backend tests for rerun/version/delete flows and management team CRUD.
- Add frontend integration tests for management route/tab behavior and activity stream updates.

## Run Locally

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Notes
- Frontend uses localStorage for auth token/user and some local drafts.
- Simulation and management records are persisted in the backend database.
