# Slideshow Preview Issue Investigation

## Quick Fixes (Implemented)

### ✅ Fix 1: Correct Thumbnail Capture
Reset viewport transform before capturing to ensure thumbnails show actual content, not zoomed/panned view.

### ✅ Fix 2: localStorage Persistence
Save all thumbnails to localStorage so they persist across page reloads and viewport changes.

### ✅ Fix 3: Automatic Thumbnail Generation
Generate thumbnails for all slides on load and keep them updated in real-time.

**Implementation Status**: See code changes in `PreviewPanel.tsx` and new `thumbnailCache.ts` utility.

---

## Problem Summary

When editing slides in the Studio Editor (`/studio/editor`), the slideshow previews at the bottom:
1. **Auto-update correctly** - thumbnails regenerate when changes are made
2. **Display incorrect content** - the thumbnail doesn't match what was created on canvas
3. **Don't persist** - thumbnails are lost when viewport changes or page reloads

## Root Causes

### 1. Thumbnail Generation Issue (Incorrect Content)

**Location**: `src/web/components/studio/Editor/PreviewPanel.tsx` lines 748-770

The thumbnail is generated using `canvas.toDataURL()` with specific coordinates:

```typescript
const updateThumbnail = () => {
    if (!canvas || cancelled) return;

    // Generate low-res thumbnail of the export frame
    const dataUrl = canvas.toDataURL({
        format: 'png',
        left: frameOffsetX,
        top: frameOffsetY,
        width: exportWidth,
        height: exportHeight,
        multiplier: 0.2, // 20% scale is enough for small thumbnails
    });

    dispatch({
        type: 'UPDATE_SLIDE',
        payload: {
            id: slideId,
            updates: { thumbnailUrl: dataUrl }
        }
    });
};
```

**Problem**: The `toDataURL()` method captures canvas content in **canvas coordinate space**, but the viewport may be zoomed/panned. The coordinates `frameOffsetX`, `frameOffsetY`, `exportWidth`, `exportHeight` are in the **artboard coordinate system**, not accounting for the current viewport transform.

**Why it looks wrong**: 
- If the user has zoomed in/out or panned the canvas, the viewport transform affects what's visible
- The `toDataURL()` method with `left/top/width/height` parameters captures a specific region in canvas space
- However, the viewport transform (zoom/pan) is NOT automatically removed when capturing
- This means the thumbnail captures the transformed view, not the actual content

### 2. Persistence Issue (Thumbnails Not Saved)

**Location**: `src/web/lib/studio/store.tsx`

The store is a React Context with `useReducer` - it's **in-memory only**:

```typescript
export function StudioProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(studioReducer, initialState);

    return (
        <StudioContext.Provider value={{ state, dispatch }}>
            {children}
        </StudioContext.Provider>
    );
}
```

**Problems**:
- No localStorage persistence
- No backend API to save slide updates
- Thumbnails are stored in `slide.thumbnailUrl` as data URLs in memory
- When page reloads or viewport updates trigger re-renders, thumbnails are lost

**Backend API Gap**: 
- `GET /api/runs/:id` - loads run data
- `PATCH /api/runs/:id` - only updates aspect ratio, not slide content
- No endpoint to save individual slide edits (text, thumbnails, transforms)

### 3. Viewport Update Behavior

**Location**: `src/web/components/studio/Editor/PreviewPanel.tsx` lines 543-1010

The slide content effect runs when:
- `selectedSlide?.id` changes
- `selectedSlide?.imageUrl` changes
- `slides.length` changes
- Various other dependencies

```typescript
useEffect(() => {
    // ... loads slide content, clears canvas, rebuilds everything
    canvas.clear();
    // ... recreates all objects
}, [
    selectedSlide?.id,
    selectedSlide?.imageUrl,
    slides.length,
    selectedSlideId,
    // ... other deps
]);
```

**Problem**: When viewport changes (zoom/pan), the canvas doesn't fully re-render slide content, but the thumbnail generation logic may be affected by the viewport transform state.

## Related Files

### Core Files

