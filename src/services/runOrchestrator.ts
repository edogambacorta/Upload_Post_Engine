import fs from 'fs';
import path from 'path';
import { generatePrompts, PostPrompt, generateMomMarketingPrompts } from './openrouter';
import { generateImagesForPrompts, generateImagesForMomPrompts } from './fal';
import { composeImages } from './compose';
import { publishImages } from './uploadPost';

export type AudienceSegment = 'pregnant_anxious' | 'first_time_newborn' | 'burned_out_parent' | 'female_overwhelm';

export type AspectRatio = '3:4' | '4:3' | '9:16';

export type ModelId = 'openrouter-sonnet-4.5' | 'openrouter-gpt-5.1';

export type ImageModelId = 'nanobanana-pro' | 'flux-schnell';

export type MomStylePreset =
    | 'night_instead_of_sleeping'
    | 'three_moms_one_day'
    | 'survival_mode'
    | 'custom_infographic';

export interface MomPost {
    id: string;
    audience: AudienceSegment;
    basePrompt: string;
    stylePreset: MomStylePreset;
    aspectRatio: AspectRatio;
    model: ModelId;
    imageModel?: ImageModelId;
    overlayTitle: string;
    overlaySubtitle: string;
    hook: string;
    imagePrompt: string;
    caption: string;
    cta: string;
    safetyFooter?: string;
    scheduledDate?: string;
}

export type RunStatus = 'PROMPTS' | 'IMAGES' | 'COMPOSING' | 'PUBLISHING' | 'DONE' | 'ERROR';

export type RunStep = {
    name: string;
    status: 'pending' | 'in-progress' | 'done' | 'error';
};

export type RunState = {
    id: string;
    status: RunStatus;
    topic: string; // Used as basePrompt for Mom runs
    count: number;
    mode?: 'generic' | 'mommarketing' | 'studio';
    momConfig?: {
        audience: AudienceSegment;
        stylePreset: MomStylePreset;
        aspectRatio: AspectRatio;
        model: ModelId;
        imageModel?: ImageModelId;
        basePrompt: string;
    };
    schedulePlan?: SchedulePlan;
    steps: RunStep[];
    posts: {
        index: number;
        prompt?: PostPrompt;
        momPost?: MomPost; // For Mom runs
        rawImageUrl?: string;
        finalImageUrl?: string;
        scheduledDate?: string;
        publish?: {
            [key in 'tiktok' | 'instagram']?: { status: string; url?: string };
        };
        studio?: {
            textBox?: any;
            imageTransform?: any;
            thumbnailUrl?: string;
        };
    }[];
    error?: string;
};

export type RunInput = {
    topic: string; // Acts as basePrompt for Mom runs
    count: number;
    style?: string;
    autoPublish?: boolean;
    platforms?: ('tiktok' | 'instagram')[];
    // MomMirror specific
    mode?: 'generic' | 'mommarketing' | 'studio';
    momConfig?: {
        audience: AudienceSegment;
        stylePreset: MomStylePreset;
        aspectRatio: AspectRatio;
        model: ModelId;
        imageModel?: ImageModelId;
    };
    schedulePlan?: SchedulePlan;
};

export type SchedulePlan = {
    startDate: string;
    intervalHours: number;
};

const RUNS_DIR = path.resolve(process.cwd(), 'data', 'runs');

export class RunOrchestrator {
    private activeRuns: Map<string, RunState> = new Map();

    constructor() {
        if (!fs.existsSync(RUNS_DIR)) {
            fs.mkdirSync(RUNS_DIR, { recursive: true });
        }
    }

