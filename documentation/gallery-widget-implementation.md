# Gallery Widget Implementation Plan

## Overview
A comprehensive image gallery system that serves dual purposes:
1. **Standalone Page**: Full-featured gallery view at `/studio/gallery`
2. **Sidebar Widget**: Compact, collapsible panel in the Studio Editor

The gallery will display all generated images from past runs with fuzzy search capabilities, allowing users to drag and drop images into the canvas when in image mode.

---

## Core Features

### 1. Image Storage & Indexing
- **Data Source**: Scan `data/runs/` directory for all generated images
- **Metadata Extraction**: Parse `meta.json` files from each run to extract:
  - Image URLs (both raw and final)
  - Image prompts (for search)
  - Slide text content
  - Generation timestamp
  - Run ID and slide ID
  - Aspect ratio
  - Composition mode (single/slideshow)

### 2. Search Functionality
- **Fuzzy Search**: Use Fuse.js or similar library for fuzzy matching
- **Search Fields**:
  - Image prompt (primary)
  - Slide text content
  - Run topic/audience
  - Timestamp (date range)
- **Real-time filtering**: Update results as user types
- **Search highlighting**: Highlight matching terms in results

### 3. Gallery Display Modes

#### Full Page Mode (`/studio/gallery`)
- **Grid Layout**: Responsive masonry or CSS grid
- **Image Cards**: Each card shows:
  - Thumbnail preview
  - Image prompt (truncated with tooltip)
  - Generation date
  - Aspect ratio badge
  - Quick actions (download, copy URL, insert)
- **Filters**:
  - Aspect ratio filter
  - Date range picker
  - Composition type (single/slideshow)
  - Sort by: newest, oldest, most used
- **Pagination or Infinite Scroll**: Handle large galleries efficiently
- **Preview Modal**: Click to view full-size with metadata

#### Sidebar Widget Mode
- **Collapsible Panel**: Left sidebar in Studio Editor
- **Compact View**: Smaller thumbnails in vertical scroll
- **Quick Search Bar**: Minimal search input at top
- **Drag Source**: Images can be dragged onto canvas
- **Toggle Button**: Show/hide gallery panel
- **Width**: ~280-320px when expanded, ~40px when collapsed

### 4. Drag & Drop Integration
- **Activation**: Only when `editMode === 'image'`
- **Drag Behavior**:
  - User drags image from gallery
  - Canvas shows drop zone indicator
  - On drop: Replace current slide's image
  - Preserve existing image transform if compatible
- **Visual Feedback**:
  - Dragging cursor changes
  - Canvas highlights drop zone
  - Image preview follows cursor

### 5. Image Management
- **History Tracking**: Track which images are used in which slides
- **Favorites**: Star/favorite frequently used images
- **Collections**: Optional - group images by theme/topic
- **Delete/Archive**: Mark images as archived (soft delete)

---

## Technical Architecture

### Data Layer

#### New Types (`src/web/lib/gallery/types.ts`)
```typescript
export interface GalleryImage {
  id: string;                    // Unique identifier
  runId: string;                 // Parent run ID
  slideId: string;               // Slide ID within run
  imageUrl: string;              // Full URL to image
  thumbnailUrl?: string;         // Optional thumbnail
  prompt: string;                // Image generation prompt
  slideText?: string;            // Associated slide text
  createdAt: string;             // ISO timestamp
  aspectRatio: AspectRatio;      // From types.ts
  composition: CompositionMode;  // single/slideshow
  metadata: {
    width?: number;
    height?: number;
    model?: string;
    topic?: string;
    audience?: string;
  };
  usageCount?: number;           // How many times used
  isFavorite?: boolean;
  tags?: string[];
}

export interface GalleryState {
  images: GalleryImage[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  filters: GalleryFilters;
  sortBy: 'newest' | 'oldest' | 'mostUsed';
  selectedImageId: string | null;
}

export interface GalleryFilters {
  aspectRatio?: AspectRatio[];
  composition?: CompositionMode[];
  dateRange?: {
    start: string;
    end: string;
  };
  favorites?: boolean;
  tags?: string[];
}
```

