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
} from 'lucide-react';
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

export function StylePanel({ fabricCanvas, selectedText }: StylePanelProps) {
    const { state, dispatch } = useStudio();
    const { slides, selectedSlideId, isGenerating, imageModel, audience, topic, editMode } = state;
    const selectedSlide = slides.find((slide) => slide.id === selectedSlideId) ?? slides[0] ?? null;

    // Image mode state
    const [selectedPalette, setSelectedPalette] = useState<string>('blue-green');
    const [selectedStyle, setSelectedStyle] = useState<string>('flat-vector');
    const [reserveTop, setReserveTop] = useState(false);
    const [reserveBottom, setReserveBottom] = useState(false);
    const [centerSubject, setCenterSubject] = useState(true);

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
            const response = await fetch('http://localhost:3000/api/generate-visuals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    slides,
                    imageModel,
                    topic,
                    audience,
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
                const newUrl = `http://localhost:3000${img.imageUrl}`;
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

    const imageGallery = useMemo(() => {
        if (!selectedSlide) return [];
        const history = selectedSlide.imageHistory ?? [];
        const urls = [...history];
        if (selectedSlide.imageUrl && !urls.includes(selectedSlide.imageUrl)) {
            urls.unshift(selectedSlide.imageUrl);
        }
        return urls;
    }, [selectedSlide]);

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
        <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800">
            <div className="p-4 border-b border-gray-800">
                <div>
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <Image className="w-4 h-4" />
                        Create Image
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Pick a palette, illustration style, and composition to craft your image prompt.
                    </p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                                        className={`rounded-2xl border-2 p-3 text-left transition-all ${
                                            selectedPalette === key
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
                                        className={`p-3 rounded-lg border text-xs text-gray-300 text-center transition-all ${
                                            selectedStyle === style
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

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <GalleryIcon className="w-4 h-4 text-purple-400" />
                                    Generated Images
                                </label>
                                <span className="text-xs text-gray-500">{imageGallery.length} versions</span>
                            </div>
                            {imageGallery.length === 0 ? (
                                <div className="text-xs text-gray-500 bg-gray-800 rounded-lg p-4 text-center">
                                    No images yet. Press “Create Image” to start generating.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {imageGallery.map((url, idx) => (
                                        <div
                                            key={`${url}-${idx}`}
                                            className="relative rounded-lg overflow-hidden border border-gray-800"
                                        >
                                            <img src={url} alt="" className="w-full h-32 object-cover" />
                                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-[10px] text-gray-200">
                                                Version {imageGallery.length - idx}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
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
        </div>
    );
}
