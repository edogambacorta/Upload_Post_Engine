import { useMemo, useState, useEffect } from 'react';
import * as fabric from 'fabric';
import {
    Palette,
    Image,
    Type as TypeIcon,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Loader2,
    MonitorPlay,
    Copy,
    Check,
    ImageIcon as GalleryIcon,
    ChevronDown,
    ChevronRight,
    Sliders,
} from 'lucide-react';
import { GallerySidebar } from '../../gallery/GallerySidebar';
import { GalleryImage } from '../../../lib/gallery/types';
import { useStudio } from '../../../lib/studio/store';

interface StylePanelProps {
    fabricCanvas?: fabric.Canvas | null;
    selectedText?: fabric.Textbox | null;
}

const palettePromptMap: Record<string, { label: string; prompt: string; swatch: string }> = {
    'blue-green': {
        label: 'Tropical Glow',
        prompt: 'vibrant teal and mint palette',
        swatch: 'from-blue-400 to-green-300',
    },
    'purple-pink': {
        label: 'Neon Dream',
        prompt: 'electric purple and pink palette',
        swatch: 'from-fuchsia-500 to-pink-400',
    },
    'orange-red': {
        label: 'Sunset Pop',
        prompt: 'warm orange and coral palette',
        swatch: 'from-orange-400 to-rose-500',
    },
    monochrome: {
        label: 'Monochrome',
        prompt: 'clean grayscale palette',
        swatch: 'from-slate-200 to-slate-500',
    },
};

const stylePromptMap: Record<string, string> = {
    'flat-vector': 'flat vector illustration, minimal shading',
    '3d-render': 'soft 3D render with cinematic lighting',
    watercolor: 'delicate watercolor wash with organic edges',
    'line-art': 'minimalist line art with selective fills',
};

