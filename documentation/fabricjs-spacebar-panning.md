# Fabric.js Spacebar Panning Implementation

## Overview

This document explains how to implement spacebar-based canvas panning in Fabric.js, allowing users to pan the canvas by holding the spacebar and dragging with the mouse - a common UX pattern in design tools like Photoshop, Figma, and Canva.

## Understanding Fabric.js Viewport Transform

### The ViewportTransform Matrix

Fabric.js uses a transformation matrix called `viewportTransform` to control the canvas viewport (zoom and pan). This is a 6-element array:

```javascript
[scaleX, skewY, skewX, scaleY, translateX, translateY]
```

For zoom and pan operations:
- `[0]` and `[3]`: Zoom level (typically the same value for uniform scaling)
- `[4]`: Horizontal pan offset (X translation)
- `[5]`: Vertical pan offset (Y translation)

### Key Concepts

1. **Canvas Space vs Viewport Space**: 
   - Canvas space: The logical coordinate system of your objects
   - Viewport space: What the user sees after zoom/pan transformations

2. **Panning**: Modifying `viewportTransform[4]` and `viewportTransform[5]` to move the visible area

3. **Zooming**: Modifying `viewportTransform[0]` and `viewportTransform[3]` to scale the view

## Implementation Strategy

### 1. State Management

Track three key states:
- `isSpacebarPressed`: Whether the spacebar key is currently held down
- `isSpacebarPanning`: Whether the user is actively dragging while spacebar is pressed
- `lastPosX/lastPosY`: Previous mouse position for calculating movement delta

```javascript
let isSpacebarPressed = false;
let isSpacebarPanning = false;
let lastPosX = 0;
let lastPosY = 0;
```

### 2. Keyboard Event Handlers

Listen for spacebar press/release at the window level to ensure events are captured even when focus is elsewhere:

```javascript
const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.code === 'Space' || e.keyCode === 32) && !isSpacebarPressed) {
        e.preventDefault(); // Prevent page scroll
        isSpacebarPressed = true;
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
        canvas.requestRenderAll();
    }
};

const handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.keyCode === 32) {
        e.preventDefault();
        isSpacebarPressed = false;
        isSpacebarPanning = false;
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'default';
        canvas.requestRenderAll();
    }
};

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
```

**Important**: Use both `e.code === 'Space'` and `e.keyCode === 32` for maximum browser compatibility.

### 3. Mouse Event Handlers

#### Mouse Down - Initiate Panning

```javascript
canvas.on('mouse:down', function(opt) {
    const evt = opt.e;
    
    // Spacebar + left mouse button for panning
    if (isSpacebarPressed && evt.button === 0) {
        evt.preventDefault();
        evt.stopPropagation();
        isSpacebarPanning = true;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        canvas.selection = false; // Disable object selection during pan
        canvas.defaultCursor = 'grabbing';
        canvas.hoverCursor = 'grabbing';
        return;
    }
});
```

#### Mouse Move - Perform Panning

The core panning logic directly modifies the viewport transform:

```javascript
canvas.on('mouse:move', function(opt) {
    if (isSpacebarPanning) {
        const evt = opt.e;
        evt.preventDefault();
        
        const vpt = canvas.viewportTransform;
        if (vpt) {
            // Calculate mouse movement delta
            const deltaX = evt.clientX - lastPosX;
            const deltaY = evt.clientY - lastPosY;
            
            // Apply delta to viewport translation
            vpt[4] += deltaX;
            vpt[5] += deltaY;
            
            // Update canvas
            canvas.requestRenderAll();
            
            // Store current position for next delta calculation
            lastPosX = evt.clientX;
            lastPosY = evt.clientY;
        }
    }
});
```

**Key Point**: We modify `vpt[4]` and `vpt[5]` directly, which moves the entire canvas viewport. This is more efficient than using `canvas.relativePan()` for real-time dragging.

#### Mouse Up - End Panning

```javascript
canvas.on('mouse:up', function(opt) {
    const evt = opt.e;
    
    if (isSpacebarPanning && evt.button === 0) {
        isSpacebarPanning = false;
        canvas.selection = false;
        
        // Restore grab cursor if spacebar still pressed, otherwise default
        canvas.defaultCursor = isSpacebarPressed ? 'grab' : 'default';
        canvas.hoverCursor = isSpacebarPressed ? 'grab' : 'default';
        return;
    }
});
```

### 4. Cursor Visual Feedback

Provide clear visual feedback:
- **Default**: Normal cursor
- **Spacebar pressed**: `grab` cursor (open hand)
- **Spacebar + dragging**: `grabbing` cursor (closed hand)

```javascript
canvas.defaultCursor = 'grab';    // When hovering
canvas.hoverCursor = 'grab';      // When over objects
```

