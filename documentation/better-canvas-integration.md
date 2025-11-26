Let’s start implementing **Phase 1 – Artboard Foundation** and wire it into your existing code.

I’ll do three things:

1. Extend the **types** to support viewport + export frame.
2. Extend the **store** to keep that state (no behavior change yet).
3. Refactor **PreviewPanel** to use an artboard + export frame and to export only the frame region.

This will already give you:

* A larger working area around the post
* A visible export frame
* Clean exports cropped to the frame (via Fabric, not html-to-image anymore)

---

## 1. `types.ts` – Add viewport + export frame

Update your `types.ts` like this.

### 1.1 Extend `AspectRatio`

Right now you have:

```ts
export type AspectRatio = '3:4' | '4:3' | '9:16';
```

Change it to:

```ts
export type AspectRatio = '1:1' | '3:4' | '4:3' | '4:5' | '9:16' | '16:9';
```

This adds the 4:5 you’re already using (1080×1350), plus some common ones for later.

### 1.2 Add viewport + export frame types

Add these interfaces somewhere below your existing type exports (before `StudioState` is fine):

```ts
export interface ViewportState {
    zoom: number;   // 1.0 = 100%
    panX: number;   // pixels in canvas space
    panY: number;
}

export interface ExportFrameConfig {
    width: number;       // logical pixels inside Fabric canvas (e.g. 1080)
    height: number;      // e.g. 1350
    aspectRatio: AspectRatio;
}
```

### 1.3 Extend `StudioState`

Currently it ends like:

```ts
export interface StudioState {
    mode: PostType;
    composition: CompositionMode;
    topic: string;
    audience: string;
    llmModel: string;
    imageModel: string;
    slides: Slide[];
    selectedSlideId: string | null;
    sceneTemplateId: string | null;
    templates: SlideTemplate[];
    activeTemplateId: string | null;
    isGenerating: boolean;
    view: 'dashboard' | 'editor' | 'batch';
    editMode: 'text' | 'image';
    previewMode: PreviewMode;
}
```

Change it to:

```ts
export interface StudioState {
    mode: PostType;
    composition: CompositionMode;
    topic: string;
    audience: string;
    llmModel: string;
    imageModel: string;
    slides: Slide[];
    selectedSlideId: string | null;
    sceneTemplateId: string | null;
    templates: SlideTemplate[];
    activeTemplateId: string | null;
    isGenerating: boolean;
    view: 'dashboard' | 'editor' | 'batch';
    editMode: 'text' | 'image';
    previewMode: PreviewMode;

    // NEW
    aspectRatio: AspectRatio;
    viewport: ViewportState;
    exportFrame: ExportFrameConfig;
}
```

This doesn’t break anything yet; we’ll provide defaults in the store.

---

## 2. `store.tsx` – Add initial state & actions

I’ll show only the new parts you need to merge into your existing store.

### 2.1 Initial state

Where you define `const initialState: StudioState = { ... }`, add:

```ts
const initialState: StudioState = {
    // ... your existing fields
    mode: 'infographic',
    composition: 'single',
    topic: '',
    audience: '',
    llmModel: 'openrouter-gpt-5.1-thinking',
    imageModel: 'flux-schnell',
    slides: [],
    selectedSlideId: null,
    sceneTemplateId: null,
    templates: [],
    activeTemplateId: null,
    isGenerating: false,
    view: 'editor',
    editMode: 'text',
    previewMode: 'image',

    // NEW: artboard-related defaults
    aspectRatio: '4:5',
    exportFrame: {
        width: 1080,
        height: 1350,
        aspectRatio: '4:5',
    },
    viewport: {
        zoom: 1,
        panX: 0,
        panY: 0,
    },
};
```

Adjust the existing parts to your real defaults as needed; the important bit is the new properties.

### 2.2 Action types

Where you define `type StudioAction = ...`, add:

