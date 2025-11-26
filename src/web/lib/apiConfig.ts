/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

// Use environment variable or default to port 5000
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Helper function to construct full API URLs
export const getApiUrl = (path: string): string => {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};

// Helper function to construct full resource URLs (for images, etc.)
export const getResourceUrl = (path: string): string => {
    if (!path) return '';
    // If path already includes http, return as-is
    if (path.startsWith('http')) return path;
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${normalizedPath}`;
};
