import { getApiUrl } from '@/lib/apiConfig';
import { PostDetails } from './types';

const jsonHeaders = { 'Content-Type': 'application/json' };

export async function persistPostDetails(runId: string | null, details: PostDetails): Promise<boolean> {
    if (!runId) {
        console.warn('[studio] Missing runId, skipping post detail persistence');
        return false;
    }
    try {
        const response = await fetch(
            getApiUrl(`/api/studio/runs/${runId}/post-details`),
            {
                method: 'POST',
                headers: jsonHeaders,
                body: JSON.stringify({ runId, details }),
            }
        );
        if (!response.ok) {
            throw new Error(`Failed to persist post details (${response.status})`);
        }
        return true;
    } catch (error) {
        console.error('[studio] Persist post details failed', error);
        return false;
    }
}

export async function persistSlideContent(
    runId: string | null,
    slideId: string,
    updates: { text?: string; imagePrompt?: string }
): Promise<boolean> {
    if (!runId) {
        console.warn('[studio] Missing runId, skipping slide persistence');
        return false;
    }
    try {
        const response = await fetch(
            getApiUrl(`/api/studio/runs/${runId}/slides/${slideId}`),
            {
                method: 'POST',
                headers: jsonHeaders,
                body: JSON.stringify({ runId, slideId, updates }),
            }
        );
        if (!response.ok) {
            throw new Error(`Failed to persist slide (${response.status})`);
        }
        return true;
    } catch (error) {
        console.error('[studio] Persist slide failed', error);
        return false;
    }
}
