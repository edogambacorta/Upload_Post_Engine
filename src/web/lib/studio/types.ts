export type PostType = 'infographic' | 'carousel' | 'batch';
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
    };
    imageTransform?: {
        left: number;
        top: number;
        scaleX: number;
        scaleY: number;
    };
    imageHistory?: string[];
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
}
export type AspectRatio = '3:4' | '4:3' | '9:16';

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
