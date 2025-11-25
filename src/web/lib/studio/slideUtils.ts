import { MomPost, Slide } from './types';

const buildBaseMeta = (post: MomPost) => ({
    overlayTitle: post.overlayTitle,
    overlaySubtitle: post.overlaySubtitle,
    hook: post.hook,
    caption: post.caption,
    cta: post.cta,
    safetyFooter: post.safetyFooter,
    imagePrompt: post.imagePrompt,
});

// 🔥 Single-image helper
export function createSingleSlideFromPost(post: MomPost): Slide {
    const baseId = post.id || 'slide';
    const meta = buildBaseMeta(post);

    const mainText = post.caption || post.hook || '';
    const imagePrompt =
        post.imagePrompt ||
        (post.hook ? `Visual representation of "${post.hook}"` : `Visualize: ${mainText}`);

    return {
        id: `${baseId}-single`,
        role: 'single',
        text: mainText,
        imagePrompt,
        variationPrompt: imagePrompt,
        imageUrl: '',
        status: 'draft',
        meta,
    };
}

// 🔥 Slideshow helper (your existing logic, just refactored)
export function createSlideshowFromPost(post: MomPost): Slide[] {
    const baseId = post.id || 'slide';
    const captionSentences = post.caption
        .split('.')
        .map((s) => s.trim())
        .filter(Boolean);
    const empathyText = captionSentences.length ? `${captionSentences[0]}.` : post.caption;
    const insightText = post.caption;
    const meta = buildBaseMeta(post);

    return [
        {
            id: `${baseId}-hook`,
            role: 'hook',
            text: post.hook,
            imagePrompt: post.imagePrompt || `Visual representation of "${post.hook}"`,
            variationPrompt: post.imagePrompt || '',
            imageUrl: '',
            status: 'draft',
            meta,
        },
        {
            id: `${baseId}-empathy`,
            role: 'empathy',
            text: empathyText,
            imagePrompt: `Empathetic scene illustrating "${empathyText.replace(/\.$/, '')}"`,
            variationPrompt: `Empathetic scene illustrating "${empathyText.replace(/\.$/, '')}"`,
            imageUrl: '',
            status: 'draft',
            meta,
        },
        {
            id: `${baseId}-insight`,
            role: 'insight',
            text: insightText,
            imagePrompt: `Illustrate the core insight: ${insightText}`,
            variationPrompt: `Illustrate the core insight: ${insightText}`,
            imageUrl: '',
            status: 'draft',
            meta,
        },
        {
            id: `${baseId}-cta`,
            role: 'cta',
            text: post.cta,
            imagePrompt: `Call-to-action visual: ${post.cta}`,
            variationPrompt: `Call-to-action visual: ${post.cta}`,
            imageUrl: '',
            status: 'draft',
            meta,
        },
    ];
}

// Convenience: existing callers can be migrated gradually
export function createSlidesFromPost(
    post: MomPost,
    composition: 'single' | 'slideshow' = 'slideshow'
): Slide[] {
    return composition === 'single'
        ? [createSingleSlideFromPost(post)]
        : createSlideshowFromPost(post);
}

