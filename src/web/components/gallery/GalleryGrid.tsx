import { GalleryImageCard } from './GalleryImageCard';
import type { GalleryImage } from '../../lib/gallery/types';

interface GalleryGridProps {
    images: GalleryImage[];
    isLoading: boolean;
    compact?: boolean;
    onSelect?: (image: GalleryImage) => void;
}

export function GalleryGrid({ images, isLoading, compact = false, onSelect }: GalleryGridProps) {
    if (isLoading) {
        return (
            <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'} gap-4`}>
                {Array.from({ length: 10 }).map((_, i) => (
                    <div
                        key={i}
                        className={`
              animate-pulse bg-gray-800 rounded-lg 
              ${compact ? 'aspect-square' : 'aspect-[4/5]'}
            `}
                    />
                ))}
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <p>No images found</p>
            </div>
        );
    }

    return (
        <div className={`
      grid gap-4
      ${compact
                ? 'grid-cols-2'
                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
            }
    `}>
            {images.map((image) => (
                <GalleryImageCard
                    key={image.id}
                    image={image}
                    compact={compact}
                    onSelect={onSelect}
                />
            ))}
        </div>
    );
}
