// Audience Types
export type Audience =
    | "pregnant_anxious"
    | "first_time_newborn"
    | "burned_out_parent"
    | "female_overwhelm"

// Aspect Ratio Types
export type AspectRatio = "3:4" | "4:3" | "9:16"

// Model Types
export type LlmModel = "openrouter-sonnet-4.5" | "openrouter-gpt-5.1"
export type ImageModel = "flux-schnell" | "nanobanana-pro"

// Wizard Types
export type WizardStep = 1 | 2 | 3

export interface SchedulePlan {
    startDate: string
    intervalHours: number
}

export interface WizardConfig {
    basePrompt: string
    audience: Audience
    aspectRatio: AspectRatio
    llmModel: LlmModel
    imageModel: ImageModel
    postCount: number
    schedulePlan?: SchedulePlan
}

export interface GeneratedPrompt {
    id: string
    text: string
}

export interface GeneratedImage {
    id: string
    promptId: string
    imageUrl: string
    caption: string
    postId: string
    runId: string
    scheduledDate?: string
}

// Run Types
export type RunStatus = "PENDING" | "GENERATING_PROMPTS" | "GENERATING_IMAGES" | "DONE" | "ERROR"

export interface MomConfig {
    audience: Audience
    stylePreset: string
    aspectRatio: AspectRatio
    model: LlmModel
    imageModel?: ImageModel
}

export interface MomPost {
    id: string
    overlayTitle: string
    overlaySubtitle: string
    hook: string
    imagePrompt: string
    caption: string
    cta: string
    safetyFooter: string
    scheduledDate?: string
}

export interface Post {
    prompt?: any
    momPost?: MomPost
    rawImageUrl?: string
    finalImageUrl?: string
    publish?: Record<string, any>
    scheduledDate?: string
}

export interface MomRun {
    id: string
    mode: string
    topic: string
    count: number
    status: RunStatus
    currentStep: string
    momConfig?: MomConfig
    posts: Post[]
    createdAt?: string
}

export type MomUiRunStatus = "pending" | "generating" | "completed" | "failed"

export interface MomUiRun {
    id: string
    createdAt: string
    topic: string
    audience: Audience
    aspectRatio: AspectRatio
    llmModel: LlmModel
    imageModel: ImageModel
    status: MomUiRunStatus
    postCount: number
    thumbnails: string[]
}

export interface MomUiPost {
    id: string
    runId: string
    imageUrl: string
    caption: string
    prompt: string
    scheduledDate?: string
}