const CollapsibleSection = ({
    title,
    icon: Icon,
    isOpen,
    onToggle,
    children
}: {
    title: string;
    icon: any;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) => (
    <div className="border-b border-gray-800">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-800/50 transition-colors"
        >
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-300">
                <Icon className="w-4 h-4" />
                {title}
            </div>
            {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
        </button>
        {isOpen && <div className="p-4 pt-0">{children}</div>}
    </div>
);

export function StylePanel({ fabricCanvas, selectedText }: StylePanelProps) {
    const { state, dispatch } = useStudio();
    const { slides, selectedSlideId, isGenerating, imageModel, audience, topic, editMode, aspectRatio } = state;
    const selectedSlide = slides.find((slide) => slide.id === selectedSlideId) ?? slides[0] ?? null;

    // Image mode state
    const [selectedPalette, setSelectedPalette] = useState<string>('blue-green');
    const [selectedStyle, setSelectedStyle] = useState<string>('flat-vector');
    const [reserveTop, setReserveTop] = useState(false);
    const [reserveBottom, setReserveBottom] = useState(false);
    const [centerSubject, setCenterSubject] = useState(true);

    const [openSections, setOpenSections] = useState({
        create: true,
        gallery: false,
        edit: false
    });

    const toggleSection = (section: keyof typeof openSections) => {
        setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Filter state
    const [filters, setFilters] = useState({
        saturation: 0,
        brightness: 0,
        contrast: 0,
        blur: 0,
        noise: 0,
        pixelate: 0
    });

    // Sync filters from slide
    useEffect(() => {
        if (selectedSlide?.imageFilters) {
            setFilters(prev => ({
                ...prev,
                ...selectedSlide.imageFilters
            }));
        } else {
            setFilters({
                saturation: 0,
                brightness: 0,
                contrast: 0,
                blur: 0,
                noise: 0,
                pixelate: 0
            });
        }
    }, [selectedSlide?.id]);

    const applyFilter = (type: string, value: number) => {
        if (!fabricCanvas || !selectedSlide) return;

        const newFiltersState = { ...filters, [type]: value };
        setFilters(newFiltersState);

        // Update store
        dispatch({
            type: 'UPDATE_SLIDE',
            payload: {
                id: selectedSlide.id,
                updates: {
                    imageFilters: newFiltersState
                }
            }
        });

        const objects = fabricCanvas.getObjects();
        const imgObj = objects.find(obj => obj.type === 'image') as fabric.Image;

        if (imgObj) {
            const newFilters: any[] = [];

            if (newFiltersState.saturation !== 0) {
                newFilters.push(new fabric.filters.Saturation({ saturation: newFiltersState.saturation }));
            }
            if (newFiltersState.brightness !== 0) {
                newFilters.push(new fabric.filters.Brightness({ brightness: newFiltersState.brightness }));
            }
            if (newFiltersState.contrast !== 0) {
                newFilters.push(new fabric.filters.Contrast({ contrast: newFiltersState.contrast }));
            }
            if (newFiltersState.blur > 0) {
                newFilters.push(new fabric.filters.Blur({ blur: newFiltersState.blur }));
            }
            if (newFiltersState.noise > 0) {
                newFilters.push(new fabric.filters.Noise({ noise: newFiltersState.noise * 100 }));
            }
            if (newFiltersState.pixelate > 0) {
                newFilters.push(new fabric.filters.Pixelate({ blocksize: newFiltersState.pixelate * 10 }));
            }

            imgObj.filters = newFilters;
            imgObj.applyFilters();
            fabricCanvas.renderAll();
        }
    };

    const handleImageSelect = (image: GalleryImage) => {
        if (!selectedSlide) return;

        // Update slide with new image
        dispatch({
            type: 'UPDATE_SLIDE',
            payload: {
                id: selectedSlide.id,
                updates: {
                    imageUrl: image.imageUrl,
                    // We could also update prompt/etc if we wanted to match the selected image
                },
            },
        });

        // Also update the canvas immediately if possible, but the PreviewPanel should handle it via store update.
    };

    // Text mode state
    const [textColor, setTextColor] = useState('#1a1a1a');
    const [fontSize, setFontSize] = useState(32);
    const [bgColor, setBgColor] = useState('#ffffff');
    const [bgOpacity, setBgOpacity] = useState(95);

    // Sync text properties from Fabric object
    useEffect(() => {
        if (selectedText && editMode === 'text') {
            setTextColor((selectedText.fill as string) || '#1a1a1a');
            setFontSize(selectedText.fontSize || 32);

            const bg = selectedText.backgroundColor as string;
            if (bg) {
                const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (match) {
                    const [, r, g, b, a] = match;
                    setBgColor(`#${[r, g, b].map((x) => parseInt(x).toString(16).padStart(2, '0')).join('')}`);
                    setBgOpacity(a ? Math.round(parseFloat(a) * 100) : 95);
                }
            }
        }
    }, [selectedText, editMode]);

    const fireModified = () => {
        if (fabricCanvas && selectedText) {
            fabricCanvas.fire('object:modified', { target: selectedText });
        }
    };

    const handleTextColorChange = (color: string) => {
        setTextColor(color);
        if (selectedText && fabricCanvas) {
            selectedText.set('fill', color);
            fabricCanvas.renderAll();
            fireModified();
        }
    };

    const handleFontSizeChange = (size: number) => {
        setFontSize(size);
        if (selectedText && fabricCanvas) {
            selectedText.set('fontSize', size);
            fabricCanvas.renderAll();
            fireModified();
        }
    };

    const handleBgColorChange = (color: string) => {
        setBgColor(color);
        applyBackgroundColor(color, bgOpacity);
    };

    const handleBgOpacityChange = (opacity: number) => {
        setBgOpacity(opacity);
        applyBackgroundColor(bgColor, opacity);
    };

    const applyBackgroundColor = (color: string, opacity: number) => {
        if (selectedText && fabricCanvas) {
            const match = color.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
            if (match) {
                const [, r, g, b] = match;
                const rgba = `rgba(${parseInt(r, 16)}, ${parseInt(g, 16)}, ${parseInt(b, 16)}, ${opacity / 100})`;
                selectedText.set('backgroundColor', rgba);
                fabricCanvas.renderAll();
                fireModified();
            }
        }
    };

    const handleAlignment = (align: 'left' | 'center' | 'right') => {
        if (selectedText && fabricCanvas) {
            selectedText.set('textAlign', align);
            fabricCanvas.renderAll();
            fireModified();
        }
    };

    const applyPreset = (preset: 'light' | 'dark' | 'purple' | 'yellow') => {
        const presets = {
            light: { text: '#1a1a1a', bg: '#ffffff', opacity: 95 },
            dark: { text: '#ffffff', bg: '#000000', opacity: 80 },
            purple: { text: '#ffffff', bg: '#8b5cf6', opacity: 90 },
            yellow: { text: '#1a1a1a', bg: '#fbbf24', opacity: 90 },
        };

        const { text, bg, opacity } = presets[preset];
        setTextColor(text);
        setBgColor(bg);
        setBgOpacity(opacity);

        if (selectedText && fabricCanvas) {
            selectedText.set('fill', text);
            fabricCanvas.renderAll();
            fireModified();
            applyBackgroundColor(bg, opacity);
        }
    };

    const handleGenerateVisuals = async () => {
        if (!slides.length) return;

        dispatch({ type: 'SET_GENERATING', payload: true });

        try {
            const response = await fetch('http://localhost:5000/api/generate-visuals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    slides,
                    imageModel,
                    topic,
                    audience,
                    aspectRatio,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate visuals');
            }

            const data = await response.json();
            const results = data.results;

            results.forEach((img: any) => {
                if (!slides[img.index]) return;
                const slide = slides[img.index];
                const newUrl = `http://localhost:5000${img.imageUrl}`;
                const history = slide.imageHistory ?? [];
                const hasUrl = history.includes(newUrl);
                dispatch({
                    type: 'UPDATE_SLIDE',
                    payload: {
                        id: slide.id,
                        updates: {
                            imageUrl: newUrl,
                            imageHistory: hasUrl ? history : [...history, newUrl],
                        },
                    },
                });
            });
        } catch (error) {
            console.error('Image generation failed:', error);
        } finally {
            dispatch({ type: 'SET_GENERATING', payload: false });
        }
    };



    const imagePrompt = useMemo(() => {
        const base =
            selectedSlide?.imagePrompt ||
            selectedSlide?.variationPrompt ||
            selectedSlide?.text ||
            topic ||
            'high-impact parenting illustration';
        const segments = [
            base,
            palettePromptMap[selectedPalette].prompt,
            stylePromptMap[selectedStyle],
            centerSubject ? 'center the subject in frame' : '',
            reserveTop ? 'leave negative space at the top for headline text' : '',
            reserveBottom ? 'reserve space near the bottom for copy' : '',
            audience ? `designed for ${audience.replace(/_/g, ' ')}` : '',
            'portrait orientation 1080x1350, cinematic lighting, crisp focus',
        ];
        return segments.filter(Boolean).join(', ');
    }, [
        selectedSlide?.imagePrompt,
        selectedSlide?.variationPrompt,
        selectedSlide?.text,
        topic,
        audience,
        selectedPalette,
        selectedStyle,
        reserveTop,
        reserveBottom,
        centerSubject,
    ]);

    const [promptCopied, setPromptCopied] = useState(false);

    const handleCopyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(imagePrompt);
            setPromptCopied(true);
            setTimeout(() => setPromptCopied(false), 1200);
        } catch (error) {
            console.error('Failed to copy prompt:', error);
        }
    };

    if (editMode === 'text') {
        return (
            <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <TypeIcon className="w-4 h-4" />
                        Text Styling
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Text Color</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={textColor}
                                onChange={(e) => handleTextColorChange(e.target.value)}
                                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-700 bg-gray-800"
                            />
                            <input
                                type="text"
                                value={textColor}
                                onChange={(e) => handleTextColorChange(e.target.value)}
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Font Size</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="16"
                                max="72"
                                value={fontSize}
                                onChange={(e) => handleFontSizeChange(Number(e.target.value))}
                                className="flex-1 accent-purple-600"
                            />
                            <span className="text-white font-medium w-16 text-right">{fontSize}px</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Alignment</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAlignment('left')}
                                className="flex-1 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                            >
                                <AlignLeft className="w-5 h-5 text-gray-300 mx-auto" />
                            </button>
                            <button
                                onClick={() => handleAlignment('center')}
                                className="flex-1 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                            >
                                <AlignCenter className="w-5 h-5 text-gray-300 mx-auto" />
                            </button>
                            <button
                                onClick={() => handleAlignment('right')}
                                className="flex-1 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
                            >
                                <AlignRight className="w-5 h-5 text-gray-300 mx-auto" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Background Color</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={bgColor}
                                onChange={(e) => handleBgColorChange(e.target.value)}
                                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-700 bg-gray-800"
                            />
                            <input
                                type="text"
                                value={bgColor}
                                onChange={(e) => handleBgColorChange(e.target.value)}
                                className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Background Opacity</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={bgOpacity}
                                onChange={(e) => handleBgOpacityChange(Number(e.target.value))}
                                className="flex-1 accent-purple-600"
                            />
                            <span className="text-white font-medium w-16 text-right">{bgOpacity}%</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Quick Styles</label>
                        <div className="grid grid-cols-2 gap-2">
                            {['light', 'dark', 'purple', 'yellow'].map((preset) => (
                                <button
                                    key={preset}
                                    onClick={() => applyPreset(preset as 'light' | 'dark' | 'purple' | 'yellow')}
                                    className="p-3 bg-gray-800 text-white rounded-lg font-medium text-sm hover:ring-2 ring-purple-500 transition-all"
                                >
                                    {preset.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800 overflow-y-auto">
            <CollapsibleSection
                title="Create Image"
                icon={Image}
                isOpen={openSections.create}
                onToggle={() => toggleSection('create')}
            >
                <div className="space-y-6">
                    {!selectedSlide ? (
                        <div className="rounded-xl border border-gray-800 bg-gray-850 p-6 text-center text-gray-400">
                            Select or generate a slide to start creating images.
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <MonitorPlay className="w-4 h-4 text-green-400" />
                                    Image Model
                                </label>
                                <select
                                    value={imageModel}
                                    onChange={(e) => dispatch({ type: 'SET_IMAGE_MODEL', payload: e.target.value })}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white"
                                >
                                    <option value="flux-schnell">Flux Schnell (Fastest)</option>
                                    <option value="nanobanana">Nano Banana (Balanced)</option>
                                    <option value="nanobanana-pro">Nano Banana Pro (High Quality)</option>
                                    <option value="seedream">Seedream Edit (Artistic)</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-purple-400" />
                                    Color Palette
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    {Object.entries(palettePromptMap).map(([key, meta]) => (
                                        <button
                                            key={key}
                                            onClick={() => setSelectedPalette(key)}
                                            className={`rounded-2xl border-2 p-3 text-left transition-all ${selectedPalette === key
                                                ? 'border-purple-400 bg-purple-500/10'
                                                : 'border-gray-700 hover:border-purple-400/60'
                                                }`}
                                        >
                                            <div
                                                className={`w-full h-10 rounded-lg bg-gradient-to-r ${meta.swatch} mb-3`}
                                            />
                                            <p className="text-sm font-semibold text-white">{meta.label}</p>
                                            <p className="text-xs text-gray-400">{meta.prompt}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <Image className="w-4 h-4 text-purple-400" />
                                    Illustration Style
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.keys(stylePromptMap).map((style) => (
                                        <button
                                            key={style}
                                            onClick={() => setSelectedStyle(style)}
                                            className={`p-3 rounded-lg border text-xs text-gray-300 text-center transition-all ${selectedStyle === style
                                                ? 'bg-purple-600 border-purple-500 text-white'
                                                : 'bg-gray-800 border-gray-700 hover:border-purple-500'
                                                }`}
                                        >
                                            {style
                                                .split('-')
                                                .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                                                .join(' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-white font-medium flex items-center gap-2">
                                    <Image className="w-4 h-4 text-purple-400" />
                                    Composition
                                </h3>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={reserveTop}
                                            onChange={(e) => setReserveTop(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                                        />
                                        <span className="text-sm text-gray-300">Reserve top space</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={reserveBottom}
                                            onChange={(e) => setReserveBottom(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                                        />
                                        <span className="text-sm text-gray-300">Reserve bottom space</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={centerSubject}
                                            onChange={(e) => setCenterSubject(e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 focus:ring-offset-gray-900"
                                        />
                                        <span className="text-sm text-gray-300">Center subject</span>
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-300">Prompt preview</label>
                                    <button
                                        onClick={handleCopyPrompt}
                                        className="text-xs flex items-center gap-1 text-gray-400 hover:text-white"
                                    >
                                        {promptCopied ? (
                                            <>
                                                <Check className="w-3 h-3" />
                                                Copied
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-3 h-3" />
                                                Copy
                                            </>
                                        )}
                                    </button>
                                </div>
                                <textarea
                                    readOnly
                                    value={imagePrompt}
                                    className="w-full h-28 bg-gray-800 border border-gray-700 rounded-xl p-3 text-sm text-gray-200"
                                />
                            </div>

                            <button
                                onClick={handleGenerateVisuals}
                                disabled={isGenerating || slides.length === 0}
                                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Image'
                                )}
                            </button>
                        </>
                    )}
                </div>
            </CollapsibleSection>

            <CollapsibleSection
                title="Gallery"
                icon={GalleryIcon}
                isOpen={openSections.gallery}
                onToggle={() => toggleSection('gallery')}
            >
                <div className="h-[500px] border border-gray-800 rounded-lg overflow-hidden">
                    <GallerySidebar onSelect={handleImageSelect} />
                </div>
            </CollapsibleSection>

            <CollapsibleSection
                title="Edit Image"
                icon={Sliders}
                isOpen={openSections.edit}
                onToggle={() => toggleSection('edit')}
            >
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 flex justify-between">
                            Saturation
                            <span className="text-xs text-gray-500">{filters.saturation.toFixed(1)}</span>
                        </label>
                        <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.1"
                            value={filters.saturation}
                            onChange={(e) => applyFilter('saturation', parseFloat(e.target.value))}
                            className="w-full accent-purple-600"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 flex justify-between">
                            Brightness
                            <span className="text-xs text-gray-500">{filters.brightness.toFixed(1)}</span>
                        </label>
                        <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.1"
                            value={filters.brightness}
                            onChange={(e) => applyFilter('brightness', parseFloat(e.target.value))}
                            className="w-full accent-purple-600"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 flex justify-between">
                            Contrast
                            <span className="text-xs text-gray-500">{filters.contrast.toFixed(1)}</span>
                        </label>
                        <input
                            type="range"
                            min="-1"
                            max="1"
                            step="0.1"
                            value={filters.contrast}
                            onChange={(e) => applyFilter('contrast', parseFloat(e.target.value))}
                            className="w-full accent-purple-600"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 flex justify-between">
                            Blur
                            <span className="text-xs text-gray-500">{filters.blur.toFixed(1)}</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={filters.blur}
                            onChange={(e) => applyFilter('blur', parseFloat(e.target.value))}
                            className="w-full accent-purple-600"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 flex justify-between">
                            Noise
                            <span className="text-xs text-gray-500">{filters.noise.toFixed(1)}</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={filters.noise}
                            onChange={(e) => applyFilter('noise', parseFloat(e.target.value))}
                            className="w-full accent-purple-600"
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300 flex justify-between">
                            Pixelate (Halftone)
                            <span className="text-xs text-gray-500">{filters.pixelate.toFixed(1)}</span>
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={filters.pixelate}
                            onChange={(e) => applyFilter('pixelate', parseFloat(e.target.value))}
                            className="w-full accent-purple-600"
                        />
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
}
