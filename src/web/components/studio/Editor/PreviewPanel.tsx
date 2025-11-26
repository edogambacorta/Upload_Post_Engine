import { useStudio } from '../../../lib/studio/store';
import { Image as ImageIcon, Type, Download, Share2, FileCode, ChevronDown } from 'lucide-react';
import { useRef, useEffect, useCallback, useState } from 'react';
import * as fabric from 'fabric';
import type { Slide, PreviewMode, AspectRatio } from '../../../lib/studio/types';
import { PromptModeView } from './PromptModeView';
import { useDrop, useDrag } from 'react-dnd';
import type { GalleryDragItem } from '../../../lib/gallery/types';
import { ASPECT_RATIOS } from '../../../lib/studio/aspectRatioUtils';
import { saveThumbnail, loadThumbnail } from '../../../lib/studio/thumbnailCache';

// Logical export frame size (what you want as final PNG)
const DEFAULT_EXPORT_WIDTH = 1080;
const DEFAULT_EXPORT_HEIGHT = 1350;

// Extra working area around the export frame
const WORKSPACE_MARGIN = 1000;
// Multiplier for how far the dimmed zone extends past the export frame
const DIM_OVERLAY_MULTIPLIER = 0.7;

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

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);

const DEFAULT_TEXT_STYLE = {
    fontSize: 32,
    fill: '#1a1a1a',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center' as const,
};

const getTextLayout = (
    slide: Slide | undefined,
    exportWidth: number,
    exportHeight: number,
    frameOffsetX: number,
    frameOffsetY: number
) => {
    // slide.textBox is stored RELATIVE to the export frame (0..exportWidth)
    const stored = slide?.textBox;

    // If we have stored values, TRUST THEM completely. Do not clamp.
    // The user might have intentionally placed text outside the "safe zone".
    if (stored) {
        return {
            left: stored.left + frameOffsetX,
            top: stored.top + frameOffsetY,
            width: stored.width
        };
    }

    // Default placement logic for NEW slides (or slides without position data)
    const baseLeft = 60;
    const baseTop = exportHeight - 240;
    const baseWidth = exportWidth - 120;

    const maxWidth = exportWidth - TEXT_SAFE_MARGIN * 2;
    const width = clamp(baseWidth, 200, maxWidth);

    const frameLeft = frameOffsetX + TEXT_SAFE_MARGIN;
    const frameRight = frameOffsetX + exportWidth - TEXT_SAFE_MARGIN - width;
    const frameTop = frameOffsetY + TEXT_SAFE_MARGIN;
    const frameBottom = frameOffsetY + exportHeight - TEXT_SAFE_MARGIN - 160;

    const left = clamp(baseLeft + frameOffsetX, frameLeft, frameRight);
    const top = clamp(baseTop + frameOffsetY, frameTop, frameBottom);

    return { left, top, width };
};

const getTextInitialProps = (
    slide: Slide | undefined,
    exportWidth: number,
    exportHeight: number,
    frameOffsetX: number,
    frameOffsetY: number
) => {
    const layout = getTextLayout(slide, exportWidth, exportHeight, frameOffsetX, frameOffsetY);
    const style = slide?.textBox;
    const props = {
        ...layout,
        fontSize: style?.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
        fill: style?.fill ?? DEFAULT_TEXT_STYLE.fill,
        backgroundColor: style?.backgroundColor ?? DEFAULT_TEXT_STYLE.backgroundColor,
        textAlign: style?.textAlign ?? DEFAULT_TEXT_STYLE.textAlign,
        angle: style?.angle ?? 0,
        scaleX: style?.scaleX ?? 1,
        scaleY: style?.scaleY ?? 1,
    };
    console.log('[PreviewPanel] getTextInitialProps:', { slideId: slide?.id, style, props });
    return props;
};

interface PreviewPanelProps {
    onCanvasReady?: (canvas: fabric.Canvas) => void;
    onTextSelected?: (text: fabric.Textbox | null) => void;
}

