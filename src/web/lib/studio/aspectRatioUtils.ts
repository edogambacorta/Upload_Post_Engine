import { AspectRatio, ExportFrameConfig } from './types';

export interface AspectRatioDimensions {
    label: AspectRatio;
    width: number;
    height: number;
    displayLabel: string;
}

export const ASPECT_RATIOS: AspectRatioDimensions[] = [
    { label: '1:1', width: 1080, height: 1080, displayLabel: '1:1' },
    { label: '4:5', width: 1080, height: 1350, displayLabel: '4:5' },
    { label: '3:4', width: 1080, height: 1440, displayLabel: '3:4' },
    { label: '9:16', width: 1080, height: 1920, displayLabel: '9:16' },
    { label: '16:9', width: 1920, height: 1080, displayLabel: '16:9' },
    { label: '4:3', width: 1440, height: 1080, displayLabel: '4:3' },
];

export function getAspectRatioDimensions(ratio: AspectRatio): AspectRatioDimensions {
    const found = ASPECT_RATIOS.find((r) => r.label === ratio);
    if (!found) {
        // Default to 4:5 if not found
        return ASPECT_RATIOS[1];
    }
    return found;
}

export function createExportFrameConfig(ratio: AspectRatio): ExportFrameConfig {
    const dimensions = getAspectRatioDimensions(ratio);
    return {
        width: dimensions.width,
        height: dimensions.height,
        aspectRatio: ratio,
    };
}