    async startRun(input: RunInput): Promise<string> {
        const runId = new Date().toISOString().replace(/[:.]/g, '-');
        const initialState: RunState = {
            id: runId,
            status: 'PROMPTS',
            topic: input.topic,
            count: input.count,
            mode: input.mode || 'generic',
            momConfig: input.momConfig ? { ...input.momConfig, basePrompt: input.topic } : undefined,
            schedulePlan: input.schedulePlan,
            steps: [
                { name: 'prompts', status: 'pending' },
                { name: 'images', status: 'pending' },
                { name: 'composing', status: 'pending' },
                { name: 'publishing', status: 'pending' },
            ],
            posts: [],
        };

        this.saveRunState(runId, initialState);
        this.runPipeline(runId, input).catch(err => {
            console.error(`Run ${runId} failed:`, err);
            const state = this.getRunState(runId);
            if (state) {
                state.status = 'ERROR';
                state.error = err.message;
                this.saveRunState(runId, state);
            }
        });

        return runId;
    }

    getRunState(runId: string): RunState | null {
        // Try memory first
        if (this.activeRuns.has(runId)) {
            return this.activeRuns.get(runId)!;
        }

        // Try disk
        const statePath = path.join(RUNS_DIR, runId, 'meta.json');
        if (fs.existsSync(statePath)) {
            try {
                const data = fs.readFileSync(statePath, 'utf-8');
                return JSON.parse(data);
            } catch (e) {
                console.error(`Failed to read run state for ${runId}`, e);
            }
        }
        return null;
    }

    getAllRuns(): RunState[] {
        console.log('[Orchestrator] getAllRuns() called');
        console.log(`[Orchestrator] RUNS_DIR path: ${RUNS_DIR}`);
        console.log(`[Orchestrator] RUNS_DIR exists: ${fs.existsSync(RUNS_DIR)}`);

        const runs: RunState[] = [];
        if (fs.existsSync(RUNS_DIR)) {
            const entries = fs.readdirSync(RUNS_DIR, { withFileTypes: true });
            console.log(`[Orchestrator] Found ${entries.length} entries in RUNS_DIR`);

            for (const entry of entries) {
                console.log(`  - Entry: ${entry.name}, isDirectory: ${entry.isDirectory()}`);
                if (entry.isDirectory()) {
                    const state = this.getRunState(entry.name);
                    if (state) {
                        console.log(`    ✓ Loaded run: ${state.id} (mode: ${state.mode}, status: ${state.status})`);
                        runs.push(state);
                    } else {
                        console.log(`    ✗ Failed to load run state for: ${entry.name}`);
                    }
                }
            }
        }

        console.log(`[Orchestrator] Total runs loaded: ${runs.length}`);
        // Sort by creation time (newest first) - assuming ID is timestamp based
        return runs.sort((a, b) => b.id.localeCompare(a.id));
    }

    public saveRunState(runId: string, state: RunState) {
        this.activeRuns.set(runId, state);
        const runDir = path.join(RUNS_DIR, runId);
        if (!fs.existsSync(runDir)) {
            fs.mkdirSync(runDir, { recursive: true });
        }
        fs.writeFileSync(path.join(runDir, 'meta.json'), JSON.stringify(state, null, 2));
    }

    private updateStep(state: RunState, stepName: string, status: 'pending' | 'in-progress' | 'done' | 'error') {
        const step = state.steps.find(s => s.name === stepName);
        if (step) {
            step.status = status;
        }
    }

    private applySchedulePlan(state: RunState) {
        if (!state.schedulePlan || !state.posts.length) {
            return;
        }

        const slots = this.buildScheduleSlots(state.schedulePlan, state.posts.length);
        state.posts.forEach((post, index) => {
            if (!post.scheduledDate && slots[index]) {
                post.scheduledDate = slots[index];
            }
        });
    }

    private buildScheduleSlots(plan: SchedulePlan, count: number) {
        const start = new Date(plan.startDate);
        if (!Number.isFinite(plan.intervalHours) || plan.intervalHours <= 0 || Number.isNaN(start.getTime())) {
            return [];
        }
        const slots: string[] = [];
        for (let i = 0; i < count; i += 1) {
            const date = new Date(start.getTime() + i * plan.intervalHours * 60 * 60 * 1000);
            slots.push(date.toISOString());
        }
        return slots;
    }

