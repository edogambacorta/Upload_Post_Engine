# FabricJS Artboard Dimming - Dimming Content Outside Canvas Frame

## Overview

When working with FabricJS canvases that have a defined "export frame" or "artboard boundary", it's useful to visually dim or make transparent the content that falls outside this boundary. This helps users clearly distinguish between the content that will be exported and the working area.

## Current Implementation

**File**: `src/web/components/studio/Editor/PreviewPanel.tsx`

Current setup:
- **Artboard**: Larger canvas area (`artboardWidth` x `artboardHeight`) with gray background (`#1f2937`)
- **Export Frame**: White rectangle in the center (`exportWidth` x `exportHeight`)
- **Working Margin**: Extra space around export frame (`WORKSPACE_MARGIN = 1000px`)
- Objects (images, text) can be positioned anywhere on the artboard, including outside the export frame

## Recommended Approaches

### 1. **Overlay Rectangle with Cutout (Recommended)**

This is the most common and professional approach used in design tools like Canva, Figma, and Photoshop.

**Method**: Create a semi-transparent overlay that covers the entire canvas EXCEPT for the export frame area.

**Implementation Options**:

#### Option A: Using Multiple Rectangles (Simple)
```javascript
// Create 4 semi-transparent rectangles around the export frame
const dimColor = 'rgba(0, 0, 0, 0.5)'; // 50% black overlay

// Top rectangle
const topOverlay = new fabric.Rect({
  left: 0,
  top: 0,
  width: artboardWidth,
  height: frameOffsetY,
  fill: dimColor,
  selectable: false,
  evented: false,
  hoverCursor: 'default',
});

// Bottom rectangle
const bottomOverlay = new fabric.Rect({
  left: 0,
  top: frameOffsetY + exportHeight,
  width: artboardWidth,
  height: frameOffsetY,
  fill: dimColor,
  selectable: false,
  evented: false,
  hoverCursor: 'default',
});

// Left rectangle
const leftOverlay = new fabric.Rect({
  left: 0,
  top: frameOffsetY,
  width: frameOffsetX,
  height: exportHeight,
  fill: dimColor,
  selectable: false,
  evented: false,
  hoverCursor: 'default',
});

// Right rectangle
const rightOverlay = new fabric.Rect({
  left: frameOffsetX + exportWidth,
  top: frameOffsetY,
  width: frameOffsetX,
  height: exportHeight,
  fill: dimColor,
  selectable: false,
  evented: false,
  hoverCursor: 'default',
});

canvas.add(topOverlay, bottomOverlay, leftOverlay, rightOverlay);

// Keep overlays on top but below controls
canvas.bringObjectToFront(topOverlay);
canvas.bringObjectToFront(bottomOverlay);
canvas.bringObjectToFront(leftOverlay);
canvas.bringObjectToFront(rightOverlay);
```

**Pros**:
- Simple to implement
- Good performance
- Easy to understand and maintain
- No complex path operations needed

**Cons**:
- Requires managing 4 separate objects
- Need to update all 4 when frame size changes

#### Option B: Using clipPath with inverted path (Advanced)
```javascript
// Create a path that covers everything EXCEPT the export frame
const overlayPath = new fabric.Path(
  `M 0 0
   L ${artboardWidth} 0
   L ${artboardWidth} ${artboardHeight}
   L 0 ${artboardHeight}
   Z
   M ${frameOffsetX} ${frameOffsetY}
   L ${frameOffsetX} ${frameOffsetY + exportHeight}
   L ${frameOffsetX + exportWidth} ${frameOffsetY + exportHeight}
   L ${frameOffsetX + exportWidth} ${frameOffsetY}
   Z`,
  {
    fill: 'rgba(0, 0, 0, 0.5)',
    selectable: false,
    evented: false,
    hoverCursor: 'default',
    objectCaching: false,
    fillRule: 'evenodd', // This creates the "hole" effect
  }
);

canvas.add(overlayPath);
```

**Pros**:
- Single object to manage
- More elegant solution
- Creates perfect "hole" in overlay

**Cons**:
- More complex path syntax
- Slightly higher computational overhead
- Requires understanding of SVG path commands and fill rules

### 2. **Using Canvas Overlay (FabricJS Built-in Feature)**

FabricJS has built-in support for overlay canvases.

```javascript
// Set overlay image/color
canvas.overlayColor = 'rgba(0, 0, 0, 0.5)';

// Then use clipPath on the overlay to create transparency in the center
// Note: This approach is less common and harder to control
```

**Pros**:
- Uses FabricJS built-in feature
- Separate from main canvas objects

**Cons**:
- Less flexible
- Harder to create "cutout" effect for export frame
- Not commonly used for this purpose

### 3. **CSS-based Approach (Not Recommended for FabricJS)**

Using CSS overlays on top of the canvas element.

**Pros**:
- No FabricJS code needed
- Simple CSS

