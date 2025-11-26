import { Outlet, Link, useLocation } from 'react-router-dom';
import { StudioProvider } from '../lib/studio/store';

function StudioLayout() {
    const location = useLocation();
    const isEditor = location.pathname.includes('/editor');
    const isGallery = location.pathname.includes('/gallery');
    const isCalendar = location.pathname.includes('/calendar');
    const isIdeas = location.pathname.includes('/ideas');

    return (
        <div className="min-h-screen bg-gray-950 text-white font-sans">
            <header className="border-b border-gray-800 bg-gray-900 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/studio" className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            MomMirror Studio
                        </Link>
                        <nav className="flex gap-4 text-sm text-gray-400">
                            <Link
                                to="/studio"
                                className={`hover:text-white transition-colors ${location.pathname === '/studio' ? 'text-white font-medium' : ''}`}
                            >
                                Dashboard
                            </Link>
                            <Link
                                to="/studio/ideas"
                                className={`hover:text-white transition-colors ${isIdeas ? 'text-white font-medium' : ''}`}
                            >
                                Ideas
                            </Link>
                            <Link
                                to="/studio/editor"
                                className={`hover:text-white transition-colors ${isEditor ? 'text-white font-medium' : ''}`}
                            >
                                Editor
                            </Link>
                            <Link
                                to="/studio/gallery"
                                className={`hover:text-white transition-colors ${isGallery ? 'text-white font-medium' : ''}`}
                            >
                                Gallery
                            </Link>
                            <Link
                                to="/studio/calendar"
                                className={`hover:text-white transition-colors ${isCalendar ? 'text-white font-medium' : ''}`}
                            >
                                Calendar
                            </Link>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700"></div>
                    </div>
                </header>

            <main>
                <Outlet />
            </main>
        </div>
    );
}

export function StudioPage() {
    return (
        <StudioProvider>
            <StudioLayout />
        </StudioProvider>
    );
}
