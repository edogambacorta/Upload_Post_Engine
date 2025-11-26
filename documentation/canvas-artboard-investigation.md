# Canvas & Artboard System Investigation

## Current Problem Analysis

### The Core Issue
The current implementation treats the **canvas** and the **export area** as the same thing. The Fabric.js canvas is sized exactly to match the final export dimensions (1080x1350px), which is then scaled down to fit the UI container. This creates several limitations:

1. **No Working Space**: Users cannot position elements outside the export area temporarily
2. **Limited Editing**: Cannot zoom in/out or pan around the canvas
3. **Fixed Format**: Export dimensions are hardcoded (1080x1350 = 4:5 ratio)
4. **Poor UX**: The canvas is constrained to a small preview size, making precise editing difficult
5. **No Visual Distinction**: Users cannot see what will be exported vs. the working area

### Current Implementation Details

**Canvas Dimensions** (Hardcoded in `PreviewPanel.tsx`):
```typescript
const CANVAS_WIDTH = 1080;   // Export width
const CANVAS_HEIGHT = 1350;  // Export height (4:5 aspect ratio)
```

**Display Size** (Fixed in UI):
```tsx
<div style={{ width: '540px', height: '675px' }}>  // 50% scale
  <canvas width={1080} height={1350} />
</div>
```

**Container Constraints**:
- Canvas is locked to a fixed preview container
- No overflow or panning capability
- Zoom is not implemented
- The entire `col-span-6` space is not utilized

---

## Files Involved

### Core Canvas Files
1. **`src/web/components/studio/Editor/PreviewPanel.tsx`** (590 lines)
   - Main canvas rendering component
   - Fabric.js initialization
   - Canvas size constants (CANVAS_WIDTH, CANVAS_HEIGHT)
   - Object manipulation handlers
   - Export functionality

2. **`src/web/components/studio/Editor/StudioEditor.tsx`** (158 lines)
   - Layout container for the 3-panel editor
   - Grid layout: `col-span-3` (Brief) | `col-span-6` (Canvas) | `col-span-3` (Style)
   - Mode switching logic

### Supporting Files
3. **`src/web/lib/studio/types.ts`** (101 lines)
   - Type definitions including `AspectRatio = '3:4' | '4:3' | '9:16'`
   - `Slide` interface with `imageTransform` and `textBox` positioning
   - `StudioState` interface

4. **`src/web/lib/studio/store.tsx`** (131 lines)
   - Global state management
   - Actions for slide updates
   - Currently no actions for canvas viewport/zoom state

5. **`src/web/components/studio/Editor/StylePanel.tsx`**
   - Right sidebar for styling controls
   - Could house zoom/pan controls

6. **`src/web/components/studio/Editor/BriefPanel.tsx`**
   - Left sidebar for content controls
   - Could house export format selector

---

## Proposed Solution Architecture

### Concept: Artboard System
Implement a **two-layer system**:

1. **Artboard (Infinite Canvas)**: The full working area
   - Large Fabric.js canvas (e.g., 4000x4000px or larger)
   - Users can pan and zoom freely
   - Elements can be positioned anywhere

2. **Export Frame (Visible Boundary)**: The export area overlay
   - Visual rectangle showing what will be exported
   - Configurable aspect ratio (4:5, 1:1, 9:16, 16:9, etc.)
   - Configurable dimensions (1080x1080, 1080x1350, 1920x1080, etc.)
   - Rendered as a semi-transparent overlay or border

### Key Features to Implement

#### 1. **Viewport Management**
- **Zoom**: Mouse wheel to zoom in/out (10% - 500%)
- **Pan**: Click-drag on empty space or spacebar+drag
- **Fit to View**: Button to center and fit export frame in viewport
- **Zoom to Selection**: Focus on selected object

#### 2. **Export Frame Configuration**
- **Aspect Ratio Selector**: Dropdown with presets
  - Instagram Post (1:1) - 1080x1080
  - Instagram Portrait (4:5) - 1080x1350
  - Instagram Story (9:16) - 1080x1920
  - Landscape (16:9) - 1920x1080
  - Custom dimensions
  
- **Visual Indicators**:
  - Dashed border around export area
  - Semi-transparent overlay outside export area
  - Grid/guides within export area

#### 3. **Toolbar Additions**
New tools in the center panel toolbar:
- 🔍 Zoom In/Out buttons
- 🖐️ Pan/Hand tool toggle
- 📐 Fit to View
- 📏 Show/Hide Grid
- 📦 Show/Hide Export Frame
- 🎯 Zoom to Selection

#### 4. **Canvas Sizing Strategy**
```typescript
// Artboard (working area)
const ARTBOARD_WIDTH = 4000;
const ARTBOARD_HEIGHT = 4000;

// Export frame (configurable)
interface ExportFrame {
  width: number;      // e.g., 1080
  height: number;     // e.g., 1350
  aspectRatio: string; // e.g., '4:5'
  x: number;          // Position on artboard (centered)
  y: number;          // Position on artboard (centered)
}

// Viewport (what user sees)
interface Viewport {
  zoom: number;       // 0.1 to 5.0 (10% to 500%)
  panX: number;       // Pan offset X
  panY: number;       // Pan offset Y
}
```

---

## Implementation Approach

