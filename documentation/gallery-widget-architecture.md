# Gallery Widget - Architecture & Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GALLERY WIDGET SYSTEM                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐         ┌──────────────────────┐     │
│  │   GalleryPage.tsx    │         │  GallerySidebar.tsx  │     │
│  │  (Full Page View)    │         │   (Editor Widget)    │     │
│  │                      │         │                      │     │
│  │  - Search Bar        │         │  - Compact Search    │     │
│  │  - Filters           │         │  - Scroll List       │     │
│  │  - Grid Layout       │         │  - Toggle Button     │     │
│  │  - Pagination        │         │  - Drag Source       │     │
│  └──────────────────────┘         └──────────────────────┘     │
│           │                                   │                 │
│           └───────────────┬───────────────────┘                 │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────┐        │
│  │         SHARED COMPONENTS                          │        │
│  ├────────────────────────────────────────────────────┤        │
│  │  - GalleryGrid.tsx                                 │        │
│  │  - GalleryImageCard.tsx (Draggable)                │        │
│  │  - GallerySearch.tsx                               │        │
│  │  - GalleryFilters.tsx                              │        │
│  │  - GalleryPreviewModal.tsx                         │        │
│  │  - GalleryDragLayer.tsx                            │        │
│  └────────────────────────────────────────────────────┘        │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BUSINESS LOGIC LAYER                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────┐        │
│  │         CUSTOM HOOKS                               │        │
│  ├────────────────────────────────────────────────────┤        │
│  │  - useGalleryImages.ts                             │        │
│  │    └─> Fetch, cache, paginate images               │        │
│  │  - useGallerySearch.ts                             │        │
│  │    └─> Fuzzy search with Fuse.js                   │        │
│  │  - useImageDragDrop.ts                             │        │
│  │    └─> Drag source & drop target logic             │        │
│  └────────────────────────────────────────────────────┘        │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────┐        │
│  │         STATE MANAGEMENT (Zustand)                 │        │
│  ├────────────────────────────────────────────────────┤        │
│  │  store.ts                                          │        │
│  │  - images: GalleryImage[]                          │        │
│  │  - searchQuery: string                             │        │
│  │  - filters: GalleryFilters                         │        │
│  │  - selectedImageId: string | null                  │        │
│  │                                                     │        │
│  │  Actions:                                          │        │
│  │  - loadImages()                                    │        │
│  │  - searchImages(query)                             │        │
│  │  - filterImages(filters)                           │        │
│  │  - toggleFavorite(id)                              │        │
│  │  - incrementUsage(id)                              │        │
│  └────────────────────────────────────────────────────┘        │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────┐        │
│  │         UTILITIES                                  │        │
│  ├────────────────────────────────────────────────────┤        │
│  │  - searchEngine.ts (Fuse.js wrapper)               │        │
│  │  - imageIndexer.ts (Scan runs directory)           │        │
│  │  - utils.ts (Helpers)                              │        │
│  └────────────────────────────────────────────────────┘        │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                           DATA LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────────────────────────────────────────┐        │
│  │         API ROUTES (Express)                       │        │
│  ├────────────────────────────────────────────────────┤        │
│  │  GET    /api/gallery/images                        │        │
│  │  GET    /api/gallery/images/:id                    │        │
│  │  POST   /api/gallery/images/:id/favorite           │        │
│  │  POST   /api/gallery/images/:id/usage              │        │
│  │  DELETE /api/gallery/images/:id                    │        │
│  └────────────────────────────────────────────────────┘        │
│                           │                                     │
│                           ▼                                     │
│  ┌────────────────────────────────────────────────────┐        │
│  │         FILE SYSTEM                                │        │
│  ├────────────────────────────────────────────────────┤        │
│  │  data/runs/                                        │        │
│  │  ├── [runId]/                                      │        │
│  │  │   ├── meta.json                                 │        │
│  │  │   ├── slide-0.png                               │        │
│  │  │   ├── slide-1.png                               │        │
│  │  │   └── ...                                       │        │
│  │  └── ...                                           │        │
│  │                                                     │        │
│  │  data/gallery/                                     │        │
│  │  ├── index.json (Searchable index)                 │        │
│  │  └── thumbnails/                                   │        │
│  │      ├── [imageId]-thumb.png                       │        │
│  │      └── ...                                       │        │
│  └────────────────────────────────────────────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Image Loading Flow

