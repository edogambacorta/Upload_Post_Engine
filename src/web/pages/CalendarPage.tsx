import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PostingCalendar } from '../components/studio/Calendar/PostingCalendar';
import { CalendarPost } from '@/lib/studio/calendarTypes';
import { fetchScheduledPosts, updatePostSchedule } from '@/lib/studio/calendarApi';
import { getApiUrl, getResourceUrl } from '@/lib/apiConfig';
import { useStudio } from '@/lib/studio/store';
import { derivePostDetailsFromSlides, fetchRunScheduleSlot } from '@/lib/studio/postDetailsUtils';
import { Calendar as CalendarIcon } from 'lucide-react';

export function CalendarPage() {
    const { dispatch } = useStudio();
    const navigate = useNavigate();
    const [scheduledPosts, setScheduledPosts] = useState<CalendarPost[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadScheduledPosts();
    }, []);

    const loadScheduledPosts = async () => {
        setLoading(true);
        try {
            const posts = await fetchScheduledPosts();
            setScheduledPosts(posts);
        } catch (error) {
            console.error('Failed to load scheduled posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const openRun = async (runId: string) => {
        try {
            // Fetch the run data
            const res = await fetch(getApiUrl(`/api/runs/${runId}`));
            if (!res.ok) {
                console.error('Failed to fetch run');
                return;
            }
            const run = await res.json();

            // Convert run posts to slides
            const slides = run.posts.map((post: any, index: number) => ({
                id: post.momPost?.id || `slide-${index}`,
                role: index === 0 ? 'hook' : index === run.posts.length - 1 ? 'cta' : 'insight',
                text: post.momPost?.caption || post.momPost?.hook || '',
                variationPrompt: post.momPost?.imagePrompt || '',
                imagePrompt: post.momPost?.imagePrompt || '',
                meta: post.momPost
                    ? {
                        overlayTitle: post.momPost.overlayTitle,
                        overlaySubtitle: post.momPost.overlaySubtitle,
                        hook: post.momPost.hook,
                        caption: post.momPost.caption,
                        cta: post.momPost.cta,
                        safetyFooter: post.momPost.safetyFooter,
                        imagePrompt: post.momPost.imagePrompt,
                    }
                    : undefined,
                imageUrl: post.rawImageUrl ? getResourceUrl(post.rawImageUrl) : '',
                status: 'draft' as const
            }));

            // Infer composition from run
            const isSlideshowRun = run.posts.length > 1;

            // Update store with run data
            dispatch({ type: 'SET_TOPIC', payload: run.topic || '' });
            dispatch({ type: 'SET_AUDIENCE', payload: run.momConfig?.audience || 'first_time_newborn' });
            dispatch({ type: 'SET_MODE', payload: 'infographic' });
            dispatch({ type: 'SET_COMPOSITION', payload: isSlideshowRun ? 'slideshow' : 'single' });
            dispatch({ type: 'SET_SLIDES', payload: slides });
            dispatch({ type: 'SET_SELECTED_SLIDE', payload: slides[0]?.id ?? null });

            const scheduleSlot = await fetchRunScheduleSlot(runId);
            const postDetails = derivePostDetailsFromSlides({
                topic: run.topic || '',
                slides,
                schedule: scheduleSlot,
            });
            dispatch({ type: 'SET_POST_DETAILS', payload: postDetails });
            dispatch({ type: 'SET_HAS_GENERATED', payload: true });
            dispatch({ type: 'SET_RUN_ID', payload: runId });

            // Navigate to editor with run ID in URL
            navigate(`/studio/editor?runId=${runId}`);
        } catch (error) {
            console.error('Error loading run:', error);
        }
    };

    const handlePostClick = (post: CalendarPost) => {
        openRun(post.runId);
    };

    const handleReschedule = async (postId: string, runId: string, newDate: Date): Promise<boolean> => {
        // Extract the actual post ID from the composite ID format: ${runId}-${actualPostId}
        // The backend expects just the post's momPost.id, not the composite ID
        const actualPostId = postId.startsWith(runId + '-') 
            ? postId.substring(runId.length + 1) 
            : postId;

        const success = await updatePostSchedule(
            runId,
            actualPostId,
            newDate.toISOString()
        );

        if (success) {
            await loadScheduledPosts(); // Refresh calendar
        }

        return success;
    };

    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                    <CalendarIcon className="w-10 h-10 text-purple-400" />
                    Posting Calendar
                </h1>
                <p className="text-gray-400 text-lg">View and manage your scheduled posts.</p>
            </div>

            <PostingCalendar
                posts={scheduledPosts}
                onPostClick={handlePostClick}
                onReschedule={handleReschedule}
                loading={loading}
            />
        </div>
    );
}
