# Studio Flow - Before & After

## 🔴 BEFORE: The Problem

```
User in Batch Generator
        ↓
    [Use this idea] ← Ambiguous!
        ↓
    Always creates 4 slides
        ↓
    Editor shows ???
    - No mode indicator
    - Can't tell if single or slideshow
        ↓
    Prompt View shows 4 cards
    - Even for "single image" intent
    - Confusing and cluttered
        ↓
    User confused 😕
```

### State Management (Before)
```typescript
// No explicit composition tracking
state = {
  mode: 'infographic',  // Vague
  slides: [...],        // Components guess from length
  // ❌ No way to know user's intent
}

// Slide creation
createSlidesFromPost(post)
  → Always returns 4 slides ❌
```

---

## ✅ AFTER: The Solution

```
User in Batch Generator
        ↓
    [Details ▼] ← Compact view
        ↓
    ┌─────────────────────────────┐
    │ [Create Single Image]       │ ← Explicit!
    │ [Create Slideshow]          │ ← Explicit!
    └─────────────────────────────┘
        ↓
    Sets composition mode
        ↓
    Editor shows clear indicator
    ┌──────────────────────────────┐
    │ [Single Image] Topic: ...    │
    │ or                           │
    │ [Slideshow] Slide 2 of 4     │
    └──────────────────────────────┘
        ↓
    Prompt View adapts
    - Single: 1 card
    - Slideshow: 4 labeled cards
        ↓
    User confident ✅
```

### State Management (After)
```typescript
// Explicit composition tracking
state = {
  mode: 'infographic',
  composition: 'single' | 'slideshow',  // ✅ Clear intent
  slides: [...],
  templates: [...],
  activeTemplateId: null,
}

// Slide creation
createSingleSlideFromPost(post)
  → Returns 1 slide ✅

createSlideshowFromPost(post)
  → Returns 4 slides ✅
```

---

## 📊 Component Interaction Flow

### Entry Points → State → UI

```
┌─────────────────────────────────────────────────────────────┐
│                      ENTRY POINTS                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Batch Generator                                             │
│  ├─ "Create Single Image"                                    │
│  │   → dispatch({ type: 'SET_COMPOSITION', payload: 'single' })│
│  └─ "Create Slideshow"                                       │
│      → dispatch({ type: 'SET_COMPOSITION', payload: 'slideshow' })│
│                                                              │
│  Dashboard (Load Run)                                        │
│  └─ Infer from run.posts.length                             │
│      → dispatch({ type: 'SET_COMPOSITION', ... })            │
│                                                              │
│  BriefPanel (Generate)                                       │
│  └─ Respects current state.composition                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    GLOBAL STATE                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  StudioState {                                               │
│    composition: 'single' | 'slideshow',  ← Single source    │
│    slides: Slide[],                                          │
│    selectedSlideId: string | null,                           │
│    templates: SlideTemplate[],                               │
│    ...                                                       │
│  }                                                           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    UI COMPONENTS                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  StudioEditor                                                │
│  └─ Reads state.composition                                  │
│      → Shows mode badge + slide counter                      │
│                                                              │
│  PromptModeView                                              │
│  └─ Reads state.composition                                  │
│      → Single: 1 card                                        │
│      → Slideshow: 4 labeled cards                            │
│                                                              │
│  PreviewPanel                                                │
│  └─ Reads state.composition                                  │
│      → Shows/hides storyboard strip                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 User Journey Comparison

### Journey 1: Create Single Image

#### Before ❌
```
1. Batch Generator → "Use this idea"
2. Editor opens with 4 slides (???)
3. Prompt view shows 4 cards
4. User deletes 3 slides manually
5. Confusion and wasted time
```

#### After ✅
```
1. Batch Generator → "Details" → "Create Single Image"
2. Editor opens with [Single Image] badge
3. Prompt view shows 1 card
4. User starts editing immediately
5. Clear and efficient
```

### Journey 2: Create Slideshow

#### Before ❌
```
1. Batch Generator → "Use this idea"
2. Editor opens (no indication it's a slideshow)
3. Prompt view shows 4 cards (why?)
4. User unsure if this is correct
5. Proceeds hesitantly
```

#### After ✅
```
1. Batch Generator → "Details" → "Create Slideshow"
2. Editor opens with [Slideshow] badge + "Editing slide 1 of 4"
3. Prompt view shows "Slide 1 of 4: Hook", etc.
4. User understands the structure
5. Confident editing
```

---

## 🔧 Technical Implementation Details

### Action Flow
```typescript
// User clicks "Create Single Image"
useIdea(post, 'single')
  ↓
dispatch({ type: 'SET_MODE', payload: 'infographic' })
dispatch({ type: 'SET_COMPOSITION', payload: 'single' })
dispatch({ type: 'SET_SLIDES', payload: [createSingleSlideFromPost(post)] })
  ↓
Reducer updates state
  ↓
Components re-render with new state
  ↓
UI reflects single image mode
```

### Component Rendering Logic
```typescript
// StudioEditor.tsx
const isSlideshow = composition === 'slideshow' || slides.length > 1;

return (
  <div className="mode-banner">
    {isSlideshow ? (
      <>
        <Badge>Slideshow</Badge>
        <span>Editing slide {displayIndex} of {slides.length}</span>
      </>
    ) : (
      <Badge>Single Image</Badge>
    )}
  </div>
);

// PromptModeView.tsx
if (!isSlideshow) {
  return <SingleCard slide={selectedSlide} />;
}

return slides.map((slide, i) => (
  <Card title={`Slide ${i + 1} of ${slides.length}: ${slide.role}`} />
));
```

---

## 📈 Metrics & Impact

### Code Quality
- **Type Safety:** ✅ Explicit `CompositionMode` type
- **State Consistency:** ✅ Single source of truth
- **Component Clarity:** ✅ No guessing from `slides.length`

### User Experience
- **Clarity:** ✅ Always know what you're creating
- **Efficiency:** ✅ No manual slide deletion
- **Confidence:** ✅ Visual feedback at every step

### Maintainability
- **Debugging:** ✅ Easy to trace composition state
- **Testing:** ✅ Clear test scenarios
- **Extension:** ✅ Template system foundation ready

---

## 🎓 Design Patterns Used

### 1. **Explicit State Pattern**
Instead of inferring mode from data shape, store it explicitly.

### 2. **Single Source of Truth**
`composition` field is the authoritative source, not `slides.length`.

### 3. **Separation of Concerns**
- Slide creation logic → `slideUtils.ts`
- Template logic → `templateUtils.ts`
- State management → `store.tsx`
- UI rendering → Components

### 4. **Progressive Disclosure**
Batch generator shows compact view by default, expands on demand.

---

## ✅ Success Criteria Met

- [x] User can explicitly choose single vs slideshow
- [x] Editor clearly shows current mode
- [x] Prompt view adapts to composition
- [x] State is consistent across all components
- [x] No more "always 4 slides" bug
- [x] Dashboard correctly loads runs
- [x] BriefPanel respects composition
- [x] Template system foundation in place

---

**Result:** A coherent, predictable, and user-friendly Studio experience! 🎉
