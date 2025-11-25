# Studio Editor Interaction Investigation

## Context
- URL: `http://localhost:5173/studio/editor?runId=2025-11-25T06-06-50-808Z`
- Expected: two editing modes
  - **Image mode:** select/move/scale the generated background visual and switch between generated slides.
  - **Text mode:** select and reposition the caption overlay while editing copy.
- Actual: canvas shows only the base photo; text is invisible and neither mode allows any interaction. Image mode provides no selectable objects, and text mode shows no active text box.

## Findings
1. **`PreviewPanel.tsx`** always marks background images as non-interactive (`selectable=false`, `evented=false`) and never tracks them again, so switching into image mode still leaves the image locked.
2. The text overlay is rendered, but our `slides` often contain HTML-encoded captions (`&lt;br&gt;`, `<p>`), so Fabric receives raw markup. That string renders as empty whitespace, reinforcing the perception that “no text” loaded.
3. We only exposed the storyboard strip when `mode === 'carousel'`. Deep-linked runs default to `infographic` until hydration finishes, so there is a brief period (or the entire session when hydration fails) where there is no way to “pick from all generated images”.
4. Positions for either layer were not persisted. Even if the developer temporarily enabled Fabric selection, clearing/re-rendering the canvas would snap everything back to the hard-coded positions (`left: 48`, `top: 1100`). This produces the feeling that elements “can’t be moved” because any attempt instantly resets on state change.

Files involved:
- `src/web/components/studio/Editor/PreviewPanel.tsx`
- `src/web/lib/studio/types.ts`
- `src/web/components/studio/Calendar/UnscheduledPosts.tsx` (for duplicate key warnings seen alongside the editor logs)
- `docs/studio-editor-empty-stage.md` (prior investigation)

## Fix Summary
1. **Interactive Fabric layers (`PreviewPanel.tsx`)**
   - Track both the text box and background image via refs so edit-mode toggles can reconfigure `selectable`, `evented`, movement locks, and cursors.
   - Store layer transforms in `Slide` (`textBox`, `imageTransform`) and dispatch updates inside Fabric’s modification events so user changes persist.
   - Normalize HTML/encoded captions before creating the Fabric `Textbox`, guaranteeing visible copy.
   - Always show the storyboard strip whenever multiple slides exist so deep-linked runs can “pick from all generated images” immediately.
   - When the background image finishes loading we reinsert the text layer so it stays on top, and the new edit-mode toggles now unlock either the image or the caption depending on the active mode.
2. **Type updates (`types.ts`)** — extend `Slide` to include layout/transform metadata.
3. **Minor UX polish (`UnscheduledPosts.tsx`)** — ensure list keys remain unique across runs, removing the console warnings that were drowning out the editor logs.

### Canvas Mask / Overflow Improvements
- The preview frame (`PreviewPanel.tsx`) now uses `overflow-visible` along with a custom mask overlay (two absolutely positioned `div`s: one with a massive box-shadow to dim everything outside the rounded crop, another rendering the border). This keeps selection handles visible when users drag content outside the frame while still hinting at the exportable area.
- The background image object is inserted before the text, and when it finishes loading the text layer is re-added so the caption always sits above the image. Fabric selection locks respect the active mode, allowing text mode to edit copy and image mode to move/scale visuals.
