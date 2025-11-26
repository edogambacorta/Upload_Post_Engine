/**
 * Thumbnail Cache Utility
 * 
 * Manages localStorage-based caching of slide thumbnails.
 * Thumbnails are stored as data URLs and automatically persisted.
 */

const CACHE_KEY_PREFIX = 'studio-thumbnail-';
const CACHE_INDEX_KEY = 'studio-thumbnail-index';
const MAX_CACHE_SIZE = 50; // Maximum number of thumbnails to cache

interface ThumbnailCacheIndex {
    [slideId: string]: {
        timestamp: number;
        size: number;
    };
}

/**
 * Get the cache index from localStorage
 */
function getCacheIndex(): ThumbnailCacheIndex {
    try {
        const indexStr = localStorage.getItem(CACHE_INDEX_KEY);
        return indexStr ? JSON.parse(indexStr) : {};
    } catch (error) {
        console.error('[ThumbnailCache] Failed to read cache index:', error);
        return {};
    }
}

/**
 * Save the cache index to localStorage
 */
function saveCacheIndex(index: ThumbnailCacheIndex): void {
    try {
        localStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
    } catch (error) {
        console.error('[ThumbnailCache] Failed to save cache index:', error);
    }
}

/**
 * Clean up old thumbnails if cache is too large
 */
function cleanupOldThumbnails(index: ThumbnailCacheIndex): ThumbnailCacheIndex {
    const entries = Object.entries(index);
    
    if (entries.length <= MAX_CACHE_SIZE) {
        return index;
    }

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest entries
    const toRemove = entries.slice(0, entries.length - MAX_CACHE_SIZE);
    const newIndex: ThumbnailCacheIndex = {};

    for (const [slideId, meta] of entries) {
        if (!toRemove.find(([id]) => id === slideId)) {
            newIndex[slideId] = meta;
        } else {
            // Remove from localStorage
            try {
                localStorage.removeItem(`${CACHE_KEY_PREFIX}${slideId}`);
            } catch (error) {
                console.error('[ThumbnailCache] Failed to remove old thumbnail:', error);
            }
        }
    }

    return newIndex;
}

/**
 * Save a thumbnail to localStorage
 */
export function saveThumbnail(slideId: string, dataUrl: string): void {
    try {
        const key = `${CACHE_KEY_PREFIX}${slideId}`;
        localStorage.setItem(key, dataUrl);

        // Update index
        let index = getCacheIndex();
        index[slideId] = {
            timestamp: Date.now(),
            size: dataUrl.length,
        };

        // Cleanup if needed
        index = cleanupOldThumbnails(index);
        saveCacheIndex(index);

        console.log(`[ThumbnailCache] Saved thumbnail for slide ${slideId} (${Math.round(dataUrl.length / 1024)}KB)`);
    } catch (error) {
        console.error('[ThumbnailCache] Failed to save thumbnail:', error);
        
        // If quota exceeded, try to clear old thumbnails
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
            console.warn('[ThumbnailCache] Storage quota exceeded, clearing old thumbnails...');
            clearOldThumbnails(10); // Clear 10 oldest
            
            // Try again
            try {
                localStorage.setItem(`${CACHE_KEY_PREFIX}${slideId}`, dataUrl);
            } catch (retryError) {
                console.error('[ThumbnailCache] Failed to save thumbnail after cleanup:', retryError);
            }
        }
    }
}

/**
 * Load a thumbnail from localStorage
 */
export function loadThumbnail(slideId: string): string | null {
    try {
        const key = `${CACHE_KEY_PREFIX}${slideId}`;
        const dataUrl = localStorage.getItem(key);
        
        if (dataUrl) {
            console.log(`[ThumbnailCache] Loaded thumbnail for slide ${slideId}`);
            
            // Update timestamp
            const index = getCacheIndex();
            if (index[slideId]) {
                index[slideId].timestamp = Date.now();
                saveCacheIndex(index);
            }
        }
        
        return dataUrl;
    } catch (error) {
        console.error('[ThumbnailCache] Failed to load thumbnail:', error);
        return null;
    }
}

/**
 * Remove a specific thumbnail from cache
 */
export function removeThumbnail(slideId: string): void {
    try {
        const key = `${CACHE_KEY_PREFIX}${slideId}`;
        localStorage.removeItem(key);

        // Update index
        const index = getCacheIndex();
        delete index[slideId];
        saveCacheIndex(index);

        console.log(`[ThumbnailCache] Removed thumbnail for slide ${slideId}`);
    } catch (error) {
        console.error('[ThumbnailCache] Failed to remove thumbnail:', error);
    }
}

/**
 * Clear old thumbnails (by count)
 */
export function clearOldThumbnails(count: number): void {
    try {
        const index = getCacheIndex();
        const entries = Object.entries(index);
        
        // Sort by timestamp (oldest first)
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        // Remove oldest
        const toRemove = entries.slice(0, count);
        
        for (const [slideId] of toRemove) {
            removeThumbnail(slideId);
        }
        
        console.log(`[ThumbnailCache] Cleared ${toRemove.length} old thumbnails`);
    } catch (error) {
        console.error('[ThumbnailCache] Failed to clear old thumbnails:', error);
    }
}

/**
 * Clear all thumbnails from cache
 */
export function clearAllThumbnails(): void {
    try {
        const index = getCacheIndex();
        
        for (const slideId of Object.keys(index)) {
            const key = `${CACHE_KEY_PREFIX}${slideId}`;
            localStorage.removeItem(key);
        }
        
        localStorage.removeItem(CACHE_INDEX_KEY);
        console.log('[ThumbnailCache] Cleared all thumbnails');
    } catch (error) {
        console.error('[ThumbnailCache] Failed to clear all thumbnails:', error);
    }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
    count: number;
    totalSize: number;
    oldestTimestamp: number;
    newestTimestamp: number;
} {
    const index = getCacheIndex();
    const entries = Object.values(index);
    
    if (entries.length === 0) {
        return {
            count: 0,
            totalSize: 0,
            oldestTimestamp: 0,
            newestTimestamp: 0,
        };
    }
    
    const totalSize = entries.reduce((sum, meta) => sum + meta.size, 0);
    const timestamps = entries.map(meta => meta.timestamp);
    
    return {
        count: entries.length,
        totalSize,
        oldestTimestamp: Math.min(...timestamps),
        newestTimestamp: Math.max(...timestamps),
    };
}
