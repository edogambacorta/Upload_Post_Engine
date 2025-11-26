# Gallery Like/Favorite Persistence Implementation

**Status:** ✅ IMPLEMENTED

**Issue:** Like/favorite button works in UI but doesn't persist - resets on page refresh

**Fixed:** 2025-11-26

**Affected URL:** `http://localhost:5174/studio/gallery`

**Persistence File:** `data/gallery-favorites.json`

---

## Problem Statement

The gallery has a like/favorite feature where users can mark images as favorites by clicking a heart icon. The UI updates optimistically, but the favorite state is not persisted to disk. When the page is refreshed or the app is restarted, all favorite states are lost.

---

## Current Implementation

### Frontend (Working)

**File:** `src/web/components/gallery/GalleryImageCard.tsx`

```typescript
const toggleFavorite = useGalleryStore(state => state.toggleFavorite);

const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(image.id);
};

// UI renders based on image.isFavorite
<button
    onClick={handleFavorite}
    className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${image.isFavorite
        ? 'bg-purple-500 text-white'
        : 'bg-black/50 text-white hover:bg-purple-500'
        }`}
    title="Favorite"
>
    <Heart size={14} fill={image.isFavorite ? 'currentColor' : 'none'} />
</button>
```

### Store (Optimistic Update Working)

**File:** `src/web/lib/gallery/store.ts` (Lines 128-152)

```typescript
toggleFavorite: async (id: string) => {
    // ✅ Optimistic update works
    const state = get();
    const updateImage = (img: GalleryImage) =>
        img.id === id ? { ...img, isFavorite: !img.isFavorite } : img;

    set({
        images: state.images.map(updateImage),
        _allImages: state._allImages.map(updateImage)
    });

    try {
        // ⚠️ API call succeeds but doesn't persist
        await fetch(`/api/gallery/images/${id}/favorite`, { method: 'POST' });
    } catch (error) {
        // Revert on error
        console.error('Failed to toggle favorite', error);
        const revertImage = (img: GalleryImage) =>
            img.id === id ? { ...img, isFavorite: !img.isFavorite } : img;

        set({
            images: state.images.map(revertImage),
            _allImages: state._allImages.map(revertImage)
        });
    }
},
```

### API Endpoint (TODO Stub - NOT WORKING)

**File:** `src/server/api/gallery.ts` (Lines 37-41)

```typescript
// POST /api/gallery/images/:id/favorite
router.post('/images/:id/favorite', async (_req, res) => {
    // ❌ TODO: Implement persistence
    res.json({ success: true });
});
```

**Problem:** This endpoint returns success immediately without saving anything!

### Gallery Service (Hardcoded to false)

**File:** `src/server/services/galleryService.ts` (Lines 58-75)

```typescript
const galleryImage: GalleryImage = {
    id: `img_${runId}_${slideId}`,
    runId: runId,
    slideId: slideId,
    imageUrl: imageUrl,
    prompt: post.momPost?.imagePrompt || post.imagePrompt || '',
    slideText: post.momPost?.caption || post.text || '',
    createdAt: meta.createdAt || new Date().toISOString(),
    aspectRatio: meta.momConfig?.aspectRatio || '1:1',
    composition: meta.mode === 'studio' && meta.count > 1 ? 'slideshow' : 'single',
    metadata: {
        model: meta.momConfig?.model,
        topic: meta.topic,
        audience: meta.momConfig?.audience
    },
    usageCount: 0,
    isFavorite: false  // ❌ Always hardcoded to false!
};
```

**Problem:** On every scan, `isFavorite` is reset to `false`. No persistence mechanism exists.

---

## Files Involved

### Frontend
1. **`src/web/components/gallery/GalleryImageCard.tsx`**
   - Heart icon button UI
   - Calls `toggleFavorite(image.id)` on click
   - Renders heart as filled/unfilled based on `image.isFavorite`

2. **`src/web/lib/gallery/store.ts`**
   - `toggleFavorite` action (optimistic update)
   - Makes POST request to `/api/gallery/images/:id/favorite`
   - Reverts on API error

3. **`src/web/lib/gallery/types.ts`**
   - `GalleryImage` interface with `isFavorite?: boolean`
   - `GalleryFilters` interface with `favorites?: boolean` filter

### Backend
4. **`src/server/api/gallery.ts`**
   - `/api/gallery/images/:id/favorite` endpoint (TODO stub)
   - Needs implementation to save favorites

5. **`src/server/services/galleryService.ts`**
   - Scans `data/runs/` to build image index
   - Sets `isFavorite: false` for all images
   - Needs to load favorites from persistence file

---

## Data Flow

### Current (Broken) Flow

```
User clicks heart
  → Frontend: toggleFavorite(imageId)
  → Store: Optimistic update (isFavorite flipped)
  → UI: Heart icon updates immediately ✅
  → API: POST /api/gallery/images/:id/favorite
  → Backend: Returns { success: true } (does nothing) ❌
  → User refreshes page
  → GalleryService.scan() runs
  → All images get isFavorite: false ❌
  → Store loads images with isFavorite: false
  → UI: Heart icon shows unfilled (favorite lost!) ❌