```ts
type StudioAction =
    | { type: 'SET_TOPIC'; payload: string }
    | { type: 'SET_AUDIENCE'; payload: string }
    | { type: 'SET_LLM_MODEL'; payload: string }
    | { type: 'SET_IMAGE_MODEL'; payload: string }
    | { type: 'SET_SLIDES'; payload: Slide[] }
    | { type: 'SET_SELECTED_SLIDE'; payload: string | null }
    | { type: 'SET_MODE'; payload: PostType }
    | { type: 'SET_COMPOSITION'; payload: CompositionMode }
    | { type: 'SET_VIEW'; payload: StudioState['view'] }
    | { type: 'SET_EDIT_MODE'; payload: StudioState['editMode'] }
    | { type: 'SET_PREVIEW_MODE'; payload: PreviewMode }
    | { type: 'SET_GENERATING'; payload: boolean }
    | { type: 'UPDATE_SLIDE'; payload: { id: string; updates: Partial<Slide> } }

    // NEW
    | { type: 'SET_ASPECT_RATIO'; payload: AspectRatio }
    | { type: 'SET_VIEWPORT'; payload: Partial<ViewportState> }
    | { type: 'SET_EXPORT_FRAME'; payload: Partial<ExportFrameConfig> };
```

(If you already have some of these, just merge; the important part is the three new ones.)

### 2.3 Reducer cases

In your `studioReducer`, add:

```ts
function studioReducer(state: StudioState, action: StudioAction): StudioState {
    switch (action.type) {
        // ... existing cases

        case 'SET_ASPECT_RATIO': {
            return {
                ...state,
                aspectRatio: action.payload,
                exportFrame: {
                    ...state.exportFrame,
                    aspectRatio: action.payload,
                },
            };
        }

        case 'SET_VIEWPORT': {
            return {
                ...state,
                viewport: {
                    ...state.viewport,
                    ...action.payload,
                },
            };
        }

        case 'SET_EXPORT_FRAME': {
            return {
                ...state,
                exportFrame: {
                    ...state.exportFrame,
                    ...action.payload,
                },
            };
        }

        default:
            return state;
    }
}
```

Phase 1 doesn’t *use* viewport yet, but it’s now in place for Phase 2.

---

## 3. `PreviewPanel.tsx` – Artboard + export frame + clean export

Now the main part: refactor `PreviewPanel` to:

* Use a **large Fabric canvas** (artboard) around the real export frame
* Draw a visible **white export frame** on a neutral artboard background
* Treat all stored positions as **relative to the export frame**
* Export **only the frame area** directly from Fabric

### 3.1 High-level idea

* Artboard size = export frame + generous margin on all sides:

  ```ts
  const WORKSPACE_MARGIN = 1000; // px around the export frame inside Fabric
  ```

  So for 1080×1350 you get:

  ```ts
  artboardWidth  = 1080 + 2 * 1000 = 3080
  artboardHeight = 1350 + 2 * 1000 = 3350
  ```

* The export frame is centered on the artboard:

  ```ts
  frameOffsetX = (artboardWidth  - exportWidth) / 2
  frameOffsetY = (artboardHeight - exportHeight) / 2
  ```

* In the store, `slide.textBox` and `slide.imageTransform` stay **relative to the frame** (0..1080/0..1350).
  In Fabric, we **shift them by the frame offset**.

  * When **reading from store → canvas**, we add the offset.
  * When **writing from canvas → store**, we subtract the offset.

So you get a clean separation between logical export area and larger working canvas.

---

### 3.2 Concrete changes in `PreviewPanel.tsx`

I’ll show the file with the important changes annotated.

#### 3.2.1 Imports & constants

Replace the top part with this:

```tsx
import { useStudio } from '../../../lib/studio/store';
import { Image as ImageIcon, Type, Download, Share2, FileCode } from 'lucide-react';
// ❌ REMOVE this line:
// import { toPng } from 'html-to-image';
import { useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import type { Slide, PreviewMode } from '../../../lib/studio/types';
import { PromptModeView } from './PromptModeView';

// Logical export frame size (what you want as final PNG)
const DEFAULT_EXPORT_WIDTH = 1080;
const DEFAULT_EXPORT_HEIGHT = 1350;

// Extra working area around the export frame
const WORKSPACE_MARGIN = 1000;

const TEXT_SAFE_MARGIN = 48;

const decodeHtml = (value: string) => {
    if (typeof window === 'undefined') return value;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
};

const normalizeSlideText = (value?: string) => {
    if (!value) return '';
    const decoded = decodeHtml(value);
    return decoded
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?[^>]+>/gi, '')
        .trim();
};

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
```