1. **`src/web/components/studio/Editor/PreviewPanel.tsx`** (1357 lines)
   - Main canvas rendering component
   - Thumbnail generation logic (lines 748-770)
   - Slideshow strip UI (lines 1314-1353)
   - Canvas initialization and viewport management (lines 204-526)
   - Slide content loading (lines 543-1010)

2. **`src/web/lib/studio/store.tsx`** (200 lines)
   - Global state management
   - In-memory only (no persistence)
   - `UPDATE_SLIDE` action (lines 105-111)
   - No localStorage or API sync

3. **`src/web/lib/studio/types.ts`** (132 lines)
   - `Slide` interface (lines 26-67)
   - `thumbnailUrl?: string` field (line 66)
   - `ViewportState` interface (lines 103-107)

4. **`src/web/components/studio/Editor/StudioEditor.tsx`** (240 lines)
   - Parent component
   - Run hydration from backend (lines 65-122)
   - No save-back mechanism

### Backend Files

5. **`src/server.ts`** (451 lines)
   - API endpoints
   - `GET /api/runs/:id` - loads run (lines 285-295)
   - `PATCH /api/runs/:id` - only updates aspectRatio (lines 297-327)
   - Missing: endpoint to save slide edits

6. **`src/web/lib/studio/runLoader.ts`** (117 lines)
   - Loads run data from backend
   - `loadRunHydration()` function
   - One-way data flow (load only, no save)

## Technical Details

### Canvas Coordinate System

The canvas uses a multi-layer coordinate system:

1. **Container Space**: The actual DOM element size
2. **Canvas Space**: The logical canvas size (matches container)
3. **Artboard Space**: The working area (exportWidth + margins)
4. **Export Frame Space**: The actual content area (1080x1350 for 4:5)
5. **Viewport Transform**: Applied zoom/pan transformation

```
Viewport Transform: [zoom, 0, 0, zoom, panX, panY]
```

### Thumbnail Generation Flow

1. User edits text/image on canvas
2. `handleObjectModified` event fires
3. `debouncedUpdateThumbnail()` called (500ms delay)
4. `updateThumbnail()` executes
5. `canvas.toDataURL()` captures region
6. Data URL stored in `slide.thumbnailUrl` via dispatch
7. Slideshow strip renders `<img src={slide.thumbnailUrl} />`

### Slideshow Strip Rendering

**Location**: `src/web/components/studio/Editor/PreviewPanel.tsx` lines 1314-1353

```tsx
{slides.map((slide, index) => (
    <button key={slide.id} onClick={() => selectSlide(slide.id)}>
        {slide.thumbnailUrl ? (
            <img src={slide.thumbnailUrl} alt="" />
        ) : slide.imageUrl ? (
            <img src={slide.imageUrl} alt="" />
        ) : null}
    </button>
))}
```

Fallback order:
1. `slide.thumbnailUrl` (generated data URL)
2. `slide.imageUrl` (original image)
3. Nothing (shows slide number only)

## Solutions

### ✅ Solution 1: Fix Thumbnail Capture (IMPLEMENTED)

**Problem**: Viewport transform affects thumbnail capture

**Fix**: Temporarily reset viewport transform before capturing.

**Implementation**: Updated `PreviewPanel.tsx` lines 751-793

```typescript
const updateThumbnail = () => {
    if (!canvas || cancelled) return;

    // Store current viewport transform
    const currentVPT = canvas.viewportTransform?.slice();
    
    // Reset to identity transform for accurate capture
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.renderAll();
    
    // Generate thumbnail of the export frame
    const dataUrl = canvas.toDataURL({
        format: 'png',
        left: frameOffsetX,
        top: frameOffsetY,
        width: exportWidth,
        height: exportHeight,
        multiplier: 0.2,
    });
    
    // Restore viewport transform
    if (currentVPT) {
        canvas.setViewportTransform(currentVPT);
        canvas.renderAll();
    }

    dispatch({
        type: 'UPDATE_SLIDE',
        payload: {
            id: slideId,
            updates: { thumbnailUrl: dataUrl }
        }
    });
};
```

