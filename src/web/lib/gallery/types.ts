import type { AspectRatio, CompositionMode } from '../studio/types';

/**
 * Represents a single image in the gallery
 */
export interface GalleryImage {
    id: string;                    // Unique identifier
    runId: string;                 // Parent run ID
    slideId: string;               // Slide ID within run
    imageUrl: string;              // Full URL to image
    thumbnailUrl?: string;         // Optional thumbnail
    prompt: string;                // Image generation prompt
    slideText?: string;            // Associated slide text
    createdAt: string;             // ISO timestamp
    aspectRatio: AspectRatio;      // From studio types
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

/**
 * Filter options for gallery
 */
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

/**
 * Sort options for gallery
 */
export type GallerySortBy = 'newest' | 'oldest' | 'mostUsed';

/**
 * Gallery state interface
 */
export interface GalleryState {
    images: GalleryImage[];
    isLoading: boolean;
    error: string | null;
    searchQuery: string;
    filters: GalleryFilters;
    sortBy: GallerySortBy;
    selectedImageId: string | null;
}

/**
 * Drag and drop item type
 */
export interface GalleryDragItem {
    type: 'GALLERY_IMAGE';
    imageUrl: string;
    imageId: string;
    prompt: string;
    aspectRatio: AspectRatio;
}

/**
 * API response for gallery images
 */
export interface GalleryImagesResponse {
    images: GalleryImage[];
    total: number;
    limit: number;
    offset: number;
}
