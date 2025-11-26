import fs from 'fs/promises';
import path from 'path';
import type { GalleryImage } from '../../web/lib/gallery/types';
import { favoritesService } from './favoritesService';

const RUNS_DIR = path.join(process.cwd(), 'data', 'runs');

class GalleryService {
    private index: GalleryImage[] = [];
    private isInitialized = false;

    constructor() {
        this.scan(); // Start initial scan
    }

    /**
     * Scan the file system to rebuild the index
     */
    async scan(): Promise<GalleryImage[]> {
        console.log('[GalleryService] Starting scan...');
        try {
            // Load favorites first
            await favoritesService.load();

            // Ensure runs directory exists
            try {
                await fs.access(RUNS_DIR);
            } catch {
                console.warn('[GalleryService] Runs directory not found, creating...');
                await fs.mkdir(RUNS_DIR, { recursive: true });
                this.index = [];
                return [];
            }

            const entries = await fs.readdir(RUNS_DIR, { withFileTypes: true });
            const runDirs = entries.filter(e => e.isDirectory()).map(e => e.name);

            const allImages: GalleryImage[] = [];

            for (const runId of runDirs) {
                const runPath = path.join(RUNS_DIR, runId);
                const metaPath = path.join(runPath, 'meta.json');

                try {
                    await fs.access(metaPath);
                } catch {
                    continue;
                }

                try {
                    const metaContent = await fs.readFile(metaPath, 'utf-8');
                    const meta = JSON.parse(metaContent);

                    const posts = meta.posts || [];

                    for (const post of posts) {
                        const imageUrl = post.finalImageUrl || post.rawImageUrl;
                        if (!imageUrl) continue;

                        const slideId = post.momPost?.id || `slide-${post.index}`;

                        const imageId = `img_${runId}_${slideId}`;

                        const galleryImage: GalleryImage = {
                            id: imageId,
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
                            usageCount: favoritesService.getUsageCount(imageId),
                            isFavorite: favoritesService.isFavorite(imageId)
                        };

                        allImages.push(galleryImage);
                    }
                } catch (err) {
                    console.warn(`[GalleryService] Failed to parse meta for run ${runId}`, err);
                }
            }

            // Sort by newest first
            this.index = allImages.sort((a, b) =>
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );

            this.isInitialized = true;
            console.log(`[GalleryService] Scan complete. Found ${this.index.length} images.`);
            return this.index;

        } catch (error) {
            console.error('[GalleryService] Scan failed:', error);
            return [];
        }
    }

    /**
     * Get all images from the index
     */
    getImages(): GalleryImage[] {
        return this.index;
    }

    /**
     * Add a new image to the index (called after generation)
     */
    addImage(image: GalleryImage) {
        this.index.unshift(image);
    }
}

// Singleton instance
export const galleryService = new GalleryService();