```
┌──────────┐
│  User    │
│  Opens   │
│ Gallery  │
└────┬─────┘
     │
     ▼
┌─────────────────────┐
│ GalleryPage/Sidebar │
│  useEffect()        │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ useGalleryImages()  │
│  - Check cache      │
│  - Fetch if needed  │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ API Request         │
│ GET /api/gallery/   │
│     images          │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Server Handler      │
│  - Read runs dir    │
│  - Parse meta.json  │
│  - Build response   │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Response            │
│ { images: [...] }   │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Zustand Store       │
│  - Update images[]  │
│  - Set loading=false│
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Re-render Gallery   │
│  - Show images      │
│  - Enable search    │
└─────────────────────┘
```

---

### 2. Search Flow

```
┌──────────┐
│  User    │
│  Types   │
│  Query   │
└────┬─────┘
     │
     ▼
┌─────────────────────┐
│ GallerySearch       │
│  - Debounce 300ms   │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ useGallerySearch()  │
│  - Get all images   │
│  - Apply Fuse.js    │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Fuse.js             │
│  - Fuzzy match      │
│  - Score results    │
│  - Highlight matches│
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Filtered Results    │
│  - Sorted by score  │
│  - Max 50 items     │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Update Store        │
│  - filteredImages[] │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Re-render Grid      │
│  - Show matches     │
│  - Show count       │
└─────────────────────┘
```

---

### 3. Drag & Drop Flow

```
┌──────────┐
│  User    │
│  Drags   │
│  Image   │
└────┬─────┘
     │
     ▼
┌─────────────────────┐
│ GalleryImageCard    │
│  - useDrag()        │
│  - Set drag data    │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ GalleryDragLayer    │
│  - Show preview     │
│  - Follow cursor    │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ PreviewPanel        │
│  - useDrop()        │
│  - Highlight zone   │
└────┬────────────────┘
     │
     ▼
┌──────────┐
│  User    │
│  Drops   │
│  Image   │
└────┬─────┘
     │
     ▼
┌─────────────────────┐
│ onImageDrop()       │
│  - Get image data   │
│  - Validate mode    │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Update Slide        │
│  - Replace imageUrl │
│  - Keep transform   │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Increment Usage     │
│ POST /api/gallery/  │
│      images/:id/    │
│      usage          │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Re-render Canvas    │
│  - Load new image   │
│  - Apply transform  │
└─────────────────────┘
```

---

### 4. Filter Flow

```
┌──────────┐
│  User    │
│ Selects  │
│  Filter  │
└────┬─────┘
     │
     ▼
┌─────────────────────┐
│ GalleryFilters      │
│  - Aspect ratio     │
│  - Date range       │
│  - Composition      │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Update Store        │
│  - filters object   │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ useGalleryImages()  │
│  - Apply filters    │
│  - Combine w/ search│
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Filter Logic        │
│  images.filter(img =>│
│    matchesFilters   │
│  )                  │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Filtered Results    │
│  - Matching images  │
└────┬────────────────┘
     │
     ▼
┌─────────────────────┐
│ Re-render Grid      │
│  - Show filtered    │
│  - Update count     │
└─────────────────────┘
```

---

## Component Hierarchy

### Full Page Gallery

```
GalleryPage
├── Header
│   ├── Title
│   └── Back Button
├── GallerySearch
│   ├── Input (debounced)
│   ├── Clear Button
│   └── Results Count
├── GalleryFilters
│   ├── Aspect Ratio Dropdown
│   ├── Date Range Picker
│   ├── Composition Toggle
│   └── Sort Dropdown
└── GalleryGrid
    ├── GalleryImageCard (x N)
    │   ├── Image Thumbnail
    │   ├── Prompt Text
    │   ├── Metadata Badge
    │   ├── Favorite Button
    │   └── Quick Actions
    │       ├── Download
    │       ├── Insert
    │       └── Preview
    └── Load More Button

GalleryPreviewModal (Portal)
├── Backdrop
├── Modal Container
│   ├── Close Button
│   ├── Full Image
│   ├── Metadata Panel
│   │   ├── Prompt
│   │   ├── Date
│   │   ├── Dimensions
│   │   └── Usage Count
│   └── Actions
│       ├── Download
│       ├── Favorite
│       ├── Insert
│       └── Delete
```

### Sidebar Widget

```
GallerySidebar
├── Collapsed State
│   └── Toggle Button (Vertical Text)
└── Expanded State
    ├── Header
    │   ├── Title
    │   └── Close Button
    ├── GallerySearch (Compact)
    │   └── Input
    └── Scroll Container
        └── GalleryImageCard (Compact) (x N)
            ├── Small Thumbnail
            ├── Prompt (1 line)
            └── Drag Handle
```

