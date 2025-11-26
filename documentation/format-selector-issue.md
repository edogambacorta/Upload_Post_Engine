# Format Selector Issue Investigation

**Date**: 2025-11-26  
**URL**: http://localhost:5174/studio/editor?runId=2025-11-26T06-54-47-200Z  
**Component**: Studio Editor - Format Selector

## Issue Summary

The format selector in the Studio Editor has two critical issues:

1. **Canvas Centering**: When changing the aspect ratio format, the export frame and content do not properly center on the canvas
2. **State Persistence**: The selected aspect ratio is not saved to the document/run metadata, so it's lost on page refresh

## Current Behavior

### Format Selector UI
- Located in `PreviewPanel.tsx` (lines 989-1027)
- Displays current aspect ratio (e.g., "4:5", "9:16", etc.)
- Dropdown menu allows selection from predefined aspect ratios
- On selection, dispatches `SET_ASPECT_RATIO` action

### State Management Flow

1. **Format Change Handler** (`PreviewPanel.tsx:989-992`):
```typescript
const handleFormatChange = (newRatio: AspectRatio) => {
    dispatch({ type: 'SET_ASPECT_RATIO', payload: newRatio });
    setShowFormatDropdown(false);
};
```

2. **Store Reducer** (`store.tsx:142-147`):
```typescript
case 'SET_ASPECT_RATIO':
    return {
        ...state,
        aspectRatio: action.payload,
        exportFrame: createExportFrameConfig(action.payload),
    };
```

3. **Export Frame Config** (`aspectRatioUtils.ts`):
   - Creates new width/height based on aspect ratio
   - Updates `exportFrame` in state with new dimensions

### Canvas Rendering

The canvas rendering logic in `PreviewPanel.tsx` (lines 460-858) creates:
- Export frame rectangle (white background)
- Overlay rectangles (dimming outside export frame)
- Background image (scaled to cover export frame)
- Text box

**Key Variables**:
- `exportWidth`, `exportHeight`: Derived from `state.exportFrame`
- `frameOffsetX`, `frameOffsetY`: Calculated to center the export frame on the artboard
- `artboardWidth`, `artboardHeight`: Fixed canvas size (2000x2000)

## Problems Identified

### Problem 1: Canvas Not Re-centering

**Root Cause**: The canvas rendering effect depends on:
```typescript
useEffect(() => {
    // ... canvas rendering logic
}, [
    selectedSlide?.id,
    selectedSlide?.imageUrl,
    slides.length,
    selectedSlideId,
    dispatch,
    onTextSelected,
    editMode,
    exportWidth,
    exportHeight,
    frameOffsetX,
    frameOffsetY,
    getOverlayGeometry,
]);
```

When aspect ratio changes:
- `exportWidth` and `exportHeight` update (from `exportFrame`)
- `frameOffsetX` and `frameOffsetY` are recalculated
- The effect **should** re-run and re-center

**However**, there may be issues with:
1. **Viewport state**: The viewport pan/zoom state might not reset when format changes
2. **Object positioning**: Existing canvas objects (image, text) might retain their old positions
3. **Timing**: The canvas might not fully re-render before objects are added

### Problem 2: Aspect Ratio Not Persisted

**Root Cause**: The aspect ratio is only stored in the React state, not in the run metadata.

**Evidence**:
1. **Run Hydration** (`runLoader.ts:99-113`):
   - Does NOT load or set aspect ratio from run metadata
   - Only loads: slides, topic, audience, postType, composition

2. **Run State Storage** (`server.ts:178-240`):
   - When generating visuals, aspect ratio is hardcoded to `'3:4'`
   - Not read from the current state
   - Not saved to run metadata

3. **Run Metadata Structure**:
   - Based on `server.ts:352`, runs have `momConfig.aspectRatio`
   - This is used for display in scheduled posts
   - But NOT loaded back into the editor state

4. **StudioEditor** (`StudioEditor.tsx:78-104`):
   - Hydrates: topic, audience, mode, composition, slides, postDetails
   - Does NOT dispatch `SET_ASPECT_RATIO` from loaded run data

## Data Flow Analysis