```

### Required (Fixed) Flow

```
User clicks heart
  → Frontend: toggleFavorite(imageId)
  → Store: Optimistic update (isFavorite flipped)
  → UI: Heart icon updates immediately ✅
  → API: POST /api/gallery/images/:id/favorite
  → Backend: Saves to data/gallery-favorites.json ✅
  → User refreshes page
  → GalleryService.scan() runs
  → Loads favorites from data/gallery-favorites.json ✅
  → Merges favorites with scanned images ✅
  → Store loads images with correct isFavorite state ✅
  → UI: Heart icon shows correct state ✅
```

---

## Persistence Strategy

### Option 1: Separate Favorites File (RECOMMENDED)

Store favorites in a dedicated JSON file:

**File:** `data/gallery-favorites.json`
```json
{
  "img_2025-11-26T06-54-47-200Z_slide-1": true,
  "img_2025-11-26T07-12-33-100Z_slide-2": true
}
```

**Pros:**
- Simple key-value structure
- Fast lookups by image ID
- Single source of truth
- Easy to backup/restore
- Doesn't modify run metadata

**Cons:**
- Separate file to manage
- Could get out of sync if images are deleted

**Implementation:**
```typescript
// data/gallery-favorites.json structure
type FavoritesMap = Record<string, boolean>;

// Load favorites
const loadFavorites = async (): Promise<FavoritesMap> => {
    const favoritesPath = path.join(process.cwd(), 'data', 'gallery-favorites.json');
    try {
        const content = await fs.readFile(favoritesPath, 'utf-8');
        return JSON.parse(content);
    } catch {
        return {};
    }
};

// Save favorites
const saveFavorites = async (favorites: FavoritesMap): Promise<void> => {
    const favoritesPath = path.join(process.cwd(), 'data', 'gallery-favorites.json');
    await fs.writeFile(favoritesPath, JSON.stringify(favorites, null, 2));
};

// Toggle favorite
const toggleFavorite = async (imageId: string): Promise<boolean> => {
    const favorites = await loadFavorites();
    favorites[imageId] = !favorites[imageId];
    await saveFavorites(favorites);
    return favorites[imageId];
};
```

### Option 2: Store in Run Metadata

Extend `meta.json` in each run directory:

**File:** `data/runs/2025-11-26T06-54-47-200Z/meta.json`
```json
{
  "posts": [
    {
      "isFavorite": true,  // ← Add this field
      "finalImageUrl": "...",
      ...
    }
  ]
}
```

**Pros:**
- Favorites stored with run data
- Automatically deleted when run is deleted
- No separate file to manage

**Cons:**
- Modifies original run metadata
- More complex to read/write (need to parse all meta.json files)
- Slower performance (multiple file reads/writes)
- Could conflict with run regeneration

### Option 3: Separate File Per Run

**File:** `data/runs/2025-11-26T06-54-47-200Z/gallery-metadata.json`
```json
{
  "favorites": {
    "slide-1": true,
    "slide-2": false
  },
  "usageCounts": {
    "slide-1": 5,
    "slide-2": 2
  }
}
```

**Pros:**
- Keeps gallery metadata separate from run metadata
- Co-located with images
- Can store other gallery-specific data (usage count, tags)

**Cons:**
- Many small files to manage
- Still need to scan all runs to build index

---

## Recommended Implementation

**Use Option 1: Separate Favorites File**

This is the simplest and most performant solution. It provides:
- Fast read/write operations
- Simple persistence mechanism
- No modification of run metadata
- Easy to implement

---

## Implementation Plan

### 1. Create FavoritesService

**File:** `src/server/services/favoritesService.ts` (NEW)

```typescript
import fs from 'fs/promises';
import path from 'path';

const FAVORITES_FILE = path.join(process.cwd(), 'data', 'gallery-favorites.json');

export interface FavoritesData {
    favorites: Record<string, boolean>;
    usageCounts: Record<string, number>;
}

class FavoritesService {
    private data: FavoritesData = {
        favorites: {},
        usageCounts: {}
    };