#### API Endpoints (`src/server/api/gallery.ts`)
```typescript
// GET /api/gallery/images
// Returns all gallery images with metadata
// Query params: ?search=query&aspectRatio=1:1&limit=50&offset=0

// GET /api/gallery/images/:id
// Returns single image with full metadata

// POST /api/gallery/images/:id/favorite
// Toggle favorite status

// POST /api/gallery/images/:id/usage
// Increment usage count

// DELETE /api/gallery/images/:id
// Soft delete (archive) image
```

#### Gallery Store (`src/web/lib/gallery/store.ts`)
```typescript
// Zustand store for gallery state management
// Similar pattern to studio store
// Actions: loadImages, searchImages, filterImages, selectImage, etc.
```

### Component Structure

```
src/web/components/gallery/
├── GalleryPage.tsx              # Full page gallery view
├── GallerySidebar.tsx           # Sidebar widget for editor
├── GalleryGrid.tsx              # Grid layout component
├── GalleryImageCard.tsx         # Individual image card
├── GallerySearch.tsx            # Search bar with filters
├── GalleryFilters.tsx           # Filter controls
├── GalleryPreviewModal.tsx      # Full-size preview modal
├── GalleryDragLayer.tsx         # Custom drag layer for DnD
└── hooks/
    ├── useGalleryImages.ts      # Fetch and manage images
    ├── useGallerySearch.ts      # Search logic with Fuse.js
    └── useImageDragDrop.ts      # Drag & drop logic
```

### Integration Points

#### 1. Studio Editor Integration
**File**: `src/web/components/studio/Editor/StudioEditor.tsx`
- Add `<GallerySidebar />` component
- Conditional rendering based on gallery visibility state
- Pass canvas reference for drag-drop integration

#### 2. Canvas Integration
**File**: `src/web/components/studio/Editor/PreviewPanel.tsx`
- Add drop zone handlers
- Accept dropped images and update slide
- Visual feedback during drag operations

#### 3. Routing
**File**: `src/web/App.tsx`
- Add route: `/studio/gallery` → `<GalleryPage />`

#### 4. Studio State
**File**: `src/web/lib/studio/store.ts`
- Add `galleryVisible: boolean` to state
- Add action: `TOGGLE_GALLERY`

---

## UI/UX Design

### Color Scheme
- Match existing Studio theme
- Gallery cards: `bg-slate-800` with hover `bg-slate-700`
- Search bar: `bg-slate-900` with `border-slate-700`
- Accent: Purple (`#a855f7`) for selected/favorite states

### Layout Specifications

#### Full Page Gallery
```
┌─────────────────────────────────────────────┐
│  Gallery Header                              │
│  ┌─────────────────────────────────────┐    │
│  │ Search: [fuzzy search input...]     │    │
│  └─────────────────────────────────────┘    │
│  [Filters: Aspect | Date | Type | Sort]     │
├─────────────────────────────────────────────┤
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ Img │ │ Img │ │ Img │ │ Img │           │
│  │ 1:1 │ │ 4:5 │ │ 9:16│ │ 1:1 │           │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ Img │ │ Img │ │ Img │ │ Img │           │
│  └─────┘ └─────┘ └─────┘ └─────┘           │
│  [Load More...]                              │
└─────────────────────────────────────────────┘
```

#### Sidebar Widget (Collapsed)
```
┌──┐
│ G│  ← Gallery icon
│ A│
│ L│
│ L│
│ E│
│ R│
│ Y│
└──┘
```

#### Sidebar Widget (Expanded)
```
┌──────────────────┐
│ Gallery      [×] │
│ ┌──────────────┐ │
│ │ Search...    │ │
│ └──────────────┘ │
│ ┌──────┐         │
│ │ Img  │ Prompt  │
│ │ 1:1  │ text... │
│ └──────┘         │
│ ┌──────┐         │
│ │ Img  │ Prompt  │
│ │ 4:5  │ text... │
│ └──────┘         │
│ ┌──────┐         │
│ │ Img  │ Prompt  │
│ │ 9:16 │ text... │
│ └──────┘         │
│ [Scroll...]      │
└──────────────────┘
```

