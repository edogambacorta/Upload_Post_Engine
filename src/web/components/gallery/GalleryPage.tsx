import { useEffect } from 'react';
import { useGalleryStore } from '../../lib/gallery/store';
import { GalleryGrid } from './GalleryGrid';
import { GallerySearch } from './GallerySearch';
import { Filter, RefreshCw } from 'lucide-react';

export function GalleryPage() {
    const { images, isLoading, loadImages, scanImages } = useGalleryStore();

    useEffect(() => {
        loadImages();
    }, [loadImages]);

    return (
        <div className="min-h-screen bg-[#0B0F17] text-white p-8">
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Image Gallery
                        </h1>
                        <p className="text-gray-400 mt-1">
                            Browse and manage your generated images
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-full md:w-80">
                            <GallerySearch />
                        </div>
                        <button
                            onClick={() => scanImages()}
                            disabled={isLoading}
                            className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg hover:border-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Scan for new images"
                        >
                            <RefreshCw size={20} className={`text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg hover:border-purple-500 transition-colors">
                            <Filter size={20} className="text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Filters Bar (Placeholder for now) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 text-sm">
                    <button className="px-4 py-1.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/50">
                        All Images
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700">
                        Favorites
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700">
                        Instagram (4:5)
                    </button>
                    <button className="px-4 py-1.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 hover:bg-gray-700">
                        Stories (9:16)
                    </button>
                </div>

                {/* Grid */}
                <GalleryGrid images={images} isLoading={isLoading} />

                {/* Footer info */}
                {!isLoading && images.length > 0 && (
                    <div className="text-center text-gray-500 text-sm py-8">
                        Showing {images.length} images
                    </div>
                )}
            </div>
        </div>
    );
}
