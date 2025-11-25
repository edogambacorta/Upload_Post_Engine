import { useStudio } from '../../../lib/studio/store';
import { Image as ImageIcon, Type, Download, Share2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useRef, useEffect, useId } from 'react';
import * as fabric from 'fabric';
import type { Slide } from '../../../lib/studio/types';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350;
const DEFAULT_TEXT_LAYOUT = {
    left: 60,
    top: CANVAS_HEIGHT - 240,
    width: CANVAS_WIDTH - 120,
};
const DEFAULT_TEXT_STYLE = {
    fontSize: 32,
    fill: '#1a1a1a',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center' as const,
};
const TEXT_SAFE_MARGIN = 48;

const decodeHtml = (value: string) => {
    if (typeof window === 'undefined') return value;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
};

const normalizeSlideText = (value?: string) => {
    if (!value) return '';
    const decoded = decodeHtml(value);
    return decoded
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/?[^>]+>/gi, '')
        .trim();
};

const getTextLayout = (slide?: Slide) => {
    const layout = slide?.textBox ?? DEFAULT_TEXT_LAYOUT;
    const maxWidth = CANVAS_WIDTH - TEXT_SAFE_MARGIN * 2;
    const width = Math.min(Math.max(layout.width, 200), maxWidth);
    const left = Math.min(
        Math.max(layout.left, TEXT_SAFE_MARGIN),
        CANVAS_WIDTH - width - TEXT_SAFE_MARGIN
    );
    const top = Math.min(
        Math.max(layout.top, TEXT_SAFE_MARGIN),
        CANVAS_HEIGHT - TEXT_SAFE_MARGIN - 160
    );
    return { left, top, width };
};

const getTextInitialProps = (slide?: Slide) => {
    const layout = getTextLayout(slide);
    const style = slide?.textBox;
    return {
        ...layout,
        fontSize: style?.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
        fill: style?.fill ?? DEFAULT_TEXT_STYLE.fill,
        backgroundColor: style?.backgroundColor ?? DEFAULT_TEXT_STYLE.backgroundColor,
        textAlign: style?.textAlign ?? DEFAULT_TEXT_STYLE.textAlign,
    };
};

interface PreviewPanelProps {
    onCanvasReady?: (canvas: fabric.Canvas) => void;
    onTextSelected?: (text: fabric.Textbox | null) => void;
}

