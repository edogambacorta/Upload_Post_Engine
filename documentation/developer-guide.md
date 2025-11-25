# Studio Composition Mode - Developer Quick Reference

## 🎯 Core Concept

The Studio now has an **explicit composition mode** that tracks whether the user is creating a **single image** or a **slideshow**. This is stored in `state.composition` and should be used by all components instead of guessing from `slides.length`.

---

## 📚 Key Types

```typescript
// src/web/lib/studio/types.ts

type CompositionMode = 'single' | 'slideshow';

interface StudioState {
  composition: CompositionMode;  // ← Use this!
  slides: Slide[];
  // ... other fields
}

interface Slide {
  role: 'hook' | 'empathy' | 'insight' | 'cta' | 'single';  // ← 'single' added
  // ... other fields
}
```

---

## 🔧 Creating Slides

### ✅ DO: Use composition-specific functions

```typescript
import { createSingleSlideFromPost, createSlideshowFromPost } from '@/lib/studio/slideUtils';

// For single image
const slide = createSingleSlideFromPost(post);
dispatch({ type: 'SET_SLIDES', payload: [slide] });

// For slideshow
const slides = createSlideshowFromPost(post);
dispatch({ type: 'SET_SLIDES', payload: slides });
```

### ❌ DON'T: Use the old function without composition parameter

```typescript
// Old way (still works but prefer explicit functions)
const slides = createSlidesFromPost(post);  // Defaults to slideshow
```

---

## 🎬 Setting Composition Mode

### When creating new content

```typescript
// Always set composition when creating slides
dispatch({ type: 'SET_COMPOSITION', payload: 'single' });
// or
dispatch({ type: 'SET_COMPOSITION', payload: 'slideshow' });
```

### When loading existing runs

```typescript
const isSlideshowRun = run.posts.length > 1;
dispatch({ 
  type: 'SET_COMPOSITION', 
  payload: isSlideshowRun ? 'slideshow' : 'single' 
});
```

---

## 🎨 Reading Composition in Components

### ✅ DO: Read from state.composition

```typescript
import { useStudio } from '@/lib/studio/store';

function MyComponent() {
  const { state } = useStudio();
  const { composition, slides } = state;
  
  const isSlideshow = composition === 'slideshow';
  
  return (
    <div>
      {isSlideshow ? (
        <SlideshowView slides={slides} />
      ) : (
        <SingleImageView slide={slides[0]} />
      )}
    </div>
  );
}
```

### ❌ DON'T: Guess from slides.length

```typescript
// Bad - unreliable!
const isSlideshow = slides.length > 1;
```

---

## 🔄 Common Patterns

### Pattern 1: Entry Point (Batch Generator, Dashboard)

```typescript
const handleCreateSingle = (post: MomPost) => {
  const slide = createSingleSlideFromPost(post);
  
  dispatch({ type: 'SET_MODE', payload: 'infographic' });
  dispatch({ type: 'SET_COMPOSITION', payload: 'single' });
  dispatch({ type: 'SET_SLIDES', payload: [slide] });
  dispatch({ type: 'SET_SELECTED_SLIDE', payload: slide.id });
  
  navigate('/studio/editor');
};

const handleCreateSlideshow = (post: MomPost) => {
  const slides = createSlideshowFromPost(post);
  
  dispatch({ type: 'SET_MODE', payload: 'infographic' });
  dispatch({ type: 'SET_COMPOSITION', payload: 'slideshow' });
  dispatch({ type: 'SET_SLIDES', payload: slides });
  dispatch({ type: 'SET_SELECTED_SLIDE', payload: slides[0].id });
  
  navigate('/studio/editor');
};
```

### Pattern 2: Conditional Rendering

```typescript
function PromptView() {
  const { state } = useStudio();
  const { composition, slides } = state;
  
  if (composition === 'single') {
    return <SinglePromptCard slide={slides[0]} />;
  }
  
  return (
    <div className="grid gap-4">
      {slides.map((slide, i) => (
        <PromptCard 
          key={slide.id}
          slide={slide}
          label={`Slide ${i + 1} of ${slides.length}: ${slide.role}`}
        />
      ))}
    </div>
  );
}
```

### Pattern 3: Mode Indicator

