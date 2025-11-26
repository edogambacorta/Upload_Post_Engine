## Studio Prompt Mode + Brief Integration Plan

### Why
- Prompt mode currently renders only read-only cards; Brief & Settings stays siloed on the left even when the user is focused on drafting prompts.
- Users have to keep the Brief panel open forever just to kick off an initial run, and there is no structured area to edit post-level metadata (title, schedule, music, etc.) after generation.
- Slides contain only partial metadata (overlay title/subtitle) so handwritten edits have nowhere to be persisted besides ad-hoc text boxes.

### Goals
1. Merge the initial “Generate Slideshow Draft” experience into prompt mode so new users see the brief form when no slides exist.
2. Once a draft is generated (or loaded), replace the brief form with two editable sections:
   - **Post Section** (post-level metadata) – Title, Description, Tags, Music, Schedule.
   - **Images Section** – One card per slide with editable image text + image prompt.
3. “Save” interactions should only appear when the user changes something; saving writes back to the studio store (and eventually to persistence/API).

### Current Behavior Snapshot
- `BriefPanel` sits on the left column of `StudioEditor`. It owns Topic/Audience/model inputs and the “Generate … Draft” button.
- `PromptModeView` lives in `PreviewPanel` and currently shows:
  - Empty state (icon + instructions) when `slides.length === 0`.
  - Otherwise: summary cards + either single or multiple slide cards, all read-only.
- Store (`src/web/lib/studio/store.tsx`) has no concept of post-level metadata or “has generated yet” flag; only slides, topic, audience, etc.

### Experience Flow
1. **No slides yet**:
   - When `slides.length === 0`, prompt mode should render the Brief form instead of the current empty-state card:
     - Reuse the existing Topic/Audience/model inputs + Generate button.
     - Keep `BriefPanel` in the left column for now (so the grid layout remains stable) but mirror the form inside Prompt mode.
     - Optionally hide the left Brief panel until at least one slide is generated (future stretch).
2. **Slides generated**:
   - Replace the brief form inside prompt mode with two accordions/sections stacked vertically.
   - Post section includes editable fields, uses studio state for values, and surfaces inline validation.
   - Images section remains similar to today’s slideshow cards but with textarea inputs for `image text` and `image prompt`, plus Save/Reset actions.

### Data Model + Store Updates
1. Add a `postDetails` object to `StudioState`:
   ```ts
   interface PostDetails {
       title: string;
       description: string;
       tags: string[];
       music: string;
       scheduleDate?: string; // ISO date
       scheduleTime?: string; // HH:MM or ISO time
   }
   ```
2. Extend reducer actions:
   - `SET_POST_DETAILS` (replace entire object, e.g., after hydration).
   - `UPDATE_POST_DETAILS` (partial updates when editing).
   - `SET_HAS_GENERATED` boolean flag to know when to hide the brief form inside prompt mode.
3. When `handleGenerate` in `BriefPanel` succeeds, populate `postDetails` using the API payload (if available) or sensible defaults (topic becomes title, etc.) and set `hasGenerated` to `true`.
4. When hydrating a run in `StudioEditor`, also hydrate `postDetails` + `hasGenerated`.

### Component-Level Changes
1. **Refactor Brief form fields into a reusable component**:
   - Extract existing form inputs/button logic into `BriefForm` that accepts props for `onSubmit`, `disabled`, etc.
   - `BriefPanel` renders `BriefForm` only while `hasGenerated` is false; after the initial run completes it collapses/vanishes so the left column can later host AI chat.
   - `PromptModeView` imports `BriefForm` and renders it when `slides.length === 0` (maybe with different heading/copy).
2. **PromptModeView redesign once slides exist**:
   - Layout: `Post Details` section + `Images` section.
   - Use tabs or simple stacked cards with headings.
   - Post Details:
     - Title (input), Description (textarea), Tags (chip input or comma-separated text with helper), Music (input), Schedule (date + time inputs).
     - Each input dispatches `UPDATE_POST_DETAILS` but should be debounced or use local component state until Save is pressed.
     - Show `Save changes` + `Discard` buttons whenever local dirty state exists.
   - Images:
     - For each slide, show preview thumbnail (if any), role label, editable `Image Text` (maps to `slide.text`) and `Image Prompt` (maps to `slide.imagePrompt` or `slide.meta.imagePrompt`).
     - Each card tracks its own dirty flag; editing reveals Save/Discard buttons.
     - Saving dispatches `UPDATE_SLIDE`.
3. **Empty-state logic**:
   - When `slides.length === 0`, show the `BriefForm` plus a short explanation (“Set your brief to create prompts”).
   - Hide the storyboard strip (already handled) and keep preview canvas dimmed.

### Saving & Dirty-State Mechanics
- Introduce a lightweight `useDirtyFields` hook or local component state per section.
- Save workflow:
  1. Editing fields updates local state.
  2. `Save` button dispatches relevant action(s) **and immediately calls the backend** (optimistic update + API) so edits persist without extra steps.
  3. `Discard` resets local state from store values.
- Provide inline feedback (`Saved!` toast or subtle checkmark) so edits feel confirmed even while the network call completes.

### API / Persistence Considerations
- Right now only `handleGenerate` hits `/api/generate-draft`. Extend the API surface with endpoints such as:
  - `POST /api/studio/post-details` to save post-level edits.
  - `POST /api/studio/slides/:id` to sync image text/prompt edits.
- Use optimistic updates so UI reflects edits instantly; on failure, revert and show an error toast.
- Scheduling defaults: query the existing calendar store/service for the next day that lacks a scheduled post, auto-fill that date/time, and keep the fields editable so the user can override. Saving should also update the calendar data source to prevent double-booking.

### Implementation Steps
1. **State groundwork**
   - Update `StudioState`, actions, reducer.
   - Provide initial `postDetails` default (empty strings) and `hasGenerated: false`.
   - Update hydration + BriefPanel success path to set both.
2. **Brief form extraction**
   - Move shared form JSX into `BriefForm`.
   - `BriefPanel` becomes a simple wrapper that hides itself once `hasGenerated` is true (making room for future AI chat tools).
   - Ensure both left panel + prompt mode share button logic to avoid code duplication.
3. **PromptModeView**
   - Branch rendering: if no slides ⇒ show `BriefForm`.
   - Otherwise render new Post/Images sections with editing UX.
   - Wire up local state + Save/Discard interactions.
4. **Styling + UX polish**
   - Add section headers, subtle dividers, responsive layout (single column on small screens).
   - Ensure new inputs respect existing design tokens (bg-gray-800 etc.).
5. **QA**
   - No slides: verify Generate flow works inside prompt mode and left panel simultaneously.
   - After generation: confirm Post + Image sections show current data, Save buttons behave, storyboard still works, prompt mode toggles work.
   - Regression test slideshow vs single modes.

### Open Questions
1. Once the brief panel hides after the first run, should the new AI chat assistant occupy that column or slide in as an overlay? (Out of scope for now but influences layout.)

With the open decisions above captured, the plan now reflects immediate backend persistence, calendar-aware scheduling defaults, and the disappearing brief panel requirement.