**Cons**:
- Doesn't work well with FabricJS zoom/pan
- Overlay doesn't transform with canvas viewport
- Not recommended for interactive canvas applications

## Recommended Implementation for Upload Post Engine

**Use Option 1A: Four Rectangle Overlay**

This is the best balance of simplicity and functionality for your use case.

### Implementation Steps:

1. **Create overlay rectangles after frame rect** (around line 401 in PreviewPanel.tsx)
2. **Group them for easier management** (optional)
3. **Update z-index management** to ensure overlays stay on top of content but below controls
4. **Add to cleanup** when canvas is cleared

### Z-Index Order (bottom to top):
1. Artboard background (canvas backgroundColor)
2. Export frame (white rect)
3. Background image
4. Text objects
5. **Dim overlay rectangles** (NEW)
6. Selection controls (automatically on top via `controlsAboveOverlay: true`)

### Additional Considerations:

- **Opacity level**: Start with `0.5` (50% opacity), make it configurable if needed
- **Color**: Use black (`rgba(0, 0, 0, 0.5)`) for neutral dimming
- **Performance**: These static rectangles have minimal performance impact
- **Zoom/Pan**: Overlays will automatically transform with canvas viewport
- **Export**: Ensure overlays are excluded from export (use `toDataURL` with specific bounds)

### Expanding the Dimming Zone

If the dim zone feels too tight, you can keep the artboard size the same and simply extend each overlay strip farther from the export frame. Define a multiplier and reuse it whenever you calculate overlay width/height:

```ts
const DIM_OVERLAY_MULTIPLIER = 10; // 10x thicker dim region without enlarging the artboard
const horizontalOverlayHeight = frameOffsetY * DIM_OVERLAY_MULTIPLIER;
const verticalOverlayWidth = frameOffsetX * DIM_OVERLAY_MULTIPLIER;
const horizontalOverlayLeft = frameOffsetX - verticalOverlayWidth;
const horizontalOverlayWidth = exportWidth + verticalOverlayWidth * 2;
const topOverlayTop = frameOffsetY - horizontalOverlayHeight;
```

Use those derived values when creating the four rectangles (top, bottom, left, right). This keeps the number of Fabric objects the same while producing a visibly larger dimming zone and avoids the performance hit of inflating the entire artboard.

### Zoom-responsive Thickness

Tie the overlay geometry to Fabric's zoom so the dim region grows when users zoom out (so more of the workspace stays covered) and shrinks when zooming in (keeps the focus tight). Store the overlay rectangles in refs and update them whenever the viewport zoom changes:

```ts
const overlayRefs = useRef<fabric.Rect[]>([]);

useEffect(() => {
  const canvas = fabricCanvasRef.current;
  if (!canvas || overlayRefs.current.length !== 4) return;

  const zoom = viewport.zoom ?? canvas.getZoom() ?? 1;
  const zoomScale = DIM_OVERLAY_MULTIPLIER / Math.max(zoom, 0.01);
  const verticalOverlayWidth = frameOffsetX * zoomScale;
  const horizontalOverlayHeight = frameOffsetY * zoomScale;
  const horizontalOverlayLeft = frameOffsetX - verticalOverlayWidth;
  const horizontalOverlayWidth = exportWidth + verticalOverlayWidth * 2;

  overlayRefs.current[0].set({
    left: horizontalOverlayLeft,
    top: frameOffsetY - horizontalOverlayHeight,
    width: horizontalOverlayWidth,
    height: horizontalOverlayHeight,
  });
  // repeat for the remaining rectangles...
  canvas.requestRenderAll();
}, [viewport.zoom, exportWidth, exportHeight, frameOffsetX, frameOffsetY]);
```

This approach keeps the overlay snappy without introducing additional Fabric objects or expensive redraw logic.

## Files to Modify

1. **Primary**: `src/web/components/studio/Editor/PreviewPanel.tsx:342-626`
   - Add overlay creation in the slide content useEffect
   - Place after frameRect creation (line ~401)
   - Ensure proper z-ordering

## Alternative: Toggle Feature

Consider making the dim overlay toggleable via:
- Keyboard shortcut (e.g., `O` key to toggle overlay)
- Toolbar button
- Store state: `dimOutsideFrame: boolean`

This gives users flexibility to see the full canvas when needed.

## References

- FabricJS Path documentation: http://fabricjs.com/docs/fabric.Path.html
- SVG fill-rule (evenodd): https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/fill-rule
- FabricJS Z-index management: http://fabricjs.com/docs/fabric.Canvas.html#bringObjectToFront

## Example from Design Tools

- **Figma**: Uses semi-transparent gray overlay outside frames
- **Canva**: Dims with ~60% opacity black overlay
- **Photoshop**: Uses checkerboard pattern + dim overlay for artboards
- **Sketch**: Uses subtle gray overlay with customizable opacity

Most tools use opacity between 40-60% for the dim effect.
