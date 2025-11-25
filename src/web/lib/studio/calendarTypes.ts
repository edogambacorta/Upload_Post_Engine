import { AspectRatio } from '@/lib/mom/types';

export interface CalendarPost {
    id: string;                    // Unique post ID
    runId: string;                 // Parent run ID
    title: string;                 // Short title (first 50 chars of caption)
    caption: string;               // Full caption
    imageUrl?: string;             // Thumbnail URL
    scheduledDate: string;         // ISO-8601 datetime
    status: 'draft' | 'scheduled' | 'published' | 'failed';
    topic: string;                 // Run topic
    audience: string;              // Target audience
    aspectRatio: AspectRatio;      // Image dimensions
    mode: 'studio' | 'mommarketing'; // Run mode
}

export interface CalendarEvent {
    id: string;                    // Post ID
    title: string;                 // Display title
    start: Date;                   // Scheduled datetime
    end: Date;                     // End datetime (start + 15 min for display)
    resource: CalendarPost;        // Full post data
    allDay: boolean;               // Always false for posts
}

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarFilters {
    runId?: string;                // Filter by specific run
    audience?: string;             // Filter by audience
    status?: CalendarPost['status']; // Filter by status
    mode?: 'studio' | 'mommarketing'; // Filter by mode
    searchQuery?: string;          // Text search
}
