import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { orchestrator, RunInput } from './services/runOrchestrator';
import { generateMomMarketingPrompts } from './services/openrouter';
import { generateImagesForMomPrompts } from './services/fal';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

function isValidFutureDate(value: string) {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return date.getTime() > Date.now();
}

// Serve static files from data directory for images
app.use(
    '/runs',
    express.static(path.join(process.cwd(), 'data', 'runs'), {
        setHeaders: (res) => {
            res.setHeader('Access-Control-Allow-Origin', '*');
        },
    })
);

// API Endpoints

// POST /api/runs - Start a new run
app.post('/api/runs', async (req, res) => {
    try {
        const input: RunInput = req.body;

        if (!input.topic || !input.count) {
            return res.status(400).json({ error: 'Topic and count are required' });
        }

        const runId = await orchestrator.startRun(input);
        res.json({ runId });
    } catch (error: any) {
        console.error('Error starting run:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/mom-runs - Start a new MomMirror run
app.post('/api/mom-runs', async (req, res) => {
    try {
        const input: RunInput = {
            ...req.body,
            mode: 'mommarketing',
            topic: req.body.basePrompt, // Map basePrompt to topic
        };

        if (!input.topic || !input.count || !input.momConfig) {
            return res.status(400).json({ error: 'Base prompt, count, and momConfig are required' });
        }

        const runId = await orchestrator.startRun(input);
        res.json({ runId });
    } catch (error: any) {
        console.error('Error starting mom run:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/mom-runs/:id/schedule', (req, res) => {
    const runId = req.params.id;
    try {
        const schedules = orchestrator.getPostSchedules(runId);
        res.json({ runId, posts: schedules });
    } catch (error: any) {
        if (error.message === 'Run not found') {
            return res.status(404).json({ error: 'Run not found' });
        }
        res.status(500).json({ error: 'Failed to load schedules' });
    }
});

app.patch('/api/mom-runs/:id/posts/:postId/schedule', (req, res) => {
    const runId = req.params.id;
    const postId = req.params.postId;
    const { scheduledDate } = req.body as { scheduledDate?: string };

    if (!scheduledDate || !isValidFutureDate(scheduledDate)) {
        return res.status(400).json({ error: 'scheduledDate must be a future ISO-8601 string' });
    }

    try {
        const normalized = new Date(scheduledDate).toISOString();
        const result = orchestrator.setPostSchedule(runId, postId, normalized);
        res.json(result);
    } catch (error: any) {
        if (error.message === 'Run not found' || error.message === 'Post not found') {
            return res.status(404).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to update schedule' });
    }
});

app.delete('/api/mom-runs/:id', (req, res) => {
    const runId = req.params.id;
    try {
        orchestrator.deleteRun(runId);
        res.json({ success: true });
    } catch (error: any) {
        if (error.message === 'Run not found') {
            return res.status(404).json({ error: 'Run not found' });
        }
        res.status(500).json({ error: 'Failed to delete run' });
    }
});

// POST /api/mom-runs/:id/regenerate-images
app.post('/api/mom-runs/:id/regenerate-images', async (req, res) => {
    try {
        const runId = req.params.id;
        const { postIds } = req.body; // Array of string IDs
        await orchestrator.regenerateImages(runId, postIds);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error regenerating images:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/generate-draft
app.post('/api/generate-draft', async (req, res) => {
    try {
        const config = req.body;
        // Basic validation
        if (!config.topic || !config.audience) {
            return res.status(400).json({ error: 'Topic and audience are required' });
        }

        // Map frontend config to service config
        const requestedCount = typeof config.count === 'number' && config.count > 0 ? config.count : 1;

        const serviceConfig = {
            audience: config.audience,
            stylePreset: 'custom_infographic' as any,
            aspectRatio: '3:4' as any,
            model: config.model,
            basePrompt: config.topic,
            count: requestedCount,
        };

        const posts = await generateMomMarketingPrompts(serviceConfig);
        res.json({ posts });
    } catch (error: any) {
        console.error('Error generating draft:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/generate-visuals
app.post('/api/generate-visuals', async (req, res) => {
    try {
        const { slides, imageModel, topic, audience } = req.body;

        if (!slides || !slides.length) {
            return res.status(400).json({ error: 'Slides are required' });
        }

        const runId = new Date().toISOString().replace(/[:.]/g, '-');

        // Create RunState for Studio run
        const runState: any = {
            id: runId,
            status: 'IMAGES',
            topic: topic || 'Untitled',
            count: slides.length,
            mode: 'studio',
            steps: [
                { name: 'Generate Images', status: 'in-progress' }
            ],
            posts: slides.map((slide: any, index: number) => ({
                index,
                momPost: {
                    id: slide.id,
                    audience: audience || 'first_time_newborn',
                    basePrompt: topic,
                    stylePreset: 'custom_infographic',
                    aspectRatio: '3:4',
                    model: 'openrouter-gpt-4.1',
                    imageModel: imageModel,
                    overlayTitle: '',
                    overlaySubtitle: '',
                    hook: '',
                    imagePrompt: slide.variationPrompt || slide.text,
                    caption: slide.text,
                    cta: '',
                }
            }))
        };

        // Save initial state
        orchestrator.saveRunState(runId, runState);

        // Convert slides to MomPost format
        const momPosts = slides.map((slide: any) => ({
            id: slide.id,
            audience: audience || 'first_time_newborn',
            basePrompt: topic,
            stylePreset: 'custom_infographic',
            aspectRatio: '3:4',
            model: 'openrouter-gpt-4.1',
            imageModel: imageModel,
            overlayTitle: '',
            overlaySubtitle: '',
            hook: '',
            imagePrompt: slide.variationPrompt || slide.text,
            caption: slide.text,
            cta: '',
        }));

        const images = await generateImagesForMomPrompts(runId, momPosts, imageModel);

        console.log(`[INFO] Generated ${images.length} images for runId: ${runId}`);

        // Update run state with image URLs
        images.forEach(img => {
            if (runState.posts[img.index]) {
                runState.posts[img.index].rawImageUrl = `/runs/${runId}/${img.rawPath.split(/[\\/]/).pop()}`;
            }
        });

        runState.status = 'DONE';
        runState.steps[0].status = 'done';
        orchestrator.saveRunState(runId, runState);

        // Map results to URLs
        const results = images.map(img => ({
            index: img.index,
            imageUrl: `/runs/${runId}/${img.rawPath.split(/[\\/]/).pop()}`
        }));

        res.json({ results, runId, totalGenerated: images.length });
    } catch (error: any) {
        console.error('Error generating visuals:', error);
        res.status(500).json({
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
            timestamp: new Date().toISOString()
        });
    }
});

// GET /api/runs - List all runs
app.get('/api/runs', (_req, res) => {
    try {
        const runs = orchestrator.getAllRuns();
        res.json(runs);
    } catch (error: any) {
        console.error('Error fetching runs:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/runs/:id - Get run status
app.get('/api/runs/:id', (req, res) => {
    const runId = req.params.id;
    const state = orchestrator.getRunState(runId);

    if (!state) {
        return res.status(404).json({ error: 'Run not found' });
    }

    res.json(state);
});

// GET /api/scheduled-posts - Get all posts across all runs (scheduled and unscheduled)
app.get('/api/scheduled-posts', (req, res) => {
    try {
        const { runId, audience, status, mode, q } = req.query;

        // Get all runs
        const allRuns = orchestrator.getAllRuns();

        let allPosts: any[] = [];

        // Extract ALL posts from all runs (scheduled and unscheduled)
        for (const run of allRuns) {
            // Filter by mode if specified
            if (mode && run.mode !== mode) continue;

            for (const post of run.posts) {
                // Apply filters
                if (runId && run.id !== runId) continue;
                if (audience && run.momConfig?.audience !== audience) continue;

                // Determine post status
                const publishEntries = Object.values(post.publish ?? {}) as Array<{ status?: string }>;
                const publishStatus = publishEntries.find(entry => entry?.status)?.status;

                let postStatus: string;
                if (publishStatus) {
                    postStatus = publishStatus;
                } else if (post.scheduledDate) {
                    postStatus = 'scheduled';
                } else {
                    postStatus = 'draft'; // Unscheduled posts are drafts
                }

                if (status && postStatus !== status) continue;

                // Text search
                if (q) {
                    const searchText = q.toString().toLowerCase();
                    const caption = post.momPost?.caption || '';
                    const topic = run.topic || '';
                    if (!caption.toLowerCase().includes(searchText) &&
                        !topic.toLowerCase().includes(searchText)) {
                        continue;
                    }
                }

                const imageUrl = post.finalImageUrl || post.rawImageUrl;

                allPosts.push({
                    id: post.momPost?.id ? `${run.id}-${post.momPost.id}` : `${run.id}-${post.index}`,
                    runId: run.id,
                    title: (post.momPost?.caption || post.momPost?.hook || 'Untitled')
                        .substring(0, 50),
                    caption: post.momPost?.caption || '',
                    imageUrl: imageUrl ? `http://localhost:3000${imageUrl}` : undefined,
                    scheduledDate: post.scheduledDate, // Can be undefined for unscheduled
                    status: postStatus,
                    topic: run.topic,
                    audience: run.momConfig?.audience || 'unknown',
                    aspectRatio: run.momConfig?.aspectRatio || '9:16',
                    mode: run.mode || 'unknown'
                });
            }
        }

        // Sort: unscheduled first, then by scheduled date
        allPosts.sort((a, b) => {
            if (!a.scheduledDate && !b.scheduledDate) return 0;
            if (!a.scheduledDate) return -1;
            if (!b.scheduledDate) return 1;
            return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        });

        res.json(allPosts);
    } catch (error: any) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

// Serve frontend in production (optional for now as we use Vite dev server)
// if (process.env.NODE_ENV === 'production') {
//   app.use(express.static(path.join(__dirname, '../dist')));
//   app.get('*', (req, res) => {
//     res.sendFile(path.join(__dirname, '../dist/index.html'));
//   });
// }

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
