import { useState } from 'react';
import { CalendarPost } from '@/lib/studio/calendarTypes';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar, Clock } from 'lucide-react';

interface ScheduleDialogProps {
    post: CalendarPost | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSchedule: (postId: string, runId: string, date: Date) => Promise<void>;
}

export function ScheduleDialog({ post, open, onOpenChange, onSchedule }: ScheduleDialogProps) {
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedTime, setSelectedTime] = useState<string>('10:00');
    const [isScheduling, setIsScheduling] = useState(false);

    // Initialize with current date when dialog opens
    const handleOpenChange = (newOpen: boolean) => {
        if (newOpen && !selectedDate) {
            const today = new Date();
            setSelectedDate(today.toISOString().split('T')[0]);
        }
        onOpenChange(newOpen);
    };

    const handleSchedule = async () => {
        if (!post || !selectedDate || !selectedTime) return;

        setIsScheduling(true);
        try {
            // Combine date and time
            const [hours, minutes] = selectedTime.split(':').map(Number);
            const scheduledDate = new Date(selectedDate);
            scheduledDate.setHours(hours, minutes, 0, 0);

            await onSchedule(post.id, post.runId, scheduledDate);
            onOpenChange(false);
            
            // Reset form
            setSelectedDate('');
            setSelectedTime('10:00');
        } catch (error) {
            console.error('Failed to schedule post:', error);
        } finally {
            setIsScheduling(false);
        }
    };

    if (!post) return null;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-gray-800 border-gray-700 text-white">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-white">Schedule Post</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Choose when you want this post to be published.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Post Preview */}
                    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div className="flex gap-3">
                            {post.imageUrl && (
                                <div className="flex-shrink-0 w-20 h-20 bg-gray-800 rounded overflow-hidden">
                                    <img
                                        src={post.imageUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white mb-1">
                                    {post.title}
                                </p>
                                <p className="text-xs text-gray-400">
                                    {post.topic}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Date Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Date
                        </label>
                        <Input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                            min={new Date().toISOString().split('T')[0]}
                        />
                    </div>

                    {/* Time Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Time
                        </label>
                        <Input
                            type="time"
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="bg-gray-700 border-gray-600 text-white"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const today = new Date();
                                setSelectedDate(today.toISOString().split('T')[0]);
                                setSelectedTime('10:00');
                            }}
                            className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                        >
                            Today 10:00
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                setSelectedDate(tomorrow.toISOString().split('T')[0]);
                                setSelectedTime('10:00');
                            }}
                            className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                        >
                            Tomorrow 10:00
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                const nextWeek = new Date();
                                nextWeek.setDate(nextWeek.getDate() + 7);
                                setSelectedDate(nextWeek.toISOString().split('T')[0]);
                                setSelectedTime('10:00');
                            }}
                            className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                        >
                            Next Week
                        </Button>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isScheduling}
                        className="bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSchedule}
                        disabled={!selectedDate || !selectedTime || isScheduling}
                        className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                        {isScheduling ? 'Scheduling...' : 'Schedule Post'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
