export type PostType = 'infographic' | 'carousel' | 'batch';

export interface SceneTemplate {
    id: string;
    name: string;
    description: string;
    thumbnailUrl?: string;
    basePrompt: string;
}

export interface Slide {
    id: string;
    role: 'hook' | 'empathy' | 'insight' | 'cta' | 'other';
    text: string;
    variationPrompt?: string;
    imageUrl?: string;
    status: 'draft' | 'generating' | 'done' | 'error';
    textBox?: {
        left: number;
        top: number;
        width: number;
    };
    imageTransform?: {
        left: number;
        top: number;
        scaleX: number;
        scaleY: number;
    };
}

export interface StudioState {
    mode: PostType;
    topic: string;
    audience: string;
    llmModel: string;
    imageModel: string;
    slides: Slide[];
    selectedSlideId: string | null;
    sceneTemplateId: string | null;
    isGenerating: boolean;
    view: 'dashboard' | 'editor' | 'batch';
    editMode: 'text' | 'image';
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
