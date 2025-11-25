# Studio Posting Calendar Implementation Plan

**Date:** November 25, 2025
**Objective:** Add a full calendar view at the bottom of the Studio Dashboard showing all scheduled posts with upload-post.com integration.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Calendar Requirements](#calendar-requirements)
3. [Library Selection](#library-selection)
4. [Data Model](#data-model)
5. [Implementation Plan](#implementation-plan)
6. [API Integration](#api-integration)
7. [UI/UX Design](#uiux-design)
8. [Testing Scenarios](#testing-scenarios)

---

## Current State Analysis

### Existing Scheduling System

**Location:** MomDashboard (`/src/web/pages/MomDashboard.tsx`)

**Current Features:**
- Individual post scheduling via datetime-local input on PostCard components
- Backend endpoint: `PATCH /api/mom-runs/{runId}/posts/{postId}/schedule`
- Data structure: `scheduledDate?: string` (ISO-8601 format)
- Integration with upload-post.com via `scheduled_date` parameter

**Current Limitations:**
- No visual calendar overview
- No bulk scheduling capabilities
- No drag-and-drop scheduling
- No visibility of scheduling conflicts
- Limited to MomDashboard, not available in Studio interface

### Studio Dashboard

**Location:** `/src/web/components/studio/Dashboard.tsx`

**Current Features:**
- Displays recent studio runs (filtered by `mode === 'studio'`)
- Create new buttons (infographic, carousel, batch)
- Grid view of run thumbnails
- Basic metadata display

**Missing:**
- No scheduling functionality
- No calendar view
- No integration with scheduling system

---

## Calendar Requirements

### Functional Requirements

1. **Display All Scheduled Posts**
   - Aggregate posts from all runs (both `mode === 'studio'` and `mode === 'mommarketing'`)
   - Show posts grouped by date
   - Display post thumbnails and captions

2. **Interactive Scheduling**
   - Click date to see all posts scheduled for that day
   - Drag-and-drop to reschedule posts
   - Click post to edit schedule or view details
   - Bulk selection and rescheduling

3. **Calendar Views**
   - Month view (default)
   - Week view
   - Day view
   - Agenda/list view

4. **Visual Indicators**
   - Color coding by post status (draft, scheduled, published)
   - Badge showing number of posts per day
   - Highlighting for today and selected date
   - Warning for scheduling conflicts (too many posts on same day)

5. **Filtering & Search**
   - Filter by run/topic
   - Filter by audience
   - Filter by status
   - Search posts by caption

6. **Integration**
   - Sync with upload-post.com scheduled jobs
   - Real-time updates when schedules change
   - Error handling for failed scheduling

### Non-Functional Requirements

1. **Performance**
   - Load calendar quickly even with 100+ scheduled posts
   - Smooth drag-and-drop interactions
   - Lazy load post details

2. **Responsive Design**
   - Mobile-friendly calendar navigation
   - Touch-optimized drag-and-drop

3. **Accessibility**
   - Keyboard navigation for calendar
   - Screen reader support
   - ARIA labels for calendar elements

---

## Library Selection

### Option 1: react-big-calendar (Recommended)

**Pros:**
- Full-featured calendar with month/week/day/agenda views
- Built-in drag-and-drop support (with `react-dnd`)
- Highly customizable event rendering
- Good documentation and community support
- Works well with date-fns or Moment.js

**Cons:**
- Larger bundle size (~200KB)
- Requires `react-dnd` for drag-and-drop
- Some styling customization can be complex

**Installation:**
```bash
npm install react-big-calendar react-dnd react-dnd-html5-backend date-fns
npm install --save-dev @types/react-big-calendar
```

### Option 2: FullCalendar React

**Pros:**
- Industry-standard calendar solution
- Excellent drag-and-drop
- Beautiful default styling
- Premium plugins available

**Cons:**
- Heavier bundle size (~300KB)
- Some features require paid license
- More opinionated styling

### Option 3: Custom Calendar with date-fns

**Pros:**
- Lightweight (<50KB)
- Full control over UI/UX
- No external dependencies besides date-fns
- Better Tailwind integration

**Cons:**
- More development time
- Need to implement drag-and-drop manually
- No built-in month/week/day switching

### Selected: react-big-calendar

**Reasoning:** Best balance of features, community support, and customization. The built-in view switching and drag-and-drop support will save significant development time.

---

## Data Model

### Calendar Event Interface

```typescript
// NEW FILE: /src/web/lib/studio/calendarTypes.ts

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
```

### API Response Structure

```typescript
// GET /api/scheduled-posts
interface ScheduledPostsResponse {
    posts: CalendarPost[];
    total: number;
    dateRange: {
        start: string;
        end: string;
    };
}
```

---

## Implementation Plan

### Phase 1: Setup & Basic Calendar (2-3 hours)

#### 1.1 Install Dependencies

```bash
npm install react-big-calendar react-dnd react-dnd-html5-backend date-fns
npm install --save-dev @types/react-big-calendar
```

#### 1.2 Create Calendar Types

**NEW FILE:** `/src/web/lib/studio/calendarTypes.ts`

```typescript
// Copy interface definitions from Data Model section above
```

#### 1.3 Create Calendar API Service

**NEW FILE:** `/src/web/lib/studio/calendarApi.ts`

```typescript
import { CalendarPost, CalendarFilters } from './calendarTypes';

const API_URL = 'http://localhost:3000';

export async function fetchScheduledPosts(
    filters?: CalendarFilters
): Promise<CalendarPost[]> {
    const params = new URLSearchParams();

    if (filters?.runId) params.append('runId', filters.runId);
    if (filters?.audience) params.append('audience', filters.audience);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.mode) params.append('mode', filters.mode);
    if (filters?.searchQuery) params.append('q', filters.searchQuery);

    const response = await fetch(`${API_URL}/api/scheduled-posts?${params}`);

    if (!response.ok) {
        throw new Error('Failed to fetch scheduled posts');
    }

    return response.json();
}

export async function updatePostSchedule(
    runId: string,
    postId: string,
    scheduledDate: string
): Promise<boolean> {
    const response = await fetch(
        `${API_URL}/api/mom-runs/${runId}/posts/${postId}/schedule`,
        {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scheduledDate })
        }
    );

    return response.ok;
}

export async function bulkUpdateSchedules(
    updates: Array<{ runId: string; postId: string; scheduledDate: string }>
): Promise<{ success: number; failed: number }> {
    const results = await Promise.allSettled(
        updates.map(({ runId, postId, scheduledDate }) =>
            updatePostSchedule(runId, postId, scheduledDate)
        )
    );

    return {
        success: results.filter(r => r.status === 'fulfilled').length,
        failed: results.filter(r => r.status === 'rejected').length
    };
}
```

#### 1.4 Create Calendar Component

**NEW FILE:** `/src/web/components/studio/Calendar/PostingCalendar.tsx`

```typescript
import React, { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarPost, CalendarEvent, CalendarView } from '@/web/lib/studio/calendarTypes';

const locales = {
    'en-US': require('date-fns/locale/en-US')
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
    getDay,
    locales
});

interface PostingCalendarProps {
    posts: CalendarPost[];
    onPostClick?: (post: CalendarPost) => void;
    onReschedule?: (postId: string, newDate: Date) => Promise<boolean>;
}

export function PostingCalendar({
    posts,
    onPostClick,
    onReschedule
}: PostingCalendarProps) {
    const [view, setView] = useState<CalendarView>('month');
    const [date, setDate] = useState(new Date());

    // Convert posts to calendar events
    const events = useMemo<CalendarEvent[]>(() => {
        return posts
            .filter(post => post.scheduledDate)
            .map(post => {
                const start = new Date(post.scheduledDate);
                const end = new Date(start.getTime() + 15 * 60 * 1000); // 15 min duration

                return {
                    id: post.id,
                    title: post.title,
                    start,
                    end,
                    resource: post,
                    allDay: false
                };
            });
    }, [posts]);

    const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
        console.log('Selected time slot:', slotInfo);
        // Could open a dialog to create/schedule a post
    }, []);

    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        if (onPostClick) {
            onPostClick(event.resource);
        }
    }, [onPostClick]);

    const handleEventDrop = useCallback(async ({ event, start }: any) => {
        if (onReschedule) {
            const success = await onReschedule(event.id, start);
            if (!success) {
                console.error('Failed to reschedule post');
                // Could show toast notification
            }
        }
    }, [onReschedule]);

    // Custom event style based on post status
    const eventStyleGetter = useCallback((event: CalendarEvent) => {
        const post = event.resource;

        const colorMap = {
            draft: 'bg-gray-500',
            scheduled: 'bg-blue-500',
            published: 'bg-green-500',
            failed: 'bg-red-500'
        };

        return {
            className: colorMap[post.status] || 'bg-gray-500'
        };
    }, []);

    return (
        <div className="h-[600px] bg-white rounded-lg p-4 border border-gray-200">
            <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={view}
                onView={(newView) => setView(newView as CalendarView)}
                date={date}
                onNavigate={(newDate) => setDate(newDate)}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                onEventDrop={handleEventDrop}
                eventPropGetter={eventStyleGetter}
                selectable
                draggableAccessor={() => true}
                resizable={false}
                popup
                style={{ height: '100%' }}
            />
        </div>
    );
}
```

#### 1.5 Integrate Calendar into Dashboard

**FILE:** `/src/web/components/studio/Dashboard.tsx`

Add at the bottom of the component (after Recent Runs section):

```typescript
import { PostingCalendar } from './Calendar/PostingCalendar';
import { CalendarPost } from '@/web/lib/studio/calendarTypes';
import { fetchScheduledPosts, updatePostSchedule } from '@/web/lib/studio/calendarApi';

export function Dashboard() {
    // ... existing state
    const [scheduledPosts, setScheduledPosts] = useState<CalendarPost[]>([]);
    const [loadingSchedule, setLoadingSchedule] = useState(false);

    useEffect(() => {
        fetchRuns();
        loadScheduledPosts(); // NEW
    }, []);

    const loadScheduledPosts = async () => {
        setLoadingSchedule(true);
        try {
            const posts = await fetchScheduledPosts();
            setScheduledPosts(posts);
        } catch (error) {
            console.error('Failed to load scheduled posts:', error);
        } finally {
            setLoadingSchedule(false);
        }
    };

    const handlePostClick = (post: CalendarPost) => {
        // Open run dialog with this post selected
        openRun(post.runId);
    };

    const handleReschedule = async (postId: string, newDate: Date): Promise<boolean> => {
        const post = scheduledPosts.find(p => p.id === postId);
        if (!post) return false;

        const success = await updatePostSchedule(
            post.runId,
            postId,
            newDate.toISOString()
        );

        if (success) {
            await loadScheduledPosts(); // Refresh calendar
        }

        return success;
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            {/* ... existing content (Create New, Recent Runs) ... */}

            {/* NEW: Posting Calendar Section */}
            <div className="mt-12">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    Posting Calendar
                </h2>

                {loadingSchedule ? (
                    <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-8 flex items-center justify-center min-h-[600px]">
                        <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
                    </div>
                ) : (
                    <PostingCalendar
                        posts={scheduledPosts}
                        onPostClick={handlePostClick}
                        onReschedule={handleReschedule}
                    />
                )}
            </div>
        </div>
    );
}
```

---

### Phase 2: Backend API Endpoint (1-2 hours)

#### 2.1 Create Scheduled Posts Endpoint

**FILE:** `/src/server.ts`

Add new endpoint:

```typescript
// GET /api/scheduled-posts
// Returns all posts with scheduledDate across all runs
app.get('/api/scheduled-posts', async (req, res) => {
    try {
        const { runId, audience, status, mode, q } = req.query;

        // Get all runs
        const allRuns = orchestrator.getAllRuns();

        let scheduledPosts: any[] = [];

        // Extract scheduled posts from all runs
        for (const run of allRuns) {
            // Filter by mode if specified
            if (mode && run.mode !== mode) continue;

            for (const post of run.posts) {
                if (!post.scheduledDate) continue;

                // Apply filters
                if (runId && run.id !== runId) continue;
                if (audience && run.momConfig?.audience !== audience) continue;

                const postStatus = post.publish?.status || 'scheduled';
                if (status && postStatus !== status) continue;

                // Text search
                if (q) {
                    const searchText = q.toString().toLowerCase();
                    const caption = post.momPost?.caption || '';
                    const topic = run.topic || '';
                    if (!caption.toLowerCase().includes(searchText) &&
                        !topic.toLowerCase().includes(searchText)) {
                        continue;
                    }
                }

                const imageUrl = post.finalImageUrl || post.rawImageUrl;

                scheduledPosts.push({
                    id: post.momPost?.id || `${run.id}-${post.index}`,
                    runId: run.id,
                    title: (post.momPost?.caption || post.momPost?.hook || 'Untitled')
                        .substring(0, 50),
                    caption: post.momPost?.caption || '',
                    imageUrl: imageUrl ? `http://localhost:3000${imageUrl}` : undefined,
                    scheduledDate: post.scheduledDate,
                    status: postStatus,
                    topic: run.topic,
                    audience: run.momConfig?.audience || 'unknown',
                    aspectRatio: run.momConfig?.aspectRatio || '9:16',
                    mode: run.mode || 'unknown'
                });
            }
        }

        // Sort by scheduled date
        scheduledPosts.sort((a, b) =>
            new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
        );

        res.json(scheduledPosts);
    } catch (error) {
        console.error('Error fetching scheduled posts:', error);
        res.status(500).json({ error: 'Failed to fetch scheduled posts' });
    }
});
```

---

### Phase 3: Enhanced UI Features (2-3 hours)

#### 3.1 Custom Event Renderer

**NEW FILE:** `/src/web/components/studio/Calendar/CalendarEvent.tsx`

```typescript
import React from 'react';
import { CalendarPost } from '@/web/lib/studio/calendarTypes';

