import * as fal from '@fal-ai/serverless-client';
import fs from 'fs';
import path from 'path';
import { PostPrompt } from './openrouter';
import axios from 'axios';

// Configure fal.ai client with API key
fal.config({
    credentials: process.env.FAL_KEY || '',
});

export type GeneratedImage = {
    index: number;
    prompt: PostPrompt;
    rawPath: string;
};

export async function generateImagesForPrompts(
    runId: string,
    prompts: PostPrompt[]
): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];
    const runDir = path.resolve(process.cwd(), 'data', 'runs', runId);

    if (!fs.existsSync(runDir)) {
        fs.mkdirSync(runDir, { recursive: true });
    }

    for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i];
        try {
            // Using FLUX.1-schnell for speed
            const result: any = await fal.subscribe('fal-ai/flux/schnell', {
                input: {
                    prompt: prompt.prompt,
                    image_size: 'portrait_16_9', // Close to 9:16
                    num_inference_steps: 4,
                },
                logs: true,
                onQueueUpdate: (update: any) => {
                    if (update.status === 'IN_PROGRESS') {
                        update.logs.map((log: any) => log.message).forEach(console.log);
                    }
                },
            });

            if (result.images && result.images.length > 0) {
                const imageUrl = result.images[0].url;
                const rawPath = path.join(runDir, `raw-${i}.png`);

                await downloadImage(imageUrl, rawPath);

                results.push({
                    index: i,
                    prompt,
                    rawPath,
                });
            }
        } catch (error) {
            console.error(`Failed to generate image for prompt ${i}:`, error);
        }
    }

    return results;
}

import { MomPost } from './runOrchestrator';

export async function generateImagesForMomPrompts(
    runId: string,
    posts: MomPost[],
    imageModel?: 'nanobanana-pro' | 'flux-schnell'
): Promise<GeneratedImage[]> {
    const results: GeneratedImage[] = [];
    const runDir = path.resolve(process.cwd(), 'data', 'runs', runId);

    if (!fs.existsSync(runDir)) {
        fs.mkdirSync(runDir, { recursive: true });
    }

    // Determine which model to use
    const useNanoBanana = imageModel === 'nanobanana-pro';
    const modelId = useNanoBanana ? 'fal-ai/flux-pro/v1.1-ultra' : 'fal-ai/flux/schnell';
    // Note: Using flux-pro/v1.1-ultra as nanobanana-pro equivalent (high quality FLUX model)

    for (let i = 0; i < posts.length; i++) {
        const post = posts[i];
        try {
            // Map AspectRatio to fal.ai image_size
            // Fal.ai uses these formats: portrait_4_3, portrait_16_9, landscape_4_3, landscape_16_9, square
            let imageSize: string = 'portrait_4_3';
            if (post.aspectRatio === '3:4') imageSize = 'portrait_4_3';
            if (post.aspectRatio === '4:3') imageSize = 'landscape_4_3';
            if (post.aspectRatio === '9:16') imageSize = 'portrait_16_9';

            // Enhance prompt for style consistency
            const finalPrompt = `${post.imagePrompt}. Flat vector style, pastel color palette, clean composition, high quality, no text overlays, minimalist design`;

            console.log(`Generating image ${i + 1}/${posts.length} with model: ${modelId}, size: ${imageSize}`);

            const result: any = await fal.subscribe(modelId, {
                input: {
                    prompt: finalPrompt,
                    image_size: imageSize,
                    num_inference_steps: useNanoBanana ? 12 : 4, // Higher quality model needs more steps
                },
                logs: true,
                onQueueUpdate: (update: any) => {
                    if (update.status === 'IN_PROGRESS') {
                        update.logs.map((log: any) => log.message).forEach(console.log);
                    }
                },
            });

            if (result.images && result.images.length > 0) {
                const imageUrl = result.images[0].url;
                const rawPath = path.join(runDir, `raw-${i}.png`);

                await downloadImage(imageUrl, rawPath);

                results.push({
                    index: i,
                    prompt: {
                        prompt: post.imagePrompt,
                        overlayTitle: post.overlayTitle,
                        overlaySubtitle: post.overlaySubtitle
                    },
                    rawPath,
                });
            }
        } catch (error) {
            console.error(`Failed to generate image for mom post ${i}:`, error);
        }
    }

    return results;
}

async function downloadImage(url: string, destPath: string): Promise<void> {
    const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
    });

    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });
}
