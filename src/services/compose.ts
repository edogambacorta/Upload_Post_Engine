import sharp from 'sharp';
import path from 'path';
import { GeneratedImage } from './fal';

export type ComposedImage = {
    index: number;
    finalPath: string;
};

export async function composeImages(
    runId: string,
    generated: GeneratedImage[]
): Promise<ComposedImage[]> {
    const results: ComposedImage[] = [];
    const runDir = path.resolve(process.cwd(), 'data', 'runs', runId);

    for (const item of generated) {
        try {
            const finalPath = path.join(runDir, `final-${item.index}.jpg`);

            // Create SVG for text overlay
            const width = 1080;
            const height = 1920;

            const svgImage = `
        <svg width="${width}" height="${height}">
          <style>
            .title { fill: white; font-size: 80px; font-weight: bold; font-family: sans-serif; text-anchor: middle; }
            .subtitle { fill: #eeeeee; font-size: 40px; font-family: sans-serif; text-anchor: middle; }
            .bg { fill: rgba(0, 0, 0, 0.5); }
          </style>
          <!-- Bottom gradient/bar -->
          <rect x="0" y="${height - 400}" width="${width}" height="400" class="bg" />
          
          <text x="50%" y="${height - 250}" class="title">${escapeXml(item.prompt.overlayTitle)}</text>
          <text x="50%" y="${height - 150}" class="subtitle">${escapeXml(item.prompt.overlaySubtitle)}</text>
        </svg>
      `;

            await sharp(item.rawPath)
                .resize(width, height, {
                    fit: 'cover',
                    position: 'center',
                })
                .composite([
                    {
                        input: Buffer.from(svgImage),
                        top: 0,
                        left: 0,
                    },
                ])
                .toFormat('jpg')
                .toFile(finalPath);

            results.push({
                index: item.index,
                finalPath,
            });
        } catch (error) {
            console.error(`Failed to compose image ${item.index}:`, error);
        }
    }

    return results;
}

function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}
