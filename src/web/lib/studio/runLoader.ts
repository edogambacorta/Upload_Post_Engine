import { PostType, Slide } from './types';

interface RunPost {
    index: number;
    rawImageUrl?: string;
    finalImageUrl?: string;
    momPost?: {
        id?: string;
        caption?: string;
        hook?: string;
        cta?: string;
        imagePrompt?: string;
    };
    prompt?: {
        caption?: string;
        text?: string;
        prompt?: string;
    };
}

interface RunStateResponse {
    id: string;
    topic?: string;
    mode?: string;
    momConfig?: {
        audience?: string;
    };
    posts: RunPost[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

const resolveImageUrl = (path?: string) => {
    if (!path) return undefined;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
};

const inferRole = (index: number, total: number): Slide['role'] => {
    if (index === 0) return 'hook';
    if (index === total - 1) return 'cta';
    return 'insight';
};

export interface RunHydrationPayload {
    slides: Slide[];
    topic: string;
    audience: string;
    postType: PostType;
}

export async function fetchRunState(runId: string): Promise<RunStateResponse> {
    const res = await fetch(`${API_BASE_URL}/api/runs/${runId}`);
    if (!res.ok) {
        const message = res.status === 404 ? 'Run not found' : 'Failed to load run';
        throw new Error(`${message} (${res.status})`);
    }
    return res.json();
}

export function normalizeRunToSlides(run: RunStateResponse): Slide[] {
    const total = run.posts?.length || 0;
    return (run.posts || []).map((post, index) => {
        const imagePath = post.finalImageUrl || post.rawImageUrl;
        const text =
            post.momPost?.caption ||
            post.momPost?.hook ||
            post.prompt?.caption ||
            post.prompt?.text ||
            '';

        return {
            id: post.momPost?.id || `${run.id}-${index}`,
            role: inferRole(index, Math.max(total, 1)),
            text,
            variationPrompt: post.momPost?.imagePrompt || post.prompt?.prompt || '',
            imageUrl: resolveImageUrl(imagePath),
            status: imagePath ? 'done' : 'draft',
        };
    });
}

export async function loadRunHydration(runId: string): Promise<RunHydrationPayload> {
    const run = await fetchRunState(runId);
    const slides = normalizeRunToSlides(run);

    const postType: PostType = slides.length > 1 ? 'carousel' : 'infographic';

    return {
        slides,
        topic: run.topic || '',
        audience: run.momConfig?.audience || '',
        postType,
    };
}
