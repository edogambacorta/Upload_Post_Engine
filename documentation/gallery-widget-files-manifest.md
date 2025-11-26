# Gallery Widget - Complete File Manifest

## Summary
This document lists all files that will be created or modified for the Gallery Widget feature.

---

## 📁 New Files to Create (24 files)

### Core Library Files

#### 1. Type Definitions
```
src/web/lib/gallery/types.ts
```
- `GalleryImage` interface
- `GalleryState` interface
- `GalleryFilters` interface
- Export types for use across the app

#### 2. State Management
```
src/web/lib/gallery/store.ts
```
- Zustand store for gallery state
- Actions: loadImages, searchImages, filterImages, toggleFavorite, etc.

#### 3. Utilities
```
src/web/lib/gallery/utils.ts
```
- Helper functions for image processing
- Date formatting utilities
- URL validation

```
src/web/lib/gallery/imageIndexer.ts
```
- Scan `data/runs/` directory
- Extract image metadata from run files
- Build searchable index

```
src/web/lib/gallery/searchEngine.ts
```
- Fuse.js wrapper
- Search configuration
- Result ranking and highlighting

---

### Server-Side Files

#### 4. API Routes
```
src/server/api/gallery.ts
```
- `GET /api/gallery/images` - List all images with filters
- `GET /api/gallery/images/:id` - Get single image
- `POST /api/gallery/images/:id/favorite` - Toggle favorite
- `POST /api/gallery/images/:id/usage` - Increment usage count
- `DELETE /api/gallery/images/:id` - Archive image

---

### React Components

#### 5. Main Gallery Components
```
src/web/components/gallery/GalleryPage.tsx
```
- Full-page gallery view
- Layout with header, search, filters, and grid
- Route: `/studio/gallery`

```
src/web/components/gallery/GallerySidebar.tsx
```
- Collapsible sidebar widget for Studio Editor
- Compact view with search and scroll
- Toggle button for show/hide

```
src/web/components/gallery/GalleryGrid.tsx
```
- Responsive grid layout
- Handles different aspect ratios
- Optional virtual scrolling for performance

```
src/web/components/gallery/GalleryImageCard.tsx
```
- Individual image card component
- Shows thumbnail, prompt, metadata
- Draggable for drag-drop functionality
- Quick actions (favorite, download, insert)

#### 6. Search & Filter Components
```
src/web/components/gallery/GallerySearch.tsx
```
- Search input with debouncing
- Clear button
- Results count display

```
src/web/components/gallery/GalleryFilters.tsx
```
- Aspect ratio filter
- Date range picker
- Composition type filter
- Sort options (newest, oldest, most used)

#### 7. Modal & Overlay Components
```
src/web/components/gallery/GalleryPreviewModal.tsx
```
- Full-size image preview
- Detailed metadata display
- Actions (download, favorite, delete, insert)

```
src/web/components/gallery/GalleryDragLayer.tsx
```
- Custom drag layer for react-dnd
- Shows semi-transparent image preview during drag
- Cursor feedback

---

### Custom Hooks

#### 8. Gallery Hooks
```
src/web/components/gallery/hooks/useGalleryImages.ts
```
- Fetch images from API
- Handle loading and error states
- Pagination logic

```
src/web/components/gallery/hooks/useGallerySearch.ts
```
- Search logic with Fuse.js
- Debounced search input
- Result memoization

```
src/web/components/gallery/hooks/useImageDragDrop.ts
```
- Drag source setup
- Drop target setup
- Drag state management
- Drop handler logic

---

### Optional Files

#### 9. Styles (if needed)
```
src/web/components/gallery/Gallery.css
```
- Custom styles not covered by Tailwind
- Animations for drag-drop
- Grid layout tweaks

---

### Testing Files (Recommended)

#### 10. Component Tests
```
src/web/components/gallery/__tests__/GalleryImageCard.test.tsx
src/web/components/gallery/__tests__/GallerySearch.test.tsx
src/web/components/gallery/__tests__/GalleryFilters.test.tsx
```

#### 11. Logic Tests
```
src/web/lib/gallery/__tests__/searchEngine.test.ts
src/web/lib/gallery/__tests__/imageIndexer.test.ts
src/web/lib/gallery/__tests__/store.test.ts
```

---

### Documentation Files

#### 12. Additional Documentation
```
documentation/gallery-widget-api.md
```
- API endpoint documentation
- Request/response examples
- Error codes

