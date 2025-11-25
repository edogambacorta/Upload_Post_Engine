import { FC } from "react"
import { GeneratedPrompt } from "@/lib/mom/types"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Step2ReviewPromptsProps {
  prompts: GeneratedPrompt[]
  isGeneratingImages?: boolean
  onChangePrompt: (id: string, text: string) => void
  onBackToConfigure: () => void
  onGenerateImages: () => void
}

export const Step2_ReviewPrompts: FC<Step2ReviewPromptsProps> = ({
  prompts,
  isGeneratingImages,
  onChangePrompt,
  onBackToConfigure,
  onGenerateImages,
}) => {
  const hasPrompts = prompts.length > 0

  return (
    <Card className="mt-4 border-slate-800 bg-mm-card/90 p-4 md:p-6 rounded-2xl">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h3 className="font-heading text-lg">Review & fine-tune the copy</h3>
          <p className="text-xs text-slate-400 max-w-lg mt-1">
            Adjust tone, examples, and length. Think: "would I save this if I saw it
            at 2am while feeding my baby?"
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToConfigure}
          className="border-slate-700 text-slate-300"
        >
          
          ← Back to settings
        </Button>
      </div>

      {hasPrompts ? (
        <div className="grid gap-4 md:grid-cols-2">
          {prompts.map((prompt, index) => (
            <Card
              key={prompt.id}
              className={cn(
                "border border-slate-700 bg-mm-bg/60 p-3 md:p-4 rounded-2xl flex flex-col gap-2",
              )}
            >
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Prompt #{index + 1}</span>
                <span>For slide / visual #{index + 1}</span>
              </div>
              <Textarea
                className="mt-1 min-h-[140px] bg-transparent border-slate-700 text-sm"
                value={prompt.text}
                onChange={(e) => onChangePrompt(prompt.id, e.target.value)}
              />
              <p className="mt-1 text-[0.7rem] text-slate-500 leading-relaxed">
                Tip: Aim for one strong idea per card. Start with a "hook" sentence
                that makes a tired mom feel instantly seen.
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-400">
          No prompts yet. Go back to Step 1 and generate them.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-6">
        <p className="text-xs text-slate-400 max-w-md">
          When you continue, MomMirror will turn each prompt into a designed
          infographic with overlay text and ready-to-post captions.
        </p>
        <Button
          className="bg-mm-primary hover:bg-mm-primarySoft text-slate-950 px-6"
          disabled={!hasPrompts || isGeneratingImages}
          onClick={onGenerateImages}
        >
          {isGeneratingImages ? "Generating visuals…" : "Looks good, generate images"}
        </Button>
      </div>
    </Card>
  )
}
