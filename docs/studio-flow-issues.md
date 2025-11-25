# Studio Flow Issues - Comprehensive Analysis

**Date:** 2025-11-25  
**Location:** `http://localhost:5173/studio`

---

## Executive Summary

The Studio application has several UX/UI flow issues related to:
1. **Batch Generator** → Idea selection → Creation flow (single image vs slideshow)
2. **Prompt View** showing incorrect/duplicate prompts
3. **Editor Mode** not clearly indicating single image vs slideshow mode
4. **Slideshow/Storyboard** UI placement and drag-drop functionality
5. **Template file** creation for consistent slideshow scenes

---

## Problem 1: Batch Generator Flow & Compact View

### Current State
**File:** `src/web/components/studio/Batch/BatchGenerator.tsx`

The batch generator shows ideas in a **full expanded view** with all details visible:
- Hook
- Caption (full text)
- CTA
- Image Prompt (full mono text)
- Rating system

```tsx
// Lines 213-267: Current idea card rendering
{ideas.map((idea, idx) => (
    <div key={idea.id || idx} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3">
        <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Idea {idx + 1}
            </span>
            <button onClick={() => handleUseIdea(idea)} className="text-xs font-semibold text-blue-400 hover:text-blue-200">
                Use this idea
            </button>
        </div>
        <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-400">Hook</p>
            <p className="text-white">{idea.hook}</p>
        </div>
        <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-400">Caption</p>
            <p className="text-gray-200 whitespace-pre-line text-sm">{idea.caption}</p>
        </div>
        <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-400">CTA</p>
            <p className="text-white">{idea.cta}</p>
        </div>
        <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-400">Image Prompt</p>
            <p className="text-xs text-purple-200 font-mono">{idea.imagePrompt}</p>
        </div>
        <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-400">Rate this idea</p>
            {/* Rating stars */}
        </div>
    </div>
))}
```

### Issues
1. ❌ **No compact view** - All ideas shown fully expanded, takes too much space
2. ❌ **No expand/collapse** - Cannot toggle between compact and detailed view
3. ❌ **"Use this idea" is ambiguous** - Doesn't specify if creating single image or slideshow
4. ❌ **No creation type selection** - Should offer "Create Single Image" or "Create Slideshow"

### Expected Behavior
- **Compact view by default**: Show only hook + rating + expand button
- **Expandable cards**: Click to see full details
- **Two action buttons per idea**:
  - "Create Single Image" → Goes to editor in single-image mode
  - "Create Slideshow" → Goes to editor in slideshow mode

---

## Problem 2: Slideshow UI & Drag-Drop

### Current State
**File:** `src/web/components/studio/Editor/PreviewPanel.tsx`

The slideshow/storyboard strip is at the **bottom** of the preview panel:

```tsx
// Lines 574-599: Storyboard Strip
{previewMode === 'image' && slides.length > 1 && (
    <div className="h-32 bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-4 overflow-x-auto">
        {slides.map((slide, index) => (
            <button
                key={slide.id}
                onClick={() => dispatch({ type: 'SET_SELECTED_SLIDE', payload: slide.id })}
                className={`flex-shrink-0 w-20 aspect-[4/5] rounded-lg border-2 transition-all overflow-hidden relative ${
                    selectedSlideId === slide.id
                        ? 'border-purple-500 ring-2 ring-purple-500/20'
                        : 'border-gray-700 hover:border-gray-600'
                }`}
            >
                {/* Slide thumbnail */}
            </button>
        ))}
    </div>
)}
```

### Issues
1. ❌ **Fixed position** - Cannot be moved/dragged around the screen
2. ❌ **Not labeled as "Slideshow"** - No clear indication this is slideshow mode
3. ❌ **No drag-drop reordering** - Cannot reorder slides
4. ❌ **Only shows when `previewMode === 'image'`** - Should show for all modes when in slideshow

### Expected Behavior
- **Labeled component**: Clear "Slideshow" header
- **Draggable container**: Can be repositioned anywhere on screen
- **Drag-drop reordering**: Slides can be reordered within the strip
- **Always visible in slideshow mode**: Regardless of preview mode

---

## Problem 3: Template Files for Slideshows

### Current State
**No template file system exists**

### Issues
1. ❌ **No template creation** - Cannot save a slide as a template
2. ❌ **No template application** - Cannot apply template to all slides
3. ❌ **No consistent styling** - Each slide can have different visual styles

