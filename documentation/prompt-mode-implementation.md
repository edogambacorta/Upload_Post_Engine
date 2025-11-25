# Prompt Mode Implementation Plan

**Objective:** Add a "Prompt Mode" view to the editor center panel that displays all generated prompts (text + image) in card format after clicking "Generate Content Draft".

---

## Current State

The PreviewPanel currently has two view modes toggled at the top:
- **T** (Text mode)
- **Image icon** (Image mode)

These modes are displayed in the center panel of StudioEditor.

---

## Required Changes

### 1. Add Prompt Mode to State

**File:** `/src/web/lib/studio/types.ts`

Add view mode type:
```typescript
type PreviewMode = 'text' | 'image' | 'prompt';
```

**File:** `/src/web/lib/studio/store.tsx`

Add to StudioState:
```typescript
interface StudioState {
    // ... existing fields
    previewMode: 'text' | 'image' | 'prompt';  // NEW
}
```

Update initial state:
```typescript
const initialState: StudioState = {
    // ... existing fields
    previewMode: 'text'
};
```

Add reducer action:
```typescript
type StudioAction =
    | ... existing actions
    | { type: 'SET_PREVIEW_MODE'; payload: 'text' | 'image' | 'prompt' };
```

Add case to reducer:
```typescript
case 'SET_PREVIEW_MODE':
    return { ...state, previewMode: action.payload };
```

---

### 2. Update Slide Data Structure

**File:** `/src/web/lib/studio/types.ts`

Ensure Slide interface has imagePrompt field:
```typescript
interface Slide {
    id: string;
    role: 'hook' | 'empathy' | 'insight' | 'cta' | 'other';
    text: string;
    imagePrompt: string;         // NEW: Store image generation prompt
    imageUrl?: string;
    status: 'draft' | 'generating' | 'done' | 'error';
}
```

---

### 3. Update Draft Generation to Include Image Prompts

**File:** `/src/web/components/studio/Editor/BriefPanel.tsx`

Modify handleGenerate to extract and store image prompts:

```typescript
const handleGenerate = async () => {
    dispatch({ type: 'SET_GENERATING', payload: true });

    const response = await fetch('http://localhost:3000/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience, model: llmModel })
    });

    const posts: MomPost[] = await response.json();

    // Convert posts to slides WITH image prompts
    const newSlides: Slide[] = posts.flatMap((post, postIndex) => [
        {
            id: `${postIndex}-hook`,
            role: 'hook',
            text: post.hook,
            imagePrompt: post.imagePrompt || `Visual representation of: ${post.hook}`,  // NEW
            status: 'draft'
        },
        {
            id: `${postIndex}-empathy`,
            role: 'empathy',
            text: post.caption.split('.').slice(0, 2).join('.') + '.',
            imagePrompt: `Empathetic scene showing: ${post.caption.split('.')[0]}`,  // NEW
            status: 'draft'
        },
        {
            id: `${postIndex}-insight`,
            role: 'insight',
            text: post.caption,
            imagePrompt: `Illustrate the insight: ${post.caption}`,  // NEW
            status: 'draft'
        },
        {
            id: `${postIndex}-cta`,
            role: 'cta',
            text: post.cta,
            imagePrompt: `Call-to-action visual: ${post.cta}`,  // NEW
            status: 'draft'
        }
    ]);

    dispatch({ type: 'SET_SLIDES', payload: newSlides });
    dispatch({ type: 'SET_PREVIEW_MODE', payload: 'prompt' });  // NEW: Auto-switch to prompt mode
    dispatch({ type: 'SET_GENERATING', payload: false });
};
```

---

### 4. Create Prompt Mode Component

**NEW FILE:** `/src/web/components/studio/Editor/PromptModeView.tsx`

```typescript
import React from 'react';
import { useStudio } from '@/web/lib/studio/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/web/components/ui/card';
import { FileText, ImageIcon } from 'lucide-react';

export function PromptModeView() {
    const { state } = useStudio();
    const { slides } = state;

    if (slides.length === 0) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                    <FileText className="w-16 h-16 mx-auto mb-4" />
                    <p>No prompts generated yet</p>
                    <p className="text-sm">Click "Generate Content Draft" to start</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full overflow-y-auto p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold">Generated Prompts</h2>
                <p className="text-sm text-gray-600">
                    Review all text and image prompts before generating visuals
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {slides.map((slide) => (
                    <Card key={slide.id} className="hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-gray-500 uppercase flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                {slide.role}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Image Placeholder */}
                            <div
                                className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden"
                                style={{ aspectRatio: '4/5' }}
                            >
                                {slide.imageUrl ? (
                                    <img
                                        src={slide.imageUrl}
                                        alt={slide.text}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full">
                                        <ImageIcon className="w-12 h-12 text-gray-400" />
                                    </div>
                                )}
                            </div>

                            {/* Text Prompt Section */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Text Prompt</span>
                                </div>
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                    <p className="text-sm text-gray-800 leading-relaxed">
                                        {slide.text}
                                    </p>
                                </div>
                            </div>

                            {/* Image Prompt Section */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <span>Image Prompt</span>
                                </div>
                                <div className="bg-purple-50 border border-purple-100 rounded-lg p-3">
                                    <p className="text-xs text-gray-700 font-mono leading-relaxed">
                                        {slide.imagePrompt}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
```