### Phase 1: Artboard Foundation
1. **Expand Canvas Size**
   - Change Fabric canvas to large artboard size (4000x4000)
   - Make canvas fill the entire `col-span-6` container
   - Remove fixed width/height constraints

2. **Add Export Frame Overlay**
   - Create a non-selectable Fabric.js rectangle to show export bounds
   - Position it centered on the artboard
   - Style with dashed border and semi-transparent fill outside

3. **Update State Management**
   - Add `viewport` state (zoom, panX, panY)
   - Add `exportFrame` state (width, height, aspectRatio)
   - Add actions to update these states

### Phase 2: Zoom & Pan
1. **Implement Zoom**
   - Listen to mouse wheel events
   - Update Fabric canvas zoom with `canvas.setZoom()`
   - Zoom towards mouse cursor position

2. **Implement Pan**
   - Add pan mode toggle
   - Listen to mouse drag events when pan is active
   - Update canvas viewport with `canvas.viewportTransform`

3. **Add Zoom Controls**
   - Zoom in/out buttons
   - Zoom percentage display
   - Fit to view button
   - Reset zoom button

### Phase 3: Export Frame Configuration
1. **Add Format Selector**
   - Dropdown in BriefPanel or toolbar
   - Preset aspect ratios
   - Custom dimension inputs

2. **Update Export Logic**
   - Modify `handleDownload` to export only the frame area
   - Use `canvas.toDataURL()` with cropping to export frame bounds
   - Maintain high resolution (1080px+ width)

3. **Visual Feedback**
   - Highlight export frame when hovering
   - Show dimensions on frame
   - Dim area outside export frame

### Phase 4: Enhanced Tools
1. **Grid System**
   - Optional grid overlay
   - Snap to grid functionality
   - Configurable grid spacing

2. **Guides & Rulers**
   - Horizontal/vertical rulers
   - Draggable guide lines
   - Smart guides when aligning objects

3. **Keyboard Shortcuts**
   - Space + Drag = Pan
   - Ctrl + Scroll = Zoom
   - Ctrl + 0 = Fit to View
   - Ctrl + 1 = 100% Zoom

---

## Technical Considerations

### Fabric.js Capabilities
- ✅ Supports large canvas sizes
- ✅ Built-in zoom: `canvas.setZoom(zoomLevel)`
- ✅ Built-in pan: `canvas.viewportTransform`
- ✅ Can render non-selectable overlay objects
- ✅ Export specific regions: `canvas.toDataURL({ left, top, width, height })`

### Performance Concerns
- Large canvas may impact performance with many objects
- Consider using `canvas.renderOnAddRemove = false` and manual rendering
- Implement object culling for off-screen elements
- Use `requestAnimationFrame` for smooth pan/zoom

### State Persistence
- Save viewport state (zoom, pan) per slide
- Save export frame configuration globally or per project
- Store in slide metadata or separate config

### Export Quality
- Ensure export uses actual pixel dimensions (1080x1350)
- Don't scale down then up - maintain quality
- Consider offering multiple export sizes (1x, 2x, 4x)

---

## Benefits of This Approach

1. **Professional Editing Experience**: Similar to Figma, Canva, Adobe XD
2. **Flexibility**: Work outside export bounds, then crop
3. **Precision**: Zoom in for detailed editing
4. **Multi-Format**: Easy to create different aspect ratios from same design
5. **Better UX**: Full utilization of screen space
6. **Scalability**: Can add more advanced features (layers, groups, etc.)

---

## Migration Path

### Backward Compatibility
- Existing slides have positions relative to 1080x1350 canvas
- When loading old slides, position them centered in the new export frame
- Export frame defaults to 1080x1350 (current behavior)

### Gradual Rollout
1. Start with artboard + zoom/pan (no format change)
2. Add export frame visualization
3. Add format selector
4. Add advanced tools (grid, guides, etc.)

---

## Next Steps

1. **Prototype**: Create a minimal artboard implementation in PreviewPanel
2. **User Testing**: Validate zoom/pan controls feel natural
3. **Refine**: Adjust based on feedback
4. **Iterate**: Add features incrementally

---

## Code Structure Proposal

```
src/web/components/studio/Editor/
├── PreviewPanel.tsx          # Main canvas component (refactor)
├── CanvasToolbar.tsx         # NEW: Zoom/pan/view controls
├── ExportFrameOverlay.tsx    # NEW: Visual export boundary
├── FormatSelector.tsx        # NEW: Aspect ratio picker
└── hooks/
    ├── useCanvasZoom.ts      # NEW: Zoom logic
    ├── useCanvasPan.ts       # NEW: Pan logic
    └── useExportFrame.ts     # NEW: Export frame state

src/web/lib/studio/
├── types.ts                  # Add Viewport, ExportFrame types
└── store.tsx                 # Add viewport/exportFrame actions
```

---

## References & Inspiration

- **Figma**: Infinite canvas with frames
- **Canva**: Artboard with export boundaries
- **Adobe XD**: Artboards and export settings
- **Fabric.js Docs**: 
  - [Zoom and Pan](http://fabricjs.com/fabric-intro-part-5)
  - [Viewport Transform](http://fabricjs.com/docs/fabric.Canvas.html#viewportTransform)