```
documentation/gallery-widget-usage.md
```
- User guide
- Feature walkthrough
- Keyboard shortcuts

---

## 📝 Files to Modify (7 files)

### 1. Routing
```
src/web/App.tsx
```
**Changes:**
- Import `GalleryPage` component
- Add route: `<Route path="gallery" element={<GalleryPage />} />`
- Add to Studio routes section

**Lines to modify:** ~40-43 (Routes section)

---

### 2. Studio Editor Layout
```
src/web/components/studio/Editor/StudioEditor.tsx
```
**Changes:**
- Import `GallerySidebar` component
- Add gallery sidebar to layout
- Adjust layout grid to accommodate sidebar
- Add toggle button in toolbar

**Estimated additions:** ~50 lines
**Areas to modify:**
- Imports section
- Layout JSX (add sidebar)
- Toolbar (add toggle button)

---

### 3. Canvas Integration
```
src/web/components/studio/Editor/PreviewPanel.tsx
```
**Changes:**
- Import drop zone handlers
- Add drop target setup for canvas
- Implement `onImageDrop` handler
- Add visual feedback during drag (highlight drop zone)
- Update slide image when image is dropped

**Estimated additions:** ~80 lines
**Areas to modify:**
- Imports section
- Add drop zone effect
- Add drop handler function
- Add visual feedback overlay

---

### 4. Studio State Management
```
src/web/lib/studio/store.ts
```
**Changes:**
- Add `galleryVisible: boolean` to initial state
- Add `TOGGLE_GALLERY` action to reducer
- Add `toggleGallery()` action creator

**Estimated additions:** ~15 lines
**Lines to modify:**
- Initial state object (~line 20-30)
- Reducer switch statement (~line 50-150)
- Action creators section (~line 200+)

---

### 5. Studio Types
```
src/web/lib/studio/types.ts
```
**Changes:**
- Add `galleryVisible?: boolean` to `StudioState` interface

**Estimated additions:** 1 line
**Lines to modify:** ~line 65-84 (StudioState interface)

---

### 6. Server Routes
```
src/server/server.ts
```
**Changes:**
- Import gallery API routes
- Register gallery routes with Express app
- Add route: `app.use('/api/gallery', galleryRoutes)`

**Estimated additions:** ~5 lines
**Areas to modify:**
- Imports section
- Routes registration section

---

### 7. Package Dependencies
```
package.json
```
**Changes:**
- Add `fuse.js` for fuzzy search
- Add `react-dnd` for drag and drop
- Add `react-dnd-html5-backend` for HTML5 drag backend
- Add `date-fns` for date formatting (if not already present)
- (Optional) Add `react-window` for virtual scrolling

**Dependencies to add:**
```json
{
  "dependencies": {
    "fuse.js": "^7.0.0",
    "react-dnd": "^16.0.1",
    "react-dnd-html5-backend": "^16.0.1",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "@types/react-dnd": "^3.0.2"
  }
}
```

---

## 📊 File Count Summary

| Category | New Files | Modified Files |
|----------|-----------|----------------|
| **Core Library** | 5 | 2 |
| **Server API** | 1 | 1 |
| **Components** | 8 | 1 |
| **Hooks** | 3 | 0 |
| **Tests** | 6 | 0 |
| **Documentation** | 3 | 0 |
| **Config** | 0 | 1 |
| **TOTAL** | **24** | **7** |

---

## 🗂️ Directory Structure (New)

```
src/
├── web/
│   ├── components/
│   │   └── gallery/                    # NEW DIRECTORY
│   │       ├── __tests__/              # NEW DIRECTORY
│   │       │   ├── GalleryImageCard.test.tsx
│   │       │   ├── GallerySearch.test.tsx
│   │       │   └── GalleryFilters.test.tsx
│   │       ├── hooks/                  # NEW DIRECTORY
│   │       │   ├── useGalleryImages.ts
│   │       │   ├── useGallerySearch.ts
│   │       │   └── useImageDragDrop.ts
│   │       ├── GalleryPage.tsx
│   │       ├── GallerySidebar.tsx
│   │       ├── GalleryGrid.tsx
│   │       ├── GalleryImageCard.tsx
│   │       ├── GallerySearch.tsx
│   │       ├── GalleryFilters.tsx
│   │       ├── GalleryPreviewModal.tsx
│   │       ├── GalleryDragLayer.tsx
│   │       └── Gallery.css (optional)
│   └── lib/
│       └── gallery/                    # NEW DIRECTORY
│           ├── __tests__/              # NEW DIRECTORY
│           │   ├── searchEngine.test.ts
│           │   ├── imageIndexer.test.ts
│           │   └── store.test.ts
│           ├── types.ts
│           ├── store.ts
│           ├── utils.ts
│           ├── imageIndexer.ts
│           └── searchEngine.ts
└── server/
    └── api/
        └── gallery.ts                  # NEW FILE

documentation/
├── gallery-widget-implementation.md    # NEW FILE (this plan)
├── gallery-widget-api.md              # NEW FILE
├── gallery-widget-usage.md            # NEW FILE
└── gallery-widget-files-manifest.md   # NEW FILE (this document)
```