interface CalendarEventProps {
    post: CalendarPost;
}

export function CalendarEvent({ post }: CalendarEventProps) {
    const statusColors = {
        draft: 'bg-gray-500',
        scheduled: 'bg-blue-500',
        published: 'bg-green-500',
        failed: 'bg-red-500'
    };

    return (
        <div className={`${statusColors[post.status]} text-white rounded px-1 py-0.5 text-xs truncate`}>
            <div className="flex items-center gap-1">
                {post.imageUrl && (
                    <img
                        src={post.imageUrl}
                        alt=""
                        className="w-4 h-4 rounded object-cover flex-shrink-0"
                    />
                )}
                <span className="truncate">{post.title}</span>
            </div>
        </div>
    );
}
```

Update PostingCalendar to use custom event renderer:

```typescript
import { CalendarEvent as CalendarEventView } from './CalendarEvent';

// In PostingCalendar component:
const components = useMemo(() => ({
    event: ({ event }: { event: CalendarEvent }) => (
        <CalendarEventView post={event.resource} />
    )
}), []);

// Add to Calendar props:
<Calendar
    // ... existing props
    components={components}
/>
```

#### 3.2 Calendar Filters Panel

**NEW FILE:** `/src/web/components/studio/Calendar/CalendarFilters.tsx`

```typescript
import React from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/web/components/ui/select';
import { Input } from '@/web/components/ui/input';
import { Button } from '@/web/components/ui/button';
import { Search, X } from 'lucide-react';
import { CalendarFilters as Filters } from '@/web/lib/studio/calendarTypes';

