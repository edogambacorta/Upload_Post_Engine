import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BriefPanel } from './BriefPanel';
import { PreviewPanel } from './PreviewPanel';
import { StylePanel } from './StylePanel';
import * as fabric from 'fabric';
import { useStudio } from '@/lib/studio/store';
import { loadRunHydration } from '@/lib/studio/runLoader';
import { derivePostDetailsFromSlides, resolveInitialScheduleSlot } from '@/lib/studio/postDetailsUtils';

export function StudioEditor() {
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
    const [selectedText, setSelectedText] = useState<fabric.Textbox | null>(null);
    const { state, dispatch } = useStudio();
    const { slides, selectedSlideId, composition, topic, hasGenerated, aspectRatio } = state;

    // Derive mode info
    const isSlideshow = composition === 'slideshow' || slides.length > 1;
    const activeIndex = slides.findIndex((s) => s.id === selectedSlideId);
    const displayIndex = activeIndex >= 0 ? activeIndex + 1 : 1;
    const [searchParams] = useSearchParams();
    const runId = searchParams.get('runId');
    const [isRunLoading, setIsRunLoading] = useState(false);
    const [runLoadError, setRunLoadError] = useState<string | null>(null);

    useEffect(() => {
        dispatch({ type: 'SET_RUN_ID', payload: runId });
    }, [runId, dispatch]);

    useEffect(() => {
        console.log('[StudioEditor] State snapshot', {
            runId,
            slideCount: slides.length,
            selectedSlideId,
        });

        if (runId && slides.length === 0) {
            console.warn('[StudioEditor] runId query param detected but no slides are loaded into the store yet');
        }
    }, [runId, slides.length, selectedSlideId]);

    useEffect(() => {
        if (slides.length > 0 && !hasGenerated) {
            dispatch({ type: 'SET_HAS_GENERATED', payload: true });
        }
    }, [slides.length, hasGenerated, dispatch]);

    // 🔥 Handle mode param from dashboard
    const modeParam = searchParams.get('mode');
    useEffect(() => {
        if (runId) return; // runId takes precedence or is handled by the other effect

        if (modeParam === 'carousel') {
            dispatch({ type: 'SET_COMPOSITION', payload: 'slideshow' });
            dispatch({ type: 'SET_MODE', payload: 'carousel' });
        } else if (modeParam === 'infographic') {
            dispatch({ type: 'SET_COMPOSITION', payload: 'single' });
            dispatch({ type: 'SET_MODE', payload: 'infographic' });
        }
    }, [modeParam, runId, dispatch]);

    useEffect(() => {
        if (!runId) {
            return;
        }
        if (slides.length > 0) {
            // Store already has content (likely navigated from dashboard), avoid wiping edits.
            return;
        }

        let cancelled = false;
        setIsRunLoading(true);
        setRunLoadError(null);

        loadRunHydration(runId)
            .then(async (payload) => {
                if (cancelled) return;
                console.log('[StudioEditor] Hydrating editor from run', {
                    runId,
                    slideCount: payload.slides.length,
                });
                dispatch({ type: 'SET_TOPIC', payload: payload.topic });
                dispatch({
                    type: 'SET_AUDIENCE',
                    payload: payload.audience || state.audience || 'first_time_newborn',
                });
                dispatch({ type: 'SET_MODE', payload: payload.postType });
                dispatch({ type: 'SET_COMPOSITION', payload: payload.composition });
                if (payload.aspectRatio) {
                    dispatch({ type: 'SET_ASPECT_RATIO', payload: payload.aspectRatio });
                }
                dispatch({ type: 'SET_SLIDES', payload: payload.slides });
                const firstSlideId = payload.slides[0]?.id ?? null;
                if (firstSlideId) {
                    dispatch({ type: 'SET_SELECTED_SLIDE', payload: firstSlideId });
                }
                const scheduleSlot = await resolveInitialScheduleSlot(runId);
                const postDetails = derivePostDetailsFromSlides({
                    topic: payload.topic,
                    slides: payload.slides,
                    schedule: scheduleSlot,
                });
                dispatch({ type: 'SET_POST_DETAILS', payload: postDetails });
                dispatch({ type: 'SET_HAS_GENERATED', payload: true });
            })
            .catch((error: Error) => {
                if (cancelled) return;
                console.error('[StudioEditor] Failed to hydrate run', error);
                setRunLoadError(error.message);
            })
            .finally(() => {
                if (cancelled) return;
                setIsRunLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [runId, slides.length, dispatch, state.audience]);

    // Save aspect ratio changes to server (debounced)
    useEffect(() => {
        if (!runId || !hasGenerated) return;

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

        // Debounce: wait 1 second after aspect ratio change before saving
        const timeoutId = setTimeout(() => {
            fetch(`${API_BASE_URL}/api/runs/${runId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aspectRatio }),
            })
                .then(res => {
                    if (!res.ok) throw new Error('Failed to save aspect ratio');
                    return res.json();
                })
                .then(() => {
                    console.log(`[StudioEditor] Saved aspect ratio ${aspectRatio} for run ${runId}`);
                })
                .catch(error => {
                    console.error('[StudioEditor] Failed to save aspect ratio:', error);
                });
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [aspectRatio, runId, hasGenerated]);

    // Keep a ref to the latest slides for save-on-unmount
    const slidesRef = useRef(slides);
    useEffect(() => { slidesRef.current = slides; }, [slides]);

    // Save slides changes to server (debounced)
    useEffect(() => {
        if (!runId || !hasGenerated || slides.length === 0) return;

        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

        // Debounce: wait 1 second after slide changes before saving
        const timeoutId = setTimeout(() => {
            console.log('[StudioEditor] Saving slides to server...', { runId, slideCount: slides.length });
            fetch(`${API_BASE_URL}/api/runs/${runId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slides }),
            })
                .then(res => {
                    if (!res.ok) throw new Error('Failed to save slides');
                    return res.json();
                })
                .then(() => {
                    console.log(`[StudioEditor] Saved slides for run ${runId}`);
                })
                .catch(error => {
                    console.error('[StudioEditor] Failed to save slides:', error);
                });
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [slides, runId, hasGenerated]);

    // Save on unmount to ensure no data loss
    useEffect(() => {
        return () => {
            if (!runId || !hasGenerated || slidesRef.current.length === 0) return;

            const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            console.log('[StudioEditor] Saving slides on unmount...', { runId });

            fetch(`${API_BASE_URL}/api/runs/${runId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slides: slidesRef.current }),
                keepalive: true,
            }).catch(e => console.error('[StudioEditor] Failed to save on unmount:', e));
        };
    }, [runId, hasGenerated]);

    return (
        <div className="h-[calc(100vh-73px)] bg-gray-950 flex flex-col">
            {isRunLoading && (
                <div className="bg-blue-500/10 border-b border-blue-500/30 text-blue-200 text-sm px-4 py-2">
                    Loading run data…
                </div>
            )}
            {runLoadError && (
                <div className="bg-red-500/10 border-b border-red-500/30 text-red-200 text-sm px-4 py-2">
                    Failed to load run "{runId}": {runLoadError}. Try returning to the dashboard.
                </div>
            )}

            <div className="grid grid-cols-12 flex-1 bg-gray-950 min-h-0">
                {/* Left Panel: Brief & Settings */}
                <div className="col-span-3 h-full min-h-0">
                    <BriefPanel />
                </div>

                {/* Center Panel: Preview & Editor */}
                <div className={`
                    ${hasGenerated ? 'col-span-6' : 'col-span-9'} h-full min-h-0
                `}>
                    <PreviewPanel
                        onCanvasReady={setFabricCanvas}
                        onTextSelected={setSelectedText}
                    />
                </div>

                {/* Right Panel: Visual Style */}
                {hasGenerated && (
                    <div className="col-span-3 h-full min-h-0 border-l border-gray-800">
                        <StylePanel
                            fabricCanvas={fabricCanvas}
                            selectedText={selectedText}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