    private async runPipeline(runId: string, input: RunInput) {
        let state = this.getRunState(runId)!;

        // 1. Prompts
        state.status = 'PROMPTS';
        this.updateStep(state, 'prompts', 'in-progress');
        this.saveRunState(runId, state);

        if (state.mode === 'mommarketing' && state.momConfig) {
            const momPosts = await generateMomMarketingPrompts({
                ...state.momConfig,
                count: state.count,
            });
            state.posts = momPosts.map((p, i) => ({
                index: i,
                momPost: p,
            }));
            // Save prompts.json for Mom runs
            const runDir = path.join(RUNS_DIR, runId);
            fs.writeFileSync(path.join(runDir, 'prompts.json'), JSON.stringify(momPosts, null, 2));
            this.applySchedulePlan(state);
        } else {
            const prompts = await generatePrompts(input.topic, input.count);
            state.posts = prompts.map((p, i) => ({
                index: i,
                prompt: p,
            }));
            this.applySchedulePlan(state);
        }

        this.updateStep(state, 'prompts', 'done');
        this.saveRunState(runId, state);

        // 2. Images
        state.status = 'IMAGES';
        this.updateStep(state, 'images', 'in-progress');
        this.saveRunState(runId, state);

        let generatedImages: any[] = [];
        if (state.mode === 'mommarketing' && state.momConfig) {
            // Filter posts that have momPost
            const momPosts = state.posts.map(p => p.momPost).filter((p): p is MomPost => !!p);
            generatedImages = await generateImagesForMomPrompts(runId, momPosts, state.momConfig.imageModel || 'flux-schnell');
        } else {
            const prompts = state.posts.map(p => p.prompt).filter((p): p is PostPrompt => !!p);
            generatedImages = await generateImagesForPrompts(runId, prompts);
        }

        generatedImages.forEach(img => {
            if (state.posts[img.index]) {
                state.posts[img.index].rawImageUrl = `/runs/${runId}/${path.basename(img.rawPath)}`;
            }
        });
        this.updateStep(state, 'images', 'done');
        this.saveRunState(runId, state);

        // 3. Composing
        state.status = 'COMPOSING';
        this.updateStep(state, 'composing', 'in-progress');
        this.saveRunState(runId, state);

        const composedImages = await composeImages(runId, generatedImages);

        composedImages.forEach(img => {
            if (state.posts[img.index]) {
                state.posts[img.index].finalImageUrl = `/runs/${runId}/${path.basename(img.finalPath)}`;
            }
        });
        this.updateStep(state, 'composing', 'done');
        this.saveRunState(runId, state);

        // 4. Publishing
        if (input.autoPublish) {
            state.status = 'PUBLISHING';
            this.updateStep(state, 'publishing', 'in-progress');
            this.saveRunState(runId, state);

            const captions = state.posts.map(p => {
                if (p.momPost) {
                    return `${p.momPost.overlayTitle} - ${p.momPost.overlaySubtitle}`;
                }
                return `${p.prompt?.overlayTitle} - ${p.prompt?.overlaySubtitle}`;
            });

            const schedules = state.posts.map(post => ({
                postId: post.momPost?.id ?? String(post.index),
                scheduledDate: post.scheduledDate,
            }));
            const publishResults = await publishImages(runId, composedImages, captions, schedules);

            publishResults.forEach((results, i) => {
                if (state.posts[i]) {
                    state.posts[i].publish = {};
                    results.forEach(res => {
                        state.posts[i].publish![res.platform] = {
                            status: res.status,
                            url: res.url
                        };
                    });
                }
            });
            this.updateStep(state, 'publishing', 'done');
        } else {
            this.updateStep(state, 'publishing', 'pending'); // Skipped
        }

        state.status = 'DONE';
        this.saveRunState(runId, state);
    }