interface CalendarFiltersProps {
    filters: Filters;
    onChange: (filters: Filters) => void;
    onReset: () => void;
}

export function CalendarFilters({ filters, onChange, onReset }: CalendarFiltersProps) {
    const hasActiveFilters = Object.values(filters).some(v => v !== undefined && v !== '');

    return (
        <div className="bg-gray-800 rounded-lg p-4 mb-4 space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-300">Filters</h3>
                {hasActiveFilters && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        className="text-gray-400 hover:text-white"
                    >
                        <X className="w-4 h-4 mr-1" />
                        Clear
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                        placeholder="Search posts..."
                        value={filters.searchQuery || ''}
                        onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
                        className="pl-9 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                    />
                </div>

                {/* Mode Filter */}
                <Select
                    value={filters.mode || 'all'}
                    onValueChange={(val) => onChange({
                        ...filters,
                        mode: val === 'all' ? undefined : val as any
                    })}
                >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="All Modes" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Modes</SelectItem>
                        <SelectItem value="studio">Studio</SelectItem>
                        <SelectItem value="mommarketing">Mom Marketing</SelectItem>
                    </SelectContent>
                </Select>

                {/* Audience Filter */}
                <Select
                    value={filters.audience || 'all'}
                    onValueChange={(val) => onChange({
                        ...filters,
                        audience: val === 'all' ? undefined : val
                    })}
                >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="All Audiences" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Audiences</SelectItem>
                        <SelectItem value="pregnant_anxious">Pregnant & Anxious</SelectItem>
                        <SelectItem value="first_time_newborn">First-time Mom</SelectItem>
                        <SelectItem value="burned_out_parent">Burned-out Parent</SelectItem>
                        <SelectItem value="female_overwhelm">General Overwhelm</SelectItem>
                    </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select
                    value={filters.status || 'all'}
                    onValueChange={(val) => onChange({
                        ...filters,
                        status: val === 'all' ? undefined : val as any
                    })}
                >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
```

#### 3.3 Calendar Legend

**NEW FILE:** `/src/web/components/studio/Calendar/CalendarLegend.tsx`

```typescript
import React from 'react';

export function CalendarLegend() {
    const statuses = [
        { label: 'Draft', color: 'bg-gray-500' },
        { label: 'Scheduled', color: 'bg-blue-500' },
        { label: 'Published', color: 'bg-green-500' },
        { label: 'Failed', color: 'bg-red-500' }
    ];

    return (
        <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="font-medium">Status:</span>
            {statuses.map(({ label, color }) => (
                <div key={label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${color}`}></div>
                    <span>{label}</span>
                </div>
            ))}
        </div>
    );
}
```

#### 3.4 Update PostingCalendar with Filters

```typescript
import { CalendarFilters } from './CalendarFilters';
import { CalendarLegend } from './CalendarLegend';
import { CalendarFilters as Filters } from '@/web/lib/studio/calendarTypes';

export function PostingCalendar({ posts, onPostClick, onReschedule }: PostingCalendarProps) {
    const [filters, setFilters] = useState<Filters>({});

    // Filter posts based on active filters
    const filteredPosts = useMemo(() => {
        let filtered = posts;

        if (filters.audience) {
            filtered = filtered.filter(p => p.audience === filters.audience);
        }
        if (filters.status) {
            filtered = filtered.filter(p => p.status === filters.status);
        }
        if (filters.mode) {
            filtered = filtered.filter(p => p.mode === filters.mode);
        }
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.caption.toLowerCase().includes(query) ||
                p.topic.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [posts, filters]);

    const handleResetFilters = () => {
        setFilters({});
    };

    return (
        <div className="space-y-4">
            <CalendarFilters
                filters={filters}
                onChange={setFilters}
                onReset={handleResetFilters}
            />

            <div className="flex items-center justify-between mb-2">
                <CalendarLegend />
                <span className="text-sm text-gray-400">
                    {filteredPosts.length} scheduled posts
                </span>
            </div>

            <div className="h-[600px] bg-white rounded-lg p-4 border border-gray-200">
                <Calendar
                    // ... use filteredPosts instead of posts
                />
            </div>
        </div>
    );
}
```

---

### Phase 4: Drag-and-Drop Scheduling (2 hours)

#### 4.1 Install React DnD

```bash
npm install react-dnd react-dnd-html5-backend
```

#### 4.2 Setup DnD Context

Update PostingCalendar:

```typescript
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

const DragAndDropCalendar = withDragAndDrop(Calendar);

export function PostingCalendar({ posts, onPostClick, onReschedule }: PostingCalendarProps) {
    // ... existing code

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="space-y-4">
                {/* ... filters and legend ... */}

                <div className="h-[600px] bg-white rounded-lg p-4 border border-gray-200">
                    <DragAndDropCalendar
                        localizer={localizer}
                        events={events}
                        onEventDrop={handleEventDrop}
                        onEventResize={handleEventResize}
                        resizable
                        draggableAccessor={() => true}
                        // ... other props
                    />
                </div>
            </div>
        </DndProvider>
    );
}
```

#### 4.3 Implement Drag Handlers

```typescript
const handleEventDrop = useCallback(async ({ event, start, end }: any) => {
    if (!onReschedule) return;

    const success = await onReschedule(event.id, start);

    if (success) {
        // Update local state optimistically
        setScheduledPosts(prev =>
            prev.map(post =>
                post.id === event.id
                    ? { ...post, scheduledDate: start.toISOString() }
                    : post
            )
        );
    }
}, [onReschedule]);

const handleEventResize = useCallback(async ({ event, start, end }: any) => {
    // For posts, we don't really need resize, but this prevents errors
    console.log('Event resize not supported for posts');
}, []);
```

---

### Phase 5: Mobile Optimization (1-2 hours)

#### 5.1 Responsive Calendar Wrapper

```typescript
// In PostingCalendar component
const [isMobile, setIsMobile] = useState(false);

useEffect(() => {
    const checkMobile = () => {
        setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
}, []);

// Force day view on mobile
const effectiveView = isMobile ? 'day' : view;
```

#### 5.2 Touch-Friendly Event Cards

```typescript
// In CalendarEvent component
export function CalendarEvent({ post }: CalendarEventProps) {
    return (
        <div
            className={`${statusColors[post.status]} text-white rounded px-2 py-1 text-xs truncate touch-manipulation`}
            style={{ minHeight: isMobile ? '40px' : '20px' }}
        >
            {/* ... content */}
        </div>
    );
}
```

---

## API Integration

### Upload-Post.com Integration

The existing `uploadPost.ts` service already handles scheduling via the `scheduled_date` parameter:

```typescript
// In publishImages function (already implemented)
const payloadPreview = {
    postId: schedule?.postId ?? `${runId}-${i}`,
    caption,
    mediaPath: image.finalPath,
    scheduled_date: scheduledDate ?? null,  // ISO-8601 format
};
```

**What the calendar adds:**
- Visual interface for managing these scheduled dates
- Drag-and-drop rescheduling
- Bulk operations
- Filtering and search

**Syncing with Upload-Post:**
- When user reschedules via calendar → Update local DB → Upload-Post API will use new date on next publish
- Could add "Sync with Upload-Post" button to fetch actual scheduled jobs from their API
- Add webhook support to receive updates from Upload-Post (if they support it)

---

## UI/UX Design

### Color Scheme (Dark Theme)

```css
/* Calendar container */
.rbc-calendar {
    background: #1f2937; /* gray-800 */
    color: #f3f4f6; /* gray-100 */
}

/* Month view cells */
.rbc-month-view {
    background: #111827; /* gray-900 */
    border-color: #374151; /* gray-700 */
}

/* Today highlight */
.rbc-today {
    background-color: rgba(147, 51, 234, 0.1); /* purple-600 with opacity */
}

/* Selected date */
.rbc-selected {
    background-color: rgba(147, 51, 234, 0.3);
}

/* Event colors */
.rbc-event {
    padding: 2px 4px;
    border-radius: 4px;
}

.rbc-event.rbc-event-draft {
    background-color: #6b7280; /* gray-500 */
}

.rbc-event.rbc-event-scheduled {
    background-color: #3b82f6; /* blue-500 */
}

.rbc-event.rbc-event-published {
    background-color: #10b981; /* green-500 */
}

.rbc-event.rbc-event-failed {
    background-color: #ef4444; /* red-500 */
}
```

### Custom Styling File

**NEW FILE:** `/src/web/components/studio/Calendar/calendar-theme.css`

```css
/* Import this in PostingCalendar.tsx */
@import 'react-big-calendar/lib/css/react-big-calendar.css';
@import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';

/* Dark theme overrides */
.rbc-calendar {
    font-family: inherit;
}

.rbc-header {
    padding: 12px 8px;
    font-weight: 600;
    background: #1f2937;
    color: #f3f4f6;
    border-bottom: 1px solid #374151;
}

.rbc-month-view {
    background: #111827;
    border: 1px solid #374151;
    border-radius: 8px;
    overflow: hidden;
}

.rbc-day-bg {
    background: #1f2937;
    border-color: #374151;
}

.rbc-off-range-bg {
    background: #0f172a;
}

.rbc-today {
    background-color: rgba(168, 85, 247, 0.15);
}

.rbc-toolbar {
    padding: 16px 0;
    margin-bottom: 16px;
}

.rbc-toolbar button {
    color: #f3f4f6;
    border-color: #374151;
    padding: 8px 16px;
    border-radius: 6px;
    font-weight: 500;
    transition: all 0.2s;
}

.rbc-toolbar button:hover {
    background: #374151;
    border-color: #4b5563;
}

.rbc-toolbar button.rbc-active {
    background: #7c3aed;
    border-color: #7c3aed;
    color: white;
}

.rbc-event {
    background: none;
    padding: 0;
    border: none;
}

.rbc-event:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.rbc-show-more {
    background: #374151;
    color: #f3f4f6;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.rbc-overlay {
    background: #1f2937;
    border: 1px solid #374151;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
}
```

---

## Testing Scenarios

### Manual Testing Checklist

1. **Calendar Display**
   - [ ] Calendar renders without errors
   - [ ] All scheduled posts appear on correct dates
   - [ ] Posts from both Studio and MomMarketing modes display
   - [ ] Color coding matches post status

2. **Navigation**
   - [ ] Month/Week/Day view switching works
   - [ ] Date navigation (prev/next) works
   - [ ] "Today" button works
   - [ ] Clicking date shows posts for that day

3. **Filtering**
   - [ ] Mode filter (Studio/MomMarketing) works
   - [ ] Audience filter works
   - [ ] Status filter works
   - [ ] Text search works
   - [ ] Clear filters resets all filters

4. **Interaction**
   - [ ] Clicking post opens run dialog
   - [ ] Drag-and-drop reschedules post
   - [ ] Rescheduling updates database
   - [ ] Calendar refreshes after reschedule

5. **Responsive**
   - [ ] Calendar is usable on mobile
   - [ ] Filters stack vertically on mobile
   - [ ] Touch interactions work

6. **Error Handling**
   - [ ] Loading state displays while fetching
   - [ ] Error state displays if API fails
   - [ ] Failed reschedule shows error message

### Automated Tests (Optional)

```typescript
// Example test file: /src/web/components/studio/Calendar/__tests__/PostingCalendar.test.tsx

import { render, screen, fireEvent } from '@testing-library/react';
import { PostingCalendar } from '../PostingCalendar';
import { CalendarPost } from '@/web/lib/studio/calendarTypes';

const mockPosts: CalendarPost[] = [
    {
        id: '1',
        runId: 'run-1',
        title: 'Test Post',
        caption: 'Test caption',
        scheduledDate: '2025-11-25T10:00:00Z',
        status: 'scheduled',
        topic: 'Test Topic',
        audience: 'first_time_newborn',
        aspectRatio: '9:16',
        mode: 'studio'
    }
];

describe('PostingCalendar', () => {
    it('renders calendar with posts', () => {
        render(<PostingCalendar posts={mockPosts} />);
        expect(screen.getByText('Test Post')).toBeInTheDocument();
    });

    it('calls onPostClick when event is clicked', () => {
        const handleClick = jest.fn();
        render(<PostingCalendar posts={mockPosts} onPostClick={handleClick} />);

        const event = screen.getByText('Test Post');
        fireEvent.click(event);

        expect(handleClick).toHaveBeenCalledWith(mockPosts[0]);
    });
});
```

---

## Implementation Timeline

### Estimated Development Time: 8-12 hours

**Phase 1 (Setup):** 2-3 hours
- Install dependencies
- Create types and API service
- Basic calendar component
- Integration into Dashboard

**Phase 2 (Backend):** 1-2 hours
- `/api/scheduled-posts` endpoint
- Filtering logic
- Testing

**Phase 3 (Enhanced UI):** 2-3 hours
- Custom event renderer
- Filters panel
- Legend
- Styling

**Phase 4 (Drag-and-Drop):** 2 hours
- DnD setup
- Event handlers
- Optimistic updates

**Phase 5 (Mobile):** 1-2 hours
- Responsive design
- Touch optimization
- Testing

---

## Future Enhancements

1. **Bulk Operations**
   - Select multiple posts
   - Bulk reschedule
   - Bulk delete

2. **Templates**
   - Save scheduling templates
   - "Post every Monday at 10am" patterns

3. **Conflict Detection**
   - Warn when too many posts on same day
   - Suggest optimal posting times

4. **Analytics Integration**
   - Show past performance on calendar
   - Highlight best times to post

5. **Real Upload-Post Sync**
   - Fetch actual scheduled jobs from Upload-Post API
   - Two-way sync
   - Webhook support

6. **Calendar Export**
   - Export to Google Calendar
   - iCal file download
   - CSV export

7. **Collaboration**
   - Multi-user scheduling
   - Comments on scheduled posts
   - Approval workflow

---

## Dependencies Summary

```json
{
  "dependencies": {
    "react-big-calendar": "^1.8.5",
    "react-dnd": "^16.0.1",
    "react-dnd-html5-backend": "^16.0.1",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "@types/react-big-calendar": "^1.8.5"
  }
}
```

---

## Conclusion

This implementation plan provides a comprehensive roadmap for adding a full-featured posting calendar to the Studio Dashboard. The calendar will:

- **Visualize** all scheduled posts across all runs
- **Enable** drag-and-drop rescheduling
- **Support** filtering and search
- **Integrate** with existing upload-post.com scheduling
- **Scale** to handle hundreds of scheduled posts
- **Adapt** to mobile devices

The phased approach allows for incremental delivery, with Phase 1-2 providing a functional MVP that can be enhanced with additional features in later phases.
