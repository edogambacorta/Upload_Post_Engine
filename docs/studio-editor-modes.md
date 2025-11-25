# Studio Editor Mode Architecture & Current Issues

This document serves two purposes:

1. Capture the intended interaction model for the Studio editor (text vs. image mode, live persistence, masking, etc.).
2. Document the specific implementation details that currently prevent the experience from working smoothly.

The goal is to give future work a clear map of the moving parts, the relevant source files, and the code paths that need attention.

---

## Files Involved

| File | Responsibility |
| --- | --- |
| `src/web/components/studio/Editor/PreviewPanel.tsx` | Renders the Fabric canvas, loads slides, toggles between text/image tooling, persists transforms, shows the storyboard strip. |
| `src/web/components/studio/Editor/StudioEditor.tsx` | Hosts the left/right panels, passes callbacks, reads `runId` and hydrates the store. |
| `src/web/components/studio/Editor/StylePanel.tsx` | UI for text/image styling. Its controls rely on `selectedText` / `fabricCanvas` refs passed down from `PreviewPanel`. |
| `src/web/lib/studio/store.tsx` | Global reducer holding `slides`, `editMode`, text/image metadata, and dispatchers used across panels. |
| `src/web/lib/studio/types.ts` | Defines the `Slide` shape including the persisted `textBox` and `imageTransform` data. |

---

## PreviewPanel Core Logic

The heart of the feature is `PreviewPanel.tsx`. Key snippets:

```tsx
const textBoxRef = useRef<fabric.Textbox | null>(null);
const imageRef = useRef<fabric.Image | null>(null);

const getTextLayout = (slide?: Slide) => {
  const layout = slide?.textBox ?? DEFAULT_TEXT_LAYOUT;
  // clamps width/position into safe margins
  …
  return { left, top, width };
};

const handleModeSwitch = (newMode: 'text' | 'image') => {
  dispatch({ type: 'SET_EDIT_MODE', payload: newMode });
};

useEffect(() => {
  const canvas = fabricCanvasRef.current;
  const textBox = textBoxRef.current;
  const imageObject = imageRef.current;
  const isTextMode = editMode === 'text';
  const isImageMode = editMode === 'image';

  if (textBox) {
    textBox.selectable = isTextMode;
    textBox.evented = isTextMode;
    textBox.lockMovementX = !isTextMode;
    textBox.lockMovementY = !isTextMode;
    textBox.editable = isTextMode;
  }
  if (imageObject) {
    imageObject.selectable = isImageMode;
    imageObject.evented = isImageMode;
    imageObject.lockMovementX = !isImageMode;
    imageObject.lockMovementY = !isImageMode;
    imageObject.lockScalingX = !isImageMode;
    imageObject.lockScalingY = !isImageMode;
  }
  …
}, [editMode]);
```

And every canvas change persists back into the store:

```tsx
const scheduleTextSync = () => {
  if (textSyncFrame !== null) return;
  textSyncFrame = requestAnimationFrame(() => {
    textSyncFrame = null;
    if (textBoxRef.current) {
      dispatch({
        type: 'UPDATE_SLIDE',
        payload: {
          id: slideId,
          updates: {
            text: textBoxRef.current.text || '',
            textBox: {
              left: textBoxRef.current.left ?? textLayout.left,
              top: textBoxRef.current.top ?? textLayout.top,
              width: textBoxRef.current.width ?? textLayout.width,
            },
          },
        },
      });
    }
  });
};

canvas.on('object:moving', realtimeHandler);
canvas.on('object:scaling', realtimeHandler);
canvas.on('object:rotating', realtimeHandler);
```

### Why interactions break right now

1. **Focus loss / text jumping behind image**  
   When image mode is active, the image stays selectable and gets re-added to the canvas. We currently remove and re-add the text object to keep it on top, but when the user clicks the image while in text mode the `canvas.setActiveObject(imageObject)` call (triggered by the edit-mode effect) immediately steals focus. The `textBox` loses `editable=true`, so typing drops characters, and if the image has any transparency the text appears “behind” it until the next render.