### Current Flow (Aspect Ratio)
```
User selects format
  ↓
handleFormatChange() dispatches SET_ASPECT_RATIO
  ↓
Store updates: state.aspectRatio, state.exportFrame
  ↓
PreviewPanel re-renders with new exportWidth/exportHeight
  ↓
Canvas effect re-runs (should re-center)
  ↓
❌ State is lost on refresh (not persisted)
```

### Expected Flow (with Persistence)
```
User selects format
  ↓
handleFormatChange() dispatches SET_ASPECT_RATIO
  ↓
Store updates: state.aspectRatio, state.exportFrame
  ↓
PreviewPanel re-renders with new exportWidth/exportHeight
  ↓
Canvas effect re-runs and re-centers
  ↓
Aspect ratio saved to run metadata (via API)
  ↓
On page load: runLoader fetches aspect ratio from metadata
  ↓
StudioEditor dispatches SET_ASPECT_RATIO during hydration
  ↓
✅ State is restored correctly
```

## Files Involved

### Frontend
- **`src/web/components/studio/Editor/PreviewPanel.tsx`**: Format selector UI, canvas rendering
- **`src/web/lib/studio/store.tsx`**: State management, SET_ASPECT_RATIO reducer
- **`src/web/lib/studio/aspectRatioUtils.ts`**: Aspect ratio calculations
- **`src/web/lib/studio/runLoader.ts`**: Run hydration logic
- **`src/web/components/studio/Editor/StudioEditor.tsx`**: Editor initialization, run loading

### Backend
- **`src/server.ts`**: API endpoints for runs, visual generation
- **`src/services/runOrchestrator.ts`**: Run state management (likely)

### Types
- **`src/web/lib/studio/types.ts`**: StudioState, AspectRatio, ExportFrameConfig

## UI Improvement Requirements

### Format Selector Enhancement
**Current**: Displays aspect ratio as text only (e.g., "4:5")  
**Required**: Display a visual white square/rectangle that shows the actual aspect ratio
- Makes the format instantly recognizable
- More intuitive than reading numbers
- Should be small enough to fit in the toolbar

### Mode Selector Enhancement
**Current**: Shows only icons for Prompt/Text/Image modes  
**Required**: Always show text labels after the icons
- Icon + "Prompt"
- Icon + "Text"  
- Icon + "Image"
- Improves clarity and accessibility

## Proposed Solutions

### Solution 1: Fix Canvas Centering

**Option A**: Reset viewport when aspect ratio changes
```typescript
case 'SET_ASPECT_RATIO':
    return {
        ...state,
        aspectRatio: action.payload,
        exportFrame: createExportFrameConfig(action.payload),
        viewport: {
            zoom: 1,
            panX: 0,
            panY: 0,
        },
    };
```

**Option B**: Force canvas re-initialization
- Clear all objects
- Recalculate all positions
- Re-add objects with new coordinates

**Option C**: Adjust existing object positions
- Calculate offset delta
- Update image and text positions proportionally

### Solution 2: Persist Aspect Ratio

**Step 1**: Update run metadata structure
- Ensure `momConfig.aspectRatio` or `aspectRatio` field exists in run metadata

**Step 2**: Save aspect ratio when generating visuals
- In `server.ts` `/api/generate-visuals`, read aspect ratio from request body
- Store in run metadata

**Step 3**: Load aspect ratio during hydration
- In `runLoader.ts`, extract aspect ratio from run response
- Include in `RunHydrationPayload`

**Step 4**: Dispatch aspect ratio in StudioEditor
- In `StudioEditor.tsx`, dispatch `SET_ASPECT_RATIO` with loaded value

**Step 5**: Update aspect ratio when changed
- Add API endpoint to update run metadata
- Call from `handleFormatChange` or via debounced effect

## Testing Checklist

- [ ] Change aspect ratio from 4:5 to 9:16
  - [ ] Export frame resizes correctly
  - [ ] Export frame stays centered on canvas
  - [ ] Image scales to cover new frame
  - [ ] Text repositions appropriately
  - [ ] Viewport doesn't jump unexpectedly

- [ ] Change aspect ratio and refresh page
  - [ ] Selected aspect ratio is restored
  - [ ] Canvas renders with correct dimensions
  - [ ] Content is positioned correctly

