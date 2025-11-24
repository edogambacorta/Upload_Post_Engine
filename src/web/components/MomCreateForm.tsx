import { useState } from 'react';

type AudienceSegment = 'pregnant_anxious' | 'first_time_newborn' | 'burned_out_parent' | 'female_overwhelm';
type AspectRatio = '3:4' | '4:3' | '9:16';
type PromptModelId = 'openrouter-sonnet-4.5' | 'openrouter-gpt-5.1';
type ImageModelId = 'flux-schnell' | 'nanobanana-pro';
type MomStylePreset = 'infographic';

export function MomCreateForm() {
    // Form data
    const [basePrompt, setBasePrompt] = useState('');
    const [audience, setAudience] = useState<AudienceSegment>('first_time_newborn');
    const [stylePreset] = useState<MomStylePreset>('infographic'); // Only infographic for now
    const [promptModel, setPromptModel] = useState<PromptModelId>('openrouter-sonnet-4.5');
    const [imageModel, setImageModel] = useState<ImageModelId>('nanobanana-pro');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('3:4');
    const [count, setCount] = useState(4);

    // Generated prompts
    const [generatedPrompts, setGeneratedPrompts] = useState<string[]>([]);
    const [editablePrompts, setEditablePrompts] = useState<string[]>([]);

    // Status
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGeneratePrompts = async () => {
        setIsGeneratingPrompts(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3000/api/mom-runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    basePrompt,
                    count,
                    momConfig: {
                        audience,
                        stylePreset,
                        aspectRatio,
                        model: promptModel,
                    },
                    generateImages: false, // Only prompts initially
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate prompts');
            }

            // TODO: Fetch the generated prompts from the run and display them
            // For now, mock some prompts
            const mockPrompts = Array(count).fill('Generated infographic prompt content will appear here...');
            setGeneratedPrompts(mockPrompts);
            setEditablePrompts(mockPrompts);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGeneratingPrompts(false);
        }
    };

    const handleGenerateImages = async () => {
        setIsGeneratingImages(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:3000/api/mom-runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    basePrompt,
                    count,
                    momConfig: {
                        audience,
                        stylePreset,
                        aspectRatio,
                        model: promptModel,
                        imageModel: imageModel,
                    },
                    generateImages: true,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to generate images');
            }

            // Success - refresh the runs list
            window.location.reload();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsGeneratingImages(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Section 1: Base Prompt & Settings */}
            <div className="border border-gray-700 rounded-xl p-4 bg-gray-800/20">
                <h3 className="text-base font-semibold text-white mb-4">Base Prompt & Audience</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-2">
                            Base Prompt / Topic
                        </label>
                        <textarea
                            value={basePrompt}
                            onChange={(e) => setBasePrompt(e.target.value)}
                            placeholder="e.g., The Invisible Load of Motherhood, Postpartum Feelings Map, Baby Sleep Needs..."
                            className="w-full h-28 bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-2">
                                Audience Segment
                            </label>
                            <select
                                value={audience}
                                onChange={(e) => setAudience(e.target.value as AudienceSegment)}
                                className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent cursor-pointer"
                            >
                                <option value="pregnant_anxious">Pregnant + Anxious (A)</option>
                                <option value="first_time_newborn">First-time Mom / Newborn (B)</option>
                                <option value="burned_out_parent">Burned-out Parent (C)</option>
                                <option value="female_overwhelm">General Overwhelm (D)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-2">
                                Style Preset
                            </label>
                            <div className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-2.5 text-sm text-white">
                                Infographic (More styles coming soon)
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-2">
                            Prompt Generation Model
                        </label>
                        <select
                            value={promptModel}
                            onChange={(e) => setPromptModel(e.target.value as PromptModelId)}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent cursor-pointer"
                        >
                            <option value="openrouter-sonnet-4.5">Claude Sonnet 4.5</option>
                            <option value="openrouter-gpt-5.1">ChatGPT 5.1</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-2">
                            Number of Posts ({count})
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={count}
                            onChange={(e) => setCount(parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleGeneratePrompts}
                        disabled={isGeneratingPrompts || !basePrompt}
                        className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/20 cursor-pointer"
                    >
                        {isGeneratingPrompts ? 'Generating Prompts...' : 'Generate Prompts'}
                    </button>
                </div>
            </div>

            {/* Section 2: Generated Prompts (Editable) */}
            {generatedPrompts.length > 0 && (
                <div className="border border-gray-700 rounded-xl p-4 bg-gray-800/20">
                    <h3 className="text-base font-semibold text-white mb-4">Generated Prompts</h3>
                    <div className="space-y-3">
                        {editablePrompts.map((prompt, index) => (
                            <div key={index}>
                                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                    Prompt {index + 1}
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => {
                                        const newPrompts = [...editablePrompts];
                                        newPrompts[index] = e.target.value;
                                        setEditablePrompts(newPrompts);
                                    }}
                                    className="w-full h-20 bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all resize-none"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section 3: Image Generation Settings */}
            <div className="border border-gray-700 rounded-xl p-4 bg-gray-800/20">
                <h3 className="text-base font-semibold text-white mb-4">Image Generation Settings</h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-2">
                            Image Generation Model
                        </label>
                        <select
                            value={imageModel}
                            onChange={(e) => setImageModel(e.target.value as ImageModelId)}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent cursor-pointer"
                        >
                            <option value="nanobanana-pro">NanoBanana Pro</option>
                            <option value="flux-schnell">FLUX Schnell</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-300 mb-2">
                            Aspect Ratio
                        </label>
                        <select
                            value={aspectRatio}
                            onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                            className="w-full bg-gray-900/50 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent cursor-pointer"
                        >
                            <option value="3:4">3:4 (Portrait)</option>
                            <option value="4:3">4:3 (Landscape)</option>
                            <option value="9:16">9:16 (Stories)</option>
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerateImages}
                        disabled={isGeneratingImages || generatedPrompts.length === 0}
                        className="w-full py-3 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-pink-500/20 cursor-pointer"
                    >
                        {isGeneratingImages ? 'Generating Images...' : 'Generate Images ✨'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-xs">
                    {error}
                </div>
            )}
        </div>
    );
}