---

## State Management

### Gallery Store Structure

```typescript
interface GalleryStore {
  // Data
  images: GalleryImage[];
  
  // UI State
  isLoading: boolean;
  error: string | null;
  selectedImageId: string | null;
  
  // Search & Filters
  searchQuery: string;
  filters: GalleryFilters;
  sortBy: 'newest' | 'oldest' | 'mostUsed';
  
  // Computed
  filteredImages: GalleryImage[];  // Memoized
  
  // Actions
  loadImages: () => Promise<void>;
  searchImages: (query: string) => void;
  setFilters: (filters: Partial<GalleryFilters>) => void;
  setSortBy: (sort: 'newest' | 'oldest' | 'mostUsed') => void;
  toggleFavorite: (id: string) => Promise<void>;
  incrementUsage: (id: string) => Promise<void>;
  deleteImage: (id: string) => Promise<void>;
  selectImage: (id: string | null) => void;
}
```

### Studio Store Updates

```typescript
interface StudioState {
  // ... existing fields
  
  // NEW: Gallery visibility
  galleryVisible: boolean;
}

// NEW: Action
type StudioAction = 
  | { type: 'TOGGLE_GALLERY' }
  | ... existing actions
```

---

## Integration Points

### 1. Studio Editor Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Studio Editor                                     [Gallery]│
├──────┬──────────────────────────────────────────────────────┤
│      │                                                       │
│  G   │  ┌─────────────────────────────────────────────┐    │
│  A   │  │                                             │    │
│  L   │  │                                             │    │
│  L   │  │          Canvas (PreviewPanel)              │    │
│  E   │  │                                             │    │
│  R   │  │                                             │    │
│  Y   │  │                                             │    │
│      │  └─────────────────────────────────────────────┘    │
│  S   │                                                       │
│  I   │  [Slide Navigation]                                  │
│  D   │                                                       │
│  E   │  [Toolbar: Text Mode | Image Mode]                   │
│  B   │                                                       │
│  A   │                                                       │
│  R   │                                                       │
│      │                                                       │
└──────┴───────────────────────────────────────────────────────┘
```

### 2. Drag & Drop Zones

```
Gallery Sidebar          Canvas Area
┌──────────────┐        ┌─────────────────────┐
│ [Image 1] ───┼───────>│                     │
│ [Image 2]    │  Drag  │   Drop Zone         │
│ [Image 3]    │  ────> │   (Highlighted)     │
│ [Image 4]    │        │                     │
└──────────────┘        └─────────────────────┘
```

---

## API Request/Response Examples

### GET /api/gallery/images

**Request:**
```http
GET /api/gallery/images?search=sunset&aspectRatio=1:1&limit=20&offset=0
```

**Response:**
```json
{
  "images": [
    {
      "id": "img_abc123",
      "runId": "2025-11-25T16-46-59-405Z",
      "slideId": "slide-0",
      "imageUrl": "/data/runs/2025-11-25T16-46-59-405Z/slide-0.png",
      "thumbnailUrl": "/data/gallery/thumbnails/img_abc123-thumb.png",
      "prompt": "Beautiful sunset over ocean, warm colors, peaceful",
      "slideText": "Relax and unwind",
      "createdAt": "2025-11-25T16:47:23.000Z",
      "aspectRatio": "1:1",
      "composition": "single",
      "metadata": {
        "width": 1080,
        "height": 1080,
        "model": "fal-ai/flux/dev",
        "topic": "Wellness",
        "audience": "Health enthusiasts"
      },
      "usageCount": 3,
      "isFavorite": true,
      "tags": ["sunset", "ocean", "peaceful"]
    }
  ],
  "total": 156,
  "limit": 20,
  "offset": 0
}
```

### POST /api/gallery/images/:id/favorite

**Request:**
```http
POST /api/gallery/images/img_abc123/favorite
```

**Response:**
```json
{
  "success": true,
  "isFavorite": true
}
```

---

## Performance Optimizations

### 1. Image Loading Strategy

```
Initial Load:
├── Fetch first 50 images
├── Load thumbnails (lazy)
└── Prefetch next 50 in background

On Scroll:
├── Detect scroll position
├── Load more when 80% scrolled
└── Prefetch next batch

On Search:
├── Debounce input (300ms)
├── Search in-memory first
└── Fall back to API if needed
```

### 2. Caching Strategy

```
Memory Cache (Zustand):
├── All loaded images
├── Search results (memoized)
└── Filter results (memoized)