### Expected Behavior
- **"Save as Template" button** on individual slides
- **Template library** showing saved templates
- **"Apply Template to All"** button to ensure visual consistency
- **Template includes**:
  - Text styling (font, size, color, position)
  - Background style/color
  - Image prompt base structure
  - Layout configuration

### Files That Would Need Changes
- New file: `src/web/lib/studio/templateUtils.ts`
- New file: `src/web/components/studio/Editor/TemplatePanel.tsx`
- Update: `src/web/lib/studio/types.ts` (add Template interface)
- Update: `src/web/lib/studio/store.tsx` (add template state)

---

## Problem 4: Prompt View Showing Multiple/Wrong Prompts

### Current State
**File:** `src/web/components/studio/Editor/PromptModeView.tsx`

The prompt view shows **ALL slides** with their individual prompts:

```tsx
// Lines 55-107: Rendering all slides
<div className="grid gap-4 md:grid-cols-2">
    {slides.map((slide) => {
        const imagePrompt =
            slide.imagePrompt || slide.meta?.imagePrompt || slide.variationPrompt || slide.text || 'No image prompt.';

        return (
            <Card key={slide.id} className="bg-gray-900 border-gray-800">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-purple-400" />
                        {slide.role}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Shows image preview */}
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
```

### Issues
1. ❌ **Shows ALL slides** - For slideshow with 4 slides, shows 4 separate cards
2. ❌ **Confusing for single image** - Shows multiple cards even for single image mode
3. ❌ **No context** - Doesn't indicate if this is single image or slideshow
4. ❌ **Duplicate metadata** - Shows overlay title, subtitle, hook, caption, CTA, safety footer PLUS individual slide prompts

### User Report
> "In the prompt views I see multiple cards: hook, empathy, insight, cta - each with text and image prompts"

### Expected Behavior

#### For Single Image Mode:
- Show **ONE card only** with:
  - The selected/active image prompt
  - The text overlay prompt
  - No role labels (hook/empathy/insight/cta)

#### For Slideshow Mode:
- Show **ONE card per slide** but clearly labeled:
  - "Slide 1 of 4: Hook"
  - "Slide 2 of 4: Empathy"
  - etc.
- Each card shows only that slide's specific prompt
- Clear indication: "Slideshow Mode - 4 Slides"

---

## Problem 5: Editor Mode Clarity (Single vs Slideshow)

### Current State
**File:** `src/web/components/studio/Editor/StudioEditor.tsx`

The editor doesn't show any indication of mode:

```tsx
// Lines 79-113: Editor layout - no mode indicator
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
        <div className="grid grid-cols-12 flex-1 bg-gray-950 overflow-hidden min-h-0">
            {/* Left Panel: Brief & Settings */}
            <div className="col-span-3 h-full min-h-0 border-r border-gray-800">
                <BriefPanel />
            </div>

            {/* Center Panel: Preview & Editor */}
            <div className="col-span-6 h-full min-h-0">
                <PreviewPanel
                    onCanvasReady={setFabricCanvas}
                    onTextSelected={setSelectedText}
                />
            </div>

            {/* Right Panel: Visual Style */}
            <div className="col-span-3 h-full min-h-0 border-l border-gray-800">
                <StylePanel
                    fabricCanvas={fabricCanvas}
                    selectedText={selectedText}
                />
            </div>
        </div>
    </div>
);
```

### Issues
1. ❌ **No mode indicator** - Can't tell if editing single image or slideshow
2. ❌ **No slide counter** - In slideshow mode, no "Slide 2 of 4" indicator
3. ❌ **Ambiguous state** - User doesn't know what they're creating

### Expected Behavior
- **Mode badge** at top: "Single Image" or "Slideshow (4 slides)"
- **Slide indicator** when in slideshow: "Editing Slide 2 of 4"
- **Visual distinction** between modes (different header color, icon, etc.)

---

## Problem 6: Slide Creation Logic

### Current State
**File:** `src/web/lib/studio/slideUtils.ts`

The `createSlidesFromPost` function **always creates 4 slides**:

```tsx
export function createSlidesFromPost(post: MomPost): Slide[] {
    const baseId = post.id || 'slide';
    const captionSentences = post.caption.split('.').map((s) => s.trim()).filter(Boolean);
    const empathyText = captionSentences.length ? `${captionSentences[0]}.` : post.caption;
    const insightText = post.caption;

    const baseMeta = {
        overlayTitle: post.overlayTitle,
        overlaySubtitle: post.overlaySubtitle,
        hook: post.hook,
        caption: post.caption,
        cta: post.cta,
        safetyFooter: post.safetyFooter,
        imagePrompt: post.imagePrompt,
    };

    return [
        {
            id: `${baseId}-hook`,
            role: 'hook',
            text: post.hook,
            imagePrompt: post.imagePrompt || `Visual representation of "${post.hook}"`,
            variationPrompt: post.imagePrompt || '',
            imageUrl: '',
            status: 'draft',
            meta: baseMeta,
        },
        {
            id: `${baseId}-empathy`,
            role: 'empathy',
            text: empathyText,
            imagePrompt: `Empathetic scene illustrating "${empathyText.replace(/\.$/, '')}"`,
            variationPrompt: `Empathetic scene illustrating "${empathyText.replace(/\.$/, '')}"`,
            imageUrl: '',
            status: 'draft',
            meta: baseMeta,
        },
        {
            id: `${baseId}-insight`,
            role: 'insight',
            text: insightText,
            imagePrompt: `Illustrate the core insight: ${insightText}`,
            variationPrompt: `Illustrate the core insight: ${insightText}`,
            imageUrl: '',
            status: 'draft',
            meta: baseMeta,
        },
        {
            id: `${baseId}-cta`,
            role: 'cta',
            text: post.cta,
            imagePrompt: `Call-to-action visual: ${post.cta}`,
            variationPrompt: `Call-to-action visual: ${post.cta}`,
            imageUrl: '',
            status: 'draft',
            meta: baseMeta,
        },
    ];
}
```

### Issues
1. ❌ **Always creates slideshow** - Even when user wants single image
2. ❌ **No single-image mode** - Cannot create just one slide
3. ❌ **Called from batch generator** without mode context

### Expected Behavior
- **Two functions**:
  - `createSingleSlideFromPost(post: MomPost): Slide` - Creates ONE slide
  - `createSlideshowFromPost(post: MomPost): Slide[]` - Creates 4 slides
- **Mode-aware creation** based on user selection

---

## Problem 7: State Management - Mode Tracking

### Current State
**File:** `src/web/lib/studio/store.tsx`

The store has a `mode` field but it's not properly used:

```tsx
export interface StudioState {
    mode: PostType; // 'infographic' | 'carousel' | 'batch'
    topic: string;
    audience: string;
    llmModel: string;
    imageModel: string;
    slides: Slide[];
    selectedSlideId: string | null;
    sceneTemplateId: string | null;
    isGenerating: boolean;
    view: 'dashboard' | 'editor' | 'batch';
    editMode: 'text' | 'image';
    previewMode: PreviewMode;
}
```

### Issues
1. ❌ **`mode` not checked in editor** - Editor doesn't use `state.mode` to determine behavior
2. ❌ **Confusing naming** - `mode`, `editMode`, `previewMode` are all different things
3. ❌ **No slideshow vs single distinction** - `carousel` mode exists but not used properly

### Expected Behavior
- Rename `mode` to `postType` for clarity
- Add `isSlideshow: boolean` computed from `slides.length > 1`
- Components check `state.postType` to determine UI behavior

---

## Files Involved - Complete List

### Core Files
1. **`src/web/App.tsx`** - Routing setup
2. **`src/web/pages/StudioPage.tsx`** - Studio layout wrapper

### Dashboard & Navigation
3. **`src/web/components/studio/Dashboard.tsx`** - Main dashboard with "Create New" buttons

### Batch Generator
4. **`src/web/components/studio/Batch/BatchGenerator.tsx`** - Batch idea generation UI

### Editor Components
5. **`src/web/components/studio/Editor/StudioEditor.tsx`** - Main editor container
6. **`src/web/components/studio/Editor/BriefPanel.tsx`** - Left panel (topic, audience, generate)
7. **`src/web/components/studio/Editor/PreviewPanel.tsx`** - Center panel (canvas, storyboard)
8. **`src/web/components/studio/Editor/PromptModeView.tsx`** - Prompt display view
9. **`src/web/components/studio/Editor/StylePanel.tsx`** - Right panel (styling controls)

### State & Logic
10. **`src/web/lib/studio/store.tsx`** - Global state management
11. **`src/web/lib/studio/types.ts`** - TypeScript interfaces
12. **`src/web/lib/studio/slideUtils.ts`** - Slide creation logic
13. **`src/web/lib/studio/runLoader.ts`** - Load saved runs

---

## Recommended Implementation Order

### Phase 1: Mode Clarity (High Priority)
1. Add mode indicator to `StudioEditor.tsx`
2. Update `PromptModeView.tsx` to show context-aware prompts
3. Add slide counter for slideshow mode

