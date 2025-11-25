import { Link } from 'react-router-dom';

export function Home() {
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
        </div>
    );
}
