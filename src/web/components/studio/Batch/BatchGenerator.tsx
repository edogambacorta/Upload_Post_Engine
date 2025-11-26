import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Loader2, MessageSquare, Users, Target, Type } from 'lucide-react';
import { useStudio } from '@/lib/studio/store';
import { createSingleSlideFromPost, createSlideshowFromPost } from '@/lib/studio/slideUtils';
import type { MomPost } from '@/lib/studio/types';

interface RatedMomPost extends MomPost {
    rating?: number;
}

const audienceOptions = [
    { value: '', label: 'Select Audience...' },
    { value: 'pregnant_anxious', label: 'Pregnant & Anxious' },
    { value: 'first_time_newborn', label: 'First-time Mom / Newborn' },
    { value: 'burned_out_parent', label: 'Burned-out Parent' },
    { value: 'female_overwhelm', label: 'General Overwhelm' },
];

const STORAGE_KEY = 'studio_idea_generator';

export function IdeaGenerator() {
    const navigate = useNavigate();
    const { dispatch, state } = useStudio();
    const [topic, setTopic] = useState(state.topic || '');
    const [audience, setAudience] = useState(state.audience || '');
    const [model, setModel] = useState(state.llmModel || 'openrouter-gpt-4.1');
    const [count, setCount] = useState(6);
    const [ideas, setIdeas] = useState<RatedMomPost[]>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            return JSON.parse(raw);
        } catch {
            return [];
        }
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleGenerate = async () => {
        if (!topic || !audience) return;
        setIsGenerating(true);
        setError(null);
        try {
            const response = await fetch('http://localhost:5000/api/generate-draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic,
                    audience,
                    model,
                    count,
                }),
            });
            if (!response.ok) {
                throw new Error('Failed to generate ideas');
            }
            const data = await response.json();
            const newIdeas: RatedMomPost[] = (data.posts || []).map((post: MomPost) => ({
                ...post,
                rating: 0,
            }));
            setIdeas(newIdeas);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(newIdeas));
        } catch (err) {
            console.error(err);
            setError((err as Error).message);
        } finally {
            setIsGenerating(false);
        }
    };

    const useIdea = (post: RatedMomPost, composition: 'single' | 'slideshow') => {
        const slides =
            composition === 'single'
                ? [createSingleSlideFromPost(post)]
                : createSlideshowFromPost(post);

        dispatch({ type: 'SET_MODE', payload: 'infographic' });
        dispatch({ type: 'SET_COMPOSITION', payload: composition });
        dispatch({ type: 'SET_TOPIC', payload: topic });
        dispatch({ type: 'SET_AUDIENCE', payload: audience });
        dispatch({ type: 'SET_SLIDES', payload: slides });
        dispatch({ type: 'SET_SELECTED_SLIDE', payload: slides[0]?.id ?? null });
        dispatch({ type: 'SET_PREVIEW_MODE', payload: 'prompt' });

        navigate('/studio/editor');
    };

    const handleRate = (postId: string, rating: number) => {
        setIdeas((prev) => {
            const next = prev.map((idea) =>
                (idea.id || '') === postId ? { ...idea, rating } : idea
            );
            localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
            return next;
        });
    };

    return (
        <div className="idea-generator min-h-screen bg-gray-950 p-8">
            <div>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Zap className="w-8 h-8 text-blue-500" />
                            Idea Generator
                        </h1>
                        <p className="text-gray-400 mt-2">
                            Turn one master prompt into multiple ready-to-use post ideas.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 space-y-6">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold tracking-wide text-gray-500 uppercase flex items-center gap-2">
                                <Target className="w-4 h-4" />
                                Brief & Settings
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-blue-400" />
                                    Topic / Core Idea
                                </label>
                                <textarea
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="e.g. Mom guilt at midnight feedings..."
                                    className="w-full h-28 bg-gray-850 border border-gray-700 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white flex items-center gap-2">
                                    <Users className="w-4 h-4 text-pink-400" />
                                    Target Audience
                                </label>
                                <select
                                    value={audience}
                                    onChange={(e) => setAudience(e.target.value)}
                                    className="w-full bg-gray-850 border border-gray-700 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    {audienceOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white flex items-center gap-2">
                                    <Type className="w-4 h-4 text-purple-400" />
                                    LLM Model (Text Ideas)
                                </label>
                                <select
                                    value={model}
                                    onChange={(e) => setModel(e.target.value)}
                                    className="w-full bg-gray-850 border border-gray-700 rounded-xl p-3 text-white text-sm focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="openrouter-gpt-4.1">ChatGPT 4.1 (Fast)</option>
                                    <option value="openrouter-gpt-5.1-thinking">GPT 5.1 Thinking (Smart)</option>
                                    <option value="openrouter-sonnet-4.5">Claude Sonnet 4.5 (Creative)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-white">Number of Ideas</label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min={3}
                                        max={12}
                                        value={count}
                                        onChange={(e) => setCount(Number(e.target.value))}
                                        className="flex-1 accent-blue-500"
                                    />
                                    <span className="text-white font-mono">{count}</span>
                                </div>
                            </div>
                            <button
                                onClick={handleGenerate}
                                disabled={!topic || !audience || isGenerating}
                                className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${!topic || !audience || isGenerating
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-blue-900/20'
                                    }`}
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Generating
                                    </>
                                ) : (
                                    'Generate Ideas'
                                )}
                            </button>
                            {error && <p className="text-sm text-red-400">{error}</p>}
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        {ideas.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-2xl p-12 text-center text-gray-500">
                                <Zap className="w-16 h-16 mb-4 opacity-30" />
                                <p className="text-lg font-medium text-white mb-2">No ideas yet</p>
                                <p className="text-sm text-gray-400">Fill out the brief and click “Generate Ideas”.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {ideas.map((idea, idx) => {
                                    const id = idea.id || String(idx);
                                    const isExpanded = expandedId === id;

                                    return (
                                        <div
                                            key={id}
                                            className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                    Idea {idx + 1}
                                                </span>
                                                <button
                                                    onClick={() => setExpandedId(isExpanded ? null : id)}
                                                    className="text-xs text-gray-400 hover:text-gray-200"
                                                >
                                                    {isExpanded ? 'Collapse' : 'Details'}
                                                </button>
                                            </div>

                                            {/* Compact content (always visible) */}
                                            <div className="space-y-2">
                                                <p className="text-sm font-semibold text-gray-400">Hook</p>
                                                <p className="text-white line-clamp-3">{idea.hook}</p>
                                            </div>

                                            {/* Rating row (always visible) */}
                                            <div className="flex items-center justify-between mt-2">
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button
                                                            key={star}
                                                            onClick={() => handleRate(id, star)}
                                                            className={`w-6 h-6 rounded-full border border-gray-600 flex items-center justify-center text-xs ${(idea.rating || 0) >= star
                                                                    ? 'bg-yellow-400 text-black border-yellow-400'
                                                                    : 'bg-gray-800 text-gray-400'
                                                                }`}
                                                        >
                                                            {star}
                                                        </button>
                                                    ))}
                                                </div>
                                                <span className="text-xs text-gray-500">
                                                    {idea.rating ? `Rated ${idea.rating}/5` : 'Not rated'}
                                                </span>
                                            </div>

                                            {/* Expanded body */}
                                            {isExpanded && (
                                                <div className="space-y-3 pt-3 border-t border-gray-800 mt-3">
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-semibold text-gray-400">Caption</p>
                                                        <p className="text-gray-200 whitespace-pre-line text-sm">
                                                            {idea.caption}
                                                        </p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-semibold text-gray-400">CTA</p>
                                                        <p className="text-white text-sm">{idea.cta}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-sm font-semibold text-gray-400">Image Prompt</p>
                                                        <p className="text-xs text-purple-200 font-mono whitespace-pre-wrap">
                                                            {idea.imagePrompt}
                                                        </p>
                                                    </div>

                                                    {/* 🔥 Explicit creation options */}
                                                    <div className="flex flex-wrap gap-2 pt-2">
                                                        <button
                                                            onClick={() => useIdea(idea, 'single')}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white"
                                                        >
                                                            Create Single Image
                                                        </button>
                                                        <button
                                                            onClick={() => useIdea(idea, 'slideshow')}
                                                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-purple-500 text-purple-300 hover:bg-purple-500/10"
                                                        >
                                                            Create Slideshow
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
