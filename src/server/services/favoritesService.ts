import fs from 'fs/promises';
import path from 'path';

const FAVORITES_FILE = path.join(process.cwd(), 'data', 'gallery-favorites.json');

export interface FavoritesData {
    favorites: Record<string, boolean>;
    usageCounts: Record<string, number>;
}

/**
 * Service for managing gallery favorites and usage counts
 * Persists data to data/gallery-favorites.json
 */
class FavoritesService {
    private data: FavoritesData = {
        favorites: {},
        usageCounts: {}
    };
    private isLoaded = false;

    /**
     * Load favorites from disk
     */
    async load(): Promise<void> {
        try {
            const content = await fs.readFile(FAVORITES_FILE, 'utf-8');
            this.data = JSON.parse(content);
            this.isLoaded = true;
            console.log(`[FavoritesService] Loaded ${Object.keys(this.data.favorites).length} favorites and ${Object.keys(this.data.usageCounts).length} usage counts`);
        } catch (error) {
            // File doesn't exist yet, use defaults
            this.data = { favorites: {}, usageCounts: {} };
            this.isLoaded = true;
            console.log('[FavoritesService] No favorites file found, starting fresh');
        }
    }

    /**
     * Save favorites to disk
     */
    async save(): Promise<void> {
        try {
            // Ensure data directory exists
            const dataDir = path.dirname(FAVORITES_FILE);
            await fs.mkdir(dataDir, { recursive: true });

            await fs.writeFile(FAVORITES_FILE, JSON.stringify(this.data, null, 2));
            console.log('[FavoritesService] Saved favorites to disk');
        } catch (error) {
            console.error('[FavoritesService] Failed to save favorites:', error);
            throw error;
        }
    }

    /**
     * Toggle favorite status for an image
     * @returns New favorite state
     */
    async toggleFavorite(imageId: string): Promise<boolean> {
        if (!this.isLoaded) {
            await this.load();
        }

        const currentState = this.data.favorites[imageId] || false;
        const newState = !currentState;

        if (newState) {
            // Setting to true (favoriting)
            this.data.favorites[imageId] = true;
        } else {
            // Setting to false (unfavoriting) - remove from object to keep it clean
            delete this.data.favorites[imageId];
        }

        await this.save();
        console.log(`[FavoritesService] Toggled favorite for ${imageId}: ${currentState} → ${newState}`);
        return newState;
    }

    /**
     * Increment usage count for an image
     * @returns New usage count
     */
    async incrementUsage(imageId: string): Promise<number> {
        if (!this.isLoaded) {
            await this.load();
        }

        this.data.usageCounts[imageId] = (this.data.usageCounts[imageId] || 0) + 1;
        const newCount = this.data.usageCounts[imageId];

        await this.save();
        console.log(`[FavoritesService] Incremented usage for ${imageId}: ${newCount}`);
        return newCount;
    }

    /**
     * Check if an image is favorited
     */
    isFavorite(imageId: string): boolean {
        return this.data.favorites[imageId] || false;
    }

    /**
     * Get usage count for an image
     */
    getUsageCount(imageId: string): number {
        return this.data.usageCounts[imageId] || 0;
    }

    /**
     * Get all favorites
     */
    getAllFavorites(): Record<string, boolean> {
        return { ...this.data.favorites };
    }

    /**
     * Get all usage counts
     */
    getAllUsageCounts(): Record<string, number> {
        return { ...this.data.usageCounts };
    }
}

// Singleton instance
export const favoritesService = new FavoritesService();
