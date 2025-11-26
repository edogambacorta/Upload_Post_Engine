# Slideshow Preview Architecture

## Problem
The current slideshow editor has two main issues:
1. **Static Previews**: The bottom "storyboard" strip only shows the initial background image (`slide.imageUrl`). It does not reflect text overlays, positioning changes, or other edits made on the canvas.
2. **Broken Add Button**: The "+" button in the storyboard strip has no event handler and does nothing.

## Goals
1. **Instant Visual Feedback**: The storyboard thumbnails should accurately reflect the current state of each slide, including text and layout.
2. **Performance**: Generating previews should not degrade the editor's performance, especially during drag operations.
3. **Functional Workflow**: Users must be able to add new slides easily.

## Architecture

### 1. Data Model
We will extend the `Slide` interface to include a `thumbnailUrl` property. This will store a base64 data URL of the rendered slide.

```typescript
export interface Slide {
    // ... existing properties
    thumbnailUrl?: string; // Cached preview image
}
```

### 2. Preview Generation Strategy
Instead of rendering a separate canvas for each thumbnail (expensive), we will leverage the **main editor canvas**. Since the main canvas always displays the currently selected slide, we can capture its state whenever changes occur.

- **Trigger**: `object:modified` events (end of drag/resize/edit) and `text:changed` events.
- **Mechanism**: Use `fabric.Canvas.toDataURL()` with specific parameters to generate a lightweight thumbnail.
- **Optimization**:
    - **Debouncing**: Wait for a short period (e.g., 500ms) after the last change before generating the preview to avoid thrashing during rapid edits.
    - **Resolution**: Generate the thumbnail at a lower resolution (e.g., `multiplier: 0.2`) to reduce memory usage and processing time. The storyboard thumbnails are small, so high resolution is not needed.
    - **Cropping**: Ensure the snapshot respects the `exportFrame` boundaries (`left`, `top`, `width`, `height`) so it matches the final output.

### 3. State Management
- When the preview is generated, we dispatch an `UPDATE_SLIDE` action to save the `thumbnailUrl` to the store.
- The `PreviewPanel` component subscribes to the `slides` array.
- The storyboard strip renders images using `src={slide.thumbnailUrl || slide.imageUrl}`. This ensures that if a preview hasn't been generated yet (e.g., immediately after load), it falls back to the background image.

### 4. "Add Slide" Functionality
- The "+" button will trigger a `handleAddSlide` function.
- This function creates a new `Slide` object with default values (unique ID, default role, empty text).
- It dispatches `ADD_SLIDE` to the store.
- It automatically selects the newly created slide.

## Implementation Steps
1. **Update Types**: Add `thumbnailUrl` to `Slide` in `src/web/lib/studio/types.ts`.
2. **Implement Add Logic**: Add `onClick` handler to the "+" button in `PreviewPanel.tsx`.
3. **Implement Preview Logic**:
    - Create `updateThumbnail` function in `PreviewPanel.tsx`.
    - Hook it into Fabric.js events (`object:modified`, etc.).
    - Use `canvas.toDataURL` with cropping and scaling.
    - Dispatch updates to the store.
4. **Update UI**: Modify the storyboard image tag to prefer `thumbnailUrl`.

## Performance Considerations
- **Memory**: Storing base64 strings in the Redux/Context state can increase memory usage. However, given the low resolution of thumbnails and reasonable number of slides (usually < 10), this should be manageable.
- **Lag**: `toDataURL` is synchronous. If the canvas is very complex, it might cause a frame drop. Keeping the multiplier low is key. If it becomes an issue, we could look into `requestIdleCallback` or offscreen canvas (though Fabric makes offscreen harder).