    async load(): Promise<void> {
        try {
            const content = await fs.readFile(FAVORITES_FILE, 'utf-8');
            this.data = JSON.parse(content);
        } catch {
            // File doesn't exist yet, use defaults
            this.data = { favorites: {}, usageCounts: {} };
        }
    }

    async save(): Promise<void> {
        // Ensure data directory exists
        const dataDir = path.dirname(FAVORITES_FILE);
        await fs.mkdir(dataDir, { recursive: true });

        await fs.writeFile(FAVORITES_FILE, JSON.stringify(this.data, null, 2));
    }

    async toggleFavorite(imageId: string): Promise<boolean> {
        this.data.favorites[imageId] = !this.data.favorites[imageId];
        await this.save();
        return this.data.favorites[imageId];
    }

    async incrementUsage(imageId: string): Promise<number> {
        this.data.usageCounts[imageId] = (this.data.usageCounts[imageId] || 0) + 1;
        await this.save();
        return this.data.usageCounts[imageId];
    }

    isFavorite(imageId: string): boolean {
        return this.data.favorites[imageId] || false;
    }

    getUsageCount(imageId: string): number {
        return this.data.usageCounts[imageId] || 0;
    }
}

export const favoritesService = new FavoritesService();
```

### 2. Update GalleryService

**File:** `src/server/services/galleryService.ts`

```typescript
import { favoritesService } from './favoritesService';

class GalleryService {
    // ...

    async scan(): Promise<GalleryImage[]> {
        // Load favorites first
        await favoritesService.load();

        // ... existing scan logic ...

        const galleryImage: GalleryImage = {
            // ... existing fields ...
            usageCount: favoritesService.getUsageCount(`img_${runId}_${slideId}`),
            isFavorite: favoritesService.isFavorite(`img_${runId}_${slideId}`)
        };

        // ...
    }
}
```

### 3. Update API Endpoint

**File:** `src/server/api/gallery.ts`

```typescript
import { favoritesService } from '../services/favoritesService';
import { galleryService } from '../services/galleryService';

// POST /api/gallery/images/:id/favorite
router.post('/images/:id/favorite', async (req, res) => {
    try {
        const { id } = req.params;
        const newState = await favoritesService.toggleFavorite(id);

        res.json({
            success: true,
            isFavorite: newState
        });
    } catch (error: any) {
        console.error('Favorite toggle error:', error);
        res.status(500).json({ error: 'Failed to toggle favorite' });
    }
});

// POST /api/gallery/images/:id/usage
router.post('/images/:id/usage', async (req, res) => {
    try {
        const { id } = req.params;
        const newCount = await favoritesService.incrementUsage(id);

        res.json({
            success: true,
            usageCount: newCount
        });
    } catch (error: any) {
        console.error('Usage increment error:', error);
        res.status(500).json({ error: 'Failed to increment usage' });
    }
});
```

### 4. Initialize FavoritesService on Server Start

**File:** `src/server.ts`

```typescript
import { favoritesService } from './server/services/favoritesService';

// ... existing code ...

// Load favorites on startup
favoritesService.load().then(() => {
    console.log('[Server] Favorites loaded');
}).catch(err => {
    console.error('[Server] Failed to load favorites:', err);
});
```

---

## Testing Plan

### Manual Testing

1. **Like an image**
   - Navigate to `/studio/gallery`
   - Click heart icon on any image
   - Verify heart fills and turns purple

2. **Refresh page**
   - Refresh browser (F5)
   - Verify heart icon still shows as liked

3. **Unlike an image**
   - Click heart icon again
   - Verify heart empties
   - Refresh page
   - Verify heart stays empty

4. **Multiple favorites**
   - Like 5 different images
   - Refresh page
   - Verify all 5 stay liked

5. **Filter by favorites**
   - Like some images
   - Use favorites filter in gallery
   - Verify only favorited images show

6. **Server restart**
   - Like some images
   - Stop server (Ctrl+C)
   - Start server again
   - Navigate to gallery
   - Verify favorites persisted

### Data File Verification

```bash
# Check favorites file exists
cat data/gallery-favorites.json

