import { create } from 'zustand';
import type { GalleryState, GalleryImage, GalleryFilters, GallerySortBy } from './types';
import { filterImages, sortImages } from './utils';
import { createSearchEngine, GallerySearchEngine } from './searchEngine';

interface GalleryStore extends GalleryState {
    // Actions
    loadImages: () => Promise<void>;
    scanImages: () => Promise<void>;
    setSearchQuery: (query: string) => void;
    setFilters: (filters: Partial<GalleryFilters>) => void;
    setSortBy: (sortBy: GallerySortBy) => void;
    toggleFavorite: (id: string) => Promise<void>;
    incrementUsage: (id: string) => Promise<void>;
    selectImage: (id: string | null) => void;

    // Internal
    _searchEngine: GallerySearchEngine | null;
    _allImages: GalleryImage[]; // Keep track of all images before filtering
}

export const useGalleryStore = create<GalleryStore>((set, get) => ({
    // Initial State
    images: [],
    isLoading: false,
    error: null,
    searchQuery: '',
    filters: {},
    sortBy: 'newest',
    selectedImageId: null,
    _searchEngine: null,
    _allImages: [],

    // Actions
    loadImages: async () => {
        set({ isLoading: true, error: null });
        try {
            const response = await fetch('/api/gallery/images');
            if (!response.ok) throw new Error('Failed to fetch images');

            const data = await response.json();
            const images: GalleryImage[] = data.images;

            const searchEngine = createSearchEngine(images);

            set({
                images,
                _allImages: images,
                isLoading: false,
                _searchEngine: searchEngine
            });

            // Apply current filters/sort if any exist (though usually empty on load)
            const state = get();
            if (state.searchQuery || Object.keys(state.filters).length > 0) {
                // Re-run filter logic
                const query = state.searchQuery;
                let result = query ? searchEngine.search(query) : images;
                result = filterImages(result, state.filters);
                result = sortImages(result, state.sortBy);
                set({ images: result });
            } else {
                // Just sort
                set({ images: sortImages(images, state.sortBy) });
            }

        } catch (error) {
            console.error('Gallery load error:', error);
            set({ isLoading: false, error: (error as Error).message });
        }
    },

    scanImages: async () => {
        set({ isLoading: true, error: null });
        try {
            await fetch('/api/gallery/scan', { method: 'POST' });
            await get().loadImages();
        } catch (error) {
            console.error('Gallery scan error:', error);
            set({ isLoading: false, error: (error as Error).message });
        }
    },

    setSearchQuery: (query: string) => {
        set({ searchQuery: query });
        const state = get();

        // 1. Search
        let result = state._searchEngine
            ? state._searchEngine.search(query)
            : state._allImages;

        // 2. Filter
        result = filterImages(result, state.filters);

        // 3. Sort
        result = sortImages(result, state.sortBy);

        set({ images: result });
    },

    setFilters: (newFilters: Partial<GalleryFilters>) => {
        const state = get();
        const filters = { ...state.filters, ...newFilters };
        set({ filters });

        // 1. Search (re-use current query results if optimized, but for now re-run)
        let result = state._searchEngine
            ? state._searchEngine.search(state.searchQuery)
            : state._allImages;

        // 2. Filter
        result = filterImages(result, filters);

        // 3. Sort
        result = sortImages(result, state.sortBy);

        set({ images: result });
    },

    setSortBy: (sortBy: GallerySortBy) => {
        set({ sortBy });
        const state = get();
        const sorted = sortImages(state.images, sortBy);
        set({ images: sorted });
    },

    toggleFavorite: async (id: string) => {
        // Optimistic update
        const state = get();
        const updateImage = (img: GalleryImage) =>
            img.id === id ? { ...img, isFavorite: !img.isFavorite } : img;

        set({
            images: state.images.map(updateImage),
            _allImages: state._allImages.map(updateImage)
        });

        try {
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

    incrementUsage: async (id: string) => {
        // Optimistic update
        const state = get();
        const updateImage = (img: GalleryImage) =>
            img.id === id ? { ...img, usageCount: (img.usageCount || 0) + 1 } : img;

        set({
            images: state.images.map(updateImage),
            _allImages: state._allImages.map(updateImage)
        });

        try {
            await fetch(`/api/gallery/images/${id}/usage`, { method: 'POST' });
        } catch (error) {
            console.error('Failed to increment usage', error);
        }
    },

    selectImage: (id: string | null) => {
        set({ selectedImageId: id });
    }
}));
