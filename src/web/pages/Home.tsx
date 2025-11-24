import { useState } from 'react';
import { Link } from 'react-router-dom';
import RunForm from '../components/RunForm';
import RunStatus from '../components/RunStatus';
import RunGallery from '../components/RunGallery';

export function Home() {
    const [currentRunId, setCurrentRunId] = useState<string | null>(null);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 mb-2">
                        Upload-Post Engine
                    </h1>
                    <p className="text-gray-400">Manage your content generation pipeline</p>
                </div>
                <Link
                    to="/edo"
                    className="px-6 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full border border-gray-700 transition-all hover:border-gray-500 flex items-center gap-2"
                >
                    <span>Portfolio</span>
                    <span>&rarr;</span>
                </Link>
            </div>

            <div className="card bg-gray-800/50 backdrop-blur border-gray-700/50">
                <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                    <span className="text-2xl">🚀</span> Start New Run
                </h2>
                <RunForm onRunStarted={setCurrentRunId} />
            </div>

            {currentRunId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="card bg-gray-800/50 backdrop-blur border-gray-700/50">
                        <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                            <span className="text-2xl">📊</span> Run Status
                        </h2>
                        <RunStatus runId={currentRunId} />
                    </div>

                    <div className="card bg-gray-800/50 backdrop-blur border-gray-700/50">
                        <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
                            <span className="text-2xl">🖼️</span> Gallery
                        </h2>
                        <RunGallery runId={currentRunId} />
                    </div>
                </div>
            )}
        </div>
    );
}
