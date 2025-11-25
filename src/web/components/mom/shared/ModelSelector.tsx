import { FC } from "react"
import { LlmModel, ImageModel } from "@/lib/mom/types"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ModelSelectorProps {
    llmModel: LlmModel
    imageModel: ImageModel
    onChangeLlmModel: (m: LlmModel) => void
    onChangeImageModel: (m: ImageModel) => void
}

export const ModelSelector: FC<ModelSelectorProps> = ({
    llmModel,
    imageModel,
    onChangeLlmModel,
    onChangeImageModel,
}) => {
    return (
        <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
                <Label className="text-sm text-slate-200">Text model (prompts)</Label>
                <Select
                    value={llmModel}
                    onValueChange={(value) => onChangeLlmModel(value as LlmModel)}
                >
                    <SelectTrigger className="bg-mm-card border border-slate-700 rounded-2xl h-9 text-xs px-3">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-mm-card border-slate-700 text-xs rounded-2xl shadow-mm-soft mt-1">
                        <SelectItem value="openrouter-sonnet-4.5">
                            Claude Sonnet 4.5 – emotionally nuanced
                        </SelectItem>
                        <SelectItem value="openrouter-gpt-5.1">
                            ChatGPT 5.1 – flexible & creative
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-sm text-slate-200">
                    Image model (visuals)
                </Label>
                <Select
                    value={imageModel}
                    onValueChange={(value) => onChangeImageModel(value as ImageModel)}
                >
                    <SelectTrigger className="bg-mm-card border border-slate-700 rounded-2xl h-9 text-xs px-3">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-mm-card border-slate-700 text-xs rounded-2xl shadow-mm-soft mt-1">
                        <SelectItem value="nanobanana-pro">
                            NanoBanana Pro – consistent infographic look
                        </SelectItem>
                        <SelectItem value="flux-schnell">
                            FLUX Schnell – fast, experimental
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
