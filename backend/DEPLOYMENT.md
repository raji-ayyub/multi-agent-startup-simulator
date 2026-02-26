# Backend Deployment (Docker + Render)

## Included Deployment Files

- `backend/Dockerfile`
- `backend/.dockerignore`
- `render.yaml` (repo root)

## Local Docker

```bash
cd backend
docker build -t pentraai-backend .
docker run --rm -p 8000:8000 --env-file .env pentraai-backend
```

API:
- `http://localhost:8000`
- `http://localhost:8000/health`
- `http://localhost:8000/docs`

## Render (Blueprint)

1. Push this repo to GitHub/GitLab.
2. In Render, click **New +** -> **Blueprint**.
3. Select your repository.
4. Render will read `render.yaml` and create service `pentraai-backend`.
5. Set required env vars:
   - `DATABASE_URL`
   - `SECRET_KEY`
   - `CORS_ORIGINS` (comma-separated origins; include your frontend URL)
6. Deploy and verify `/health`.

## Notes

- App now reads port from `PORT` automatically.
- CORS is configurable with `CORS_ORIGINS`.
- Ensure `DATABASE_URL` is a production PostgreSQL URL.
