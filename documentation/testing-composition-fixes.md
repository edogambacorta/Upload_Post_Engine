# Testing Guide - Composition Mode Fixes

## Issue Fixed
**Problem:** Clicking "Single Graphic" or "Carousel/Slideshow" on the dashboard always showed "Single Image" mode in the editor.

**Root Cause:** The `handleCreate` function in Dashboard.tsx was not setting the `composition` state.

---

## Fixes Applied

### 1. Dashboard.tsx - `handleCreate` function
**Before:**
```typescript
const handleCreate = (mode: 'infographic' | 'carousel' | 'batch') => {
    dispatch({ type: 'SET_MODE', payload: mode });
    // ❌ No composition set!
    navigate('/studio/editor');
};
```

**After:**
```typescript
const handleCreate = (mode: 'infographic' | 'carousel' | 'batch') => {
    dispatch({ type: 'SET_MODE', payload: mode });
    
    // ✅ Set composition based on mode
    if (mode === 'infographic') {
        dispatch({ type: 'SET_COMPOSITION', payload: 'single' });
    } else if (mode === 'carousel') {
        dispatch({ type: 'SET_COMPOSITION', payload: 'slideshow' });
    }
    
    navigate('/studio/editor');
};
```

### 2. runLoader.ts - Added composition to hydration
**Added:** `composition: CompositionMode` to `RunHydrationPayload`
**Logic:** Infers composition from `slides.length > 1`

### 3. StudioEditor.tsx - Dispatch composition on load
**Added:** `dispatch({ type: 'SET_COMPOSITION', payload: payload.composition });`

---

## Test Scenarios

### ✅ Test 1: Click "Single Graphic"
1. Go to `http://localhost:5173/studio`
2. Click **"Single Graphic"** button
3. **Expected:**
   - Editor header shows: `[Single Image]` badge (emerald color)
   - No slide counter
   - Topic field shows in header

### ✅ Test 2: Click "Carousel / Slideshow"
1. Go to `http://localhost:5173/studio`
2. Click **"Carousel / Slideshow"** button
3. **Expected:**
   - Editor header shows: `[Slideshow]` badge (purple color)
   - Shows "Editing slide 1 of 0" (or similar if no slides yet)
   - Topic field shows in header

### ✅ Test 3: Generate Content in Single Mode
1. Click "Single Graphic" from dashboard
2. In editor, fill in:
   - Topic: "Test topic"
   - Audience: Select any
3. Click "Generate Content Draft"
4. **Expected:**
   - Creates 1 slide only
   - Prompt view shows 1 card
   - Badge still shows "Single Image"

### ✅ Test 4: Generate Content in Slideshow Mode
1. Click "Carousel / Slideshow" from dashboard
2. In editor, fill in:
   - Topic: "Test topic"
   - Audience: Select any
3. Click "Generate Content Draft"
4. **Expected:**
   - Creates 4 slides
   - Prompt view shows 4 labeled cards ("Slide 1 of 4: hook", etc.)
   - Badge shows "Slideshow"
   - Slide counter updates as you navigate

### ✅ Test 5: Load Existing Run
1. Go to dashboard
2. Click on a recent run
3. **Expected:**
   - Single-post run → Shows "Single Image" badge
   - Multi-post run → Shows "Slideshow" badge with counter

### ✅ Test 6: Batch Generator
1. Go to `/studio/batch`
2. Generate ideas
3. Click "Details" on an idea
4. Click "Create Single Image"
5. **Expected:** Editor shows "Single Image" badge
6. Go back, click "Create Slideshow"
7. **Expected:** Editor shows "Slideshow" badge

---

## Visual Indicators to Check

### Single Image Mode
```
┌─────────────────────────────────────────────┐
│ [Single Image] Topic: Your topic here       │
└─────────────────────────────────────────────┘
```
- Badge color: Emerald green
- No slide counter

### Slideshow Mode
```
┌─────────────────────────────────────────────┐
│ [Slideshow] Editing slide 2 of 4            │
│ Topic: Your topic here                      │
└─────────────────────────────────────────────┘
```
- Badge color: Purple
- Shows slide counter

---

## Common Issues & Solutions

### Issue: Still shows "Single Image" after clicking "Slideshow"
**Solution:** 
- Clear browser cache and reload
- Check browser console for errors
- Verify the dev server restarted after code changes

### Issue: Mode changes after generating content
**Solution:** This is expected! The composition is set when:
1. Clicking dashboard buttons
2. Clicking batch generator buttons
3. Loading a run

It persists until one of these actions changes it.

### Issue: Slide counter shows "0 of 0"
**Solution:** This is normal when no slides exist yet. Generate content to see proper counts.

---

## Code Flow Summary

```
User clicks "Carousel / Slideshow"
    ↓
handleCreate('carousel')
    ↓
dispatch({ type: 'SET_MODE', payload: 'carousel' })
dispatch({ type: 'SET_COMPOSITION', payload: 'slideshow' })
    ↓
Navigate to /studio/editor
    ↓
StudioEditor reads state.composition
    ↓
Shows [Slideshow] badge
    ↓
User generates content
    ↓
BriefPanel reads state.composition
    ↓
Calls createSlideshowFromPost()
    ↓
Creates 4 slides
    ↓
PromptModeView reads state.composition
    ↓
Shows 4 labeled cards
```

---

## Verification Checklist

After testing, verify:
- [ ] Dashboard "Single Graphic" → Shows emerald "Single Image" badge
- [ ] Dashboard "Carousel / Slideshow" → Shows purple "Slideshow" badge
- [ ] Generating in single mode → Creates 1 slide
- [ ] Generating in slideshow mode → Creates 4 slides
- [ ] Prompt view adapts to composition
- [ ] Loading runs shows correct mode
- [ ] Batch generator buttons work correctly

---

**Status:** All fixes applied and ready for testing!

If you encounter any issues, check:
1. Browser console for errors
2. Network tab for API calls
3. React DevTools for state inspection
