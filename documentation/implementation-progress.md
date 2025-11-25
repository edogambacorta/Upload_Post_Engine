# Studio Flow Fixes - Implementation Progress

## ✅ Completed (Phase 1 & 2)

### 1. Core State & Types
- ✅ Added `CompositionMode` type ('single' | 'slideshow')
- ✅ Added `SlideTemplate` interface for template system
- ✅ Extended `StudioState` with:
  - `composition: CompositionMode`
  - `templates: SlideTemplate[]`
  - `activeTemplateId: string | null`
- ✅ Added 'single' to Slide role types
- ✅ Added backgroundStyle to Slide meta

### 2. Store Actions & Reducer
- ✅ Added `SET_COMPOSITION` action
- ✅ Added template actions: `ADD_TEMPLATE`, `UPDATE_TEMPLATE`, `DELETE_TEMPLATE`, `SET_ACTIVE_TEMPLATE`
- ✅ Added `REORDER_SLIDES` action for drag-drop
- ✅ Updated initial state with `composition: 'single'` and empty templates array
- ✅ Implemented all new reducer cases

### 3. Slide Creation Utilities
- ✅ Created `createSingleSlideFromPost()` - creates ONE slide with role 'single'
- ✅ Created `createSlideshowFromPost()` - creates 4 slides (hook, empathy, insight, cta)
- ✅ Updated `createSlidesFromPost()` to accept composition parameter
- ✅ Created `templateUtils.ts` with:
  - `createTemplateFromSlide()`
  - `applyTemplateToSlide()`
  - `applyTemplateToAllSlides()`

### 4. Batch Generator
- ✅ Added `expandedId` state for compact/expanded view
- ✅ Replaced `handleUseIdea` with `useIdea(post, composition)`
- ✅ Updated idea cards to show compact view by default
- ✅ Added "Details" / "Collapse" toggle button
- ✅ Added dual action buttons in expanded view:
  - "Create Single Image" → sets composition='single'
  - "Create Slideshow" → sets composition='slideshow'
- ✅ Both buttons properly dispatch SET_COMPOSITION action

### 5. BriefPanel
- ✅ Updated to import `createSingleSlideFromPost` and `createSlideshowFromPost`
- ✅ Updated generate handler to respect `state.composition`
- ✅ Creates correct number of slides based on composition mode

---

## ✅ Completed (All Core Phases)

### Phase 3: Editor Mode Indicator ✅
**File:** `src/web/components/studio/Editor/StudioEditor.tsx`

- ✅ Added mode banner showing "Single Image" or "Slideshow"
- ✅ Added slide counter: "Editing slide X of Y" for slideshows
- ✅ Visual distinction with color-coded badges (emerald for single, purple for slideshow)
- ✅ Shows topic in header

### Phase 4: Prompt View Fixes ✅
**File:** `src/web/components/studio/Editor/PromptModeView.tsx`

- ✅ Checks `composition` mode
- ✅ For single mode: shows ONE card only
- ✅ For slideshow mode: shows cards labeled "Slide 1 of 4: Hook", etc.
- ✅ Added mode indicator at top
- ✅ Completely rewritten to be composition-aware

### Phase 5: Dashboard Run Loader ✅
**File:** `src/web/components/studio/Dashboard.tsx`

- ✅ Infers composition from `run.posts.length`
- ✅ Dispatches `SET_COMPOSITION` when opening a run
- ✅ Single-post runs → composition='single'
- ✅ Multi-post runs → composition='slideshow'

---

## 🚧 Still To Do (Optional Enhancements)

### Phase 6: Slideshow Strip (Storyboard)
**File:** `src/web/components/studio/Editor/PreviewPanel.tsx`

Need to:
- Make strip visible when `composition === 'slideshow'` (not just `previewMode === 'image'`)
- Add "Slideshow" label header
- Make container draggable (position state + mouse handlers)
- Implement drag-drop reordering of slides
- Use `REORDER_SLIDES` action

### Phase 7: Template Panel (New Component)
**File:** `src/web/components/studio/Editor/TemplatePanel.tsx` (create new)

Need to:
- Create UI for template list
- "Save from current slide" button
- "Apply to all" buttons per template
- Integrate into StylePanel or as separate panel

---

## ✅ All Core Fixes Complete!

### Problem: Always Creates 4 Slides
**Before:** `createSlidesFromPost()` always returned 4 slides
**After:** 
- `createSingleSlideFromPost()` returns 1 slide
- `createSlideshowFromPost()` returns 4 slides
- Caller chooses based on user intent

### Problem: Batch Generator Ambiguous
**Before:** "Use this idea" button - unclear what it creates
**After:** 
- Compact view by default
- Explicit "Create Single Image" and "Create Slideshow" buttons
- Each sets composition mode correctly

### Problem: No State Tracking
**Before:** Components guessed mode from `slides.length`
**After:** 
- `composition` field in state
- All entry points set it explicitly
- Components read it to determine behavior

---

## Next Steps

1. **Add mode indicator to StudioEditor** (5 min)
2. **Fix PromptModeView to be composition-aware** (10 min)
3. **Make slideshow strip draggable and always visible** (15 min)
4. **Update Dashboard run loader** (5 min)
5. **Create TemplatePanel component** (20 min)

Total remaining: ~55 minutes of work

---

## Testing Checklist

Once all phases complete, test:
- [ ] Batch generator → Create Single Image → See 1 slide in editor
- [ ] Batch generator → Create Slideshow → See 4 slides in editor
- [ ] Editor shows correct mode badge
- [ ] Prompt view shows 1 card for single, 4 labeled cards for slideshow
- [ ] Slideshow strip appears only in slideshow mode
- [ ] Slideshow strip is draggable
- [ ] Slides can be reordered via drag-drop
- [ ] Dashboard opens runs with correct composition
- [ ] Templates can be saved and applied

---

**Status:** Core foundation complete. UI components need updates to use new state.