---

## 🔄 Implementation Order

### Phase 1: Foundation (Week 1)
1. Create `src/web/lib/gallery/types.ts`
2. Create `src/web/lib/gallery/store.ts`
3. Create `src/web/lib/gallery/utils.ts`
4. Create `src/web/lib/gallery/imageIndexer.ts`
5. Create `src/server/api/gallery.ts`
6. Modify `src/server/server.ts`
7. Modify `package.json` and install dependencies

### Phase 2: Core Components (Week 1-2)
8. Create `src/web/components/gallery/GalleryImageCard.tsx`
9. Create `src/web/components/gallery/GalleryGrid.tsx`
10. Create `src/web/components/gallery/GallerySearch.tsx`
11. Create `src/web/lib/gallery/searchEngine.ts`
12. Create `src/web/components/gallery/hooks/useGalleryImages.ts`
13. Create `src/web/components/gallery/hooks/useGallerySearch.ts`

### Phase 3: Full Page Gallery (Week 2)
14. Create `src/web/components/gallery/GalleryPage.tsx`
15. Create `src/web/components/gallery/GalleryFilters.tsx`
16. Create `src/web/components/gallery/GalleryPreviewModal.tsx`
17. Modify `src/web/App.tsx`

### Phase 4: Sidebar Widget (Week 2-3)
18. Create `src/web/components/gallery/GallerySidebar.tsx`
19. Modify `src/web/components/studio/Editor/StudioEditor.tsx`
20. Modify `src/web/lib/studio/store.ts`
21. Modify `src/web/lib/studio/types.ts`

### Phase 5: Drag & Drop (Week 3)
22. Create `src/web/components/gallery/GalleryDragLayer.tsx`
23. Create `src/web/components/gallery/hooks/useImageDragDrop.ts`
24. Modify `src/web/components/studio/Editor/PreviewPanel.tsx`
25. Modify `src/web/components/gallery/GalleryImageCard.tsx` (make draggable)

### Phase 6: Polish & Testing (Week 3-4)
26. Create all test files
27. Add loading states and error handling
28. Create documentation files
29. Performance optimization
30. Accessibility improvements

---

## 📦 Dependencies Installation Command

```bash
npm install fuse.js react-dnd react-dnd-html5-backend date-fns
npm install -D @types/react-dnd
```

---

## ✅ Verification Checklist

After implementation, verify:

- [ ] Gallery page accessible at `/studio/gallery`
- [ ] Sidebar toggles in Studio Editor
- [ ] Search returns relevant results
- [ ] Filters work correctly
- [ ] Images can be dragged from gallery to canvas
- [ ] Dropped images replace current slide image
- [ ] Favorites can be toggled
- [ ] Usage count increments on use
- [ ] Preview modal shows full image
- [ ] Responsive on different screen sizes
- [ ] Keyboard navigation works
- [ ] Loading states display correctly
- [ ] Error states handled gracefully
- [ ] All tests pass
- [ ] No console errors
- [ ] Performance is acceptable (< 2s load time)

---

## 🎯 Success Criteria

1. **Functionality**: All features work as specified
2. **Performance**: Gallery loads in < 2 seconds with 100+ images
3. **UX**: Users can find and insert images in < 10 seconds
4. **Code Quality**: All TypeScript types defined, no `any` types
5. **Testing**: >80% code coverage
6. **Accessibility**: WCAG AA compliant
7. **Documentation**: Complete API and user documentation

---

## 📞 Support & Questions

For questions or clarifications during implementation:
- Refer to main implementation plan: `gallery-widget-implementation.md`
- Check API documentation: `gallery-widget-api.md`
- Review user guide: `gallery-widget-usage.md`

---

**Last Updated**: 2025-11-26
**Status**: Planning Phase
**Estimated Completion**: 3-4 weeks from start
