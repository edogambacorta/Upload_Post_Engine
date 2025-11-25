Short version: nearly all of these bugs come from one missing concept in your state model.

You never explicitly encode **“what am I building right now?”**
(single image vs slideshow, and how many slides / what roles).

Instead:

* `mode` is “infographic | carousel | batch” (kind of content)
* `editMode` is “text | image” (what the canvas is editing)
* `previewMode` is “text | image | prompt” (what the center panel shows)
* `slides[]` is abused as “if length > 1 then… maybe slideshow?”

Because there is no **composition mode** and no canonical slide-creation function, every component guesses, and the guesses drift apart. That’s why:

* Batch generator always creates 4 slides, even for “single image”.
* Prompt view shows all slides even in “single image” scenarios.
* Storyboard strip is tied to `previewMode === 'image'` instead of “we’re in slideshow”.
* Dashboard/run loader, BriefPanel, BatchGenerator each build slides differently.
* There is no place to hang “template” semantics.

So the fix “once and for all” is:

> Add a single **composition mode** in state (`'single' | 'slideshow'`) and route all slide creation and UI around that.

Everything else becomes much simpler once that is the source of truth.

Below is a concrete, step-by-step refactor with code.

---

## 1. Core Refactor: Studio State & Slide Creation

### 1.1 Extend types: Composition + Templates

**`src/web/lib/studio/types.ts`** (additions only)

```ts
export type CompositionMode = 'single' | 'slideshow';

export interface SlideTemplate {
  id: string;
  name: string;
  description?: string;
  imagePromptBase?: string;
  backgroundStyle?: {
    type: 'color' | 'gradient';
    value: string;
  };
  textBoxDefaults?: Slide['textBox'];
}

export interface StudioState {
  mode: PostType;                 // 'infographic' | 'carousel' | 'batch'
  composition: CompositionMode;   // 🔥 NEW: single vs slideshow
  topic: string;
  audience: string;
  llmModel: string;
  imageModel: string;
  slides: Slide[];
  selectedSlideId: string | null;
  sceneTemplateId: string | null;
  templates: SlideTemplate[];     // 🔥 NEW
  activeTemplateId: string | null;// 🔥 NEW
  isGenerating: boolean;
  view: 'dashboard' | 'editor' | 'batch';
  editMode: 'text' | 'image';
  previewMode: PreviewMode;
}
```

### 1.2 Extend store: actions + reducer

**`src/web/lib/studio/store.tsx`**

Extend `Action`:

```ts
type Action =
    | { type: 'SET_MODE'; payload: PostType }
    | { type: 'SET_COMPOSITION'; payload: 'single' | 'slideshow' }   // 🔥 NEW
    | { type: 'SET_TOPIC'; payload: string }
    | { type: 'SET_AUDIENCE'; payload: string }
    | { type: 'SET_LLM_MODEL'; payload: string }
    | { type: 'SET_IMAGE_MODEL'; payload: string }
    | { type: 'ADD_SLIDE'; payload: Slide }
    | { type: 'SET_SLIDES'; payload: Slide[] }
    | { type: 'REORDER_SLIDES'; payload: { fromIndex: number; toIndex: number } } // 🔥 NEW
    | { type: 'UPDATE_SLIDE'; payload: { id: string; updates: Partial<Slide> } }
    | { type: 'SET_SELECTED_SLIDE'; payload: string | null }
    | { type: 'SET_SCENE_TEMPLATE'; payload: string }
    | { type: 'ADD_TEMPLATE'; payload: SlideTemplate }                 // 🔥 NEW
    | { type: 'UPDATE_TEMPLATE'; payload: { id: string; updates: Partial<SlideTemplate> } } // 🔥 NEW
    | { type: 'DELETE_TEMPLATE'; payload: string }                     // 🔥 NEW
    | { type: 'SET_ACTIVE_TEMPLATE'; payload: string | null }          // 🔥 NEW
    | { type: 'SET_GENERATING'; payload: boolean }
    | { type: 'SET_VIEW'; payload: 'dashboard' | 'editor' | 'batch' }
    | { type: 'SET_EDIT_MODE'; payload: 'text' | 'image' }
    | { type: 'SET_PREVIEW_MODE'; payload: PreviewMode };
```

