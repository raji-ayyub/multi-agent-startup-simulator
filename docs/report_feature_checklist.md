# Report Feature Checklist (Iteration Complete)

Date: 2026-04-15
Mode: Testing mode (Pro gating disabled intentionally)

## Data & Versioning
- [x] `business_insight_report_versions` model exists with draft/published states.
- [x] `business_insight_reports` has `published_version_id` and `latest_draft_version_id`.
- [x] Lazy backfill path exists via `ensure_report_versions_initialized`.
- [x] Draft dedupe by `content_hash`.

## Backend APIs
- [x] `GET /api/v1/reports/templates`
- [x] `GET /api/v1/reports/{id}/editor`
- [x] `GET /api/v1/reports/{id}/versions`
- [x] `POST /api/v1/reports/{id}/drafts`
- [x] `POST /api/v1/reports/{id}/publish`
- [x] `POST /api/v1/reports/{id}/preview`
- [x] `GET /api/v1/reports/{id}/export` with `version_id`, `quality`, `template_id`

## Editor UX
- [x] Dedicated report editor route.
- [x] Dedicated report studio route (`/reports/:reportId/studio`) with legacy editor fallback (`/reports/:reportId/editor`).
- [x] Full-screen report studio shell (no sidebar partition on editor route).
- [x] Single-mode live editing (no separate print-vs-edit mode).
- [x] Popup toolboxes for sections/inspector/appearance/template picker.
- [x] Drag/drop block reordering within section.
- [x] Drag/drop block moves across sections.
- [x] Section reordering.
- [x] Header/footer/page margin controls on canvas.
- [x] Structured `page_setup` metadata persisted in document model.
- [x] Rich text bubble tools on text highlight (Word-like popup).
- [x] Autosave debounce with save-status feedback.
- [x] Studio insert palette + agent suggestion toolbox with one-click apply/undo.

## Reports Index UX
- [x] Compact paginated `/reports` index.
- [x] Quick actions to open editor and export PDF.
- [x] Focused report generation with report type selection.

## PDF/HTML Rendering
- [x] Export uses versioned document source-of-truth.
- [x] Template and quality options flow to renderer.
- [x] Document theme token injection for background/text/border/margin.
- [x] Header/footer chrome injection for rendered output.
- [x] Export filename derived from report/startup/date (not generic `report.pdf`).

## Performance
- [x] Removed autosave version-list refetch redundancy (local upsert on save response).
- [x] Cached report templates in frontend service.
- [x] Frontend bundle split: React/Tiptap/Recharts vendor chunks.

## Tests & Validation
- [x] Added backend document-contract tests (`backend/tests/test_report_document_contract.py`).
- [x] Backend compile checks pass.
- [x] Frontend production build passes.

## Intentional Testing Override
- [x] Pro entitlement restrictions bypassed for testing in current iteration.