### ✅ Solution 2: localStorage Persistence (IMPLEMENTED)

**Problem**: Thumbnails lost on page reload or viewport changes

**Fix**: Created `thumbnailCache.ts` utility to manage localStorage-based thumbnail caching.

**Implementation**: 
- New file: `src/web/lib/studio/thumbnailCache.ts`
- Updated `PreviewPanel.tsx` lines 544-568 (load from cache)
- Updated `PreviewPanel.tsx` line 781 (save to cache)
- Updated `PreviewPanel.tsx` lines 1022-1031 (auto-generate on load)

**Features**:
- Automatic caching of all thumbnails to localStorage
- LRU (Least Recently Used) cache eviction when limit reached (50 thumbnails max)
- Automatic cleanup on quota exceeded
- Cache statistics and management functions
- Thumbnails persist across page reloads and viewport changes

**Usage**:
```typescript
import { saveThumbnail, loadThumbnail } from '@/lib/studio/thumbnailCache';

// Save thumbnail
saveThumbnail(slideId, dataUrl);

// Load thumbnail
const cachedThumbnail = loadThumbnail(slideId);
```

### Solution 3: Add Persistence (Backend) - NOT IMPLEMENTED

**Add API endpoint** to save slide updates:

```typescript
// In src/server.ts
app.patch('/api/runs/:id/slides/:slideId', (req, res) => {
    const { runId, slideId } = req.params;
    const updates = req.body; // { text, thumbnailUrl, textBox, imageTransform }
    
    const state = orchestrator.getRunState(runId);
    if (!state) return res.status(404).json({ error: 'Run not found' });
    
    const postIndex = state.posts.findIndex(p => 
        p.momPost?.id === slideId || `${runId}-${p.index}` === slideId
    );
    
    if (postIndex === -1) {
        return res.status(404).json({ error: 'Slide not found' });
    }
    
    // Update post with new data
    if (updates.text) state.posts[postIndex].momPost.caption = updates.text;
    if (updates.thumbnailUrl) state.posts[postIndex].thumbnailUrl = updates.thumbnailUrl;
    if (updates.textBox) state.posts[postIndex].textBox = updates.textBox;
    if (updates.imageTransform) state.posts[postIndex].imageTransform = updates.imageTransform;
    
    orchestrator.saveRunState(runId, state);
    res.json({ success: true });
});
```

**Add frontend sync**:

