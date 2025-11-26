import Fuse from 'fuse.js';
import type { GalleryImage } from './types';

// Configuration for Fuse.js
const fuseOptions = {
    keys: [
        { name: 'prompt', weight: 0.7 },        // Primary search field
        { name: 'slideText', weight: 0.2 },     // Secondary
        { name: 'metadata.topic', weight: 0.1 },
        { name: 'tags', weight: 0.1 }
    ],
    threshold: 0.4,                            // 0 = perfect match, 1 = match anything
    distance: 100,
    minMatchCharLength: 2,
    includeScore: true,
    includeMatches: true,                      // For highlighting
    ignoreLocation: true,                      // Search anywhere in the string
    useExtendedSearch: true,
};

export class GallerySearchEngine {
    private fuse: Fuse<GalleryImage>;
    private images: GalleryImage[];

    constructor(images: GalleryImage[]) {
        this.images = images;
        this.fuse = new Fuse(images, fuseOptions);
    }

    /**
     * Update the search index with new images
     */
    setImages(images: GalleryImage[]) {
        this.images = images;
        this.fuse.setCollection(images);
    }

    /**
     * Perform a search
     */
    search(query: string): GalleryImage[] {
        if (!query || query.trim().length < 2) {
            return this.images;
        }

        const results = this.fuse.search(query);
        return results.map(result => result.item);
    }

    /**
     * Get the underlying Fuse instance if needed
     */
    getFuseInstance() {
        return this.fuse;
    }
}

// Singleton instance management if needed, though usually instantiated in the hook
export const createSearchEngine = (images: GalleryImage[]) => new GallerySearchEngine(images);