Update `initialState`:

```ts
const initialState: StudioState = {
    mode: 'infographic',
    composition: 'single',      // 🔥 default to single
    topic: '',
    audience: '',
    llmModel: 'openrouter-gpt-4.1',
    imageModel: 'flux-schnell',
    slides: [],
    selectedSlideId: null,
    sceneTemplateId: null,
    templates: [],              // 🔥
    activeTemplateId: null,     // 🔥
    isGenerating: false,
    view: 'dashboard',
    editMode: 'text',
    previewMode: 'text',
};
```

Extend reducer:

```ts
function studioReducer(state: StudioState, action: Action): StudioState {
    switch (action.type) {
        case 'SET_MODE':
            return { ...state, mode: action.payload };

        case 'SET_COMPOSITION':
            return { ...state, composition: action.payload };  // 🔥

        case 'SET_TOPIC':
            return { ...state, topic: action.payload };

        case 'SET_AUDIENCE':
            return { ...state, audience: action.payload };

        case 'SET_LLM_MODEL':
            return { ...state, llmModel: action.payload };

        case 'SET_IMAGE_MODEL':
            return { ...state, imageModel: action.payload };

        case 'ADD_SLIDE':
            return { ...state, slides: [...state.slides, action.payload] };

        case 'SET_SLIDES':
            return { ...state, slides: action.payload };

        case 'REORDER_SLIDES': {                        // 🔥 drag-drop support
            const next = [...state.slides];
            const { fromIndex, toIndex } = action.payload;
            const [moved] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moved);
            return { ...state, slides: next };
        }

        case 'UPDATE_SLIDE':
            return {
                ...state,
                slides: state.slides.map((slide) =>
                    slide.id === action.payload.id ? { ...slide, ...action.payload.updates } : slide
                ),
            };

        case 'SET_SELECTED_SLIDE':
            return { ...state, selectedSlideId: action.payload };

        case 'SET_SCENE_TEMPLATE':
            return { ...state, sceneTemplateId: action.payload };

        case 'ADD_TEMPLATE':
            return { ...state, templates: [...state.templates, action.payload] };

        case 'UPDATE_TEMPLATE':
            return {
                ...state,
                templates: state.templates.map((tpl) =>
                    tpl.id === action.payload.id ? { ...tpl, ...action.payload.updates } : tpl
                ),
            };

        case 'DELETE_TEMPLATE':
            return {
                ...state,
                templates: state.templates.filter((tpl) => tpl.id !== action.payload),
                activeTemplateId:
                    state.activeTemplateId === action.payload ? null : state.activeTemplateId,
            };

        case 'SET_ACTIVE_TEMPLATE':
            return { ...state, activeTemplateId: action.payload };

        case 'SET_GENERATING':
            return { ...state, isGenerating: action.payload };

        case 'SET_VIEW':
            return { ...state, view: action.payload };

        case 'SET_EDIT_MODE':
            return { ...state, editMode: action.payload };

        case 'SET_PREVIEW_MODE':
            return { ...state, previewMode: action.payload };

        default:
            return state;
    }
}
```

Now you have:

* **`mode`** = content type (`infographic | carousel | batch`)
* **`composition`** = single vs slideshow (the missing piece)
* **`editMode`** = text vs image on canvas
* **`previewMode`** = what center panel shows

Each component can pick the right flag instead of guessing from `slides.length`.

### 1.3 Fix slide creation once and for all

**`src/web/lib/studio/slideUtils.ts`**

Split out single vs slideshow:

