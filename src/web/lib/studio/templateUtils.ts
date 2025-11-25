import { Slide, SlideTemplate } from './types';

export function createTemplateFromSlide(slide: Slide, name: string): SlideTemplate {
    return {
        id: `tpl-${Date.now()}`,
        name,
        description: `Template from slide "${slide.id}"`,
        imagePromptBase: slide.imagePrompt || slide.meta?.imagePrompt,
        backgroundStyle: slide.meta?.backgroundStyle,
        textBoxDefaults: slide.textBox ? { ...slide.textBox } : undefined,
    };
}

export function applyTemplateToSlide(slide: Slide, template: SlideTemplate): Slide {
    return {
        ...slide,
        imagePrompt: template.imagePromptBase || slide.imagePrompt,
        textBox: template.textBoxDefaults
            ? { ...template.textBoxDefaults }
            : slide.textBox,
        meta: {
            ...slide.meta,
            imagePrompt: template.imagePromptBase || slide.meta?.imagePrompt,
            backgroundStyle: template.backgroundStyle || slide.meta?.backgroundStyle,
        },
    };
}

export function applyTemplateToAllSlides(
    slides: Slide[],
    template: SlideTemplate
): Slide[] {
    return slides.map((s) => applyTemplateToSlide(s, template));
}