export function PreviewPanel({ onCanvasReady, onTextSelected }: PreviewPanelProps) {
    const { state, dispatch } = useStudio();
    const { slides, selectedSlideId, editMode } = state;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const textBoxRef = useRef<fabric.Textbox | null>(null);
    const imageRef = useRef<fabric.Image | null>(null);
    const maskId = useId().replace(/:/g, '');
    const previewRef = useRef<HTMLDivElement>(null);
    const selectedSlide =
        slides.find((slide) => slide.id === selectedSlideId) ??
        (slides.length > 0 ? slides[0] : null);
    const isEmpty = !selectedSlide;

    useEffect(() => {
        if (!canvasRef.current) {
            // Canvas DOM node not attached yet.
            return;
        }
        if (fabricCanvasRef.current) {
            return;
        }

        const canvas = new fabric.Canvas(canvasRef.current, {
            selection: false,
            controlsAboveOverlay: true,
        });

        const wrapper = canvasRef.current.parentElement as HTMLDivElement | null;
        const wrapperStyles: Array<{ prop: string; value: string | null; priority: string }> = [];
        const canvases = wrapper ? Array.from(wrapper.querySelectorAll('canvas')) : [];
        const canvasStyleSnapshots: Array<{ element: HTMLCanvasElement; prop: string; value: string | null; priority: string }> = [];

        if (wrapper) {
            const setWrapperStyle = (prop: string, value: string, priority: string = '') => {
                wrapperStyles.push({ prop, value: wrapper.style.getPropertyValue(prop) || null, priority: wrapper.style.getPropertyPriority(prop) });
                wrapper.style.setProperty(prop, value, priority);
            };

            setWrapperStyle('width', '100%', 'important');
            setWrapperStyle('height', '100%', 'important');
            setWrapperStyle('max-width', '100%');
            setWrapperStyle('max-height', '100%');
            setWrapperStyle('overflow', 'visible');
            setWrapperStyle('pointer-events', 'auto');
            setWrapperStyle('display', 'block');
        }

        canvases.forEach((canvasEl) => {
            const apply = (prop: string, value: string, priority: string = '') => {
                canvasStyleSnapshots.push({
                    element: canvasEl,
                    prop,
                    value: canvasEl.style.getPropertyValue(prop) || null,
                    priority: canvasEl.style.getPropertyPriority(prop),
                });
                canvasEl.style.setProperty(prop, value, priority);
            };
            apply('width', '100%', 'important');
            apply('height', '100%', 'important');
            apply('max-width', '100%');
            apply('max-height', '100%');
        });

        fabricCanvasRef.current = canvas;
        console.log('[PreviewPanel] Fabric canvas initialized', { hasCanvas: !!canvas, selectedSlideId });
        if (onCanvasReady) {
            onCanvasReady(canvas);
        }

        return () => {
            console.log('[PreviewPanel] Disposing fabric canvas');
            canvas.dispose();
            fabricCanvasRef.current = null;

            if (wrapper) {
                wrapperStyles.forEach(({ prop, value, priority }) => {
                    if (value === null) {
                        wrapper.style.removeProperty(prop);
                    } else {
                        wrapper.style.setProperty(prop, value, priority);
                    }
                });
            }

            canvasStyleSnapshots.forEach(({ element, prop, value, priority }) => {
                if (value === null) {
                    element.style.removeProperty(prop);
                } else {
                    element.style.setProperty(prop, value, priority);
                }
            });
        };
    }, [onCanvasReady]);

    // Load slide content
    useEffect(() => {
        console.log('[PreviewPanel] Slide content effect triggered', {
            hasCanvas: !!fabricCanvasRef.current,
            hasSlide: !!selectedSlide,
            slideId: selectedSlide?.id,
            imageUrl: selectedSlide?.imageUrl,
        });

        const canvas = fabricCanvasRef.current;
        if (!canvas) {
            console.log('[PreviewPanel] No canvas available for rendering');
            return;
        }
        if (!selectedSlide) {
            console.warn('[PreviewPanel] No selected slide to load into canvas', {
                slideCount: slides.length,
                selectedSlideId,
            });
            canvas.clear();
            canvas.backgroundColor = '#ffffff';
            imageRef.current = null;
            textBoxRef.current = null;
            canvas.renderAll();
            return;
        }

        console.log('[PreviewPanel] Clearing canvas and loading slide content');
        canvas.clear();
        canvas.backgroundColor = '#ffffff';
        imageRef.current = null;
        textBoxRef.current = null;

        let cancelled = false;
        let textSyncFrame: number | null = null;
        let imageSyncFrame: number | null = null;
        const slideId = selectedSlide.id;
        const textProps = getTextInitialProps(selectedSlide);
        const slideText = normalizeSlideText(selectedSlide.text) || 'Your text here';

        const syncTextToStore = (textbox: fabric.Textbox) => {
            dispatch({
                type: 'UPDATE_SLIDE',
                payload: {
                    id: slideId,
                    updates: {
                        text: textbox.text || '',
                        textBox: {
                            left: textbox.left ?? textProps.left,
                            top: textbox.top ?? textProps.top,
                            width: textbox.width ?? textProps.width,
                            fontSize: textbox.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
                            fill: (textbox.fill as string) ?? DEFAULT_TEXT_STYLE.fill,
                            backgroundColor: (textbox.backgroundColor as string) ?? DEFAULT_TEXT_STYLE.backgroundColor,
                            textAlign: (textbox.textAlign as 'left' | 'center' | 'right') ?? DEFAULT_TEXT_STYLE.textAlign,
                        },
                    },
                },
            });
        };

        const syncImageToStore = (image: fabric.Image) => {
            dispatch({
                type: 'UPDATE_SLIDE',
                payload: {
                    id: slideId,
                    updates: {
                        imageTransform: {
                            left: image.left ?? 0,
                            top: image.top ?? 0,
                            scaleX: image.scaleX ?? 1,
                            scaleY: image.scaleY ?? 1,
                        },
                    },
                },
            });
        };

        const scheduleTextSync = () => {
            if (textSyncFrame !== null) return;
            textSyncFrame = requestAnimationFrame(() => {
                textSyncFrame = null;
                if (textBoxRef.current) {
                    syncTextToStore(textBoxRef.current);
                }
            });
        };

        const scheduleImageSync = () => {
            if (imageSyncFrame !== null) return;
            imageSyncFrame = requestAnimationFrame(() => {
                imageSyncFrame = null;
                if (imageRef.current) {
                    syncImageToStore(imageRef.current);
                }
            });
        };

        const handleObjectModified = (event: fabric.ModifiedEvent<MouseEvent>) => {
            const target = event.target;
            if (!target) return;
            if (textBoxRef.current && target === textBoxRef.current) {
                scheduleTextSync();
            } else if (imageRef.current && target === imageRef.current) {
                scheduleImageSync();
            }
        };

        const realtimeHandler = (event: any) => {
            const target = event.target;
            if (!target) return;
            if (textBoxRef.current && target === textBoxRef.current) {
                scheduleTextSync();
            } else if (imageRef.current && target === imageRef.current) {
                scheduleImageSync();
            }
        };

        canvas.on('object:modified', handleObjectModified);
        canvas.on('object:moving', realtimeHandler);
        canvas.on('object:scaling', realtimeHandler);
        canvas.on('object:rotating', realtimeHandler);

        // Load background image
        const imageUrl = selectedSlide.imageUrl;
        const initImage = async () => {
            if (!imageUrl) return;
            console.log('[PreviewPanel] Loading background image', imageUrl);
            try {
                const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' });
                if (!img || cancelled) return;
                imageRef.current = img;
                img.selectable = true;
                img.evented = true;
                img.perPixelTargetFind = true;
                img.set({
                    hoverCursor: editMode === 'image' ? 'move' : 'default',
                    lockMovementX: editMode !== 'image',
                    lockMovementY: editMode !== 'image',
                    lockScalingX: editMode !== 'image',
                    lockScalingY: editMode !== 'image',
                });

                if (selectedSlide.imageTransform) {
                    img.set({
                        left: selectedSlide.imageTransform.left,
                        top: selectedSlide.imageTransform.top,
                        scaleX: selectedSlide.imageTransform.scaleX,
                        scaleY: selectedSlide.imageTransform.scaleY,
                    });
                } else if (img.width && img.height) {
                    const coverScale = Math.max(
                        CANVAS_WIDTH / img.width,
                        CANVAS_HEIGHT / img.height
                    );
                    img.scale(coverScale);
                    img.left = (CANVAS_WIDTH - img.getScaledWidth()) / 2;
                    img.top = (CANVAS_HEIGHT - img.getScaledHeight()) / 2;
                } else {
                    img.scaleToWidth(CANVAS_WIDTH);
                    img.scaleToHeight(CANVAS_HEIGHT);
                    img.left = 0;
                    img.top = 0;
                }

                canvas.add(img);
                if (textBoxRef.current) {
                    const tb = textBoxRef.current;
                    canvas.remove(tb);
                    canvas.add(tb);
                }

                canvas.renderAll();
                console.log('[PreviewPanel] Background image rendered', {
                    objectCount: canvas.getObjects().length,
                });
            } catch (error) {
                console.error('[PreviewPanel] Failed to load image', {
                    url: imageUrl,
                    error,
                });
            }
        };
        initImage();

        // Add text box
        const textBox = new fabric.Textbox(slideText, {
            left: textProps.left,
            top: textProps.top,
            width: textProps.width,
            fontSize: textProps.fontSize,
            fontWeight: 600,
            fill: textProps.fill,
            backgroundColor: textProps.backgroundColor,
            padding: 24,
            editable: true,
            selectable: true,
            textAlign: textProps.textAlign,
        });

        canvas.add(textBox);
        console.log('[PreviewPanel] Textbox added to canvas', {
            textLength: slideText.length,
            objectCount: canvas.getObjects().length,
        });
        textBoxRef.current = textBox;

        // Notify parent of selected text
        if (onTextSelected) {
            onTextSelected(textBox);
        }

        canvas.renderAll();

        const handleTextChanged = () => {
            scheduleTextSync();
        };

        textBox.on('changed', handleTextChanged as any);
        textBox.on('editing:exited', handleTextChanged as any);

        return () => {
            cancelled = true;
            if (textSyncFrame !== null) cancelAnimationFrame(textSyncFrame);
            if (imageSyncFrame !== null) cancelAnimationFrame(imageSyncFrame);
            textBox.off('changed', handleTextChanged as any);
            textBox.off('editing:exited', handleTextChanged as any);
            canvas.off('object:modified', handleObjectModified);
            canvas.off('object:moving', realtimeHandler);
            canvas.off('object:scaling', realtimeHandler);
            canvas.off('object:rotating', realtimeHandler);
        };
    }, [
        selectedSlide?.id,
        selectedSlide?.imageUrl,
        onTextSelected,
        dispatch,
    ]);

    // Handle edit mode changes
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const textBox = textBoxRef.current;
        const imageObject = imageRef.current;
        const isTextMode = editMode === 'text';
        const isImageMode = editMode === 'image';

        if (textBox) {
            textBox.selectable = isTextMode;
            textBox.evented = isTextMode;
            textBox.lockMovementX = !isTextMode;
            textBox.lockMovementY = !isTextMode;
            textBox.editable = isTextMode;
            textBox.hoverCursor = isTextMode ? 'text' : 'default';
        }

        if (imageObject) {
            imageObject.selectable = isImageMode;
            imageObject.evented = isImageMode;
            imageObject.lockMovementX = !isImageMode;
            imageObject.lockMovementY = !isImageMode;
            imageObject.lockScalingX = !isImageMode;
            imageObject.lockScalingY = !isImageMode;
            imageObject.hoverCursor = isImageMode ? 'move' : 'default';
        }

        if (isTextMode && textBox) {
            canvas.setActiveObject(textBox);
        } else if (isImageMode && imageObject) {
            canvas.setActiveObject(imageObject);
        } else {
            canvas.discardActiveObject();
        }

        canvas.requestRenderAll();
    }, [editMode]);

    const handleDownload = async () => {
        if (!previewRef.current) {
            console.warn('[PreviewPanel] Download requested but previewRef is missing');
            return;
        }

        try {
            const dataUrl = await toPng(previewRef.current, {
                quality: 1.0,
                pixelRatio: 2,
                backgroundColor: '#ffffff',
                cacheBust: true,
            });

            const link = document.createElement('a');
            link.download = `${selectedSlide?.id || 'slide'}.png`;
            link.href = dataUrl;
            link.click();
        } catch (error) {
            console.error('Download failed:', error);
            alert('Failed to download image. Please try again.');
        }
    };

    const handleModeSwitch = (newMode: 'text' | 'image') => {
        dispatch({ type: 'SET_EDIT_MODE', payload: newMode });
    };

    return (
        <div className="h-full flex flex-col bg-gray-950 relative">
            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 bg-gray-900/90 backdrop-blur-sm p-1.5 rounded-full border border-gray-800 shadow-xl">
                <button
                    onClick={() => handleModeSwitch('text')}
                    className={`p-2 rounded-full transition-colors ${editMode === 'text'
                        ? 'bg-purple-600 text-white'
                        : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    title="Text Mode"
                >
                    <Type className="w-4 h-4" />
                </button>
                <button
                    onClick={() => handleModeSwitch('image')}
                    className={`p-2 rounded-full transition-colors ${editMode === 'image'
                        ? 'bg-purple-600 text-white'
                        : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                        }`}
                    title="Image Mode"
                >
                    <ImageIcon className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-700 mx-1" />
                <button
                    onClick={handleDownload}
                    disabled={!selectedSlide?.imageUrl}
                    className={`p-2 rounded-full transition-colors ${selectedSlide?.imageUrl
                        ? 'hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer'
                        : 'text-gray-600 cursor-not-allowed'
                        }`}
                    title="Download"
                >
                    <Download className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-gray-800 rounded-full text-blue-400 hover:text-blue-300 transition-colors" title="Share">
                    <Share2 className="w-4 h-4" />
                </button>
            </div>

            {/* Main Canvas */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-visible">
                <div
                    ref={previewRef}
                    className="relative bg-white rounded-2xl shadow-2xl flex items-center justify-center overflow-visible"
                    style={{ width: '540px', height: '675px' }}
                >
                    {isEmpty && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-950 text-gray-500 space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 opacity-30" />
                            </div>
                            <p>Generate or load a run to preview slides</p>
                        </div>
                    )}
                    <div className="pointer-events-none absolute inset-0 z-20">
                        <svg width="100%" height="100%" className="absolute inset-0">
                            <defs>
                                <mask id={maskId}>
                                    <rect width="100%" height="100%" fill="white" />
                                    <rect x="0" y="0" width="100%" height="100%" rx="24" ry="24" fill="black" />
                                </mask>
                            </defs>
                            <rect width="100%" height="100%" fill="rgba(15,23,42,0.55)" mask={`url(#${maskId})`} />
                        </svg>
                        <div className="absolute inset-0 rounded-2xl border border-white/30 shadow-inner" />
                    </div>
                    <canvas
                        ref={canvasRef}
                        width={1080}
                        height={1350}
                        style={{ width: '100%', height: '100%', opacity: isEmpty ? 0.1 : 1 }}
                    />
                </div>
            </div>

            {/* Storyboard Strip */}
            {slides.length > 1 && (
                <div className="h-32 bg-gray-900 border-t border-gray-800 flex items-center px-4 gap-4 overflow-x-auto">
                    {slides.map((slide, index) => (
                        <button
                            key={slide.id}
                            onClick={() => dispatch({ type: 'SET_SELECTED_SLIDE', payload: slide.id })}
                            className={`flex-shrink-0 w-20 aspect-[4/5] rounded-lg border-2 transition-all overflow-hidden relative ${selectedSlideId === slide.id
                                ? 'border-purple-500 ring-2 ring-purple-500/20'
                                : 'border-gray-700 hover:border-gray-600'
                                }`}
                        >
                            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                                <span className="text-xs text-gray-500 font-medium">{index + 1}</span>
                            </div>
                            {slide.imageUrl && (
                                <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            )}
                        </button>
                    ))}

                    <button className="flex-shrink-0 w-20 aspect-[4/5] rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-600 flex items-center justify-center text-gray-500 hover:text-gray-400 transition-colors">
                        <span className="text-2xl">+</span>
                    </button>
                </div>
            )}
        </div>
    );
}
