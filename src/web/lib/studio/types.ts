export type PostType = 'infographic' | 'carousel' | 'ideas';
export type CompositionMode = 'single' | 'slideshow';

export interface SceneTemplate {
    id: string;
    name: string;
    description: string;
    thumbnailUrl?: string;
    basePrompt: string;
}

export interface SlideTemplate {
    id: string;
    name: string;
    description?: string;
    imagePromptBase?: string;
    backgroundStyle?: {
        type: 'color' | 'gradient';
        value: string;
    };
    textBoxDefaults?: Slide['textBox'];
}

export type PreviewMode = 'text' | 'image' | 'prompt';

export interface Slide {
    id: string;
    role: 'hook' | 'empathy' | 'insight' | 'cta' | 'other' | 'single';
    text: string;
    variationPrompt?: string;
    imagePrompt?: string;
    meta?: {
        overlayTitle?: string;
        overlaySubtitle?: string;
        hook?: string;
        caption?: string;
        cta?: string;
        safetyFooter?: string;
        imagePrompt?: string;
        backgroundStyle?: {
            type: 'color' | 'gradient';
            value: string;
        };
    };
    imageUrl?: string;
    status: 'draft' | 'generating' | 'done' | 'error';
    textBox?: {
        left: number;
        top: number;
        width: number;
        fontSize?: number;
        fill?: string;
        backgroundColor?: string;
        textAlign?: 'left' | 'center' | 'right';
        angle?: number;
        scaleX?: number;
        scaleY?: number;
    };
    imageTransform?: {
        left: number;
        top: number;
        scaleX: number;
        scaleY: number;
    };
    imageFilters?: {
        saturation?: number;
        brightness?: number;
        contrast?: number;
        blur?: number;
        noise?: number;
        pixelate?: number;
    };
    imageHistory?: string[];
    thumbnailUrl?: string;
}

export interface PostDetails {
    title: string;
    description: string;
    tags: string[];
    music: string;
    scheduleDate?: string;
    scheduleTime?: string;
}

export interface StudioState {
    mode: PostType;
    composition: CompositionMode;
    topic: string;
    audience: string;
    llmModel: string;
    imageModel: string;
    slides: Slide[];
    selectedSlideId: string | null;
    sceneTemplateId: string | null;
    templates: SlideTemplate[];
    activeTemplateId: string | null;
    isGenerating: boolean;
    view: 'dashboard' | 'editor' | 'batch';
    editMode: 'text' | 'image';
    previewMode: PreviewMode;
    aspectRatio: AspectRatio;
    viewport: ViewportState;
    exportFrame: ExportFrameConfig;
    postDetails: PostDetails;
    hasGenerated: boolean;
    runId: string | null;
}
export type AspectRatio = '1:1' | '3:4' | '4:3' | '4:5' | '9:16' | '16:9';

export interface ViewportState {
    zoom: number;   // 1.0 = 100%
    panX: number;   // pixels in canvas space
    panY: number;
}

export interface ExportFrameConfig {
    width: number;       // logical pixels inside Fabric canvas (e.g. 1080)
    height: number;      // e.g. 1350
    aspectRatio: AspectRatio;
}

export interface MomPost {
    id: string;
    audience: string;
    basePrompt: string;
    stylePreset: string;
    aspectRatio: AspectRatio;
    model: string;
    imageModel?: string;
    overlayTitle: string;
    overlaySubtitle: string;
    hook: string;
    imagePrompt: string;
    caption: string;
    cta: string;
    safetyFooter?: string;
    scheduledDate?: string;
}
