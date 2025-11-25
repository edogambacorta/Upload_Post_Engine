import { useState } from "react"
import {
  GeneratedImage,
  GeneratedPrompt,
  WizardConfig,
  WizardStep,
} from "@/lib/mom/types"
import { StepIndicator } from "./StepIndicator"
import { Step1_Configure } from "./Step1_Configure"
import { Step2_ReviewPrompts } from "./Step2_ReviewPromptsClean"
import { Step3_GenerateImages } from "./Step3_GenerateImages"

interface CreateWizardProps {
  onGeneratePrompts: (config: WizardConfig) => Promise<GeneratedPrompt[]>
  onGenerateImages: (
    prompts: GeneratedPrompt[],
    config: WizardConfig,
  ) => Promise<GeneratedImage[]>
  onOpenRunFromWizard: (runId: string) => void
  onUpdatePostSchedule: (runId: string, postId: string, scheduledDate: string) => Promise<boolean>
}

export const CreateWizard: React.FC<CreateWizardProps> = ({
  onGeneratePrompts,
  onGenerateImages,
  onOpenRunFromWizard,
  onUpdatePostSchedule,
}) => {
  const [step, setStep] = useState<WizardStep>(1)
  const [config, setConfig] = useState<WizardConfig | null>(null)
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([])
  const [images, setImages] = useState<GeneratedImage[]>([])
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false)
  const [isGeneratingImages, setIsGeneratingImages] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentRunId, setCurrentRunId] = useState<string | null>(null)

  const handleGeneratePrompts = async (cfg: WizardConfig) => {
    setIsLoadingPrompts(true)
    setConfig(cfg)
    try {
      const result = await onGeneratePrompts(cfg)
      setPrompts(result)
      setStep(2)
    } finally {
      setIsLoadingPrompts(false)
    }
  }

  const handleChangePrompt = (id: string, text: string) => {
    setPrompts((prev) => prev.map((p) => (p.id === id ? { ...p, text } : p)))
  }

  const handleGenerateImages = async () => {
    if (!config || !prompts.length) return
    setIsGeneratingImages(true)
    setProgress(5)
    try {
      const res = await onGenerateImages(prompts, config)
      setImages(res)
      setStep(3)
      setProgress(100)
      const newRunId = res[0]?.runId ?? null
      if (newRunId) setCurrentRunId(newRunId)
    } finally {
      setIsGeneratingImages(false)
    }
  }

  const handleUpdateSchedule = async (postId: string, scheduledDate: string) => {
    if (!currentRunId) return
    const previous = images.find((img) => img.postId === postId)?.scheduledDate
    setImages((prev) =>
      prev.map((img) => (img.postId === postId ? { ...img, scheduledDate } : img)),
    )
    const ok = await onUpdatePostSchedule(currentRunId, postId, scheduledDate)
    if (!ok) {
      setImages((prev) =>
        prev.map((img) => (img.postId === postId ? { ...img, scheduledDate: previous } : img)),
      )
    }
  }

  const handleOpenRun = () => {
    if (currentRunId) onOpenRunFromWizard(currentRunId)
  }

  return (
    <section className="space-y-4">
      <StepIndicator activeStep={step} />

      {step === 1 && (
        <Step1_Configure
          initialConfig={config ?? undefined}
          isLoading={isLoadingPrompts}
          onSubmit={handleGeneratePrompts}
        />
      )}

      {step === 2 && (
        <Step2_ReviewPrompts
          prompts={prompts}
          isGeneratingImages={isGeneratingImages}
          onChangePrompt={handleChangePrompt}
          onBackToConfigure={() => setStep(1)}
          onGenerateImages={handleGenerateImages}
        />
      )}

      {step === 3 && (
        <Step3_GenerateImages
          images={images}
          progress={progress}
          onOpenRun={handleOpenRun}
          onCopyCaption={(caption) =>
            navigator.clipboard?.writeText(caption).catch(() => {})
          }
          onRegenerateImage={(imageId) => {
            // Hook into existing regenerate endpoint if needed
            console.log("Regenerate image", imageId)
          }}
          onScheduleChange={handleUpdateSchedule}
        />
      )}
    </section>
  )
}