We intentionally no longer have `CANVAS_WIDTH`/`CANVAS_HEIGHT`. Instead we derive artboard + frame per render from state.

#### 3.2.2 Text layout helpers – updated to use frame + offsets

Replace the old `DEFAULT_TEXT_LAYOUT`, `DEFAULT_TEXT_STYLE`, `getTextLayout`, `getTextInitialProps` with:

```tsx
const DEFAULT_TEXT_STYLE = {
    fontSize: 32,
    fill: '#1a1a1a',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center' as const,
};

const getTextLayout = (
    slide: Slide | undefined,
    exportWidth: number,
    exportHeight: number,
    frameOffsetX: number,
    frameOffsetY: number
) => {
    // slide.textBox is stored RELATIVE to the export frame (0..exportWidth)
    const stored = slide?.textBox;
    const baseLeft = stored?.left ?? 60;
    const baseTop = stored?.top ?? exportHeight - 240;
    const baseWidth = stored?.width ?? exportWidth - 120;

    const maxWidth = exportWidth - TEXT_SAFE_MARGIN * 2;
    const width = clamp(baseWidth, 200, maxWidth);

    const frameLeft = frameOffsetX + TEXT_SAFE_MARGIN;
    const frameRight = frameOffsetX + exportWidth - TEXT_SAFE_MARGIN - width;
    const frameTop = frameOffsetY + TEXT_SAFE_MARGIN;
    const frameBottom = frameOffsetY + exportHeight - TEXT_SAFE_MARGIN - 160;

    const left = clamp(baseLeft + frameOffsetX, frameLeft, frameRight);
    const top = clamp(baseTop + frameOffsetY, frameTop, frameBottom);

    return { left, top, width };
};

const getTextInitialProps = (
    slide: Slide | undefined,
    exportWidth: number,
    exportHeight: number,
    frameOffsetX: number,
    frameOffsetY: number
) => {
    const layout = getTextLayout(slide, exportWidth, exportHeight, frameOffsetX, frameOffsetY);
    const style = slide?.textBox;
    return {
        ...layout,
        fontSize: style?.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
        fill: style?.fill ?? DEFAULT_TEXT_STYLE.fill,
        backgroundColor: style?.backgroundColor ?? DEFAULT_TEXT_STYLE.backgroundColor,
        textAlign: style?.textAlign ?? DEFAULT_TEXT_STYLE.textAlign,
    };
};
```

Now textBox in the store is still “small” (0..1080/0..1350), but we place it correctly on the large artboard.

#### 3.2.3 Component – derive artboard + frame geometry from state

Inside `PreviewPanel`, adjust the destructuring and compute artboard sizes:

```tsx
export function PreviewPanel({ onCanvasReady, onTextSelected }: PreviewPanelProps) {
    const { state, dispatch } = useStudio();
    const {
        slides,
        selectedSlideId,
        editMode,
        previewMode,
        exportFrame,   // NEW
    } = state;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const textBoxRef = useRef<fabric.Textbox | null>(null);
    const imageRef = useRef<fabric.Image | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);

    const selectedSlide =
        slides.find((slide) => slide.id === selectedSlideId) ??
        (slides.length > 0 ? slides[0] : null);

    const isEmpty = !selectedSlide;
    const isPromptMode = previewMode === 'prompt';

    // --- Artboard + frame geometry (Phase 1 foundation) ---
    const exportWidth = exportFrame?.width ?? DEFAULT_EXPORT_WIDTH;
    const exportHeight = exportFrame?.height ?? DEFAULT_EXPORT_HEIGHT;

    const artboardWidth = exportWidth + WORKSPACE_MARGIN * 2;
    const artboardHeight = exportHeight + WORKSPACE_MARGIN * 2;

    const frameOffsetX = (artboardWidth - exportWidth) / 2;
    const frameOffsetY = (artboardHeight - exportHeight) / 2;
```

We’ll use these same values everywhere in the component (init, slide loading, export).

#### 3.2.4 Initialization effect – still one-time, but now the underlying canvas has artboard size