---

### 5. Add Prompt Mode Toggle to PreviewPanel

**File:** `/src/web/components/studio/Editor/PreviewPanel.tsx`

Update the mode toggle section at the top:

```typescript
import { Type, ImageIcon, FileCode } from 'lucide-react';
import { PromptModeView } from './PromptModeView';

export function PreviewPanel() {
    const { state, dispatch } = useStudio();
    const { slides, selectedSlideId, previewMode } = state;

    const selectedSlide = slides.find(s => s.id === selectedSlideId) || slides[0];

    return (
        <div className="flex flex-col h-full bg-white rounded-lg border">
            {/* Mode Toggle Toolbar */}
            <div className="flex items-center gap-2 p-3 border-b">
                <button
                    onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', payload: 'text' })}
                    className={cn(
                        "p-2 rounded hover:bg-gray-100 transition-colors",
                        previewMode === 'text' && "bg-blue-50 text-blue-600"
                    )}
                    title="Text Mode"
                >
                    <Type className="w-5 h-5" />
                </button>

                <button
                    onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', payload: 'image' })}
                    className={cn(
                        "p-2 rounded hover:bg-gray-100 transition-colors",
                        previewMode === 'image' && "bg-blue-50 text-blue-600"
                    )}
                    title="Image Mode"
                >
                    <ImageIcon className="w-5 h-5" />
                </button>

                {/* NEW: Prompt Mode Button */}
                <button
                    onClick={() => dispatch({ type: 'SET_PREVIEW_MODE', payload: 'prompt' })}
                    className={cn(
                        "p-2 rounded hover:bg-gray-100 transition-colors",
                        previewMode === 'prompt' && "bg-blue-50 text-blue-600"
                    )}
                    title="Prompt Mode"
                >
                    <FileCode className="w-5 h-5" />
                </button>

                <div className="flex-1" />

                {/* Existing toolbar buttons */}
                <Button variant="ghost" size="sm">
                    <Download className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm">
                    <Share2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Mode-based Content */}
            <div className="flex-1 overflow-hidden">
                {previewMode === 'text' && (
                    <div className="p-6">
                        {/* Existing text mode view */}
                        <div className="prose max-w-none">
                            <h3 className="text-sm font-medium text-gray-500 uppercase mb-2">
                                {selectedSlide?.role}
                            </h3>
                            <p className="text-lg">{selectedSlide?.text}</p>
                        </div>
                    </div>
                )}

                {previewMode === 'image' && (
                    <div className="p-6">
                        {/* Existing image mode view */}
                        <div
                            className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg overflow-hidden mx-auto"
                            style={{ aspectRatio: '4/5', maxHeight: '600px' }}
                        >
                            {selectedSlide?.imageUrl ? (
                                <img
                                    src={selectedSlide.imageUrl}
                                    alt={selectedSlide.text}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <ImageIcon className="w-16 h-16 text-gray-300" />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* NEW: Prompt Mode View */}
                {previewMode === 'prompt' && <PromptModeView />}
            </div>

            {/* Carousel Storyboard (only in image mode) */}
            {mode === 'carousel' && previewMode === 'image' && slides.length > 0 && (
                <div className="border-t p-4">
                    <div className="flex gap-2 overflow-x-auto">
                        {slides.map((slide) => (
                            <button
                                key={slide.id}
                                onClick={() => dispatch({ type: 'SET_SELECTED_SLIDE', payload: slide.id })}
                                className={cn(
                                    "relative flex-shrink-0 w-20 h-24 rounded border-2 transition-colors",
                                    selectedSlideId === slide.id
                                        ? "border-blue-500"
                                        : "border-gray-200 hover:border-gray-300"
                                )}
                            >
                                {slide.imageUrl ? (
                                    <img
                                        src={slide.imageUrl}
                                        className="w-full h-full object-cover rounded"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full bg-gray-100 rounded">
                                        <ImageIcon className="w-6 h-6 text-gray-400" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
```

---

### 6. Add Missing Import

**File:** `/src/web/components/studio/Editor/PreviewPanel.tsx`

Add FileCode icon import at the top:
```typescript
import { Type, ImageIcon, FileCode, Download, Share2 } from 'lucide-react';
```

---

## User Flow After Implementation

