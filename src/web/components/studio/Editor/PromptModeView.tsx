import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, FileText, ImageIcon, Music3, Tag } from 'lucide-react';
import { useStudio } from '@/lib/studio/store';
import { BriefForm } from './BriefForm';
import { DEFAULT_POST_TIME } from '@/lib/studio/postDetailsUtils';
import { persistPostDetails, persistSlideContent } from '@/lib/studio/persistence';
import type { Slide } from '@/lib/studio/types';

interface PostFormState {
    title: string;
    description: string;
    tagsText: string;
    music: string;
    scheduleDate: string;
    scheduleTime: string;
}

interface SlideFormState {
    text: string;
    imagePrompt: string;
    dirty: boolean;
    saving: boolean;
    status: 'idle' | 'saved' | 'error';
    error?: string | null;
}

const derivePostFormState = (details: {
    title?: string;
    description?: string;
    tags?: string[];
    music?: string;
    scheduleDate?: string;
    scheduleTime?: string;
}): PostFormState => ({
    title: details.title || '',
    description: details.description || '',
    tagsText: (details.tags || []).join(', '),
    music: details.music || '',
    scheduleDate: details.scheduleDate || '',
    scheduleTime: details.scheduleTime || DEFAULT_POST_TIME,
});

const buildSlideState = (slide: Slide): SlideFormState => ({
    text: slide.text || '',
    imagePrompt: slide.imagePrompt || slide.meta?.imagePrompt || '',
    dirty: false,
    saving: false,
    status: 'idle',
    error: null,
});

