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
import { ScheduleDialog } from './ScheduleDialog';

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
    const [scheduleDialogPost, setScheduleDialogPost] = useState<CalendarPost | null>(null);
    const [calendarRef, setCalendarRef] = useState<HTMLDivElement | null>(null);

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

    const handleOpenScheduleDialog = useCallback((post: CalendarPost) => {
        setScheduleDialogPost(post);
    }, []);

    // Calculate date/time from drop position on calendar
    const calculateDateFromPosition = useCallback((e: React.DragEvent, calendarElement: HTMLDivElement): Date | null => {
        // For month view, find which day cell was dropped on
        if (view === 'month') {
            const dayCell = document.elementFromPoint(e.clientX, e.clientY)?.closest('.rbc-day-bg');
            if (dayCell) {
                // Find the corresponding date header
                const monthRow = dayCell.closest('.rbc-month-row');
                if (monthRow) {
                    const dayCells = Array.from(monthRow.querySelectorAll('.rbc-day-bg'));
                    const cellIndex = dayCells.indexOf(dayCell as Element);
                    
                    // Get the date headers
                    const dateHeaders = calendarElement.querySelectorAll('.rbc-date-cell');
                    if (dateHeaders[cellIndex]) {
                        const dateButton = dateHeaders[cellIndex].querySelector('button');
                        if (dateButton) {
                            const dayNumber = parseInt(dateButton.textContent || '1');
                            
                            // Calculate the actual date based on the current month view
                            const viewDate = new Date(date);
                            
                            // Calculate which week row we're in
                            const rows = Array.from(calendarElement.querySelectorAll('.rbc-month-row'));
                            const rowIndex = rows.indexOf(monthRow as Element);
                            
                            // Determine if this is previous/current/next month
                            const targetDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), dayNumber);
                            
                            // Adjust for previous/next month days
                            if (rowIndex === 0 && dayNumber > 20) {
                                // Previous month
                                targetDate.setMonth(targetDate.getMonth() - 1);
                            } else if (rowIndex >= 4 && dayNumber < 15) {
                                // Next month
                                targetDate.setMonth(targetDate.getMonth() + 1);
                            }
                            
                            targetDate.setHours(10, 0, 0, 0); // Default to 10 AM
                            return targetDate;
                        }
                    }
                }
            }
        }

        // For week/day view, use the calendar's built-in slot detection
        if (view === 'week' || view === 'day') {
            const timeSlot = document.elementFromPoint(e.clientX, e.clientY)?.closest('.rbc-time-slot');
            if (timeSlot) {
                // Try to find the time from the slot's position
                const timeHeader = timeSlot.closest('.rbc-time-content')?.querySelector('.rbc-time-header-gutter');
                if (timeHeader) {
                    const allSlots = Array.from(timeSlot.closest('.rbc-day-slot')?.querySelectorAll('.rbc-time-slot') || []);
                    const slotIndex = allSlots.indexOf(timeSlot as Element);
                    
                    // Each slot is typically 30 minutes
                    const hours = Math.floor(slotIndex / 2);
                    const minutes = (slotIndex % 2) * 30;
                    
                    const targetDate = new Date(date);
                    targetDate.setHours(hours, minutes, 0, 0);
                    return targetDate;
                }
            }
        }

        // Fallback: use current date at 10 AM
        const fallbackDate = new Date();
        fallbackDate.setHours(10, 0, 0, 0);
        return fallbackDate;
    }, [view, date]);

    // Handle drop from external source (unscheduled posts sidebar)
    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDraggingOver(false);

        const postId = e.dataTransfer.getData('postId');
        const runId = e.dataTransfer.getData('runId');

        if (!postId || !runId || !calendarRef) return;

        // Calculate the exact date/time from drop position
        const targetDate = calculateDateFromPosition(e, calendarRef);
        if (!targetDate) {
            console.error('Could not determine target date from drop position');
            return;
        }

        await handleSchedulePost(postId, runId, targetDate);
    }, [handleSchedulePost, calendarRef, calculateDateFromPosition]);

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
                            onOpenScheduleDialog={handleOpenScheduleDialog}
                        />
                    </div>

                    {/* Calendar */}
                    <div
                        ref={setCalendarRef}
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

                {/* Schedule Dialog */}
                <ScheduleDialog
                    post={scheduleDialogPost}
                    open={scheduleDialogPost !== null}
                    onOpenChange={(open) => !open && setScheduleDialogPost(null)}
                    onSchedule={handleSchedulePost}
                />
            </div>
        </DndProvider>
    );
}
