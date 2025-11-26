import { CalendarPost } from '@/lib/studio/calendarTypes';
import { ImageIcon, Calendar, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface UnscheduledPostsProps {
    posts: CalendarPost[];
    onSchedule: (postId: string, runId: string, date: Date) => void;
    onOpenScheduleDialog: (post: CalendarPost) => void;
}

export function UnscheduledPosts({ posts, onSchedule, onOpenScheduleDialog }: UnscheduledPostsProps) {
    const handleScheduleToday = (post: CalendarPost) => {
        const today = new Date();
        today.setHours(10, 0, 0, 0); // Default to 10 AM
        onSchedule(post.id, post.runId, today);
    };

    if (posts.length === 0) {
        return (
            <div className="bg-gray-800 rounded-lg p-6 text-center">
                <Calendar className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                <p className="text-sm text-gray-400">All posts are scheduled!</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Unscheduled Posts</h3>
                <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                </span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {posts.map((post) => (
                    <div
                        key={`${post.runId}-${post.id}`}
                        className="group bg-gray-700 hover:bg-gray-600 rounded-lg p-3 transition-all cursor-move border-2 border-dashed border-gray-600 hover:border-purple-500"
                        draggable
                        onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('postId', post.id);
                            e.dataTransfer.setData('runId', post.runId);
                        }}
                    >
                        <div className="flex gap-3">
                            {/* Thumbnail */}
                            <div className="flex-shrink-0 w-16 h-16 bg-gray-800 rounded overflow-hidden">
                                {post.imageUrl ? (
                                    <img
                                        src={post.imageUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-gray-600" />
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate mb-1">
                                    {post.title}
                                </p>
                                <p className="text-xs text-gray-400 truncate mb-2">
                                    {post.topic}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenScheduleDialog(post);
                                        }}
                                        className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                                    >
                                        <CalendarClock className="w-3 h-3 mr-1" />
                                        Schedule
                                    </Button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleScheduleToday(post);
                                        }}
                                        className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
                                    >
                                        Today 10AM
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Drag hint */}
                        <div className="mt-2 pt-2 border-t border-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-xs text-gray-500 text-center">
                                ⬅️ Drag to calendar to schedule
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-500 text-center">
                    💡 Drag posts to the calendar or click "Schedule for today"
                </p>
            </div>
        </div>
    );
}