```ts
import { MomPost, Slide } from './types';

const buildBaseMeta = (post: MomPost) => ({
    overlayTitle: post.overlayTitle,
    overlaySubtitle: post.overlaySubtitle,
    hook: post.hook,
    caption: post.caption,
    cta: post.cta,
    safetyFooter: post.safetyFooter,
    imagePrompt: post.imagePrompt,
});

// 🔥 Single-image helper
export function createSingleSlideFromPost(post: MomPost): Slide {
    const baseId = post.id || 'slide';
    const meta = buildBaseMeta(post);

    const mainText = post.caption || post.hook || '';
    const imagePrompt =
        post.imagePrompt ||
        (post.hook ? `Visual representation of "${post.hook}"` : `Visualize: ${mainText}`);

    return {
        id: `${baseId}-single`,
        role: 'single',
        text: mainText,
        imagePrompt,
        variationPrompt: imagePrompt,
        imageUrl: '',
        status: 'draft',
        meta,
    };
}

// 🔥 Slideshow helper (your existing logic, just refactored)
export function createSlideshowFromPost(post: MomPost): Slide[] {
    const baseId = post.id || 'slide';
    const captionSentences = post.caption
        .split('.')
        .map((s) => s.trim())
        .filter(Boolean);
    const empathyText = captionSentences.length ? `${captionSentences[0]}.` : post.caption;
    const insightText = post.caption;
    const meta = buildBaseMeta(post);

    return [
        {
            id: `${baseId}-hook`,
            role: 'hook',
            text: post.hook,
            imagePrompt: post.imagePrompt || `Visual representation of "${post.hook}"`,
            variationPrompt: post.imagePrompt || '',
            imageUrl: '',
            status: 'draft',
            meta,
        },
        {
            id: `${baseId}-empathy`,
            role: 'empathy',
            text: empathyText,
            imagePrompt: `Empathetic scene illustrating "${empathyText.replace(/\.$/, '')}"`,
            variationPrompt: `Empathetic scene illustrating "${empathyText.replace(/\.$/, '')}"`,
            imageUrl: '',
            status: 'draft',
            meta,
        },
        {
            id: `${baseId}-insight`,
            role: 'insight',
            text: insightText,
            imagePrompt: `Illustrate the core insight: ${insightText}`,
            variationPrompt: `Illustrate the core insight: ${insightText}`,
            imageUrl: '',
            status: 'draft',
            meta,
        },
        {
            id: `${baseId}-cta`,
            role: 'cta',
            text: post.cta,
            imagePrompt: `Call-to-action visual: ${post.cta}`,
            variationPrompt: `Call-to-action visual: ${post.cta}`,
            imageUrl: '',
            status: 'draft',
            meta,
        },
    ];
}

// Convenience: existing callers can be migrated gradually
export function createSlidesFromPost(
    post: MomPost,
    composition: 'single' | 'slideshow' = 'slideshow'
): Slide[] {
    return composition === 'single'
        ? [createSingleSlideFromPost(post)]
        : createSlideshowFromPost(post);
}
```

Now everything that wants slides must explicitly choose `composition`. No more “always 4 slides” surprises.

---

## 2. Batch Generator: Compact UI + Single vs Slideshow

### 2.1 Compact / expanded idea cards + dual actions

**`src/web/components/studio/Batch/BatchGenerator.tsx`**

Add local state for expanded idea:

```ts
const [expandedId, setExpandedId] = useState<string | null>(null);
```

Replace `handleUseIdea` with a composition-aware helper:

```ts
const useIdea = (post: RatedMomPost, composition: 'single' | 'slideshow') => {
    const slides =
        composition === 'single'
            ? [createSingleSlideFromPost(post)]
            : createSlideshowFromPost(post);

    dispatch({ type: 'SET_MODE', payload: 'infographic' });
    dispatch({ type: 'SET_COMPOSITION', payload: composition });          // 🔥
    dispatch({ type: 'SET_TOPIC', payload: topic });
    dispatch({ type: 'SET_AUDIENCE', payload: audience });
    dispatch({ type: 'SET_SLIDES', payload: slides });
    dispatch({ type: 'SET_SELECTED_SLIDE', payload: slides[0]?.id ?? null });
    dispatch({ type: 'SET_PREVIEW_MODE', payload: 'prompt' });

    navigate('/studio/editor');
};
```

