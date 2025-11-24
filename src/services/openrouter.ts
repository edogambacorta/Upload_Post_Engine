import OpenAI from 'openai';

export type PostPrompt = {
    prompt: string;
    overlayTitle: string;
    overlaySubtitle: string;
};

const openai = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Upload-Post Engine',
    },
});

export async function generatePrompts(
    topic: string,
    count: number
): Promise<PostPrompt[]> {
    const systemPrompt = `
You are a creative assistant for generating social media content.
Generate ${count} distinct post ideas about "${topic}".
Output MUST be valid XML in the following format:
<posts>
  <post>
    <prompt>Detailed image generation prompt for an AI model (e.g. FLUX)</prompt>
    <overlay_title>Short catchy title</overlay_title>
    <overlay_subtitle>Engaging subtitle</overlay_subtitle>
  </post>
  ...
</posts>
Do not include any markdown formatting or other text. Just the XML.
`;

    const completion = await openai.chat.completions.create({
        model: 'meta-llama/llama-3.1-70b-instruct', // Using Llama 3.1 via OpenRouter
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate ${count} posts about ${topic}` },
        ],
    });

    const content = completion.choices[0]?.message?.content || '';

    // Simple XML parsing
    const posts: PostPrompt[] = [];
    const postRegex = /<post>([\s\S]*?)<\/post>/g;
    let match;

    while ((match = postRegex.exec(content)) !== null) {
        const postContent = match[1];
        const prompt = extractTag(postContent, 'prompt');
        const overlayTitle = extractTag(postContent, 'overlay_title');
        const overlaySubtitle = extractTag(postContent, 'overlay_subtitle');

        if (prompt && overlayTitle) {
            posts.push({ prompt, overlayTitle, overlaySubtitle: overlaySubtitle || '' });
        }
    }

    return posts;
}

import { MomPost, MomStylePreset, ModelId, AudienceSegment, AspectRatio } from './runOrchestrator';

const MODEL_MAP: Record<ModelId, string> = {
    'openrouter-sonnet-4.5': 'anthropic/claude-3.5-sonnet',
    'openrouter-gpt-5.1': 'openai/gpt-5.1', // Assuming this is available or fallback to gpt-4o
};

const STYLE_PRESETS: Record<MomStylePreset, string> = {
    night_instead_of_sleeping: `Minimalist infographic with clean, pastel color palette (soft mint, blush, warm beige) on off-white background. At the top, show a relatable mom illustration. Title in big bold letters. Below, create stacked sections with bold headers and 3-4 bullet phrases in friendly sans-serif font, large enough to read on a phone. Include tiny icons next to each bullet. At the bottom, a small reassurance/support message. Use plenty of white space, soft rounded shapes, no clutter, no tiny text, modern flat vector style.`,
    three_moms_one_day: `Minimalist infographic with clean pastel colors on off-white background. Title at top in bold letters. Three horizontal or stacked sections, each representing a different persona/mood/state. Each section has a header and 2-3 short relatable bullet points with tiny icons. Use flat vector style, plenty of breathing room, phone-optimized text size, reassuring message at bottom.`,
    survival_mode: `Minimalist infographic with gentle, reassuring design. Soft pastel palette on light background. Title at top. Split into vertical or grid sections showing contrasts or progression. Each section has clear header and bullet points. Include small validating icons. Bottom has comforting affirmation. Clean flat vector style, no overwhelm, large legible font, lots of white space.`,
    custom_infographic: `Minimalist infographic following this exact format:
- Clean, pastel color palette (choose 3-4 harmonious colors like soft mint, blush, warm beige, light lavender, pastel teal) on off-white background
- At the top: simple, calm illustration relevant to the topic
- Main title in big, bold, highly readable font
- Body: 2-4 stacked sections/blocks with bold section headers
- Each section contains 3-4 bullet phrases (not full sentences) in friendly sans-serif font, minimum 14pt equivalent
- Tiny, simple line icons beside each bullet point
- At the bottom: one-line reassurance, validation, or supportive message in a gentle band/box
- Style: modern flat vector, soft rounded shapes, NO clutter, NO tiny text, NO dense paragraphs
- Optimize for phone readability with high contrast text and generous padding
- Include plenty of white space for visual breathing room`
};

export async function generateMomMarketingPrompts(
    config: {
        audience: AudienceSegment;
        stylePreset: MomStylePreset;
        aspectRatio: AspectRatio;
        model: ModelId;
        basePrompt: string;
        count: number;
    }
): Promise<MomPost[]> {
    const model = MODEL_MAP[config.model] || 'anthropic/claude-3.5-sonnet';
    const stylePrompt = STYLE_PRESETS[config.stylePreset];

    const systemPrompt = `
You are MomMirror, a gentle, private, AI-guided support app for women.
Your goal: Make a specific mom feel seen, remove shame, and give one tiny doable action.

**The Big Mario Rule:**
- Little Mario (Her Now): Exhausted, overwhelmed, snapping, guilty.
- Power-Up (MomMirror): 3-minute check-in (breathe, reframe, tiny win).
- Big Mario (Her After): Still tired, but calmer, softer on herself, not drowning.
*Crucial: Sell the "Big Mario" outcome, not the app features.*

**Audience Segments (Pick ONE based on user input):**
- A. Pregnant + Anxious ("My brain won't switch off.")
- B. First-time Mom / Newborn ("I love my baby but I am not okay.")
- C. Burned-out Parent ("I come last. I'm empty.")
- D. General Overwhelm ("Holding it together but falling apart.")

**The Formula (A -> B -> C -> D -> E):**
- A. Hook: Say the pain out loud. Real feelings.
- B. Normalize: Remove shame. "You're not bad, you're exhausted."
- C. Tiny Win: What MomMirror does in 3 mins (breathe, kinder voice).
- D. Identity Shift (Big Mario): "You get to feel like a person again."
- E. CTA: Soft, supportive. "Start my 3-minute check-ins." (NO "Buy now").

**Tone Rules:**
- Tired, honest friend in the kitchen at midnight.
- Short sentences. Real words. No jargon. No "supermom" fluff.
- Validate before asking her to do anything.
- NEVER shame.

**Visual Rules:**
- BEFORE: Real exhaustion, mess, tears.
- AFTER: Same mess, but softer face, dropped shoulders, "less on fire".
- Style: Nature, growth, soft morning light, warm coral + teal.

**Output Format:**
You must output STRICT XML. No markdown.
<posts>
  <post>
    <id>unique_string_id</id>
    <overlay_title>Short, punchy title</overlay_title>
    <overlay_subtitle>Supporting subtitle</overlay_subtitle>
    <hook>The "A" Hook (Pain)</hook>
    <image_prompt>Visual description for the infographic background. Focus on "After" state or abstract nature/growth. Flat vector style, pastel colors.</image_prompt>
    <caption >Full caption following A->B->C->D->E formula.</caption>
    <cta>The "E" CTA</cta>
    <safety_footer>Include ONLY if topic is heavy/crisis.</safety_footer>
  </post>
</posts>
`;

    const userPrompt = `
Generate ${config.count} posts.
Base Prompt/Topic: "${config.basePrompt}"
Audience: ${config.audience}
Style Preset: ${config.stylePreset} (${stylePrompt})
Aspect Ratio: ${config.aspectRatio}

Remember the XML format.
`;

    try {
        const completion = await openai.chat.completions.create({
            model: model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
        });

        const content = completion.choices[0]?.message?.content || '';
        console.log('OpenRouter Response:', content); // Debug log

        // Parse XML
        const posts: MomPost[] = [];
        const postRegex = /<post>([\s\S]*?)<\/post>/g;
        let match;

        while ((match = postRegex.exec(content)) !== null) {
            const postContent = match[1];
            const id = extractTag(postContent, 'id') || Math.random().toString(36).substring(7);
            const overlayTitle = extractTag(postContent, 'overlay_title') || '';
            const overlaySubtitle = extractTag(postContent, 'overlay_subtitle') || '';
            const hook = extractTag(postContent, 'hook') || '';
            const imagePrompt = extractTag(postContent, 'image_prompt') || '';
            const caption = extractTag(postContent, 'caption') || '';
            const cta = extractTag(postContent, 'cta') || '';
            const safetyFooter = extractTag(postContent, 'safety_footer');

            posts.push({
                id,
                audience: config.audience,
                basePrompt: config.basePrompt,
                stylePreset: config.stylePreset,
                aspectRatio: config.aspectRatio,
                model: config.model,
                overlayTitle,
                overlaySubtitle,
                hook,
                imagePrompt,
                caption,
                cta,
                safetyFooter: safetyFooter || undefined,
            });
        }

        return posts;
    } catch (error) {
        console.error('Error generating Mom prompts:', error);
        throw error;
    }
}

function extractTag(xml: string, tagName: string): string | null {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`);
    const match = regex.exec(xml);
    return match ? match[1].trim() : null;
}