    setPostSchedule(runId: string, postId: string, scheduledDate: string) {
        const state = this.getRunState(runId);
        if (!state) {
            throw new Error('Run not found');
        }
        const post = state.posts.find(p => p.momPost?.id === postId || String(p.index) === postId);
        if (!post) {
            throw new Error('Post not found');
        }
        post.scheduledDate = scheduledDate;
        if (post.momPost) {
            post.momPost.scheduledDate = scheduledDate;
        }
        this.saveRunState(runId, state);
        return {
            postId,
            scheduledDate,
        };
    }

    getPostSchedules(runId: string) {
        const state = this.getRunState(runId);
        if (!state) {
            throw new Error('Run not found');
        }
        return state.posts.map(post => ({
            postId: post.momPost?.id ?? String(post.index),
            scheduledDate: post.scheduledDate,
        }));
    }

    deleteRun(runId: string) {
        const state = this.getRunState(runId);
        if (!state) {
            throw new Error('Run not found');
        }
        this.activeRuns.delete(runId);
        const runDir = path.join(RUNS_DIR, runId);
        if (fs.existsSync(runDir)) {
            fs.rmSync(runDir, { recursive: true, force: true });
        }
    }

    async regenerateImages(runId: string, postIds?: string[]) {
        const state = this.getRunState(runId);
        if (!state || !state.momConfig) {
            throw new Error('Run not found or not a MomMirror run');
        }

        state.status = 'IMAGES';
        this.saveRunState(runId, state);

        const postsToRegenerate = state.posts.filter(p =>
            p.momPost && (!postIds || postIds.includes(p.momPost.id))
        ).map(p => p.momPost!).filter(p => !!p);

        if (postsToRegenerate.length === 0) {
            return;
        }

        const generatedImages = await generateImagesForMomPrompts(runId, postsToRegenerate);

        generatedImages.forEach(img => {
            // Find the post index by matching the prompt or ID if possible
            // Since generatedImages returns index based on the input array, we need to map back
            // But generateImagesForMomPrompts returns index relative to the input array
            // We need to be careful here.
            // Let's assume generateImagesForMomPrompts returns the index from the input array.
            // We need to find the original index in state.posts.

            const originalPost = state.posts.find(p => p.momPost?.id === postsToRegenerate[img.index].id);
            if (originalPost) {
                originalPost.rawImageUrl = `/runs/${runId}/${path.basename(img.rawPath)}`;
            }
        });

        // Re-compose
        state.status = 'COMPOSING';
        this.saveRunState(runId, state);

        // We only re-compose the regenerated ones? Or all?
        // composeImages takes generatedImages.
        // If we only pass new images, composeImages might overwrite or create new files.
        // Let's just re-compose the new ones.
        const composedImages = await composeImages(runId, generatedImages);

        composedImages.forEach(img => {
            const originalPost = state.posts.find(p => p.momPost?.id === postsToRegenerate[img.index].id);
            if (originalPost) {
                originalPost.finalImageUrl = `/runs/${runId}/${path.basename(img.finalPath)}`;
            }
        });

        state.status = 'DONE';
        this.saveRunState(runId, state);
    }

    async regeneratePrompts(runId: string) {
        const state = this.getRunState(runId);
        if (!state || !state.momConfig) {
            throw new Error('Run not found or not a MomMirror run');
        }

        // Reset steps
        state.status = 'PROMPTS';
        state.steps.forEach(s => s.status = 'pending');
        this.updateStep(state, 'prompts', 'in-progress');
        this.saveRunState(runId, state);

        try {
            // Re-run the pipeline from start, but keep the ID
            // We can reuse runPipeline logic but we need to be careful not to create a new run
            // Actually runPipeline takes runId, so we can just call it.
            // But runPipeline expects input. We need to reconstruct input from state.

            const input: RunInput = {
                topic: state.topic,
                count: state.count,
                mode: state.mode,
                momConfig: state.momConfig,
            };

            await this.runPipeline(runId, input);
        } catch (err: any) {
            console.error(`Regenerate prompts failed for ${runId}:`, err);
            state.status = 'ERROR';
            state.error = err.message;
            this.saveRunState(runId, state);
        }
    }
}

export const orchestrator = new RunOrchestrator();