2. **Dragging loses focus instantly**  
   Because `scheduleTextSync` and `scheduleImageSync` dispatch `UPDATE_SLIDE` on every `object:moving` event, each Redux update triggers a re-render. That re-render reinstantiates the Fabric text box, so as soon as the user drags a layer we wipe the active object and Fabric interprets it as losing focus. This is why resizing text or moving the image drops the selection right away.

3. **Changing text size reverts**  
   The `StylePanel` slider simply calls `selectedText.set('fontSize', size)` and then `fabricCanvas.renderAll()`. However, because `PreviewPanel` rebuilds the Fabric objects whenever `selectedSlide?.textBox` changes, the next persistence cycle applies the previous `fontSize` stored in Redux, overriding the user’s adjustment immediately unless they stop interacting long enough for the `UPDATE_SLIDE` dispatch to finish.

4. **Mask + wrapper styles**  
   The mask overlay uses:
   ```tsx
   <svg>
     <mask id={maskId}>
       <rect … fill="white" />
       <rect … fill="black" />
     </mask>
   </svg>
   ```
   The sanitized `maskId` still contains `-` which is fine, but the wrapper injection:
   ```tsx
   wrapper.style.setProperty(prop, value, priority);
   …
   canvasEl.style.setProperty('width', '100%', 'important');
   ```
   forces the Fabric internal sizes to 100%, yet Fabric still renders at 1080×1350. This mismatch causes scaling/selection coordinates to be off, which contributes to the “text disappears” bug because the user thinks they clicked the text but Fabric resolves the pointer inside the image.

---

## StudioEditor & StylePanel touchpoints

### `StudioEditor.tsx`

```tsx
<PreviewPanel
  onCanvasReady={setFabricCanvas}
  onTextSelected={setSelectedText}
/>
<StylePanel
  fabricCanvas={fabricCanvas}
  selectedText={selectedText}
/>
```

The right panel expects a stable `fabricCanvas` + `selectedText`. Because we constantly recreate the Fabric objects, `selectedText` swings between `null` and a new instance. That’s why font changes or color pickers “don’t stick”: by the time the user clicks outside the slider the original textbox was replaced.

### `StylePanel.tsx`

```tsx
const handleTextColorChange = (color: string) => {
  setTextColor(color);
  if (selectedText && fabricCanvas) {
    selectedText.set('fill', color);
    fabricCanvas.renderAll();
  }
};
```

This logic works only if `selectedText` remains the same instance. Right now any click that dispatches `UPDATE_SLIDE` causes `PreviewPanel` to rebuild the textbox and `selectedText` becomes stale. The UI slider then controls an unmounted object, giving the impression that the UI ignores input.

---

## Current Plan / Next Steps

1. **Stop recreating Fabric objects on every Redux update**  
   - Instead of clearing the canvas and rebuilding whenever `slides` change, diff the existing Fabric objects and update properties in place. That keeps selection/focus intact.
   - Alternatively, move the `UPDATE_SLIDE` persistence logic to a debounced effect that reads directly from `textBoxRef.current` without dispatching during drag events.

2. **Maintain layer order**  
   - Remove the `canvas.remove(tb); canvas.add(tb);` workaround and use Fabric’s `canvas.bringObjectToFront()` once per render. Or, mark the text object with `textBoxRef.current!.set({ zIndex: 1 })` using Fabric’s newer stacking utilities.

3. **Text mode vs. Image mode**  
   - When `editMode === 'text'`, forcibly disable image hit testing (e.g., `imageObject.evented = false`) so clicking anywhere keeps the textbox focused. Conversely, when in image mode, `textBox.evented = false`. Right now we expose both, leading to the “text disappears when clicking image” bug.

4. **Wrapper scaling**  
   - Remove the manual style overrides and instead set the Fabric canvas size via `canvas.setDimensions({ width: widthPx, height: heightPx }, { cssOnly: true })`. That keeps Fabric’s coordinate space aligned with the DOM dimensions and prevents pointer mismatch.

5. **Documentation**  
   - This document should be kept up to date whenever the editor interaction model changes so new contributors know where to look (`PreviewPanel`, `StylePanel`, `store.tsx`, etc.).

---

With these notes we now have:  
*A description of how the feature is designed*,  
*Concrete code references showing the current behavior*, and  
*A prioritized list of the failure modes to address next*.