export function PreviewPanel({ onCanvasReady, onTextSelected }: PreviewPanelProps) {
    const { state, dispatch } = useStudio();
    const {
        slides,
        selectedSlideId,
        editMode,
        previewMode,
        exportFrame,
        viewport,
        aspectRatio,
    } = state;

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
    const textBoxRef = useRef<fabric.Textbox | null>(null);
    const imageRef = useRef<fabric.Image | null>(null);
    const previewRef = useRef<HTMLDivElement>(null);
    const overlayRefs = useRef<fabric.Rect[]>([]);
    const frameRectRef = useRef<fabric.Rect | null>(null);
    const [showFormatDropdown, setShowFormatDropdown] = useState(false);

    const selectedSlide =
        slides.find((slide) => slide.id === selectedSlideId) ??
        (slides.length > 0 ? slides[0] : null);

    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'GALLERY_IMAGE',
        drop: (item: GalleryDragItem) => {
            if (selectedSlide) {
                dispatch({
                    type: 'UPDATE_SLIDE',
                    payload: {
                        id: selectedSlide.id,
                        updates: {
                            imageUrl: item.imageUrl,
                            imageTransform: { scaleX: 1, scaleY: 1, left: 0, top: 0 }
                        }
                    }
                });
            }
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
        }),
    }), [selectedSlide, dispatch]);

    const isEmpty = !selectedSlide;
    const isPromptMode = previewMode === 'prompt';
    const isCanvasPreview = previewMode === 'text' || previewMode === 'image';
    const showStoryboard = slides.length > 1 && isCanvasPreview;

    // --- Artboard + frame geometry (Phase 1 foundation) ---
    const exportWidth = exportFrame?.width ?? DEFAULT_EXPORT_WIDTH;
    const exportHeight = exportFrame?.height ?? DEFAULT_EXPORT_HEIGHT;

    const artboardWidth = exportWidth + WORKSPACE_MARGIN * 2;
    const artboardHeight = exportHeight + WORKSPACE_MARGIN * 2;

    const frameOffsetX = (artboardWidth - exportWidth) / 2;
    const frameOffsetY = (artboardHeight - exportHeight) / 2;

    const getOverlayGeometry = useCallback((zoom: number) => {
        const safeZoom = Math.max(zoom, 0.01);
        const zoomScale = DIM_OVERLAY_MULTIPLIER / safeZoom;
        const verticalOverlayWidth = frameOffsetX * zoomScale;
        const horizontalOverlayHeight = frameOffsetY * zoomScale;
        const horizontalOverlayLeft = frameOffsetX - verticalOverlayWidth;
        const horizontalOverlayWidth = exportWidth + verticalOverlayWidth * 2;
        const topOverlayTop = frameOffsetY - horizontalOverlayHeight;
        return {
            verticalOverlayWidth,
            horizontalOverlayHeight,
            horizontalOverlayLeft,
            horizontalOverlayWidth,
            topOverlayTop,
        };
    }, [frameOffsetX, frameOffsetY, exportWidth]);

    // Helper function to maintain proper z-ordering across the canvas
    const ensureProperZOrder = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        const frameRect = frameRectRef.current;
        const overlayRects = overlayRefs.current;
        const image = imageRef.current;
        const textBox = textBoxRef.current;

        // 1. Frame at the very back
        if (frameRect) {
            canvas.sendObjectToBack(frameRect);
        }
        // 2. Image above frame (if it exists)
        if (image) {
            canvas.bringObjectForward(image);
        }
        // 3. Bring overlays above image
        overlayRects.forEach(overlay => canvas.bringObjectToFront(overlay));
        // 4. Bring text above everything
        if (textBox) {
            canvas.bringObjectToFront(textBox);
        }
    }, []);

    // Initialize Fabric canvas
    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }
        if (fabricCanvasRef.current) {
            return;
        }

        // Get container dimensions
        const container = canvasRef.current.parentElement;
        if (!container) {
            console.error('[PreviewPanel] No container found for canvas');
            return;
        }

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        console.log('[PreviewPanel] Initializing canvas', {
            containerWidth,
            containerHeight,
            artboardWidth,
            artboardHeight,
        });

        // Create canvas at container size (not artboard size!)
        const canvas = new fabric.Canvas(canvasRef.current, {
            width: containerWidth,
            height: containerHeight,
            selection: false,
            controlsAboveOverlay: true,
            enableRetinaScaling: true,
        });

        fabricCanvasRef.current = canvas;

        // Calculate initial viewport transform to show full artboard
        const zoomX = containerWidth / artboardWidth;
        const zoomY = containerHeight / artboardHeight;
        const initialZoom = Math.min(zoomX, zoomY) * 0.85; // 85% to add some padding

        // Center the artboard in the viewport
        const panX = (containerWidth - artboardWidth * initialZoom) / 2;
        const panY = (containerHeight - artboardHeight * initialZoom) / 2;

        canvas.setViewportTransform([initialZoom, 0, 0, initialZoom, panX, panY]);

        // Store initial viewport state
        dispatch({
            type: 'SET_VIEWPORT',
            payload: {
                zoom: initialZoom,
                panX,
                panY,
            },
        });

        // Customize control handles - smaller size
        fabric.Object.prototype.set({
            borderColor: '#a855f7',
            cornerColor: '#ffffff',
            cornerStrokeColor: '#a855f7',
            cornerSize: 9, // Smaller handles
            transparentCorners: false,
            cornerStyle: 'rect',
            borderScaleFactor: 2,
            padding: 8,
            objectCaching: false,
            strokeUniform: true,
        });

        console.log('[PreviewPanel] Fabric canvas initialized', {
            hasCanvas: !!canvas,
            selectedSlideId,
            initialZoom,
            panX,
            panY,
        });

        if (onCanvasReady) {
            onCanvasReady(canvas);
        }

        // --- ResizeObserver for responsive canvas ---
        console.log('[PreviewPanel] Setting up ResizeObserver for responsive canvas');

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;

                // Skip if dimensions haven't actually changed
                if (width === canvas.getWidth() && height === canvas.getHeight()) {
                    continue;
                }

                console.log('[PreviewPanel] Container resized, updating canvas', {
                    oldWidth: canvas.getWidth(),
                    oldHeight: canvas.getHeight(),
                    newWidth: width,
                    newHeight: height,
                });

                // Store current viewport transform to preserve zoom and pan
                const vpt = canvas.viewportTransform;
                if (!vpt) return;

                const currentZoom = vpt[0]; // zoom is stored in vpt[0]
                const currentPanX = vpt[4];
                const currentPanY = vpt[5];

                // Update canvas dimensions
                canvas.setDimensions({
                    width,
                    height,
                });

                // Restore viewport transform
                canvas.setViewportTransform([currentZoom, 0, 0, currentZoom, currentPanX, currentPanY]);

                // Update viewport state in store
                dispatch({
                    type: 'SET_VIEWPORT',
                    payload: {
                        zoom: currentZoom,
                        panX: currentPanX,
                        panY: currentPanY,
                    },
                });

                canvas.requestRenderAll();
            }
        });

        resizeObserver.observe(container);

        // --- Zoom & Pan Implementation ---
        let isPanning = false;
        let isSpacebarPanning = false;
        let isSpacebarPressed = false;
        let lastPosX = 0;
        let lastPosY = 0;

        // Mouse wheel zoom
        const handleMouseWheel = (opt: any) => {
            const evt = opt.e as WheelEvent;
            evt.preventDefault();
            evt.stopPropagation();

            const delta = evt.deltaY;
            let zoom = canvas.getZoom();
            zoom *= 0.999 ** delta;

            // Clamp zoom between 10% and 500%
            if (zoom > 5) zoom = 5;
            if (zoom < 0.1) zoom = 0.1;

            // Get canvas element bounds
            const canvasElement = canvas.getElement();
            const rect = canvasElement.getBoundingClientRect();

            // Calculate mouse position relative to canvas
            const mouseX = evt.clientX - rect.left;
            const mouseY = evt.clientY - rect.top;

            // Normalize to canvas logical coordinates
            const canvasWidth = canvasElement.width;
            const canvasHeight = canvasElement.height;
            const normalizedX = (mouseX / rect.width) * canvasWidth;
            const normalizedY = (mouseY / rect.height) * canvasHeight;

            // Zoom towards mouse cursor position
            const point = new fabric.Point(normalizedX, normalizedY);
            canvas.zoomToPoint(point, zoom);

            // Update viewport state in store
            const vpt = canvas.viewportTransform;
            if (vpt) {
                dispatch({
                    type: 'SET_VIEWPORT',
                    payload: {
                        zoom,
                        panX: vpt[4],
                        panY: vpt[5],
                    },
                });
            }
        };

        // Keyboard event handlers for spacebar
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for spacebar (code 32 or key ' ')
            if ((e.code === 'Space' || e.keyCode === 32) && !isSpacebarPressed) {
                // Prevent spacebar from scrolling the page
                e.preventDefault();
                isSpacebarPressed = true;
                canvas.defaultCursor = 'grab';
                canvas.hoverCursor = 'grab';
                canvas.requestRenderAll();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' || e.keyCode === 32) {
                e.preventDefault();
                isSpacebarPressed = false;
                isSpacebarPanning = false;
                canvas.defaultCursor = 'default';
                canvas.hoverCursor = 'default';
                canvas.requestRenderAll();
            }
        };

        // Middle mouse button pan or spacebar + left click pan
        const handleMouseDown = (opt: any) => {
            const evt = opt.e as MouseEvent;

            // Spacebar + left mouse button for panning
            if (isSpacebarPressed && evt.button === 0) {
                evt.preventDefault();
                evt.stopPropagation();
                isSpacebarPanning = true;
                lastPosX = evt.clientX;
                lastPosY = evt.clientY;
                canvas.selection = false;
                canvas.defaultCursor = 'grabbing';
                canvas.hoverCursor = 'grabbing';
                return;
            }

            // Middle mouse button (button === 1)
            if (evt.button === 1) {
                evt.preventDefault();
                evt.stopPropagation();
                isPanning = true;
                lastPosX = evt.clientX;
                lastPosY = evt.clientY;
                canvas.selection = false;
                canvas.defaultCursor = 'grabbing';
            }
        };

        const handleMouseMove = (opt: any) => {
            if (isPanning || isSpacebarPanning) {
                const evt = opt.e as MouseEvent;
                evt.preventDefault();
                const vpt = canvas.viewportTransform;
                if (vpt) {
                    vpt[4] += evt.clientX - lastPosX;
                    vpt[5] += evt.clientY - lastPosY;
                    canvas.requestRenderAll();
                    lastPosX = evt.clientX;
                    lastPosY = evt.clientY;

                    // Update viewport state in store
                    dispatch({
                        type: 'SET_VIEWPORT',
                        payload: {
                            panX: vpt[4],
                            panY: vpt[5],
                        },
                    });
                }
            }
        };

        const handleMouseUp = (opt: any) => {
            const evt = opt.e as MouseEvent;

            // Handle spacebar panning release
            if (isSpacebarPanning && evt.button === 0) {
                isSpacebarPanning = false;
                canvas.selection = false;
                // Restore grab cursor if spacebar still pressed, otherwise default
                canvas.defaultCursor = isSpacebarPressed ? 'grab' : 'default';
                canvas.hoverCursor = isSpacebarPressed ? 'grab' : 'default';
                return;
            }

            // Handle middle mouse button release
            if (evt.button === 1) {
                isPanning = false;
                canvas.selection = false;
                canvas.defaultCursor = 'default';
            }
        };

        // Prevent default middle mouse button behavior (auto-scroll)
        const preventMiddleClick = (e: MouseEvent) => {
            if (e.button === 1) {
                e.preventDefault();
                return false;
            }
        };

        const canvasElement = canvas.getElement();
        canvasElement.addEventListener('mousedown', preventMiddleClick);

        // Attach keyboard event listeners
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        // Attach event listeners
        canvas.on('mouse:wheel', handleMouseWheel);
        canvas.on('mouse:down', handleMouseDown);
        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);

        return () => {
            console.log('[PreviewPanel] Disposing fabric canvas');
            console.log('[PreviewPanel] Cleaning up ResizeObserver');
            resizeObserver.disconnect();
            canvas.off('mouse:wheel', handleMouseWheel);
            canvas.off('mouse:down', handleMouseDown);
            canvas.off('mouse:move', handleMouseMove);
            canvas.off('mouse:up', handleMouseUp);
            canvasElement.removeEventListener('mousedown', preventMiddleClick);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
    }, [onCanvasReady, dispatch]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!showFormatDropdown) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('.relative')) {
                setShowFormatDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showFormatDropdown]);

    // Load thumbnails from localStorage for all slides
    useEffect(() => {
        console.log('[PreviewPanel] Loading thumbnails from localStorage for', slides.length, 'slides');

        slides.forEach(slide => {
            // Skip if slide already has a thumbnail
            if (slide.thumbnailUrl) {
                console.log('[PreviewPanel] Slide', slide.id, 'already has thumbnail');
                return;
            }

            // Try to load from localStorage
            const cachedThumbnail = loadThumbnail(slide.id);
            if (cachedThumbnail) {
                console.log('[PreviewPanel] Loaded cached thumbnail for slide', slide.id);
                dispatch({
                    type: 'UPDATE_SLIDE',
                    payload: {
                        id: slide.id,
                        updates: { thumbnailUrl: cachedThumbnail }
                    }
                });
            }
        });
    }, [slides.length, dispatch]); // Only run when slide count changes

    // Load slide content
    useEffect(() => {
        console.log('[PreviewPanel] Slide content effect triggered', {
            hasCanvas: !!fabricCanvasRef.current,
            hasSlide: !!selectedSlide,
            slideId: selectedSlide?.id,
            imageUrl: selectedSlide?.imageUrl,
            textBox: selectedSlide?.textBox,
            imageTransform: selectedSlide?.imageTransform
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
            canvas.backgroundColor = '#1f2937'; // dark gray artboard
            imageRef.current = null;
            textBoxRef.current = null;
            canvas.renderAll();
            return;
        }

        canvas.clear();
        canvas.backgroundColor = '#1f2937'; // artboard background
        imageRef.current = null;
        textBoxRef.current = null;

        let cancelled = false;
        let textSyncFrame: number | null = null;
        let imageSyncFrame: number | null = null;

        const slideId = selectedSlide.id;
        const textProps = getTextInitialProps(
            selectedSlide,
            exportWidth,
            exportHeight,
            frameOffsetX,
            frameOffsetY
        );
        console.log('[PreviewPanel] Calculated textProps:', textProps);
        const slideText = normalizeSlideText(selectedSlide.text) || 'Your text here';

        // --- Export frame rect (white) ---
        const frameRect = new fabric.Rect({
            left: frameOffsetX,
            top: frameOffsetY,
            width: exportWidth,
            height: exportHeight,
            fill: '#ffffff',
            stroke: '#d1d5db',
            strokeWidth: 2,
            selectable: false,
            evented: false,
            hoverCursor: 'default',
        });
        canvas.add(frameRect);
        frameRectRef.current = frameRect;

        // --- Dim overlay rectangles (cover area outside export frame) ---
        const dimColor = 'rgba(0, 0, 0, 0.5)'; // 50% black overlay
        const overlayGeometry = getOverlayGeometry(canvas.getZoom() ?? 1);
        const {
            horizontalOverlayHeight,
            verticalOverlayWidth,
            horizontalOverlayLeft,
            horizontalOverlayWidth,
            topOverlayTop,
        } = overlayGeometry;

        // Top overlay
        const topOverlay = new fabric.Rect({
            left: horizontalOverlayLeft,
            top: topOverlayTop,
            width: horizontalOverlayWidth,
            height: horizontalOverlayHeight,
            fill: dimColor,
            selectable: false,
            evented: false,
            hoverCursor: 'default',
        });

        // Bottom overlay
        const bottomOverlay = new fabric.Rect({
            left: horizontalOverlayLeft,
            top: frameOffsetY + exportHeight,
            width: horizontalOverlayWidth,
            height: horizontalOverlayHeight,
            fill: dimColor,
            selectable: false,
            evented: false,
            hoverCursor: 'default',
        });

        // Left overlay
        const leftOverlay = new fabric.Rect({
            left: frameOffsetX - verticalOverlayWidth,
            top: frameOffsetY,
            width: verticalOverlayWidth,
            height: exportHeight,
            fill: dimColor,
            selectable: false,
            evented: false,
            hoverCursor: 'default',
        });

        // Right overlay
        const rightOverlay = new fabric.Rect({
            left: frameOffsetX + exportWidth,
            top: frameOffsetY,
            width: verticalOverlayWidth,
            height: exportHeight,
            fill: dimColor,
            selectable: false,
            evented: false,
            hoverCursor: 'default',
        });

        canvas.add(topOverlay, bottomOverlay, leftOverlay, rightOverlay);

        // Store overlay references for z-ordering
        const overlayRects = [topOverlay, bottomOverlay, leftOverlay, rightOverlay];
        overlayRefs.current = overlayRects;

        // --- Store sync helpers (store still uses coordinates RELATIVE to frame) ---
        const syncTextToStore = (textbox: fabric.Textbox) => {
            const left = (textbox.left ?? textProps.left) - frameOffsetX;
            const top = (textbox.top ?? textProps.top) - frameOffsetY;

            console.log('[PreviewPanel] Syncing text to store', {
                angle: textbox.angle,
                scaleX: textbox.scaleX,
                scaleY: textbox.scaleY,
                width: textbox.width,
                left,
                top
            });

            dispatch({
                type: 'UPDATE_SLIDE',
                payload: {
                    id: slideId,
                    updates: {
                        text: textbox.text || '',
                        textBox: {
                            left,
                            top,
                            width: textbox.width ?? (textProps as any).width,
                            fontSize: textbox.fontSize ?? DEFAULT_TEXT_STYLE.fontSize,
                            fill: (textbox.fill as string) ?? DEFAULT_TEXT_STYLE.fill,
                            backgroundColor: (textbox.backgroundColor as string) ?? DEFAULT_TEXT_STYLE.backgroundColor,
                            textAlign: (textbox.textAlign as 'left' | 'center' | 'right') ?? DEFAULT_TEXT_STYLE.textAlign,
                            angle: textbox.angle ?? 0,
                            scaleX: textbox.scaleX ?? 1,
                            scaleY: textbox.scaleY ?? 1,
                        },
                    },
                },
            });
        };

        const syncImageToStore = (image: fabric.Image) => {
            const left = (image.left ?? 0) - frameOffsetX;
            const top = (image.top ?? 0) - frameOffsetY;

            dispatch({
                type: 'UPDATE_SLIDE',
                payload: {
                    id: slideId,
                    updates: {
                        imageTransform: {
                            left,
                            top,
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

        // --- Thumbnail Generation ---
        let thumbnailTimeout: NodeJS.Timeout;
        const updateThumbnail = () => {
            if (!canvas || cancelled) return;

            console.log('[PreviewPanel] Generating thumbnail for slide', slideId);

            // Store current viewport transform
            const currentVPT = canvas.viewportTransform?.slice();

            // Temporarily reset to identity transform for accurate capture
            // This ensures we capture the actual content, not the zoomed/panned view
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            canvas.renderAll();

            // Generate low-res thumbnail of the export frame
            const dataUrl = canvas.toDataURL({
                format: 'png',
                left: frameOffsetX,
                top: frameOffsetY,
                width: exportWidth,
                height: exportHeight,
                multiplier: 0.2, // 20% scale is enough for small thumbnails
            });

            // Restore viewport transform
            if (currentVPT && currentVPT.length === 6) {
                canvas.setViewportTransform(currentVPT as [number, number, number, number, number, number]);
                canvas.renderAll();
            }

            // Save to localStorage for persistence
            saveThumbnail(slideId, dataUrl);

            // Update store
            dispatch({
                type: 'UPDATE_SLIDE',
                payload: {
                    id: slideId,
                    updates: { thumbnailUrl: dataUrl }
                }
            });

            console.log('[PreviewPanel] Thumbnail saved for slide', slideId);
        };

        const debouncedUpdateThumbnail = () => {
            if (thumbnailTimeout) clearTimeout(thumbnailTimeout);
            thumbnailTimeout = setTimeout(updateThumbnail, 500);
        };

        const handleObjectModified = (event: fabric.ModifiedEvent<MouseEvent>) => {
            const target = event.target;
            if (!target) return;
            if (textBoxRef.current && target === textBoxRef.current) {
                scheduleTextSync();
            } else if (imageRef.current && target === imageRef.current) {
                scheduleImageSync();
            }
            debouncedUpdateThumbnail();
        };

        const realtimeHandler = (event: any) => {
            const target = event.target;
            if (!target) return;
            if (textBoxRef.current && target === textBoxRef.current) {
                scheduleTextSync();
            } else if (imageRef.current && target === imageRef.current) {
                scheduleImageSync();
            }
            debouncedUpdateThumbnail();
        };

        // Ensure proper z-ordering: frame at back, image above frame, overlays above image, text on top
        const ensureProperZOrder = () => {
            // 1. Frame at the very back
            canvas.sendObjectToBack(frameRect);
            // 2. Image above frame (if it exists)
            if (imageRef.current) {
                canvas.bringObjectForward(imageRef.current);
            }
            // 3. Bring overlays above image
            overlayRects.forEach(overlay => canvas.bringObjectToFront(overlay));
            // 4. Bring text above everything
            if (textBoxRef.current) {
                canvas.bringObjectToFront(textBoxRef.current);
            }
        };

        const handleMoving = (event: any) => {
            realtimeHandler(event);
            ensureProperZOrder(); // Maintain z-order during movement
        };

        const handleScaling = (event: any) => {
            console.log('[PreviewPanel] Scaling', event.target?.scaleX, event.target?.scaleY);
            realtimeHandler(event);
            ensureProperZOrder(); // Maintain z-order during scaling
        };

        const handleRotating = (event: any) => {
            console.log('[PreviewPanel] Rotating', event.target?.angle);
            realtimeHandler(event);
            ensureProperZOrder(); // Maintain z-order during rotation
        };

        canvas.on('object:modified', handleObjectModified);
        canvas.on('object:moving', handleMoving);
        canvas.on('object:scaling', handleScaling);
        canvas.on('object:rotating', handleRotating);
        // Ensure proper z-order after any selection or modification
        canvas.on('selection:created', ensureProperZOrder);
        canvas.on('selection:updated', ensureProperZOrder);
        canvas.on('object:modified', ensureProperZOrder);

        // --- Background image ---
        const imageUrl = selectedSlide.imageUrl;
        const initImage = async () => {
            if (!imageUrl) return;
            console.log('[PreviewPanel] Loading background image', imageUrl);
            try {
                const img = await fabric.Image.fromURL(imageUrl, { crossOrigin: 'anonymous' });
                if (!img || cancelled) return;

                imageRef.current = img;
                const isImageMode = editMode === 'image';
                img.selectable = isImageMode;
                img.evented = isImageMode;
                img.perPixelTargetFind = true;

                // Apply control customization directly to this object
                img.set({
                    hoverCursor: isImageMode ? 'move' : 'default',
                    lockMovementX: !isImageMode,
                    lockMovementY: !isImageMode,
                    lockScalingX: !isImageMode,
                    lockScalingY: !isImageMode,
                    hasControls: isImageMode,
                    hasBorders: isImageMode,
                    // Control styling - smaller handles
                    borderColor: '#a855f7',
                    cornerColor: '#ffffff',
                    cornerStrokeColor: '#a855f7',
                    cornerSize: 8,
                    transparentCorners: false,
                    cornerStyle: 'rect',
                    borderScaleFactor: 2,
                    padding: 8,
                    objectCaching: false,
                    strokeUniform: true,
                });

                if (selectedSlide.imageTransform) {
                    // imageTransform is stored RELATIVE to frame
                    img.set({
                        left: selectedSlide.imageTransform.left + frameOffsetX,
                        top: selectedSlide.imageTransform.top + frameOffsetY,
                        scaleX: selectedSlide.imageTransform.scaleX,
                        scaleY: selectedSlide.imageTransform.scaleY,
                    });
                } else if (img.width && img.height) {
                    // Cover the export frame, not the whole artboard
                    const coverScale = Math.max(
                        exportWidth / img.width,
                        exportHeight / img.height
                    );
                    img.scale(coverScale);
                    img.left = frameOffsetX + (exportWidth - img.getScaledWidth()) / 2;
                    img.top = frameOffsetY + (exportHeight - img.getScaledHeight()) / 2;
                } else {
                    img.scaleToWidth(exportWidth);
                    img.scaleToHeight(exportHeight);
                    img.left = frameOffsetX;
                }

                // Apply filters if present
                if (selectedSlide.imageFilters) {
                    const filters = selectedSlide.imageFilters;
                    const newFilters: any[] = [];
                    if (filters.saturation) newFilters.push(new fabric.filters.Saturation({ saturation: filters.saturation }));
                    if (filters.brightness) newFilters.push(new fabric.filters.Brightness({ brightness: filters.brightness }));
                    if (filters.contrast) newFilters.push(new fabric.filters.Contrast({ contrast: filters.contrast }));
                    if (filters.blur) newFilters.push(new fabric.filters.Blur({ blur: filters.blur }));
                    if (filters.noise) newFilters.push(new fabric.filters.Noise({ noise: filters.noise * 100 }));
                    if (filters.pixelate) newFilters.push(new fabric.filters.Pixelate({ blocksize: filters.pixelate * 10 }));

                    img.filters = newFilters;
                    img.applyFilters();
                }

                canvas.add(img);
                // Ensure proper z-ordering: frame, image, overlays, text
                ensureProperZOrder();
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

        // --- Text box ---
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
            angle: textProps.angle,
            scaleX: textProps.scaleX,
            scaleY: textProps.scaleY,
            // Prevent font stretching - lock Y-axis scaling
            lockScalingY: true,
            lockScalingFlip: true,
            // Control styling - smaller handles
            borderColor: '#a855f7',
            cornerColor: '#ffffff',
            cornerStrokeColor: '#a855f7',
            cornerSize: 8,
            transparentCorners: false,
            cornerStyle: 'rect',
            borderScaleFactor: 2,
            objectCaching: false,
            strokeUniform: true,
        });

        // Hide corner controls to prevent diagonal scaling (which would stretch font)
        // Only show middle-left and middle-right for horizontal width adjustment
        textBox.setControlsVisibility({
            tl: false, // top-left corner
            tr: false, // top-right corner
            bl: false, // bottom-left corner
            br: false, // bottom-right corner
            mt: false, // middle-top
            mb: false, // middle-bottom
            ml: true,  // middle-left (for width adjustment)
            mr: true,  // middle-right (for width adjustment)
            mtr: true, // rotation control (keep this)
        });

        canvas.add(textBox);
        (textBox as any).bringToFront?.();
        textBoxRef.current = textBox;

        // if (onTextSelected) {
        //     onTextSelected(textBox);
        // }

        canvas.renderAll();

        // Generate initial thumbnail if slide doesn't have one
        if (!selectedSlide.thumbnailUrl) {
            console.log('[PreviewPanel] Generating initial thumbnail for slide', slideId);
            // Wait a bit for canvas to fully render, then generate thumbnail
            setTimeout(() => {
                if (!cancelled) {
                    updateThumbnail();
                }
            }, 100);
        }

        const handleTextChanged = () => {
            scheduleTextSync();
            debouncedUpdateThumbnail();
        };

        textBox.on('changed', handleTextChanged as any);
        textBox.on('editing:exited', handleTextChanged as any);

        // Listen for modifications from StylePanel (which fires object:modified)
        canvas.on('object:modified', handleObjectModified);
        canvas.on('object:moving', handleMoving);
        canvas.on('object:scaling', handleScaling);
        canvas.on('object:rotating', handleRotating);
        // Ensure proper z-order after any selection or modification
        canvas.on('selection:created', ensureProperZOrder);
        canvas.on('selection:updated', ensureProperZOrder);
        canvas.on('object:modified', ensureProperZOrder);

        return () => {
            cancelled = true;
            overlayRefs.current = [];

            // Flush pending text sync on unmount
            if (textSyncFrame !== null) {
                cancelAnimationFrame(textSyncFrame);
                if (textBoxRef.current) {
                    syncTextToStore(textBoxRef.current);
                }
            }
            if (imageSyncFrame !== null) {
                cancelAnimationFrame(imageSyncFrame);
                if (imageRef.current) {
                    syncImageToStore(imageRef.current);
                }
            }

            if (thumbnailTimeout) clearTimeout(thumbnailTimeout);
            textBox.off('changed', handleTextChanged as any);
            textBox.off('editing:exited', handleTextChanged as any);
            canvas.off('object:modified', handleObjectModified);
            canvas.off('object:moving', handleMoving);
            canvas.off('object:scaling', handleScaling);
            canvas.off('object:rotating', handleRotating);
            canvas.off('selection:created', ensureProperZOrder);
            canvas.off('selection:updated', ensureProperZOrder);
            canvas.off('object:modified', ensureProperZOrder);
        };
    }, [
        selectedSlide?.id,
        selectedSlide?.imageUrl,
        slides.length,
        selectedSlideId,
        dispatch,
        onTextSelected,
        editMode,
        exportWidth,
        exportHeight,
        frameOffsetX,
        frameOffsetY,
        getOverlayGeometry,
    ]);

    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        const overlayRects = overlayRefs.current;
        if (overlayRects.length !== 4) return;

        const zoom = viewport.zoom ?? canvas.getZoom() ?? 1;
        const {
            horizontalOverlayHeight,
            verticalOverlayWidth,
            horizontalOverlayLeft,
            horizontalOverlayWidth,
            topOverlayTop,
        } = getOverlayGeometry(zoom);

        const [topOverlay, bottomOverlay, leftOverlay, rightOverlay] = overlayRects;
        topOverlay.set({
            left: horizontalOverlayLeft,
            top: topOverlayTop,
            width: horizontalOverlayWidth,
            height: horizontalOverlayHeight,
        });
        bottomOverlay.set({
            left: horizontalOverlayLeft,
            top: frameOffsetY + exportHeight,
            width: horizontalOverlayWidth,
            height: horizontalOverlayHeight,
        });
        leftOverlay.set({
            left: frameOffsetX - verticalOverlayWidth,
            top: frameOffsetY,
            width: verticalOverlayWidth,
            height: exportHeight,
        });
        rightOverlay.set({
            left: frameOffsetX + exportWidth,
            top: frameOffsetY,
            width: verticalOverlayWidth,
            height: exportHeight,
        });
        overlayRects.forEach((rect) => rect.setCoords());
        canvas.requestRenderAll();
    }, [viewport.zoom, exportWidth, exportHeight, frameOffsetX, frameOffsetY, getOverlayGeometry]);

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
            textBox.hasControls = isTextMode;
            textBox.hasBorders = isTextMode;
        }

        if (imageObject) {
            imageObject.selectable = isImageMode;
            imageObject.evented = isImageMode;
            imageObject.lockMovementX = !isImageMode;
            imageObject.lockMovementY = !isImageMode;
            imageObject.lockScalingX = !isImageMode;
            imageObject.lockScalingY = !isImageMode;
            imageObject.hoverCursor = isImageMode ? 'move' : 'default';
            imageObject.hasControls = isImageMode;
            imageObject.hasBorders = isImageMode;
        }

        // Deselect any active object first
        canvas.discardActiveObject();

        if (isTextMode && textBox) {
            canvas.setActiveObject(textBox);
        } else if (isImageMode && imageObject) {
            canvas.setActiveObject(imageObject);
        }

        // Ensure proper z-ordering is maintained
        ensureProperZOrder();
        canvas.requestRenderAll();
    }, [editMode, ensureProperZOrder]);

    const handleDownload = async () => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) {
            console.warn('[PreviewPanel] Download requested but no Fabric canvas');
            return;
        }

        const slideId = selectedSlide?.id || 'slide';

        try {
            console.log('[PreviewPanel] Starting download for slide', slideId);

            // Store current viewport transform
            const currentVPT = canvas.viewportTransform?.slice();

            // Temporarily reset to identity transform for accurate capture
            // This ensures we capture the actual export frame, not the zoomed/panned view
            canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            canvas.requestRenderAll();

            // Capture the export frame at high resolution
            const dataUrl = canvas.toDataURL({
                format: 'png',
                left: frameOffsetX,
                top: frameOffsetY,
                width: exportWidth,
                height: exportHeight,
                multiplier: 2, // 2x resolution for high quality (e.g., 2160x2700 for 4:5)
            });

            // Restore viewport transform
            if (currentVPT && currentVPT.length === 6) {
                canvas.setViewportTransform(currentVPT as [number, number, number, number, number, number]);
                canvas.requestRenderAll();
            }

            // Download the image
            const link = document.createElement('a');
            link.download = `${slideId}.png`;
            link.href = dataUrl;
            link.click();

            console.log('[PreviewPanel] Download completed successfully');
        } catch (error) {
            console.error('[PreviewPanel] Download failed:', error);
            alert('Failed to download image. Please try again.');
        }
    };

    const handlePreviewModeSwitch = (newMode: PreviewMode) => {
        dispatch({ type: 'SET_PREVIEW_MODE', payload: newMode });
        if (newMode === 'text' || newMode === 'image') {
            dispatch({ type: 'SET_EDIT_MODE', payload: newMode });
        }
    };

    const handleFormatChange = (newRatio: AspectRatio) => {
        dispatch({ type: 'SET_ASPECT_RATIO', payload: newRatio });
        setShowFormatDropdown(false);
    };

    const handleAddSlide = () => {
        const newId = `slide-${Date.now()}`;
        const newSlide: Slide = {
            id: newId,
            role: 'other',
            text: 'New Slide',
            imageUrl: '',
            status: 'draft',
            meta: {},
        };
        dispatch({ type: 'ADD_SLIDE', payload: newSlide });
        dispatch({ type: 'SET_SELECTED_SLIDE', payload: newId });

        // Switch to text mode to allow immediate editing
        dispatch({ type: 'SET_PREVIEW_MODE', payload: 'text' });
        dispatch({ type: 'SET_EDIT_MODE', payload: 'text' });
    };

    const moveSlide = useCallback((dragIndex: number, hoverIndex: number) => {
        dispatch({
            type: 'REORDER_SLIDES',
            payload: { fromIndex: dragIndex, toIndex: hoverIndex },
        });
    }, [dispatch]);

    return (
        <div className="h-full flex flex-col bg-gray-950 relative">
            {/* Toolbar */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-gray-900/90 backdrop-blur-sm px-3 py-2 rounded-full border border-gray-800 shadow-xl">
                {/* Format Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">Format:</span>
                    <div className="relative">
                        <button
                            onClick={() => setShowFormatDropdown(!showFormatDropdown)}
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded px-2.5 py-1 transition-colors"
                        >
                            {/* Visual aspect ratio preview */}
                            <div className="flex items-center justify-center w-5 h-5">
                                <div
                                    className="bg-white rounded-sm"
                                    style={{
                                        width: aspectRatio === '16:9' ? '20px' : aspectRatio === '9:16' ? '11px' : aspectRatio === '4:5' ? '13px' : aspectRatio === '3:4' ? '13px' : '16px',
                                        height: aspectRatio === '16:9' ? '11px' : aspectRatio === '9:16' ? '20px' : aspectRatio === '4:5' ? '16px' : aspectRatio === '3:4' ? '17px' : '16px',
                                    }}
                                />
                            </div>
                            <span className="text-xs font-mono text-white">{aspectRatio}</span>
                            <ChevronDown className="w-3 h-3 text-gray-400" />
                        </button>
                        {showFormatDropdown && (
                            <div className="absolute top-full mt-2 left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden min-w-[140px]">
                                {ASPECT_RATIOS.map((ratio) => (
                                    <button
                                        key={ratio.label}
                                        onClick={() => handleFormatChange(ratio.label)}
                                        className={`w-full px-3 py-2 text-left text-xs font-mono transition-colors flex items-center gap-2 ${aspectRatio === ratio.label
                                            ? 'bg-purple-600 text-white'
                                            : 'text-gray-300 hover:bg-gray-700'
                                            }`}
                                    >
                                        {/* Visual preview in dropdown */}
                                        <div className="flex items-center justify-center w-5 h-5">
                                            <div
                                                className={`rounded-sm ${aspectRatio === ratio.label ? 'bg-white' : 'bg-gray-400'}`}
                                                style={{
                                                    width: ratio.label === '16:9' ? '20px' : ratio.label === '9:16' ? '11px' : ratio.label === '4:5' ? '13px' : ratio.label === '3:4' ? '13px' : '16px',
                                                    height: ratio.label === '16:9' ? '11px' : ratio.label === '9:16' ? '20px' : ratio.label === '4:5' ? '16px' : ratio.label === '3:4' ? '17px' : '16px',
                                                }}
                                            />
                                        </div>
                                        {ratio.displayLabel}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="w-px h-4 bg-gray-700" />

                {/* Mode Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">Mode:</span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => handlePreviewModeSwitch('prompt')}
                            className={`px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${previewMode === 'prompt'
                                ? 'bg-purple-600 text-white'
                                : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                                }`}
                            title="Prompt Mode"
                        >
                            <FileCode className="w-4 h-4" />
                            <span className="text-xs font-medium">Prompt</span>
                        </button>
                        <button
                            onClick={() => handlePreviewModeSwitch('text')}
                            className={`px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${previewMode === 'text'
                                ? 'bg-purple-600 text-white'
                                : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                                }`}
                            title="Text Mode"
                        >
                            <Type className="w-4 h-4" />
                            <span className="text-xs font-medium">Text</span>
                        </button>
                        <button
                            onClick={() => handlePreviewModeSwitch('image')}
                            className={`px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1.5 ${previewMode === 'image'
                                ? 'bg-purple-600 text-white'
                                : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                                }`}
                            title="Image Mode"
                        >
                            <ImageIcon className="w-4 h-4" />
                            <span className="text-xs font-medium">Image</span>
                        </button>
                    </div>
                </div>

                <div className="w-px h-4 bg-gray-700" />

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
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
            </div>

            {/* Main Canvas / Prompt Overlay */}
            <div className="flex-1 flex items-center justify-center overflow-hidden relative">
                <div
                    ref={(node) => {
                        drop(node);
                        if (previewRef) (previewRef as any).current = node;
                    }}
                    className={`relative bg-gray-950 shadow-2xl flex items-center justify-center overflow-hidden transition-opacity ${isPromptMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                        } ${isOver ? 'ring-4 ring-purple-500 ring-inset' : ''}`}
                    style={{ width: '100%', height: '100%' }}
                >
                    {isEmpty && (
                        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-gray-950 text-gray-500 space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-gray-900 flex items-center justify-center">
                                <ImageIcon className="w-8 h-8 opacity-30" />
                            </div>
                            <p>Generate or load a run to preview slides</p>
                        </div>
                    )}
                    <canvas
                        ref={canvasRef}
                        style={{
                            width: '100%',
                            height: '100%',
                            opacity: isEmpty ? 0.1 : 1,
                        }}
                    />
                </div>
                {isPromptMode && (
                    <div className="absolute inset-0 z-20">
                        <PromptModeView />
                    </div>
                )}
            </div>

            {/* Storyboard Strip */}
            {showStoryboard && (
                <div className="h-28 bg-gray-900 border-t border-gray-800 px-4 py-2 flex flex-col gap-1.5">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Slideshow:
                    </div>
                    <div className="flex-1 flex items-center gap-3 overflow-x-auto min-h-0">
                        {slides.map((slide, index) => (
                            <DraggableSlide
                                key={slide.id}
                                slide={slide}
                                index={index}
                                selectedSlideId={selectedSlideId}
                                aspectRatio={aspectRatio}
                                moveSlide={moveSlide}
                                onClick={() => {
                                    dispatch({ type: 'SET_SELECTED_SLIDE', payload: slide.id });
                                    dispatch({ type: 'SET_PREVIEW_MODE', payload: 'text' });
                                    dispatch({ type: 'SET_EDIT_MODE', payload: 'text' });
                                }}
                            />
                        ))}

                        <button
                            onClick={handleAddSlide}
                            style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                            className="flex-shrink-0 h-full rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-600 flex items-center justify-center text-gray-500 hover:text-gray-400 transition-colors"
                        >
                            <span className="text-2xl">+</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

interface DraggableSlideProps {
    slide: Slide;
    index: number;
    selectedSlideId: string | null;
    aspectRatio: AspectRatio;
    moveSlide: (dragIndex: number, hoverIndex: number) => void;
    onClick: () => void;
}

function DraggableSlide({ slide, index, selectedSlideId, aspectRatio, moveSlide, onClick }: DraggableSlideProps) {
    const ref = useRef<HTMLButtonElement>(null);

    const [{ handlerId }, drop] = useDrop<
        { index: number; id: string; type: string },
        void,
        { handlerId: string | symbol | null }
    >({
        accept: 'SLIDE_THUMBNAIL',
        collect(monitor) {
            return {
                handlerId: monitor.getHandlerId(),
            };
        },
        hover(item: { index: number; id: string; type: string }, monitor) {
            if (!ref.current) {
                return;
            }
            const dragIndex = item.index;
            const hoverIndex = index;

            // Don't replace items with themselves
            if (dragIndex === hoverIndex) {
                return;
            }

            // Determine rectangle on screen
            const hoverBoundingRect = ref.current?.getBoundingClientRect();

            // Get horizontal middle
            const hoverMiddleX = (hoverBoundingRect.right - hoverBoundingRect.left) / 2;

            // Determine mouse position
            const clientOffset = monitor.getClientOffset();

            // Get pixels to the left
            const hoverClientX = (clientOffset as any).x - hoverBoundingRect.left;

            // Only perform the move when the mouse has crossed half of the items width
            // When dragging right, only move when the cursor is past 50%
            // When dragging left, only move when the cursor is before 50%

            // Dragging right
            if (dragIndex < hoverIndex && hoverClientX < hoverMiddleX) {
                return;
            }

            // Dragging left
            if (dragIndex > hoverIndex && hoverClientX > hoverMiddleX) {
                return;
            }

            // Time to actually perform the action
            moveSlide(dragIndex, hoverIndex);

            // Note: we're mutating the monitor item here!
            // Generally it's better to avoid mutations,
            // but it's good here for the sake of performance
            // to avoid expensive index searches.
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag] = useDrag({
        type: 'SLIDE_THUMBNAIL',
        item: () => {
            return { id: slide.id, index };
        },
        collect: (monitor: any) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    drag(drop(ref));

    return (
        <button
            ref={ref}
            onClick={onClick}
            style={{ aspectRatio: aspectRatio.replace(':', '/'), opacity: isDragging ? 0.4 : 1 }}
            className={`flex-shrink-0 h-full rounded-lg border-2 transition-all overflow-hidden relative cursor-move ${selectedSlideId === slide.id
                ? 'border-purple-500 ring-2 ring-purple-500/20'
                : 'border-gray-700 hover:border-gray-600'
                }`}
            data-handler-id={handlerId}
        >
            <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                <span className="text-xs text-gray-500 font-medium">{index + 1}</span>
            </div>
            {slide.thumbnailUrl ? (
                <img src={slide.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : slide.imageUrl ? (
                <img src={slide.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            ) : null}
        </button>
    );
}