### Interactions

#### Drag & Drop Flow
1. User hovers over gallery image → cursor changes to `grab`
2. User clicks and drags → cursor changes to `grabbing`
3. Custom drag layer shows semi-transparent image preview
4. Canvas shows drop zone with dashed border and highlight
5. On drop:
   - If in image mode: Replace current slide image
   - If not in image mode: Show toast "Switch to Image mode to add images"
6. Update usage count for that image

#### Search Behavior
- **Debounced input**: 300ms delay before search triggers
- **Minimum characters**: Search activates after 2+ characters
- **Clear button**: X icon to clear search
- **Results count**: "Showing 24 of 156 images"
- **No results**: "No images found. Try different keywords."

---

## Implementation Phases

### Phase 1: Data Layer & API (Foundation)
**Files to Create:**
- `src/web/lib/gallery/types.ts`
- `src/web/lib/gallery/store.ts`
- `src/server/api/gallery.ts`
- `src/web/lib/gallery/utils.ts` (helper functions)

**Tasks:**
1. Define TypeScript types
2. Create Zustand store for gallery state
3. Build API endpoint to scan runs and extract images
4. Implement metadata parsing from run files
5. Create utility functions for image indexing

**Files to Modify:**
- `src/server/server.ts` (add gallery routes)

### Phase 2: Core Gallery Components
**Files to Create:**
- `src/web/components/gallery/GalleryImageCard.tsx`
- `src/web/components/gallery/GalleryGrid.tsx`
- `src/web/components/gallery/GallerySearch.tsx`
- `src/web/components/gallery/hooks/useGalleryImages.ts`
- `src/web/components/gallery/hooks/useGallerySearch.ts`

**Tasks:**
1. Build image card component with thumbnail and metadata
2. Create responsive grid layout
3. Implement search bar with debouncing
4. Add Fuse.js for fuzzy search
5. Create custom hooks for data fetching

**Dependencies:**
- `npm install fuse.js` (fuzzy search)
- `npm install react-virtualized` or `react-window` (optional, for performance)

### Phase 3: Full Page Gallery
**Files to Create:**
- `src/web/components/gallery/GalleryPage.tsx`
- `src/web/components/gallery/GalleryFilters.tsx`
- `src/web/components/gallery/GalleryPreviewModal.tsx`

**Tasks:**
1. Build full page layout
2. Implement filter controls (aspect ratio, date, etc.)
3. Add sorting options
4. Create preview modal for full-size view
5. Add pagination or infinite scroll

**Files to Modify:**
- `src/web/App.tsx` (add route)

### Phase 4: Sidebar Widget
**Files to Create:**
- `src/web/components/gallery/GallerySidebar.tsx`

**Tasks:**
1. Build collapsible sidebar component
2. Implement compact card view
3. Add toggle button with smooth animation
4. Integrate with Studio Editor layout

**Files to Modify:**
- `src/web/components/studio/Editor/StudioEditor.tsx`
- `src/web/lib/studio/store.ts` (add gallery visibility state)
- `src/web/lib/studio/types.ts` (add gallery state to StudioState)

### Phase 5: Drag & Drop Integration
**Files to Create:**
- `src/web/components/gallery/GalleryDragLayer.tsx`
- `src/web/components/gallery/hooks/useImageDragDrop.ts`

**Tasks:**
1. Install react-dnd: `npm install react-dnd react-dnd-html5-backend`
2. Create drag source for gallery images
3. Create drop target for canvas
4. Implement custom drag layer for visual feedback
5. Add drop zone highlighting on canvas
6. Handle image replacement logic

**Files to Modify:**
- `src/web/components/studio/Editor/PreviewPanel.tsx` (add drop handlers)
- `src/web/components/gallery/GalleryImageCard.tsx` (make draggable)