The init effect mostly stays the same, but you should ensure it doesn’t assume 1080×1350. No change needed inside the effect, because Fabric uses the `<canvas>` element’s width/height attributes, which we will update in JSX.

You *don’t* need to change the logic in the init effect (only its dependencies if you want), so you can keep it as-is:

```tsx
    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }
        if (fabricCanvasRef.current) {
            return;
        }

        const canvas = new fabric.Canvas(canvasRef.current, {
            selection: false,
            controlsAboveOverlay: true,
        });

        // ... wrapper style magic you already have ...

        fabricCanvasRef.current = canvas;
        console.log('[PreviewPanel] Fabric canvas initialized', { hasCanvas: !!canvas, selectedSlideId });
        onCanvasReady?.(canvas);

        return () => {
            console.log('[PreviewPanel] Disposing fabric canvas');
            canvas.dispose();
            fabricCanvasRef.current = null;

            // ... restore wrapper and canvas styles ...
        };
    }, [onCanvasReady]);
```

The important part that changes is **how the `<canvas>` element is declared** (we’ll adjust JSX below).

#### 3.2.5 Slide content effect – insert export frame, shift image/text

This is where most of Phase 1 happens.

Replace your “Load slide content” `useEffect` with this version:

```tsx
    // Load slide content
    useEffect(() => {
        console.log('[PreviewPanel] Slide content effect triggered', {
            hasCanvas: !!fabricCanvasRef.current,
            hasSlide: !!selectedSlide,
            slideId: selectedSlide?.id,
            imageUrl: selectedSlide?.imageUrl,
        });

        const canvas = fabricCanvasRef.current;
        if (!canvas) {
            console.log('[PreviewPanel] No canvas available for rendering');
            return;
        }

        if (!selectedSlide) {
            console.warn('[PreviewPanel] No selected slide to load into canvas', {
                slideCount: slides.length,
                selectedSlideId,
            });
            canvas.clear();
            canvas.backgroundColor = '#f3f4f6'; // light gray artboard
            imageRef.current = null;
            textBoxRef.current = null;
            canvas.renderAll();
            return;
        }

        canvas.clear();
        canvas.backgroundColor = '#f3f4f6'; // artboard background
        imageRef.current = null;
        textBoxRef.current = null;

        let cancelled = false;
        let textSyncFrame: number | null = null;
        let imageSyncFrame: number | null = null;

        const slideId = selectedSlide.id;
        const textProps = getTextInitialProps(
            selectedSlide,
            exportWidth,
            exportHeight,
            frameOffsetX,
            frameOffsetY
        );
        const slideText = normalizeSlideText(selectedSlide.text) || 'Your text here';

        // --- Export frame rect (white) ---
        const frameRect = new fabric.Rect({
            left: frameOffsetX,
            top: frameOffsetY,
            width: exportWidth,
            height: exportHeight,
            fill: '#ffffff',
            stroke: '#d1d5db',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            hoverCursor: 'default',
        });
        canvas.add(frameRect);

        // --- Store sync helpers (store still uses coordinates RELATIVE to frame) ---
        const syncTextToStore = (textbox: fabric.Textbox) => {
            const left = (textbox.left ?? textProps.left) - frameOffsetX;
            const top = (textbox.top ?? textProps.top) - frameOffsetY;

            dispatch({
                type: 'UPDATE_SLIDE',
                payload: {
                    id: slideId,
                    updates: {
                        text: textbox.text || '',
                        textBox: {
                            left,
                            top,
                            width: textbox.width ?? (textProps as any).width,
                            fontSize: textbox.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
                            fill: (textbox.fill as string) ?? DEFAULT_TEXT_STYLE.fill,
                            backgroundColor: (textbox.backgroundColor as string) ?? DEFAULT_TEXT_STYLE.backgroundColor,
                            textAlign: (textbox.textAlign as 'left' | 'center' | 'right') ?? DEFAULT_TEXT_STYLE.textAlign,
                        },
                    },
                },
            });
        };

        const syncImageToStore = (image: fabric.Image) => {
            const left = (image.left ?? 0) - frameOffsetX;
            const top = (image.top ?? 0) - frameOffsetY;

            dispatch({
                type: 'UPDATE_SLIDE',
                payload: {
                    id: slideId,
                    updates: {
                        imageTransform: {
                            left,
                            top,
                            scaleX: image.scaleX ?? 1,
                            scaleY: image.scaleY ?? 1,
                        },
                    },
                },
            });
        };

        const scheduleTextSync = () => {
            if (textSyncFrame !== null) return;
            textSyncFrame = requestAnimationFrame(() => {
                textSyncFrame = null;
                if (textBoxRef.current) {
                    syncTextToStore(textBoxRef.current);
                }
            });
        };

        const scheduleImageSync = () => {
            if (imageSyncFrame !== null) return;
            imageSyncFrame = requestAnimationFrame(() => {
                imageSyncFrame = null;
                if (imageRef.current) {
                    syncImageToStore(imageRef.current);
                }
            });
        };

        const handleObjectModified = (event: fabric.ModifiedEvent<MouseEvent>) => {
            const target = event.target;
            if (!target) return;
            if (textBoxRef.current && target === textBoxRef.current) {
                scheduleTextSync();
            } else if (imageRef.current && target === imageRef.current) {
                scheduleImageSync();
            }
        };

        const realtimeHandler = (event: any) => {
            const target = event.target;
            if (!target) return;
            if (textBoxRef.current && target === textBoxRef.current) {
                scheduleTextSync();
            } else if (imageRef.current && target === imageRef.current) {
                scheduleImageSync();
            }
        };

        canvas.on('object:modified', handleObjectModified);
        canvas.on('object:moving', realtimeHandler);
        canvas.on('object:scaling', realtimeHandler);
        canvas.on('object:rotating', realtimeHandler);

        // --- Background image ---
        const imageUrl = selectedSlide.imageUrl;
        const initImage = async () => {
            if (!imageUrl) return;
            console.log('[PreviewPanel] Loading background image', imageUrl);
            try {
                const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' });
                if (!img || cancelled) return;

                imageRef.current = img;
                img.selectable = true;
                img.evented = true;
                img.perPixelTargetFind = true;
                img.set({
                    hoverCursor: editMode === 'image' ? 'move' : 'default',
                    lockMovementX: editMode !== 'image',
                    lockMovementY: editMode !== 'image',
                    lockScalingX: editMode !== 'image',
                    lockScalingY: editMode !== 'image',
                });

                if (selectedSlide.imageTransform) {
                    // imageTransform is stored RELATIVE to frame
                    img.set({
                        left: selectedSlide.imageTransform.left + frameOffsetX,
                        top: selectedSlide.imageTransform.top + frameOffsetY,
                        scaleX: selectedSlide.imageTransform.scaleX,
                        scaleY: selectedSlide.imageTransform.scaleY,
                    });
                } else if (img.width && img.height) {
                    // Cover the export frame, not the whole artboard
                    const coverScale = Math.max(
                        exportWidth / img.width,
                        exportHeight / img.height
                    );
                    img.scale(coverScale);
                    img.left = frameOffsetX + (exportWidth - img.getScaledWidth()) / 2;
                    img.top = frameOffsetY + (exportHeight - img.getScaledHeight()) / 2;
                } else {
                    img.scaleToWidth(exportWidth);
                    img.scaleToHeight(exportHeight);
                    img.left = frameOffsetX;
                    img.top = frameOffsetY;
                }

                canvas.add(img);
                // Keep frame in the back, image above it
                canvas.sendToBack(frameRect);
                canvas.renderAll();
                console.log('[PreviewPanel] Background image rendered', {
                    objectCount: canvas.getObjects().length,
                });
            } catch (error) {
                console.error('[PreviewPanel] Failed to load image', {
                    url: imageUrl,
                    error,
                });
            }
        };
        initImage();

        // --- Text box ---
        const textBox = new fabric.Textbox(slideText, {
            left: textProps.left,
            top: textProps.top,
            width: textProps.width,
            fontSize: textProps.fontSize,
            fontWeight: 600,
            fill: textProps.fill,
            backgroundColor: textProps.backgroundColor,
            padding: 24,
            editable: true,
            selectable: true,
            textAlign: textProps.textAlign,
        });

        canvas.add(textBox);
        textBox.bringToFront?.();
        textBoxRef.current = textBox;

        if (onTextSelected) {
            onTextSelected(textBox);
        }

        canvas.renderAll();

        const handleTextChanged = () => {
            scheduleTextSync();
        };

        textBox.on('changed', handleTextChanged as any);
        textBox.on('editing:exited', handleTextChanged as any);

        return () => {
            cancelled = true;
            if (textSyncFrame !== null) cancelAnimationFrame(textSyncFrame);
            if (imageSyncFrame !== null) cancelAnimationFrame(imageSyncFrame);
            textBox.off('changed', handleTextChanged as any);
            textBox.off('editing:exited', handleTextChanged as any);
            canvas.off('object:modified', handleObjectModified);
            canvas.off('object:moving', realtimeHandler);
            canvas.off('object:scaling', realtimeHandler);
            canvas.off('object:rotating', realtimeHandler);
        };
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
    ]);
```

