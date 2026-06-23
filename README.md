# Multi-Agent Startup Simulator

This project is a startup strategy simulator. You describe an idea, add a bit of context, and the app runs a set of analysis flows around market, customer, and investor thinking. The results are saved so you can come back later, revise the input, rerun the simulation, and compare versions.

For now, this README sticks to the parts of the product that feel settled: simulations, reports, notifications, and the basic admin and agent-request flows. The management workspace side is still being figured out, so it is intentionally left out here.

## Current Implementations

- Talk through a startup idea in the intake chat before running anything.
- Upload a file if you want to give the simulator more context.
- Run a simulation and save the result to history.
- Open an older run, edit it, rerun it, save a new version, or delete it.
- Generate a business report from a simulation result.
- Edit reports, keep drafts, preview them, publish versions, and export them.
- Use notifications, agent requests, and the admin overview that sit around the core flow.



## Project Shape

```text
backend/
  modules/
    simulation/
      reporting/
        generator.py
        schemas.py
        templates/
      routes.py
      schemas.py
      service.py
  rag/
  main.py
  models.py
  routes.py            # auth + ingestion/rag routes
  auth.py
  agent_routes.py
  platform_routes.py
  database.py
```

The frontend is a Vite + React app. The backend is FastAPI with the simulation flow, report generation, auth, notifications, and admin-facing endpoints.

## Main API Areas

### Simulations
- `POST /api/v1/simulations/intake/file`
- `POST /api/v1/simulations/intake/turn`
- `POST /api/v1/simulations/run`
- `GET /api/v1/simulations`
- `GET /api/v1/simulations/{simulation_id}`
- `POST /api/v1/simulations/{simulation_id}/rerun`
- `DELETE /api/v1/simulations/{simulation_id}`

### Reports
- `GET /api/v1/reports`
- `GET /api/v1/reports/templates`
- `POST /api/v1/reports/plan-outline`
- `POST /api/v1/reports/generate`
- `GET /api/v1/reports/{report_id}`
- `GET /api/v1/reports/{report_id}/editor`
- `GET /api/v1/reports/{report_id}/versions`
- `POST /api/v1/reports/{report_id}/drafts`
- `POST /api/v1/reports/{report_id}/preview-draft`
- `POST /api/v1/reports/{report_id}/preview-draft/pdf`
- `POST /api/v1/reports/{report_id}/publish`
- `PATCH /api/v1/reports/{report_id}`
- `DELETE /api/v1/reports/{report_id}`
- `GET /api/v1/reports/{report_id}/preview`
- `GET /api/v1/reports/{report_id}/export`

### Platform / Admin
- `GET /api/v1/agents/catalog`
- `GET /api/v1/agents/requests`
- `POST /api/v1/agents/requests`
- `PATCH /api/v1/agents/requests/{request_id}`
- `GET /api/v1/agents/active`
- `GET /api/v1/admin/overview`
- `GET /api/v1/notifications`
- `PATCH /api/v1/notifications/{notification_id}/read`
- `POST /api/v1/notifications/read-all`

## Running It Locally

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

- Auth state and a few draft-style frontend values are stored in localStorage.
- Simulation data and report data are stored in the backend database.

## updates to be done

- Database tables are created automatically right now. Proper migrations still need to be added.
- Chat memory is mostly request-based at the moment. Long-lived conversation storage still needs its own session and message tables.
- Some authorization paths still lean on request email scoping and should be tightened around validated JWT claims.
- Reruns would benefit from clearer parent-child lineage in the database.
- Test coverage still needs to grow around simulation reruns, reporting flows, and export behavior.