### Phase 2: Batch Generator UX (High Priority)
4. Implement compact/expanded view toggle in `BatchGenerator.tsx`
5. Add "Create Single Image" and "Create Slideshow" buttons
6. Update `handleUseIdea` to accept mode parameter

### Phase 3: Slideshow Improvements (Medium Priority)
7. Make storyboard strip draggable
8. Add "Slideshow" label
9. Implement drag-drop reordering

### Phase 4: Template System (Low Priority)
10. Create template data structure
11. Build template save/load UI
12. Implement "Apply to All" functionality

### Phase 5: Slide Creation Logic (Critical)
13. Split `createSlidesFromPost` into two functions
14. Update all callers to use correct function based on mode
15. Ensure state properly tracks single vs slideshow

---

## Code Snippets - Current Problematic Behavior

### Batch Generator - "Use Idea" Handler
```tsx
// File: src/web/components/studio/Batch/BatchGenerator.tsx
// Lines 74-82

const handleUseIdea = (post: RatedMomPost) => {
    const slides = createSlidesFromPost(post); // ❌ Always creates 4 slides
    dispatch({ type: 'SET_TOPIC', payload: topic });
    dispatch({ type: 'SET_AUDIENCE', payload: audience });
    dispatch({ type: 'SET_SLIDES', payload: slides });
    dispatch({ type: 'SET_SELECTED_SLIDE', payload: slides[0]?.id ?? null });
    dispatch({ type: 'SET_PREVIEW_MODE', payload: 'prompt' });
    navigate('/studio/editor');
};
```

### Brief Panel - Generate Handler
```tsx
// File: src/web/components/studio/Editor/BriefPanel.tsx
// Lines 33-40

if (posts && posts.length > 0) {
    const slides = createSlidesFromPost(posts[0]); // ❌ Always creates 4 slides
    dispatch({ type: 'SET_SLIDES', payload: slides });
    dispatch({ type: 'SET_SELECTED_SLIDE', payload: slides[0]?.id ?? null });
    dispatch({ type: 'SET_PREVIEW_MODE', payload: 'prompt' });
}
```

### Dashboard - Open Run Handler
```tsx
// File: src/web/components/studio/Dashboard.tsx
// Lines 47-67

// Convert run posts to slides
const slides = run.posts.map((post: any, index: number) => ({
    id: post.momPost?.id || `slide-${index}`,
    role: index === 0 ? 'hook' : index === run.posts.length - 1 ? 'cta' : 'insight',
    text: post.momPost?.caption || post.momPost?.hook || '',
    variationPrompt: post.momPost?.imagePrompt || '',
    imagePrompt: post.momPost?.imagePrompt || '',
    meta: post.momPost ? { /* ... */ } : undefined,
    imageUrl: post.rawImageUrl ? `http://localhost:3000${post.rawImageUrl}` : '',
    status: 'draft' as const
}));

// ❌ No mode tracking - doesn't set whether this is single or slideshow
dispatch({ type: 'SET_MODE', payload: 'infographic' }); // Always infographic
```

---

## Summary of All Issues

| # | Issue | Severity | File(s) Affected |
|---|-------|----------|------------------|
| 1 | Batch generator lacks compact view | High | `BatchGenerator.tsx` |
| 2 | No expand/collapse for ideas | High | `BatchGenerator.tsx` |
| 3 | "Use idea" doesn't specify single vs slideshow | Critical | `BatchGenerator.tsx` |
| 4 | Slideshow strip not draggable | Medium | `PreviewPanel.tsx` |
| 5 | Slideshow strip not labeled | Medium | `PreviewPanel.tsx` |
| 6 | No template creation system | Low | N/A (new feature) |
| 7 | Prompt view shows all slides always | Critical | `PromptModeView.tsx` |
| 8 | Prompt view doesn't indicate mode | High | `PromptModeView.tsx` |
| 9 | Editor has no mode indicator | High | `StudioEditor.tsx` |
| 10 | No slide counter in slideshow mode | Medium | `StudioEditor.tsx`, `PreviewPanel.tsx` |
| 11 | `createSlidesFromPost` always creates 4 slides | Critical | `slideUtils.ts` |
| 12 | State doesn't properly track single vs slideshow | Critical | `store.tsx`, all components |

---

## Next Steps

1. **Review this document** with the team
2. **Prioritize issues** based on user impact
3. **Create implementation plan** for each phase
4. **Begin with Phase 1** (Mode Clarity) as it affects all other work
5. **Test thoroughly** after each phase

---

**End of Document**
