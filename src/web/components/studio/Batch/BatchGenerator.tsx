import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudio } from '../../../lib/studio/store';
import { Zap, List, Grid, CheckCircle, ArrowRight } from 'lucide-react';

export function BatchGenerator() {
    const { dispatch } = useStudio();
    const navigate = useNavigate();
    const [theme, setTheme] = useState('');
    const [count, setCount] = useState(10);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedTopics, setGeneratedTopics] = useState<string[]>([]);
    const [selectedTopics, setSelectedTopics] = useState<Set<number>>(new Set());

    const handleGenerateTopics = () => {
        setIsGenerating(true);
        // Mock generation
        setTimeout(() => {
            const topics = Array.from({ length: count }, (_, i) => `${theme} - Angle ${i + 1}`);
            setGeneratedTopics(topics);
            setIsGenerating(false);
        }, 1500);
    };

    const toggleTopic = (index: number) => {
        const newSelected = new Set(selectedTopics);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedTopics(newSelected);
    };

    const handleCreateContent = () => {
        if (selectedTopics.size === 0) return;

        // For now, just take the first selected topic and go to editor
        // In a real batch flow, we'd queue them all up
        const firstIndex = Array.from(selectedTopics)[0];
        const topic = generatedTopics[firstIndex];

        dispatch({ type: 'SET_TOPIC', payload: topic });
        dispatch({ type: 'SET_VIEW', payload: 'editor' });
        navigate('/studio/editor');
    };

    return (
        <div className="min-h-screen bg-gray-950 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <Zap className="w-8 h-8 text-blue-500" />
                            Batch Generator
                        </h1>
                        <p className="text-gray-400 mt-2">Turn one theme into dozens of posts instantly.</p>
                    </div>
                    <button
                        onClick={() => navigate('/studio')}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Configuration */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                            <h2 className="text-lg font-semibold text-white mb-4">Configuration</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Core Theme / Topic</label>
                                    <input
                                        type="text"
                                        value={theme}
                                        onChange={(e) => setTheme(e.target.value)}
                                        placeholder="e.g. Mom Guilt"
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Number of Posts</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="5"
                                            max="50"
                                            step="5"
                                            value={count}
                                            onChange={(e) => setCount(parseInt(e.target.value))}
                                            className="flex-1 accent-blue-500"
                                        />
                                        <span className="text-white font-mono w-8 text-right">{count}</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleGenerateTopics}
                                    disabled={!theme || isGenerating}
                                    className={`w-full py-3 rounded-lg font-bold text-white transition-all ${!theme || isGenerating
                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20'
                                        }`}
                                >
                                    {isGenerating ? 'Generating Ideas...' : 'Generate Topics'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div className="lg:col-span-2">
                        {generatedTopics.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <List className="w-5 h-5 text-gray-400" />
                                        Generated Topics
                                    </h2>
                                    <button
                                        onClick={() => setSelectedTopics(new Set(generatedTopics.map((_, i) => i)))}
                                        className="text-sm text-blue-400 hover:text-blue-300 font-medium"
                                    >
                                        Select All
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {generatedTopics.map((topic, index) => (
                                        <div
                                            key={index}
                                            onClick={() => toggleTopic(index)}
                                            className={`bg-gray-900 border p-4 rounded-lg transition-colors group cursor-pointer ${selectedTopics.has(index) ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 hover:border-blue-500/50'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-1 rounded">
                                                    {index % 3 === 0 ? 'Carousel' : 'Infographic'}
                                                </span>
                                                <div className={`w-5 h-5 rounded-full border-2 transition-colors flex items-center justify-center ${selectedTopics.has(index) ? 'border-blue-500 bg-blue-500' : 'border-gray-700 group-hover:border-blue-500'
                                                    }`}>
                                                    {selectedTopics.has(index) && <CheckCircle className="w-3 h-3 text-white" />}
                                                </div>
                                            </div>
                                            <h3 className="text-white font-medium mb-1">{topic}</h3>
                                            <p className="text-xs text-gray-500 line-clamp-2">
                                                Suggested angle for this post based on the core theme...
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                <div className="fixed bottom-8 right-8">
                                    <button
                                        onClick={handleCreateContent}
                                        disabled={selectedTopics.size === 0}
                                        className={`font-bold py-4 px-8 rounded-full shadow-xl flex items-center gap-3 transition-transform hover:scale-105 ${selectedTopics.size === 0
                                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                                : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/30'
                                            }`}
                                    >
                                        Generate Content for Selected ({selectedTopics.size})
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-gray-800 rounded-xl p-12">
                                <Grid className="w-16 h-16 mb-4 opacity-20" />
                                <p className="text-lg">Enter a theme to generate post ideas</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
