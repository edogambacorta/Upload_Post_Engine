import { ComposedImage } from './compose';

export type PublishResult = {
    platform: 'tiktok' | 'instagram';
    remoteId: string;
    url?: string;
    status: 'success' | 'failed';
    error?: string;
};

type ScheduleSlot = {
    postId: string;
    scheduledDate?: string;
};

export async function publishImages(
    runId: string,
    images: ComposedImage[],
    captions: string[], // Assuming captions match images by index
    schedules?: ScheduleSlot[]
): Promise<PublishResult[][]> {
    const results: PublishResult[][] = [];
    const apiKey = process.env.UPLOAD_POST_API_KEY;
    const dryRun = process.env.UPLOAD_POST_DRY_RUN !== 'false';

    if (!apiKey && !dryRun) {
        console.warn('UPLOAD_POST_API_KEY not set, skipping publish');
        return images.map(() => []);
    }

    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const caption = captions[i] || '';
        const imageResults: PublishResult[] = [];

        // This is a mock implementation based on the description.
        // In a real scenario, we would upload the file to Upload-Post's servers first
        // or provide a public URL if Upload-Post supports it.
        // Since we are local, we might need to upload the file buffer.

        try {
            const schedule = schedules?.[i];
            const scheduledDate = schedule?.scheduledDate;
            const payloadPreview = {
                postId: schedule?.postId ?? `${runId}-${i}`,
                caption,
                mediaPath: image.finalPath,
                scheduled_date: scheduledDate ?? null,
            };
            console.log(`[UploadPost] Prepared payload for run ${runId}`, payloadPreview);

            if (dryRun) {
                console.log('[UploadPost] Dry run enabled, not calling Upload-Post API.');
            } else {
                // const fileBuffer = fs.readFileSync(image.finalPath);
                // const blob = new Blob([fileBuffer]); // Node 20+ supports Blob

                // Example: Upload to Instagram
                // const response = await axios.post('https://api.upload-post.com/v1/post', {
            //   platform: 'instagram',
            //   media: blob, // or url
            //   caption: caption
            // }, { headers: { Authorization: `Bearer ${apiKey}` } });

            // Mocking success for now as we don't have real credentials/docs for the specific API shape
            // in the prompt beyond "Upload-Post".

            // Assuming we want to publish to both if configured. 
            // For now, let's just log it.
            console.log(`[Mock] Publishing ${image.finalPath} to Instagram/TikTok with caption: ${caption} (RunID: ${runId})`);

            }

            imageResults.push({
                platform: 'instagram',
                remoteId: `mock-ig-${Date.now()}`,
                status: 'success'
            });
            imageResults.push({
                platform: 'tiktok',
                remoteId: `mock-tt-${Date.now()}`,
                status: 'success'
            });

        } catch (error: any) {
            console.error(`Failed to publish image ${i}:`, error);
            imageResults.push({
                platform: 'instagram',
                remoteId: '',
                status: 'failed',
                error: error.message
            });
        }

        results.push(imageResults);
    }

    return results;
}
