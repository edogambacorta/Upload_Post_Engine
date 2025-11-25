import { FC, useState } from "react"
import {
    Audience,
    AspectRatio,
    ImageModel,
    LlmModel,
    WizardConfig,
} from "@/lib/mom/types"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { AudienceSelector } from "../shared/AudienceSelector"
import { ModelSelector } from "../shared/ModelSelector"
import { AspectRatioToggle } from "../shared/AspectRatioToggle"
import { fromLocalInputValue, toLocalInputValue } from "@/lib/mom/scheduling"

interface Step1ConfigureProps {
    initialConfig?: Partial<WizardConfig>
    isLoading?: boolean
    onSubmit: (config: WizardConfig) => void
}

export const Step1_Configure: FC<Step1ConfigureProps> = ({
    initialConfig,
    isLoading,
    onSubmit,
}) => {
    const [basePrompt, setBasePrompt] = useState(
        initialConfig?.basePrompt ?? ""
    )
    const [audience, setAudience] = useState<Audience>(
        initialConfig?.audience ?? "first_time_newborn"
    )
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>(
        initialConfig?.aspectRatio ?? "9:16"
    )
    const [llmModel, setLlmModel] = useState<LlmModel>(
        initialConfig?.llmModel ?? "openrouter-gpt-5.1"
    )
    const [imageModel, setImageModel] = useState<ImageModel>(
        initialConfig?.imageModel ?? "nanobanana-pro"
    )
    const [postCount, setPostCount] = useState<number>(
        initialConfig?.postCount ?? 1
    )
    const [scheduleStart, setScheduleStart] = useState(
        initialConfig?.schedulePlan?.startDate
            ? toLocalInputValue(initialConfig.schedulePlan.startDate)
            : ""
    )
    const [scheduleIntervalHours, setScheduleIntervalHours] = useState<number>(
        initialConfig?.schedulePlan?.intervalHours ?? 24
    )

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!basePrompt.trim()) return
        const scheduleStartIso = scheduleStart ? fromLocalInputValue(scheduleStart) : null
        const normalizedSchedule = scheduleStartIso
            ? {
                  startDate: scheduleStartIso,
                  intervalHours: scheduleIntervalHours,
              }
            : undefined

        onSubmit({
            basePrompt: basePrompt.trim(),
            audience,
            aspectRatio,
            llmModel,
            imageModel,
            postCount,
            schedulePlan: normalizedSchedule,
        })
    }

    return (
        <Card className="mt-4 border-slate-800 bg-mm-card/90 p-4 md:p-6 rounded-2xl shadow-mm-soft">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Topic input */}
                <div className="space-y-2">
                    <Label className="text-sm text-slate-200">
                        Topic or working title
                    </Label>
                    <Input
                        className="bg-mm-bg/60 border-slate-700 focus-visible:ring-mm-primary"
                        placeholder="e.g. 'Invisible load of motherhood' or 'Sleep deprivation & mom guilt'"
                        value={basePrompt}
                        onChange={(e) => setBasePrompt(e.target.value)}
                    />
                    <p className="text-xs text-slate-400">
                        Keep it human and specific. The AI will explode this into multiple
                        scroll-stopping infographic prompts.
                    </p>
                </div>

                {/* Audience */}
                <div className="space-y-3">
                    <Label className="text-sm text-slate-200">
                        Who are we speaking to?
                    </Label>
                    <AudienceSelector value={audience} onChange={setAudience} />
                </div>

                {/* Models + aspect */}
                <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
                    <div className="space-y-4">
                        <ModelSelector
                            llmModel={llmModel}
                            imageModel={imageModel}
                            onChangeLlmModel={setLlmModel}
                            onChangeImageModel={setImageModel}
                        />
                        <div className="space-y-3">
                            <Label className="text-sm text-slate-200">
                                Schedule (optional)
                            </Label>
                            <div className="grid gap-3 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">
                                        First post goes live
                                    </Label>
                                    <Input
                                        type="datetime-local"
                                        value={scheduleStart}
                                        onChange={(e) => setScheduleStart(e.target.value)}
                                        className="bg-mm-bg/60 border-slate-700 focus-visible:ring-mm-primary text-xs"
                                    />
                                    <p className="text-[0.65rem] text-slate-500">
                                        Stored as UTC and applied across posts.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-400">
                                        Cadence (hours between posts)
                                    </Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={scheduleIntervalHours}
                                        onChange={(e) =>
                                            setScheduleIntervalHours(
                                                Math.max(1, Number(e.target.value) || 1)
                                            )
                                        }
                                        className="bg-mm-bg/60 border-slate-700 focus-visible:ring-mm-primary text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <AspectRatioToggle
                            value={aspectRatio}
                            onChange={setAspectRatio}
                        />
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-200">Number of posts</span>
                                <span className="text-xs text-slate-400">
                                    {postCount} infographic{postCount !== 1 && "s"}
                                </span>
                            </div>
                            <Slider
                                defaultValue={[postCount]}
                                min={1}
                                max={10}
                                step={1}
                                onValueChange={([val]) => setPostCount(val)}
                            />
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 border border-transparent rounded-2xl bg-gradient-to-r from-mm-primary/80 via-mm-secondary/70 to-mm-primary/80 shadow-[0_10px_40px_rgba(12,18,32,0.45)]">
                    <div className="text-sm text-white space-y-2 max-w-md">
                        <p className="font-bold tracking-[0.2em] uppercase text-[0.65rem] text-white/70">
                            Ready for Step 2
                        </p>
                        <p className="text-sm leading-relaxed font-medium">
                            Next up: MomMirror generates emotionally resonant, on-brand prompts you can perfect before any images are created.
                        </p>
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoading || !basePrompt.trim()}
                        className="w-full sm:w-auto mt-1 sm:mt-0 bg-white text-mm-primary font-semibold text-base px-10 h-12 rounded-xl shadow-[0_12px_30px_rgba(15,23,42,0.35)] hover:bg-slate-50 disabled:bg-white/70 disabled:text-mm-primary/60"
                    >
                        {isLoading ? "Generating prompts…" : "Generate prompts"}
                    </Button>
                </div>
            </form>
        </Card>
    )
}
