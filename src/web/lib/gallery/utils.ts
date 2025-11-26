import type { AspectRatio } from '../studio/types';
import type { GalleryImage } from './types';

/**
 * Generate a unique ID for a gallery image
 */
export function generateImageId(runId: string, slideId: string): string {
    return `img_${runId}_${slideId}`;
}

/**
 * Format date for display
 */
export function formatDate(isoString: string): string {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get aspect ratio dimensions
 */
export function getAspectRatioDimensions(aspectRatio: AspectRatio): { width: number; height: number } {
    const ratios: Record<AspectRatio, { width: number; height: number }> = {
        '1:1': { width: 1080, height: 1080 },
        '3:4': { width: 1080, height: 1440 },
        '4:3': { width: 1440, height: 1080 },
        '4:5': { width: 1080, height: 1350 },
        '9:16': { width: 1080, height: 1920 },
        '16:9': { width: 1920, height: 1080 },
    };
    return ratios[aspectRatio] || ratios['1:1'];
}

/**
 * Sort images by criteria
 */
export function sortImages(
    images: GalleryImage[],
    sortBy: 'newest' | 'oldest' | 'mostUsed'
): GalleryImage[] {
    const sorted = [...images];

    switch (sortBy) {
        case 'newest':
            return sorted.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
        case 'oldest':
            return sorted.sort((a, b) =>
                new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );
        case 'mostUsed':
            return sorted.sort((a, b) =>
                (b.usageCount || 0) - (a.usageCount || 0)
            );
        default:
            return sorted;
    }
}

/**
 * Filter images by criteria
 */
export function filterImages(
    images: GalleryImage[],
    filters: {
        aspectRatio?: AspectRatio[];
        composition?: ('single' | 'slideshow')[];
        favorites?: boolean;
        dateRange?: { start: string; end: string };
    }
): GalleryImage[] {
    let filtered = [...images];

    if (filters.aspectRatio && filters.aspectRatio.length > 0) {
        filtered = filtered.filter(img =>
            filters.aspectRatio!.includes(img.aspectRatio)
        );
    }

    if (filters.composition && filters.composition.length > 0) {
        filtered = filtered.filter(img =>
            filters.composition!.includes(img.composition)
        );
    }

    if (filters.favorites) {
        filtered = filtered.filter(img => img.isFavorite === true);
    }

    if (filters.dateRange) {
        const start = new Date(filters.dateRange.start).getTime();
        const end = new Date(filters.dateRange.end).getTime();
        filtered = filtered.filter(img => {
            const imgDate = new Date(img.createdAt).getTime();
            return imgDate >= start && imgDate <= end;
        });
    }

    return filtered;
}

/**
 * Validate image URL
 */
export function isValidImageUrl(url: string): boolean {
    try {
        const parsed = new URL(url, window.location.origin);
        return parsed.pathname.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null;
    } catch {
        return false;
    }
}

/**
 * Extract tags from prompt
 */
export function extractTags(prompt: string): string[] {
    // Simple tag extraction - split by common separators and take first few words
    const words = prompt
        .toLowerCase()
        .split(/[,;.\s]+/)
        .filter(word => word.length > 3)
        .slice(0, 5);

    return [...new Set(words)]; // Remove duplicates
}
