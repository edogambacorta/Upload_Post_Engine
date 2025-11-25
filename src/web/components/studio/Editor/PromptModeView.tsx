import { FileText, ImageIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStudio } from '@/lib/studio/store';

export function PromptModeView() {
    const { state } = useStudio();
    const { slides, selectedSlideId, composition } = state;

    if (slides.length === 0) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-950 text-gray-400">
                <div className="text-center space-y-2">
                    <FileText className="w-12 h-12 mx-auto opacity-60" />
                    <p className="text-sm font-medium">No prompts generated yet</p>
                    <p className="text-xs text-gray-500">
                        Click "Generate Content Draft" to create prompts
                    </p>
                </div>
            </div>
        );
    }

    const summaryMeta = slides[0]?.meta;
    const isSlideshow = composition === 'slideshow' || slides.length > 1;
    const selectedSlide =
        slides.find((s) => s.id === selectedSlideId) ?? slides[0];

    return (
        <div className="h-full overflow-y-auto bg-gray-950 p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-semibold text-white">
                        {isSlideshow ? 'Slideshow Prompts' : 'Post Prompts'}
                    </h2>
                    <p className="text-sm text-gray-400">
                        {isSlideshow
                            ? `Slideshow mode · ${slides.length} slides`
                            : 'Single image mode'}
                    </p>
                </div>
            </div>

            {summaryMeta && (
                <div className="grid gap-4 md:grid-cols-2 mb-2">
                    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Overlay Title</p>
                        <p className="text-base text-white">{summaryMeta.overlayTitle || '—'}</p>

                        <p className="text-xs font-semibold text-gray-500 uppercase mt-4">
                            Overlay Subtitle
                        </p>
                        <p className="text-sm text-gray-300">
                            {summaryMeta.overlaySubtitle || '—'}
                        </p>

                        <p className="text-xs font-semibold text-gray-500 uppercase mt-4">Hook</p>
                        <p className="text-sm text-gray-200">{summaryMeta.hook || '—'}</p>
                    </div>
                    <div className="rounded-2xl border border-gray-800 bg-gray-900/70 p-4 space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Caption</p>
                        <p className="text-sm text-gray-200 whitespace-pre-line">
                            {summaryMeta.caption || '—'}
                        </p>

                        <p className="text-xs font-semibold text-gray-500 uppercase mt-4">
                            Call to Action
                        </p>
                        <p className="text-sm text-gray-100">{summaryMeta.cta || '—'}</p>

                        <p className="text-xs font-semibold text-gray-500 uppercase mt-4">
                            Safety Footer
                        </p>
                        <p className="text-xs text-gray-400">
                            {summaryMeta.safetyFooter || '—'}
                        </p>
                    </div>
                </div>
            )}

            {/* Single image vs slideshow layout */}
            {!isSlideshow ? (
                // 🔥 Single card for single-image mode
                <Card className="bg-gray-900 border-gray-800">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                            Single Image
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div
                            className="relative rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-gray-800 overflow-hidden"
                            style={{ aspectRatio: '4 / 5' }}
                        >
                            {selectedSlide.imageUrl ? (
                                <img
                                    src={selectedSlide.imageUrl}
                                    alt={selectedSlide.text}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <ImageIcon className="w-10 h-10 text-slate-600" />
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                <FileText className="w-3.5 h-3.5" />
                                Text Prompt
                            </div>
                            <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-sm text-gray-100 leading-relaxed">
                                {selectedSlide.text || 'No text prompt provided.'}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                <ImageIcon className="w-3.5 h-3.5" />
                                Image Prompt
                            </div>
                            <div className="bg-purple-950/40 border border-purple-900 rounded-lg p-3 text-xs text-purple-100 font-mono leading-relaxed">
                                {selectedSlide.imagePrompt ||
                                    selectedSlide.meta?.imagePrompt ||
                                    selectedSlide.variationPrompt ||
                                    selectedSlide.text ||
                                    'No image prompt.'}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                // 🔥 One card per slide with clear labels
                <div className="grid gap-4 md:grid-cols-2">
                    {slides.map((slide, index) => {
                        const imagePrompt =
                            slide.imagePrompt ||
                            slide.meta?.imagePrompt ||
                            slide.variationPrompt ||
                            slide.text ||
                            'No image prompt.';

                        return (
                            <Card key={slide.id} className="bg-gray-900 border-gray-800">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
                                        <span className="inline-flex h-2 w-2 rounded-full bg-purple-400" />
                                        {`Slide ${index + 1} of ${slides.length}: ${slide.role}`}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div
                                        className="relative rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-gray-800 overflow-hidden"
                                        style={{ aspectRatio: '4 / 5' }}
                                    >
                                        {slide.imageUrl ? (
                                            <img
                                                src={slide.imageUrl}
                                                alt={slide.text}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center">
                                                <ImageIcon className="w-10 h-10 text-slate-600" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                            <FileText className="w-3.5 h-3.5" />
                                            Text Prompt
                                        </div>
                                        <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-sm text-gray-100 leading-relaxed">
                                            {slide.text || 'No text prompt provided.'}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="text-xs font-medium text-gray-500 flex items-center gap-2">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            Image Prompt
                                        </div>
                                        <div className="bg-purple-950/40 border border-purple-900 rounded-lg p-3 text-xs text-purple-100 font-mono leading-relaxed">
                                            {imagePrompt}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
