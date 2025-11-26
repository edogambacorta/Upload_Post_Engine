import { useNavigate } from 'react-router-dom';
import { useStudio } from '../../lib/studio/store';
import { Plus, Image, Layers, Clock, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getApiUrl, getResourceUrl } from '@/lib/apiConfig';
import { normalizeRunToSlides } from '@/lib/studio/runLoader';
import { derivePostDetailsFromSlides, fetchRunScheduleSlot } from '@/lib/studio/postDetailsUtils';

export function Dashboard() {
    const { dispatch } = useStudio();
    const navigate = useNavigate();
    const [runs, setRuns] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRuns();
    }, []);

    const fetchRuns = async () => {
        try {
            const res = await fetch(getApiUrl('/api/runs'));
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
            // Fetch the run data (fresh)
            const res = await fetch(getApiUrl(`/api/runs/${runId}`), { cache: 'no-store' });
            if (!res.ok) {
                console.error('Failed to fetch run');
                return;
            }
            const run = await res.json();

            // Use shared normalization logic to ensure all studio data (text, transforms) is preserved
            const slides = normalizeRunToSlides(run);

            // 🔥 Infer composition from run
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


    const handleCreate = (mode: 'infographic' | 'carousel') => {
        // Reset store to ensure we start fresh
        dispatch({ type: 'RESET_STORE' });

        dispatch({ type: 'SET_MODE', payload: mode });

        // Set composition based on mode
        if (mode === 'infographic') {
            dispatch({ type: 'SET_COMPOSITION', payload: 'single' });
        } else if (mode === 'carousel') {
            dispatch({ type: 'SET_COMPOSITION', payload: 'slideshow' });
        }

        navigate(`/studio/editor?mode=${mode}`);
    };



    return (
        <div className="p-8">
            <div className="mb-10">
                <h1 className="text-4xl font-bold text-white mb-2">Studio Dashboard</h1>
                <p className="text-gray-400 text-lg">Create high-performing social media content in seconds.</p>
            </div>

            {/* Create New Buttons */}
            <div className="mb-12">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                    <Plus className="w-5 h-5 text-purple-400" />
                    Create New
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
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
                                    <div
                                        className="bg-gray-900 rounded-lg mb-3 overflow-hidden"
                                        style={{ aspectRatio: run.momConfig?.aspectRatio ? run.momConfig.aspectRatio.replace(':', '/') : '4/5' }}
                                    >
                                        {run.posts?.length > 1 ? (
                                            <div className="grid grid-cols-2 gap-0.5 h-full w-full">
                                                {run.posts.slice(0, 4).map((post: any, i: number) => {
                                                    const imgUrl = post.studio?.thumbnailUrl ||
                                                        (post.finalImageUrl ? getResourceUrl(post.finalImageUrl) :
                                                            (post.rawImageUrl ? getResourceUrl(post.rawImageUrl) : null));

                                                    return (
                                                        <div key={i} className="relative w-full h-full overflow-hidden bg-gray-800">
                                                            {imgUrl ? (
                                                                <img
                                                                    src={imgUrl}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-700">
                                                                    <Image className="w-4 h-4" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (() => {
                                            const post = run.posts[0];
                                            const imgUrl = post?.studio?.thumbnailUrl ||
                                                (post?.finalImageUrl ? getResourceUrl(post.finalImageUrl) :
                                                    (post?.rawImageUrl ? getResourceUrl(post.rawImageUrl) : null));

                                            return imgUrl ? (
                                                <img
                                                    src={imgUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                                    <Image className="w-12 h-12" />
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <h4 className="text-white font-medium truncate mb-1">{run.topic || 'Untitled'}</h4>
                                    <p className="text-sm text-gray-400">
                                        {(() => {
                                            try {
                                                // Run ID format: YYYY-MM-DDTHH-mm-ss-mssZ
                                                // Needs to be: YYYY-MM-DDTHH:mm:ss.mssZ for Date constructor
                                                const parts = run.id.split('T');
                                                if (parts.length === 2) {
                                                    const datePart = parts[0];
                                                    const timePart = parts[1].replace(/-/g, ':').replace(/:(\d+)Z$/, '.$1Z');
                                                    return new Date(`${datePart}T${timePart}`).toLocaleDateString();
                                                }
                                                return new Date(run.id).toLocaleDateString();
                                            } catch (e) {
                                                return 'Unknown Date';
                                            }
                                        })()} • {run.posts.length} slides
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
            </div>
        </div>
    );
}
