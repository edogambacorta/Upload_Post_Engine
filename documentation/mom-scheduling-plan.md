# Simple Plan: Scheduling Posts in `/mom`

This guide keeps a narrow focus: capture a schedule date for every generated MomMirror post and pass it through the stack so Upload-Post can use it when we flip the switch.

## 1. Goals
- Let users pick a date/time for each post before anything hits Upload-Post.
- Persist that schedule alongside run data so it survives refreshes.
- Make `publishImages` aware of `scheduled_date`, but keep real uploads behind a dry-run flag.

## 2. Frontend To-Dos
1. **Collect scheduling info**
   - In `Step1_Configure`, add inputs for a start datetime and spacing (e.g., “every N hours”).
   - Store the result in `WizardConfig`.
2. **Show/edit per-post dates**
   - When posts appear in `Step3_GenerateImages`, display each assigned ISO timestamp and allow tweaking.
   - Mirror the same controls in the run details dialog (`PostCard`) so schedules stay editable later.
3. **Shared helpers + types**
   - Add `scheduledDate?: string` to `GeneratedImage`, `MomUiPost`, etc.
   - Create a helper (e.g., `buildScheduleSlots({ start, interval, count })`) so UI logic is centralized.

## 3. Backend To-Dos
1. **Types & storage**
   - Add `scheduledDate?: string` to `MomPost`, `Post`, and `RunState` inside `src/services/runOrchestrator.ts`.
   - Ensure `meta.json` saves the new field whenever the UI sends it.
2. **API endpoints**
   - Accept `schedulePlan` on `POST /api/mom-runs` so the server can pre-fill slots if needed.
   - Create `PATCH /api/mom-runs/:runId/posts/:postId/schedule` for edits; validate the timestamp is ISO‑8601, UTC, and in the future.
3. **Dry-run publishing**
   - Update `publishImages` to accept `{ scheduledDate }` per post.
   - Respect `UPLOAD_POST_DRY_RUN=true` (default) to log the outgoing payload instead of calling Upload-Post.

## 4. Upload-Post Readiness Checklist
- Map `scheduledDate` to Upload-Post’s `scheduled_date` field (see `documentation/upload-post-com.md`).
- Include `profile_username`, caption/title, and media URL in the logged payload so QA can confirm the shape without real uploads.
- Once ready, set `UPLOAD_POST_DRY_RUN=false` and send the same payload for real.

## 5. Quick Testing Notes
- Unit-test the scheduling helper (interval math, future-date validation).
- Manual QA: create a run, assign schedules, refresh the dashboard, and confirm times persist.
- Verify server logs show the `scheduled_date` when `autoPublish` is enabled with dry-run on.
