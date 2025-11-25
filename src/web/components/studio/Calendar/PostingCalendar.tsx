import { useState, useCallback, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, type CalendarProps, type Components, type EventPropGetter } from 'react-big-calendar';
import withDragAndDrop, { type EventInteractionArgs } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import './calendar-theme.css';
import { CalendarPost, CalendarEvent, CalendarView, CalendarFilters as Filters } from '@/lib/studio/calendarTypes';
import { CalendarFilters } from './CalendarFilters';
import { CalendarLegend } from './CalendarLegend';
import { CalendarEvent as CalendarEventView } from './CalendarEvent';
import { UnscheduledPosts } from './UnscheduledPosts';

const locales = {
    'en-US': enUS
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
    getDay,
    locales
});

const BaseCalendar = Calendar as React.ComponentType<CalendarProps<CalendarEvent, CalendarPost>>;
const DragAndDropCalendar = withDragAndDrop<CalendarEvent, CalendarPost>(BaseCalendar);

interface PostingCalendarProps {
    posts: CalendarPost[];
    onPostClick?: (post: CalendarPost) => void;
    onReschedule?: (postId: string, runId: string, newDate: Date) => Promise<boolean>;
    loading?: boolean;
}

export function PostingCalendar({
    posts,
    onPostClick,
    onReschedule,
    loading = false
}: PostingCalendarProps) {
    const [view, setView] = useState<CalendarView>('month');
    const [date, setDate] = useState(new Date());
    const [filters, setFilters] = useState<Filters>({});
    const [isDraggingOver, setIsDraggingOver] = useState(false);

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

    // Separate scheduled and unscheduled posts
    const scheduledPosts = useMemo(() =>
        filteredPosts.filter(p => p.scheduledDate),
        [filteredPosts]
    );

    const unscheduledPosts = useMemo(() =>
        filteredPosts.filter(p => !p.scheduledDate),
        [filteredPosts]
    );

    // Convert scheduled posts to calendar events
    const events = useMemo<CalendarEvent[]>(() => {
        return scheduledPosts.map(post => {
            const start = new Date(post.scheduledDate!);
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
    }, [scheduledPosts]);

    const handleSelectSlot = useCallback((slotInfo: { start: Date; end: Date }) => {
        console.log('Selected time slot:', slotInfo);
        // Could open a dialog to create/schedule a post
    }, []);

    const handleSchedulePost = useCallback(async (postId: string, runId: string, newDate: Date) => {
        if (onReschedule) {
            await onReschedule(postId, runId, newDate);
        }
    }, [onReschedule]);

    // Handle drop from external source (unscheduled posts sidebar)
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);

        const postId = e.dataTransfer.getData('postId');
        const runId = e.dataTransfer.getData('runId');

        if (!postId || !runId) return;

        // Get the target date from mouse position
        // This is approximate - ideally we'd calculate the exact date/time from position
        const newDate = new Date();
        newDate.setHours(10, 0, 0, 0); // Default to 10 AM today

        await handleSchedulePost(postId, runId, newDate);
    }, [handleSchedulePost]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsDraggingOver(true);
    }, []);

    const handleDragLeave = useCallback(() => {
        setIsDraggingOver(false);
    }, []);

    const handleSelectEvent = useCallback((event: CalendarEvent) => {
        if (onPostClick) {
            onPostClick(event.resource);
        }
    }, [onPostClick]);

    const handleEventDrop = useCallback(async ({ event, start }: EventInteractionArgs<CalendarEvent>) => {
        if (onReschedule) {
            const startDate = start instanceof Date ? start : new Date(start);
            const success = await onReschedule(event.id, event.resource.runId, startDate);
            if (!success) {
                console.error('Failed to reschedule post');
                // Could show toast notification
            }
        }
    }, [onReschedule]);

    const handleEventResize = useCallback(async (_args: EventInteractionArgs<CalendarEvent>) => {
        // For posts, we don't really need resize
        console.log('Event resize not supported for posts');
    }, []);

    // Custom event style based on post status
    const eventStyleGetter = useCallback<EventPropGetter<CalendarEvent>>((event) => {
        const post = event.resource;

        const colorMap: Record<string, string> = {
            draft: 'rbc-event-draft',
            scheduled: 'rbc-event-scheduled',
            published: 'rbc-event-published',
            failed: 'rbc-event-failed'
        };

        return {
            className: colorMap[post.status] || 'rbc-event-scheduled'
        };
    }, []);

    const components = useMemo<Components<CalendarEvent, CalendarPost>>(() => ({
        event: ({ event }) => (
            <CalendarEventView post={event.resource} />
        )
    }), []);

    const handleResetFilters = () => {
        setFilters({});
    };

    if (loading) {
        return (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-8 flex items-center justify-center min-h-[600px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="space-y-4">
                <CalendarFilters
                    filters={filters}
                    onChange={setFilters}
                    onReset={handleResetFilters}
                />

                <div className="flex items-center justify-between mb-2">
                    <CalendarLegend />
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{scheduledPosts.length} scheduled</span>
                        <span className="text-purple-400">{unscheduledPosts.length} unscheduled</span>
                    </div>
                </div>

                {/* Two column layout: Unscheduled sidebar + Calendar */}
                <div className="grid grid-cols-12 gap-4">
                    {/* Unscheduled Posts Sidebar */}
                    <div className="col-span-3">
                        <UnscheduledPosts
                            posts={unscheduledPosts}
                            onSchedule={handleSchedulePost}
                        />
                    </div>

                    {/* Calendar */}
                    <div
                        className={`col-span-9 h-[600px] bg-gray-800 rounded-lg p-4 border-2 transition-all ${
                            isDraggingOver
                                ? 'border-purple-500 bg-purple-900/20'
                                : 'border-gray-700'
                        }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        <DragAndDropCalendar
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
                            onEventResize={handleEventResize}
                            eventPropGetter={eventStyleGetter}
                            components={components}
                            selectable
                            draggableAccessor={() => true}
                            resizable={false}
                            popup
                            style={{ height: '100%' }}
                        />
                    </div>
                </div>
            </div>
        </DndProvider>
    );
}
