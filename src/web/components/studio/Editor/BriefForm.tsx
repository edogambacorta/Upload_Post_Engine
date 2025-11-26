import { useStudio } from '@/lib/studio/store';
import { MomPost } from '@/lib/studio/types';
import { createSingleSlideFromPost, createSlideshowFromPost } from '@/lib/studio/slideUtils';
import { derivePostDetailsFromSlides, resolveInitialScheduleSlot } from '@/lib/studio/postDetailsUtils';
import { Sparkles, Loader2, Target, Users, Type, MessageSquare } from 'lucide-react';
import { useState } from 'react';

interface BriefFormProps {
    variant?: 'panel' | 'card';
    className?: string;
}

export function BriefForm({ variant = 'panel', className = '' }: BriefFormProps) {
    const { state, dispatch } = useStudio();
    const { topic, audience, isGenerating, llmModel, composition, runId } = state;
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isPanel = variant === 'panel';

    const handleGenerate = async () => {
        if (!topic || !audience) return;
        dispatch({ type: 'SET_GENERATING', payload: true });
        setErrorMessage(null);

        try {
            const response = await fetch('http://localhost:5000/api/generate-draft', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    topic,
                    audience,
                    model: llmModel,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate draft');
            }

            const data = await response.json();
            const posts: MomPost[] = data.posts;

            if (posts && posts.length > 0) {
                const slides =
                    composition === 'single'
                        ? [createSingleSlideFromPost(posts[0])]
                        : createSlideshowFromPost(posts[0]);

                const scheduleSlot = await resolveInitialScheduleSlot(runId);
                const postDetails = derivePostDetailsFromSlides({
                    topic,
                    slides,
                    schedule: scheduleSlot,
                });

                dispatch({ type: 'SET_SLIDES', payload: slides });
                dispatch({ type: 'SET_SELECTED_SLIDE', payload: slides[0]?.id ?? null });
                dispatch({ type: 'SET_PREVIEW_MODE', payload: 'prompt' });
                dispatch({ type: 'SET_POST_DETAILS', payload: postDetails });
                dispatch({ type: 'SET_HAS_GENERATED', payload: true });
            }
        } catch (error) {
            console.error('Generation failed:', error);
            setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
        } finally {
            dispatch({ type: 'SET_GENERATING', payload: false });
        }
    };

    const heading = (
        <div className={`${isPanel ? 'p-4 border-b border-gray-800 shrink-0' : ''}`}>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <Target className="w-4 h-4" />
                Brief & Settings
            </h2>
        </div>
    );

    const formBody = (
        <div className={`${isPanel ? 'flex-1 overflow-y-auto p-4 space-y-6' : 'space-y-6'}`}>
            <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-blue-400" />
                    Topic / Core Idea
                </label>
                <textarea
                    value={topic}
                    onChange={(e) => dispatch({ type: 'SET_TOPIC', payload: e.target.value })}
                    placeholder="e.g. Dealing with toddler tantrums at dinner..."
                    className="w-full h-24 bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-pink-400" />
                    Target Audience
                </label>
                <select
                    value={audience}
                    onChange={(e) => dispatch({ type: 'SET_AUDIENCE', payload: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-blue-500"
                >
                    <option value="">Select Audience...</option>
                    <option value="pregnant_anxious">Pregnant & Anxious</option>
                    <option value="first_time_newborn">First-time Mom / Newborn</option>
                    <option value="burned_out_parent">Burned-out Parent</option>
                    <option value="female_overwhelm">General Overwhelm</option>
                </select>
            </div>

            <hr className="border-gray-800" />

            <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    AI Model Settings
                </h3>

                <div className="space-y-2">
                    <label className="text-sm text-gray-300 flex items-center gap-2">
                        <Type className="w-4 h-4 text-purple-400" />
                        LLM Model (Text)
                    </label>
                    <select
                        value={llmModel}
                        onChange={(e) => dispatch({ type: 'SET_LLM_MODEL', payload: e.target.value })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white"
                    >
                        <option value="openrouter-gpt-4.1">ChatGPT 4.1 (Fast)</option>
                        <option value="openrouter-gpt-5.1-thinking">GPT 5.1 Thinking (Smart)</option>
                        <option value="openrouter-sonnet-4.5">Claude Sonnet 4.5 (Creative)</option>
                    </select>
                </div>
            </div>

            {errorMessage && (
                <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                    {errorMessage}
                </div>
            )}
        </div>
    );

    const generateButton = (
        <div className={`${isPanel ? 'p-4 border-t border-gray-800 bg-gray-900 shrink-0' : ''}`}>
            <button
                onClick={handleGenerate}
                disabled={!topic || !audience || isGenerating}
                className={`w-full font-bold py-3 rounded-lg shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 ${!topic || !audience || isGenerating
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-blue-900/20'
                    }`}
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating Draft...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-5 h-5" />
                        Generate {composition === 'slideshow' ? 'Slideshow' : 'Single Graphic'} Draft
                    </>
                )}
            </button>
        </div>
    );

    return (
        <div className={`${isPanel ? 'h-full flex flex-col bg-gray-900' : 'space-y-6'} ${className}`}>
            {heading}
            {formBody}
            {generateButton}
        </div>
    );
}
