import { fetchScheduledPosts } from './calendarApi';
import { PostDetails, Slide } from './types';

export const DEFAULT_POST_TIME = '09:00';

export interface ScheduleSlot {
    date: string;
    time: string;
}

const formatDatePart = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const parseIsoDate = (iso?: string): ScheduleSlot | null => {
    if (!iso) return null;
    const [datePart, timePart] = iso.split('T');
    if (!datePart) return null;
    const time = timePart ? timePart.slice(0, 5) : DEFAULT_POST_TIME;
    return { date: datePart, time: time || DEFAULT_POST_TIME };
};

export function derivePostDetailsFromSlides(params: {
    topic?: string;
    slides: Slide[];
    existing?: PostDetails;
    schedule?: ScheduleSlot | null;
}): PostDetails {
    const { topic, slides, existing, schedule } = params;
    const firstSlide = slides[0];
    const resolvedTitle =
        existing?.title ||
        firstSlide?.meta?.overlayTitle ||
        topic ||
        'Untitled Post';
    const resolvedDescription =
        existing?.description ||
        firstSlide?.meta?.caption ||
        firstSlide?.text ||
        '';
    return {
        title: resolvedTitle,
        description: resolvedDescription,
        tags: existing?.tags ?? [],
        music: existing?.music ?? '',
        scheduleDate: schedule?.date ?? existing?.scheduleDate ?? '',
        scheduleTime: schedule?.time ?? existing?.scheduleTime ?? DEFAULT_POST_TIME,
    };
}

export async function fetchRunScheduleSlot(runId: string): Promise<ScheduleSlot | null> {
    try {
        const posts = await fetchScheduledPosts({ runId });
        if (!posts.length) {
            return null;
        }
        const sorted = [...posts].sort((a, b) => {
            const timeA = new Date(a.scheduledDate).getTime();
            const timeB = new Date(b.scheduledDate).getTime();
            return timeA - timeB;
        });
        return parseIsoDate(sorted[0].scheduledDate);
    } catch (error) {
        console.warn('[postDetails] Failed to fetch run schedule slot', error);
        return null;
    }
}

export async function suggestNextScheduleSlot(): Promise<ScheduleSlot | null> {
    try {
        const posts = await fetchScheduledPosts();
        const bookedDates = new Set(
            posts
                .map((post) => post.scheduledDate?.split('T')[0])
                .filter((date): date is string => !!date)
        );

        const candidate = new Date();
        candidate.setDate(candidate.getDate() + 1);

        for (let i = 0; i < 365; i++) {
            const dateKey = formatDatePart(candidate);
            if (!bookedDates.has(dateKey)) {
                return { date: dateKey, time: DEFAULT_POST_TIME };
            }
            candidate.setDate(candidate.getDate() + 1);
        }
    } catch (error) {
        console.warn('[postDetails] Failed to suggest next schedule slot', error);
    }
    return null;
}

export async function resolveInitialScheduleSlot(runId?: string | null): Promise<ScheduleSlot | null> {
    if (runId) {
        const runSlot = await fetchRunScheduleSlot(runId);
        if (runSlot) {
            return runSlot;
        }
    }
    return suggestNextScheduleSlot();
}
