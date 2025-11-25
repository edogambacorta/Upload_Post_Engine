# Studio Editor Investigation & Improvement Plan

**Date:** November 25, 2025
**Status:** Investigation Complete
**Current Version:** v1.0 (Functional MVP)

---

## Executive Summary

The Studio Editor (`/studio/editor`) is a three-column interface for generating social media content (infographics and carousels) using AI. The current implementation provides basic text generation via LLMs (OpenRouter) and image generation via FAL.ai, but lacks granular control over individual slide prompts and visual generation.

**Current Workflow:**
1. User inputs topic/audience → Generates all text slides at once
2. User clicks "Generate Visuals" → Generates all images at once
3. No visibility into individual prompts or per-slide generation control

**Key Gap:** Users cannot see, edit, or selectively generate individual slide prompts before committing to full visual generation.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Component Hierarchy](#component-hierarchy)
3. [State Management](#state-management)
4. [API Integration](#api-integration)
5. [User Flow (Current)](#user-flow-current)
6. [Missing Features](#missing-features)
7. [Technical Debt](#technical-debt)
8. [Improvement Plan](#improvement-plan)

---

## Architecture Overview

### Routing Structure

```
/studio
├── / (index)          → Dashboard (run list)
├── /editor            → StudioEditor (main editor)
└── /batch             → BatchGenerator (bulk creation)
```

**Location:** `/src/web/App.tsx:39-42`

```tsx
<Route path="/studio" element={<StudioPage />}>
    <Route index element={<Dashboard />} />
    <Route path="editor" element={<StudioEditor />} />
    <Route path="batch" element={<BatchGenerator />} />
</Route>
```

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDIO HEADER (73px)                     │
│  Logo | Navigation (Dashboard/Editor) | View Indicator      │
├───────────────┬─────────────────────────┬──────────────────┤
│               │                         │                  │
│  LEFT PANEL   │    CENTER PANEL         │   RIGHT PANEL    │
│  (col-span-3) │    (col-span-6)         │   (col-span-3)   │
│               │                         │                  │
│  BriefPanel   │    PreviewPanel         │   StylePanel     │
│  ───────────  │    ────────────         │   ──────────     │
│  • Topic      │    • Canvas (4:5)       │   • Color        │
│  • Audience   │    • Toolbar            │   • Style        │
│  • LLM Model  │    • Storyboard         │   • Composition  │
│  • Img Model  │      (carousel only)    │   • Generate CTA │
│  • Generate   │                         │                  │
│    Draft CTA  │                         │                  │
│               │                         │                  │
└───────────────┴─────────────────────────┴──────────────────┘
```

### Technology Stack

**Frontend:**
- React 18.3 + TypeScript
- React Router 7.9.6 (routing)
- Tailwind CSS 4.1.17 (styling)
- Radix UI (components)
- Lucide React (icons)

**Backend:**
- Express.js (REST API)
- OpenAI SDK → OpenRouter (LLM text generation)
- FAL.ai SDK (image generation)
- Sharp (image processing)

**State Management:**
- React Context API + useReducer
- No external state library (Redux/Zustand)

---

## Component Hierarchy

### 1. StudioPage (Layout Container)

**File:** `/src/web/pages/StudioPage.tsx`

**Responsibilities:**
- Wraps entire studio in `<StudioProvider>` for global state
- Renders `<StudioLayout>` with header and navigation
- Conditionally hides header on `/batch` route
- Provides `<Outlet />` for nested routes

**Key Features:**
- Header with "Mom Marketing Studio" branding
- Navigation pills (Dashboard/Editor)
- Dynamic view indicator based on route

### 2. StudioEditor (Main Editor)

**File:** `/src/web/components/studio/Editor/StudioEditor.tsx`

**Responsibilities:**
- Three-column grid layout (3-6-3 span)
- Orchestrates BriefPanel, PreviewPanel, StylePanel
- No local state (all via StudioContext)

**Layout Code:**
```tsx
<div className="grid grid-cols-12 gap-6 h-full overflow-hidden">
    <div className="col-span-3 overflow-y-auto">
        <BriefPanel />
    </div>
    <div className="col-span-6 flex flex-col">
        <PreviewPanel />
    </div>
    <div className="col-span-3 overflow-y-auto">
        <StylePanel />
    </div>
</div>
```

### 3. BriefPanel (Left Column)

**File:** `/src/web/components/studio/Editor/BriefPanel.tsx`

**Responsibilities:**
- Collect user inputs (topic, audience, models)
- Trigger content draft generation
- Display loading state during generation

**UI Elements:**
```tsx
// Topic Input
<Textarea
    placeholder="E.g. Sleep training for infants"
    value={topic}
    onChange={(e) => dispatch({ type: 'SET_TOPIC', payload: e.target.value })}
/>

// Audience Selector
<Select value={audience} onValueChange={(val) => dispatch({ type: 'SET_AUDIENCE', payload: val })}>
    <SelectItem value="pregnant-anxious">Pregnant & Anxious</SelectItem>
    <SelectItem value="newborn-first-time">First-time Mom / Newborn</SelectItem>
    <SelectItem value="burned-out">Burned-out Parent</SelectItem>
    <SelectItem value="general-overwhelm">General Overwhelm</SelectItem>
</Select>

// LLM Model Selector
<Select value={llmModel} onValueChange={(val) => dispatch({ type: 'SET_LLM_MODEL', payload: val })}>
    <SelectItem value="openrouter-gpt-4.1">ChatGPT 4.1 (Fast)</SelectItem>
    <SelectItem value="openrouter-gpt-5.1-thinking">GPT 5.1 Thinking (Smart)</SelectItem>
    <SelectItem value="openrouter-sonnet-4.5">Claude Sonnet 4.5 (Creative)</SelectItem>
</Select>

// Image Model Selector
<Select value={imageModel} onValueChange={(val) => dispatch({ type: 'SET_IMAGE_MODEL', payload: val })}>
    <SelectItem value="flux-schnell">Flux Schnell (Fastest)</SelectItem>
    <SelectItem value="nanobanana">Nano Banana (Balanced)</SelectItem>
    <SelectItem value="nanobanana-pro">Nano Banana Pro (High Quality)</SelectItem>
    <SelectItem value="seedream">Seedream Edit (Artistic)</SelectItem>
</Select>
```

**Generation Logic:**
```tsx
const handleGenerate = async () => {
    dispatch({ type: 'SET_GENERATING', payload: true });

    const response = await fetch('http://localhost:3000/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience, model: llmModel })
    });

    const posts = await response.json();

    // Convert posts to slides
    const newSlides = posts.flatMap((post, i) => [
        { id: `${i}-hook`, role: 'hook', text: post.hook, status: 'draft' },
        { id: `${i}-empathy`, role: 'empathy', text: post.caption.split('.')[0], status: 'draft' },
        { id: `${i}-insight`, role: 'insight', text: post.caption, status: 'draft' },
        { id: `${i}-cta`, role: 'cta', text: post.cta, status: 'draft' }
    ]);

    dispatch({ type: 'SET_SLIDES', payload: newSlides });
    dispatch({ type: 'SET_GENERATING', payload: false });
};
```

### 4. PreviewPanel (Center Column)

**File:** `/src/web/components/studio/Editor/PreviewPanel.tsx`

**Responsibilities:**
- Display current slide in 4:5 aspect ratio canvas
- Show carousel storyboard (carousel mode only)
- Provide editing toolbar (non-functional currently)
- Handle slide selection

**Key Features:**

**Canvas Display:**
```tsx
<div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg overflow-hidden"
     style={{ aspectRatio: '4/5' }}>
    {selectedSlide?.imageUrl ? (
        <img src={selectedSlide.imageUrl} className="w-full h-full object-cover" />
    ) : (
        <div className="flex items-center justify-center h-full">
            <ImageIcon className="w-16 h-16 text-gray-300" />
        </div>
    )}

    {/* Text Overlay */}
    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
        <p className="text-sm">{selectedSlide?.text}</p>
    </div>
</div>
```

**Toolbar:**
```tsx
<div className="flex gap-2">
    <Button variant="ghost" size="sm"><Type className="w-4 h-4" /> Edit Text</Button>
    <Button variant="ghost" size="sm"><ImageIcon className="w-4 h-4" /> Edit Image</Button>
    <Button variant="ghost" size="sm"><Download className="w-4 h-4" /> Download</Button>
    <Button variant="ghost" size="sm"><Share2 className="w-4 h-4" /> Share</Button>
</div>
```

**Carousel Storyboard (Carousel Mode):**
```tsx
{mode === 'carousel' && slides.length > 0 && (
    <div className="flex gap-2 overflow-x-auto">
        {slides.map((slide) => (
            <button
                key={slide.id}
                onClick={() => dispatch({ type: 'SET_SELECTED_SLIDE', payload: slide.id })}
                className={cn(
                    "relative flex-shrink-0 w-20 h-24 rounded border-2",
                    selectedSlideId === slide.id
                        ? "border-blue-500"
                        : "border-gray-200"
                )}
            >
                {slide.imageUrl ? (
                    <img src={slide.imageUrl} className="w-full h-full object-cover rounded" />
                ) : (
                    <div className="flex items-center justify-center h-full bg-gray-100">
                        <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                )}
            </button>
        ))}

        {/* Add Slide Button */}
        <button className="flex-shrink-0 w-20 h-24 rounded border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-400">
            <Plus className="w-6 h-6 text-gray-400" />
        </button>
    </div>
)}
```

### 5. StylePanel (Right Column)

**File:** `/src/web/components/studio/Editor/StylePanel.tsx`

**Responsibilities:**
- Provide visual style configuration (color, illustration, composition)
- Trigger image generation for all slides
- Display generation progress

**UI Elements:**

**Color Palette Selector:**
```tsx
const palettes = [
    { name: 'Blue-Green', gradient: 'from-blue-400 to-green-400' },
    { name: 'Purple-Pink', gradient: 'from-purple-400 to-pink-400' },
    { name: 'Orange-Red', gradient: 'from-orange-400 to-red-400' },
    { name: 'Monochrome', gradient: 'from-gray-600 to-gray-800' }
];

<div className="grid grid-cols-2 gap-2">
    {palettes.map((palette) => (
        <button className={`h-12 rounded-lg bg-gradient-to-r ${palette.gradient}`}>
            {palette.name}
        </button>
    ))}
</div>
```

**Illustration Style Selector:**
```tsx
const styles = [
    { name: 'Minimalist Line', icon: Palette },
    { name: 'Watercolor', icon: Droplet },
    { name: '3D Render', icon: Box },
    { name: 'Flat Vector', icon: Layers }
];

<div className="grid grid-cols-2 gap-2">
    {styles.map((style) => (
        <button className="flex flex-col items-center gap-2 p-3 border rounded-lg hover:border-blue-400">
            <style.icon className="w-8 h-8" />
            <span className="text-sm">{style.name}</span>
        </button>
    ))}
</div>
```

**Composition Options:**
```tsx
<div className="space-y-2">
    <label className="flex items-center gap-2">
        <input type="checkbox" className="rounded" />
        <span className="text-sm">Reserve top space (Title)</span>
    </label>
    <label className="flex items-center gap-2">
        <input type="checkbox" className="rounded" />
        <span className="text-sm">Reserve bottom space (CTA)</span>
    </label>
    <label className="flex items-center gap-2">
        <input type="checkbox" className="rounded" />
        <span className="text-sm">Center subject</span>
    </label>
</div>
```

**Image Generation Logic:**
```tsx
const handleGenerateVisuals = async () => {
    dispatch({ type: 'SET_GENERATING', payload: true });

    // Update all slides to 'generating' status
    slides.forEach(slide => {
        dispatch({
            type: 'UPDATE_SLIDE',
            payload: { id: slide.id, updates: { status: 'generating' } }
        });
    });

    const response = await fetch('http://localhost:3000/api/generate-visuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            slides,
            imageModel,
            topic,
            audience
        })
    });

    const updatedSlides = await response.json();

    // Update slides with image URLs
    updatedSlides.forEach(slide => {
        dispatch({
            type: 'UPDATE_SLIDE',
            payload: {
                id: slide.id,
                updates: {
                    imageUrl: slide.imageUrl,
                    status: 'done'
                }
            }
        });
    });

    dispatch({ type: 'SET_GENERATING', payload: false });
};
```

---

## State Management

### StudioContext Structure

**File:** `/src/web/lib/studio/store.tsx`

**State Interface:**
```typescript
interface StudioState {
    mode: 'infographic' | 'carousel' | 'batch';
    topic: string;
    audience: string;
    llmModel: string;
    imageModel: string;
    slides: Slide[];
    selectedSlideId: string | null;
    sceneTemplateId: string | null;
    isGenerating: boolean;
    view: 'dashboard' | 'editor' | 'batch';
}

interface Slide {
    id: string;
    role: 'hook' | 'empathy' | 'insight' | 'cta' | 'other';
    text: string;
    variationPrompt?: string;
    imageUrl?: string;
    status: 'draft' | 'generating' | 'done' | 'error';
}
```

**Initial State:**
```typescript
const initialState: StudioState = {
    mode: 'infographic',
    topic: '',
    audience: 'newborn-first-time',
    llmModel: 'openrouter-sonnet-4.5',
    imageModel: 'nanobanana',
    slides: [],
    selectedSlideId: null,
    sceneTemplateId: null,
    isGenerating: false,
    view: 'dashboard'
};
```

### Reducer Actions

**Available Actions:**
```typescript
type StudioAction =
    | { type: 'SET_MODE'; payload: 'infographic' | 'carousel' | 'batch' }
    | { type: 'SET_TOPIC'; payload: string }
    | { type: 'SET_AUDIENCE'; payload: string }
    | { type: 'SET_LLM_MODEL'; payload: string }
    | { type: 'SET_IMAGE_MODEL'; payload: string }
    | { type: 'SET_SLIDES'; payload: Slide[] }
    | { type: 'ADD_SLIDE'; payload: Slide }
    | { type: 'UPDATE_SLIDE'; payload: { id: string; updates: Partial<Slide> } }
    | { type: 'SET_SELECTED_SLIDE'; payload: string | null }
    | { type: 'SET_SCENE_TEMPLATE'; payload: string | null }
    | { type: 'SET_GENERATING'; payload: boolean }
    | { type: 'SET_VIEW'; payload: 'dashboard' | 'editor' | 'batch' };
```

**Reducer Implementation:**
```typescript
function studioReducer(state: StudioState, action: StudioAction): StudioState {
    switch (action.type) {
        case 'SET_MODE':
            return { ...state, mode: action.payload };

        case 'SET_TOPIC':
            return { ...state, topic: action.payload };

        case 'SET_SLIDES':
            return { ...state, slides: action.payload };

        case 'UPDATE_SLIDE':
            return {
                ...state,
                slides: state.slides.map(slide =>
                    slide.id === action.payload.id
                        ? { ...slide, ...action.payload.updates }
                        : slide
                )
            };

        case 'SET_SELECTED_SLIDE':
            return { ...state, selectedSlideId: action.payload };

        case 'SET_GENERATING':
            return { ...state, isGenerating: action.payload };

        // ... other cases

        default:
            return state;
    }
}
```

### Context Provider

```typescript
export function StudioProvider({ children }: { children: React.ReactNode }) {
    const [state, dispatch] = useReducer(studioReducer, initialState);

    return (
        <StudioContext.Provider value={{ state, dispatch }}>
            {children}
        </StudioContext.Provider>
    );
}

export function useStudio() {
    const context = useContext(StudioContext);
    if (!context) {
        throw new Error('useStudio must be used within StudioProvider');
    }
    return context;
}
```

---

## API Integration

### Backend Endpoints

**File:** `/src/server.ts`

#### 1. POST /api/generate-draft

**Purpose:** Generate text content (hooks, captions, CTAs) using LLM

**Request Body:**
```typescript
{
    topic: string;           // "Sleep training for newborns"
    audience: string;        // "newborn-first-time"
    model: string;           // "openrouter-sonnet-4.5"
}
```

**Response:**
```typescript
MomPost[] // Array of posts with hook, caption, CTA, image prompts
```

**Implementation (server.ts:125-150):**
```typescript
app.post('/api/generate-draft', async (req, res) => {
    const { topic, audience, model } = req.body;

    // Map to service config
    const config = {
        topic: topic || 'parenting tips',
        targetAudience: audience || 'newborn-first-time',
        model: model || 'openrouter-sonnet-4.5',
        numPosts: 4,
        aspectRatio: '4:3' as AspectRatio
    };

    try {
        const posts = await generateMomMarketingPrompts(config);
        res.json(posts);
    } catch (error) {
        console.error('Error generating draft:', error);
        res.status(500).json({ error: 'Failed to generate draft' });
    }
});
```

**Service Implementation (openrouter.ts):**

**Model Mapping:**
```typescript
const modelMap = {
    'openrouter-sonnet-4.5': 'anthropic/claude-3.5-sonnet',
    'openrouter-gpt-5.1': 'openai/gpt-4o',
    'openrouter-gpt-4.1': 'openai/gpt-4-turbo',
    'openrouter-gpt-5.1-thinking': 'openai/o1-preview'
};
```

**System Prompt (abbreviated):**
```typescript
const systemPrompt = `
You are MomGPT, an expert social media strategist specializing in parenting content.

TARGET AUDIENCE:
${audienceDescriptions[config.targetAudience]}

TASK:
Generate ${config.numPosts} Instagram posts about "${config.topic}" using the "Big Mario Rule":
1. HOOK - Grab attention (emotional trigger)
2. IMAGE - Visual storytelling
3. EMPATHY - "I see you" moment
4. INSIGHT - Actionable wisdom
5. CTA - Clear next step

OUTPUT FORMAT (XML):
<posts>
  <post>
    <id>1</id>
    <overlay_title>...</overlay_title>
    <overlay_subtitle>...</overlay_subtitle>
    <hook>Attention-grabbing opening line</hook>
    <image_prompt>Detailed visual description</image_prompt>
    <caption>Full caption with empathy + insight</caption>
    <cta>Clear call to action</cta>
    <safety_footer>Optional disclaimer</safety_footer>
  </post>
</posts>

STYLE GUIDE:
- Conversational, warm, supportive tone
- Use "you" language (direct connection)
- Avoid medical advice (educational only)
- Include emotional validation
- Be specific and actionable
`;
```

**API Call:**
```typescript
const response = await openai.chat.completions.create({
    model: modelMap[config.model],
    messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create ${config.numPosts} posts about: ${config.topic}` }
    ],
    temperature: 0.8,
    max_tokens: 4000
});

// Parse XML response
const xmlContent = response.choices[0].message.content;
const posts = parseXmlPosts(xmlContent);
return posts;
```

#### 2. POST /api/generate-visuals

**Purpose:** Generate images for slides using FAL.ai

**Request Body:**
```typescript
{
    slides: Slide[];         // Array of slides with text
    imageModel: string;      // "nanobanana"
    topic: string;           // "Sleep training"
    audience: string;        // "newborn-first-time"
}
```

**Response:**
```typescript
Slide[] // Updated slides with imageUrl properties
```

**Implementation (server.ts:151-200):**
```typescript
app.post('/api/generate-visuals', async (req, res) => {
    const { slides, imageModel, topic, audience } = req.body;

    // Create unique run ID
    const runId = new Date().toISOString().replace(/:/g, '-').split('.')[0] + 'Z';
    const runDir = path.join(process.cwd(), 'data', 'runs', runId);
    fs.mkdirSync(runDir, { recursive: true });

    // Convert slides to MomPost format
    const posts: MomPost[] = slides.map((slide, i) => ({
        id: slide.id,
        audience: audience || 'newborn-first-time',
        basePrompt: topic || 'parenting tips',
        stylePreset: 'flat-vector',
        aspectRatio: '4:3',
        model: 'openrouter-sonnet-4.5',
        imageModel: imageModel || 'nanobanana',
        overlayTitle: slide.role.toUpperCase(),
        overlaySubtitle: '',
        hook: slide.text,
        imagePrompt: slide.variationPrompt || `Visual for ${slide.role}: ${slide.text}`,
        caption: slide.text,
        cta: slide.role === 'cta' ? slide.text : 'Learn more'
    }));

    try {
        // Generate images via FAL.ai
        const updatedPosts = await generateImagesForMomPrompts(posts, imageModel, runId);

        // Map back to slides with image URLs
        const updatedSlides = slides.map((slide, i) => ({
            ...slide,
            imageUrl: updatedPosts[i].imageUrl || `/runs/${runId}/${slide.id}.png`
        }));

        res.json(updatedSlides);
    } catch (error) {
        console.error('Error generating visuals:', error);
        res.status(500).json({ error: 'Failed to generate visuals' });
    }
});
```

**Service Implementation (fal.ts):**

**Model Configuration:**
```typescript
const modelConfig = {
    'flux-schnell': {
        endpoint: 'fal-ai/flux/schnell',
        steps: 4,
        guidance: 3.5
    },
    'nanobanana': {
        endpoint: 'fal-ai/flux-pro/v1.1',
        steps: 8,
        guidance: 4.0
    },
    'nanobanana-pro': {
        endpoint: 'fal-ai/flux-pro/v1.1-ultra',
        steps: 12,
        guidance: 4.5
    },
    'seedream': {
        endpoint: 'fal-ai/flux/dev',
        steps: 20,
        guidance: 5.0
    }
};
```

**Aspect Ratio Mapping:**
```typescript
const aspectRatioMap = {
    '3:4': 'portrait_4_3',
    '4:3': 'landscape_4_3',
    '9:16': 'portrait_16_9',
    '1:1': 'square'
};
```

**Prompt Enhancement:**
```typescript
function enhancePrompt(basePrompt: string, stylePreset: string): string {
    const styleMap = {
        'flat-vector': 'Flat vector style, pastel color palette, clean composition',
        'watercolor': 'Soft watercolor illustration, gentle gradients, artistic',
        '3d-render': 'Modern 3D render, smooth lighting, professional',
        'minimalist': 'Minimalist line art, simple shapes, elegant'
    };

    return `${basePrompt}. ${styleMap[stylePreset] || styleMap['flat-vector']}`;
}
```

**Image Generation:**
```typescript
async function generateImagesForMomPrompts(
    posts: MomPost[],
    imageModel: string,
    runId: string
): Promise<MomPost[]> {
    const config = modelConfig[imageModel];
    const updatedPosts: MomPost[] = [];

    for (const post of posts) {
        try {
            // Generate image via FAL.ai
            const result = await fal.subscribe(config.endpoint, {
                input: {
                    prompt: enhancePrompt(post.imagePrompt, post.stylePreset),
                    image_size: aspectRatioMap[post.aspectRatio],
                    num_inference_steps: config.steps,
                    guidance_scale: config.guidance,
                    num_images: 1
                }
            });

            const imageUrl = result.images[0].url;

            // Download and save image
            const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' });
            const filePath = path.join('data', 'runs', runId, `${post.id}.png`);
            fs.writeFileSync(filePath, Buffer.from(imageBuffer.data));

            updatedPosts.push({
                ...post,
                imageUrl: `/runs/${runId}/${post.id}.png`
            });
        } catch (error) {
            console.error(`Error generating image for post ${post.id}:`, error);
            updatedPosts.push(post); // Keep original without image
        }
    }

    return updatedPosts;
}
```

---

## User Flow (Current)

### Step-by-Step Walkthrough

```
┌─────────────────────────────────────────────────────────────┐
│  1. USER NAVIGATES TO /studio/editor                        │
│     - Sees empty three-column layout                        │
│     - BriefPanel ready for input                            │
│     - PreviewPanel shows empty placeholder                  │
│     - StylePanel shows default selections                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. USER CONFIGURES BRIEF (Left Panel)                      │
│     ✓ Topic: "Sleep training for 6-month-olds"             │
│     ✓ Audience: "First-time Mom / Newborn"                 │
│     ✓ LLM Model: "Claude Sonnet 4.5 (Creative)"            │
│     ✓ Image Model: "Nano Banana (Balanced)"                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. USER CLICKS "Generate Content Draft"                    │
│     - Button shows loading spinner                          │
│     - API call: POST /api/generate-draft                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  4. BACKEND PROCESSING                                       │
│     - OpenRouter calls Claude Sonnet 4.5                    │
│     - LLM generates 4 posts with XML structure              │
│     - Parses: hook, caption, CTA, image_prompt              │
│     - Returns array of MomPost objects                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  5. FRONTEND CONVERTS POSTS TO SLIDES                        │
│     Post #1 → 4 slides:                                     │
│       - Slide 1 (role: hook): "Are sleepless nights..."    │
│       - Slide 2 (role: empathy): "You're exhausted..."     │
│       - Slide 3 (role: insight): "Here's what works..."    │
│       - Slide 4 (role: cta): "Try this tonight..."         │
│                                                              │
│     Total: 16 slides created (4 posts × 4 slides each)      │
│     All slides have status: 'draft' (no images yet)         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  6. PREVIEW PANEL UPDATES                                    │
│     - Displays first slide (Slide 1, role: hook)            │
│     - Shows text overlay on placeholder background          │
│     - Carousel mode: Shows storyboard thumbnails            │
│     - User can click thumbnails to preview other slides     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  7. USER OPTIONALLY CONFIGURES STYLE (Right Panel)           │
│     ✓ Color Palette: "Purple-Pink"                         │
│     ✓ Illustration Style: "Watercolor"                     │
│     ✓ Composition: [✓] Reserve bottom space (CTA)          │
│                                                              │
│     NOTE: These selections are UI-only, not yet applied!    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  8. USER CLICKS "Generate Visuals"                           │
│     - Button shows loading spinner                          │
│     - All slides set to status: 'generating'                │
│     - API call: POST /api/generate-visuals                  │
│     - Sends: slides[], imageModel, topic, audience          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  9. BACKEND IMAGE GENERATION                                 │
│     - Creates runId: "2025-11-25T14-30-00-000Z"             │
│     - Creates directory: /data/runs/{runId}/                │
│     - Converts slides to MomPost format                     │
│     - For each post:                                        │
│         → FAL.ai generates image from imagePrompt           │
│         → Downloads image from FAL URL                      │
│         → Saves to /data/runs/{runId}/{postId}.png          │
│     - Returns slides with imageUrl: "/runs/{runId}/..."     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  10. FRONTEND UPDATES SLIDES                                 │
│     - Dispatches UPDATE_SLIDE for each slide                │
│     - Updates imageUrl property                             │
│     - Sets status: 'done'                                   │
│     - PreviewPanel re-renders with actual images            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  11. USER REVIEWS RESULTS                                    │
│     - Can navigate slides via carousel thumbnails           │
│     - Can select individual slides to preview               │
│     - Cannot edit text (toolbar buttons non-functional)     │
│     - Cannot download or share (not yet implemented)        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  12. WORKFLOW ENDS                                           │
│     - No save/export functionality                          │
│     - No integration with Dashboard                         │
│     - Images saved locally but not tracked in UI            │
└─────────────────────────────────────────────────────────────┘
```

### Key Limitations in Current Flow

1. **All-or-nothing generation:** Cannot generate text for individual slides
2. **Bulk image generation:** Must generate all visuals at once
3. **No prompt visibility:** Cannot see LLM-generated prompts before generation
4. **No prompt editing:** Cannot modify image prompts before generation
5. **No selective regeneration:** Cannot regenerate just one slide's image
6. **Style settings ignored:** UI selections don't affect output
7. **No persistence:** Generated content not saved to database

---

## Missing Features

### Critical (Blocks Core Functionality)

1. **Per-Slide Prompt Visibility**
   - Cannot see individual image prompts before generation
   - No way to review what the LLM decided for each slide

2. **Selective Visual Generation**
   - Cannot generate images for individual slides
   - Must commit to generating all 16 images at once

3. **Prompt Editing**
   - Cannot modify text before image generation
   - Cannot tweak image prompts

4. **Save/Export Functionality**
   - Generated content is lost on page refresh
   - No database persistence
   - No export to social platforms

### High Priority (Significantly Degrades UX)

5. **Text Editing in Preview**
   - Toolbar exists but buttons do nothing
   - Cannot refine captions after generation

6. **Style Application**
   - Color palette selection is cosmetic only
   - Illustration style doesn't affect FAL.ai prompts
   - Composition checkboxes have no effect

7. **Error Handling & Feedback**
   - No error states for failed API calls
   - No progress indicators for individual slides
   - No retry mechanism for failed generations

8. **Batch Generator**
   - Exists in routing but not functional
   - No backend integration

### Medium Priority (Nice to Have)

9. **Image Editing**
   - Cannot crop, adjust, or filter generated images
   - No integration with image editing tools

10. **Download Feature**
    - Cannot download individual slides
    - No batch download option
    - No format selection (PNG/JPG/PDF)

11. **Share Feature**
    - No social media sharing
    - No link generation
    - No collaboration features

12. **Slide Management**
    - Cannot add new slides manually
    - Cannot reorder slides
    - Cannot delete individual slides

13. **Scene Templates**
    - State structure exists but unused
    - Could provide pre-made composition templates

### Low Priority (Polish)

14. **Keyboard Shortcuts**
    - No hotkeys for common actions
    - No arrow key navigation for carousel

15. **Auto-save**
    - No draft persistence
    - No undo/redo

16. **Accessibility**
    - Limited ARIA labels
    - No screen reader optimization

---

## Technical Debt

### Architecture Issues

1. **Hardcoded API URLs**
   - All fetch calls use `http://localhost:3000`
   - Should use environment variables

   ```typescript
   // Current (Bad)
   fetch('http://localhost:3000/api/generate-draft', ...)

   // Should be
   fetch(`${import.meta.env.VITE_API_URL}/api/generate-draft`, ...)
   ```

2. **State Management Scaling**
   - React Context + useReducer works for now
   - Will become unwieldy with more features
   - Consider migrating to Zustand or Redux Toolkit

3. **No Error Boundaries**
   - Uncaught errors crash entire app
   - Need React error boundaries for graceful degradation

4. **No Loading States for Granular Actions**
   - Single `isGenerating` boolean for all operations
   - Cannot distinguish between text generation vs. image generation

### Code Quality

5. **Type Safety Gaps**
   - Some `any` types in API responses
   - Missing runtime validation for API payloads

6. **Inconsistent Naming**
   - `MomPost` vs. `Slide` (both represent content)
   - `generate-draft` (API) vs. `generateContentDraft` (function)

7. **Duplicate Logic**
   - Slide conversion logic repeated in multiple files
   - Model mapping duplicated between frontend and backend

8. **No Tests**
   - Zero unit tests
   - Zero integration tests
   - Zero E2E tests

### Performance

9. **No Image Optimization**
   - FAL.ai images saved as-is (no compression)
   - No lazy loading for carousel thumbnails
   - No image caching strategy

10. **No Request Debouncing**
    - Input changes trigger immediate state updates
    - Could cause performance issues with rapid typing

11. **Sequential Image Generation**
    - Images generated one-by-one in a loop
    - Should use Promise.all() for parallel generation

### Security

12. **No Input Validation**
    - Topic/audience inputs not sanitized
    - No length limits on text fields

13. **No Rate Limiting**
    - No throttling on API endpoints
    - Vulnerable to abuse

14. **API Keys in Backend**
    - Proper pattern (not exposed to frontend)
    - But no key rotation strategy

### DevOps

15. **No Environment Configuration**
    - Missing `.env.example`
    - No clear setup instructions

16. **No Build Optimization**
    - No code splitting
    - No bundle analysis

17. **No Monitoring**
    - No error tracking (Sentry, etc.)
    - No analytics
    - No performance monitoring

---

## Improvement Plan

### Overview

The goal is to transform the studio editor from a bulk generation tool into a **granular, prompt-centric workflow** where users can:

1. **See all prompts upfront** before committing to image generation
2. **Edit individual prompts** (text and image) before generation
3. **Selectively generate** visuals one-by-one or in batch
4. **Iterate quickly** with regeneration and refinement

### Target User Flow

```
1. USER ENTERS MASTER PROMPT
   ↓
2. CLICK "Create" → Generate Text + Image Prompts
   ↓
3. CENTER UI SWITCHES TO "PROMPT MODE"
   - Shows grid/list of future images (placeholders)
   - Each card displays:
     • Text prompt (hook/caption/CTA)
     • Image prompt (what will be generated)
     • Edit buttons for both
     • Generate button (per slide)
   ↓
4. USER REVIEWS PROMPTS
   - Can edit text directly
   - Can edit image prompts directly
   - Can delete unwanted slides
   - Can reorder slides
   ↓
5. USER GENERATES VISUALS
   Option A: Click individual "Generate" button
   Option B: Click "Select All → Generate All"
   ↓
6. RIGHT PANEL SHOWS VISUAL GENERATION
   - Real-time progress for selected slide
   - Preview of generated image
   - Regenerate button if unsatisfied
   ↓
7. EXPORT/SAVE
   - Download individual slides or entire carousel
   - Save to database as "run"
   - Share to social platforms
```

---

### Implementation Plan

## Phase 1: Prompt Visibility & Editing

### 1.1 Update Slide Data Structure

**File:** `/src/web/lib/studio/types.ts`

**Add new fields to Slide interface:**
```typescript
interface Slide {
    id: string;
    role: 'hook' | 'empathy' | 'insight' | 'cta' | 'other';
    text: string;                    // User-facing text
    imagePrompt: string;             // NEW: Image generation prompt
    variationPrompt?: string;        // DEPRECATED (remove)
    imageUrl?: string;
    status: 'draft' | 'generating' | 'done' | 'error';
    isSelected?: boolean;            // NEW: For batch selection
    error?: string;                  // NEW: Error message if generation fails
}
```

**Add new view mode:**
```typescript
interface StudioState {
    // ... existing fields
    viewMode: 'config' | 'prompt' | 'preview';  // NEW: Track UI mode
}
```

### 1.2 Modify Draft Generation Logic

**File:** `/src/web/components/studio/Editor/BriefPanel.tsx`

**Update handleGenerate to extract image prompts:**
```typescript
const handleGenerate = async () => {
    dispatch({ type: 'SET_GENERATING', payload: true });

    const response = await fetch(`${API_URL}/api/generate-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, audience, model: llmModel })
    });

    const posts: MomPost[] = await response.json();

    // NEW: Extract BOTH text and image prompts
    const newSlides: Slide[] = posts.flatMap((post, postIndex) => [
        {
            id: `${postIndex}-hook`,
            role: 'hook',
            text: post.hook,
            imagePrompt: post.imagePrompt || `Visual representation of: ${post.hook}`,
            status: 'draft',
            isSelected: false
        },
        {
            id: `${postIndex}-empathy`,
            role: 'empathy',
            text: post.caption.split('.').slice(0, 2).join('.') + '.',
            imagePrompt: `Empathetic visual for: ${post.caption.split('.')[0]}`,
            status: 'draft',
            isSelected: false
        },
        {
            id: `${postIndex}-insight`,
            role: 'insight',
            text: post.caption,
            imagePrompt: `Illustrate key insight: ${post.caption.split('.').slice(-2).join('.')}`,
            status: 'draft',
            isSelected: false
        },
        {
            id: `${postIndex}-cta`,
            role: 'cta',
            text: post.cta,
            imagePrompt: `Call to action visual: ${post.cta}`,
            status: 'draft',
            isSelected: false
        }
    ]);

    dispatch({ type: 'SET_SLIDES', payload: newSlides });
    dispatch({ type: 'SET_VIEW_MODE', payload: 'prompt' });  // NEW: Switch to prompt mode
    dispatch({ type: 'SET_GENERATING', payload: false });
};
```

### 1.3 Create Prompt Mode UI Component

**NEW FILE:** `/src/web/components/studio/Editor/PromptMode.tsx`

```typescript
import React from 'react';
import { useStudio } from '@/web/lib/studio/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/web/components/ui/card';
import { Button } from '@/web/components/ui/button';
import { Textarea } from '@/web/components/ui/textarea';
import { ImageIcon, Edit3, Trash2, Sparkles } from 'lucide-react';

