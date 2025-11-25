import { CalendarPost } from '@/lib/studio/calendarTypes';

interface CalendarEventProps {
    post: CalendarPost;
}

export function CalendarEvent({ post }: CalendarEventProps) {
    const statusColors: Record<string, string> = {
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