### 5. Cleanup

Always remove event listeners when the component unmounts:

```javascript
return () => {
    canvas.off('mouse:down', handleMouseDown);
    canvas.off('mouse:move', handleMouseMove);
    canvas.off('mouse:up', handleMouseUp);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
};
```

## Alternative Approaches

### Using relativePan()

Fabric.js provides a `relativePan()` method that's simpler but less performant for real-time dragging:

```javascript
canvas.on('mouse:move', function(opt) {
    if (isSpacebarPanning) {
        const evt = opt.e;
        const deltaX = evt.clientX - lastPosX;
        const deltaY = evt.clientY - lastPosY;
        
        canvas.relativePan({ x: deltaX, y: deltaY });
        
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
    }
});
```

**Trade-off**: `relativePan()` is cleaner but calls `setViewportTransform()` internally, which can be slower for rapid updates.

### Using Alt Key Instead

The official Fabric.js documentation uses Alt+Drag:

```javascript
if (evt.altKey === true) {
    this.isDragging = true;
    // ... rest of panning logic
}
```

**Why Spacebar is Better**:
- More intuitive for design tool users
- Doesn't conflict with browser shortcuts
- Easier to hold while using mouse

## Common Pitfalls

### 1. Page Scrolling

**Problem**: Spacebar triggers page scroll by default.

**Solution**: Always call `e.preventDefault()` in the keydown handler:

```javascript
if (e.code === 'Space') {
    e.preventDefault(); // Critical!
    isSpacebarPressed = true;
}
```

### 2. Event Bubbling

**Problem**: Mouse events may interfere with object selection.

**Solution**: Use `evt.stopPropagation()` and disable selection during pan:

```javascript
if (isSpacebarPressed && evt.button === 0) {
    evt.preventDefault();
    evt.stopPropagation();
    canvas.selection = false;
}
```

### 3. Stuck Pan State

**Problem**: If user releases spacebar outside the window, state gets stuck.

**Solution**: Listen to `window` events, not just canvas events:

```javascript
window.addEventListener('keyup', handleKeyUp);
```

### 4. Cursor Not Updating

**Problem**: Cursor doesn't change when spacebar is pressed.

**Solution**: Call `canvas.requestRenderAll()` after changing cursor:

```javascript
canvas.defaultCursor = 'grab';
canvas.requestRenderAll(); // Force cursor update
```

## Integration with Zoom

Combine panning with mouse wheel zoom for a complete navigation system:

```javascript
canvas.on('mouse:wheel', function(opt) {
    const evt = opt.e;
    evt.preventDefault();
    evt.stopPropagation();
    
    const delta = evt.deltaY;
    let zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    
    // Clamp zoom
    if (zoom > 5) zoom = 5;
    if (zoom < 0.1) zoom = 0.1;
    
    // Zoom towards cursor position
    const point = new fabric.Point(evt.offsetX, evt.offsetY);
    canvas.zoomToPoint(point, zoom);
});
```

## Performance Considerations

1. **Direct Transform Manipulation**: Modifying `viewportTransform` directly is faster than using helper methods during real-time dragging.

2. **requestRenderAll vs renderAll**: Use `requestRenderAll()` for better performance - it debounces render calls.

3. **Event Throttling**: For very large canvases, consider throttling mouse move events:

```javascript
let rafId = null;
canvas.on('mouse:move', function(opt) {
    if (isSpacebarPanning && !rafId) {
        rafId = requestAnimationFrame(() => {
            // Perform panning
            rafId = null;
        });
    }
});
```

## Complete Example

See the implementation in `src/web/components/studio/Editor/PreviewPanel.tsx` (lines 255-439) for a production-ready example that includes:
- Spacebar panning
- Middle mouse button panning
- Mouse wheel zoom
- Proper state management
- React integration
- Cleanup on unmount

## References

- [Fabric.js Official Docs - Zoom and Pan](https://fabricjs.com/docs/old-docs/fabric-intro-part-5/)
- [Fabric.js Transformations Guide](https://fabricjs.com/docs/old-docs/using-transformations/)
- [Stack Overflow - Canvas Panning](https://stackoverflow.com/questions/34423822/how-to-implement-canvas-panning-with-fabric-js)

## Summary

Spacebar panning in Fabric.js requires:
1. Tracking keyboard state with window-level event listeners
2. Modifying `viewportTransform[4]` and `viewportTransform[5]` based on mouse delta
3. Providing visual feedback with cursor changes
4. Preventing default browser behaviors
5. Proper cleanup of event listeners

The key insight is that panning is simply translating the viewport by modifying the transform matrix, while the canvas objects themselves remain in their original positions in canvas space.
