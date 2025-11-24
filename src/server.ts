import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { orchestrator, RunInput } from './services/runOrchestrator';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from data directory for images
app.use('/runs', express.static(path.join(process.cwd(), 'data', 'runs')));

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

// POST /api/mom-runs/:id/regenerate-prompts
app.post('/api/mom-runs/:id/regenerate-prompts', async (req, res) => {
    try {
        const runId = req.params.id;
        await orchestrator.regeneratePrompts(runId);
        res.json({ success: true });
    } catch (error: any) {
        console.error('Error regenerating prompts:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/runs - List all runs
app.get('/api/runs', (req, res) => {
    const runs = orchestrator.getAllRuns();
    res.json(runs);
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
