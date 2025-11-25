import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BriefPanel } from './BriefPanel';
import { PreviewPanel } from './PreviewPanel';
import { StylePanel } from './StylePanel';
import * as fabric from 'fabric';
import { useStudio } from '@/lib/studio/store';
import { loadRunHydration } from '@/lib/studio/runLoader';

export function StudioEditor() {
    const [fabricCanvas, setFabricCanvas] = useState<fabric.Canvas | null>(null);
    const [selectedText, setSelectedText] = useState<fabric.Textbox | null>(null);
    const { state, dispatch } = useStudio();
    const { slides, selectedSlideId } = state;
    const [searchParams] = useSearchParams();
    const runId = searchParams.get('runId');
    const [isRunLoading, setIsRunLoading] = useState(false);
    const [runLoadError, setRunLoadError] = useState<string | null>(null);

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
            .then((payload) => {
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
                dispatch({ type: 'SET_SLIDES', payload: payload.slides });
                const firstSlideId = payload.slides[0]?.id ?? null;
                if (firstSlideId) {
                    dispatch({ type: 'SET_SELECTED_SLIDE', payload: firstSlideId });
                }
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

    return (
        <div className="h-[calc(100vh-73px)] bg-gray-950 overflow-hidden flex flex-col">
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
            <div className="grid grid-cols-12 flex-1 bg-gray-950 overflow-hidden">
                {/* Left Panel: Brief & Settings */}
                <div className="col-span-3 h-full border-r border-gray-800">
                    <BriefPanel />
                </div>

                {/* Center Panel: Preview & Editor */}
                <div className="col-span-6 h-full">
                    <PreviewPanel
                        onCanvasReady={setFabricCanvas}
                        onTextSelected={setSelectedText}
                    />
                </div>

                {/* Right Panel: Visual Style */}
                <div className="col-span-3 h-full border-l border-gray-800">
                    <StylePanel
                        fabricCanvas={fabricCanvas}
                        selectedText={selectedText}
                    />
                </div>
            </div>
        </div>
    );
}
