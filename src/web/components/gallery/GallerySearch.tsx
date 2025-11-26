import { useState, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { useGalleryStore } from '../../lib/gallery/store';

// Debounce helper
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

interface GallerySearchProps {
    compact?: boolean;
}

export function GallerySearch({ compact = false }: GallerySearchProps) {
    const setSearchQuery = useGalleryStore(state => state.setSearchQuery);
    const [localValue, setLocalValue] = useState('');
    const debouncedValue = useDebounce(localValue, 300);

    useEffect(() => {
        setSearchQuery(debouncedValue);
    }, [debouncedValue, setSearchQuery]);

    const handleClear = () => {
        setLocalValue('');
        setSearchQuery('');
    };

    return (
        <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={compact ? 14 : 16} className="text-gray-500" />
            </div>
            <input
                type="text"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value)}
                placeholder={compact ? "Search..." : "Search prompts, text, topics..."}
                className={`
          w-full bg-gray-900 border border-gray-700 rounded-lg 
          text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500
          transition-colors
          ${compact ? 'pl-9 pr-8 py-1.5 text-xs' : 'pl-10 pr-10 py-2.5 text-sm'}
        `}
            />
            {localValue && (
                <button
                    onClick={handleClear}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                >
                    <X size={compact ? 14 : 16} />
                </button>
            )}
        </div>
    );
}