### Phase 6: Polish & Optimization
**Tasks:**
1. Add loading skeletons
2. Implement error boundaries
3. Add toast notifications for actions
4. Optimize image loading (lazy loading, thumbnails)
5. Add keyboard shortcuts (Ctrl+G to toggle gallery)
6. Implement favorites and usage tracking
7. Add analytics/telemetry

**Files to Modify:**
- All gallery components (add loading states, error handling)
- `src/web/components/ui/toast.tsx` (if not exists, create)

---

## File Manifest

### New Files to Create (24 files)

#### Type Definitions
1. `src/web/lib/gallery/types.ts`

#### State Management
2. `src/web/lib/gallery/store.ts`
3. `src/web/lib/gallery/utils.ts`

#### API Layer
4. `src/server/api/gallery.ts`

#### Core Components
5. `src/web/components/gallery/GalleryPage.tsx`
6. `src/web/components/gallery/GallerySidebar.tsx`
7. `src/web/components/gallery/GalleryGrid.tsx`
8. `src/web/components/gallery/GalleryImageCard.tsx`
9. `src/web/components/gallery/GallerySearch.tsx`
10. `src/web/components/gallery/GalleryFilters.tsx`
11. `src/web/components/gallery/GalleryPreviewModal.tsx`
12. `src/web/components/gallery/GalleryDragLayer.tsx`

#### Hooks
13. `src/web/components/gallery/hooks/useGalleryImages.ts`
14. `src/web/components/gallery/hooks/useGallerySearch.ts`
15. `src/web/components/gallery/hooks/useImageDragDrop.ts`

#### Utilities
16. `src/web/lib/gallery/imageIndexer.ts` (scan runs directory)
17. `src/web/lib/gallery/searchEngine.ts` (Fuse.js wrapper)

#### Styles (if needed)
18. `src/web/components/gallery/Gallery.css` (optional, if Tailwind insufficient)

#### Tests (optional but recommended)
19. `src/web/components/gallery/__tests__/GalleryImageCard.test.tsx`
20. `src/web/components/gallery/__tests__/GallerySearch.test.tsx`
21. `src/web/lib/gallery/__tests__/searchEngine.test.ts`

#### Documentation
22. `documentation/gallery-widget-api.md` (API documentation)
23. `documentation/gallery-widget-usage.md` (User guide)
24. `documentation/gallery-widget-implementation.md` (this file)

### Files to Modify (7 files)

1. **`src/web/App.tsx`**
   - Add route for `/studio/gallery`

2. **`src/web/components/studio/Editor/StudioEditor.tsx`**
   - Import and render `<GallerySidebar />`
   - Adjust layout to accommodate sidebar

3. **`src/web/components/studio/Editor/PreviewPanel.tsx`**
   - Add drop zone handlers for drag & drop
   - Add visual feedback during drag operations
   - Implement image replacement logic

4. **`src/web/lib/studio/store.ts`**
   - Add `galleryVisible: boolean` to state
   - Add `TOGGLE_GALLERY` action

5. **`src/web/lib/studio/types.ts`**
   - Add gallery-related state to `StudioState` interface

6. **`src/server/server.ts`**
   - Register gallery API routes

7. **`package.json`**
   - Add dependencies: `fuse.js`, `react-dnd`, `react-dnd-html5-backend`

---

## Dependencies to Install

```bash
npm install fuse.js                    # Fuzzy search
npm install react-dnd                  # Drag and drop
npm install react-dnd-html5-backend    # HTML5 backend for react-dnd
npm install date-fns                   # Date formatting (if not already installed)
npm install react-window               # (Optional) Virtual scrolling for performance
```

---

## Search Implementation Details

### Fuse.js Configuration
```typescript
const fuseOptions = {
  keys: [
    { name: 'prompt', weight: 0.7 },        // Primary search field
    { name: 'slideText', weight: 0.2 },
    { name: 'metadata.topic', weight: 0.1 },
  ],
  threshold: 0.4,                            // 0 = perfect match, 1 = match anything
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  includeMatches: true,                      // For highlighting
};
```