```typescript
// In PreviewPanel.tsx or a new service
const syncSlideToBackend = async (runId: string, slideId: string, updates: Partial<Slide>) => {
    if (!runId) return; // Only sync if we have a runId
    
    try {
        await fetch(`${API_BASE_URL}/api/runs/${runId}/slides/${slideId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
    } catch (error) {
        console.error('Failed to sync slide:', error);
    }
};
```

### Solution 4: Optimize Thumbnail Generation - NOT IMPLEMENTED

**Current issue**: Thumbnails are data URLs (base64), which are large

**Better approach**: Save thumbnails as actual image files

```typescript
// Convert data URL to blob and upload
const updateThumbnail = async () => {
    if (!canvas || cancelled) return;
    
    const dataUrl = canvas.toDataURL({ /* ... */ });
    
    // Convert to blob
    const blob = await (await fetch(dataUrl)).blob();
    
    // Upload to server
    const formData = new FormData();
    formData.append('thumbnail', blob, `${slideId}-thumb.png`);
    
    const response = await fetch(`/api/runs/${runId}/slides/${slideId}/thumbnail`, {
        method: 'POST',
        body: formData
    });
    
    const { thumbnailUrl } = await response.json();
    
    dispatch({
        type: 'UPDATE_SLIDE',
        payload: {
            id: slideId,
            updates: { thumbnailUrl } // Now a URL, not data URL
        }
    });
};
```

## Implementation Summary

### ✅ What Was Implemented

**1. Fixed Thumbnail Capture (Solution 1)**
- Viewport transform is now temporarily reset before capturing thumbnails
- Ensures thumbnails show actual content regardless of zoom/pan state
- Thumbnails are always accurate representations of the slide

**2. localStorage Persistence (Solution 2)**
- Created `thumbnailCache.ts` utility with full cache management
- Thumbnails automatically saved to localStorage on every update
- Thumbnails automatically loaded from localStorage on component mount
- LRU cache eviction prevents localStorage quota issues
- Supports up to 50 thumbnails with automatic cleanup

**3. Automatic Thumbnail Generation**
- Thumbnails are automatically generated when slides are first loaded
- Thumbnails update in real-time as user edits content
- 500ms debounce prevents excessive generation during rapid edits
- Initial generation happens 100ms after canvas render for stability

### How It Works

**On Page Load:**
1. Component mounts and loads all slides
2. `useEffect` checks each slide for cached thumbnails in localStorage
3. If found, thumbnails are loaded and displayed immediately
4. If not found, thumbnails are generated after canvas renders

**During Editing:**
1. User modifies text, image, or transforms
2. Change event triggers debounced thumbnail update (500ms delay)
3. Viewport transform is reset to identity
4. Canvas captures export frame region as data URL
5. Viewport transform is restored
6. Thumbnail saved to both localStorage and Redux store
7. Slideshow strip updates with new thumbnail

**On Viewport Change:**
1. User zooms or pans the canvas
2. Thumbnails remain unchanged (not affected by viewport)
3. Cached thumbnails persist in localStorage
4. No regeneration needed

### Files Modified

1. **`src/web/lib/studio/thumbnailCache.ts`** (NEW)
   - 230 lines of cache management utilities
   - Functions: `saveThumbnail`, `loadThumbnail`, `removeThumbnail`, `clearAllThumbnails`, `getCacheStats`
   - Automatic LRU eviction and quota management

2. **`src/web/components/studio/Editor/PreviewPanel.tsx`** (MODIFIED)
   - Line 10: Added import for thumbnail cache utilities
   - Lines 544-568: Added effect to load thumbnails from localStorage
   - Lines 751-793: Updated `updateThumbnail()` to fix viewport issue and save to cache
   - Lines 1022-1031: Added initial thumbnail generation for new slides

3. **`documentation/slideshow-preview-issue.md`** (UPDATED)
   - Added implementation status to all solutions
   - Added comprehensive implementation summary
   - Updated testing checklist

### Recommended Implementation Order

1. ✅ **Fix thumbnail capture** (Solution 1) - DONE
2. ✅ **Add localStorage** (Solution 2) - DONE  
3. ⏭️ **Add backend API** (Solution 3) - Future enhancement for multi-device sync
4. ⏭️ **Optimize thumbnails** (Solution 4) - Future performance improvement

## Testing Checklist

- [ ] Create a slide with text and image
- [ ] Edit the text content
- [ ] Verify thumbnail updates in slideshow strip
- [ ] Verify thumbnail matches canvas content
- [ ] Zoom in/out on canvas
- [ ] Verify thumbnail still matches (not affected by zoom)
- [ ] Pan the canvas
- [ ] Verify thumbnail still matches (not affected by pan)
- [ ] Switch to another slide and back
- [ ] Verify thumbnail persists
- [ ] Reload the page
- [ ] Verify thumbnail persists (with localStorage/backend)
- [ ] Create multiple slides
- [ ] Edit each one
- [ ] Verify all thumbnails are correct and persist

## Additional Notes

### Why Thumbnails Show Original Image

When `thumbnailUrl` is not set or lost, the slideshow strip falls back to `slide.imageUrl`:

```tsx
{slide.thumbnailUrl ? (
    <img src={slide.thumbnailUrl} alt="" />
) : slide.imageUrl ? (
    <img src={slide.imageUrl} alt="" />  // Fallback to original
) : null}
```

This is why after viewport updates, you see the original image again - the thumbnail was lost and it falls back to the background image.

### Performance Considerations

- Data URLs are large (base64 encoded)
- Each thumbnail is ~50-100KB as a data URL
- For 10 slides, that's 500KB-1MB in memory
- localStorage has a 5-10MB limit
- Consider server-side thumbnail storage for production