```typescript
function ModeIndicator() {
  const { state } = useStudio();
  const { composition, slides, selectedSlideId } = state;
  
  const isSlideshow = composition === 'slideshow';
  const currentIndex = slides.findIndex(s => s.id === selectedSlideId);
  const displayIndex = currentIndex >= 0 ? currentIndex + 1 : 1;
  
  return (
    <div className="mode-banner">
      <Badge color={isSlideshow ? 'purple' : 'emerald'}>
        {isSlideshow ? 'Slideshow' : 'Single Image'}
      </Badge>
      {isSlideshow && (
        <span>Editing slide {displayIndex} of {slides.length}</span>
      )}
    </div>
  );
}
```

---

## 🎭 Actions Reference

### Composition Actions

```typescript
// Set composition mode
dispatch({ 
  type: 'SET_COMPOSITION', 
  payload: 'single' | 'slideshow' 
});

// Reorder slides (for slideshow mode)
dispatch({ 
  type: 'REORDER_SLIDES', 
  payload: { fromIndex: 0, toIndex: 2 } 
});
```

### Template Actions (Foundation)

```typescript
// Add template
dispatch({ 
  type: 'ADD_TEMPLATE', 
  payload: template 
});

// Update template
dispatch({ 
  type: 'UPDATE_TEMPLATE', 
  payload: { id: 'tpl-123', updates: { name: 'New Name' } } 
});

// Delete template
dispatch({ 
  type: 'DELETE_TEMPLATE', 
  payload: 'tpl-123' 
});

// Set active template
dispatch({ 
  type: 'SET_ACTIVE_TEMPLATE', 
  payload: 'tpl-123' 
});
```

---

## 🧪 Testing Checklist

When adding/modifying components:

- [ ] Does it read `state.composition` instead of guessing?
- [ ] Does it handle both 'single' and 'slideshow' modes?
- [ ] Does it set composition when creating slides?
- [ ] Does it show appropriate UI for each mode?
- [ ] Does it work with 1 slide (single) and 4 slides (slideshow)?

---

## 🚨 Common Mistakes

### Mistake 1: Guessing from slides.length
```typescript
// ❌ Bad
const isSlideshow = slides.length > 1;

// ✅ Good
const isSlideshow = composition === 'slideshow';
```

### Mistake 2: Not setting composition
```typescript
// ❌ Bad - composition not set
dispatch({ type: 'SET_SLIDES', payload: slides });

// ✅ Good - composition explicitly set
dispatch({ type: 'SET_COMPOSITION', payload: 'slideshow' });
dispatch({ type: 'SET_SLIDES', payload: slides });
```

### Mistake 3: Hardcoding slide count
```typescript
// ❌ Bad - assumes 4 slides
const slides = createSlidesFromPost(post);  // Always 4

// ✅ Good - explicit based on intent
const slides = composition === 'single'
  ? [createSingleSlideFromPost(post)]
  : createSlideshowFromPost(post);
```

---

## 📖 Related Files

### Core Logic
- `src/web/lib/studio/types.ts` - Type definitions
- `src/web/lib/studio/store.tsx` - State management
- `src/web/lib/studio/slideUtils.ts` - Slide creation
- `src/web/lib/studio/templateUtils.ts` - Template utilities

### Components
- `src/web/components/studio/Batch/BatchGenerator.tsx` - Entry point
- `src/web/components/studio/Editor/StudioEditor.tsx` - Mode indicator
- `src/web/components/studio/Editor/PromptModeView.tsx` - Composition-aware rendering
- `src/web/components/studio/Editor/BriefPanel.tsx` - Generation
- `src/web/components/studio/Dashboard.tsx` - Run loading

---

## 💡 Tips

1. **Always be explicit** - Set composition mode whenever creating slides
2. **Trust the state** - Use `state.composition`, not derived values
3. **Think user intent** - Single image vs slideshow is about what the user wants to create
4. **Visual feedback** - Show mode indicators so users know what they're editing
5. **Consistent patterns** - Follow the patterns in existing components

---

## 🔗 Quick Links

- [Full Implementation Summary](./implementation-summary.md)
- [Flow Diagrams](./flow-diagram.md)
- [Original Problem Documentation](./fix-ui-problems.md)
- [Implementation Progress](./implementation-progress.md)

---

**Questions?** Check the implementation summary or review the modified components for examples.