### Search Query Examples
- "sunset beach" → Matches prompts containing these words
- "minimalist design" → Fuzzy matches "minimal design aesthetic"
- "portrait woman" → Matches various portrait prompts

---

## Performance Considerations

### Image Loading
- **Thumbnails**: Generate 200x200px thumbnails on server
- **Lazy Loading**: Use `loading="lazy"` on img tags
- **Virtual Scrolling**: For galleries with 100+ images
- **Caching**: Cache API responses in Zustand store

### Search Optimization
- **Debouncing**: 300ms delay on search input
- **Memoization**: Memoize search results with `useMemo`
- **Web Workers**: Consider moving Fuse.js to web worker for large datasets

### Data Fetching
- **Initial Load**: Fetch first 50 images
- **Pagination**: Load more on scroll
- **Prefetching**: Prefetch next page when user scrolls to 80%

---

## Accessibility

- **Keyboard Navigation**: Tab through images, Enter to select
- **Screen Readers**: Proper ARIA labels on all interactive elements
- **Focus Management**: Visible focus indicators
- **Alt Text**: Use image prompts as alt text
- **Color Contrast**: Ensure WCAG AA compliance

---

## Future Enhancements (Post-MVP)

1. **AI-Powered Search**: Semantic search using embeddings
2. **Bulk Operations**: Select multiple images, bulk delete/favorite
3. **Collections**: User-created image collections
4. **Image Editing**: Basic crop/filter before inserting
5. **Cloud Sync**: Sync gallery across devices
6. **Sharing**: Share gallery or individual images
7. **Export**: Export gallery as ZIP or PDF
8. **Advanced Filters**: Filter by color palette, style, etc.
9. **Image Variations**: Generate variations of existing images
10. **Usage Analytics**: Track which images perform best

---

## Testing Strategy

### Unit Tests
- Search engine logic
- Image indexer
- Filter functions
- Store actions

### Integration Tests
- API endpoints
- Drag & drop flow
- Search + filter combinations

### E2E Tests
- Full page gallery navigation
- Sidebar toggle and interaction
- Drag image from gallery to canvas
- Search and filter workflow

---

## Success Metrics

- **Performance**: Gallery loads in < 2 seconds
- **Search Speed**: Results appear in < 300ms
- **Drag & Drop**: Smooth 60fps animation
- **Usability**: Users can find and insert images in < 10 seconds

---

## Notes & Considerations

### Image Storage
- Currently images are stored in `data/runs/[runId]/`
- Consider creating a centralized `data/gallery/` folder for thumbnails
- Implement cleanup for deleted runs

### Metadata Persistence
- Store gallery metadata in `data/gallery/index.json`
- Rebuild index on server start if missing
- Incremental updates when new runs are created

### Error Handling
- Handle missing images gracefully
- Show placeholder for broken image URLs
- Retry failed image loads

### Security
- Validate image URLs to prevent XSS
- Sanitize search queries
- Rate limit API requests

---

## Open Questions

1. **Thumbnail Generation**: Server-side or client-side?
   - **Recommendation**: Server-side using Sharp or similar library

2. **Real-time Updates**: Should gallery auto-update when new images are generated?
   - **Recommendation**: Yes, use polling or WebSocket

3. **Image Deletion**: Hard delete or soft delete (archive)?
   - **Recommendation**: Soft delete with option to permanently delete later

4. **Cross-Run Image Reuse**: Track when same image is used in multiple runs?
   - **Recommendation**: Yes, add `usedInRuns: string[]` to metadata

5. **Mobile Support**: Should sidebar work on mobile?
   - **Recommendation**: On mobile, show as bottom sheet instead of sidebar

---

## Conclusion

This gallery widget will significantly enhance the Studio Editor by providing quick access to all generated images with powerful search and drag-drop capabilities. The dual-mode design (full page + sidebar) offers flexibility for different workflows.

**Estimated Development Time**: 3-4 weeks
- Phase 1-2: 1 week
- Phase 3-4: 1 week  
- Phase 5: 1 week
- Phase 6: 3-5 days

**Priority**: High - This feature directly improves content creation workflow efficiency.