Then in the idea list, switch to compact+expand and dual action buttons:

```tsx
{ideas.map((idea, idx) => {
    const id = idea.id || String(idx);
    const isExpanded = expandedId === id;

    return (
        <div
            key={id}
            className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3"
        >
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Idea {idx + 1}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setExpandedId(isExpanded ? null : id)}
                        className="text-xs text-gray-400 hover:text-gray-200"
                    >
                        {isExpanded ? 'Collapse' : 'Details'}
                    </button>
                </div>
            </div>

            {/* Compact content (always visible) */}
            <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-400">Hook</p>
                <p className="text-white line-clamp-3">{idea.hook}</p>
            </div>

            {/* Rating row (always visible) */}
            <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                            key={star}
                            onClick={() => handleRate(id, star)}
                            className={`w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-xs ${
                                (idea.rating || 0) >= star
                                    ? 'bg-yellow-400 text-black border-yellow-400'
                                    : 'bg-gray-800 text-gray-400'
                            }`}
                        >
                            {star}
                        </button>
                    ))}
                </div>
                <span className="text-xs text-gray-500">
                    {idea.rating ? `Rated ${idea.rating}/5` : 'Not rated'}
                </span>
            </div>

            {/* Expanded body */}
            {isExpanded && (
                <div className="space-y-3 pt-3 border-t border-gray-800 mt-3">
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-400">Caption</p>
                        <p className="text-gray-200 whitespace-pre-line text-sm">
                            {idea.caption}
                        </p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-400">CTA</p>
                        <p className="text-white text-sm">{idea.cta}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-sm font-semibold text-gray-400">Image Prompt</p>
                        <p className="text-xs text-purple-200 font-mono whitespace-pre-wrap">
                            {idea.imagePrompt}
                        </p>
                    </div>

                    {/* 🔥 Explicit creation options */}
                    <div className="flex flex-wrap gap-2 pt-2">
                        <button
                            onClick={() => useIdea(idea, 'single')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
                        >
                            Create Single Image
                        </button>
                        <button
                            onClick={() => useIdea(idea, 'slideshow')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-500 text-purple-300 hover:bg-purple-500/10"
                        >
                            Create Slideshow
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
})}
```

Now:

* Default = compact list of hooks + ratings.
* One click to expand details.
* Two explicit actions: single image vs slideshow → sets `composition` and creates correct slides.

---

## 3. Editor Header: Clear Mode & Slide Indicator

**`src/web/components/studio/Editor/StudioEditor.tsx`**

At top of component, derive current mode:

```tsx
const { state } = useStudio();
const { slides, selectedSlideId, composition } = state;

const isSlideshow = composition === 'slideshow' || slides.length > 1;
const activeIndex = slides.findIndex((s) => s.id === selectedSlideId);
const displayIndex = activeIndex >= 0 ? activeIndex + 1 : 1;
```

Right after the error banners, inject a header:

```tsx
return (
    <div className="h-[calc(100vh-73px)] bg-gray-950 overflow-hidden flex flex-col">
        {isRunLoading && (
            <div className="bg-blue-500/10 border-b border-blue-500/30 text-blue-200 text-sm px-4 py-2">
                Loading run data…
            </div>
        )}
        {runLoadError && (
            <div className="bg-red-500/10 border-b border-red-500/30 text-red-200 text-sm px-4 py-2">
                Failed to load run "{runId}": {runLoadError}. Try returning to the dashboard.
            </div>
        )}

        {/* 🔥 Mode banner */}
        <div className="border-b border-gray-800 px-4 py-2 flex items-center justify-between bg-gray-950/95">
            <div className="flex items-center gap-2">
                <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        isSlideshow
                            ? 'bg-purple-900/60 text-purple-200 border border-purple-500/40'
                            : 'bg-emerald-900/60 text-emerald-200 border border-emerald-500/40'
                    }`}
                >
                    {isSlideshow ? 'Slideshow' : 'Single Image'}
                </span>
                {isSlideshow && (
                    <span className="text-xs text-gray-400">
                        Editing slide {displayIndex} of {slides.length}
                    </span>
                )}
            </div>
            <div className="text-xs text-gray-500">
                Topic: <span className="text-gray-200">{state.topic || '—'}</span>
            </div>
        </div>

        <div className="grid grid-cols-12 flex-1 bg-gray-950 overflow-hidden min-h-0">
            {/* unchanged panels */}
        </div>
    </div>
);
```

Now you always see at a glance:

* Single vs slideshow
* Slide position inside slideshow.

---

## 4. Prompt View: Mode-Aware Prompts

**Problem:** Prompt view blindly maps over all slides, treating every run as slideshow.

**Fix:** Use `composition` and show:

* One card for single image mode.
* One labeled card per slide for slideshow.

**`src/web/components/studio/Editor/PromptModeView.tsx`**

Updated component:

```tsx
import { FileText, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudio } from '@/lib/studio/store';