export function PromptModeView() {
    const { state, dispatch } = useStudio();
    const { slides, postDetails, runId, aspectRatio } = state;

    const [postForm, setPostForm] = useState<PostFormState>(() => derivePostFormState(postDetails));
    const [postDirty, setPostDirty] = useState(false);
    const [postSaving, setPostSaving] = useState(false);
    const [postStatus, setPostStatus] = useState<'idle' | 'saved' | 'error'>('idle');
    const [postError, setPostError] = useState<string | null>(null);
    const [slideForms, setSlideForms] = useState<Record<string, SlideFormState>>({});

    useEffect(() => {
        setPostForm(derivePostFormState(postDetails));
        setPostDirty(false);
        setPostSaving(false);
        setPostStatus('idle');
        setPostError(null);
    }, [postDetails]);

    useEffect(() => {
        setSlideForms((prev) => {
            const next: Record<string, SlideFormState> = {};
            slides.forEach((slide) => {
                const existing = prev[slide.id];
                if (existing && existing.dirty) {
                    next[slide.id] = existing;
                } else {
                    next[slide.id] = buildSlideState(slide);
                }
            });
            return next;
        });
    }, [slides]);

    if (slides.length === 0) {
        return (
            <div className="h-full overflow-y-auto bg-gray-950 p-6">
                <div className="max-w-xl mx-auto space-y-6">
                    <div className="text-center space-y-3 text-gray-300">
                        <FileText className="w-10 h-10 mx-auto text-purple-300" />
                        <h2 className="text-xl font-semibold text-white">No drafts yet</h2>
                        <p className="text-sm text-gray-400">
                            Set your brief to generate the first slideshow draft.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-gray-800 bg-gray-900 shadow-lg p-4">
                        <BriefForm variant="card" />
                    </div>
                </div>
            </div>
        );
    }

    const handlePostFieldChange = (field: keyof PostFormState, value: string) => {
        setPostForm((prev) => ({ ...prev, [field]: value }));
        setPostDirty(true);
        setPostStatus('idle');
        setPostError(null);
    };

    const handleSavePostDetails = async () => {
        const tags = postForm.tagsText
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean);

        const nextDetails = {
            title: postForm.title.trim(),
            description: postForm.description,
            tags,
            music: postForm.music,
            scheduleDate: postForm.scheduleDate,
            scheduleTime: postForm.scheduleTime || DEFAULT_POST_TIME,
        };

        dispatch({ type: 'SET_POST_DETAILS', payload: nextDetails });
        setPostSaving(true);
        setPostStatus('idle');
        setPostError(null);

        const success = await persistPostDetails(runId, nextDetails);
        setPostSaving(false);
        setPostDirty(!success);
        setPostStatus(success ? 'saved' : 'error');
        if (!success) {
            setPostError('Failed to save post details. Please try again.');
        }
    };

    const handleDiscardPost = () => {
        setPostForm(derivePostFormState(postDetails));
        setPostDirty(false);
        setPostStatus('idle');
        setPostError(null);
    };

    const handleSlideFieldChange = (slideId: string, field: 'text' | 'imagePrompt', value: string) => {
        setSlideForms((prev) => {
            const existing = prev[slideId] || buildSlideState(slides.find((s) => s.id === slideId)!);
            return {
                ...prev,
                [slideId]: {
                    ...existing,
                    [field]: value,
                    dirty: true,
                    status: 'idle',
                    error: null,
                },
            };
        });
    };

    const handleSlideReset = (slideId: string) => {
        const slide = slides.find((s) => s.id === slideId);
        if (!slide) return;
        setSlideForms((prev) => ({
            ...prev,
            [slideId]: buildSlideState(slide),
        }));
    };

    const handleSlideSave = async (slideId: string) => {
        const form = slideForms[slideId];
        if (!form || !form.dirty) return;

        setSlideForms((prev) => ({
            ...prev,
            [slideId]: { ...form, saving: true, status: 'idle', error: null },
        }));

        dispatch({
            type: 'UPDATE_SLIDE',
            payload: {
                id: slideId,
                updates: { text: form.text, imagePrompt: form.imagePrompt },
            },
        });

        const success = await persistSlideContent(runId, slideId, {
            text: form.text,
            imagePrompt: form.imagePrompt,
        });

        setSlideForms((prev) => ({
            ...prev,
            [slideId]: {
                ...prev[slideId],
                saving: false,
                dirty: !success,
                status: success ? 'saved' : 'error',
                error: success ? null : 'Failed to save slide',
            },
        }));
    };

    return (
        <div className="h-full overflow-y-auto bg-gray-950 p-6 space-y-6">
            <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Post Section</p>
                        <p className="text-sm text-gray-500">Edit title, description, tags, music, and schedule.</p>
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                        {postDirty ? (
                            <>
                                <button
                                    onClick={handleDiscardPost}
                                    className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:bg-gray-800 transition-colors"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSavePostDetails}
                                    disabled={postSaving}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${postSaving
                                        ? 'bg-purple-900 text-purple-200 cursor-wait'
                                        : 'bg-purple-600 hover:bg-purple-500 text-white'
                                        }`}
                                >
                                    {postSaving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </>
                        ) : postStatus === 'saved' ? (
                            <span className="text-xs text-emerald-400">Saved</span>
                        ) : postStatus === 'error' && postError ? (
                            <span className="text-xs text-red-400">{postError}</span>
                        ) : null}
                    </div>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-purple-300" />
                            Post Title
                        </label>
                        <input
                            type="text"
                            value={postForm.title}
                            onChange={(e) => handlePostFieldChange('title', e.target.value)}
                            className="mt-2 w-full rounded-lg border border-gray-800 bg-gray-900 text-white p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-300" />
                            Post Description
                        </label>
                        <textarea
                            rows={4}
                            value={postForm.description}
                            onChange={(e) => handlePostFieldChange('description', e.target.value)}
                            className="mt-2 w-full rounded-lg border border-gray-800 bg-gray-900 text-white p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        <div>
                            <label className="text-sm font-semibold text-white flex items-center gap-2">
                                <Tag className="w-4 h-4 text-amber-300" />
                                Post Tags
                            </label>
                            <input
                                type="text"
                                value={postForm.tagsText}
                                onChange={(e) => handlePostFieldChange('tagsText', e.target.value)}
                                placeholder="family, newborn, calm"
                                className="mt-2 w-full rounded-lg border border-gray-800 bg-gray-900 text-white p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
                            />
                            <p className="text-xs text-gray-500 mt-1">Comma-separated</p>
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-white flex items-center gap-2">
                                <Music3 className="w-4 h-4 text-emerald-300" />
                                Post Music
                            </label>
                            <input
                                type="text"
                                value={postForm.music}
                                onChange={(e) => handlePostFieldChange('music', e.target.value)}
                                placeholder="e.g. Calm acoustic"
                                className="mt-2 w-full rounded-lg border border-gray-800 bg-gray-900 text-white p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-white flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-pink-300" />
                            Post Schedule
                        </label>
                        <div className="mt-2 grid gap-4 md:grid-cols-2">
                            <input
                                type="date"
                                value={postForm.scheduleDate}
                                onChange={(e) => handlePostFieldChange('scheduleDate', e.target.value)}
                                className="rounded-lg border border-gray-800 bg-gray-900 text-white p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
                                style={{ colorScheme: 'dark' }}
                            />
                            <input
                                type="time"
                                value={postForm.scheduleTime}
                                onChange={(e) => handlePostFieldChange('scheduleTime', e.target.value)}
                                className="rounded-lg border border-gray-800 bg-gray-900 text-white p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
                                style={{ colorScheme: 'dark' }}
                            />
                        </div>
                    </div>
                </div>
            </section>

            <section className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Images Section</p>
                        <p className="text-sm text-gray-500">Adjust the image text and prompts for each slide.</p>
                    </div>
                    <span className="text-xs text-gray-500">
                        {slides.length} {slides.length === 1 ? 'image' : 'images'}
                    </span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    {slides.map((slide, index) => {
                        const form = slideForms[slide.id] ?? buildSlideState(slide);
                        return (
                            <div key={slide.id} className="rounded-2xl border border-gray-800 bg-gray-900 p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-purple-300">
                                            Slide {index + 1} of {slides.length}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{slide.role}</p>
                                    </div>
                                    {form.dirty ? (
                                        <span className="text-xs text-amber-400">Unsaved</span>
                                    ) : form.status === 'saved' ? (
                                        <span className="text-xs text-emerald-400">Saved</span>
                                    ) : form.status === 'error' && form.error ? (
                                        <span className="text-xs text-red-400">{form.error}</span>
                                    ) : null}
                                </div>

                                <button
                                    onClick={() => {
                                        dispatch({ type: 'SET_SELECTED_SLIDE', payload: slide.id });
                                        dispatch({ type: 'SET_PREVIEW_MODE', payload: 'text' });
                                        dispatch({ type: 'SET_EDIT_MODE', payload: 'text' });
                                    }}
                                    className="relative rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-gray-800 overflow-hidden hover:border-purple-500 transition-colors cursor-pointer w-full"
                                    style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                                >
                                    {slide.imageUrl ? (
                                        <img src={slide.imageUrl} alt={slide.text} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-gray-600">
                                            <ImageIcon className="w-8 h-8" />
                                        </div>
                                    )}
                                </button>

                                <div>
                                    <label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-300" />
                                        Image Text
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={form.text}
                                        onChange={(e) => handleSlideFieldChange(slide.id, 'text', e.target.value)}
                                        className="mt-2 w-full rounded-lg border border-gray-800 bg-gray-950 text-white p-3 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-white flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4 text-purple-300" />
                                        Image Prompt
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={form.imagePrompt}
                                        onChange={(e) => handleSlideFieldChange(slide.id, 'imagePrompt', e.target.value)}
                                        className="mt-2 w-full rounded-lg border border-gray-800 bg-gray-950 text-white p-3 font-mono text-xs focus:border-purple-500 focus:ring-2 focus:ring-purple-500/40"
                                    />
                                </div>

                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => handleSlideReset(slide.id)}
                                        disabled={form.saving || !form.dirty}
                                        className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-300 hover:bg-gray-800 disabled:opacity-40"
                                    >
                                        Discard
                                    </button>
                                    <button
                                        onClick={() => handleSlideSave(slide.id)}
                                        disabled={!form.dirty || form.saving}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${form.saving
                                            ? 'bg-purple-900 text-purple-200 cursor-wait'
                                            : 'bg-purple-600 hover:bg-purple-500 text-white'
                                            }`}
                                    >
                                        {form.saving ? 'Saving…' : 'Save'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
