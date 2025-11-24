import { useEffect, useState } from 'react';
import { RunState } from '../../services/runOrchestrator';

export function MomRunsList() {
    const [runs, setRuns] = useState<RunState[]>([]);
    const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRuns();
        const interval = setInterval(fetchRuns, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const fetchRuns = async () => {
        try {
            const res = await fetch('http://localhost:3000/api/runs');
            const data = await res.json();
            // Filter for mommarketing runs
            const momRuns = data.filter((r: RunState) => r.mode === 'mommarketing');
            setRuns(momRuns);
            setLoading(false);
        } catch (err) {
            console.error('Failed to fetch runs:', err);
            setLoading(false);
        }
    };

    const handleRegenerateImage = async (runId: string, postId: string) => {
        try {
            const res = await fetch(`http://localhost:3000/api/mom-runs/${runId}/regenerate-images`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ postIds: [postId] }),
            });
            if (!res.ok) throw new Error('Failed to regenerate image');
            alert('Image regeneration started. It will update shortly.');
        } catch (err) {
            console.error('Error regenerating image:', err);
            alert('Failed to regenerate image');
        }
    };

    const handleRegeneratePrompts = async (runId: string) => {
        if (!confirm('Are you sure? This will overwrite all current prompts and images for this run.')) return;
        try {
            const res = await fetch(`http://localhost:3000/api/mom-runs/${runId}/regenerate-prompts`, {
                method: 'POST',
            });
            if (!res.ok) throw new Error('Failed to regenerate prompts');
            alert('Prompt regeneration started. The run will restart.');
            setSelectedRunId(null); // Go back to list to see status update
            fetchRuns();
        } catch (err) {
            console.error('Error regenerating prompts:', err);
            alert('Failed to regenerate prompts');
        }
    };

    const selectedRun = runs.find((r) => r.id === selectedRunId);

    if (loading) {
        return <div className="text-gray-400">Loading runs...</div>;
    }

    if (selectedRunId && selectedRun) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 backdrop-blur">
                    <button
                        onClick={() => setSelectedRunId(null)}
                        className="text-gray-400 hover:text-white flex items-center space-x-2 transition-colors font-medium"
                    >
                        <span>&larr; Back to Runs</span>
                    </button>
                    <button
                        onClick={() => handleRegeneratePrompts(selectedRun.id)}
                        className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg text-sm border border-red-500/20 transition-all"
                    >
                        Restart Run (New Prompts)
                    </button>
                </div>

                <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700/50">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-white mb-2">{selectedRun.topic}</h2>
                            <div className="flex flex-wrap gap-3 text-sm">
                                <span className="px-3 py-1 rounded-full bg-gray-700/50 text-gray-300 border border-gray-600/50">
                                    {new Date(selectedRun.id).toLocaleDateString()}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-pink-900/30 text-pink-300 border border-pink-500/30">
                                    {selectedRun.momConfig?.audience}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-purple-900/30 text-purple-300 border border-purple-500/30">
                                    {selectedRun.momConfig?.stylePreset}
                                </span>
                            </div>
                        </div>
                        <div className={`px-4 py-2 rounded-full text-sm font-bold tracking-wide ${selectedRun.status === 'DONE'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : selectedRun.status === 'ERROR'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 animate-pulse'
                            }`}>
                            {selectedRun.status}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {selectedRun.posts.map((post, index) => (
                            <div key={index} className="bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 shadow-xl group hover:border-gray-600 transition-all duration-300">
                                <div className="aspect-[3/4] relative bg-gray-950 overflow-hidden">
                                    {post.finalImageUrl ? (
                                        <img
                                            src={`http://localhost:3000${post.finalImageUrl}`}
                                            alt={`Post ${index + 1}`}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                    ) : post.rawImageUrl ? (
                                        <img
                                            src={`http://localhost:3000${post.rawImageUrl}`}
                                            alt={`Raw ${index + 1}`}
                                            className="w-full h-full object-cover opacity-50"
                                        />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2">
                                            <div className="w-8 h-8 border-2 border-gray-600 border-t-pink-500 rounded-full animate-spin"></div>
                                            <span className="text-xs">Generating...</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                                        <div className="space-y-2">
                                            <button
                                                onClick={() => handleRegenerateImage(selectedRun.id, post.momPost?.id || '')}
                                                className="w-full py-2 bg-white/10 hover:bg-white/20 backdrop-blur text-white text-xs font-medium rounded-lg border border-white/10 transition-colors"
                                            >
                                                Regenerate Image
                                            </button>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(post.momPost?.caption || '')}
                                                className="w-full py-2 bg-pink-600 hover:bg-pink-500 text-white text-xs font-medium rounded-lg shadow-lg transition-colors"
                                            >
                                                Copy Caption
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5 space-y-3">
                                    <div>
                                        <h3 className="font-bold text-white text-lg leading-tight mb-1">
                                            {post.momPost?.overlayTitle || 'Untitled'}
                                        </h3>
                                        <p className="text-sm text-pink-400 font-medium">
                                            {post.momPost?.overlaySubtitle}
                                        </p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-800">
                                        <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed">
                                            {post.momPost?.caption}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800/50 rounded-2xl overflow-hidden border border-gray-700/50 backdrop-blur">
            <table className="min-w-full divide-y divide-gray-700/50">
                <thead className="bg-gray-900/50">
                    <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Date
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Topic
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Audience
                        </th>
                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Status
                        </th>
                        <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                    {runs.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                                <div className="flex flex-col items-center space-y-2">
                                    <span className="text-2xl">📭</span>
                                    <span>No runs found yet. Start your first one!</span>
                                </div>
                            </td>
                        </tr>
                    ) : (
                        runs.map((run) => (
                            <tr key={run.id} className="hover:bg-gray-700/30 transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                    {new Date(run.id).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium group-hover:text-pink-300 transition-colors">
                                    {run.topic}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                    {run.momConfig?.audience}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span
                                        className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${run.status === 'DONE'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : run.status === 'ERROR'
                                                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                                            }`}
                                    >
                                        {run.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={() => setSelectedRunId(run.id)}
                                        className="text-pink-400 hover:text-pink-300 font-semibold transition-colors"
                                    >
                                        View Details &rarr;
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