```
1. USER ENTERS TOPIC/AUDIENCE IN BRIEF PANEL
   ↓
2. CLICKS "Generate Content Draft"
   ↓
3. BACKEND GENERATES TEXT + IMAGE PROMPTS
   ↓
4. FRONTEND CREATES SLIDES WITH BOTH PROMPTS
   ↓
5. PREVIEW PANEL AUTO-SWITCHES TO "PROMPT MODE"
   ↓
6. CENTER PANEL DISPLAYS 2x2 GRID OF CARDS
   Each card shows:
   - Slide role (HOOK/EMPATHY/INSIGHT/CTA)
   - Image placeholder (4:5 ratio)
   - Text prompt in blue box
   - Image prompt in purple box with mono font
   ↓
7. USER REVIEWS ALL PROMPTS BEFORE GENERATING VISUALS
```

---

## Visual Design

### Mode Toggle (Top of PreviewPanel)
```
┌────────────────────────────────────────────────┐
│  [T]  [📷]  [</>]  ...          [⬇]  [↗]      │
│  ───   inactive  active                        │
│  (text) (image)  (prompt)                      │
└────────────────────────────────────────────────┘
```

### Prompt Mode Grid Layout
```
┌──────────────────────────────────────────────────────────────┐
│  Generated Prompts                                           │
│  Review all text and image prompts before generating visuals │
│                                                               │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ • HOOK              │  │ • EMPATHY           │           │
│  │ ┌─────────────────┐ │  │ ┌─────────────────┐ │           │
│  │ │                 │ │  │ │                 │ │           │
│  │ │   [Image Icon]  │ │  │ │   [Image Icon]  │ │           │
│  │ │                 │ │  │ │                 │ │           │
│  │ └─────────────────┘ │  │ └─────────────────┘ │           │
│  │                     │  │                     │           │
│  │ 📄 Text Prompt     │  │ 📄 Text Prompt     │           │
│  │ ┌─────────────────┐ │  │ ┌─────────────────┐ │           │
│  │ │ "Are sleepless  │ │  │ │ "You're not    │ │           │
│  │ │  nights..."     │ │  │ │  alone..."     │ │           │
│  │ └─────────────────┘ │  │ └─────────────────┘ │           │
│  │                     │  │                     │           │
│  │ 🖼️ Image Prompt    │  │ 🖼️ Image Prompt    │           │
│  │ ┌─────────────────┐ │  │ ┌─────────────────┐ │           │
│  │ │Visual represent │ │  │ │Empathetic scene │ │           │
│  │ │ation of...      │ │  │ │showing...       │ │           │
│  │ └─────────────────┘ │  │ └─────────────────┘ │           │
│  └─────────────────────┘  └─────────────────────┘           │
│                                                               │
│  ┌─────────────────────┐  ┌─────────────────────┐           │
│  │ • INSIGHT           │  │ • CTA               │           │
│  │ ...                 │  │ ...                 │           │
│  └─────────────────────┘  └─────────────────────┘           │
└──────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

### New Files
- `/src/web/components/studio/Editor/PromptModeView.tsx` (new component)

### Modified Files
1. `/src/web/lib/studio/types.ts` - Add PreviewMode type
2. `/src/web/lib/studio/store.tsx` - Add previewMode state and action
3. `/src/web/components/studio/Editor/BriefPanel.tsx` - Update handleGenerate
4. `/src/web/components/studio/Editor/PreviewPanel.tsx` - Add prompt mode toggle and view

---

## Implementation Checklist

- [ ] Add `PreviewMode` type to types.ts
- [ ] Add `previewMode` to StudioState
- [ ] Add `imagePrompt` field to Slide interface
- [ ] Add `SET_PREVIEW_MODE` action to reducer
- [ ] Update BriefPanel.tsx to extract image prompts from API response
- [ ] Auto-switch to prompt mode after generation
- [ ] Create PromptModeView.tsx component with card grid
- [ ] Add prompt mode button (FileCode icon) to PreviewPanel toolbar
- [ ] Add conditional rendering for prompt mode in PreviewPanel
- [ ] Test: Generate content draft and verify prompt mode displays correctly
- [ ] Test: Toggle between text/image/prompt modes
- [ ] Test: Verify all prompts are visible in cards

---

## Testing Scenarios

1. **Generate Draft Flow**
   - Enter topic + audience
   - Click "Generate Content Draft"
   - Verify auto-switch to prompt mode
   - Verify all cards display with text + image prompts

2. **Mode Switching**
   - Click text mode → See text view
   - Click image mode → See image canvas
   - Click prompt mode → See prompt cards grid

3. **Empty State**
   - Navigate to editor with no slides
   - Click prompt mode
   - Verify empty state message displays

4. **Data Integrity**
   - Verify imagePrompt field populated for all slides
   - Verify prompts match LLM-generated content
   - Verify no data loss when switching modes

---

## Estimated Implementation Time

**Total: 2-3 hours**

- State updates: 30 minutes
- PromptModeView component: 1 hour
- PreviewPanel integration: 45 minutes
- Testing & refinement: 45 minutes
