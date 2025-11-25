import { CalendarPost, CalendarFilters } from './calendarTypes';

const API_URL = 'http://localhost:3000';

export async function fetchScheduledPosts(
    filters?: CalendarFilters
): Promise<CalendarPost[]> {
    const params = new URLSearchParams();

    if (filters?.runId) params.append('runId', filters.runId);
    if (filters?.audience) params.append('audience', filters.audience);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.mode) params.append('mode', filters.mode);
    if (filters?.searchQuery) params.append('q', filters.searchQuery);

    const response = await fetch(`${API_URL}/api/scheduled-posts?${params}`);

    if (!response.ok) {
        throw new Error('Failed to fetch scheduled posts');
    }

    return response.json();
}

export async function updatePostSchedule(
    runId: string,
    postId: string,
    scheduledDate: string
): Promise<boolean> {
    const response = await fetch(
        `${API_URL}/api/mom-runs/${runId}/posts/${postId}/schedule`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduledDate })
        }
    );

    return response.ok;
}

export async function bulkUpdateSchedules(
    updates: Array<{ runId: string; postId: string; scheduledDate: string }>
): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
        updates.map(({ runId, postId, scheduledDate }) =>
            updatePostSchedule(runId, postId, scheduledDate)
        )
    );

    return {
        success: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length
    };
}
