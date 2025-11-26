import express from 'express';
import { galleryService } from '../services/galleryService';
import { favoritesService } from '../services/favoritesService';

const router = express.Router();

// GET /api/gallery/images
router.get('/images', async (_req, res) => {
    try {
        const images = galleryService.getImages();

        res.json({
            images,
            total: images.length,
            limit: images.length,
            offset: 0
        });
    } catch (error: any) {
        console.error('Gallery API Error:', error);
        res.status(500).json({ error: 'Failed to load gallery images' });
    }
});

// POST /api/gallery/scan
router.post('/scan', async (_req, res) => {
    try {
        const images = await galleryService.scan();
        res.json({
            success: true,
            count: images.length
        });
    } catch (error: any) {
        console.error('Gallery Scan Error:', error);
        res.status(500).json({ error: 'Failed to scan gallery' });
    }
});

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

export default router;
