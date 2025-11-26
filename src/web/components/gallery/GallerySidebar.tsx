import React, { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { useGalleryStore } from '../../lib/gallery/store';
import { GalleryGrid } from './GalleryGrid';

import { GalleryImage } from '../../lib/gallery/types';

interface GallerySidebarProps {
    onSelect?: (image: GalleryImage) => void;
}

export const GallerySidebar: React.FC<GallerySidebarProps> = ({ onSelect }) => {
    const { images, isLoading, loadImages, scanImages } = useGalleryStore();

    useEffect(() => {
        if (images.length === 0 && !isLoading) {
            loadImages();
        }
    }, [images.length, isLoading, loadImages]);

    const handleScan = async () => {
        await scanImages();
    };

    return (
        <div className="h-full flex flex-col bg-gray-900">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h2 className="text-lg font-semibold text-white">Gallery</h2>
                <button
                    onClick={handleScan}
                    disabled={isLoading}
                    className="p-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Scan for new images"
                >
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Gallery Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <GalleryGrid images={images} isLoading={isLoading} compact={true} onSelect={onSelect} />
            </div>
        </div>
    );
};