API Cache:
├── Cache-Control headers
└── ETag support

Browser Cache:
├── Thumbnails (1 week)
└── Full images (1 day)
```

### 3. Virtual Scrolling (Optional)

```
For galleries with 100+ images:
├── Use react-window
├── Render only visible items
├── Recycle DOM elements
└── Smooth scrolling
```

---

## Error Handling

### Error States

```typescript
// Loading error
{
  type: 'LOAD_ERROR',
  message: 'Failed to load gallery images',
  retry: () => loadImages()
}

// Search error
{
  type: 'SEARCH_ERROR',
  message: 'Search failed. Please try again.',
  fallback: 'Show all images'
}

// Drag & drop error
{
  type: 'DROP_ERROR',
  message: 'Failed to insert image. Switch to Image mode.',
  action: 'Switch to Image Mode'
}

// Network error
{
  type: 'NETWORK_ERROR',
  message: 'No internet connection',
  retry: true
}
```

---

## Accessibility Features

### Keyboard Navigation

```
Tab         → Navigate between images
Enter       → Select/preview image
Space       → Toggle favorite
Arrow Keys  → Navigate grid
Escape      → Close modal/sidebar
Ctrl+F      → Focus search
Ctrl+G      → Toggle gallery sidebar
```

### Screen Reader Support

```html
<!-- Image Card -->
<div role="button" aria-label="Image: Beautiful sunset, created Nov 25, 2025">
  <img alt="Beautiful sunset over ocean" />
  <button aria-label="Add to favorites">⭐</button>
  <button aria-label="Insert into canvas">➕</button>
</div>

<!-- Search -->
<input 
  aria-label="Search images by prompt or text"
  aria-describedby="search-results-count"
/>
<div id="search-results-count" role="status">
  Showing 24 of 156 images
</div>
```

---

## Testing Strategy

### Unit Tests

```typescript
// searchEngine.test.ts
describe('searchEngine', () => {
  it('should fuzzy match prompts', () => {
    const results = search('sunset', images);
    expect(results[0].prompt).toContain('sunset');
  });
  
  it('should rank by relevance', () => {
    const results = search('beach', images);
    expect(results[0].score).toBeLessThan(results[1].score);
  });
});

// imageIndexer.test.ts
describe('imageIndexer', () => {
  it('should scan runs directory', async () => {
    const images = await indexImages();
    expect(images.length).toBeGreaterThan(0);
  });
  
  it('should parse metadata correctly', () => {
    const image = parseRunMeta(mockMeta);
    expect(image.prompt).toBeDefined();
  });
});
```

### Integration Tests

```typescript
// GalleryPage.test.tsx
describe('GalleryPage', () => {
  it('should load and display images', async () => {
    render(<GalleryPage />);
    await waitFor(() => {
      expect(screen.getAllByRole('img')).toHaveLength(20);
    });
  });
  
  it('should filter by aspect ratio', async () => {
    render(<GalleryPage />);
    fireEvent.click(screen.getByText('1:1'));
    await waitFor(() => {
      const images = screen.getAllByRole('img');
      expect(images.every(img => 
        img.getAttribute('data-aspect') === '1:1'
      )).toBe(true);
    });
  });
});
```

### E2E Tests

```typescript
// gallery.e2e.ts
test('user can search and insert image', async ({ page }) => {
  await page.goto('/studio/editor');
  
  // Open gallery
  await page.click('[aria-label="Toggle gallery"]');
  
  // Search
  await page.fill('[aria-label="Search images"]', 'sunset');
  
  // Wait for results
  await page.waitForSelector('[data-testid="gallery-image"]');
  
  // Drag and drop
  const image = page.locator('[data-testid="gallery-image"]').first();
  const canvas = page.locator('[data-testid="canvas-drop-zone"]');
  await image.dragTo(canvas);
  
  // Verify image inserted
  await expect(canvas).toHaveAttribute('data-image-url', /sunset/);
});
```

---

## Deployment Checklist

- [ ] All dependencies installed
- [ ] Environment variables configured
- [ ] API routes registered
- [ ] Database migrations run (if applicable)
- [ ] Thumbnails directory created
- [ ] Gallery index built
- [ ] Tests passing
- [ ] Performance benchmarks met
- [ ] Accessibility audit passed
- [ ] Documentation complete
- [ ] Feature flags enabled
- [ ] Analytics tracking added
- [ ] Error monitoring configured

---

**Last Updated**: 2025-11-26
**Version**: 1.0
**Status**: Planning Complete
