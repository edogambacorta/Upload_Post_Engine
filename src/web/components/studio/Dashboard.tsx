import { useNavigate } from 'react-router-dom';
import { useStudio } from '../../lib/studio/store';
import { Plus, Image, Layers, Zap, Clock, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { PostingCalendar } from './Calendar/PostingCalendar';
import { CalendarPost } from '@/lib/studio/calendarTypes';
import { fetchScheduledPosts, updatePostSchedule } from '@/lib/studio/calendarApi';

export function Dashboard() {
    const { dispatch } = useStudio();
    const navigate = useNavigate();
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [scheduledPosts, setScheduledPosts] = useState<CalendarPost[]>([]);
    const [loadingSchedule, setLoadingSchedule] = useState(false);

    useEffect(() => {
        fetchRuns();
        loadScheduledPosts();
    }, []);

    const fetchRuns = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/runs');
            if (!res.ok) return;
            const data = await res.json();
            // Filter for studio runs only
            const studioRuns = data.filter((run: any) => run.mode === 'studio');
            setRuns(studioRuns.slice(0, 6)); // Show max 6 recent runs
        } catch (error) {
            console.error('Failed to fetch runs:', error);
        } finally {
            setLoading(false);
        }
    };

    const openRun = async (runId: string) => {
        try {
            // Fetch the run data
            const res = await fetch(`http://localhost:3000/api/runs/${runId}`);
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
                imageUrl: post.rawImageUrl ? `http://localhost:3000${post.rawImageUrl}` : '',
                status: 'draft' as const
            }));

            // 🔥 Infer composition from run
            const isSlideshowRun = run.posts.length > 1;

            // Update store with run data
            dispatch({ type: 'SET_TOPIC', payload: run.topic || '' });
            dispatch({ type: 'SET_AUDIENCE', payload: run.momConfig?.audience || 'first_time_newborn' });
            dispatch({ type: 'SET_MODE', payload: 'infographic' });
            dispatch({ type: 'SET_COMPOSITION', payload: isSlideshowRun ? 'slideshow' : 'single' });
            dispatch({ type: 'SET_SLIDES', payload: slides });

            // Navigate to editor with run ID in URL
            navigate(`/studio/editor?runId=${runId}`);
        } catch (error) {
            console.error('Error loading run:', error);
        }
    };


    const handleCreate = (mode: 'infographic' | 'carousel' | 'batch') => {
        dispatch({ type: 'SET_MODE', payload: mode });

        // 🔥 Set composition based on mode
        if (mode === 'infographic') {
            dispatch({ type: 'SET_COMPOSITION', payload: 'single' });
        } else if (mode === 'carousel') {
            dispatch({ type: 'SET_COMPOSITION', payload: 'slideshow' });
        }
        // batch mode doesn't set composition - user chooses in batch generator

        if (mode === 'batch') {
            navigate('/studio/batch');
        } else {
            navigate('/studio/editor');
        }
    };


    const loadScheduledPosts = async () => {
        setLoadingSchedule(true);
        try {
            const posts = await fetchScheduledPosts();
            setScheduledPosts(posts);
        } catch (error) {
            console.error('Failed to load scheduled posts:', error);
        } finally {
            setLoadingSchedule(false);
        }
    };

    const handlePostClick = (post: CalendarPost) => {
        // Open run in editor
        openRun(post.runId);
    };

    const handleReschedule = async (postId: string, runId: string, newDate: Date): Promise<boolean> => {
        const success = await updatePostSchedule(
            runId,
            postId,
            newDate.toISOString()
        );

        if (success) {
            await loadScheduledPosts(); // Refresh calendar
        }

        return success;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="mb-10">
                <h1 className="text-4xl font-bold text-white mb-2">Studio Dashboard</h1>
                <p className="text-gray-400 text-lg">Create high-performing social media content in seconds.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                {/* Create New Section */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                        <Plus className="w-5 h-5 text-purple-400" />
                        Create New
                    </h2>

                    <div className="space-y-4">
                        <button
                            onClick={() => handleCreate('batch')}
                            className="group relative overflow-hidden bg-gray-800 hover:bg-gray-700 p-6 rounded-xl text-left transition-all border border-gray-700 hover:border-blue-500/50"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Zap className="w-24 h-24 text-blue-500" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Zap className="w-5 h-5 text-blue-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Batch Generator</h3>
                                <p className="text-sm text-gray-400">Spin up multiple post ideas from one brief</p>
                            </div>
                        </button>
                    </div>

                    <div className="grid gap-4">
                        <button
                            onClick={() => handleCreate('infographic')}
                            className="group relative overflow-hidden bg-gray-800 hover:bg-gray-700 p-6 rounded-xl text-left transition-all border border-gray-700 hover:border-purple-500/50"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Image className="w-24 h-24 text-purple-500" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Image className="w-5 h-5 text-purple-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Single Graphic</h3>
                                <p className="text-sm text-gray-400">One-off posts with text overlays</p>
                            </div>
                        </button>

                        <button
                            onClick={() => handleCreate('carousel')}
                            className="group relative overflow-hidden bg-gray-800 hover:bg-gray-700 p-6 rounded-xl text-left transition-all border border-gray-700 hover:border-pink-500/50"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Layers className="w-24 h-24 text-pink-500" />
                            </div>
                            <div className="relative z-10">
                                <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <Layers className="w-5 h-5 text-pink-400" />
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Carousel / Slideshow</h3>
                                <p className="text-sm text-gray-400">Multi-slide stories with consistent scenes</p>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Recent Runs Section */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-gray-400" />
                        Recent Runs
                    </h2>

                    {loading ? (
                        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-8 flex items-center justify-center min-h-[400px]">
                            <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                        </div>
                    ) : runs.length === 0 ? (
                        <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
                            <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                                <Clock className="w-8 h-8 text-gray-600" />
                            </div>
                            <h3 className="text-lg font-medium text-white mb-2">No recent runs</h3>
                            <p className="text-gray-500 max-w-sm">
                                Your generated content will appear here. Start by creating a new infographic or carousel.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {runs.map((run) => (
                                <button
                                    key={run.id}
                                    onClick={() => openRun(run.id)}
                                    className="group bg-gray-800 hover:bg-gray-700 rounded-xl p-4 text-left transition-all border border-gray-700 hover:border-purple-500/50"
                                >
                                    <div className="aspect-[4/5] bg-gray-900 rounded-lg mb-3 overflow-hidden">
                                        {run.posts[0]?.rawImageUrl ? (
                                            <img
                                                src={`http://localhost:3000${run.posts[0].rawImageUrl}`}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                <Image className="w-12 h-12" />
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="text-white font-medium truncate mb-1">{run.topic || 'Untitled'}</h4>
                                    <p className="text-sm text-gray-400">
                                        {new Date(run.id).toLocaleDateString()} • {run.posts.length} slides
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Posting Calendar Section */}
            <div className="mt-12">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                    <CalendarIcon className="w-5 h-5 text-purple-400" />
                    Posting Calendar
                </h2>

                <PostingCalendar
                    posts={scheduledPosts}
                    onPostClick={handlePostClick}
                    onReschedule={handleReschedule}
                    loading={loadingSchedule}
                />
            </div>
        </div>
    );
}
