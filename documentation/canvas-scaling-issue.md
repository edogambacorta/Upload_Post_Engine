# Canvas Scaling Issue Investigation

## Problem Description

The Fabric.js canvas is experiencing severe distortion and interaction issues due to improper scaling. The canvas element shows:

```html
<canvas width="3080" height="3350" 
        style="width: 100% !important; height: 100% !important; opacity: 1; 
               touch-action: none; user-select: none; max-width: 100%; max-height: 100%;" 
        class="lower-canvas" data-fabric="main">
</canvas>
```

### Symptoms

1. **Control handles are distorted** - Circular handles appear as ovals/ellipses
2. **Canvas is stretched** - The logical canvas size (3080x3350) is being CSS-scaled to fit container
3. **Poor interaction** - Click coordinates may not map correctly
4. **Blurry rendering** - Content is rendered at one size then scaled via CSS

## Root Cause

The canvas is initialized with a very large logical size (artboard dimensions):
- **Artboard width**: 1080 + (1000 * 2) = 3080px
- **Artboard height**: 1350 + (1000 * 2) = 3350px

But the container is much smaller (likely around 800-1200px wide), causing the browser to stretch the canvas via CSS to fit.

### Why This Happens

In `PreviewPanel.tsx`, the canvas is created with:

```typescript
const artboardWidth = exportWidth + WORKSPACE_MARGIN * 2;  // 3080
const artboardHeight = exportHeight + WORKSPACE_MARGIN * 2; // 3350

<canvas
    ref={canvasRef}
    width={artboardWidth}
    height={artboardHeight}
    style={{
        width: '100%',
        height: '100%',
        opacity: isEmpty ? 0.1 : 1,
    }}
/>
```

The canvas has:
- **Logical dimensions** (width/height attributes): 3080x3350 pixels
- **Display dimensions** (CSS): 100% of container (much smaller)

This mismatch causes CSS scaling/stretching.

## The Correct Approach

Fabric.js canvases should be sized in one of two ways:

### Option 1: Match Logical and Display Size (Recommended)
- Set canvas logical size to match the container's pixel dimensions
- Use Fabric.js viewport transform (zoom/pan) to show the artboard
- Controls render at screen pixels, no distortion

### Option 2: Use Fabric.js setDimensions
- Let Fabric.js manage both logical and CSS dimensions
- Use `canvas.setDimensions()` with `cssOnly` or `backstoreOnly` options

## Current Implementation Issues

1. **Manual CSS styling overrides Fabric.js** - The `!important` flags in the inline styles suggest Fabric.js is trying to set dimensions but being overridden

2. **Wrapper element interference** - The code manually sets wrapper styles:
   ```typescript
   setWrapperStyle('width', '100%', 'important');
   setWrapperStyle('height', '100%', 'important');
   ```

3. **Canvas element styling** - Direct manipulation of canvas styles:
   ```typescript
   apply('width', '100%', 'important');
   apply('height', '100%', 'important');
   ```

## Solution

### Approach: Responsive Canvas with Proper Scaling

1. **Initialize canvas at container size** (not artboard size)
2. **Use viewport transform** to zoom out and show the full artboard
3. **Let Fabric.js manage dimensions** - remove manual CSS overrides
4. **Handle resize events** to update canvas dimensions

### Implementation Steps

1. Remove manual CSS dimension overrides
2. Calculate container size and initialize canvas to match
3. Set initial viewport transform to show full artboard
4. Add resize observer to handle container size changes
5. Update zoom/pan to work with the new coordinate system

## Code Changes Needed

### 1. Remove Manual CSS Overrides

Remove or modify the wrapper/canvas style manipulation in the initialization effect.

### 2. Initialize Canvas at Container Size

```typescript
const container = canvasRef.current.parentElement;
const containerWidth = container.clientWidth;
const containerHeight = container.clientHeight;

const canvas = new fabric.Canvas(canvasRef.current, {
    width: containerWidth,
    height: containerHeight,
    selection: false,
    controlsAboveOverlay: true,
});
```

### 3. Set Initial Viewport to Show Artboard

```typescript
// Calculate zoom to fit artboard in viewport
const zoomX = containerWidth / artboardWidth;
const zoomY = containerHeight / artboardHeight;
const initialZoom = Math.min(zoomX, zoomY) * 0.9; // 90% to add padding

// Center the artboard
const panX = (containerWidth - artboardWidth * initialZoom) / 2;
const panY = (containerHeight - artboardHeight * initialZoom) / 2;

canvas.setViewportTransform([initialZoom, 0, 0, initialZoom, panX, panY]);
```

### 4. Handle Resize

```typescript
const resizeObserver = new ResizeObserver(() => {
    const newWidth = container.clientWidth;
    const newHeight = container.clientHeight;
    
    canvas.setDimensions({
        width: newWidth,
        height: newHeight,
    });
    
    // Recalculate viewport transform to maintain view
    // ... (preserve current zoom/pan or reset to fit)
});

resizeObserver.observe(container);
```

## Expected Results

After implementing these changes:

✅ Control handles will maintain perfect circular/square shape
✅ Canvas will render crisp, not stretched
✅ Click coordinates will map correctly
✅ Zoom/pan will work smoothly
✅ Canvas will resize properly with container

## References

- [Fabric.js Canvas Dimensions](http://fabricjs.com/fabric-intro-part-1#canvas)
- [Viewport Transform](http://fabricjs.com/fabric-intro-part-5#pan_zoom)
- [Responsive Canvas](https://github.com/fabricjs/fabric.js/wiki/Responsive-canvas)