Core behaviors now:

* The artboard background is light gray (`#f3f4f6`).
* The export frame is a white rectangle with a subtle stroke, centered on the artboard.
* Image and text are aligned to that frame and offsets are handled both ways.

#### 3.2.6 Edit mode effect – no big change

You can mostly keep your existing `useEffect` for editMode; just no changes needed besides the new context. It will still enable/disable selection for text vs. image.

#### 3.2.7 Download – export only the frame via Fabric

Replace `handleDownload` (which uses `html-to-image`) with a Fabric export:

```tsx
    const handleDownload = async () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) {
            console.warn('[PreviewPanel] Download requested but no Fabric canvas');
            return;
        }

        const slideId = selectedSlide?.id || 'slide';

        try {
            const dataUrl = canvas.toDataURL({
                format: 'png',
                left: frameOffsetX,
                top: frameOffsetY,
                width: exportWidth,
                height: exportHeight,
                multiplier: 1, // set to 2.0 if you want 2x resolution
            });

            const link = document.createElement('a');
            link.download = `${slideId}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('[PreviewPanel] Download failed:', error);
            alert('Failed to download image. Please try again.');
        }
    };
```

No more DOM snapshot; you get a **clean PNG of exactly the export frame**, independent of UI scaling.

#### 3.2.8 JSX – make the canvas artboard-sized, container fills space

In the return JSX, update the central area:

1. You can keep `previewRef` if you still want the overlay, but it’s not needed for export anymore.
2. The key change: `<canvas>` should have **artboard** dimensions, not 1080×1350.

Change the relevant part:

```tsx
            {/* Main Canvas / Prompt Overlay */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-visible relative">
                <div
                    ref={previewRef}
                    className={`relative bg-white shadow-2xl flex items-center justify-center overflow-visible transition-opacity ${
                        isPromptMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                    style={{ width: '540px', height: '675px' }}
                >
```

To something like:

```tsx
            {/* Main Canvas / Prompt Overlay */}
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
                <div
                    ref={previewRef}
                    className={`relative bg-gray-950 shadow-2xl flex items-center justify-center overflow-hidden transition-opacity ${
                        isPromptMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                    }`}
                    style={{ width: '100%', height: '100%', maxWidth: '720px', maxHeight: '900px' }}
                >
```

(You can tweak the sizing as you like; the important part is that it now fills the center column instead of being hard-coded to 540×675.)

Then change the `<canvas>` element to use artboard size:

```tsx
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

Now Fabric operates in a **large logical coordinate system**, but the canvas is scaled flexibly into your center panel.

The rest of the component (toolbar, storyboard strip) can remain unchanged.

---

## What this Phase 1 gives you

Right now, with these changes:

* You have a **larger artboard** around the “real” export frame.
* The export frame is **visually distinct** (white area on gray background).
* All slide data remains stored **relative to the frame** (no migration headaches).
* Downloads use **Fabric cropping**, giving you an exact PNG of the export area, independent of screen size.
* The structure (exportFrame, viewport) is ready for **Phase 2** (zoom & pan) and **Phase 3** (multiple aspect ratios).

If you want, next step I can layer on **zoom + pan** (using `canvas.setZoom` and `viewportTransform`) but still keeping the code clean and centralized via small hooks like `useCanvasZoom` / `useCanvasPan`.
