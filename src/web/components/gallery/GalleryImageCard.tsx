import { useDrag } from 'react-dnd';
import { Download, Heart, Plus } from 'lucide-react';
import type { GalleryImage, GalleryDragItem } from '../../lib/gallery/types';
import { truncateText } from '../../lib/gallery/utils';
import { useGalleryStore } from '../../lib/gallery/store';

interface GalleryImageCardProps {
    image: GalleryImage;
    compact?: boolean;
    onSelect?: (image: GalleryImage) => void;
}

export function GalleryImageCard({ image, compact = false, onSelect }: GalleryImageCardProps) {
    const toggleFavorite = useGalleryStore(state => state.toggleFavorite);

    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'GALLERY_IMAGE',
        item: {
            type: 'GALLERY_IMAGE',
            imageUrl: image.imageUrl,
            imageId: image.id,
            prompt: image.prompt,
            aspectRatio: image.aspectRatio
        } as GalleryDragItem,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }), [image]);

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = image.imageUrl;
        link.download = `image-${image.id}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleFavorite(image.id);
    };

    return (
        <div
            ref={drag}
            className={`
        group relative rounded-lg overflow-hidden bg-gray-800 border border-gray-700
        transition-all duration-200 hover:border-purple-500 hover:shadow-lg
        ${isDragging ? 'opacity-50 scale-95' : 'opacity-100'}
        ${compact ? 'mb-2' : ''}
      `}
            style={{ cursor: 'grab' }}
        >
            {/* Image Container */}
            <div
                className="relative bg-gray-900"
                style={{ aspectRatio: compact ? '1/1' : (image.aspectRatio ? image.aspectRatio.replace(':', '/') : '4/5') }}
            >
                <img
                    src={image.imageUrl}
                    alt={image.prompt}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                    <div className="flex justify-end gap-1">
                        <button
                            onClick={handleFavorite}
                            className={`p-1.5 rounded-full backdrop-blur-sm transition-colors ${image.isFavorite
                                ? 'bg-purple-500 text-white'
                                : 'bg-black/50 text-white hover:bg-purple-500'
                                }`}
                            title="Favorite"
                        >
                            <Heart size={14} fill={image.isFavorite ? 'currentColor' : 'none'} />
                        </button>
                        {onSelect && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSelect(image);
                                }}
                                className="p-1.5 rounded-full bg-black/50 text-white hover:bg-green-500 backdrop-blur-sm transition-colors"
                                title="Use Image"
                            >
                                <Plus size={14} />
                            </button>
                        )}
                    </div>

                    <div className="flex justify-between items-end gap-2">
                        {!compact && (
                            <div className="flex gap-1">
                                <button
                                    onClick={handleDownload}
                                    className="p-1.5 rounded-full bg-black/50 text-white hover:bg-purple-500 backdrop-blur-sm transition-colors"
                                    title="Download"
                                >
                                    <Download size={14} />
                                </button>
                            </div>
                        )}

                        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur-sm text-[10px] font-mono text-gray-300">
                            {image.aspectRatio}
                        </div>
                    </div>
                </div>
            </div>

            {/* Metadata */}
            {!compact && (
                <div className="p-3">
                    <p className="text-xs text-gray-300 line-clamp-2" title={image.prompt}>
                        {image.prompt || 'No prompt'}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
                        <span>{new Date(image.createdAt).toLocaleDateString()}</span>
                        {image.usageCount ? (
                            <span title="Usage count">{image.usageCount} uses</span>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
}