- [ ] Change aspect ratio multiple times
  - [ ] No memory leaks
  - [ ] Canvas remains responsive
  - [ ] Undo/redo works (if implemented)

- [ ] Generate new visuals with custom aspect ratio
  - [ ] Images are generated at correct dimensions
  - [ ] Aspect ratio is saved to run metadata

## Additional Notes

### Aspect Ratio Options
From `aspectRatioUtils.ts`, supported ratios:
- 1:1 (1080x1080) - Square
- 4:5 (1080x1350) - Portrait (Instagram)
- 9:16 (1080x1920) - Vertical (Stories/Reels)
- 16:9 (1920x1080) - Landscape (YouTube)
- 3:4 (1080x1440) - Portrait

### Default Aspect Ratio
- Initial state: `'4:5'` (store.tsx:59)
- Hardcoded in visual generation: `'3:4'` (server.ts:194, 216)
- **Inconsistency**: Default should be unified

### Related Components
- **Dashboard**: May need to display aspect ratio when listing runs
- **Gallery**: Already uses aspect ratio for filtering (galleryService.ts:66)
- **Export**: Uses aspect ratio for final image dimensions

## Recommendations

1. **High Priority**: Fix state persistence
   - This is a data loss issue
   - Users expect their settings to be saved

2. **Medium Priority**: Fix canvas centering
   - Affects user experience
   - Can be worked around by manual panning

3. **Low Priority**: Unify default aspect ratio
   - Inconsistency is confusing
   - Should match most common use case (Instagram 4:5)

4. **Future Enhancement**: Allow custom aspect ratios
   - Currently limited to predefined options
   - Power users may want flexibility

## Implementation Status

### ✅ Completed (2025-11-26)

1. **UI Enhancements**
   - ✅ Format selector now displays visual aspect ratio preview (white rectangle)
   - ✅ Format dropdown shows visual previews for all aspect ratio options
   - ✅ Mode buttons now show text labels ("Prompt", "Text", "Image") alongside icons
   - **Files Modified**: `src/web/components/studio/Editor/PreviewPanel.tsx`

2. **Canvas Centering Fix**
   - ✅ Viewport (zoom/pan) now resets when aspect ratio changes
   - ✅ Export frame automatically re-centers on the canvas
   - **Files Modified**: `src/web/lib/studio/store.tsx`

3. **Aspect Ratio Loading (Partial)**
   - ✅ Aspect ratio is now extracted from run metadata during hydration
   - ✅ StudioEditor dispatches SET_ASPECT_RATIO when loading a run
   - ✅ Default aspect ratio is '4:5' if not specified in run data
   - **Files Modified**: 
     - `src/web/lib/studio/runLoader.ts`
     - `src/web/components/studio/Editor/StudioEditor.tsx`

### ⚠️ Remaining Work

1. **Aspect Ratio Persistence (Saving)**
   - ❌ Aspect ratio changes are NOT yet saved back to run metadata
   - ❌ Need to add API endpoint to update run metadata
   - ❌ Need to call API when aspect ratio changes (debounced)
   - **Required Changes**:
     - Add `PATCH /api/runs/:id` endpoint in `src/server.ts`
     - Add `updateRunMetadata` function in orchestrator
     - Add effect in `PreviewPanel` or `StudioEditor` to save aspect ratio changes

2. **Visual Generation Consistency**
   - ❌ `/api/generate-visuals` still hardcodes aspect ratio to '3:4'
   - ❌ Should read from request body or current state
   - **Required Changes**:
     - Update `server.ts` line 194, 216 to use dynamic aspect ratio

### Testing Results

- ✅ Format selector displays visual preview correctly
- ✅ Mode buttons show text labels
- ✅ Format dropdown shows visual previews for all options
- ✅ Canvas re-centers when aspect ratio changes
- ⚠️ Aspect ratio persistence on refresh: **Partially working** (loads but doesn't save)
  - Will load if run metadata contains `momConfig.aspectRatio`
  - Will NOT save when user changes aspect ratio in editor

### Next Steps

To complete the aspect ratio persistence feature:

1. Add server endpoint to update run metadata
2. Implement client-side save logic (debounced effect)
3. Update visual generation to use dynamic aspect ratio
4. Test full round-trip: change → save → refresh → verify loaded