export function PromptMode() {
    const { state, dispatch } = useStudio();
    const { slides } = state;

    const handleTextEdit = (slideId: string, newText: string) => {
        dispatch({
            type: 'UPDATE_SLIDE',
            payload: { id: slideId, updates: { text: newText } }
        });
    };

    const handleImagePromptEdit = (slideId: string, newPrompt: string) => {
        dispatch({
            type: 'UPDATE_SLIDE',
            payload: { id: slideId, updates: { imagePrompt: newPrompt } }
        });
    };

    const handleToggleSelect = (slideId: string) => {
        const slide = slides.find(s => s.id === slideId);
        dispatch({
            type: 'UPDATE_SLIDE',
            payload: {
                id: slideId,
                updates: { isSelected: !slide?.isSelected }
            }
        });
    };

    const handleGenerateSingle = (slideId: string) => {
        dispatch({ type: 'SET_SELECTED_SLIDE', payload: slideId });
        // Will trigger visual generation in right panel
    };

    const selectedCount = slides.filter(s => s.isSelected).length;

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header with Batch Actions */}
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border">
                <div>
                    <h2 className="text-lg font-semibold">Prompt Review</h2>
                    <p className="text-sm text-gray-600">
                        {slides.length} slides • {selectedCount} selected
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            slides.forEach(slide => {
                                dispatch({
                                    type: 'UPDATE_SLIDE',
                                    payload: { id: slide.id, updates: { isSelected: true } }
                                });
                            });
                        }}
                    >
                        Select All
                    </Button>
                    <Button
                        variant="default"
                        disabled={selectedCount === 0}
                        onClick={() => {
                            // Trigger batch generation (implemented in Phase 1.5)
                            dispatch({ type: 'GENERATE_SELECTED_VISUALS' });
                        }}
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate {selectedCount > 0 ? `${selectedCount} Visuals` : 'Selected'}
                    </Button>
                </div>
            </div>

            {/* Scrollable Grid of Prompt Cards */}
            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                    {slides.map((slide) => (
                        <Card
                            key={slide.id}
                            className={cn(
                                "relative transition-all",
                                slide.isSelected && "ring-2 ring-blue-500"
                            )}
                        >
                            {/* Selection Checkbox */}
                            <div className="absolute top-3 left-3 z-10">
                                <input
                                    type="checkbox"
                                    checked={slide.isSelected || false}
                                    onChange={() => handleToggleSelect(slide.id)}
                                    className="w-5 h-5 rounded border-gray-300"
                                />
                            </div>

                            {/* Card Header */}
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-gray-500 uppercase">
                                    {slide.role}
                                </CardTitle>
                            </CardHeader>

                            <CardContent className="space-y-3">
                                {/* Image Placeholder */}
                                <div
                                    className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400"
                                    style={{ aspectRatio: '4/5' }}
                                    onClick={() => handleGenerateSingle(slide.id)}
                                >
                                    {slide.imageUrl ? (
                                        <img
                                            src={slide.imageUrl}
                                            alt={slide.text}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center h-full">
                                            <ImageIcon className="w-12 h-12 text-gray-400" />
                                        </div>
                                    )}

                                    {/* Generate Overlay */}
                                    {!slide.imageUrl && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition-colors">
                                            <Button
                                                size="sm"
                                                className="opacity-0 hover:opacity-100 transition-opacity"
                                            >
                                                <Sparkles className="w-4 h-4 mr-1" />
                                                Generate
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* Text Prompt (Editable) */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                        <Edit3 className="w-3 h-3" />
                                        Text Content
                                    </label>
                                    <Textarea
                                        value={slide.text}
                                        onChange={(e) => handleTextEdit(slide.id, e.target.value)}
                                        className="text-sm resize-none"
                                        rows={3}
                                        placeholder="Enter slide text..."
                                    />
                                </div>

                                {/* Image Prompt (Editable) */}
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3" />
                                        Image Prompt
                                    </label>
                                    <Textarea
                                        value={slide.imagePrompt}
                                        onChange={(e) => handleImagePromptEdit(slide.id, e.target.value)}
                                        className="text-sm resize-none font-mono"
                                        rows={2}
                                        placeholder="Describe the visual..."
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1"
                                        onClick={() => handleGenerateSingle(slide.id)}
                                        disabled={slide.status === 'generating'}
                                    >
                                        {slide.status === 'generating' ? (
                                            <>
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                                Generating...
                                            </>
                                        ) : slide.imageUrl ? (
                                            <>
                                                <RefreshCw className="w-3 h-3 mr-1" />
                                                Regenerate
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-3 h-3 mr-1" />
                                                Generate
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            dispatch({ type: 'DELETE_SLIDE', payload: slide.id });
                                        }}
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
```

### 1.4 Update StudioEditor Layout

**File:** `/src/web/components/studio/Editor/StudioEditor.tsx`

**Add conditional rendering for view modes:**
```typescript
import { PromptMode } from './PromptMode';

export function StudioEditor() {
    const { state } = useStudio();
    const { viewMode } = state;

    return (
        <div className="grid grid-cols-12 gap-6 h-full overflow-hidden">
            {/* LEFT PANEL - Brief (only in config mode) */}
            {viewMode === 'config' && (
                <div className="col-span-3 overflow-y-auto">
                    <BriefPanel />
                </div>
            )}

            {/* CENTER PANEL - Dynamic */}
            <div className={cn(
                "flex flex-col",
                viewMode === 'config' ? "col-span-6" : "col-span-9"
            )}>
                {viewMode === 'config' && <PreviewPanel />}
                {viewMode === 'prompt' && <PromptMode />}
                {viewMode === 'preview' && <PreviewPanel />}
            </div>

            {/* RIGHT PANEL - Style/Generation */}
            <div className="col-span-3 overflow-y-auto">
                <StylePanel />
            </div>
        </div>
    );
}
```

### 1.5 Add Reducer Actions

**File:** `/src/web/lib/studio/store.tsx`

**Add new action types:**
```typescript
type StudioAction =
    | ... existing actions
    | { type: 'SET_VIEW_MODE'; payload: 'config' | 'prompt' | 'preview' }
    | { type: 'DELETE_SLIDE'; payload: string }
    | { type: 'GENERATE_SELECTED_VISUALS' }
    | { type: 'TOGGLE_SLIDE_SELECTION'; payload: string };
```

**Update reducer:**
```typescript
case 'SET_VIEW_MODE':
    return { ...state, viewMode: action.payload };

case 'DELETE_SLIDE':
    return {
        ...state,
        slides: state.slides.filter(s => s.id !== action.payload)
    };

case 'TOGGLE_SLIDE_SELECTION':
    return {
        ...state,
        slides: state.slides.map(s =>
            s.id === action.payload
                ? { ...s, isSelected: !s.isSelected }
                : s
        )
    };
```

---

## Phase 2: Selective Visual Generation

### 2.1 Update Backend API

**File:** `/src/server.ts`

**Create new endpoint for single-slide generation:**
```typescript
app.post('/api/generate-visual-single', async (req, res) => {
    const { slide, imageModel, topic, audience } = req.body;

    // Validate input
    if (!slide || !slide.imagePrompt) {
        return res.status(400).json({ error: 'Invalid slide data' });
    }

    // Create or reuse runId
    const runId = req.body.runId || new Date().toISOString().replace(/:/g, '-').split('.')[0] + 'Z';
    const runDir = path.join(process.cwd(), 'data', 'runs', runId);
    fs.mkdirSync(runDir, { recursive: true });

    // Convert to MomPost format
    const post: MomPost = {
        id: slide.id,
        audience: audience || 'newborn-first-time',
        basePrompt: topic || 'parenting tips',
        stylePreset: 'flat-vector',
        aspectRatio: '4:3',
        model: 'openrouter-sonnet-4.5',
        imageModel: imageModel || 'nanobanana',
        overlayTitle: slide.role.toUpperCase(),
        overlaySubtitle: '',
        hook: slide.text,
        imagePrompt: slide.imagePrompt,
        caption: slide.text,
        cta: slide.role === 'cta' ? slide.text : 'Learn more'
    };

    try {
        // Generate single image
        const updatedPost = await generateImageForSinglePost(post, imageModel, runId);

        // Return updated slide
        res.json({
            ...slide,
            imageUrl: updatedPost.imageUrl || `/runs/${runId}/${slide.id}.png`,
            status: 'done'
        });
    } catch (error) {
        console.error('Error generating visual:', error);
        res.status(500).json({
            error: 'Failed to generate visual',
            message: error.message
        });
    }
});
```

**Create helper function in fal.ts:**
```typescript
export async function generateImageForSinglePost(
    post: MomPost,
    imageModel: string,
    runId: string
): Promise<MomPost> {
    const config = modelConfig[imageModel];

    try {
        const result = await fal.subscribe(config.endpoint, {
            input: {
                prompt: enhancePrompt(post.imagePrompt, post.stylePreset),
                image_size: aspectRatioMap[post.aspectRatio],
                num_inference_steps: config.steps,
                guidance_scale: config.guidance,
                num_images: 1
            }
        });

        const imageUrl = result.images[0].url;

        // Download and save
        const imageBuffer = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const filePath = path.join('data', 'runs', runId, `${post.id}.png`);
        fs.writeFileSync(filePath, Buffer.from(imageBuffer.data));

        return {
            ...post,
            imageUrl: `/runs/${runId}/${post.id}.png`
        };
    } catch (error) {
        throw new Error(`FAL.ai generation failed: ${error.message}`);
    }
}
```

### 2.2 Update StylePanel for Single Generation

**File:** `/src/web/components/studio/Editor/StylePanel.tsx`

**Add handleGenerateSingle function:**
```typescript
const handleGenerateSingle = async (slideId: string) => {
    const slide = slides.find(s => s.id === slideId);
    if (!slide) return;

    // Update slide status
    dispatch({
        type: 'UPDATE_SLIDE',
        payload: { id: slideId, updates: { status: 'generating' } }
    });

    try {
        const response = await fetch(`${API_URL}/api/generate-visual-single`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                slide,
                imageModel,
                topic,
                audience,
                runId: currentRunId  // Track across session
            })
        });

        if (!response.ok) {
            throw new Error('Generation failed');
        }

        const updatedSlide = await response.json();

        dispatch({
            type: 'UPDATE_SLIDE',
            payload: {
                id: slideId,
                updates: {
                    imageUrl: updatedSlide.imageUrl,
                    status: 'done'
                }
            }
        });
    } catch (error) {
        console.error('Error generating visual:', error);
        dispatch({
            type: 'UPDATE_SLIDE',
            payload: {
                id: slideId,
                updates: {
                    status: 'error',
                    error: error.message
                }
            }
        });
    }
};
```

**Add batch generation handler:**
```typescript
const handleGenerateSelected = async () => {
    const selectedSlides = slides.filter(s => s.isSelected);
    if (selectedSlides.length === 0) return;

    dispatch({ type: 'SET_GENERATING', payload: true });

    // Generate in parallel (max 3 concurrent)
    const batchSize = 3;
    for (let i = 0; i < selectedSlides.length; i += batchSize) {
        const batch = selectedSlides.slice(i, i + batchSize);
        await Promise.all(batch.map(slide => handleGenerateSingle(slide.id)));
    }

    dispatch({ type: 'SET_GENERATING', payload: false });
};
```

### 2.3 Update Right Panel UI

**File:** `/src/web/components/studio/Editor/StylePanel.tsx`

**Add real-time preview for selected slide:**
```typescript
export function StylePanel() {
    const { state, dispatch } = useStudio();
    const { slides, selectedSlideId, imageModel, isGenerating } = state;

    const selectedSlide = slides.find(s => s.id === selectedSlideId);

    return (
        <div className="space-y-6">
            {/* Selected Slide Preview */}
            {selectedSlide && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm">Selected Slide</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {/* Preview */}
                        <div
                            className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg overflow-hidden"
                            style={{ aspectRatio: '4/5' }}
                        >
                            {selectedSlide.imageUrl ? (
                                <img
                                    src={selectedSlide.imageUrl}
                                    className="w-full h-full object-cover"
                                />
                            ) : selectedSlide.status === 'generating' ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <p className="text-sm text-gray-600">Generating...</p>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <ImageIcon className="w-12 h-12 text-gray-300" />
                                </div>
                            )}
                        </div>

                        {/* Prompt Display */}
                        <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-600">Image Prompt</label>
                            <p className="text-xs text-gray-700 font-mono bg-gray-50 p-2 rounded">
                                {selectedSlide.imagePrompt}
                            </p>
                        </div>

                        {/* Generate Button */}
                        <Button
                            variant="default"
                            className="w-full"
                            disabled={selectedSlide.status === 'generating'}
                            onClick={() => handleGenerateSingle(selectedSlide.id)}
                        >
                            {selectedSlide.status === 'generating' ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Generating...
                                </>
                            ) : selectedSlide.imageUrl ? (
                                <>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Regenerate Visual
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4 mr-2" />
                                    Generate Visual
                                </>
                            )}
                        </Button>

                        {/* Error Display */}
                        {selectedSlide.status === 'error' && (
                            <div className="bg-red-50 border border-red-200 rounded p-2">
                                <p className="text-xs text-red-700">
                                    {selectedSlide.error || 'Generation failed'}
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Style Configuration (existing UI) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Visual Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Color Palette */}
                    {/* Illustration Style */}
                    {/* Composition */}
                    {/* (Keep existing UI) */}
                </CardContent>
            </Card>

            {/* Image Model Selector (move from BriefPanel) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm">Generation Model</CardTitle>
                </CardHeader>
                <CardContent>
                    <Select
                        value={imageModel}
                        onValueChange={(val) => dispatch({ type: 'SET_IMAGE_MODEL', payload: val })}
                    >
                        <SelectItem value="flux-schnell">
                            <div className="flex flex-col">
                                <span>Flux Schnell</span>
                                <span className="text-xs text-gray-500">Fastest (4 steps)</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="nanobanana">
                            <div className="flex flex-col">
                                <span>Nano Banana</span>
                                <span className="text-xs text-gray-500">Balanced (8 steps)</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="nanobanana-pro">
                            <div className="flex flex-col">
                                <span>Nano Banana Pro</span>
                                <span className="text-xs text-gray-500">High Quality (12 steps)</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="seedream">
                            <div className="flex flex-col">
                                <span>Seedream Edit</span>
                                <span className="text-xs text-gray-500">Artistic (20 steps)</span>
                            </div>
                        </SelectItem>
                    </Select>
                </CardContent>
            </Card>
        </div>
    );
}
```

---

## Phase 3: Style Integration & Composition

### 3.1 Apply Style Selections to Prompts

**File:** `/src/web/lib/studio/store.tsx`

**Add style state:**
```typescript
interface StudioState {
    // ... existing
    colorPalette: 'blue-green' | 'purple-pink' | 'orange-red' | 'monochrome';
    illustrationStyle: 'minimalist' | 'watercolor' | '3d' | 'flat-vector';
    composition: {
        reserveTopSpace: boolean;
        reserveBottomSpace: boolean;
        centerSubject: boolean;
    };
}
```

**Update fal.ts to use style settings:**
```typescript
function enhancePromptWithStyle(
    basePrompt: string,
    style: {
        colorPalette: string;
        illustrationStyle: string;
        composition: any;
    }
): string {
    const colorDescriptions = {
        'blue-green': 'Cool blue and green tones, calming color palette',
        'purple-pink': 'Warm purple and pink gradient, soft and nurturing',
        'orange-red': 'Energetic orange to red gradient, vibrant and bold',
        'monochrome': 'Grayscale monochrome, elegant and timeless'
    };

    const styleDescriptions = {
        'minimalist': 'Minimalist line art style, simple clean lines, elegant composition',
        'watercolor': 'Soft watercolor illustration, gentle gradients, artistic brush strokes',
        '3d': 'Modern 3D render, smooth lighting, professional CGI style',
        'flat-vector': 'Flat vector style, geometric shapes, clean modern design'
    };

    const compositionHints = [];
    if (style.composition.reserveTopSpace) {
        compositionHints.push('leave space at top for text overlay');
    }
    if (style.composition.reserveBottomSpace) {
        compositionHints.push('leave space at bottom for call-to-action');
    }
    if (style.composition.centerSubject) {
        compositionHints.push('center the main subject');
    }

    const parts = [
        basePrompt,
        styleDescriptions[style.illustrationStyle],
        colorDescriptions[style.colorPalette],
        compositionHints.length > 0 ? compositionHints.join(', ') : ''
    ];

    return parts.filter(Boolean).join('. ');
}
```

### 3.2 Update API to Accept Style Parameters

**File:** `/src/server.ts`

```typescript
app.post('/api/generate-visual-single', async (req, res) => {
    const { slide, imageModel, topic, audience, style } = req.body;

    // ... existing validation

    // Enhanced prompt with style
    const enhancedPrompt = enhancePromptWithStyle(slide.imagePrompt, style);

    const post: MomPost = {
        // ... existing fields
        imagePrompt: enhancedPrompt,
        stylePreset: style.illustrationStyle
    };

    // ... rest of generation
});
```

### 3.3 Update Frontend to Send Style

**File:** `/src/web/components/studio/Editor/StylePanel.tsx`

```typescript
const handleGenerateSingle = async (slideId: string) => {
    // ... existing setup

    const response = await fetch(`${API_URL}/api/generate-visual-single`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            slide,
            imageModel,
            topic,
            audience,
            style: {
                colorPalette: state.colorPalette,
                illustrationStyle: state.illustrationStyle,
                composition: state.composition
            },
            runId: currentRunId
        })
    });

    // ... rest of handler
};
```

---

## Phase 4: Persistence & Export

### 4.1 Add Save to Database

**Create database schema (if using SQLite/PostgreSQL):**
```sql
CREATE TABLE studio_runs (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    topic TEXT NOT NULL,
    audience TEXT NOT NULL,
    llm_model TEXT,
    image_model TEXT,
    mode TEXT CHECK(mode IN ('infographic', 'carousel', 'batch')),
    status TEXT CHECK(status IN ('draft', 'completed', 'archived')),
    metadata JSON
);

CREATE TABLE studio_slides (
    id TEXT PRIMARY KEY,
    run_id TEXT REFERENCES studio_runs(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    image_prompt TEXT NOT NULL,
    image_url TEXT,
    status TEXT CHECK(status IN ('draft', 'generating', 'done', 'error')),
    metadata JSON
);
```

**Add save endpoint:**
```typescript
app.post('/api/studio/save-run', async (req, res) => {
    const { runId, topic, audience, llmModel, imageModel, mode, slides } = req.body;

    try {
        // Save run metadata
        await db.query(
            `INSERT INTO studio_runs (id, topic, audience, llm_model, image_model, mode, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'draft')
             ON CONFLICT (id) DO UPDATE SET
                updated_at = CURRENT_TIMESTAMP,
                topic = $2,
                audience = $3,
                llm_model = $4,
                image_model = $5`,
            [runId, topic, audience, llmModel, imageModel, mode]
        );

        // Save slides
        for (const [index, slide] of slides.entries()) {
            await db.query(
                `INSERT INTO studio_slides (id, run_id, position, role, text, image_prompt, image_url, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO UPDATE SET
                    text = $5,
                    image_prompt = $6,
                    image_url = $7,
                    status = $8`,
                [slide.id, runId, index, slide.role, slide.text, slide.imagePrompt, slide.imageUrl, slide.status]
            );
        }

        res.json({ success: true, runId });
    } catch (error) {
        console.error('Error saving run:', error);
        res.status(500).json({ error: 'Failed to save run' });
    }
});
```

### 4.2 Add Download Functionality

**Install dependencies:**
```bash
npm install jszip file-saver
```

**NEW FILE:** `/src/web/lib/studio/export.ts`

```typescript
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function downloadSlide(slide: Slide) {
    if (!slide.imageUrl) return;

    const response = await fetch(slide.imageUrl);
    const blob = await response.blob();
    saveAs(blob, `${slide.role}-${slide.id}.png`);
}

export async function downloadAllSlides(slides: Slide[], topic: string) {
    const zip = new JSZip();

    for (const slide of slides) {
        if (!slide.imageUrl) continue;

        const response = await fetch(slide.imageUrl);
        const blob = await response.blob();
        zip.file(`${slide.role}-${slide.id}.png`, blob);
    }

    // Add metadata file
    const metadata = {
        topic,
        slideCount: slides.length,
        generatedAt: new Date().toISOString(),
        slides: slides.map(s => ({
            role: s.role,
            text: s.text,
            imagePrompt: s.imagePrompt
        }))
    };
    zip.file('metadata.json', JSON.stringify(metadata, null, 2));

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${topic.replace(/\s+/g, '-')}-carousel.zip`);
}
```

**Add download buttons to UI:**
```typescript
// In PromptMode.tsx
import { downloadSlide, downloadAllSlides } from '@/web/lib/studio/export';

<Button
    variant="outline"
    onClick={() => downloadSlide(slide)}
    disabled={!slide.imageUrl}
>
    <Download className="w-4 h-4 mr-1" />
    Download
</Button>

// In header
<Button onClick={() => downloadAllSlides(slides, topic)}>
    <Download className="w-4 h-4 mr-2" />
    Download All
</Button>
```

---

## Phase 5: Polish & UX Enhancements

### 5.1 Error Handling & Retry Logic

**Add retry mechanism:**
```typescript
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    delay = 1000
): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
    }
    throw new Error('Max retries exceeded');
}

// Usage
const result = await retryWithBackoff(() =>
    fal.subscribe(config.endpoint, { input: ... })
);
```

### 5.2 Keyboard Shortcuts

**NEW FILE:** `/src/web/lib/studio/useKeyboardShortcuts.ts`

```typescript
import { useEffect } from 'react';
import { useStudio } from './store';

export function useKeyboardShortcuts() {
    const { state, dispatch } = useStudio();

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            // Cmd/Ctrl + S: Save
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                // Trigger save
            }

            // Cmd/Ctrl + G: Generate selected
            if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
                e.preventDefault();
                dispatch({ type: 'GENERATE_SELECTED_VISUALS' });
            }

            // Cmd/Ctrl + A: Select all
            if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
                e.preventDefault();
                // Select all slides
            }

            // Arrow keys: Navigate slides
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                // Navigate to next/previous slide
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [state, dispatch]);
}
```

### 5.3 Auto-save Drafts

**Use localStorage for session persistence:**
```typescript
// In StudioProvider
useEffect(() => {
    const saveInterval = setInterval(() => {
        if (state.slides.length > 0) {
            localStorage.setItem('studio-draft', JSON.stringify(state));
        }
    }, 30000); // Every 30 seconds

    return () => clearInterval(saveInterval);
}, [state]);

// On mount, restore draft
useEffect(() => {
    const draft = localStorage.getItem('studio-draft');
    if (draft) {
        const parsedDraft = JSON.parse(draft);
        // Optionally ask user if they want to restore
        dispatch({ type: 'RESTORE_DRAFT', payload: parsedDraft });
    }
}, []);
```

### 5.4 Progress Indicators

**Add toast notifications:**
```bash
npm install sonner
```

```typescript
import { toast } from 'sonner';

// In generation handlers
toast.promise(
    handleGenerateSingle(slideId),
    {
        loading: 'Generating visual...',
        success: 'Visual generated successfully!',
        error: 'Failed to generate visual'
    }
);
```

---

## Implementation Summary

### What This Plan Delivers

1. **Prompt-First Workflow**
   - Master prompt → Immediate visibility of all text + image prompts
   - No surprises before visual generation

2. **Granular Control**
   - Edit any prompt before generation
   - Generate visuals one-by-one or in batch
   - Regenerate individual slides without affecting others

3. **Enhanced UX**
   - Clear visual hierarchy (config → prompt → preview)
   - Real-time progress indicators
   - Error handling with retry logic

4. **Production-Ready Features**
   - Database persistence
   - Download/export functionality
   - Keyboard shortcuts
   - Auto-save drafts

### Development Timeline Estimate

- **Phase 1 (Prompt Visibility):** Core foundation - 2-3 days
- **Phase 2 (Selective Generation):** API + UI updates - 2-3 days
- **Phase 3 (Style Integration):** Enhance prompts - 1-2 days
- **Phase 4 (Persistence/Export):** Database + downloads - 2-3 days
- **Phase 5 (Polish):** UX refinements - 1-2 days

**Total:** ~8-13 days of focused development

### Key Technical Decisions

1. **Keep React Context:** Lightweight enough for current scale
2. **Add Database Layer:** PostgreSQL or SQLite for production
3. **Parallel Generation:** Use Promise.all() with batching (max 3 concurrent)
4. **Style as Prompt Enhancement:** Append to base prompt rather than separate parameters
5. **Incremental Migration:** Can ship Phase 1-2 before 3-5

---

## Risks & Mitigations

### Risk 1: FAL.ai Rate Limits
**Impact:** Batch generation may fail for large carousels
**Mitigation:** Implement queue system with retry logic, show per-slide progress

### Risk 2: Prompt Quality Degradation
**Impact:** User edits may produce worse images than LLM-generated prompts
**Mitigation:** Add "Reset to AI-generated prompt" button, provide prompt writing tips

### Risk 3: State Complexity
**Impact:** Context API may struggle with frequent updates across many slides
**Mitigation:** Consider migrating to Zustand if performance degrades

### Risk 4: Storage Costs
**Impact:** Saving all generated images can consume disk space
**Mitigation:** Implement image cleanup for abandoned runs, compress PNGs

---

## Future Enhancements (Post-MVP)

1. **Collaborative Editing:** Multi-user support with real-time sync
2. **Template Library:** Pre-built scene templates for common themes
3. **A/B Testing:** Generate multiple variations per slide
4. **Social Integration:** Direct publishing to Instagram/Facebook
5. **Analytics:** Track engagement metrics for posted content
6. **AI Refinement:** "Make it better" button that iterates on prompts
7. **Video Export:** Animate carousel slides into video format
8. **Brand Kit:** Custom color palettes and fonts per user

---

## Conclusion

The current studio editor provides a solid MVP for AI-assisted content creation, but lacks the granularity and control that power users need. This improvement plan transforms it from a "black box" tool into a **transparent, iterative workflow** where users maintain creative control while leveraging AI capabilities.

By implementing prompt visibility, selective generation, and style integration, we empower users to:
- Understand exactly what will be created before committing
- Iterate quickly on individual elements
- Build confidence in the AI's output through transparency

The phased approach allows for incremental delivery, ensuring each phase delivers value while building toward the complete vision.
