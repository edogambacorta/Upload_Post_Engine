import { useStudio } from '../../../lib/studio/store';
import { Palette, Image, Type as TypeIcon, AlignLeft, AlignCenter, AlignRight, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as fabric from 'fabric';

interface StylePanelProps {
    fabricCanvas?: fabric.Canvas | null;
    selectedText?: fabric.Textbox | null;
}

export function StylePanel({ fabricCanvas, selectedText }: StylePanelProps) {
    const { state, dispatch } = useStudio();
    const { slides, isGenerating, imageModel, audience, topic, editMode } = state;

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
            setTextColor(selectedText.fill as string || '#1a1a1a');
            setFontSize(selectedText.fontSize || 32);

            const bg = selectedText.backgroundColor as string;
            if (bg) {
                // Extract color and opacity from rgba
                const match = bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
                if (match) {
                    const [, r, g, b, a] = match;
                    setBgColor(`#${[r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')}`);
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
        if (slides.length === 0) return;

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
                    audience
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to generate visuals');
            }

            const data = await response.json();
            const results = data.results;

            // Update slides with new image URLs
            results.forEach((img: any) => {
                if (slides[img.index]) {
                    dispatch({
                        type: 'UPDATE_SLIDE',
                        payload: {
                            id: slides[img.index].id,
                            updates: {
                                imageUrl: `http://localhost:3000${img.imageUrl}`
                            }
                        }
                    });
                }
            });

        } catch (error) {
            console.error('Image generation failed:', error);
        } finally {
            dispatch({ type: 'SET_GENERATING', payload: false });
        }
    };

    // Render text mode controls
    if (editMode === 'text') {
        return (
            <div className="h-full bg-gray-900 border-l border-gray-800 overflow-y-auto">
                <div className="p-4 border-b border-gray-800">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <TypeIcon className="w-4 h-4" />
                        Text Styling
                    </h2>
                </div>

                <div className="p-6 space-y-6">
                    {/* Text Color */}
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

                    {/* Font Size */}
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

                    {/* Text Alignment */}
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

                    {/* Background Color */}
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

                    {/* Background Opacity */}
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

                    {/* Quick Presets */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-300">Quick Styles</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => applyPreset('light')}
                                className="p-3 bg-white text-gray-900 rounded-lg font-medium text-sm hover:ring-2 ring-purple-500 transition-all"
                            >
                                Light
                            </button>
                            <button
                                onClick={() => applyPreset('dark')}
                                className="p-3 bg-gray-900 text-white border border-gray-700 rounded-lg font-medium text-sm hover:ring-2 ring-purple-500 transition-all"
                            >
                                Dark
                            </button>
                            <button
                                onClick={() => applyPreset('purple')}
                                className="p-3 bg-purple-600 text-white rounded-lg font-medium text-sm hover:ring-2 ring-purple-400 transition-all"
                            >
                                Purple
                            </button>
                            <button
                                onClick={() => applyPreset('yellow')}
                                className="p-3 bg-yellow-400 text-gray-900 rounded-lg font-medium text-sm hover:ring-2 ring-yellow-300 transition-all"
                            >
                                Yellow
                            </button>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <p className="text-xs text-gray-400 leading-relaxed">
                            💡 <strong>Tip:</strong> Click and drag the text box to move it. Use the corner handles to resize. Double-click to edit text.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Render image mode controls (existing visual style controls)
    return (
        <div className="h-full flex flex-col bg-gray-900 border-l border-gray-800 overflow-y-auto">
            <div className="p-4 border-b border-gray-800">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Visual Style
                </h2>
            </div>

            <div className="p-4 space-y-6">
                {/* Color Palette */}
                <div className="space-y-4">
                    <h3 className="text-white font-medium flex items-center gap-2">
                        <Palette className="w-4 h-4 text-purple-400" />
                        Color Palette
                    </h3>

                    <div className="grid grid-cols-4 gap-3">
                        <button
                            onClick={() => setSelectedPalette('blue-green')}
                            className={`w-full aspect-square rounded-full bg-gradient-to-br from-blue-400 to-green-400 transition-all ${selectedPalette === 'blue-green'
                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                                    : 'hover:ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                                }`}
                        />
                        <button
                            onClick={() => setSelectedPalette('purple-pink')}
                            className={`w-full aspect-square rounded-full bg-gradient-to-br from-purple-400 to-pink-400 transition-all ${selectedPalette === 'purple-pink'
                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                                    : 'hover:ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                                }`}
                        />
                        <button
                            onClick={() => setSelectedPalette('orange-red')}
                            className={`w-full aspect-square rounded-full bg-gradient-to-br from-orange-400 to-red-400 transition-all ${selectedPalette === 'orange-red'
                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                                    : 'hover:ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                                }`}
                        />
                        <button
                            onClick={() => setSelectedPalette('monochrome')}
                            className={`w-full aspect-square rounded-full bg-gradient-to-br from-gray-200 to-gray-600 transition-all ${selectedPalette === 'monochrome'
                                    ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                                    : 'hover:ring-2 ring-white ring-offset-2 ring-offset-gray-900'
                                }`}
                        />
                    </div>
                </div>

                {/* Illustration Style */}
                <div className="space-y-4">
                    <h3 className="text-white font-medium flex items-center gap-2">
                        <Image className="w-4 h-4 text-purple-400" />
                        Illustration Style
                    </h3>

                    <div className="grid grid-cols-2 gap-2">
                        {['flat-vector', '3d-render', 'watercolor', 'line-art'].map((style) => (
                            <button
                                key={style}
                                onClick={() => setSelectedStyle(style)}
                                className={`p-3 rounded-lg border text-xs text-gray-300 text-center transition-all ${selectedStyle === style
                                        ? 'bg-purple-600 border-purple-500 text-white'
                                        : 'bg-gray-800 border-gray-700 hover:border-purple-500'
                                    }`}
                            >
                                {style.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Composition */}
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

                {/* Generate Button */}
                <button
                    onClick={handleGenerateVisuals}
                    disabled={isGenerating || slides.length === 0}
                    className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        'Generate Visuals'
                    )}
                </button>
            </div>
        </div>
    );
}