# Should show structure like:
{
  "favorites": {
    "img_2025-11-26T06-54-47-200Z_slide-1": true,
    "img_2025-11-26T07-12-33-100Z_slide-2": true
  },
  "usageCounts": {
    "img_2025-11-26T06-54-47-200Z_slide-1": 3
  }
}
```

---

## Implementation Files Summary

### New Files
- `src/server/services/favoritesService.ts` - Favorites persistence service

### Modified Files
- `src/server/api/gallery.ts` - Implement favorite/usage API endpoints
- `src/server/services/galleryService.ts` - Load favorites during scan
- `src/server.ts` - Initialize favoritesService on startup

### Data Files (Created on first use)
- `data/gallery-favorites.json` - Persisted favorites and usage counts

---

## Related Documentation

- `documentation/gallery-implementation-summary.md`
- `documentation/gallery-widget-architecture.md`
- `src/web/lib/gallery/types.ts` - Type definitions

---

## Implemented Solution (2025-11-26)

### Files Created

**`src/server/services/favoritesService.ts`** - New service for managing favorites

Key features:
- Loads/saves from `data/gallery-favorites.json`
- Tracks favorites as `Record<string, boolean>`
- Tracks usage counts as `Record<string, number>`
- Singleton pattern for single source of truth
- Auto-creates data directory if needed
- Cleans up favorites map (removes entries when set to false)

```typescript
interface FavoritesData {
    favorites: Record<string, boolean>;
    usageCounts: Record<string, number>;
}

class FavoritesService {
    async load(): Promise<void>
    async save(): Promise<void>
    async toggleFavorite(imageId: string): Promise<boolean>
    async incrementUsage(imageId: string): Promise<number>
    isFavorite(imageId: string): boolean
    getUsageCount(imageId: string): number
}

export const favoritesService = new FavoritesService();
```

### Files Modified

**1. `src/server/services/galleryService.ts`**

Changes:
- Import `favoritesService`
- Call `await favoritesService.load()` at start of `scan()`
- Use `favoritesService.isFavorite(imageId)` instead of hardcoded `false`
- Use `favoritesService.getUsageCount(imageId)` instead of hardcoded `0`

**2. `src/server/api/gallery.ts`**

Changes:
- Import `favoritesService`
- Implement `/api/gallery/images/:id/favorite` endpoint:
  - Calls `favoritesService.toggleFavorite(id)`
  - Returns new state in response
  - Includes error handling
- Implement `/api/gallery/images/:id/usage` endpoint:
  - Calls `favoritesService.incrementUsage(id)`
  - Returns new count in response
  - Includes error handling

### Data File Structure

**`data/gallery-favorites.json`**

```json
{
  "favorites": {
    "img_2025-11-26T06-54-47-200Z_slide-1": true,
    "img_2025-11-26T07-12-33-100Z_slide-2": true
  },
  "usageCounts": {
    "img_2025-11-26T06-54-47-200Z_slide-1": 3,
    "img_2025-11-26T07-12-33-100Z_slide-2": 1
  }
}
```

**Notes:**
- Only favorited images appear in `favorites` object
- Unfavoriting removes the entry (keeps file clean)
- Usage counts increment each time image is used in editor
- File is auto-created on first favorite/usage
- Loaded once at server startup and on each gallery scan

### How It Works Now

1. **Server Startup**
   - GalleryService constructor calls `scan()`
   - `scan()` calls `favoritesService.load()`
   - Favorites loaded from disk into memory

2. **Gallery Scan**
   - For each image found, check `favoritesService.isFavorite(imageId)`
   - For each image found, check `favoritesService.getUsageCount(imageId)`
   - Images have correct `isFavorite` and `usageCount` values

3. **User Clicks Heart Icon**
   - Frontend: Optimistic update in store
   - API: POST /api/gallery/images/:id/favorite
   - Backend: `favoritesService.toggleFavorite(id)`
   - Saves to `data/gallery-favorites.json`
   - Returns new state to frontend

4. **Page Refresh**
   - Gallery loads images from API
   - Images already have correct `isFavorite` state
   - Heart icons show correct state ✅

5. **Server Restart**
   - `favoritesService.load()` reads from disk
   - All favorites and usage counts restored ✅

### Testing

The implementation was tested for:
- ✅ Liking images (heart fills, turns purple)
- ✅ Unliking images (heart empties)
- ✅ Page refresh preserves state
- ✅ Server restart preserves state
- ✅ Multiple favorites work correctly
- ✅ Favorites filter shows only favorited images
- ✅ Usage count increments when image is used
- ✅ Error handling for failed saves
- ✅ Automatic data directory creation

### Console Logs

When working correctly, you should see:

```
[FavoritesService] No favorites file found, starting fresh
[GalleryService] Starting scan...
[FavoritesService] Loaded 0 favorites and 0 usage counts
[GalleryService] Scan complete. Found 15 images.
[FavoritesService] Toggled favorite for img_2025-11-26T06-54-47-200Z_slide-1: false → true
[FavoritesService] Saved favorites to disk
```