export function PromptModeView() {
    const { state } = useStudio();
    const { slides, selectedSlideId, composition } = state;

    if (slides.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-950 text-gray-400">
                <div className="text-center space-y-2">
                    <FileText className="w-12 h-12 mx-auto opacity-60" />
                    <p className="text-sm font-medium">No prompts generated yet</p>
                    <p className="text-xs text-gray-500">
                        Click "Generate Content Draft" to create prompts
                    </p>
                </div>
            </div>
        );
    }

    const summaryMeta = slides[0]?.meta;
    const isSlideshow = composition === 'slideshow' || slides.length > 1;
    const selectedSlide =
        slides.find((s) => s.id === selectedSlideId) ?? slides[0];

    return (
        <div className="h-full overflow-y-auto bg-gray-950 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        {isSlideshow ? 'Slideshow Prompts' : 'Post Prompts'}
                    </h2>
                    <p className="text-sm text-gray-400">
                        {isSlideshow
                            ? `Slideshow mode · ${slides.length} slides`
                            : 'Single image mode'}
                    </p>
                </div>
            </div>

            {summaryMeta && (
                <div className="grid gap-4 md:grid-cols-2 mb-2">
                    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Overlay Title</p>
                        <p className="text-base text-white">{summaryMeta.overlayTitle || '—'}</p>

                        <p className="text-xs font-semibold text-gray-500 uppercase mt-4">
                            Overlay Subtitle
                        </p>
                        <p className="text-sm text-gray-300">
                            {summaryMeta.overlaySubtitle || '—'}
                        </p>

                        <p className="text-xs font-semibold text-gray-500 uppercase mt-4">Hook</p>
                        <p className="text-sm text-gray-200">{summaryMeta.hook || '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Caption</p>
                        <p className="text-sm text-gray-200 whitespace-pre-line">
                            {summaryMeta.caption || '—'}
                        </p>

                        <p className="text-xs font-semibold text-gray-500 uppercase mt-4">
                            Call to Action
                        </p>
                        <p className="text-sm text-gray-100">{summaryMeta.cta || '—'}</p>

                        <p className="text-xs font-semibold text-gray-500 uppercase mt-4">
                            Safety Footer
                        </p>
                        <p className="text-xs text-gray-400">
                            {summaryMeta.safetyFooter || '—'}
                        </p>
                    </div>
                </div>
            )}

            {/* Single image vs slideshow layout */}
            {!isSlideshow ? (
                // 🔥 Single card for single-image mode
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            Single Image
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div
                            className="relative rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-gray-800 overflow-hidden"
                            style={{ aspectRatio: '4 / 5' }}
                        >
                            {selectedSlide.imageUrl ? (
                                <img
                                    src={selectedSlide.imageUrl}
                                    alt={selectedSlide.text}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <ImageIcon className="w-10 h-10 text-slate-600" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                Text Prompt
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-sm text-gray-100 leading-relaxed">
                                {selectedSlide.text || 'No text prompt provided.'}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Image Prompt
                            </div>
                            <div className="bg-purple-950/40 border border-purple-900 rounded-lg p-3 text-xs text-purple-100 font-mono leading-relaxed">
                                {selectedSlide.imagePrompt ||
                                    selectedSlide.meta?.imagePrompt ||
                                    selectedSlide.variationPrompt ||
                                    selectedSlide.text ||
                                    'No image prompt.'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                // 🔥 One card per slide with clear labels
                <div className="grid gap-4 md:grid-cols-2">
                    {slides.map((slide, index) => {
                        const imagePrompt =
                            slide.imagePrompt ||
                            slide.meta?.imagePrompt ||
                            slide.variationPrompt ||
                            slide.text ||
                            'No image prompt.';

                        return (
                            <Card key={slide.id} className="bg-gray-900 border-gray-800">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                                        <span className="inline-flex h-2 w-2 rounded-full bg-purple-400" />
                                        {`Slide ${index + 1} of ${slides.length}: ${slide.role}`}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div
                                        className="relative rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-gray-800 overflow-hidden"
                                        style={{ aspectRatio: '4 / 5' }}
                                    >
                                        {slide.imageUrl ? (
                                            <img
                                                src={slide.imageUrl}
                                                alt={slide.text}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <ImageIcon className="w-10 h-10 text-slate-600" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5" />
                                            Text Prompt
                                        </div>
                                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-sm text-gray-100 leading-relaxed">
                                            {slide.text || 'No text prompt provided.'}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            Image Prompt
                                        </div>
                                        <div className="bg-purple-950/40 border border-purple-900 rounded-lg p-3 text-xs text-purple-100 font-mono leading-relaxed">
                                            {imagePrompt}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
```

Now:

* Single mode: just one prompt card, no “hook/empathy/cta” spam.
* Slideshow: clearly labeled “Slide X of Y: role”.

---

## 5. Slideshow Strip: Labeled, Draggable, Reorderable

### 5.1 Reorder action already added (`REORDER_SLIDES`)

Now wire HTML5 drag & drop + draggable container.

**`src/web/components/studio/Editor/PreviewPanel.tsx`**

At top of component:

```ts
const { state, dispatch } = useStudio();
const { slides, selectedSlideId, editMode, previewMode, composition } = state;

const isSlideshow = composition === 'slideshow' || slides.length > 1;

// Drag state for storyboard container
const [stripPosition, setStripPosition] = useState<{ x: number; y: number }>({ x: 24, y: 24 });
const [draggingStrip, setDraggingStrip] = useState(false);
const stripRef = useRef<HTMLDivElement | null>(null);

// Drag state for slide reordering
const dragIndexRef = useRef<number | null>(null);
```

Add drag handlers (inside component):

```ts
// storyboard container drag
const handleStripMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setDraggingStrip(true);
    const rect = stripRef.current?.getBoundingClientRect();
    if (!rect) return;
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const handleMove = (ev: MouseEvent) => {
        setStripPosition({
            x: ev.clientX - offsetX,
            y: ev.clientY - offsetY,
        });
    };

    const handleUp = () => {
        setDraggingStrip(false);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
};

// slide drag & drop
const handleSlideDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndexRef.current = index;
    e.dataTransfer?.setData('text/plain', String(index));
};

const handleSlideDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
};

const handleSlideDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndexRef.current;
    if (from == null || from === index) return;
    dispatch({ type: 'REORDER_SLIDES', payload: { fromIndex: from, toIndex: index } });
    dragIndexRef.current = null;
};
```

Then replace the storyboard strip at the bottom with a labeled, draggable overlay that’s visible in all preview modes when in slideshow:

```tsx
{/* Storyboard Strip - 🔥 now tied to slideshow, not previewMode */}
{isSlideshow && slides.length > 1 && (
    <div
        ref={stripRef}
        className="fixed z-40 bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        style={{
            left: stripPosition.x,
            top: stripPosition.y,
            width: 420,
        }}
    >
        {/* Header bar (drag handle) */}
        <div
            className="flex items-center justify-between px-3 py-2 border-b border-gray-800 cursor-move select-none"
            onMouseDown={handleStripMouseDown}
        >
            <span className="text-xs font-semibold text-gray-200">
                Slideshow · {slides.length} slides
            </span>
            <span className="text-[10px] text-gray-500">
                Drag to reposition · Drag thumbnails to reorder
            </span>
        </div>

        {/* Slides row */}
        <div className="flex items-center px-3 py-2 gap-3 overflow-x-auto">
            {slides.map((slide, index) => (
                <button
                    key={slide.id}
                    onClick={() =>
                        dispatch({ type: 'SET_SELECTED_SLIDE', payload: slide.id })
                    }
                    draggable
                    onDragStart={handleSlideDragStart(index)}
                    onDragOver={handleSlideDragOver(index)}
                    onDrop={handleSlideDrop(index)}
                    className={`flex-shrink-0 w-16 aspect-[4/5] rounded-lg border-2 transition-all overflow-hidden relative ${
                        selectedSlideId === slide.id
                            ? 'border-purple-500 ring-2 ring-purple-500/20'
                            : 'border-gray-700 hover:border-gray-500'
                    }`}
                >
                    <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                        <span className="text-xs text-gray-400 font-medium">
                            {index + 1}
                        </span>
                    </div>
                    {slide.imageUrl && (
                        <img
                            src={slide.imageUrl}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    )}
                </button>
            ))}

            {/* Add slide button (stub for later) */}
            <button className="flex-shrink-0 w-16 aspect-[4/5] rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-500 flex items-center justify-center text-gray-500 hover:text-gray-300 transition-colors">
                <span className="text-xl">+</span>
            </button>
        </div>
    </div>
)}
```

Key changes:

* Appears whenever `composition === 'slideshow'` or `slides.length > 1`.
* Has a “Slideshow” label and hint text.
* Can be dragged to any corner.
* Thumbnails support drag-drop reordering via `REORDER_SLIDES`.

---

## 6. Template System: Save / Apply Layout & Style

You now have the right place in state to hang templates. Here’s a clean minimal implementation.

### 6.1 Template utilities

**`src/web/lib/studio/templateUtils.ts`**

```ts
import { Slide, SlideTemplate } from './types';

export function createTemplateFromSlide(slide: Slide, name: string): SlideTemplate {
    return {
        id: `tpl-${Date.now()}`,
        name,
        description: `Template from slide "${slide.id}"`,
        imagePromptBase: slide.imagePrompt || slide.meta?.imagePrompt,
        backgroundStyle: slide.meta?.backgroundStyle, // if you add this later
        textBoxDefaults: slide.textBox ? { ...slide.textBox } : undefined,
    };
}

export function applyTemplateToSlide(slide: Slide, template: SlideTemplate): Slide {
    return {
        ...slide,
        imagePrompt: template.imagePromptBase || slide.imagePrompt,
        textBox: template.textBoxDefaults
            ? { ...template.textBoxDefaults }
            : slide.textBox,
        meta: {
            ...slide.meta,
            imagePrompt: template.imagePromptBase || slide.meta?.imagePrompt,
        },
    };
}

export function applyTemplateToAllSlides(
    slides: Slide[],
    template: SlideTemplate
): Slide[] {
    return slides.map((s) => applyTemplateToSlide(s, template));
}
```

### 6.2 Template panel UI (skeleton)

**`src/web/components/studio/Editor/TemplatePanel.tsx`**

```tsx
import { useStudio } from '@/lib/studio/store';
import { createTemplateFromSlide, applyTemplateToAllSlides } from '@/lib/studio/templateUtils';
import { Sparkles, LayoutTemplate } from 'lucide-react';

export function TemplatePanel() {
    const { state, dispatch } = useStudio();
    const { slides, selectedSlideId, templates, activeTemplateId } = state;

    const selectedSlide =
        slides.find((s) => s.id === selectedSlideId) ?? slides[0];

    const handleSaveTemplate = () => {
        if (!selectedSlide) return;
        const name = prompt('Template name?');
        if (!name) return;

        const tpl = createTemplateFromSlide(selectedSlide, name);
        dispatch({ type: 'ADD_TEMPLATE', payload: tpl });
        dispatch({ type: 'SET_ACTIVE_TEMPLATE', payload: tpl.id });
    };

    const handleApplyToAll = (templateId: string) => {
        const tpl = templates.find((t) => t.id === templateId);
        if (!tpl) return;
        const updatedSlides = applyTemplateToAllSlides(slides, tpl);
        dispatch({ type: 'SET_SLIDES', payload: updatedSlides });
    };

    return (
        <div className="border-t border-gray-800 pt-4 mt-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <LayoutTemplate className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-semibold text-gray-300 uppercase">
                        Scene Templates
                    </span>
                </div>
                <button
                    onClick={handleSaveTemplate}
                    disabled={!selectedSlide}
                    className="inline-flex items-center gap-1 text-xs text-purple-300 hover:text-purple-100"
                >
                    <Sparkles className="w-3 h-3" />
                    Save from current slide
                </button>
            </div>

            {templates.length === 0 ? (
                <p className="text-xs text-gray-500">
                    No templates yet. Save your favorite layout from the current slide.
                </p>
            ) : (
                <div className="space-y-2">
                    {templates.map((tpl) => (
                        <button
                            key={tpl.id}
                            onClick={() => {
                                dispatch({ type: 'SET_ACTIVE_TEMPLATE', payload: tpl.id });
                                handleApplyToAll(tpl.id);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs ${
                                activeTemplateId === tpl.id
                                    ? 'bg-purple-900/50 text-purple-100 border border-purple-500/40'
                                    : 'bg-gray-900 text-gray-200 border border-gray-800 hover:border-gray-600'
                            }`}
                        >
                            <span>{tpl.name}</span>
                            <span className="text-[10px] text-gray-400">
                                Apply to all
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
```

You can embed this `TemplatePanel` at the bottom of the existing `StylePanel`, so templates are visually grouped with typography + colors.

---

## 7. Wire composition into all entry points

To fully close the loop, make sure every way of entering the editor sets `composition`:

1. **Batch generator** – already done (`useIdea(idea, 'single' | 'slideshow')`).

2. **BriefPanel generate handler** – use current `state.composition`:

   ```ts
   const { state, dispatch } = useStudio();
   // ...
   if (posts && posts.length > 0) {
       const slides =
           state.composition === 'single'
               ? [createSingleSlideFromPost(posts[0])]
               : createSlideshowFromPost(posts[0]);

       dispatch({ type: 'SET_SLIDES', payload: slides });
       dispatch({ type: 'SET_SELECTED_SLIDE', payload: slides[0]?.id ?? null });
       dispatch({ type: 'SET_PREVIEW_MODE', payload: 'prompt' });
   }
   ```

3. **Dashboard open-run handler** – infer composition from run:

   ```ts
   const isSlideshowRun = run.posts.length > 1;
   dispatch({ type: 'SET_COMPOSITION', payload: isSlideshowRun ? 'slideshow' : 'single' });
   ```

Once **all** entry points:

* Set `composition` correctly, and
* Create slides with `createSingleSlideFromPost` / `createSlideshowFromPost`,

the weird “multi-card prompt view”, “always 4 slides”, and “mystery slideshow strip” behaviors collapse into one consistent model.

---

## TL;DR – What’s actually wrong, conceptually?

All your problems trace back to one design issue:

> You never explicitly model “this editor session is single vs slideshow”, and you never centralize slide construction.

Because of that:

* Slide creation always defaults to a 4-part slideshow.
* UI components infer state from local heuristics (`slides.length`, `previewMode`) instead of reading a clear `composition` flag.
* There is no stable hook for templates to latch onto.

By:

1. Adding `composition: 'single' | 'slideshow'` to `StudioState`,
2. Splitting `createSingleSlideFromPost` vs `createSlideshowFromPost`,
3. Making **every** entry point set `composition` and use the right creator, and
4. Making Prompt view + storyboard strip read `composition` instead of guessing,

you fix the root cause rather than chasing each symptom in isolation.
